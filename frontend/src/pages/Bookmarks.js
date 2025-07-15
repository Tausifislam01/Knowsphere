import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookmarkButton from '../components/BookmarkButton';
import VoteButtons from '../components/VoteButtons';
import CommentSection from '../components/CommentSection';

function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/bookmarks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setBookmarks(data);
        } else {
          setError(data.message || 'Failed to fetch bookmarks');
        }
      } catch (error) {
        setError('Error: ' + error.message);
        navigate('/login');
      }
    };
    if (localStorage.getItem('token')) {
      fetchBookmarks();
    } else {
      navigate('/login');
    }
  }, [navigate]);

  return (
    <div className="container py-5">
      <h2 className="text-center mb-4 text-white">
        <i className="bi bi-bookmark-fill me-2"></i> Your Bookmarks
      </h2>
      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{error}</div>
        </div>
      )}
      {bookmarks.length === 0 ? (
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
            <div key={bookmark._id} className="col-md-6 col-lg-4">
              <div className="card glossy-card h-100">
                <div className="card-body">
                  <h5 className="card-title">{bookmark.insightId.title}</h5>
                  <p className="card-text text-muted">{bookmark.insightId.body}</p>
                  {bookmark.insightId.tags && (
                    <div className="d-flex flex-wrap gap-2">
                      {bookmark.insightId.tags.split(',').map((tag, index) => (
                        <span key={index} className="badge bg-light text-dark">
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card-footer text-muted">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Posted by {bookmark.insightId.userId?.username || 'Unknown'} • {bookmark.insightId.visibility}</span>
                    <BookmarkButton insightId={bookmark.insightId._id} />
                  </div>
                  <VoteButtons
                    insightId={bookmark.insightId._id}
                    initialUpvotes={bookmark.insightId.upvotes}
                    initialDownvotes={bookmark.insightId.downvotes}
                  />
                  <CommentSection insightId={bookmark.insightId._id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Bookmarks;