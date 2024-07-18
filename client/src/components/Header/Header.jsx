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
                    <li><Link to="/">Home</Link></li>
                    { isLoggedIn &&(
                        <>
                        <li><Link to="/events/create">Create Event</Link></li>
                        <li><Link to="/profil">Profil</Link></li>
                        <li><Link to="/events">Event</Link></li>
                        <li><Link to="/logout">Logout</Link></li>
                        </>
                    )}
                    {!isLoggedIn && (
                        <>
                    <li><Link to="/register">Signin</Link></li>
                    <li><Link to="/login">Login</Link></li>
                        </>
                    )}




                </ul>
                {/* <form>
                    <label for="truc">yoyoy</label>
                    <input id="truc" type="text" placeholder="connexion"/>
                    <Logout/>
                </form> */}
            </div>            
        </header>
    )
};

export default Header;