import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';


const API_ORIGIN = process.env.REACT_APP_API_URL || window.location.origin;
const API_URL = `${API_ORIGIN}/api`;

const BACKEND_URL = process.env.REACT_APP_API_URL || window.location.origin;
const socket = io(BACKEND_URL, {
  auth: { token: localStorage.getItem('token') },
});

function VoteButtons({ insightId, initialUpvotes, initialDownvotes }) {
  const [upvotes, setUpvotes] = useState(initialUpvotes || []);
  const [downvotes, setDownvotes] = useState(initialDownvotes || []);
  const [error, setError] = useState('');
  const userId = localStorage.getItem('userId');

  // Listen for real-time vote updates
  useEffect(() => {
    socket.on('insightVoted', ({ insightId: votedInsightId, voteType, userId: voterId }) => {
      if (votedInsightId === insightId) {
        // Fetch updated insight to ensure accurate vote counts
        fetch(`${API_URL}/insights/${insightId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
          .then(response => response.json())
          .then(data => {
            setUpvotes(data.upvotes || []);
            setDownvotes(data.downvotes || []);
          })
          .catch(err => {
            console.error('Error fetching updated insight:', err.message);
            setError('Failed to update vote counts');
          });
      }
    });

    return () => {
      socket.off('insightVoted');
    };
  }, [insightId]);

  const handleVote = async (voteType) => {
    setError('');
    try {
      const response = await fetch(`${API_URL}/insights/${insightId}/vote`, {
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
        setUpvotes(data.upvotes || []);
        setDownvotes(data.downvotes || []);
      } else {
        setError(data.message || `Failed to ${voteType}`);
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