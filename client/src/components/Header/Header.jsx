import React from "react";
import "./header.css";
import { Link } from "react-router-dom";



const Header = ({isLoggedIn}) => {
    return (
        <header className="header">
            <div className="logo">
                <h1>LOGO</h1>
            </div>
            <div className="nav">
                <ul>
                    <li><Link to="/"><button className="nav-btn">Home</button></Link></li>
                    { isLoggedIn &&(
                        <>
                        <li><Link to="/events/create"> <button className="nav-btn">Create Event</button></Link></li>
                        <li><Link to="/profil"><button className="nav-btn">Profil</button></Link></li>
                        <li><Link to="/events"><button className="nav-btn">Event</button></Link></li>
                        <li><Link to="/logout"><button className="nav-btn">Logout</button></Link></li>
                        </>
                    )}
                    {!isLoggedIn && (
                        <>
                    <li><Link to="/register"><button className="nav-btn">Signin</button></Link></li>
                    <li><Link to="/login"><button className="nav-btn">Login</button></Link></li>
                        </>
                    )}




                </ul>

            </div>            
        </header>
    )
};

export default Header;