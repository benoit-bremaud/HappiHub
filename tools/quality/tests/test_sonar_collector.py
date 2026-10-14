"""Exercise provenance and archive boundaries with real JSON, ZIPs and files."""

import importlib.util
import io
import json
from pathlib import Path
import stat
import tempfile
import unittest
from unittest.mock import patch
import zipfile

MODULE = Path(__file__).resolve().parents[1] / 'sonar-collector.py'
SPEC = importlib.util.spec_from_file_location('sonar_collector', MODULE)
collector = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(collector)


def run(**changes):
    value = {'id': 123, 'run_attempt': 2, 'head_sha': 'a' * 40,
             'repository': {'id': collector.REPOSITORY_ID},
             'head_repository': {'id': collector.REPOSITORY_ID},
             'event': 'push', 'head_branch': 'main', 'workflow_id': 456,
             'path': collector.WORKFLOW, 'status': 'completed', 'conclusion': 'success',
             'created_at': '2026-10-13T12:00:00Z'}
    value.update(changes)
    return value


def manifest(value):
    return {'repository_id': collector.REPOSITORY_ID, 'head_sha': value['head_sha'],
            'run_id': value['id'], 'run_attempt': value['run_attempt']}


def archive(value, extra=None, replacement_manifest=None):
    data = io.BytesIO()
    with zipfile.ZipFile(data, 'w') as stream:
        stream.writestr('manifest.json', json.dumps(replacement_manifest or manifest(value)))
        stream.writestr('server/coverage/lcov.info', 'SF:app.js\nDA:1,1\nend_of_record\n')
        stream.writestr('client/coverage/lcov.info', 'SF:src/App.js\nDA:1,0\nend_of_record\n')
        if extra:
            stream.writestr(*extra)
    return data.getvalue()


class ProvenanceTests(unittest.TestCase):
    def test_successful_main_push_is_eligible(self):
        self.assertTrue(collector.eligible_run(run(), 456, '2026-10-13T00:00:00Z'))

    def test_untrusted_or_incomplete_runs_are_rejected(self):
        variants = [dict(event='pull_request'), dict(event='workflow_dispatch'),
                    dict(head_branch='feature'), dict(head_repository={'id': 999}),
                    dict(repository={'id': 999}), dict(workflow_id=999), dict(path='evil.yml'),
                    dict(status='in_progress'), dict(conclusion='failure'),
                    dict(head_sha='$(echo dangerous)'), dict(created_at='2026-10-12T00:00:00Z')]
        for variant in variants:
            with self.subTest(variant=variant):
                self.assertFalse(collector.eligible_run(run(**variant), 456, '2026-10-13T00:00:00Z'))

    def test_attempt_and_revision_form_distinct_identity(self):
        self.assertNotEqual(collector.run_key(run()), collector.run_key(run(run_attempt=3)))
        self.assertNotEqual(collector.run_key(run()), collector.run_key(run(head_sha='b' * 40)))


class ArchiveTests(unittest.TestCase):
    def test_valid_reports_preserve_uncovered_lines_and_normalize_paths(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'server').mkdir()
            (root / 'server/app.js').write_text('source')
            (root / 'client/src').mkdir(parents=True)
            (root / 'client/src/App.js').write_text('source')
            collector.unpack_coverage(archive(run()), root, run())
            for report in collector.REPORTS:
                collector.normalize_lcov(root / report, root)
            self.assertIn('SF:server/app.js', (root / 'server/coverage/lcov.info').read_text())
            self.assertIn('DA:1,0', (root / 'client/coverage/lcov.info').read_text())

    def test_extra_duplicate_and_traversal_entries_never_extract(self):
        for extra in [('unexpected', 'data'), ('../escape', 'data'),
                      ('/absolute', 'data'), ('manifest.json', '{}')]:
            with self.subTest(extra=extra), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                with self.assertRaises(collector.BoundaryError):
                    collector.unpack_coverage(archive(run(), extra), root, run())
                self.assertEqual(list(root.iterdir()), [])

    def test_mismatched_revision_attempt_and_run_are_rejected(self):
        for change in [dict(head_sha='b' * 40), dict(run_attempt=3), dict(run_id=999)]:
            with self.subTest(change=change), tempfile.TemporaryDirectory() as directory:
                altered = manifest(run()) | change
                with self.assertRaises(collector.BoundaryError):
                    collector.unpack_coverage(archive(run(), replacement_manifest=altered),
                                              Path(directory), run())

    def test_bad_digest_and_invalid_zip_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            for data, digest in [(b'not a zip', None), (archive(run()), 'sha256:' + '0' * 64)]:
                with self.subTest(digest=digest), self.assertRaises(collector.BoundaryError):
                    collector.unpack_coverage(data, Path(directory), run(), digest)

    def test_symlink_member_is_rejected(self):
        data = io.BytesIO()
        with zipfile.ZipFile(data, 'w') as stream:
            stream.writestr('manifest.json', json.dumps(manifest(run())))
            stream.writestr('client/coverage/lcov.info', 'SF:src/App.js')
            link = zipfile.ZipInfo('server/coverage/lcov.info')
            link.create_system = 3
            link.external_attr = (stat.S_IFLNK | 0o777) << 16
            stream.writestr(link, '../../escape')
        with tempfile.TemporaryDirectory() as directory, self.assertRaises(collector.BoundaryError):
            collector.unpack_coverage(data.getvalue(), Path(directory), run())

    def test_expansion_limit_is_checked_before_extraction(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(collector, 'MAX_ARCHIVE', 10):
            with self.assertRaises(collector.BoundaryError):
                collector.unpack_coverage(archive(run()), Path(directory), run())


class CoverageTests(unittest.TestCase):
    def test_external_missing_and_empty_source_reports_are_rejected(self):
        for content in ['SF:../../escape', 'SF:/etc/passwd', 'SF:src/missing.js',
                        'SF:src\\escape.js', 'SF:src/file.js:other', 'TN:empty']:
            with self.subTest(content=content), tempfile.TemporaryDirectory() as directory:
                root = Path(directory)
                report = root / 'client/coverage/lcov.info'
                report.parent.mkdir(parents=True)
                report.write_text(content)
                with self.assertRaises(collector.BoundaryError):
                    collector.normalize_lcov(report, root)


class OperationalTests(unittest.TestCase):
    def test_scanner_has_no_host_network_socket_or_writable_source(self):
        arguments = collector.scanner_args(Path('/example/source'), 'happihub-scan-' + 'a' * 32, 'a' * 40)
        self.assertIn(collector.NETWORK, arguments)
        self.assertIn('type=bind,src=/example/source,dst=/usr/src,readonly', arguments)
        self.assertIn('--read-only', arguments)
        self.assertNotIn('host', arguments)
        self.assertNotIn('/var/run/docker.sock', ' '.join(arguments))

    def test_atomic_state_round_trip_has_no_temporary_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'state.json'
            value = {'version': 1, 'runs': {'123': {'phase': 'result'}}}
            collector.save_state(path, value)
            self.assertEqual(json.loads(path.read_text()), value)
            self.assertFalse(path.with_suffix('.new').exists())

    def test_failed_computed_gate_is_failure_not_success_or_transport_error(self):
        answers = [{'task': {'status': 'SUCCESS', 'componentKey': 'happihub', 'analysisId': 'analysis'}},
                   {'projectStatus': {'status': 'ERROR'}}]
        with patch.object(collector, 'sonar_api', side_effect=answers):
            result = collector.task_result('task', 'synthetic')
        self.assertEqual(result['state'], 'failure')
        self.assertEqual(result['analysis_id'], 'analysis')

    def test_pending_task_and_wrong_project_do_not_pass(self):
        with patch.object(collector, 'sonar_api', return_value={'task': {'status': 'PENDING', 'componentKey': 'happihub'}}):
            self.assertIsNone(collector.task_result('task', 'synthetic'))
        with patch.object(collector, 'sonar_api', return_value={'task': {'status': 'SUCCESS', 'componentKey': 'other'}}):
            with self.assertRaises(collector.BoundaryError):
                collector.task_result('task', 'synthetic')

    def test_cleanup_cannot_target_other_containers(self):
        with patch.object(collector, 'command') as execute:
            with self.assertRaises(collector.BoundaryError):
                collector.retire_container('sonarqube')
            execute.assert_not_called()

    def test_task_identity_survives_disposable_work_directory_removal(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            analysis = root / 'scan-owned/analysis-state'
            analysis.mkdir(parents=True)
            report = analysis / 'report-task.txt'
            report.write_text('projectKey=happihub\nceTaskId=task-123\n')
            name = 'happihub-scan-' + 'a' * 32
            self.assertEqual(collector.container_task(name, root, analysis), 'task-123')
            report.unlink()
            self.assertEqual(collector.container_task(name, root), 'task-123')

    def test_task_report_cannot_come_from_outside_private_state(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with self.assertRaises(collector.BoundaryError):
                collector.container_task('happihub-scan-' + 'a' * 32, root, Path('/etc'))

    def test_network_rejects_postgres_and_host_reachability_configuration(self):
        for network in [
            {'Driver': 'bridge', 'Internal': False},
            {'Driver': 'bridge', 'Internal': True, 'Options': {}, 'Containers': {}},
            {'Driver': 'bridge', 'Internal': True,
             'Options': {'com.docker.network.bridge.gateway_mode_ipv4': 'isolated'},
             'Containers': {'one': {'Name': 'sonarqube'}, 'two': {'Name': 'sonar-db'}}},
        ]:
            with self.subTest(network=network), patch.object(collector, 'command', return_value=json.dumps([network]).encode()):
                with self.assertRaises(collector.BoundaryError):
                    collector.verify_network()

    def test_result_publication_retry_does_not_resubmit_scan(self):
        value = run()
        key = collector.run_key(value)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            state = {'version': 1, 'runs': {key: {'run': value, 'phase': 'result',
                     'result': {'state': 'success', 'description': 'SonarQube gate passed'}}}}
            collector.save_state(root / 'state.json', state)
            config = {'state_directory': str(root), 'workflow_id': 456,
                      'activation': '2026-10-13T00:00:00Z'}
            writes = []

            def api(path, token, method='GET', fields=None):
                if '/statuses/' in path:
                    writes.append((path, fields))
                    if len(writes) == 1:
                        raise collector.BoundaryError('Status temporarily unavailable')
                    return {}
                if path == f'repos/{collector.REPOSITORY}':
                    return {'id': collector.REPOSITORY_ID}
                if path.endswith('/actions/workflows/quality-tests.yml'):
                    return {'id': 456, 'path': collector.WORKFLOW}
                return {'workflow_runs': [value] if path.endswith('&page=1') else []}

            with patch.object(collector, 'api', side_effect=api), patch.object(collector, 'command') as external:
                with self.assertRaises(collector.BoundaryError):
                    collector.collect(config, 'synthetic-github', 'synthetic-sonar')
                self.assertEqual(json.loads((root / 'state.json').read_text())['runs'][key]['phase'], 'result')
                collector.collect(config, 'synthetic-github', 'synthetic-sonar')
                self.assertEqual(json.loads((root / 'state.json').read_text())['runs'][key]['phase'], 'done')
                external.assert_not_called()
            self.assertTrue(all(value['head_sha'] in path for path, fields in writes))

    def test_unfinished_earlier_push_prevents_newer_scan(self):
        earlier = run(id=122, status='in_progress', conclusion=None)
        later = run(id=123)
        with tempfile.TemporaryDirectory() as directory:
            config = {'state_directory': directory, 'workflow_id': 456,
                      'activation': '2026-10-13T00:00:00Z'}

            def api(path, token, **kwargs):
                if path == f'repos/{collector.REPOSITORY}':
                    return {'id': collector.REPOSITORY_ID}
                if path.endswith('/actions/workflows/quality-tests.yml'):
                    return {'id': 456, 'path': collector.WORKFLOW}
                return {'workflow_runs': [later, earlier] if path.endswith('&page=1') else []}

            with patch.object(collector, 'api', side_effect=api), patch.object(collector, 'command') as external:
                collector.collect(config, 'synthetic-github', 'synthetic-sonar')
                external.assert_not_called()
            self.assertFalse((Path(directory) / 'state.json').exists())


if __name__ == '__main__':
    unittest.main()
