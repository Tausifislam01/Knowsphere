import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import InsightForm from './components/InsightForm';
import Home from './pages/Home';

function App() {
  return (
    <Router>
      <div>
        {/* Navbar */}
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
          <div className="container-fluid">
            <a className="navbar-brand" href="/">KnowSphere</a>
            <div className="navbar-nav">
              <a className="nav-link" href="/">Home</a>
              <a className="nav-link" href="/profile">Profile</a>
              <a className="nav-link" href="/login">Login</a>
              <a className="nav-link" href="/signup">Signup</a>
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;