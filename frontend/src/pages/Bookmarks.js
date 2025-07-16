import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookmarkButton from '../components/BookmarkButton';
import VoteButtons from '../components/VoteButtons';
import CommentSection from '../components/CommentSection';

function Bookmarks() {
  const [bookmarks, setBookmarks] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        setIsLoading(true);
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
            <div key={bookmark._id} id={`insight-${bookmark.insightId._id}`} className="col-md-6 col-lg-4">
              <div className="card glossy-card h-100">
                <div className="card-body">
                  <h5 className="card-title">{bookmark.insightId.title}</h5>
                  <p className="card-text text-muted">{bookmark.insightId.body}</p>
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={bookmark.insightId.userId?.profilePicture || 'https://via.placeholder.com/40'}
                      className="rounded-circle me-2"
                      width="30"
                      height="30"
                      alt="Author"
                    />
                    <small className="text-muted">
                      By {bookmark.insightId.userId?.username || 'Anonymous'} • {new Date(bookmark.insightId.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  {bookmark.insightId.tags && (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {bookmark.insightId.tags.split(',').map((tag, index) => (
                        <span key={index} className="badge bg-light text-dark">
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  <BookmarkButton insightId={bookmark.insightId._id} />
                  <VoteButtons
                    insightId={bookmark.insightId._id}
                    initialUpvotes={bookmark.insightId.upvotes || []}
                    initialDownvotes={bookmark.insightId.downvotes || []}
                  />
                </div>
                <div className="card-footer bg-transparent">
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