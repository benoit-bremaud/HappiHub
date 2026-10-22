import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../session';
import { ConflictPanel } from './ConflictPanel';
import { EventPoster } from './EventPoster';
import { StepLook, StepWhat, StepWhere } from './EventSteps';
import { InPlaceSignIn } from './InPlaceSignIn';
import { StepPreview } from './StepPreview';
import { entryStep, missingRequired, STATUS_LABELS, STEPS } from './eventFields';
import { useEventEditor } from './useEventEditor';
import { editorShape } from './propShapes';
import '../accounts/accounts.css';
import './events.css';

const SAVE_LABELS = {
  idle: '', loading: 'Loading…', dirty: 'Changes not saved yet', saving: 'Saving…', saved: 'Saved ✓',
  failed: 'Not saved', conflict: 'Not saved: conflict to resolve', unauthenticated: 'Not saved: session expired',
};

/** A cancelled or archived event: poster and links only, nothing editable (UC20, E3). */
const ReadOnlyEvent = ({ editor: { event, values, message }, cityName, list }) => (
    <section className="hh-page">
      <h2>{event.title} <span className="hh-badge">{STATUS_LABELS[event.status]}</span></h2>
      {message && <output>{message}</output>}
      <p>{event.status === 'CANCELLED' ? 'This event is cancelled' : 'This event is archived'} and can no longer be edited.
        {event.cancellationReason && ` Reason: ${event.cancellationReason}`}</p>
      <EventPoster values={values} cityName={cityName} cancelled={event.status === 'CANCELLED'} />
      <p><Link to={`/events/${event.id}`}>Public page</Link> · <Link to={list}>Back to the events</Link></p>
    </section>
);
ReadOnlyEvent.propTypes = { editor: editorShape.isRequired, cityName: PropTypes.string, list: PropTypes.string.isRequired };

/** UC15–UC20 four-step editor (client spec § 2), fields revealed progressively. */
export const EventEditorPage = () => {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { status: sessionStatus, account, refresh } = useSession();
  const stepRef = useRef(1);
  // Read at the time the draft is created, so a step chosen during the first save is kept.
  const onCreated = (newId) => navigate(`/associations/${slug}/events/${newId}?step=${stepRef.current}`, { replace: true });
  const editor = useEventEditor({ slug, id, onCreated, refreshSession: refresh });
  const [cityName, setCityName] = useState(null);
  const { event, values, status } = editor;
  const shownCity = cityName ?? (event?.venueCity?.code === values.venueCity ? event?.venueCity?.name : null);
  const step = Number(params.get('step')) || (event ? entryStep(values) : 1);
  stepRef.current = step;

  useEffect(() => {
    const warn = (e) => { if (editor.pending) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editor.pending]);

  const list = `/associations/${slug}/events`;
  if (sessionStatus === 'anonymous' && !event) return <Navigate to="/signin" state={{ from: `${list}/${id ?? 'new'}` }} replace />;
  if (status === 'loading') return <section className="hh-page"><output>Loading…</output></section>;
  if (status === 'notFound') return (
    <section className="hh-page"><p role="alert">This event no longer exists or you are no longer a member of this association.</p>
      <Link to={list}>Back to the events</Link></section>);
  if (!event && id) return (
    <section className="hh-page"><p role="alert">{editor.message}</p>
      <button type="button" className="hh-button" onClick={() => editor.reload(id)}>Retry</button></section>);

  if (status === 'readOnly') return <ReadOnlyEvent editor={editor} cityName={shownCity} list={list} />;

  const goTo = (number) => { editor.save(); setParams({ step: String(number) }); };
  // Next appears once the required fields of the current step are filled (step 3 has none).
  const stepDone = !missingRequired(values).some((missing) => missing.step === step);
  return (
    <section className="hh-page hh-editor">
      <h2>{event ? values.title || 'Untitled event' : 'Create an event'}
        {event && <span className="hh-badge">{STATUS_LABELS[event.status]}</span>}</h2>
      {event && <nav aria-label="Steps" className="hh-steps">
        {STEPS.map(({ number, title }) => (
          <button key={number} type="button" aria-current={number === step ? 'step' : undefined}
            className={`hh-step${number === step ? ' hh-step--current' : ''}`} onClick={() => goTo(number)}>{number}. {title}</button>
        ))}
      </nav>}
      <output className="hh-save">{event?.status === 'PUBLISHED' && status === 'saved' ? 'Saved ✓ — visible immediately' : SAVE_LABELS[status]}
        {status === 'failed' && !editor.problem && <> <button type="button" className="hh-link" onClick={editor.save}>Retry</button></>}</output>
      {editor.message && !['unauthenticated', 'saved'].includes(status) && <p role="alert" className="hh-error">{editor.message}</p>}
      {status === 'unauthenticated' && (account?.email
        ? <InPlaceSignIn email={account.email} onSignedIn={editor.saveNow} />
        : <p role="alert">{editor.message}</p>)}
      {status === 'conflict' && <ConflictPanel conflict={editor.conflict} onResolve={editor.resolve} />}
      <div className="hh-editor__body">
        <div className="hh-form">
          {step === 1 && <StepWhat editor={editor} />}
          {step === 2 && <StepWhere editor={editor} cityName={shownCity} setCityName={setCityName} />}
          {step === 3 && <StepLook editor={editor} />}
          {step === 4 && event && <StepPreview editor={editor} cityName={shownCity} slug={slug} goTo={goTo} />}
          {step < 4 && event && stepDone && <button type="button" className="hh-button" onClick={() => goTo(step + 1)}>Next: {STEPS[step].title}</button>}
        </div>
        {step < 4 && <EventPoster values={values} cityName={shownCity} />}
      </div>
      <p><Link to={list}>Back to the events</Link></p>
    </section>
  );
};
