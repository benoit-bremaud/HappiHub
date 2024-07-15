import "./event.css";
import React, { useState, useEffect } from "react";
import Card from "../Card/Card";
// import React, { useState } from "react";


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
      <div className="event">
        <h1>Event</h1>
        <ul>
          {events.map((event) => (

            <li><Card event={event}/></li>

          ))}
        </ul>
      </div>
    );
  };
  

export default Event;