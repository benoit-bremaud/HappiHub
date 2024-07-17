import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";
import Header from './components/Header/Header';
import Home from './components/Home/Home';
import Register from './components/Register/Register';
import Connexion from './components/Connexion/Connexion';
import Profil from './components/Profil/Profil';
import Event from './components/Event/Event';
import Logout from './components/Logout/Logout';
import EventCreate from './components/Event/EventCreate';
import { useState, useEffect } from "react";

function App() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      const decodedToken = jwtDecode(token);
      setUser(decodedToken);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <div className="App">
      <Router>
        <Header isLoggedIn={isLoggedIn} />
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Connexion setIsLoggedIn={setIsLoggedIn} />} />
          <Route path="/logout" element={<Logout handleLogout={handleLogout}/>}/>
          <Route path="/profil" element={<Profil user={user}/>}/>
          <Route path="/events" element={<Event/> }/>
          <Route path="/events/create" element={<EventCreate/> }/>
        </Routes>
      </Router>
    </div>
  );
}

export default App;
