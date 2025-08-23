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

  // Validate MongoDB ObjectId
  const isValidObjectId = (id) => {
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Extract unique tags for dropdown
  const uniqueTags = [
    ...new Set(
      insights.flatMap((insight) =>
        Array.isArray(insight.tags) ? insight.tags.map((t) => t.trim()) : []
      )
    ),
  ].sort();

  // Filter insights client-side as a fallback
  const filteredInsights = insights.filter((insight) => {
    const matchesSearch = searchTerm
      ? (insight.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (insight.body || '').toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    const matchesTag = selectedTag
      ? Array.isArray(insight.tags) &&
        insight.tags.map((t) => t.trim().toLowerCase()).includes(selectedTag.toLowerCase())
      : true;
    return matchesSearch && matchesTag;
  });

  // Handle edit action
  const handleEdit = (id) => {
    navigate(`/insights/edit/${id}`);
  };

  // Handle delete action
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this insight?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/insights/${id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to delete insight');
        }
        setInsights(insights.filter((insight) => insight._id !== id));
        toast.success('Insight deleted successfully', { autoClose: 2000 });
      } catch (error) {
        console.error('Delete insight error:', error.message);
        toast.error(`Error: ${error.message}`, { autoClose: 2000 });
      }
    }
  };

  useEffect(() => {
    // Prevent fetch if selectedTag is invalid
    if (selectedTag && selectedTag.includes(':')) {
      setSelectedTag('');
      return;
    }

    const fetchInsights = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        let url;
        // Validate search term and tag

        const cleanSearchTerm = searchTerm ? searchTerm.trim() : '';
        let cleanTag = selectedTag ? selectedTag.trim() : '';

        if (id && id !== 'search') {
          // Validate insight ID before fetching
          if (!isValidObjectId(id)) {
            throw new Error('Invalid insight ID');
          }
          url = `http://localhost:5000/api/insights/${id}`;
        } else if (showFollowed) {
          // Fetch followed insights
          url = 'http://localhost:5000/api/insights/followed';
        } else if (cleanSearchTerm || cleanTag) {
          // Fetch insights with search and/or tag
          const queryParams = [];
          if (cleanSearchTerm) {
            queryParams.push(`q=${encodeURIComponent(cleanSearchTerm)}`);
          }
          if (cleanTag) {
            queryParams.push(`tag=${encodeURIComponent(cleanTag)}`);
          }
          url = `http://localhost:5000/api/insights/search?${queryParams.join('&')}`;
        } else {
          // Fetch public insights
          url = 'http://localhost:5000/api/insights/public';
        }

        const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
        console.log('Fetching insights from:', url);
        const response = await fetch(url, { headers });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          let message = errorData.message || 'Server error, please try again later';
          if (response.status === 400) {
            message = 'Invalid search term or tag. Please try a different query.';
          } else if (response.status === 404) {
            message = 'No insights found for this request.';
          }
          throw new Error(message);
        }
        const data = await response.json();
        if (id && id !== 'search') {
          setSingleInsight(data);
          setInsights([data]);
        } else {
          setInsights(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Fetch insights error:', error.message);
        setError(error.message);
        toast.error(`Error: ${error.message}`, { autoClose: 2000 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInsights();
  }, [id, searchTerm, selectedTag, showFollowed]);

  return (
    <div className="container py-4">
      {id && id !== 'search' && singleInsight ? (
        <Insight
          insight={singleInsight}
          currentUser={currentUser}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <>
          <div className="mb-4 d-flex gap-3">
            <input
              type="text"
              className="form-control"
              placeholder="Search insights..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="form-select"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
            >
              <option value="">All Tags</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
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