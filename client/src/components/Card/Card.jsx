import React from "react";
import "./card.css";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const Card = ({ event }) => {
  return (
    <div className="card">
      <h1>{event.title}</h1>
      <img src={`${event.image}`} alt="image de présentation" />
      <p>description : {event.description}</p>
      <p>date : {event.date}</p>
      <p>location : {event.location}</p>
      <p>eventId : {event._id}</p>
      <p>userId : {event.creator}</p>
      <p><Link to={`/events/${event._id}`}>info</Link></p>

    </div>
  );
};

Card.propTypes = {
  event: PropTypes.object,
};

export default Card;
