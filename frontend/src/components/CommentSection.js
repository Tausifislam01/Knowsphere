import React, { useState, useEffect } from 'react';

function CommentSection({ insightId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState('');
  const [userId] = useState(localStorage.getItem('userId'));
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editText, setEditText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No authentication token found');
        
        const response = await fetch(`http://localhost:5000/api/insights/${insightId}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        setComments(data);
      } catch (error) {
        console.error('Fetch comments error:', error);
        setError(`Error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (insightId) fetchComments();
  }, [insightId]);

  const handleAddComment = async (e, parentCommentId = null) => {
    e.preventDefault();
    const text = parentCommentId ? replyText : newComment;
    if (!text.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`http://localhost:5000/api/insights/${insightId}/comments`, {
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
      setComments([...comments, addedComment]);
      parentCommentId ? setReplyText('') : setNewComment('');
      setReplyingTo(null);
      setError('');
    } catch (error) {
      console.error('Add comment error:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditComment = async (e, commentId) => {
    e.preventDefault();
    if (!editText.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`http://localhost:5000/api/insights/comments/${commentId}`, {
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
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No authentication token found');
      
      const response = await fetch(`http://localhost:5000/api/insights/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json();
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
    setReplyingTo(commentId);
    setReplyText('');
    setError('');
    setEditingCommentId(null);
  };

  const handleEditClick = (commentId, currentText) => {
    setEditingCommentId(commentId);
    setEditText(currentText);
    setError('');
    setReplyingTo(null);
  };

  const buildCommentTree = (comments, parentId = null, depth = 0) => {
    return comments
      .filter(comment => (comment.parentCommentId || null) === parentId)
      .map(comment => (
        <div key={comment._id} className={`mb-3 ${depth > 0 ? 'ps-4 border-start border-2 border-light' : ''}`}>
          <div className="d-flex">
            <img
              src={comment.userId?.profilePicture || 'https://via.placeholder.com/40'}
              className="rounded-circle me-3"
              width="40"
              height="40"
              alt="User"
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
                    <button type="submit" className="glossy-button btn-sm me-2">
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
                    <button type="submit" className="glossy-button btn-sm me-2">
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
              
              {buildCommentTree(comments, comment._id, depth + 1)}
            </div>
          </div>
        </div>
      ));
  };

  return (
    <div className="mt-4">
      <h5 className="mb-3">
        <i className="bi bi-chat-square-text me-2"></i>
        Discussion ({comments.length})
      </h5>
      
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{error}</div>
        </div>
      )}
      
      {isLoading && comments.length === 0 ? (
        <div className="text-center py-3">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-3 text-muted">
          <i className="bi bi-chat-square-text" style={{ fontSize: '2rem' }}></i>
          <p className="mt-2">No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="mb-4">{buildCommentTree(comments)}</div>
      )}
      
      {userId && !replyingTo && !editingCommentId && (
        <form onSubmit={(e) => handleAddComment(e)} className="mt-4">
          <div className="mb-3">
            <textarea
              className="form-control"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows="3"
            />
          </div>
          <button type="submit" className="glossy-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Posting...
              </>
            ) : (
              <>
                <i className="bi bi-send me-2"></i>
                Post Comment
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default CommentSection;