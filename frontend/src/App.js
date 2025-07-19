import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TagInsights from './components/TagInsights';
import InsightForm from './components/InsightForm'; // Adjust path as needed
import Profile from './components/Profile'; // Adjust path as needed
import { toast } from 'react-toastify';
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
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Fetch user error:', error);
        toast.error('Failed to load user profile', { autoClose: 2000 });
      }
    };
    if (localStorage.getItem('token')) {
      fetchCurrentUser();
    }
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home currentUser={currentUser} />} />
        <Route path="/insights/:id" element={<Home currentUser={currentUser} />} />
        <Route path="/tags/:tag" element={<TagInsights currentUser={currentUser} />} />
        <Route path="/insights/new" element={<InsightForm currentUser={currentUser} />} />
        <Route path="/profile/:userId" element={<Profile currentUser={currentUser} />} />
        {/* Add other routes as needed, e.g., login, signup */}
      </Routes>
    </Router>
  );
}

export default App;