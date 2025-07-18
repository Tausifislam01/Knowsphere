import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';

const BACKEND_URL = 'http://localhost:5000';
const socket = io(BACKEND_URL, {
  auth: { token: localStorage.getItem('token') },
});

function CommentSection({ insightId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');
  const [userId] = useState(localStorage.getItem('userId'));
  const [token] = useState(localStorage.getItem('token'));
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [displayedComments, setDisplayedComments] = useState(5);
  const [showReplies, setShowReplies] = useState({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching comments from:', `${BACKEND_URL}/api/insights/${insightId}/comments`);
        const response = await fetch(`${BACKEND_URL}/api/insights/${insightId}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const text = await response.text();
          console.log('Fetch comments response:', { status: response.status, body: text });
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Fetched comments:', data);
        setComments(data);
      } catch (error) {
        console.error('Fetch comments error:', error);
        setError(`Error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    if (insightId && showComments && token) {
      fetchComments();
    } else if (showComments && !token) {
      setShowAuthModal(true);
    }

    // Socket.IO: Listen for new comments
    socket.on('newComment', (comment) => {
      if (comment.insightId === insightId) {
        setComments((prevComments) => [...prevComments, comment]);
        toast.info('New comment added!', { autoClose: 2000 });
      }
    });

    // Cleanup
    return () => {
      socket.off('newComment');
    };
  }, [insightId, showComments, token]);

  const handleAddComment = async (e, parentCommentId = null) => {
    e.preventDefault();
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    const text = parentCommentId ? replyText : newComment;
    if (!text.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/insights/${insightId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, parentCommentId }),
      });
      if (!response.ok) {
        const data = await response.json();
        console.log('Add comment response:', { status: response.status, data });
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      const addedComment = await response.json();
      // Update comments via Socket.IO event, not here
      parentCommentId ? setReplyText('') : setNewComment('');
      setReplyingTo(null);
      setError('');
      setDisplayedComments((prev) => Math.max(prev, comments.length + 1));
    } catch (error) {
      console.error('Add comment error:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditComment = async (e, commentId) => {
    e.preventDefault();
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    if (!editText.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/insights/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: editText }),
      });
      if (!response.ok) {
        const data = await response.json();
        console.log('Edit comment response:', { status: response.status, data });
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      const updatedComment = await response.json();
      setComments(comments.map(comment =>
        comment._id === commentId ? updatedComment : comment
      ));
      setEditingCommentId(null);
      setEditText('');
      setError('');
    } catch (error) {
      console.error('Edit comment error:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/insights/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        console.log('Delete comment response:', { status: response.status, data });
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      setComments(comments.filter(comment => comment._id !== commentId));
    } catch (error) {
      console.error('Delete comment error:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplyClick = (commentId) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    setReplyingTo(commentId);
    setReplyText('');
    setError('');
    setEditingCommentId(null);
  };

  const handleEditClick = (commentId, currentText) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    setEditingCommentId(commentId);
    setEditText(currentText);
    setError('');
    setReplyingTo(null);
  };

  const handleShowMore = () => {
    setDisplayedComments((prev) => prev + 5);
  };

  const handleLoadAll = () => {
    setDisplayedComments(topLevelComments.length);
  };

  const handleHideComments = () => {
    setShowComments(false);
    setDisplayedComments(5);
    setReplyingTo(null);
    setEditingCommentId(null);
    setError('');
    setShowReplies({});
  };

  const toggleReplies = (commentId) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    setShowReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleScrollToInsight = () => {
    console.log('Attempting to scroll to insight with ID:', `insight-${insightId}`);
    const insightElement = document.getElementById(`insight-${insightId}`);
    if (insightElement) {
      console.log('Insight element found:', insightElement);
      insightElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      console.warn(`Insight element with ID 'insight-${insightId}' not found.`);
      console.log('Available insight IDs in DOM:',
        Array.from(document.querySelectorAll('[id^="insight-"]')).map(el => el.id));
      setError('Unable to scroll to insight: Post not found.');
    }
  };

  const topLevelComments = comments.filter(c => !c.parentCommentId);

  const buildCommentTree = (comments, parentId = null, depth = 0, isTopLevel = false) => {
    const filteredComments = comments.filter(comment => (comment.parentCommentId || null) === parentId);
    const displayCount = isTopLevel ? displayedComments : filteredComments.length;
    return filteredComments
      .slice(0, displayCount)
      .map(comment => {
        const hasReplies = comments.some(c => c.parentCommentId === comment._id);
        const replyCount = comments.filter(c => c.parentCommentId === comment._id).length;
        return (
          <div key={comment._id} className={`mb-3 ${depth > 0 ? 'ps-4 border-start border-2 border-light' : ''}`}>
            <div className="d-flex">
              <img
                src={comment.userId?.profilePicture || 'https://via.placeholder.com/40'}
                className="rounded-circle me-3 img-fluid"
                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                alt="User"
                onError={(e) => {
                  console.log('Comment profile picture failed to load for comment:', comment._id);
                  e.target.src = 'https://via.placeholder.com/40';
                }}
              />
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div>
                    <span className="fw-semibold">{comment.userId?.username || 'Anonymous'}</span>
                    <span className="text-muted small ms-2">
                      {new Date(comment.createdAt).toLocaleString()}
                      {comment.updatedAt && ' (edited)'}
                    </span>
                  </div>
                  {userId === comment.userId?._id && (
                    <div className="dropdown">
                      <button
                        className="btn btn-sm btn-link text-muted p-0"
                        data-bs-toggle="dropdown"
                        onClick={() => console.log(`Comment dropdown clicked for comment ${comment._id}`)}
                      >
                        <i className="bi bi-three-dots"></i>
                      </button>
                      <ul className="dropdown-menu">
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={() => handleEditClick(comment._id, comment.text)}
                          >
                            <i className="bi bi-pencil me-2"></i> Edit
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item text-danger"
                            onClick={() => handleDeleteComment(comment._id)}
                          >
                            <i className="bi bi-trash me-2"></i> Delete
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                {editingCommentId === comment._id ? (
                  <form onSubmit={(e) => handleEditComment(e, comment._id)} className="mt-2">
                    <textarea
                      className="form-control mb-2"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows="3"
                    />
                    <div className="d-flex">
                      <button type="submit" className="glossy-button btn-sm me-2" disabled={isLoading}>
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setEditingCommentId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="mb-2">{comment.text}</p>
                    <div className="d-flex">
                      <button
                        className="btn btn-link text-muted p-0 me-2"
                        onClick={() => handleReplyClick(comment._id)}
                      >
                        <i className="bi bi-reply me-1"></i> Reply
                      </button>
                      <button className="btn btn-link text-muted p-0">
                        <i className="bi bi-heart me-1"></i> Like
                      </button>
                    </div>
                  </>
                )}
                {hasReplies && (
                  <button
                    className="btn btn-link text-muted p-0 mt-1"
                    onClick={() => toggleReplies(comment._id)}
                  >
                    {showReplies[comment._id] ? `Hide Replies (${replyCount})` : `See Replies (${replyCount})`}
                  </button>
                )}
                {replyingTo === comment._id && (
                  <form onSubmit={(e) => handleAddComment(e, comment._id)} className="mt-3">
                    <textarea
                      className="form-control mb-2"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write your reply..."
                      rows="3"
                    />
                    <div className="d-flex">
                      <button type="submit" className="glossy-button btn-sm me-2" disabled={isLoading}>
                        Post Reply
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setReplyingTo(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {showReplies[comment._id] && buildCommentTree(comments, comment._id, depth + 1)}
              </div>
            </div>
          </div>
        );
      });
  };

  return (
    <div className="mt-3 comment-section">
      {!showComments ? (
        <button
          className="btn btn-outline-primary btn-sm show-comments-btn"
          onClick={() => setShowComments(true)}
        >
          <i className="bi bi-chat-left-text me-1"></i>
          Show Comments ({topLevelComments.length})
        </button>
      ) : (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">
              <i className="bi bi-chat-left-text me-1"></i>
              Comments ({topLevelComments.length})
            </h6>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={handleHideComments}
            >
              <i className="bi bi-x-lg me-1"></i>
              Hide Comments
            </button>
          </div>
          {isLoading ? (
            <div className="text-center py-2">
              <div className="spinner-border spinner-border-sm text-primary" role="status">
                <span className="visually-hidden">Loading comments...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <textarea
                  className="form-control comment-input"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  rows="2"
                  disabled={!token}
                />
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small className="text-muted">
                    {topLevelComments.length} {topLevelComments.length === 1 ? 'comment' : 'comments'}
                  </small>
                  <button
                    className="glossy-button btn-sm"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || !token || isLoading}
                  >
                    Post Comment
                  </button>
                </div>
              </div>
              {error && (
                <div className="alert alert-danger py-2">{error}</div>
              )}
              {token ? (
                <div className="comments-list">
                  {buildCommentTree(comments, null, 0, true)}
                </div>
              ) : (
                <div className="alert alert-info py-2">
                  Please log in or sign up to view comments.
                </div>
              )}
              {token && topLevelComments.length > displayedComments && (
                <div className="mt-2">
                  <button
                    className="btn btn-link btn-sm me-2"
                    onClick={handleShowMore}
                  >
                    Load More Comments
                  </button>
                  <button
                    className="btn btn-link btn-sm"
                    onClick={handleLoadAll}
                  >
                    Load All Comments
                  </button>
                </div>
              )}
              <button
                className="btn btn-secondary btn-sm mt-3"
                onClick={handleScrollToInsight}
              >
                Back to Insight
              </button>
            </>
          )}
        </div>
      )}
      <div
        className={`modal fade ${showAuthModal ? 'show d-block' : ''}`}
        tabIndex="-1"
        style={{ backgroundColor: showAuthModal ? 'rgba(0,0,0,0.5)' : 'transparent' }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Authentication Required</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowAuthModal(false)}
              ></button>
            </div>
            <div className="modal-body">
              <p>Please log in or sign up to view or post comments.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate('/login')}
              >
                Log In
              </button>
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={() => navigate('/signup')}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommentSection;