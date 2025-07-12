import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function Home() {
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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
      } finally {
        setIsLoading(false);
      }
    };
    fetchInsights();
  }, []);

  return (
    <div className="container-fluid px-0">
      {/* Hero Section */}
      <div className="glossy-navbar text-white py-5">
        <div className="container text-center">
          <h1 className="display-4 fw-bold mb-3">
            <i className="bi bi-lightbulb me-2"></i>
            Knowledge Shared is Knowledge Squared
          </h1>
          <p className="lead mb-4">
            Discover insights from our community of thinkers and creators
          </p>
          <Link to="/insights/new" className="glossy-button btn-lg px-4">
            <i className="bi bi-plus-lg me-2"></i>
            Share Your Insight
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="container py-5">
        <div className="row">
          <div className="col-lg-8 mx-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="mb-0">
                <i className="bi bi-collection me-2"></i>
                Public Insights
              </h2>
              <div className="dropdown">
                <button
                  className="glossy-button btn-sm dropdown-toggle"
                  type="button"
                  id="sortDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  <i className="bi bi-filter me-1"></i>
                  Sort By
                </button>
                <ul className="dropdown-menu" aria-labelledby="sortDropdown">
                  <li><button className="dropdown-item">Newest First</button></li>
                  <li><button className="dropdown-item">Most Popular</button></li>
                  <li><button className="dropdown-item">Trending</button></li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-center" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <div>{error}</div>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-3">Loading insights...</p>
              </div>
            ) : insights.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-lightbulb text-muted" style={{ fontSize: '3rem' }}></i>
                <h4 className="mt-3 text-muted">No insights available yet</h4>
                <p className="text-muted">Be the first to share your knowledge!</p>
                <Link to="/insights/new" className="glossy-button mt-3">
                  <i className="bi bi-plus-lg me-2"></i>
                  Create First Insight
                </Link>
              </div>
            ) : (
              <div className="row g-4">
                {insights.map((insight) => (
                  <div key={insight._id} className="col-12">
                    <div className="card border-0 shadow-sm rounded-3 overflow-hidden h-100">
                      <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <h3 className="card-title mb-0">
                            <Link to={`/insights/${insight._id}`} className="text-decoration-none">
                              {insight.title}
                            </Link>
                          </h3>
                          <div className="dropdown">
                            <button
                              className="btn btn-sm btn-outline-secondary dropdown-toggle"
                              type="button"
                              id="insightActions"
                              data-bs-toggle="dropdown"
                              aria-expanded="false"
                            >
                              <i className="bi bi-three-dots"></i>
                            </button>
                            <ul className="dropdown-menu" aria-labelledby="insightActions">
                              <li><button className="dropdown-item"><i className="bi bi-bookmark me-2"></i> Save</button></li>
                              <li><button className="dropdown-item"><i className="bi bi-share me-2"></i> Share</button></li>
                              <li><button className="dropdown-item"><i className="bi bi-flag me-2"></i> Report</button></li>
                            </ul>
                          </div>
                        </div>
                        
                        <p className="card-text text-muted mb-3">{insight.body}</p>
                        
                        {insight.tags && (
                          <div className="mb-3">
                            {insight.tags.split(',').map((tag, index) => (
                              <span key={index} className="badge bg-light text-dark me-1 mb-1">
                                #{tag.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center">
                            <img
                              src={insight.userId?.profilePicture || 'https://via.placeholder.com/40'}
                              className="rounded-circle me-2"
                              width="30"
                              height="30"
                              alt="User"
                            />
                            <small className="text-muted">
                              By {insight.userId?.username || 'Unknown'}
                            </small>
                          </div>
                          <div className="d-flex">
                            <button className="btn btn-sm btn-outline-secondary me-2">
                              <i className="bi bi-heart me-1"></i>
                              {insight.likes || 0}
                            </button>
                            <button className="btn btn-sm btn-outline-secondary">
                              <i className="bi bi-chat me-1"></i>
                              {insight.comments || 0}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {insights.length > 0 && (
              <nav className="mt-5">
                <ul className="pagination justify-content-center">
                  <li className="page-item disabled">
                    <button className="page-link" tabIndex="-1" aria-disabled="true">
                      Previous
                    </button>
                  </li>
                  <li className="page-item active"><button className="page-link">1</button></li>
                  <li className="page-item"><button className="page-link">2</button></li>
                  <li className="page-item"><button className="page-link">3</button></li>
                  <li className="page-item">
                    <button className="page-link">
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;