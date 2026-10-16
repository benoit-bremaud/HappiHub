import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../session';
import { send, useFragmentToken } from './request';
import { Message, useSubmit } from './AuthPages';
import './accounts.css';

/** UC11: the token stays in the fragment; the page looks it up and joins on an explicit choice. */
export const InvitationPage = () => {
  const { status } = useSession();
  const navigate = useNavigate();
  // A fresh link wins over a token kept from an earlier visit.
  const fragment = useFragmentToken();
  const [token] = useState(() => fragment || sessionStorage.getItem('invitationToken') || '');
  const [invitation, setInvitation] = useState(null);
  const { busy, message, run } = useSubmit();
  useEffect(() => {
    // The POST needs the CSRF token from the session bootstrap.
    if (status === 'loading' || invitation) return;
    (async () => {
      const { ok, data } = await send('/invitations/lookup', 'POST', { token });
      // Kept for this tab only, so the page still works after signing in or signing up.
      if (ok) sessionStorage.setItem('invitationToken', token);
      else sessionStorage.removeItem('invitationToken');
      setInvitation(ok ? data : { gone: data.message ?? 'This invitation is no longer valid. Ask the association for a new one.' });
    })();
  }, [status, token, invitation]);
  const join = () => run(async () => {
    const { ok, data } = await send('/invitations/accept', 'POST', { token });
    if (ok) { sessionStorage.removeItem('invitationToken'); navigate(`/associations/${data.associationSlug}`); return null; }
    return { error: true, text: data.message };
  });
  if (!invitation) return <section className="hh-page"><p role="status">Checking your invitation…</p></section>;
  if (invitation.gone) return <section className="hh-page"><p role="alert">{invitation.gone}</p></section>;
  return (
    <section className="hh-page">
      <h2>Join {invitation.associationName}</h2>
      <p>This invitation is for {invitation.email}.</p>
      <Message message={message} />
      {status === 'authenticated'
        ? <button className="hh-button" onClick={join} disabled={busy}>Join</button>
        : <p><Link to="/signin" state={{ email: invitation.email, from: '/invitations' }}>Sign in</Link> or{' '}
          <Link to="/signup" state={{ email: invitation.email, invited: true }}>create an account</Link> with this address.</p>}
    </section>
  );
};
