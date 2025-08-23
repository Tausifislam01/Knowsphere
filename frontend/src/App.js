import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import Home from './pages/Home';
import TagInsights from './components/TagInsights';
import InsightForm from './components/InsightForm';
import Profile from './components/Profile';
import Navbar from './components/Navbar';
import Bookmarks from './pages/Bookmarks';
import Settings from './components/Settings';
import Login from './components/Login';
import Signup from './components/Signup';
import EditProfile from './components/EditProfile';
import AdminDashboard from './pages/AdminDashboard';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './style.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCurrentUser(null);
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        localStorage.setItem('userId', user._id);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        setCurrentUser(null);
        toast.error('Failed to load user profile', { autoClose: 2000 });
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      setCurrentUser(null);
      toast.error('Error connecting to server', { autoClose: 2000 });
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const handleUserUpdate = (event) => {
      setCurrentUser(event.detail);
    };
    window.addEventListener('userUpdated', handleUserUpdate);
    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, []);

  const handleLogin = async (token) => {
    localStorage.setItem('token', token);
    await fetchCurrentUser();
  };

  return (
    <Router>
      <div>
        <Navbar currentUser={currentUser} />
        <Routes>
          <Route path="/" element={<Home currentUser={currentUser} />} />
          <Route path="/insights" element={<Home currentUser={currentUser} />} />
          <Route path="/insights/search" element={<Home currentUser={currentUser} />} />
          <Route path="/insights/:id" element={<Home currentUser={currentUser} />} />
          <Route path="/tags/:tag" element={<TagInsights currentUser={currentUser} />} />
          <Route path="/insights/new" element={<InsightForm mode="create" />} />
          <Route path="/insights/edit/:insightId" element={<InsightForm mode="edit" />} />
          <Route path="/profile/:userId" element={<Profile currentUser={currentUser} />} />
          <Route path="/profile" element={<Profile currentUser={currentUser} />} />
          <Route path="/bookmarks" element={<Bookmarks currentUser={currentUser} />} />
          <Route path="/settings" element={<Settings currentUser={currentUser} />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/edit-profile" element={<EditProfile currentUser={currentUser} />} />
          <Route path="/admin" element={<AdminDashboard currentUser={currentUser} />} />
          <Route path="*" element={
            <div className="container mt-5">
              <h2>404 - Page Not Found</h2>
              <Link to="/" className="glossy-button btn btn-sm">Back to Home</Link>
            </div>
          } />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />
      </div>
    </Router>
  );
}

export default App;