// frontend/src/components/Insight.js
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

function Insight({ insight, currentUser, onEdit, onDelete, showRelated = true }) {
  // Vote status
  const [voteStatus, setVoteStatus] = useState({
    upvotes: insight?.upvotes?.length || 0,
    downvotes: insight?.downvotes?.length || 0,
  });

  // Reporting
  const [showReportForm, setShowReportForm] = useState(false);

  // Related insights (sidebar) — only used when showRelated = true
  const [relatedInsights, setRelatedInsights] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(true);
  const [relatedError, setRelatedError] = useState('');

  const tagsArray = Array.isArray(insight?.tags) ? insight.tags : [];

  useEffect(() => {
    if (!insight) return;

    // Update votes when insight prop changes
    setVoteStatus({
      upvotes: insight.upvotes?.length || 0,
      downvotes: insight.downvotes?.length || 0,
    });

    // Real-time vote updates
    socket.on('insightVoted', ({ insightId }) => {
      if (insightId === insight._id) {
        fetch(`http://localhost:5000/api/insights/${insight._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
          .then((response) => response.json())
          .then((data) => {
            setVoteStatus({
              upvotes: data.upvotes?.length || 0,
              downvotes: data.downvotes?.length || 0,
            });
          })
          .catch((err) => {
            console.error('Error fetching updated insight:', err.message);
            toast.error('Failed to update vote counts', { autoClose: 2000 });
          });
      }
    });

    // Fetch related insights only when showRelated is true
    const fetchRelated = async () => {
      if (!showRelated) {
        setRelatedInsights([]);
        setRelatedLoading(false);
        setRelatedError('');
        return;
      }
      try {
        setRelatedLoading(true);
        const data = await getRelatedInsights(insight._id, 20);
        setRelatedInsights(data);
        setRelatedError(data.length ? '' : 'No related insights found.');
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
  }, [insight, showRelated]);

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
    navigator.clipboard
      .writeText(link)
      .then(() => {
        toast.success('Link copied to clipboard', { autoClose: 2000 });
      })
      .catch(() => {
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
              {/* Admin/Author actions */}
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

        {/* SIDE-BY-SIDE LAYOUT */}
        <div className="insight-layout">
          {/* Main (left) */}
          <div className="insight-main">
            {/* Header */}
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

            {/* Content */}
            <h5 className="card-title">
              <Link to={`/insights/${insight._id}`} className="text-decoration-none text-dark">
                {insight.title}
              </Link>
            </h5>
            <p className="card-text">{insight.body}</p>

            {/* Tags */}
            {tagsArray.length > 0 && (
              <div className="mb-3">
                {tagsArray.map((tag) => (
                  <Link key={tag} to={`/tags/${encodeURIComponent(tag)}`} className="tag-link me-1">
                    #{tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Voting */}
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

            {/* Comments */}
            <CommentSection insightId={insight._id} currentUser={currentUser} />
          </div>

          {/* Aside (right): Related — shown only on pages that pass showRelated=true */}
          {showRelated && (
            <aside className="insight-aside">
              <h6 className="fw-bold mb-2">Related Insights</h6>
              {relatedLoading ? (
                <div className="text-center py-2">
                  <div className="spinner-border spinner-border-sm text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : relatedError ? (
                <p className="text-muted small">{relatedError}</p>
              ) : relatedInsights.length === 0 ? (
                <p className="text-muted small">No related insights found.</p>
              ) : (
                <div className="related-aside-scroll">
                  {relatedInsights.map((rel) => (
                    <Link key={rel._id} to={`/insights/${rel._id}`} className="related-aside-card text-decoration-none">
                      <div className="related-aside-title">{rel.title}</div>
                      <div className="related-aside-meta">
                        by {rel.userId && rel.userId.username ? rel.userId.username : 'Unknown User'}
                      </div>
                      {rel.tags && rel.tags.length > 0 && (
                        <div className="related-aside-tags">
                          {rel.tags.slice(0, 5).map((tag) => (
                            <span key={tag} className="badge bg-light text-dark me-1">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </aside>
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