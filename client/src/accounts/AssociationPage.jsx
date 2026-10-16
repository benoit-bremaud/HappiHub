import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useSession } from '../session';
import { send } from './request';
import { Message, useSubmit } from './AuthPages';
import './accounts.css';

const PROFILE_FIELDS = [
  ['name', 'Name', 'input'], ['city', 'City', 'input'], ['presentation', 'Presentation', 'textarea'],
  ['websiteUrl', 'Website', 'input'], ['contactEmail', 'Generic contact email', 'input'],
];

/** UC7: text fields only; the address of the page (slug) never changes. */
const ProfileForm = ({ slug, association, onSaved }) => {
  const [values, setValues] = useState(() => Object.fromEntries(PROFILE_FIELDS.map(([key]) => [key, association[key] ?? ''])));
  const { busy, message, run } = useSubmit();
  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const { ok, data } = await send(`/associations/${slug}`, 'PATCH', values);
      if (!ok) return { error: true, text: data.field ? `Check the ${data.field} field.` : data.message ?? 'Unable to save.' };
      onSaved();
      return { text: 'Saved.' };
    });
  };
  return (
    <form className="hh-form" onSubmit={submit} aria-label="Association profile">
      <Message message={message} />
      {PROFILE_FIELDS.map(([key, label, tag]) => {
        const Tag = tag;
        return <label key={key}>{label}<Tag value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} required={key === 'name'} /></label>;
      })}
      <button className="hh-button" disabled={busy}>Save the profile</button>
    </form>
  );
};

/** UC10: invite by email, copy the link, resend or revoke pending invitations. */
const Invitations = ({ slug }) => {
  const [invitations, setInvitations] = useState([]);
  const [email, setEmail] = useState('');
  const [link, setLink] = useState(null);
  const { busy, message, setMessage, run } = useSubmit();
  const load = useCallback(async () => {
    const { ok, data } = await send(`/associations/${slug}/invitations`);
    if (ok) setInvitations(data.invitations);
  }, [slug]);
  useEffect(() => { load(); }, [load]);
  const invite = (event) => {
    event.preventDefault();
    run(async () => {
      const { ok, data } = await send(`/associations/${slug}/invitations`, 'POST', { email });
      if (!ok) return { error: true, text: data.message ?? 'Unable to invite.' };
      setEmail(''); setLink(data.link); load();
      return { text: `Invitation sent to ${data.email}.` };
    });
  };
  const act = async (path, method, done) => {
    const { ok, data } = await send(path, method);
    if (!ok) { setMessage({ error: true, text: data.message ?? 'Action failed.' }); return; }
    if (data.link) setLink(data.link);
    setMessage({ text: done }); load();
  };
  return (
    <>
      <h3>Invitations</h3>
      <form className="hh-form" onSubmit={invite} aria-label="Invite">
        <Message message={message} />
        <label>Email to invite<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <button className="hh-button" disabled={busy}>Invite</button>
      </form>
      {link && <p>Link to share (valid 7 days, only for the invited address): <input readOnly value={link} aria-label="Invitation link" onFocus={(e) => e.target.select()} /></p>}
      <ul className="hh-list" aria-label="Pending invitations">
        {invitations.map((invitation) => (
          <li key={invitation.id}>
            <span>{invitation.email}</span>
            <button className="hh-button" onClick={() => act(`/associations/${slug}/invitations/${invitation.id}/resend`, 'POST', 'Invitation sent again.')}>Resend</button>
            <button className="hh-button hh-danger" onClick={() => act(`/associations/${slug}/invitations/${invitation.id}`, 'DELETE', 'Invitation revoked.')}>Revoke</button>
          </li>
        ))}
      </ul>
    </>
  );
};

export const AssociationPage = () => {
  const { slug } = useParams();
  const { status, account } = useSession();
  const navigate = useNavigate();
  const [association, setAssociation] = useState(null);
  const [message, setMessage] = useState(null);
  const load = useCallback(async () => {
    const { ok, data } = await send(`/associations/${slug}`);
    setAssociation(ok ? data : { failed: data.message ?? 'Unable to load the association.' });
  }, [slug]);
  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);
  if (status === 'anonymous') return <Navigate to="/signin" state={{ from: `/associations/${slug}` }} replace />;
  if (!association) return <section className="hh-page"><p role="status">Loading…</p></section>;
  if (association.failed) return <section className="hh-page"><p role="alert">{association.failed}</p></section>;

  const confirmThen = async (question, path, { method = 'POST', payload } = {}, after) => {
    if (!window.confirm(question)) return;
    const { ok, data } = await send(path, method, payload);
    if (!ok) { setMessage({ error: true, text: data.message ?? 'Action failed.' }); return; }
    after();
  };
  const closed = association.status === 'CLOSED';
  return (
    <section className="hh-page">
      <h2>{association.name}{closed && ' (closed)'}</h2>
      <Message message={message} />
      {!closed && <ProfileForm slug={slug} association={association} onSaved={load} />}
      <h3>Members</h3>
      <ul className="hh-list">
        {association.members.map((member) => (
          <li key={member.accountId}>
            <span>{member.displayName || member.email}</span>
            {member.accountId !== account?.id && !closed && (
              <button className="hh-button hh-danger" onClick={() => confirmThen(`Remove ${member.displayName || member.email}?`,
                `/associations/${slug}/members/${member.accountId}`, { method: 'DELETE' }, load)}>Remove</button>)}
          </li>
        ))}
      </ul>
      {!closed && <Invitations slug={slug} />}
      {!closed && (<>
        <h3>Leave or close</h3>
        <button className="hh-button" onClick={() => confirmThen('Leave this association?', `/associations/${slug}/leave`, {},
          () => navigate('/account'))}>Leave the association</button>{' '}
        <button className="hh-button hh-danger" onClick={() => confirmThen(
          'Close the association? Upcoming events are cancelled and the page shows “Association closed” for 30 days, then everything is deleted.',
          `/associations/${slug}/close`, { payload: { confirm: true } }, load)}>Close the association</button>
      </>)}
      <p><Link to="/account">Back to my account</Link></p>
    </section>
  );
};
