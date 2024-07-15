import React from "react";
import "./header.css";
import Logout from "../Logout/Logout";
import { Link } from "react-router-dom";



const Header = () => {
    return (
        <header className="header">
            <div className="logo">
                <h1>LOGO</h1>
            </div>
            <div className="nav">
                <ul>
                    <li><Link to="/">Home</Link></li>
                    <li><Link to="/register">Signin</Link></li>
                    <li><Link to="/login">Login</Link></li>
                    <li><Link to="/profil">Profil</Link></li>
                </ul>
                <form>
                    <label for="truc">yoyoy</label>
                    <input id="truc" type="text" placeholder="connexion"/>
                    <Logout/>
                </form>
            </div>            
        </header>
    )
};

export default Header;