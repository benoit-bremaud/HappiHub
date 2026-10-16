import "./home.css";
import PropTypes from "prop-types";

export const Home = ({ account }) => (
  <div className="home">
    <h1 className="welcome-message">Welcome {account ? account.displayName || account.email : "visitor"}!</h1>
    <p className="sub-text">Culture, sharing and community through events.</p>
  </div>
);

Home.propTypes = { account: PropTypes.object };
