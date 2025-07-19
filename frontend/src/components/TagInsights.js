// frontend/src/components/TagInsights.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import Insight from './Insight';
import FollowButton from './FollowButton';

function TagInsights({ currentUser }) {
  const { tag } = useParams();
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('Fetching insights for tag:', tag);
        const response = await fetch(`http://localhost:5000/api/insights/tags/${encodeURIComponent(tag)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
        });
        if (response.ok) {
          const data = await response.json();
          setInsights(data);
        } else {
          const errorData = await response.json();
          toast.error(errorData.message || 'Failed to fetch insights', { autoClose: 2000 });
          setError('Failed to fetch insights with this tag');
        }
      } catch (error) {
        console.error('Fetch tag insights error:', error);
        toast.error('Error fetching insights', { autoClose: 2000 });
        setError('Error connecting to the server');
      } finally {
        setIsLoading(false);
      }
    };
    fetchInsights();
  }, [tag]);

  return (
    <div className="container mt-4">
      <h2>
        <Link to="/" className="text-decoration-none">
          <i className="bi bi-arrow-left me-2"></i>
        </Link>
        Insights tagged with #{tag}
      </h2>
      {currentUser && (
        <div className="mb-3">
          <FollowButton tag={tag} currentUser={currentUser} />
        </div>
      )}
      {isLoading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : insights.length === 0 ? (
        <p className="text-muted">No insights found for this tag.</p>
      ) : (
        insights.map((insight) => (
          <Insight
            key={insight._id}
            insight={insight}
            currentUser={currentUser}
            isProfile={false}
            onEdit={null}
            onDelete={null}
          />
        ))
      )}
    </div>
  );
}

export default TagInsights;