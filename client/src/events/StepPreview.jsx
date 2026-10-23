/* global globalThis -- ES2020 global, unknown to the CRA ESLint environment. */
import PropTypes from 'prop-types';
import { editorShape } from './propShapes';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../session';
import { send } from '../accounts/request';
import { ConfirmDialog } from './ConfirmDialog';
import { EventPoster } from './EventPoster';
import { missingRequired, REASON_MAX } from './eventFields';

/** Step 4: public page preview, checklist (G1 mirror and server refusals) and lifecycle actions (UC18–UC20). */
export const StepPreview = ({ editor, cityName, slug, goTo }) => {
  const navigate = useNavigate();
  const { account } = useSession();
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState([]);
  const [notice, setNotice] = useState(null);
  const { event, values } = editor;
  const missing = missingRequired(values);
  const run = async (action, payload) => {
    setBusy(true); setNotice(null);
    const result = await editor.lifecycle(action, payload);
    if (result.ok && action === 'delete') return navigate(`/associations/${slug}/events`, { state: { notice: 'Draft deleted.' } });
    setBusy(false); setDialog(null);
    if (result.failures) setFailures(result.failures);
    if (result.notice) setNotice({ error: true, text: result.notice });
    return undefined;
  };
  const resend = async () => {
    const { ok } = await send('/email-verification/resend', 'POST', { email: account?.email });
    setNotice(ok ? { text: 'Verification email sent. Open the link, then publish again.' } : { error: true, text: 'Unable to send the email.' });
  };
  const ready = !missing.length && !editor.pending && !editor.problem;
  return (
    <>
      <div className="hh-previews">
        <div className="hh-preview hh-preview--mobile" aria-label="Mobile preview"><EventPoster values={values} cityName={cityName} /></div>
        <div className="hh-preview hh-preview--desktop" aria-label="Desktop preview"><EventPoster values={values} cityName={cityName} />
          {values.longDescription && <p className="hh-long">{values.longDescription}</p>}</div>
      </div>
      {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'hh-error' : undefined}>{notice.text}</p>}
      {editor.message && <output>{editor.message}</output>}
      {event.status === 'DRAFT' && (
        <section aria-label="Publication checklist">
          {(missing.length > 0 || failures.length > 0) && <ul className="hh-checklist">
            {missing.map(({ field, label, step }) => (
              <li key={field}>{label} is missing — <button type="button" className="hh-link" onClick={() => goTo(step)}>complete step {step}</button></li>))}
            {failures.map(({ text, step, resend: offerResend }) => (
              <li key={text} className="hh-error">{text}{step && <> — <button type="button" className="hh-link" onClick={() => goTo(step)}>go to step {step}</button></>}
                {offerResend && <> — <button type="button" className="hh-link" onClick={resend}>Resend the verification email</button></>}</li>))}
          </ul>}
          {editor.pending && <p className="hh-hint">Saving the last changes…</p>}
          {editor.problem && <p className="hh-error">Fix the field in step to continue: {editor.problem.text}</p>}
          {!dialog && <div className="hh-actions">
            {ready && <button type="button" className="hh-button" disabled={busy} onClick={() => setDialog('publish')}>Publish</button>}
            {!editor.pending && <button type="button" className="hh-link hh-danger-link" disabled={busy} onClick={() => setDialog('delete')}>Delete this draft</button>}
          </div>}
        </section>
      )}
      {event.status === 'PUBLISHED' && (
        <section aria-label="Published event">
          <p>Public page: <Link to={`/events/${event.id}`}>{globalThis.location.origin}/events/{event.id}</Link></p>
          {!event.ended && !dialog && !editor.pending && <button type="button" className="hh-link hh-danger-link" onClick={() => setDialog('cancel')}>Cancel this event</button>}
        </section>
      )}
      {dialog === 'publish' && (
        <ConfirmDialog title="Publish this event?" confirmLabel="Publish" danger={false} busy={busy}
          onConfirm={() => run('publish')} onClose={() => setDialog(null)} closeLabel="Not now">
          <p>It becomes public at once. You can still edit or cancel it at any time.</p>
        </ConfirmDialog>
      )}
      {dialog === 'delete' && (
        <ConfirmDialog title="Delete this draft?" confirmLabel="Delete the draft" busy={busy}
          onConfirm={() => run('delete', { confirm: true })} onClose={() => setDialog(null)}>
          <p>The draft is removed permanently.</p>
        </ConfirmDialog>
      )}
      {dialog === 'cancel' && (
        <ConfirmDialog title="Cancel this event?" confirmLabel="Cancel the event" busy={busy}
          onConfirm={() => run('cancel', { confirm: true, ...(reason?.trim() && { reason: reason.trim() }) })} onClose={() => setDialog(null)}>
          <p>Cancellation is final. The public page stays online with a “Cancelled” banner.</p>
          {reason === null
            ? <button type="button" className="hh-link hh-add" onClick={() => setReason('')}>+ Add a reason for the public</button>
            : <label>Reason<textarea value={reason} maxLength={REASON_MAX} onChange={(e) => setReason(e.target.value)} rows={3} />
              {reason.length > REASON_MAX * 0.8 && <span className="hh-hint">{reason.length} / {REASON_MAX}</span>}</label>}
        </ConfirmDialog>
      )}
    </>
  );
};
StepPreview.propTypes = { editor: editorShape.isRequired, cityName: PropTypes.string, slug: PropTypes.string.isRequired, goTo: PropTypes.func.isRequired };
