import React from "react";
import "./card.css";

const Card = () => {
    return (
        <div className="card">
            <h1>CardName</h1>
            <img src="https://picsum.photos/id/238/300/300" alt="image de presentation"/>
            <p>description</p>
            <button>button</button>
        </div>
    )
};

export default Card;