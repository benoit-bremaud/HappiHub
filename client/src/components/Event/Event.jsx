import "./event.css";

import React, { useEffect, useState } from "react";

import Card from "../Card/Card";
import { useNavigate } from 'react-router-dom';

const Event = ({isLoggedIn}) => {
  const navigate = useNavigate();

  // useEffect(() => {
  //   if (!isLoggedIn) {
  //     navigate("/");
  //   }
  // }, [isLoggedIn]);

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
  
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
        }else if(!token){
          navigate("/");
        }

      };
  
      fetchEvents();
      console.log(events);
    }, []);
  
    return (
        <div className="event-container">
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