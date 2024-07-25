import "./home.css";

import PropTypes from "prop-types";
import React from "react";
import { useNavigate } from "react-router-dom";

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

    </div>
  );
};

Home.propTypes = {
  user: PropTypes.object,
};

export default Home;
