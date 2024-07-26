import "./profil.css";

import { useEffect, useState } from "react";

import PropTypes from "prop-types";
import {jwtDecode} from "jwt-decode";
import { useNavigate } from "react-router-dom";

const Profile = ({ user }) => {
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const decodedToken = jwtDecode(token);

        // Vérifiez si le token est expiré
        if (decodedToken.exp * 1000 < Date.now()) {
          navigate("/");
          return;
        }

        const response = await fetch("http://localhost:5000/api/users/profile", {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user._id !== decodedToken._id) {
            navigate("/");
          } else {
            setEmail(data.user.email);
            setName(data.user.name);
          }
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Failed to fetch user data", error);
        navigate("/");
      }
    };

    getUser();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const tokent = localStorage.getItem("token");

    const data = {
      email,
      name,
      password,
    };

    const options = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokent}`,
      },
      body: JSON.stringify(data),
    };

    const response = await fetch("http://localhost:5000/api/users/profile", options);
  };

  if (!user) {
    return <div>Chargement du profil...</div>;
  }

  return (
    <div className="profile-container">
      <h1>Profil</h1>
      <div className="user">
        <h2>name : {name}</h2>
        <p>{email}</p>
      </div>
      <div className="profil">
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            placeholder="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Submit</button>
        </form>
      </div>
    </div>
  );
};

Profile.propTypes = {
  user: PropTypes.object,
};

export default Profile;