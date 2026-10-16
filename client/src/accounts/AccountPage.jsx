import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useSession } from '../session';
import { apiFetch } from '../api';
import { PASSWORD_HINT, send } from './request';
import { Message, useSubmit } from './AuthPages';
import { JoinList } from './JoinList';
import './accounts.css';

/** UC4: display name, email (pending until verified) and password, with the current password when needed. */
const AccountForm = ({ account, onSaved }) => {
  const [displayName, setDisplayName] = useState(account.displayName ?? '');
  const [email, setEmail] = useState(account.email);
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const { busy, message, run } = useSubmit();
  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const body = { displayName };
      if (email !== account.email) body.email = email;
      if (newPassword) body.newPassword = newPassword;
      if (body.email || body.newPassword) body.currentPassword = currentPassword;
      const { ok, status, data } = await send('/account', 'PATCH', body);
      setNewPassword(''); setCurrentPassword('');
      if (!ok) return { error: true, text: status === 400 && data.field === 'newPassword' ? data.hint : data.message ?? 'Unable to save.' };
      onSaved(data);
      return { text: body.email ? 'Saved. Confirm the new address from the link we sent to it.' : 'Saved.' };
    });
  };
  const sensitive = email !== account.email || newPassword;
  return (
    <form className="hh-form" onSubmit={submit} aria-label="My account">
      <Message message={message} />
      <label>Display name<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} /></label>
      <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {account.pendingEmail && <span className="hh-hint">Pending confirmation: {account.pendingEmail}</span>}</label>
      <label>New password<input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={15} maxLength={64} autoComplete="new-password" />
        <span className="hh-hint">{PASSWORD_HINT}</span></label>
      {sensitive && <label>Current password<input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" /></label>}
      <button className="hh-button" disabled={busy}>Save</button>
    </form>
  );
};

/** UC1 1b: another association for a signed-in account (5 in total). */
const NewAssociation = ({ onCreated }) => {
  const [name, setName] = useState('');
  const { busy, message, run } = useSubmit();
  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const { ok, data } = await send('/associations', 'POST', { name });
      if (!ok) return { error: true, text: data.message ?? 'Unable to create the association.' };
      setName(''); onCreated();
      return { text: `Created ${data.name}.` };
    });
  };
  return (
    <form className="hh-form" onSubmit={submit} aria-label="New association">
      <Message message={message} />
      <label>Association name<input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} /></label>
      <button className="hh-button" disabled={busy}>Create an association</button>
    </form>
  );
};

/** UC5: download the JSON export through the session cookie. */
const exportData = async (setMessage) => {
  try {
    const response = await apiFetch('/account/export');
    if (!response.ok) { setMessage({ error: true, text: (await response.json()).message ?? 'Export unavailable.' }); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(await response.json(), null, 2)], { type: 'application/json' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'happihub-export.json' });
    link.click();
    URL.revokeObjectURL(url);
  } catch { setMessage({ error: true, text: 'Network error. Try again.' }); }
};

/** UC6: password and explicit confirmation; associations where the user is the last member are listed. */
const DeleteAccount = ({ soleMemberOf }) => {
  const { refresh } = useSession();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(false);
  const { busy, message, run } = useSubmit();
  const submit = (event) => {
    event.preventDefault();
    run(async () => {
      const { ok, data } = await send('/account', 'DELETE', { password, confirm });
      setPassword('');
      if (!ok) return { error: true, text: data.message ?? 'Unable to delete the account.' };
      await refresh(); navigate('/');
      return null;
    });
  };
  return (
    <form className="hh-form" onSubmit={submit} aria-label="Delete my account">
      <h3>Delete my account</h3>
      <p>Your account and personal data are deleted immediately. Your activity stays with the associations as “former member”.</p>
      {soleMemberOf.length > 0 && (<>
        <p role="alert">You are the last member of these associations. They will be closed with your account (upcoming events cancelled, page closed for 30 days, then deleted):</p>
        <ul>{soleMemberOf.map((a) => <li key={a.slug}>{a.name}</li>)}</ul>
      </>)}
      <Message message={message} />
      <label>Current password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></label>
      <label><span><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} required /> I understand and want to delete my account</span></label>
      <button className="hh-button hh-danger" disabled={busy || !confirm}>Delete my account</button>
    </form>
  );
};

export const AccountPage = () => {
  const { status } = useSession();
  const [account, setAccount] = useState(null);
  const [exportMessage, setExportMessage] = useState(null);
  const load = useCallback(async () => {
    const { ok, data } = await send('/account');
    setAccount(ok ? data : { failed: data.message ?? 'Unable to load your account.' });
  }, []);
  useEffect(() => { if (status === 'authenticated') load(); }, [status, load]);
  if (status === 'anonymous') return <Navigate to="/signin" state={{ from: '/account' }} replace />;
  if (status === 'unavailable') return null;
  if (!account) return <section className="hh-page"><p role="status">Loading…</p></section>;
  if (account.failed) return <section className="hh-page"><p role="alert">{account.failed}</p></section>;
  return (
    <section className="hh-page">
      <h2>My account</h2>
      {!account.emailVerified && <p role="status">Your email address is not verified yet. Check your inbox.</p>}
      <AccountForm account={account} onSaved={(saved) => setAccount((current) => ({ ...current, ...saved }))} />
      <h3>My associations</h3>
      <ul className="hh-list">
        {account.associations.map((a) => <li key={a.slug}><Link to={`/associations/${a.slug}`}>{a.name}</Link>{a.status === 'CLOSED' && ' (closed)'}</li>)}
      </ul>
      <JoinList invitations={account.invitations} />
      <NewAssociation onCreated={load} />
      <h3>My data</h3>
      <Message message={exportMessage} />
      <button className="hh-button" onClick={() => exportData(setExportMessage)}>Export my data</button>
      <DeleteAccount soleMemberOf={account.soleMemberOf} />
    </section>
  );
};
