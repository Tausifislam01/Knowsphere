import React, { useState } from 'react';

function VoteButtons({ insightId, initialUpvotes, initialDownvotes }) {
  const [upvotes, setUpvotes] = useState(initialUpvotes || []);
  const [downvotes, setDownvotes] = useState(initialDownvotes || []);
  const [error, setError] = useState('');
  const userId = localStorage.getItem('userId');

  const handleVote = async (voteType) => {
    setError('');
    try {
      const response = await fetch(`http://localhost:5000/api/insights/${insightId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ voteType }),
      });
      const data = await response.json();
      if (response.ok) {
        setUpvotes(data.insight.upvotes);
        setDownvotes(data.insight.downvotes);
      } else {
        setError(data.message || 'Failed to vote');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
  };

  if (!localStorage.getItem('token')) return null;

  return (
    <div className="d-flex align-items-center gap-2">
      <button
        className={`btn ${upvotes.includes(userId) ? 'btn-success' : 'btn-outline-success'} vote-button btn-sm`}
        onClick={() => handleVote('upvote')}
      >
        <i className="bi bi-arrow-up me-1"></i> {upvotes.length}
      </button>
      <button
        className={`btn ${downvotes.includes(userId) ? 'btn-danger' : 'btn-outline-danger'} vote-button btn-sm`}
        onClick={() => handleVote('downvote')}
      >
        <i className="bi bi-arrow-down me-1"></i> {downvotes.length}
      </button>
      {error && (
        <div className="alert alert-danger d-flex align-items-center mt-2" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{error}</div>
        </div>
      )}
    </div>
  );
}

export default VoteButtons;