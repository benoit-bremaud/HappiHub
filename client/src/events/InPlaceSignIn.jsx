import PropTypes from 'prop-types';
import { useState } from 'react';
import { useSession } from '../session';
import { send } from '../accounts/request';

/** UC15 *b: sign in again without leaving the page; the member then saves explicitly. */
export const InPlaceSignIn = ({ email, onSignedIn }) => {
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
      {password && <button type="submit" className="hh-button">Sign in again</button>}
    </form>
  );
};
InPlaceSignIn.propTypes = { email: PropTypes.string.isRequired, onSignedIn: PropTypes.func.isRequired };
