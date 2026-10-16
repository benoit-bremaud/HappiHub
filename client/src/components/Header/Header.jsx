import "./header.css";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../../session";
import { send } from "../../accounts/request";

/** Navigation; sign-out revokes the server session (DELETE /session). */
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
      <div className="logo"><h1>HappiHub</h1></div>
      <nav className="nav">
        <ul>
          <li><Link className="nav-btn" to="/">Home</Link></li>
          {status === "authenticated" ? (
            <>
              <li><Link className="nav-btn" to="/account">My account</Link></li>
              <li><button className="nav-btn" onClick={signOut}>Sign out</button></li>
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
