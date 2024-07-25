import "./event.css";
import React, { useState, useEffect } from "react";
import Card from "../Card/Card";
import { useNavigate, useParams } from 'react-router-dom';
import Comment from "../Comment/Comment";

const EventInfo = ({ event }) => {

    const navigate = useNavigate();
    const { id } = useParams();
    const [data, setData] = useState(null);
    const token = localStorage.getItem("token");

    const options = {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      };
    
    useEffect(() => {
        const fetchData = async () => {
        const response = await fetch(`http://localhost:5000/api/events/${id}`, options);
        if (response.ok) {
            const data = await response.json();

            setData(data);
        } else {
            // navigate("/events");
        }
        };
    
        fetchData();
    }, [id, navigate]);
    
    return (
        <div className="container">
        <div className="event-info">
            {data && <Card event={data} />}
            <Comment />
        </div>
        </div>
    );
};

export default EventInfo;