import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/login');
  };

  return (
    <nav className="glossy-navbar navbar navbar-expand-lg navbar-dark sticky-top">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">KnowSphere</Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" to="/">Home</Link>
            {isAuthenticated ? (
              <>
                <Link className="nav-link" to="/profile">Profile</Link>
                <Link className="nav-link" to="/bookmarks">Bookmarks</Link>
                <Link className="nav-link" to="/settings">Settings</Link>
                <Link
                  className="nav-link"
                  to="/login"
                  onClick={handleLogout}
                >
                  Logout
                </Link>
              </>
            ) : (
              <>
                <Link className="nav-link" to="/login">Login</Link>
                <Link className="nav-link" to="/signup">Signup</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;