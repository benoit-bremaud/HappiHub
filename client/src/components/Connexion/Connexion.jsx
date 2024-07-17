import React, { useState } from "react";
import "./connexion.css";
import { useNavigate } from "react-router-dom";

const Connexion = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      email,
      password,
    };

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    };

    const response = await fetch("http://localhost:5000/api/users/login", options);
    const json = await response.json();
    if (response.ok) {
      localStorage.setItem("token", json.token);
      navigate("/");
      window.location.reload();
    }
  };

  return (
    <div className="container">
      <h1>Connexion</h1>
      <div className="connexion">


        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">connexion</button>
        </form>
      </div>
    </div>
  );
};

export default Connexion;
