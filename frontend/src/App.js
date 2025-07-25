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

useEffect(() => {
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const user = await response.json();
      console.log('Fetched user:', user); // Debug
      setCurrentUser(user);
      toast.success('User profile loaded successfully', { autoClose: 2000 });
    } catch (error) {
      console.error('Fetch user error:', error);
      toast.error('Error connecting to server', { autoClose: 2000 });
    }
  };
  if (localStorage.getItem('token')) {
    fetchCurrentUser();
  }
}, []);

  return (
    <Router>
      <div>
        <Navbar currentUser={currentUser} />
        <Routes>
          <Route path="/" element={<Home currentUser={currentUser} />} />
          <Route path="/insights/:id" element={<Home currentUser={currentUser} />} />
          <Route path="/tags/:tag" element={<TagInsights currentUser={currentUser} />} />
          <Route path="/insights/new" element={<InsightForm />} />
          <Route path="/profile/:userId" element={<Profile currentUser={currentUser} />} />
          <Route path="/bookmarks" element={<Bookmarks currentUser={currentUser} />} />
          <Route path="/settings" element={<Settings currentUser={currentUser} />} />
          <Route path="/login" element={<Login />} />
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