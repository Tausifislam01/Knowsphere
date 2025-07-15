import React, { useState, useEffect } from 'react';

function BookmarkButton({ insightId }) {
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
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to toggle bookmark');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
  };

  if (!localStorage.getItem('token')) return null;

  return (
    <div>
      <button
        className={`btn ${isBookmarked ? 'btn-primary' : 'btn-outline-primary'} glossy-button`}
        onClick={handleBookmarkToggle}
      >
        <i className={`bi ${isBookmarked ? 'bi-bookmark-fill' : 'bi-bookmark'} me-2`}></i>
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