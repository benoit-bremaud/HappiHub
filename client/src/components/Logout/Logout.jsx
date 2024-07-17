import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = ({ handleLogout }) => {
  const navigate = useNavigate();

  useEffect(() => {
    handleLogout();
    navigate("/");
    window.location.reload();
  }, []);

  return (
    <div>
      <p>Logging out...</p>
    </div>
  );
};

export default Logout;
