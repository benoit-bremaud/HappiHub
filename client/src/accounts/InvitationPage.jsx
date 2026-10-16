import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSession } from '../session';
import { send, takeFragmentToken } from './request';
import { Message, useSubmit } from './AuthPages';
import './accounts.css';

/** UC11: the token stays in the fragment; the page looks it up and joins on an explicit choice. */
export const InvitationPage = () => {
  const { status } = useSession();
  const navigate = useNavigate();
  const token = useRef(null);
  if (token.current === null) token.current = sessionStorage.getItem('invitationToken') || takeFragmentToken();
  const [invitation, setInvitation] = useState(null);
  const { busy, message, run } = useSubmit();
  useEffect(() => {
    // Kept for this tab only, so the page still works after signing in or signing up.
    if (token.current) sessionStorage.setItem('invitationToken', token.current);
    (async () => {
      const { ok, data } = await send('/invitations/lookup', 'POST', { token: token.current });
      setInvitation(ok ? data : { gone: data.message ?? 'This invitation is no longer valid. Ask the association for a new one.' });
    })();
  }, []);
  const join = () => run(async () => {
    const { ok, status: code, data } = await send('/invitations/accept', 'POST', { token: token.current });
    if (ok && code === 200) { sessionStorage.removeItem('invitationToken'); navigate(`/associations/${data.associationSlug}`); return null; }
    return { error: code !== 202, text: data.message };
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
