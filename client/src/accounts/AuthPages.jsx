import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSession } from '../session';
import { PASSWORD_HINT, send, takeFragmentToken } from './request';
import { JoinList } from './JoinList';
import './accounts.css';

/** Submit-once form state shared by the account screens. */
export const useSubmit = () => {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const run = async (action) => {
    if (busy) return;
    setBusy(true); setMessage(null);
    try { setMessage(await action()); } finally { setBusy(false); }
  };
  return { busy, message, setMessage, run };
};

export const Message = ({ message }) => message
  ? <p role={message.error ? 'alert' : 'status'} className={message.error ? 'hh-error' : undefined}>{message.text}</p>
  : null;

/** UC1: one screen; the same "check your inbox" answer for any email (N1). */
export const SignUp = () => {
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email ?? '');
  const [password, setPassword] = useState('');
  const [associationName, setAssociationName] = useState('');
  // UC11 3a: an invitee joins an existing association, so no association is created.
  const invited = Boolean(state?.invited);
  const { busy, message, run } = useSubmit();
  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const { ok, status, data } = await send('/signup', 'POST', invited ? { email, password } : { email, password, associationName });
      if (ok) {
        setPassword('');
        return { text: `${data.message}${data.similarAssociation
          ? ' Your troupe may already be on HappiHub — ask a member for an invitation.' : ''}` };
      }
      if (status === 400) { setPassword(''); return { error: true, text: data.field === 'password' ? data.hint : `Check the ${data.field ?? 'form'} field.` }; }
      return { error: true, text: data.message ?? 'Unable to sign up. Try again later.' };
    });
  };
  return (
    <section className="hh-page">
      <h2>{invited ? 'Create my account' : 'Create my association'}</h2>
      <Message message={message} />
      <form className="hh-form" onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={15} maxLength={64} autoComplete="new-password" />
          <span className="hh-hint">{PASSWORD_HINT}</span></label>
        {!invited && <label>Association name<input value={associationName} onChange={(e) => setAssociationName(e.target.value)} required minLength={2} maxLength={100} /></label>}
        <button className="hh-button" disabled={busy}>{invited ? 'Create my account' : 'Create my association'}</button>
      </form>
      <p>Already registered? <Link to="/signin">Sign in</Link></p>
    </section>
  );
};

export const SignIn = () => {
  const { acceptSession } = useSession();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState(state?.email ?? '');
  const [password, setPassword] = useState('');
  const { busy, message, run } = useSubmit();
  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const { ok, status, data } = await send('/session', 'POST', { email, password });
      if (!ok) return { error: true, text: status === 401 ? 'Invalid email or password.' : data.message ?? 'Unable to sign in.' };
      acceptSession(data);
      navigate(state?.from ?? '/account');
      return null;
    });
  };
  return (
    <section className="hh-page">
      <h2>Sign in</h2>
      <Message message={message} />
      <form className="hh-form" onSubmit={submit}>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
        <button className="hh-button" disabled={busy}>Sign in</button>
      </form>
      <p><Link to="/forgot-password">Forgot password?</Link> · <Link to="/signup">Create my association</Link></p>
    </section>
  );
};

/** Neutral email form used by "forgot password" and "send a new verification link". */
const EmailRequest = ({ title, path, label }) => {
  const [email, setEmail] = useState('');
  const { busy, message, run } = useSubmit();
  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const { ok, data } = await send(path, 'POST', { email });
      return ok ? { text: data.message } : { error: true, text: data.message ?? 'Unable to send. Try again later.' };
    });
  };
  return (
    <form className="hh-form" onSubmit={submit} aria-label={title}>
      <Message message={message} />
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <button className="hh-button" disabled={busy}>{label}</button>
    </form>
  );
};

export const ForgotPassword = () => (
  <section className="hh-page">
    <h2>Forgot password</h2>
    <EmailRequest title="Forgot password" path="/password-reset" label="Send a reset link" />
  </section>
);

/** UC3: the token comes from the fragment; success signs in with a fresh session. */
export const ResetPassword = () => {
  const { refresh } = useSession();
  const navigate = useNavigate();
  const token = useRef(null);
  if (token.current === null) token.current = takeFragmentToken();
  const [password, setPassword] = useState('');
  const { busy, message, run } = useSubmit();
  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const { ok, status, data } = await send('/password-reset/confirm', 'POST', { token: token.current, password });
      setPassword('');
      if (ok) { await refresh(); navigate('/account'); return null; }
      return { error: true, text: status === 400 ? data.hint : data.message ?? 'Unable to reset the password.' };
    });
  };
  return (
    <section className="hh-page">
      <h2>Choose a new password</h2>
      <Message message={message} />
      <form className="hh-form" onSubmit={submit}>
        <label>New password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={15} maxLength={64} autoComplete="new-password" />
          <span className="hh-hint">{PASSWORD_HINT}</span></label>
        <button className="hh-button" disabled={busy}>Save and sign in</button>
      </form>
      {message?.error && <p><Link to="/forgot-password">Start again</Link></p>}
    </section>
  );
};

/** UC2: verifying a sign-up signs in (N1) and offers pending invitations (UC11 4c). */
export const VerifyEmail = () => {
  const { refresh } = useSession();
  const [result, setResult] = useState({ status: 'checking' });
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = takeFragmentToken();
    (async () => {
      const { ok, data } = await send('/email-verification', 'POST', { token });
      if (!ok) { setResult({ status: 'failed', message: data.message }); return; }
      if (data.signedIn) await refresh();
      setResult({ status: 'verified', ...data });
    })();
  }, [refresh]);
  return (
    <section className="hh-page">
      <h2>Email verification</h2>
      {result.status === 'checking' && <p role="status">Checking your link…</p>}
      {result.status === 'failed' && (<>
        <p role="alert" className="hh-error">{result.message}</p>
        <EmailRequest title="Send a new link" path="/email-verification/resend" label="Send a new link" />
      </>)}
      {result.status === 'verified' && (<>
        <p role="status">Your email address is verified.</p>
        {result.signUpVerification && <p>Next step: create your first event — event creation arrives with the events release.</p>}
        <JoinList invitations={result.invitations} />
        <p><Link to="/account">Go to my account</Link></p>
      </>)}
    </section>
  );
};
