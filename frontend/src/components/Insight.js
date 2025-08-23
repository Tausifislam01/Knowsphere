import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import FollowButton from './FollowButton';
import CommentSection from './CommentSection';
import BookmarkButton from './BookmarkButton';
import ReportButton from './ReportButton';
import { getRelatedInsights } from '../utils/api';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const BACKEND_URL = 'http://localhost:5000';
const socket = io(BACKEND_URL, {
  auth: { token: localStorage.getItem('token') },
});

function Insight({ insight, currentUser, onEdit, onDelete }) {
  // Initialize voteStatus with insight data or fallback
  const [voteStatus, setVoteStatus] = useState({
    upvotes: insight?.upvotes?.length || 0,
    downvotes: insight?.downvotes?.length || 0,
  });
  const [showReportForm, setShowReportForm] = useState(false);
  const [relatedInsights, setRelatedInsights] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState('');
  const tagsArray = Array.isArray(insight?.tags) ? insight.tags : [];

  useEffect(() => {
    if (!insight) return;

    // Update voteStatus when insight prop changes
    setVoteStatus({
      upvotes: insight.upvotes?.length || 0,
      downvotes: insight.downvotes?.length || 0,
    });

    // Listen for real-time vote updates
    socket.on('insightVoted', ({ insightId }) => {
      if (insightId === insight._id) {
        // Fetch updated insight to ensure accurate vote counts
        fetch(`http://localhost:5000/api/insights/${insight._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
          .then(response => response.json())
          .then(data => {
            setVoteStatus({
              upvotes: data.upvotes?.length || 0,
              downvotes: data.downvotes?.length || 0,
            });
          })
          .catch(err => {
            console.error('Error fetching updated insight:', err.message);
            toast.error('Failed to update vote counts', { autoClose: 2000 });
          });
      }
    });

    const fetchRelated = async () => {
      try {
        setRelatedLoading(true);
        const data = await getRelatedInsights(insight._id);
        setRelatedInsights(data);
        if (data.length === 0) {
          setRelatedError('No related insights found. This may be due to missing embeddings or insufficient similar content.');
        }
      } catch (error) {
        setRelatedError('Failed to load related insights. Please try again later.');
        toast.error('Failed to load related insights', { autoClose: 2000 });
      } finally {
        setRelatedLoading(false);
      }
    };
    fetchRelated();

    return () => {
      socket.off('insightVoted');
      socket.off('insightCreated');
      socket.off('insightUpdated');
      socket.off('insightDeleted');
    };
  }, [insight]);

  const handleVote = async (voteType) => {
    if (!insight) return;
    try {
      const response = await fetch(`http://localhost:5000/api/insights/${insight._id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ voteType }),
      });
      const data = await response.json();
      if (response.ok) {
        // Backend returns insight object directly
        setVoteStatus({
          upvotes: data.upvotes?.length || 0,
          downvotes: data.downvotes?.length || 0,
        });
        toast.success(`Insight ${voteType}d!`, { autoClose: 2000 });
      } else {
        toast.error(data.message || `Failed to ${voteType}`, { autoClose: 2000 });
      }
    } catch (error) {
      toast.error(`Error ${voteType}ing insight`, { autoClose: 2000 });
    }
  };

  const handleCopyLink = () => {
    if (!insight) return;
    const link = `${window.location.origin}/insights/${insight._id}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Link copied to clipboard', { autoClose: 2000 });
    }).catch(() => {
      toast.error('Failed to copy link', { autoClose: 2000 });
    });
  };

  const handleHide = async () => {
    if (!insight) return;
    try {
      const response = await fetch(`http://localhost:5000/api/insights/${insight._id}/hide`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Insight ${data.isHidden ? 'hidden' : 'unhidden'} successfully`, { autoClose: 2000 });
        window.dispatchEvent(new CustomEvent('insightUpdated', { detail: data }));
      } else {
        toast.error(data.message || 'Failed to hide/unhide insight', { autoClose: 2000 });
      }
    } catch (error) {
      toast.error('Error hiding/unhiding insight', { autoClose: 2000 });
    }
  };

  if (!insight) {
    return <div className="alert alert-warning">Insight not found</div>;
  }

  const isAuthorOrAdmin = currentUser?._id === insight.userId?._id || currentUser?.isAdmin;
  const isAuthor = currentUser?._id === insight.userId?._id;

  return (
    <div className="card mb-4 shadow-sm" id={`insight-${insight._id}`}>
      <div className="card-body">
        {currentUser && (
          <div className="dropdown float-end">
            <button
              className="btn btn-link text-muted"
              type="button"
              id={`dropdownMenuButton-${insight._id}`}
              data-bs-toggle="dropdown"
              aria-expanded="false"
            >
              <i className="bi bi-three-dots"></i>
            </button>
            <ul className="dropdown-menu" aria-labelledby={`dropdownMenuButton-${insight._id}`}>
              <li>
                <button className="dropdown-item" onClick={handleCopyLink}>
                  <i className="bi bi-link-45deg me-2"></i>Copy Link
                </button>
              </li>
              <li>
                <BookmarkButton insightId={insight._id} />
              </li>
              {!isAuthor && (
                <li>
                  <button className="dropdown-item" onClick={() => setShowReportForm(true)}>
                    <i className="bi bi-flag me-2"></i>Report
                  </button>
                </li>
              )}
              {isAuthorOrAdmin && (
                <>
                  <li>
                    <button className="dropdown-item" onClick={() => onEdit(insight._id)}>
                      <i className="bi bi-pencil-square me-2"></i>Edit
                    </button>
                  </li>
                  <li>
                    <button className="dropdown-item text-danger" onClick={() => onDelete(insight._id)}>
                      <i className="bi bi-trash me-2"></i>Delete
                    </button>
                  </li>
                  {currentUser?.isAdmin && (
                    <li>
                      <button className="dropdown-item" onClick={handleHide}>
                        <i className="bi bi-eye-slash me-2"></i>{insight.isHidden ? 'Unhide' : 'Hide'}
                      </button>
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>
        )}
        <div className="d-flex align-items-center mb-3">
          <img
            src={insight.userId?.profilePicture || 'https://via.placeholder.com/40'}
            className="rounded-circle me-2"
            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
            alt="User"
            onError={(e) => (e.target.src = 'https://via.placeholder.com/40')}
          />
          <div>
            <Link to={`/profile/${insight.userId?._id || ''}`} className="text-decoration-none">
              <strong>{insight.userId?.username || 'Unknown User'}</strong>
            </Link>
            {currentUser && currentUser._id !== insight.userId?._id && (
              <div className="ms-2 d-inline">
                <FollowButton userId={insight.userId?._id} currentUser={currentUser} />
              </div>
            )}
            <small className="text-muted d-block">
              {new Date(insight.createdAt).toLocaleDateString()} • {insight.visibility}
              {insight.isHidden && ' • Hidden'}
            </small>
          </div>
        </div>
        <h5 className="card-title">
          <Link to={`/insights/${insight._id}`} className="text-decoration-none text-dark">
            {insight.title}
          </Link>
        </h5>
        <p className="card-text">{insight.body}</p>
        {tagsArray.length > 0 && (
          <div className="mb-3">
            {tagsArray.map((tag) => (
              <Link
                key={tag}
                to={`/tags/${encodeURIComponent(tag)}`}
                className="tag-link me-1"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
        <div className="d-flex justify-content-start align-items-center mb-3">
          <button
            className="glossy-button btn btn-sm me-2"
            onClick={() => handleVote('upvote')}
            disabled={!currentUser || insight.isHidden}
          >
            <i className="bi bi-hand-thumbs-up me-1"></i> {voteStatus.upvotes}
          </button>
          <button
            className="glossy-button btn btn-sm"
            onClick={() => handleVote('downvote')}
            disabled={!currentUser || insight.isHidden}
          >
            <i className="bi bi-hand-thumbs-down me-1"></i> {voteStatus.downvotes}
          </button>
        </div>
        <CommentSection insightId={insight._id} currentUser={currentUser} />
        <div className="mt-4">
          <h6 className="fw-bold">Related Insights (AI Suggested)</h6>
          {relatedLoading ? (
            <div className="text-center">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : relatedError ? (
            <p className="text-muted">{relatedError}</p>
          ) : relatedInsights.length === 0 ? (
            <p className="text-muted">No related insights found.</p>
          ) : (
            <ul className="list-group list-group-flush">
              {relatedInsights.map((rel) => (
                <li key={rel._id} className="list-group-item">
                  <Link to={`/insights/${rel._id}`} className="text-decoration-none">
                    {rel.title}{' '}
                    <small className="text-muted">
                      by {rel.userId && rel.userId.username ? rel.userId.username : 'Unknown User'}
                    </small>
                  </Link>
                  {rel.tags && rel.tags.length > 0 && (
                    <div className="mt-1">
                      {rel.tags.map((tag) => (
                        <Link
                          key={tag}
                          to={`/tags/${encodeURIComponent(tag)}`}
                          className="tag-link me-1 small"
                        >
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {showReportForm && (
        <ReportButton
          itemType="Insight"
          itemId={insight._id}
          currentUser={currentUser}
          onClose={() => setShowReportForm(false)}
        />
      )}
    </div>
  );
}

export default Insight;