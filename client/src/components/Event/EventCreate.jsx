import "./event.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";


const CreateEvent = ({isLoggedIn}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [dataa, setDataa] = useState(null);
  const [image, setImage] = useState(null);
  const decodedToken = jwtDecode(localStorage.getItem("token"));

  const token = localStorage.getItem("token");

  useEffect(() => {
    const getUser = async () => {
      if (token) {
        const decodedToken = jwtDecode(token);
        console.log(decodedToken._id);
        // console.log(decodedToken);
        const response = await fetch(`http://localhost:5000/api/users/${decodedToken._id}`, {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
        });
        if (response.ok) {
          const dataa = await response.json();
          console.log(dataa._id);
            setDataa(dataa._id);
          if(dataa._id !== decodedToken._id){

          }else{
            console.log(dataa);
          }
        }
      } else {
        // navigate("/");
      }
    };

    getUser();
  }, [token]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    console.log(file);
    reader.onloadend = () => {
      setImage(reader.result);
    };
    console.log(image);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      title,
      description,
      date,
      location,
      creator: decodedToken._id,
      image
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
      const response = await fetch("http://localhost:5000/api/events", options);
      if (response.ok) {
        navigate("/events");
      } else {
        console.log("Error creating event");
      }
    } catch (error) {
      console.log("Error creating event:", error);
    }
  };

  return (
    <div className="container">
      <h1>Event Creation</h1>
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

          <input type="file" accept="image/*" onChange={handleImageChange} />

          <button type="submit">Validate</button>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
