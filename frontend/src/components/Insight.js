import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import io from 'socket.io-client';
import BookmarkButton from './BookmarkButton';
import VoteButtons from './VoteButtons';
import CommentSection from './CommentSection';

function Insight({ insight, onEdit, onDelete, isProfile }) {
  const [commentCount, setCommentCount] = useState(insight.commentCount || 0);

  // Refresh insight data after comment actions
  useEffect(() => {
    const socket = io('http://localhost:5000', {
      auth: { token: localStorage.getItem('token') },
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    socket.on('newComment', (data) => {
      if (data.insightId === insight._id) {
        handleCommentUpdate();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    const handleCommentUpdate = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/insights/${insight._id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (!response.ok) throw new Error('Failed to fetch insight');
        const updatedInsight = await response.json();
        setCommentCount(updatedInsight.commentCount || 0);
      } catch (error) {
        console.error('Error refreshing insight:', error);
      }
    };

    return () => {
      socket.disconnect();
      console.log('Socket.IO disconnected');
    };
  }, [insight._id]);

  const handleCopyLink = async () => {
    const url = `http://localhost:3000/insights/${insight._id}`;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!', { autoClose: 2000 });
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Link copied to clipboard!', { autoClose: 2000 });
      }
    } catch (error) {
      console.error('Failed to copy link:', error);
      toast.error('Failed to copy link. Please copy manually.', { autoClose: 2000 });
    }
  };

  // Debug profile picture URL
  console.log('Profile picture URL:', insight.userId?.profilePicture || 'Using fallback');

  return (
    <div id={`insight-${insight._id}`} className={isProfile ? "list-group-item border-0 py-3 px-0" : "col-md-6 col-lg-4"}>
      <div className="card glossy-card h-100">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h5 className="card-title mb-0">
              <Link to={`/insights/${insight._id}`} className="text-decoration-none text-dark">
                {insight.title}
              </Link>
            </h5>
            <div className="dropdown">
              <button
                id={`dropdown-${insight._id}`}
                className="glossy-button btn-sm"
                type="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                onClick={() => console.log(`Dropdown clicked for insight ${insight._id}`)}
              >
                <i className="bi bi-three-dots"></i>
              </button>
              <ul className="dropdown-menu">
                <li>
                  <button className="dropdown-item" onClick={handleCopyLink}>
                    <i className="bi bi-link-45deg me-2"></i> Copy Link
                  </button>
                </li>
                <li>
                  <div className="dropdown-item">
                    <BookmarkButton insightId={insight._id} />
                  </div>
                </li>
                {isProfile && (
                  <>
                    <li>
                      <button className="dropdown-item" onClick={() => onEdit(insight._id)}>
                        <i className="bi bi-pencil me-2"></i> Edit
                      </button>
                    </li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={() => onDelete(insight._id)}>
                        <i className="bi bi-trash me-2"></i> Delete
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
          <div className="d-flex align-items-center mb-3">
            <Link to={`/profile/${insight.userId?._id}`}>
              <img
                src={insight.userId?.profilePicture || 'https://via.placeholder.com/40'}
                className="rounded-circle me-2 img-fluid"
                style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                alt="Author"
                onError={(e) => {
                  console.log('Profile picture failed to load for insight:', insight._id);
                  e.target.src = 'https://via.placeholder.com/40';
                }}
              />
            </Link>
            <small className="text-muted">
              By <Link to={`/profile/${insight.userId?._id}`} className="text-decoration-none text-muted">{insight.userId?.username || 'Anonymous'}</Link> • {new Date(insight.createdAt).toLocaleDateString()}
              {isProfile && ` • ${insight.visibility}`}
            </small>
          </div>
          <p className="card-text text-muted">{insight.body}</p>
          {insight.tags && (
            <div className="d-flex flex-wrap gap-2 mb-3">
              {insight.tags.split(',').map((tag, index) => (
                <span key={index} className="badge bg-light text-dark">
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
          <VoteButtons
            insightId={insight._id}
            initialUpvotes={insight.upvotes || []}
            initialDownvotes={insight.downvotes || []}
          />
          <small className="text-muted d-block mt-2">Comments: {commentCount}</small>
        </div>
        <div className="card-footer bg-transparent">
          <CommentSection insightId={insight._id} />
        </div>
      </div>
    </div>
  );
}

export default Insight;