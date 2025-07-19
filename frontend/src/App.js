import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './components/Profile';
import EditProfile from './components/EditProfile';
import InsightForm from './components/InsightForm';
import Home from './pages/Home';
import Settings from './components/Settings';
import ForgotPassword from './components/ForgotPassword';
import Bookmarks from './pages/Bookmarks';
import './style.css';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/insights/:id" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/insights/new" element={<InsightForm mode="create" />} />
          <Route path="/insights/edit/:id" element={<InsightForm mode="edit" />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
        </Routes>
        <ToastContainer
          position="top-right"
          autoClose={2000}
          hideProgressBar
          theme="dark"
          className="custom-toast-container"
        />
      </div>
    </Router>
  );
}

export default App;