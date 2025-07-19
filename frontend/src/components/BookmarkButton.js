import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';

const BACKEND_URL = 'http://localhost:5000';
const socket = io(BACKEND_URL, {
  auth: { token: localStorage.getItem('token') },
});

function BookmarkButton({ insightId, className }) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkBookmark = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/bookmarks', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const bookmarks = await response.json();
        if (response.ok) {
          setIsBookmarked(bookmarks.some((bookmark) => bookmark.insightId._id === insightId));
        }
      } catch (error) {
        console.error('Error checking bookmark:', error);
      }
    };
    if (localStorage.getItem('token')) {
      checkBookmark();
    }

    socket.on('bookmarkAdded', ({ insightId: updatedInsightId }) => {
      if (updatedInsightId === insightId) {
        setIsBookmarked(true);
        toast.success('Insight bookmarked!', { autoClose: 2000 });
      }
    });
    socket.on('bookmarkRemoved', ({ insightId: updatedInsightId }) => {
      if (updatedInsightId === insightId) {
        setIsBookmarked(false);
        toast.success('Bookmark removed!', { autoClose: 2000 });
      }
    });

    return () => {
      socket.off('bookmarkAdded');
      socket.off('bookmarkRemoved');
    };
  }, [insightId]);

  const handleBookmarkToggle = async () => {
    setError('');
    try {
      const method = isBookmarked ? 'DELETE' : 'POST';
      const url = isBookmarked
        ? `http://localhost:5000/api/bookmarks/${insightId}`
        : 'http://localhost:5000/api/bookmarks';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: method === 'POST' ? JSON.stringify({ insightId }) : undefined,
      });
      if (response.ok) {
        setIsBookmarked(!isBookmarked);
        toast.success(isBookmarked ? 'Bookmark removed!' : 'Insight bookmarked!', { autoClose: 2000 });
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to toggle bookmark');
        toast.error(data.message || 'Failed to toggle bookmark', { autoClose: 2000 });
      }
    } catch (error) {
      setError('Error: ' + error.message);
      toast.error('Error: ' + error.message, { autoClose: 2000 });
    }
  };

  if (!localStorage.getItem('token')) return null;

  return (
    <div>
      <button
        className={`dropdown-item bookmark-button ${isBookmarked ? 'bookmarked' : ''} ${className || ''}`}
        onClick={handleBookmarkToggle}
      >
        <i className={`bi ${isBookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'}`}></i>
        {isBookmarked ? 'Unbookmark' : 'Bookmark'}
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

export default BookmarkButton;