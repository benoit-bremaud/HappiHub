import { useState, useEffect } from "react";
import "./profil.css";
import PropTypes from "prop-types";
import Home from "../Home/Home";
import { jwtDecode } from "jwt-decode";


const Profile = ({ user }) => {
    const [email, setEmail] = useState(user?.email || "");
    const [name, setName] = useState(user?.name || "");
    const [password, setPassword] = useState("");
    const token = localStorage.getItem("token");
  
    useEffect(() => {
      if (token) {
        const decodedToken = jwtDecode(token);
        setPassword(decodedToken.user?.password || "");
      }
    }, [token]);
  
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
          "Authorization": `Bearer ${tokent}`
        },
        body: JSON.stringify(data),
      };
  
      const response = await fetch("http://localhost:5000/api/users/profile", options);
    };
  
    if (!user) {
      return <div>Chargement du profil...</div>;
    }
  
    return (
      <div className="container">
          <h1>Profil</h1>
          <div className="user">
            <h2>name :{user.name}</h2>
            <p>{user.email}</p>
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
    )
  }
  

  Home.propTypes = {
    user: PropTypes.object,
  };
  
  export default Profile;