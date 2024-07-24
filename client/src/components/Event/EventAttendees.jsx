import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { useParams } from 'react-router-dom';

const EventAttendees = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const token = localStorage.getItem("token");
  const decodedToken = jwtDecode(token);
  const strId = decodedToken._id.toString();
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    const fetchAttendees = async () => {
      const response = await fetch(`http://localhost:5000/api/events/attend/${id}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      setAttendees(data.attendees || []);
      console.log(data);
    };
    fetchAttendees();
  }, [id, token]);

  const handleSubmitAttendees = async (e) => {
    e.preventDefault();
  
    const data = {
      attendees: [strId],
    };
  
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(data),
    };
  
    try {
      const response = await fetch(`http://localhost:5000/api/events/attend/${id}`, options);
      if (response.ok) {
        navigate("/events");
      } else {
        console.log("error inscription a l'event");
      }
    } catch (error) {
      console.log("Error inscription event:", error);
    }
  };
  
  

  return (
    <div className="event-info">
      <h2>Attendees</h2>
      <ul>
        {attendees.length > 0 && attendees.map((attendee) => (
          <li key={attendee._id}>{attendee.name}</li>
        ))}
      </ul>
      <form onSubmit={handleSubmitAttendees}>
        <button type="submit">Validate</button>
      </form>
    </div>
  );
};

export default EventAttendees;
