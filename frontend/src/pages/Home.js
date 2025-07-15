import React, { useState, useEffect } from 'react';
import BookmarkButton from '../components/BookmarkButton';

function Home() {
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPublicInsights = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/insights/public');
        const data = await response.json();
        if (response.ok) {
          setInsights(data);
        } else {
          setError(data.message || 'Failed to fetch insights');
        }
      } catch (error) {
        setError('Error: ' + error.message);
      }
    };
    fetchPublicInsights();
  }, []);

  return (
    <div className="container py-5">
      <h2 className="text-center mb-4 text-white">
        <i className="bi bi-lightbulb me-2"></i> Public Insights
      </h2>
      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{error}</div>
        </div>
      )}
      {insights.length === 0 ? (
        <div className="text-center py-5">
          <i className="bi bi-lightbulb text-muted" style={{ fontSize: '3rem' }}></i>
          <p className="text-muted mt-3">No public insights available.</p>
        </div>
      ) : (
        <div className="row g-4">
          {insights.map((insight) => (
            <div key={insight._id} className="col-md-6 col-lg-4">
              <div className="card glossy-card h-100">
                <div className="card-body">
                  <h5 className="card-title">{insight.title}</h5>
                  <p className="card-text text-muted">{insight.body}</p>
                  {insight.tags && (
                    <div className="d-flex flex-wrap gap-2">
                      {insight.tags.split(',').map((tag, index) => (
                        <span key={index} className="badge bg-light text-dark">
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card-footer text-muted d-flex justify-content-between align-items-center">
                  <span>
                    Posted by {insight.userId?.username || 'Unknown'} • {insight.visibility}
                  </span>
                  <BookmarkButton insightId={insight._id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;