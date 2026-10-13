import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api';
import { useSession } from '../../session';
/** Explicit action avoids duplicate mutation effects under React StrictMode. */
export const Logout = () => {
  const { acceptSession, refresh } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const signOut = async () => {
    if (saving) return;
    setSaving(true); setError('');
    try {
      const response = await apiFetch('/users/logout', { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!response.ok) throw new Error('Logout failed');
      acceptSession({ user: null }); await refresh(); navigate('/');
    } catch { setError('Unable to confirm logout. Refresh your session before retrying.'); }
    finally { setSaving(false); }
  };
  return <div><h1>Sign out</h1>{error && <p role="alert">{error}</p>}
    <button onClick={signOut} disabled={saving}>{saving ? 'Signing out…' : 'Sign out'}</button></div>;
};
