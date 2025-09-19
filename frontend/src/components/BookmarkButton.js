import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { io } from 'socket.io-client';


const API_ORIGIN = process.env.REACT_APP_API_URL || window.location.origin;
const API_URL = `${API_ORIGIN}/api`;
const BACKEND_URL = process.env.REACT_APP_API_URL || window.location.origin;
const socket = io(BACKEND_URL, {
  auth: { token: localStorage.getItem('token') },
});

function BookmarkButton({ insightId, className }) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkBookmark = async () => {
      try {
        const response = await fetch(`${API_URL}/bookmarks`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const bookmarks = await response.json();
        if (response.ok) {
          setIsBookmarked(bookmarks.some((bookmark) => bookmark.insightId?._id === insightId));
        }
      } catch (error) {
        setError('Error checking bookmark');
        toast.error('Error checking bookmark', { autoClose: 2000 });
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
        ? `${API_URL}/bookmarks/${insightId}`
        : `${API_URL}/bookmarks`;
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