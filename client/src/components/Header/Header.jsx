import React from "react";
import "./header.css";



const Header = () => {
    return (
        <header className="header">
            <div className="logo">
                <h1>LOGO</h1>
            </div>
            <div className="nav">
                <ul>
                    <li><a href="">event</a></li>
                    <li><a href="">event</a></li>
                    <li><a href="">event</a></li>
                </ul>
                <form>
                    <label for="truc">yoyoy</label>
                    <input id="truc" type="text" placeholder="connexion"/>
*
                </form>
            </div>            
        </header>
    )
};

export default Header;