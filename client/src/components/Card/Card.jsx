import React from "react";
import "./card.css";
import PropTypes from "prop-types";

const Card = ({ event }) => {

    return (
        <div className="card">
            <h1>{event.title}</h1>
            <img src="https://picsum.photos/id/238/300/300" alt="image de presentation"/>
            <p>{event.description}</p>
            <p>{event.date}</p>
            <p>{event.location}</p>
            {/* <button>button</button> */}
        </div>
    )
};

Event.propTypes = {
    event: PropTypes.object,
  };

export default Card;