import "./event.css";
// import React, { useState } from "react";


const Event = () => {




    const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
            Authorization: `Bearer ${tokent}`
        },
        body: JSON.stringify(data),
      };
  
      const response = await fetch("http://localhost:5000/api/events", options);
      const json = await response.json();
      if (response.ok) {

      }

    return(
        <div className="event">
            <h1>Event</h1>

        </div>
    )
};

export default Event;