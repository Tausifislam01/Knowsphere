import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import InsightForm from './components/InsightForm';
import Home from './pages/Home';
import Settings from './components/Settings';
import ForgotPassword from './components/ForgotPassword';
import './style.css';
import './index.css';

function App() {
  const isAuthenticated = !!localStorage.getItem('token');

  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <nav className="glossy-navbar navbar navbar-expand-lg navbar-dark sticky-top">
          <div className="container-fluid">
            <a className="navbar-brand" href="/">KnowSphere</a>
            <div className="navbar-nav">
              <a className="nav-link" href="/">Home</a>
              {isAuthenticated ? (
                <>
                  <a className="nav-link" href="/profile">Profile</a>
                  <a className="nav-link" href="/settings">Settings</a>
                  <a className="nav-link" href="/login" onClick={() => localStorage.removeItem('token')}>
                    Logout
                  </a>
                </>
              ) : (
                <>
                  <a className="nav-link" href="/login">Login</a>
                  <a className="nav-link" href="/signup">Signup</a>
                </>
              )}
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/insights/new" element={<InsightForm mode="create" />} />
          <Route path="/insights/edit/:id" element={<InsightForm mode="edit" />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;