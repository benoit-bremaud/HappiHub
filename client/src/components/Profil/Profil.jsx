import { apiFetch } from '../../api';
import "./profil.css";

import { useEffect, useState } from "react";

import PropTypes from "prop-types";
import { useSession } from "../../session";
import { useNavigate } from "react-router-dom";

const Profile = ({ user }) => {
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { user: session, status, refresh } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'anonymous') { navigate('/login'); return; }
    if (session) { setEmail(session.email); setName(session.name); }
  }, [session, status, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;
    setSaving(true); setError(''); setSaved(false);


    const data = {
      email,
      name,
      ...(password ? { password, currentPassword } : {}),
    };

    const options = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",

      },
      body: JSON.stringify(data),
    };

    try {
      const response = await apiFetch("/users/profile", options);
      if (!response.ok) throw new Error('Request failed');
      setPassword(''); setCurrentPassword(''); setSaved(true);
      await refresh();
      if (password) navigate('/login');
    } catch {
      setError('Unable to save your profile. Your changes have been kept. Please try again.');
    } finally { setSaving(false); }
  };

  if (status === 'loading') return <p role="status">Checking your session…</p>;
  if (status === 'unavailable') return <p role="alert">Authentication unavailable.</p>;
  if (!session) return null;

  return (
    <div className="profile-container">
      <h1>Profil</h1>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Profile saved.</p>}
      <div className="user">
        <h2>name : {name}</h2>
        <p>{email}</p>
      </div>
      <div className="profil">
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            placeholder="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && <><label htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)} required /></>}
          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Submit"}</button>
        </form>
      </div>
    </div>
  );
};

Profile.propTypes = {
  user: PropTypes.object,
};

export { Profile as Profil };