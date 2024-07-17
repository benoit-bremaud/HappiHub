import "./event.css";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";


const CreateEvent = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [location, setLocation] = useState('');

    const token = localStorage.getItem("token");


    const handleSubmit = async (e) => {
        e.preventDefault();
    
    const data = {
        title,
        description,
        date,
        location,
    };


    // const [events, setEvents] = useState([]);
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
      };


      const response = fetch("http://localhost:5000/api/events", options);
    //   const json = response.json();
    //   console.log(json);
    // const resdata = await response.json();
    // console.log(resdata);
    navigate("/events");
    };

    return(

        <div className="container">
            <h1>Event</h1>
            <div className="event">

                <form onSubmit={handleSubmit}>
                <label htmlFor="title">title</label>
                <input
                    type="text"
                    id="title"
                    placeholder='title'
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                <label htmlFor="description">description</label>
                <input
                    type="text"
                    id="description"
                    placeholder='description'
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />

                <label htmlFor="date">date</label>
                <input
                    type="date"
                    id="date"
                    placeholder='date'
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                />
                <label htmlFor="location">location</label>
                <input
                    type="text"
                    id="location"
                    placeholder='location'
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                />

                <button type="submit">Validate</button>
                </form>
            </div>
        </div>
    )
};

export default CreateEvent;