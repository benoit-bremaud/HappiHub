import React from "react";
import "./home.css";
import Card from "../Card/Card";
import PropTypes from "prop-types";

const Home = ({ user }) => {
  return (
    <div className="home">
      <h1>Bienvenue, {user ? user.name : ""} !</h1>
      <div className="card_display">
        <Card/>
        <Card/>
        <Card/>
        <Card/>
        <Card/>
        <Card/>
      </div>
    </div>
  )
};

Home.propTypes = {
  user: PropTypes.object,
};

export default Home;
