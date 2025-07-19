import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Insight from '../components/Insight';

function Home() {
  const { id } = useParams();
  const [insights, setInsights] = useState([]);
  const [singleInsight, setSingleInsight] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showFollowed, setShowFollowed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Fetch current user
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        if (response.ok) {
          const user = await response.json();
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Fetch user error:', error);
        toast.error('Failed to load user profile', { autoClose: 2000 });
      }
    };
    fetchCurrentUser();

    // Handle user updates
    const handleUserUpdate = (event) => {
      setCurrentUser(event.detail);
    };
    window.addEventListener('userUpdated', handleUserUpdate);

    if (id) {
      const fetchSingleInsight = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`http://localhost:5000/api/insights/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setSingleInsight(data);
        } catch (error) {
          console.error('Fetch single insight error:', error);
          setError(error.message.includes('Failed to fetch')
            ? 'Unable to connect to the server. Please try again later.'
            : `Error: ${error.message}`);
          toast.error(`Error: ${error.message}`, { autoClose: 2000 });
        } finally {
          setIsLoading(false);
        }
      };
      fetchSingleInsight();
    } else {
      const fetchInsights = async () => {
        setIsLoading(true);
        try {
          const endpoint = showFollowed
            ? 'http://localhost:5000/api/insights/followed'
            : 'http://localhost:5000/api/insights/public';
          const response = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setInsights(data);
        } catch (error) {
          console.error('Fetch insights error:', error);
          setError(error.message.includes('Failed to fetch')
            ? 'Unable to connect to the server. Please try again later.'
            : `Error: ${error.message}`);
          toast.error(`Error: ${error.message}`, { autoClose: 2000 });
        } finally {
          setIsLoading(false);
        }
      };
      fetchInsights();
    }

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
    };
  }, [id, showFollowed]);

  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insight.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag
      ? insight.tags && Array.isArray(insight.tags) && insight.tags.map(t => t.trim().toLowerCase()).includes(selectedTag.toLowerCase())
      : true;
    return matchesSearch && matchesTag;
  });

  const allTags = [...new Set(
    insights.flatMap(insight =>
      Array.isArray(insight.tags) ? insight.tags.map(t => t.trim()) : []
    )
  )];

  if (id && isLoading) {
    return <div className="container text-center mt-5">Loading...</div>;
  }

  if (id && error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">{error}</div>
        <Link to="/" className="glossy-button btn btn-sm">Back to Home</Link>
      </div>
    );
  }

  if (id && !singleInsight) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">Insight not found</div>
        <Link to="/" className="glossy-button btn btn-sm">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {id && singleInsight ? (
        <>
          <Link to="/" className="glossy-button btn btn-sm mb-4">
            <i className="bi bi-arrow-left me-2"></i>Back to Home
          </Link>
          <Insight insight={singleInsight} currentUser={currentUser} />
        </>
      ) : (
        <>
          <div className="text-center mb-5">
            <h1 className="display-5 fw-bold mb-3 text-primary">
              <i className="bi bi-lightbulb me-2"></i>
              Community Insights
            </h1>
            <p className="lead text-muted">
              Discover and share knowledge with our community of thinkers and creators
            </p>
          </div>
          <div className="row mb-4">
            <div className="col-md-8 mb-3 mb-md-0">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search insights..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>#{tag}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-light rounded">
            <div>
              <span className="fw-bold">{filteredInsights.length}</span> insights found
            </div>
            <div className="d-flex gap-2">
              <button
                className={`glossy-button btn btn-sm ${showFollowed ? 'bg-primary' : 'bg-secondary'}`}
                onClick={() => setShowFollowed(!showFollowed)}
              >
                {showFollowed ? 'Show All Insights' : 'Show Followed Insights'}
              </button>
              <Link to="/insights/new" className="glossy-button btn btn-sm">
                <i className="bi bi-plus-lg me-2"></i>
                Create New Insight
              </Link>
            </div>
          </div>
          {error && (
            <div className="alert alert-danger d-flex align-items-center mb-4">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>{error}</div>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading insights...</p>
            </div>
          ) : filteredInsights.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-lightbulb text-muted" style={{ fontSize: '3rem' }}></i>
              <h4 className="mt-3 text-muted">
                {searchTerm || selectedTag ? 'No matching insights found' : 'No public insights yet'}
              </h4>
              <p className="text-muted mb-4">
                {searchTerm || selectedTag ? 'Try a different search term or tag' : 'Be the first to share your knowledge!'}
              </p>
              <Link to="/insights/new" className="glossy-button btn btn-sm">
                <i className="bi bi-plus-lg me-2"></i>
                Create Insight
              </Link>
            </div>
          ) : (
            <div className="row g-4">
              {filteredInsights.map(insight => (
                <Insight
                  key={insight._id}
                  insight={insight}
                  currentUser={currentUser}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Home;