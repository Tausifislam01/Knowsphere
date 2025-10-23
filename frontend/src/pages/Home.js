import { API_URL } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Insight from '../components/Insight';
import { getTrendingInsights } from '../utils/api';

function Home({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [singleInsight, setSingleInsight] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Search/filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  // New: tab state (following | trending | all)
const [activeTab, setActiveTab] = useState(
  (currentUser &&
    ((currentUser.following?.length || 0) + (currentUser.followedTags?.length || 0) > 0))
    ? 'following'
    : 'all'
);

// keep it in sync if currentUser loads later (logged-in users only)
useEffect(() => {
  if (!currentUser) return; // ← do nothing for guests

  const hasFollows =
    (currentUser.following?.length || 0) +
      (currentUser.followedTags?.length || 0) > 0;

  setActiveTab(hasFollows ? 'following' : 'all');
}, [currentUser]);



  // Validate MongoDB ObjectId
  const isValidObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id);

  // Extract unique tags for dropdown (from current list)
  const uniqueTags = [
    ...new Set(
      insights.flatMap((insight) =>
        Array.isArray(insight.tags) ? insight.tags.map((t) => t.trim()) : []
      )
    ),
  ].sort();

  // Client-side filter (applies to 'all' list & singleInsight fallback)
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

  const fetchFrom = async (url, headers) => {
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
    return response.json();
  };

  useEffect(() => {
    // If viewing a single insight (/insights/:id) treat as detail view regardless of tabs
    if (id && id !== 'search') {
      const run = async () => {
        setIsLoading(true);
        setError(null);
        try {
          if (!isValidObjectId(id)) throw new Error('Invalid insight ID');

          const token = localStorage.getItem('token');
          const headers = token
            ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
            : { 'Content-Type': 'application/json' };

          const data = await fetchFrom(`${API_URL}/insights/${id}`, headers);
          setSingleInsight(data);
          setInsights([data]);
        } catch (err) {
          console.error('Fetch single insight error:', err.message);
          setError(err.message);
          toast.error(`Error: ${err.message}`, { autoClose: 2000 });
        } finally {
          setIsLoading(false);
        }
      };
      run();
      return;
    }

    // List views
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const headers = token
          ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' };

        let url;

        if (activeTab === 'following' && token) {
          const url = `${API_URL}/insights/followed`;
          const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
          const data = await fetchFrom(url, headers);

          // Fallback to public feed if the user follows no one / no tags yet
          if (!Array.isArray(data) || data.length === 0) {
            const pub = await fetchFrom(`${API_URL}/insights/public`, { 'Content-Type': 'application/json' });
            setSingleInsight(null);
            setInsights(Array.isArray(pub) ? pub : []);
          } else {
            setSingleInsight(null);
            setInsights(data);
          }

          setIsLoading(false);
          return;
        } else if (activeTab === 'trending') {
          // pass search and tag to backend so ranking happens on filtered set
          const data = await getTrendingInsights('7d', 50, searchTerm.trim(), selectedTag.trim());
          setSingleInsight(null);
          setInsights(Array.isArray(data) ? data : []);
          setIsLoading(false);
          return;
        } else {
          // 'all' tab or guest user
          const cleanSearchTerm = searchTerm ? searchTerm.trim() : '';
          let cleanTag = selectedTag ? selectedTag.trim() : '';
          if (cleanSearchTerm || cleanTag) {
            const queryParams = [];
            if (cleanSearchTerm) queryParams.push(`q=${encodeURIComponent(cleanSearchTerm)}`);
            if (cleanTag) queryParams.push(`tag=${encodeURIComponent(cleanTag)}`);
            url = `${API_URL}/insights/search?${queryParams.join('&')}`;
          } else {
            url = `${API_URL}/insights/public`;
          }
        }

        const data = await fetchFrom(url, headers);
        setSingleInsight(null);
        setInsights(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fetch insights error:', err.message);
        setError(err.message);
        toast.error(`Error: ${err.message}`, { autoClose: 2000 });
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [id, activeTab, searchTerm, selectedTag]);

  // Default tab behavior:
  // - Logged-in: following
  // - Guest: trending
  useEffect(() => {
    if (!currentUser) setActiveTab('trending');
  }, [currentUser]);

  // Actions
  const handleEdit = (id) => navigate(`/insights/edit/${id}`);
  const handleDelete = async (idToDelete) => {
    if (!window.confirm('Are you sure you want to delete this insight?')) return;
    try {
      const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/insights/${idToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete insight');
      }
      setInsights(insights.filter((insight) => insight._id !== idToDelete));
      toast.success('Insight deleted successfully', { autoClose: 2000 });
    } catch (error) {
      console.error('Delete insight error:', error.message);
      toast.error(`Error: ${error.message}`, { autoClose: 2000 });
    }
  };

  return (
    <div className="container py-4">
      {id && id !== 'search' && singleInsight ? (
        <Insight
          insight={singleInsight}
          currentUser={currentUser}
          onEdit={handleEdit}
          onDelete={handleDelete}
          showRelated={true}  // show Related on Home detail view
        />
      ) : (
        <>
          {/* Tabs + Actions */}
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="btn-group" role="group" aria-label="Feed tabs">
              <button
                className={`btn btn-sm ${activeTab === 'following' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveTab('following')}
                disabled={!currentUser}
                title={currentUser ? 'Insights from people/tags you follow' : 'Log in to use Following'}
              >
                Following
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'trending' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveTab('trending')}
                title="Top insights by score in the last 7 days"
              >
                Trending
              </button>
              <button
                className={`btn btn-sm ${activeTab === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setActiveTab('all')}
                title="All recent public insights"
              >
                All
              </button>
            </div>

            {/* Search + Tag filter */}
            <div className="ms-auto d-flex gap-2" style={{ minWidth: 280 }}>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search insights..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={false}
              />
              <select
                className="form-select form-select-sm"
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                disabled={false}
              >
                <option value="">All Tags</option>
                {uniqueTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>

            {/* Action buttons */}
            <Link to="/users" className="glossy-button btn btn-sm" title="Find users by username">
              <i className="bi bi-people me-2"></i>
              Find Users
            </Link>
            <Link to="/insights/new" className="glossy-button btn btn-sm">
              <i className="bi bi-plus-lg me-2"></i>
              Create
            </Link>
          </div>

          {/* Status bar */}
          <div className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
            <div>
              <span className="fw-bold">{filteredInsights.length}</span> insights found
              {activeTab !== 'all' && <span className="text-muted ms-2">({activeTab})</span>}
            </div>
          </div>

          {/* Errors / loading / content */}
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
                  : 'No insights available'}
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
                  showRelated={true}   // <-- show Related on Home
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