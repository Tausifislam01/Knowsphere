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
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setInsights(Array.isArray(data) ? data : []);
        } else if (response.status === 404) {
          setError(`No insights found for tag "${tag}"`);
          toast.error(`No insights found for tag "${tag}"`, { autoClose: 2000 });
        } else {
          const text = await response.text(); // Get raw response for debugging
          console.error('Non-JSON response:', text);
          setError('Failed to fetch insights with this tag');
          toast.error('Failed to fetch insights', { autoClose: 2000 });
        }
      } catch (error) {
        console.error('Fetch tag insights error:', error.message);
        setError('Error connecting to the server');
        toast.error('Error connecting to the server', { autoClose: 2000 });
      } finally {
        setIsLoading(false);
      }
    };
    if (tag) {
      fetchInsights();
    } else {
      setError('No tag specified');
      setIsLoading(false);
      toast.error('No tag specified', { autoClose: 2000 });
    }
  }, [tag]);

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center mb-4">
        <Link to="/" className="glossy-button btn btn-sm me-3">
          <i className="bi bi-arrow-left me-2"></i>Back to Home
        </Link>
        <h2 className="mb-0">Insights tagged with #{tag}</h2>
        {currentUser && (
          <FollowButton tag={tag} currentUser={currentUser} className="glossy-button btn btn-sm ms-3" />
        )}
      </div>
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading insights...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{error}</div>
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-lightbulb text-muted" style={{ fontSize: '3rem' }}></i>
          <h4 className="mt-3 text-muted">No insights found for #{tag}</h4>
          <p className="text-muted mb-4">Be the first to share an insight with this tag!</p>
          <Link to="/insights/new" className="glossy-button btn btn-sm">
            <i className="bi bi-plus-lg me-2"></i>Create Insight
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {insights.map((insight) => (
            <Insight
              key={insight._id}
              insight={insight}
              currentUser={currentUser}
              isProfile={false}
              onEdit={null}
              onDelete={null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default TagInsights;