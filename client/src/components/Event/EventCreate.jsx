import { apiFetch } from '../../api';
import "./event.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { decodeSession } from "../../session";


const CreateEvent = ({isLoggedIn}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!decodeSession(token)) navigate('/login');
  }, [token, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setImage(reader.result);
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;
    if (!decodeSession(token)) { setError('Please sign in before creating an event.'); return; }
    setSaving(true); setError('');
    const data = {
      title,
      description,
      date,
      location,
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
      const response = await apiFetch("/events", options);
      if (response.ok) {
        navigate("/events");
      } else {
        setError('Unable to create your event. Check the details and image, then try again.');
      }
    } catch {
      setError('Unable to create your event. Your changes have been kept. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div className="container">
      <h1>Event Creation</h1>
      {error && <p role="alert">{error}</p>}
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

          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Validate"}</button>
        </form>
      </div>
    </div>
  );
};

export { CreateEvent as EventCreate };
