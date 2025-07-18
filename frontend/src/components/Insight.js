// frontend/src/components/Insight.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import FollowButton from './FollowButton';

function Insight({ insight, currentUser, onEdit, onDelete, isProfile }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [voteStatus, setVoteStatus] = useState({
    upvotes: insight.upvotes.length,
    downvotes: insight.downvotes.length,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (showComments) {
      const fetchComments = async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/insights/${insight._id}/comments`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setComments(data);
          } else {
            toast.error('Failed to fetch comments', { autoClose: 2000 });
          }
        } catch (error) {
          console.error('Fetch comments error:', error);
          toast.error('Error fetching comments', { autoClose: 2000 });
        }
      };
      fetchComments();
    }
  }, [insight._id, showComments]);

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

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error('Comment cannot be empty', { autoClose: 2000 });
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/insights/${insight._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ text: newComment }),
      });
      const data = await response.json();
      if (response.ok) {
        setComments([...comments, data]);
        setNewComment('');
        toast.success('Comment added!', { autoClose: 2000 });
      } else {
        toast.error(data.message || 'Failed to add comment', { autoClose: 2000 });
      }
    } catch (error) {
      console.error('Add comment error:', error);
      toast.error('Error adding comment', { autoClose: 2000 });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/insights/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        setComments(comments.filter((comment) => comment._id !== commentId));
        toast.success('Comment deleted', { autoClose: 2000 });
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete comment', { autoClose: 2000 });
      }
    } catch (error) {
      console.error('Delete comment error:', error);
      toast.error('Error deleting comment', { autoClose: 2000 });
    }
  };

  const tagsArray = insight.tags
    ? insight.tags.split(',').map((tag) => tag.trim()).filter((tag) => tag)
    : [];

  return (
    <div className="card glossy-card mb-4">
      <div className="card-body">
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
              <span key={tag} className="badge bg-light text-dark me-1">
                #{tag}
                {currentUser && (
                  <FollowButton tag={tag} currentUser={currentUser} className="ms-2" />
                )}
              </span>
            ))}
          </div>
        )}
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex gap-2">
            <button
              className="glossy-button btn btn-sm"
              onClick={() => handleVote('upvote')}
              disabled={!currentUser}
            >
              <i className="bi bi-hand-thumbs-up me-1"></i> {voteStatus.upvotes}
            </button>
            <button
              className="glossy-button btn btn-sm"
              onClick={() => handleVote('downvote')}
              disabled={!currentUser}
            >
              <i className="bi bi-hand-thumbs-down me-1"></i> {voteStatus.downvotes}
            </button>
            <button
              className="glossy-button btn btn-sm"
              onClick={() => setShowComments(!showComments)}
            >
              <i className="bi bi-chat-left-text me-1"></i> {insight.commentCount || 0}
            </button>
          </div>
          {isProfile && currentUser && currentUser._id === insight.userId._id && (
            <div className="d-flex gap-2">
              <button
                className="glossy-button btn btn-sm bg-primary"
                onClick={() => onEdit(insight._id)}
              >
                <i className="bi bi-pencil-square me-1"></i> Edit
              </button>
              <button
                className="glossy-button btn btn-sm bg-danger"
                onClick={() => onDelete(insight._id)}
              >
                <i className="bi bi-trash me-1"></i> Delete
              </button>
            </div>
          )}
        </div>
        {showComments && (
          <div className="mt-4">
            {currentUser && (
              <form onSubmit={handleCommentSubmit} className="mb-3">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button className="glossy-button btn btn-primary" type="submit">
                    Post
                  </button>
                </div>
              </form>
            )}
            {comments.length === 0 ? (
              <p className="text-muted">No comments yet.</p>
            ) : (
              <div className="list-group list-group-flush">
                {comments.map((comment) => (
                  <div key={comment._id} className="list-group-item">
                    <div className="d-flex align-items-center">
                      <img
                        src={comment.userId.profilePicture || 'https://via.placeholder.com/30'}
                        className="rounded-circle me-2"
                        style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                        alt="User"
                        onError={(e) => (e.target.src = 'https://via.placeholder.com/30')}
                      />
                      <div>
                        <strong>{comment.userId.username}</strong>
                        <small className="text-muted ms-2">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </small>
                        <p>{comment.text}</p>
                        {currentUser && currentUser._id === comment.userId._id && (
                          <button
                            className="glossy-button btn btn-sm btn-danger"
                            onClick={() => handleDeleteComment(comment._id)}
                          >
                            <i className="bi bi-trash me-1"></i> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Insight;