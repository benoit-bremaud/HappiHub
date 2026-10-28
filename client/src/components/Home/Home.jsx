import "./home.css";
import PropTypes from "prop-types";
import { Agenda } from "../../events/Agenda";

export const Home = ({ account }) => (
  <div className="home">
    <h1 className="welcome-message">Welcome {account ? account.displayName || account.email : "visitor"}!</h1>
    <p className="sub-text">Culture, sharing and community through events.</p>
    <Agenda />
  </div>
);

Home.propTypes = { account: PropTypes.object };
