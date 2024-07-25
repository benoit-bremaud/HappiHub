import "./comment.css";

import React, { useEffect, useState } from "react";

import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";

const Comment = () => {
  const { id } = useParams();
  const [content, setContent] = useState("");
  const [data, setData] = useState([]);
  const token = localStorage.getItem("token");
  const decodedToken = jwtDecode(token);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      if (token) {
        const decodedToken = jwtDecode(token);
        console.log(decodedToken._id);
        const fetchData = async () => {
          const response = await fetch(`http://localhost:5000/api/comments/events/${id}/comments`);
          if (response.ok) {
            const data = await response.json();
            console.log(data);
            setData(data);
          } else {
            // navigate("/events");
          }
        };
        fetchData();
      } else {
        navigate("/");
      }
    };

    getUser();
  }, [token]);

  function refreshPage() {
    window.location.reload(false);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      content,
      user_id: decodedToken._id,
      event_id: id,
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
      const response = await fetch("http://localhost:5000/api/comments/add", options);
      if (response.ok) {
        // navigate("/events/:id");
        console.log("comment added");
        const newComment = await response.json();
        setData([...data, newComment]);
      } else {
        console.log("Error creating event");
      }
    } catch (error) {
      console.log("Error creating event:", error);
    }
  };

  return (
    <div className="comments-div">
      <h1 className="comments-title">Add comments</h1>
      <form onSubmit={handleSubmit} className="commentsAddForm">
        <input
          type="text"
          placeholder="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <button onClick={refreshPage} type="submit">Submit</button>
      </form>
      <div className="comments-view">
        {data.map(comment => (
            <div className="commentaire" key={comment._id}>
                <strong>{comment.user_id.name}</strong>
                <div className="contents">
                <p>{comment.content}</p>
                </div>
            </div>
            ))}
        </div>
    </div>
  );
};

export default Comment;