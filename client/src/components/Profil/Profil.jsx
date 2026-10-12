import { apiFetch } from '../../api';
import "./profil.css";

import { useEffect, useState } from "react";

import PropTypes from "prop-types";
import { decodeSession } from "../../session";
import { useNavigate } from "react-router-dom";

const Profile = ({ user }) => {
  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState(user?.name || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const decodedToken = decodeSession(token);

        // Vérifiez si le token est expiré
        if (!decodedToken) {
          navigate("/");
          return;
        }

        const response = await apiFetch("/users/profile", {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user._id !== decodedToken?._id) {
            navigate("/");
          } else {
            setEmail(data.user.email);
            setName(data.user.name);
          }
        } else {
          navigate("/");
        }
      } catch (error) {
        setError('Unable to load your profile. Please try again.');
      }
    };

    getUser();
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;
    setSaving(true); setError(''); setSaved(false);
    const tokent = localStorage.getItem("token");

    const data = {
      email,
      name,
      ...(password ? { password } : {}),
    };

    const options = {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokent}`,
      },
      body: JSON.stringify(data),
    };

    try {
      const response = await apiFetch("/users/profile", options);
      if (!response.ok) throw new Error('Request failed');
      setPassword(''); setSaved(true);
    } catch {
      setError('Unable to save your profile. Your changes have been kept. Please try again.');
    } finally { setSaving(false); }
  };

  if (!user) {
    return <div>Chargement du profil...</div>;
  }

  return (
    <div className="profile-container">
      <h1>Profil</h1>
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">Profile saved.</p>}
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
          <button type="submit" disabled={saving}>{saving ? "Saving…" : "Submit"}</button>
        </form>
      </div>
    </div>
  );
};

Profile.propTypes = {
  user: PropTypes.object,
};

export { Profile as Profil };