import { API_URL } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Insight from '../components/Insight';

function Bookmarks({ currentUser }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        setIsLoading(true);
  const response = await fetch(`${API_URL}/bookmarks`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setBookmarks(data);
        } else {
          setError(data.message || 'Failed to fetch bookmarks');
          toast.error(data.message || 'Failed to fetch bookmarks', { autoClose: 2000 });
        }
      } catch (error) {
        setError('Error: ' + error.message);
        toast.error('Error: ' + error.message, { autoClose: 2000 });
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };
    if (localStorage.getItem('token')) {
      fetchBookmarks();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleEdit = (insightId) => {
    navigate(`/insights/edit/${insightId}`);
  };

  const handleDelete = async (insightId) => {
    if (!window.confirm('Are you sure you want to delete this insight?')) return;
    try {
      const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/insights/${insightId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        setBookmarks(bookmarks.filter((bookmark) => bookmark.insightId._id !== insightId));
        toast.success('Insight deleted successfully', { autoClose: 2000 });
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete insight', { autoClose: 2000 });
      }
    } catch (error) {
      toast.error(`Error deleting insight: ${error.message}`, { autoClose: 2000 });
    }
  };

  return (
    <div className="container py-5">
      <h2 className="text-center mb-4 text-white">
        <i className="bi bi-bookmark-fill me-2"></i> Your Bookmarks
      </h2>
      <Link to="/" className="glossy-button btn btn-sm mb-4">
        <i className="bi bi-arrow-left me-2"></i>Back to Home
      </Link>
      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{error}</div>
        </div>
      )}
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading bookmarks...</p>
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-bookmark text-muted" style={{ fontSize: '3rem' }}></i>
          <p className="text-muted mt-3">No bookmarks yet.</p>
          <button className="glossy-button mt-2" onClick={() => navigate('/')}>
            Browse Insights
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {bookmarks.map((bookmark) => (
            <Insight
              key={bookmark._id}
              insight={bookmark.insightId}
              currentUser={currentUser}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Bookmarks;