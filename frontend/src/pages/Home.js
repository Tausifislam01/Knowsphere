import React, { useState, useEffect } from 'react';

function Home() {
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await fetch('/api/insights/public');
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
    fetchInsights();
  }, []);

  return (
    <div className="container">
      <h2 className="mt-4">Public Insights</h2>
      {error && <p className="text-danger">{error}</p>}
      {insights.length === 0 ? (
        <p className="text-muted">No insights available</p>
      ) : (
        insights.map((insight) => (
          <div key={insight._id} className="card mb-3 shadow-sm">
            <div className="card-body">
              <h5 className="card-title">{insight.title}</h5>
              <p className="card-text">{insight.body}</p>
              <p className="card-text">
                <small className="text-muted">
                  By {insight.userId?.username || 'Unknown'} | Tags: {insight.tags || 'None'}
                </small>
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default Home;