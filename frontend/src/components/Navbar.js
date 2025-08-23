import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function Navbar({ currentUser }) {
  const navigate = useNavigate();
  const isAuthenticated = !!(currentUser && currentUser._id);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    toast.success('Logged out successfully', { autoClose: 2000 });
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
                <Link className="nav-link" to={`/profile/${currentUser._id}`}>Profile</Link>
                <Link className="nav-link" to="/bookmarks">Bookmarks</Link>
                {currentUser.isAdmin && (
                  <Link className="nav-link" to="/admin">Admin Dashboard</Link>
                )}
                <Link className="nav-link" to="/settings">Settings</Link>
                <button
                  className="nav-link btn btn-link"
                  onClick={handleLogout}
                >
                  Logout
                </button>
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