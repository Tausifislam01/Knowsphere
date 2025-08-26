// src/components/CommentSection.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import ReportButton from './ReportButton';

const BACKEND_URL = 'http://localhost:5000';
const socket = io(BACKEND_URL, {
  auth: { token: localStorage.getItem('token') },
});

function CommentSection({ insightId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');
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
  const [showReportForm, setShowReportForm] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await fetch(`${BACKEND_URL}/api/insights/${insightId}/comments`, { headers });
        if (!response.ok) {
          if (response.status === 401) {
            setShowAuthModal(true);
            setError('Please log in to view all comments');
            toast.error('Please log in to view all comments', { autoClose: 2000 });
            setComments([]);
            return;
          }
          if (response.status === 404) {
            setError('Insight not found');
            toast.error('Insight not found', { autoClose: 2000 });
            setComments([]);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!Array.isArray(data)) {
          setError('Invalid comments data received');
          setComments([]);
          return;
        }
        setComments(data);
        setError('');
      } catch (error) {
        setError(`Error fetching comments: ${error.message}`);
        toast.error(`Error fetching comments: ${error.message}`, { autoClose: 2000 });
        setComments([]);
      } finally {
        setIsLoading(false);
      }
    };

    const params = new URLSearchParams(location.search);
    const commentId = params.get('commentId');

    if (insightId && (showComments || commentId)) {
      setShowComments(true);
      fetchComments();
    } else if ((showComments || commentId) && !token) {
      setShowAuthModal(true);
      setError('Please log in to view comments');
    }

    if (commentId && showComments) {
      setTimeout(() => {
        const commentElement = document.getElementById(`comment-${commentId}`);
        if (commentElement) {
          commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          commentElement.style.backgroundColor = '#fff3cd';
          setTimeout(() => {
            commentElement.style.backgroundColor = '';
          }, 2000);
        }
      }, 500);
    }

    socket.on('newComment', (comment) => {
      if (comment.insightId === insightId) {
        setComments((prevComments) => {
          if (!prevComments.some((c) => c._id === comment._id)) {
            return [...prevComments, comment];
          }
          return prevComments;
        });
        toast.info('New comment added!', { autoClose: 2000 });
      }
    });

    socket.on('commentUpdated', (updatedComment) => {
      if (updatedComment.insightId === insightId) {
        setComments((prevComments) =>
          prevComments.map((c) => (c._id === updatedComment._id ? updatedComment : c)),
        );
      }
    });

    return () => {
      socket.off('newComment');
      socket.off('commentUpdated');
    };
  }, [insightId, showComments, token, location.search]);

  const handleAddComment = async (e, parentCommentId = null) => {
    e.preventDefault();
    if (!token) {
      setShowAuthModal(true);
      toast.error('Please log in to post a comment', { autoClose: 2000 });
      return;
    }
    const text = parentCommentId ? replyText : newComment;
    if (!text.trim()) {
      setError('Comment cannot be empty');
      toast.error('Comment cannot be empty', { autoClose: 2000 });
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
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      const addedComment = await response.json();
      setComments((prevComments) => [...prevComments, addedComment]);
      if (parentCommentId) {
        setReplyText('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }
      setError('');
      setDisplayedComments((prev) => Math.max(prev, comments.length + 1));
      toast.success(parentCommentId ? 'Reply posted successfully' : 'Comment posted successfully', { autoClose: 2000 });
    } catch (error) {
      setError(`Error posting ${parentCommentId ? 'reply' : 'comment'}: ${error.message}`);
      toast.error(`Error posting ${parentCommentId ? 'reply' : 'comment'}: ${error.message}`, { autoClose: 2000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditComment = async (e, commentId) => {
    e.preventDefault();
    if (!token) {
      setShowAuthModal(true);
      toast.error('Please log in to edit a comment', { autoClose: 2000 });
      return;
    }
    if (!editText.trim()) {
      setError('Comment cannot be empty');
      toast.error('Comment cannot be empty', { autoClose: 2000 });
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
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      const updatedComment = await response.json();
      setComments((prev) => prev.map((c) => (c._id === commentId ? updatedComment : c)));
      setEditingCommentId(null);
      setEditText('');
      setError('');
      toast.success('Comment edited successfully', { autoClose: 2000 });
    } catch (error) {
      setError(`Error editing comment: ${error.message}`);
      toast.error(`Error editing comment: ${error.message}`, { autoClose: 2000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!token) {
      setShowAuthModal(true);
      toast.error('Please log in to delete a comment', { autoClose: 2000 });
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
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      toast.success('Comment deleted successfully', { autoClose: 2000 });
    } catch (error) {
      setError(`Error deleting comment: ${error.message}`);
      toast.error(`Error deleting comment: ${error.message}`, { autoClose: 2000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleHideComment = async (commentId) => {
    if (!token) {
      setShowAuthModal(true);
      toast.error('Please log in to hide a comment', { autoClose: 2000 });
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/insights/comments/${commentId}/hide`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setComments((prev) => prev.map((c) => (c._id === commentId ? data : c)));
        toast.success(`Comment ${data.isHidden ? 'hidden' : 'unhidden'} successfully`, { autoClose: 2000 });
      } else {
        toast.error(data.message || 'Failed to update comment', { autoClose: 2000 });
      }
    } catch (error) {
      toast.error('Error updating comment: ' + error.message, { autoClose: 2000 });
    }
  };

  const handleReplyClick = (commentId) => {
    if (!token) {
      setShowAuthModal(true);
      toast.error('Please log in to reply to a comment', { autoClose: 2000 });
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
      toast.error('Please log in to edit a comment', { autoClose: 2000 });
      return;
    }
    setEditingCommentId(commentId);
    setEditText(currentText);
    setError('');
    setReplyingTo(null);
  };

  const handleShowMore = () => setDisplayedComments((prev) => prev + 5);
  const handleLoadAll = () => setDisplayedComments(topLevelComments.length);

  const handleHideComments = () => {
    setShowComments(false);
    setDisplayedComments(5);
    setReplyingTo(null);
    setEditingCommentId(null);
    setError('');
    setShowReplies({});
    setShowReportForm(null);
  };

  const toggleReplies = (commentId) => {
    if (!token) {
      setShowAuthModal(true);
      toast.error('Please log in to view replies', { autoClose: 2000 });
      return;
    }
    setShowReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  // Restore: Smooth scroll back to the parent insight card
  const handleScrollToInsight = () => {
    const insightElement = document.getElementById(`insight-${insightId}`);
    if (insightElement) {
      insightElement.scrollIntoView({ behavior: 'smooth' });
    } else {
      setError('Unable to scroll to insight: Post not found.');
      toast.error('Unable to scroll to insight: Post not found.', { autoClose: 2000 });
    }
  };

  const closeDropdown = (commentId) => {
    const dropdownMenu = document.querySelector(`#dropdownMenuButton-${commentId} + .dropdown-menu`);
    if (dropdownMenu) dropdownMenu.classList.remove('show');
  };

  const topLevelComments = comments.filter((c) => !c.parentCommentId);

  const buildCommentTree = (allComments, parentId = null, depth = 0, isTopLevel = false) => {
    const filtered = allComments.filter((c) => (c.parentCommentId || null) === parentId);
    const displayCount = isTopLevel ? displayedComments : filtered.length;

    return filtered.slice(0, displayCount).map((comment) => {
      if (!comment._id || !comment.text || !comment.userId) return null;

      const hasReplies = allComments.some((c) => c.parentCommentId === comment._id);
      const replyCount = allComments.filter((c) => c.parentCommentId === comment._id).length;
      const isHidden = comment.isHidden && !currentUser?.isAdmin;

      return (
        <div
          key={comment._id}
          id={`comment-${comment._id}`}
          className={`mb-3 ${depth > 0 ? 'ps-4 border-start border-2 border-light' : ''}`}
        >
          <div className="d-flex">
            <img
              src={comment.userId?.profilePicture || 'https://via.placeholder.com/40'}
              className="rounded-circle me-3 img-fluid"
              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
              alt="User"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/40';
              }}
            />
            <div className={`flex-grow-1 ${isHidden && currentUser?.isAdmin ? 'bg-light opacity-50' : ''}`}>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <div>
                  <span className="fw-semibold">{comment.userId?.username || 'Anonymous'}</span>
                  <span className="text-muted small ms-2">
                    {new Date(comment.createdAt).toLocaleString()}
                    {comment.updatedAt && ' (edited)'}
                    {isHidden && currentUser?.isAdmin && ' • Hidden'}
                  </span>
                </div>

                {currentUser && (
                  <div className="dropdown">
                    <button
                      className="btn btn-sm btn-link text-muted p-0"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      id={`dropdownMenuButton-${comment._id}`}
                    >
                      <i className="bi bi-three-dots"></i>
                    </button>
                    <ul className="dropdown-menu" aria-labelledby={`dropdownMenuButton-${comment._id}`}>
                      {currentUser._id === comment.userId?._id && (
                        <>
                          <li>
                            <button
                              className="dropdown-item"
                              onClick={() => handleEditClick(comment._id, comment.text)}
                            >
                              <i className="bi bi-pencil me-2"></i>Edit
                            </button>
                          </li>
                          <li>
                            <button
                              className="dropdown-item text-danger"
                              onClick={() => handleDeleteComment(comment._id)}
                            >
                              <i className="bi bi-trash me-2"></i>Delete
                            </button>
                          </li>
                        </>
                      )}
                      {currentUser._id !== comment.userId?._id && !isHidden && (
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={() => {
                              setShowReportForm(comment._id);
                              closeDropdown(comment._id);
                            }}
                          >
                            <i className="bi bi-flag me-2"></i>Report
                          </button>
                        </li>
                      )}
                      {currentUser.isAdmin && (
                        <>
                          <li>
                            <button className="dropdown-item" onClick={() => handleHideComment(comment._id)}>
                              <i className="bi bi-eye-slash me-2"></i>
                              {comment.isHidden ? 'Unhide' : 'Hide'}
                            </button>
                          </li>
                          <li>
                            <button className="dropdown-item text-danger" onClick={() => handleDeleteComment(comment._id)}>
                              <i className="bi bi-trash me-2"></i>Delete
                            </button>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {isHidden && !currentUser?.isAdmin ? null : (
                <>
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
                      <p className="mb-2">
                        {isHidden && currentUser?.isAdmin ? `[Hidden Comment] ${comment.text}` : comment.text}
                      </p>

                      <div className="d-flex">
                        <button
                          className="btn btn-link text-muted p-0 me-2"
                          onClick={() => handleReplyClick(comment._id)}
                        >
                          <i className="bi bi-reply me-1"></i>Reply
                        </button>
                        <button className="btn btn-link text-muted p-0">
                          <i className="bi bi-heart me-1"></i>Like
                        </button>
                      </div>

                      {replyingTo === comment._id && (
                        <form onSubmit={(e) => handleAddComment(e, comment._id)} className="mt-2">
                          <textarea
                            className="form-control mb-2"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write a reply..."
                            rows="3"
                          />
                          <div className="d-flex">
                            <button type="submit" className="glossy-button btn-sm me-2" disabled={isLoading || !replyText.trim()}>
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
                    </>
                  )}

                  {hasReplies && (
                    <button className="btn btn-link text-muted p-0 mt-1" onClick={() => toggleReplies(comment._id)}>
                      {showReplies[comment._id] ? `Hide Replies (${replyCount})` : `See Replies (${replyCount})`}
                    </button>
                  )}
                  {showReplies[comment._id] && buildCommentTree(allComments, comment._id, depth + 1)}
                </>
              )}
            </div>
          </div>
        </div>
      );
    }).filter(Boolean);
  };

  return (
    <div className="mt-3 comment-section">
      {showReportForm && (
        <ReportButton
          itemId={showReportForm}
          itemType="Comment"
          currentUser={currentUser}
          onClose={() => setShowReportForm(null)}
        />
      )}

      {!showComments ? (
        <button className="btn btn-outline-primary btn-sm show-comments-btn" onClick={() => setShowComments(true)}>
          <i className="bi bi-chat-left-text me-1"></i>
          Show Comments
        </button>
      ) : (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0">
              <i className="bi bi-chat-left-text me-1"></i>
              Comments ({topLevelComments.length})
            </h6>
            <button className="btn btn-outline-secondary btn-sm" onClick={handleHideComments}>
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
              {/* New comment box */}
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

              {error && <div className="alert alert-danger py-2">{error}</div>}

              {/* List */}
              <div className="comments-list">
                {comments.length === 0 ? (
                  <p className="text-muted">No comments yet.</p>
                ) : (
                  buildCommentTree(comments, null, 0, true)
                )}
              </div>

              {/* Paging */}
              {topLevelComments.length > displayedComments && (
                <div className="mt-2 d-flex gap-2">
                  <button className="btn btn-outline-primary btn-sm" onClick={handleShowMore}>
                    Load More Comments
                  </button>
                  <button className="btn btn-outline-primary btn-sm" onClick={handleLoadAll}>
                    Load All Comments
                  </button>
                </div>
              )}

              {/* Restored Back-to-Insight scroll button */}
              <button className="btn btn-secondary btn-sm mt-3" onClick={handleScrollToInsight}>
                Back to Insight
              </button>
            </>
          )}

          {/* Auth required modal */}
          <div
            className={`modal fade ${showAuthModal ? 'show d-block' : ''}`}
            tabIndex="-1"
            style={{ backgroundColor: showAuthModal ? 'rgba(0,0,0,0.5)' : 'transparent' }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Authentication Required</h5>
                  <button type="button" className="btn-close" onClick={() => setShowAuthModal(false)} />
                </div>
                <div className="modal-body">
                  <p>Please log in or sign up to view or post comments.</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
                    Log In
                  </button>
                  <button type="button" className="btn btn-outline-primary" onClick={() => navigate('/signup')}>
                    Sign Up
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommentSection;