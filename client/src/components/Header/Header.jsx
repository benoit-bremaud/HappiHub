import "./header.css";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../../session";
import { send } from "../../accounts/request";

/**
 * Compact header (agenda visual design § 5.3, D7): the wordmark links Home and the current
 * links follow; it wraps instead of overlapping on phones (#285). Sign-out revokes the
 * server session (DELETE /session).
 */
export const Header = () => {
  const { status, refresh } = useSession();
  const navigate = useNavigate();
  const signOut = async () => {
    await send("/session", "DELETE");
    await refresh();
    navigate("/");
  };
  return (
    <header className="header">
      <h1 className="header__brand"><Link to="/">HappiHub</Link></h1>
      <nav className="nav" aria-label="Main">
        <ul>
          {status === "authenticated" ? (
            <>
              <li><Link className="nav-btn" to="/account">My account</Link></li>
              <li><button type="button" className="nav-btn" onClick={signOut}>Sign out</button></li>
            </>
          ) : (
            <>
              <li><Link className="nav-btn" to="/signup">Sign up</Link></li>
              <li><Link className="nav-btn" to="/signin">Sign in</Link></li>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
};
