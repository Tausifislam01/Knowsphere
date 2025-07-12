import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const response = await fetch('/api/bookmarks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setBookmarks(data);
        } else {
          setError(data.message || 'Failed to fetch bookmarks');
          navigate('/login');
        }
      } catch (error) {
        setError('Error: ' + error.message);
        navigate('/login');
      }
    };
    fetchBookmarks();
  }, [navigate]);

  return (
    <div className="container">
      <Navbar />
      <h2 className="mt-4">Your Bookmarks</h2>
      {error && <p className="text-danger">{error}</p>}
      {bookmarks.length === 0 ? (
        <p className="text-muted">No bookmarks yet.</p>
      ) : (
        bookmarks.map((bookmark) => (
          <div key={bookmark._id} className="card mb-3 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">{bookmark.title}</h5>
              <p className="card-text">{bookmark.body}</p>
              <p className="card-text">
                <small className="text-muted">
                  By {bookmark.userId?.username || 'Unknown'} | Tags: {bookmark.tags || 'None'}
                </small>
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Bookmarks;