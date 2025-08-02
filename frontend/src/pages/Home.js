import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Insight from '../components/Insight';

function Home({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [singleInsight, setSingleInsight] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [showFollowed, setShowFollowed] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchSingleInsight = async () => {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:5000/api/insights/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setSingleInsight(data);
        } catch (error) {
          setError(
            error.message.includes('Insight not found')
              ? 'Insight not found or hidden.'
              : error.message.includes('Unauthorized')
              ? 'You are not authorized to view this insight.'
              : `Error: ${error.message}`
          );
          toast.error(
            error.message.includes('Insight not found')
              ? 'Insight not found or hidden.'
              : error.message.includes('Unauthorized')
              ? 'You are not authorized to view this insight.'
              : `Error: ${error.message}`,
            { autoClose: 2000 }
          );
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
          const token = localStorage.getItem('token');
          const headers = showFollowed && token ? { Authorization: `Bearer ${token}` } : {};
          const response = await fetch(endpoint, { headers });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          setInsights(Array.isArray(data) ? data : []);
        } catch (error) {
          setError(
            error.message.includes('Failed to fetch')
              ? 'Unable to connect to the server. Please try again later.'
              : `Error: ${error.message}`
          );
          toast.error(
            error.message.includes('Failed to fetch')
              ? 'Unable to connect to the server. Please try again later.'
              : `Error: ${error.message}`,
            { autoClose: 2000 }
          );
        } finally {
          setIsLoading(false);
        }
      };
      fetchInsights();
    }
  }, [id, showFollowed]);

  const handleEdit = (insightId) => {
    navigate(`/insights/${insightId}/edit`);
  };

  const handleDelete = async (insightId) => {
    if (!window.confirm('Are you sure you want to delete this insight?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/insights/${insightId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        setInsights(insights.filter((insight) => insight._id !== insightId));
        toast.success('Insight deleted successfully', { autoClose: 2000 });
        if (!id) {
          window.alert('Your insight has been deleted successfully');
        }
      } else {
        const data = await response.json();
        toast.error(data.message || 'Failed to delete insight', { autoClose: 2000 });
        window.alert(data.message || 'Failed to delete insight');
      }
    } catch (error) {
      toast.error(`Error deleting insight: ${error.message}`, { autoClose: 2000 });
      window.alert(`Error deleting insight: ${error.message}`);
    }
  };

  const filteredInsights = insights.filter((insight) => {
    const matchesSearch =
      (insight.title && insight.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (insight.body && insight.body.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesTag = selectedTag
      ? insight.tags &&
        Array.isArray(insight.tags) &&
        insight.tags.map((t) => t.trim().toLowerCase()).includes(selectedTag.toLowerCase())
      : true;
    return matchesSearch && matchesTag;
  });

  const allTags = [
    ...new Set(
      insights.flatMap((insight) =>
        Array.isArray(insight.tags) ? insight.tags.map((t) => t.trim()) : []
      )
    ),
  ];

  if (id && isLoading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Loading insight...</p>
      </div>
    );
  }

  if (id && error) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">{error}</div>
        <Link to="/" className="glossy-button btn btn-sm">
          Back to Home
        </Link>
      </div>
    );
  }

  if (id && !singleInsight) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">Insight not found or hidden.</div>
        <Link to="/" className="glossy-button btn btn-sm">
          Back to Home
        </Link>
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
          <Insight
            insight={singleInsight}
            currentUser={currentUser}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
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
                {allTags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
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
                {searchTerm || selectedTag
                  ? 'No matching insights found'
                  : 'No public insights available'}
              </h4>
              <p className="text-muted mb-4">
                {searchTerm || selectedTag
                  ? 'Try a different search term or tag'
                  : 'Be the first to share your knowledge!'}
              </p>
              <Link to="/insights/new" className="glossy-button btn btn-sm">
                <i className="bi bi-plus-lg me-2"></i>
                Create Insight
              </Link>
            </div>
          ) : (
            <div className="row g-4">
              {filteredInsights.map((insight) => (
                <Insight
                  key={insight._id}
                  insight={insight}
                  currentUser={currentUser}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
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