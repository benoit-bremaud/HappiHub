import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSession } from '../session';
import { send } from '../accounts/request';
import { CityPicker } from './CityPicker';
import { ConfirmDialog } from './ConfirmDialog';
import { ConflictPanel } from './ConflictPanel';
import { EventPoster } from './EventPoster';
import {
  centsToEuros, describeFailure, entryStep, eurosToCents, EVENT_TYPES, fromLocalInput, isPast, MAX_LENGTHS,
  missingRequired, POSTER_STYLES, PRICE_KINDS, REASON_MAX, STATUS_LABELS, STEPS, toLocalInput,
} from './eventFields';
import { useEventEditor } from './useEventEditor';
import '../accounts/accounts.css';
import './events.css';

const SAVE_LABELS = {
  idle: '', loading: 'Loading…', dirty: 'Changes not saved yet', saving: 'Saving…', saved: 'Saved ✓',
  failed: 'Not saved', conflict: 'Not saved: conflict to resolve', unauthenticated: 'Not saved: session expired',
};

/** Text, textarea or select bound to one editor field; saves on blur (decision AS-A). */
const Field = ({ editor, field, label, as = 'input', hint, ...props }) => {
  const Tag = as;
  const invalid = editor.problem?.field === field;
  const max = MAX_LENGTHS[field];
  const value = editor.values[field] ?? '';
  return (
    <label>{label}
      <Tag value={value} onChange={(e) => editor.change(field, e.target.value === '' ? null : e.target.value)}
        onBlur={editor.save} aria-invalid={invalid || undefined} {...props} />
      {max && <span className="hh-hint">{value.length} / {max}</span>}
      {hint && <span className="hh-hint">{hint}</span>}
      {invalid && <span className="hh-error" role="alert">{editor.problem.text}</span>}
    </label>
  );
};

/** UC15 *b: sign in again without leaving the page, then save explicitly. */
const InPlaceSignIn = ({ email, onSignedIn }) => {
  const { acceptSession } = useSession();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const submit = async (event) => {
    event.preventDefault();
    const { ok, data } = await send('/session', 'POST', { email, password });
    if (!ok) { setError(data.message ?? 'Unable to sign in.'); return; }
    acceptSession(data);
    onSignedIn();
  };
  return (
    <form className="hh-form hh-notice" onSubmit={submit} aria-label="Sign in again">
      <p>Your session has expired. Your input is kept in this page.</p>
      {error && <p role="alert" className="hh-error">{error}</p>}
      <label>Password for {email}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
      <button className="hh-button">Sign in again</button>
    </form>
  );
};

const StepWhat = ({ editor }) => (
  <>
    <Field editor={editor} field="title" label="Title" maxLength={MAX_LENGTHS.title} required />
    <fieldset className="hh-chips"><legend>Type</legend>
      {EVENT_TYPES.map(([key, label]) => (
        <label key={key}><input type="radio" name="type" checked={editor.values.type === key}
          onChange={() => { editor.change('type', key); editor.save(); }} /> {label}</label>
      ))}
    </fieldset>
    <Field editor={editor} field="shortDescription" label="Short description" as="textarea" rows={3} />
  </>
);

const StepWhere = ({ editor, cityName, setCityName }) => {
  const { values } = editor;
  return (
    <>
      <label>Start<input type="datetime-local" value={toLocalInput(values.startsAt)}
        onChange={(e) => editor.change('startsAt', fromLocalInput(e.target.value))} onBlur={editor.save} /></label>
      {isPast(values.startsAt) && <p role="status" className="hh-warning">This start is in the past. The draft is saved, but the start must be in the future to publish.</p>}
      <label>End (optional)<input type="datetime-local" value={toLocalInput(values.endsAt)}
        onChange={(e) => editor.change('endsAt', fromLocalInput(e.target.value))} onBlur={editor.save} />
        {editor.problem?.field === 'endsAt' && <span className="hh-error" role="alert">{editor.problem.text}</span>}</label>
      <Field editor={editor} field="venueLabel" label="Venue" maxLength={MAX_LENGTHS.venueLabel} />
      <Field editor={editor} field="venueAddress" label="Address (optional)" maxLength={MAX_LENGTHS.venueAddress} />
      <CityPicker code={values.venueCity} name={cityName} invalid={editor.problem?.field === 'venueCity'}
        onChange={(code, name) => { setCityName(name); editor.change('venueCity', code); }} onBlur={editor.save} />
      <fieldset className="hh-chips"><legend>Price</legend>
        {PRICE_KINDS.map(([key, label]) => (
          <label key={key}><input type="radio" name="priceKind" checked={values.priceKind === key} onChange={() => {
            editor.change('priceKind', key);
            if (key !== 'AMOUNT') editor.change('priceAmountCents', null);
            editor.save();
          }} /> {label}</label>
        ))}
      </fieldset>
      {values.priceKind === 'AMOUNT' && (
        <label>Amount in euros<input inputMode="decimal" defaultValue={centsToEuros(values.priceAmountCents)}
          onChange={(e) => editor.change('priceAmountCents', eurosToCents(e.target.value))} onBlur={editor.save} />
          {editor.problem?.field === 'priceAmountCents' && <span className="hh-error" role="alert">{editor.problem.text}</span>}</label>
      )}
    </>
  );
};

const StepLook = ({ editor }) => (
  <>
    <fieldset className="hh-chips"><legend>Poster style</legend>
      {POSTER_STYLES.map((style) => (
        <label key={style}><input type="radio" name="posterStyle" checked={editor.values.posterStyle === style}
          onChange={() => { editor.change('posterStyle', style); editor.save(); }} /> {style}</label>
      ))}
    </fieldset>
    <p className="hh-hint">Photo upload comes with the image feature; pick a style for now.</p>
    <Field editor={editor} field="longDescription" label="Long description (optional)" as="textarea" rows={8} />
  </>
);

/** Step 4: public page preview, checklist (G1 mirror and server refusals) and lifecycle actions. */
const StepPreview = ({ editor, cityName, slug, goTo }) => {
  const navigate = useNavigate();
  const { account } = useSession();
  const [dialog, setDialog] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [failures, setFailures] = useState([]);
  const [notice, setNotice] = useState(null);
  const { event, values } = editor;
  const missing = missingRequired(values);
  const run = async (action, payload) => {
    setBusy(true); setNotice(null);
    const { ok, status, data } = await editor.lifecycle(action, payload);
    setBusy(false); setDialog(null);
    if (ok && action === 'delete') return navigate(`/associations/${slug}/events`, { state: { notice: 'Draft deleted.' } });
    if (ok) return setNotice({ text: action === 'publish' ? 'Published. It can be edited or cancelled at any time.' : 'Event cancelled.' });
    if (status === 422 && data.details?.failures) return setFailures(data.details.failures.map(describeFailure));
    return setNotice({ error: true, text: data.code === 'STALE_VERSION' ? 'The event changed meanwhile. Check it and confirm again.' : data.message ?? 'Action failed.' });
  };
  const resend = async () => {
    const { ok } = await send('/email-verification/resend', 'POST', { email: account?.email });
    setNotice(ok ? { text: 'Verification email sent. Open the link, then publish again.' } : { error: true, text: 'Unable to send the email.' });
  };
  if (!event) return <p>Save a title and a type first.</p>;
  const publicLink = `/events/${event.id}`;
  return (
    <>
      <div className="hh-previews">
        <div className="hh-preview hh-preview--mobile" aria-label="Mobile preview"><EventPoster values={values} cityName={cityName} /></div>
        <div className="hh-preview hh-preview--desktop" aria-label="Desktop preview"><EventPoster values={values} cityName={cityName} />
          {values.longDescription && <p className="hh-long">{values.longDescription}</p>}</div>
      </div>
      {notice && <p role={notice.error ? 'alert' : 'status'} className={notice.error ? 'hh-error' : undefined}>{notice.text}</p>}
      {event.status === 'DRAFT' && (
        <section aria-label="Publication checklist">
          <h3>Before publishing</h3>
          <ul className="hh-checklist">
            {missing.map(({ field, label, step }) => (
              <li key={field}>{label} is missing — <button type="button" className="hh-link" onClick={() => goTo(step)}>complete step {step}</button></li>))}
            {failures.map(({ text, step, resend: offerResend }) => (
              <li key={text} className="hh-error">{text}{step && <> — <button type="button" className="hh-link" onClick={() => goTo(step)}>go to step {step}</button></>}
                {offerResend && <> — <button type="button" className="hh-link" onClick={resend}>Resend the verification email</button></>}</li>))}
            {!missing.length && !failures.length && <li>Everything required is filled in.</li>}
          </ul>
          <div className="hh-actions">
            <button type="button" className="hh-button" disabled={busy || editor.pending} onClick={() => setDialog('publish')}>Publish</button>
            <button type="button" className="hh-button hh-danger" disabled={busy || editor.pending} onClick={() => setDialog('delete')}>Delete draft</button>
          </div>
          {editor.pending && <p className="hh-hint">Waiting for the last changes to be saved…</p>}
        </section>
      )}
      {event.status === 'PUBLISHED' && (
        <section aria-label="Published event">
          <p>Public page: <Link to={publicLink}>{window.location.origin}{publicLink}</Link></p>
          {!event.ended && <button type="button" className="hh-button hh-danger" disabled={busy || editor.pending} onClick={() => setDialog('cancel')}>Cancel this event</button>}
        </section>
      )}
      {dialog === 'publish' && (
        <ConfirmDialog title="Publish this event?" confirmLabel="Publish" danger={false} busy={busy}
          onConfirm={() => run('publish')} onClose={() => setDialog(null)}>
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
          onConfirm={() => run('cancel', { confirm: true, ...(reason.trim() && { reason: reason.trim() }) })} onClose={() => setDialog(null)}>
          <p>Cancellation is final. The public page stays online with a “Cancelled” banner and your reason.</p>
          <label>Reason (optional)<textarea value={reason} maxLength={REASON_MAX} onChange={(e) => setReason(e.target.value)} rows={3} />
            <span className="hh-hint">{reason.length} / {REASON_MAX}</span></label>
        </ConfirmDialog>
      )}
    </>
  );
};

/** UC15–UC20 four-step editor (client spec § 2). */
export const EventEditorPage = () => {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { status: sessionStatus, account, refresh } = useSession();
  const onCreated = useCallback((newId) =>
    navigate(`/associations/${slug}/events/${newId}?step=${params.get('step') ?? 1}`, { replace: true }), [navigate, slug, params]);
  const editor = useEventEditor({ slug, id, onCreated, refreshSession: refresh });
  const [cityName, setCityName] = useState(null);
  const { event, values, status } = editor;
  const shownCity = cityName ?? (event?.venueCity?.code === values.venueCity ? event?.venueCity?.name : null);
  const step = Number(params.get('step')) || (event ? entryStep(values) : 1);

  useEffect(() => {
    const warn = (e) => { if (editor.pending) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editor.pending]);

  if (sessionStatus === 'anonymous' && !event) return <Navigate to="/signin" state={{ from: `/associations/${slug}/events/${id ?? 'new'}` }} replace />;
  const list = `/associations/${slug}/events`;
  if (status === 'loading') return <section className="hh-page"><p role="status">Loading…</p></section>;
  if (status === 'notFound') return (
    <section className="hh-page"><p role="alert">This event no longer exists or you are no longer a member of this association.</p>
      <Link to={list}>Back to the events</Link></section>);
  if (!event && id) return (
    <section className="hh-page"><p role="alert">{editor.message}</p>
      <button type="button" className="hh-button" onClick={() => editor.reload(id)}>Retry</button></section>);

  if (status === 'readOnly') return (
    <section className="hh-page">
      <h2>{event.title} <span className="hh-badge">{STATUS_LABELS[event.status]}</span></h2>
      <p role="status">{event.status === 'CANCELLED' ? 'This event is cancelled' : 'This event is archived'} and can no longer be edited.
        {event.cancellationReason && ` Reason: ${event.cancellationReason}`}</p>
      {editor.message && <p>{editor.message}</p>}
      <EventPoster values={values} cityName={shownCity} cancelled={event.status === 'CANCELLED'} />
      <p><Link to={`/events/${event.id}`}>Public page</Link> · <Link to={list}>Back to the events</Link></p>
    </section>
  );

  const goTo = (number) => { editor.save(); setParams({ step: String(number) }); };
  return (
    <section className="hh-page hh-editor">
      <h2>{event ? values.title || 'Untitled event' : 'Create an event'}
        {event && <span className="hh-badge">{STATUS_LABELS[event.status]}</span>}</h2>
      <nav aria-label="Steps" className="hh-steps">
        {STEPS.map(({ number, title }) => (
          <button key={number} type="button" aria-current={number === step ? 'step' : undefined}
            className={`hh-step${number === step ? ' hh-step--current' : ''}`} onClick={() => goTo(number)}>{number}. {title}</button>
        ))}
      </nav>
      <p className="hh-save" role="status">{event?.status === 'PUBLISHED' && status === 'saved' ? 'Saved ✓ — visible immediately' : SAVE_LABELS[status]}
        {status === 'failed' && !editor.problem && <> <button type="button" className="hh-link" onClick={editor.save}>Retry</button></>}</p>
      {editor.message && status !== 'unauthenticated' && <p role="alert" className="hh-error">{editor.message}</p>}
      {status === 'unauthenticated' && (account?.email
        ? <InPlaceSignIn email={account.email} onSignedIn={() => editor.saveNow()} />
        : <p role="alert">{editor.message}</p>)}
      {status === 'conflict' && <ConflictPanel conflict={editor.conflict} onResolve={editor.resolve} />}
      <div className="hh-editor__body">
        <div className="hh-form">
          {step === 1 && <StepWhat editor={editor} />}
          {step === 2 && <StepWhere editor={editor} cityName={shownCity} setCityName={setCityName} />}
          {step === 3 && <StepLook editor={editor} />}
          {step === 4 && <StepPreview editor={editor} cityName={shownCity} slug={slug} goTo={goTo} />}
          {step < 4 && <button type="button" className="hh-button" onClick={() => goTo(step + 1)}>Next: {STEPS[step].title}</button>}
        </div>
        {step < 4 && <EventPoster values={values} cityName={shownCity} />}
      </div>
      <p><Link to={list}>Back to the events</Link></p>
    </section>
  );
};
