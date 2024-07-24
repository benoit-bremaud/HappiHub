import React from "react";
import "./home.css";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

const Home = ({ user }) => {
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    if (user) {
      navigate(path);
    } else {
      navigate("/login", { state: { from: { pathname: path } } });
    }
  };

  
  return (
    <div className="home">
      <h1 className="welcome-message">Bienvenue {user ? user.name : "Visiteur"} !</h1>
      <p className="sub-text">
        Découvrez, créez et participez à des événements passionnants dans votre communauté.
      </p>
      <div className="actions">
        <button className="btn discover-btn" onClick={() => handleNavigate("/events")}>Découvrir</button>
        <button className="btn create-btn" onClick={() => handleNavigate("/events/create")}>Créer</button>
        <button className="btn participate-btn" onClick={() => handleNavigate("/events")}>Participer</button>
      </div>
    </div>
  );
};

Home.propTypes = {
  user: PropTypes.object,
};

export default Home;
