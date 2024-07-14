import React from 'react';


const Logout = () => {


  const handleLogout = () => {
    // Remove the token from local storage
    localStorage.removeItem('token');

    // Redirect to the login page

  };

  return (
    <button onClick={handleLogout}>
      Logout
    </button>
  );
};

export default Logout;
