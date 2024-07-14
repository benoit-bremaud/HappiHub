import React from "react";
import "./home.css";
import Card from "../Card/Card";
import Connexion from "../Connexion/Connexion";
import Register from "../Register/Register";

const Home = () => {
    return (
        <div className="home">
            <h1>Home</h1>
            <button className="btn btn-primary">Mon bouton</button>
            <Connexion/>
            <Register/>
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

export default Home;