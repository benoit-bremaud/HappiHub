import "./event.css";
import React, { useState, useEffect } from "react";
import Card from "../Card/Card";



const Event = () => {


    const token = localStorage.getItem("token");
  
    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    };
  
    const [events, setEvents] = useState([]);
  
    useEffect(() => {
      const fetchEvents = async () => {
        const response = await fetch("http://localhost:5000/api/events", options);
        const json = await response.json();
        if (response.ok) {
          setEvents(json);
        }
      };
  
      fetchEvents();
      console.log(events);
    }, []);
  
    return (
        <div className="container">
          <h1>Event</h1>
          <div className="event-list">
            {events.map((event) => (
              <div className="event-item" key={event._id}>
                <Card event={event} />
              </div>
            ))}
          </div>
        </div>
      );
  };
  

export default Event;