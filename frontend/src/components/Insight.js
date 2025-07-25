import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';
import FollowButton from './FollowButton';
import CommentSection from './CommentSection';
import BookmarkButton from './BookmarkButton';
import ReportButton from './ReportButton';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const BACKEND_URL = 'http://localhost:5000';
const socket = io(BACKEND_URL, {
  auth: { token: localStorage.getItem('token') },
});

function Insight({ insight, currentUser, onEdit, onDelete }) {
  const [voteStatus, setVoteStatus] = useState({
    upvotes: insight.upvotes.length,
    downvotes: insight.downvotes.length,
  });

  useEffect(() => {
    socket.on('insightVoted', ({ insightId, voteType, userId }) => {
      if (insightId === insight._id) {
        setVoteStatus((prev) => {
          const newStatus = { ...prev };
          const userVoted = insight.upvotes.includes(userId) || insight.downvotes.includes(userId);
          if (voteType === 'upvote') {
            if (insight.upvotes.includes(userId)) {
              newStatus.upvotes = prev.upvotes - 1;
            } else {
              newStatus.upvotes = prev.upvotes + (userVoted ? 0 : 1);
              newStatus.downvotes = insight.downvotes.includes(userId) ? prev.downvotes - 1 : prev.downvotes;
            }
          } else {
            if (insight.downvotes.includes(userId)) {
              newStatus.downvotes = prev.downvotes - 1;
            } else {
              newStatus.downvotes = prev.downvotes + (userVoted ? 0 : 1);
              newStatus.upvotes = insight.upvotes.includes(userId) ? prev.upvotes - 1 : prev.upvotes;
            }
          }
          return newStatus;
        });
      }
    });

    return () => {
      socket.off('insightVoted');
    };
  }, [insight._id, insight.upvotes, insight.downvotes]);

  const handleVote = async (voteType) => {
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
          upvotes: data.insight.upvotes.length,
          downvotes: data.insight.downvotes.length,
        });
        toast.success(`Insight ${voteType}d!`, { autoClose: 2000 });
      } else {
        toast.error(data.message || `Failed to ${voteType}`, { autoClose: 2000 });
      }
    } catch (error) {
      console.error(`${voteType} error:`, error);
      toast.error(`Error ${voteType}ing insight`, { autoClose: 2000 });
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/insights/${insight._id}`;
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Link copied to clipboard', { autoClose: 2000 });
    }).catch(() => {
      toast.error('Failed to copy link', { autoClose: 2000 });
    });
  };

  const handleHide = async () => {
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
        toast.error(data.message || 'Failed to update insight', { autoClose: 2000 });
      }
    } catch (error) {
      toast.error('Error updating insight: ' + error.message, { autoClose: 2000 });
    }
  };

  const tagsArray = Array.isArray(insight.tags) ? insight.tags : [];

  return (
    <div className={`card glossy-card mb-4 ${insight.isHidden ? 'bg-light opacity-50' : ''}`} id={`insight-${insight._id}`}>
      <div className="card-body position-relative">
        <div className="dropdown position-absolute top-0 end-0 mt-2 me-2">
          <button
            className="btn btn-sm btn-link text-muted p-0"
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
            {currentUser && <BookmarkButton insightId={insight._id} />}
            {currentUser && currentUser._id !== insight.userId._id && (
              <ReportButton itemId={insight._id} itemType="Insight" currentUser={currentUser} />
            )}
            {currentUser && (currentUser._id === insight.userId._id || currentUser.isAdmin) && (
              <>
                {currentUser._id === insight.userId._id && onEdit && (
                  <li>
                    <button className="dropdown-item" onClick={() => onEdit(insight._id)}>
                      <i className="bi bi-pencil-square me-2"></i>Edit
                    </button>
                  </li>
                )}
                <li>
                  <button className="dropdown-item text-danger" onClick={() => onDelete(insight._id)}>
                    <i className="bi bi-trash me-2"></i>Delete
                  </button>
                </li>
                {currentUser.isAdmin && (
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
        <div className="d-flex align-items-center mb-3">
          <img
            src={insight.userId.profilePicture || 'https://via.placeholder.com/40'}
            className="rounded-circle me-2"
            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
            alt="User"
            onError={(e) => (e.target.src = 'https://via.placeholder.com/40')}
          />
          <div>
            <Link to={`/profile/${insight.userId._id}`} className="text-decoration-none">
              <strong>{insight.userId.username}</strong>
            </Link>
            {currentUser && currentUser._id !== insight.userId._id && (
              <div className="ms-2 d-inline">
                <FollowButton userId={insight.userId._id} currentUser={currentUser} />
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
      </div>
    </div>
  );
}

export default Insight;