import React from "react";
import "./card.css";
import PropTypes from "prop-types";

const Card = ({ event,onClick }) => {
  return (
    <div className="card" onClick={() => onClick(event)}>
      <h1 className="card_title">{event.title}</h1>
      <img src={event.image || "https://picsum.photos/id/238/300/300"} alt="Event" className="card_image" />
      <div className="card_content">
        <p className="card_description">{event.description}</p>
        <p className="card_date">{event.date}</p>
        <p className="card_location">{event.location}</p>
      </div>
    </div>
  );
};

Card.propTypes = {
  event: PropTypes.object.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default Card;

