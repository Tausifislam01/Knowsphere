import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import BookmarkButton from '../components/BookmarkButton';
import VoteButtons from '../components/VoteButtons';
import CommentSection from '../components/CommentSection';

function Home() {
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedInsight, setExpandedInsight] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  useEffect(() => {
    const fetchPublicInsights = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/insights/public');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        setInsights(data);
      } catch (error) {
        console.error('Fetch error:', error);
        setError(error.message.includes('Failed to fetch') 
          ? 'Unable to connect to the server. Please try again later.'
          : `Error: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPublicInsights();
  }, []);

  const toggleInsightExpand = (insightId) => {
    setExpandedInsight(expandedInsight === insightId ? null : insightId);
  };

  const filteredInsights = insights.filter(insight => {
    const matchesSearch = insight.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         insight.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag ? 
      insight.tags && insight.tags.split(',').map(t => t.trim().toLowerCase()).includes(selectedTag.toLowerCase())
      : true;
    return matchesSearch && matchesTag;
  });

  // Extract all unique tags
  const allTags = [...new Set(
    insights.flatMap(insight => 
      insight.tags ? insight.tags.split(',').map(t => t.trim()) : []
    )
  )];

  return (
    <div className="container py-4">
      {/* Hero Section */}
      <div className="text-center mb-5">
        <h1 className="display-5 fw-bold mb-3 text-primary">
          <i className="bi bi-lightbulb me-2"></i>
          Community Insights
        </h1>
        <p className="lead text-muted">
          Discover and share knowledge with our community of thinkers and creators
        </p>
      </div>

      {/* Search and Filter Section */}
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

      {/* Stats Bar */}
      <div className="d-flex justify-content-between align-items-center mb-4 p-3 bg-light rounded">
        <div>
          <span className="fw-bold">{filteredInsights.length}</span> insights found
        </div>
        <div>
          <Link to="/insights/new" className="glossy-button">
            <i className="bi bi-plus-lg me-2"></i>
            Create New Insight
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{error}</div>
        </div>
      )}

      {/* Loading State */}
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
          <Link to="/insights/new" className="glossy-button">
            <i className="bi bi-plus-lg me-2"></i>
            Create Insight
          </Link>
        </div>
      ) : (
        <div className="row g-4">
          {filteredInsights.map(insight => (
            <div key={insight._id} className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-3 overflow-hidden h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h3 className="card-title mb-0">
                      <Link 
                        to={`/insights/${insight._id}`} 
                        className="text-decoration-none text-dark"
                      >
                        {insight.title}
                      </Link>
                    </h3>
                    <BookmarkButton insightId={insight._id} />
                  </div>
                  
                  <div className="d-flex align-items-center mb-3">
                    <img
                      src={insight.userId?.profilePicture || 'https://via.placeholder.com/40'}
                      className="rounded-circle me-2"
                      width="30"
                      height="30"
                      alt="Author"
                    />
                    <small className="text-muted">
                      By {insight.userId?.username || 'Anonymous'} • {new Date(insight.createdAt).toLocaleDateString()}
                    </small>
                  </div>
                  
                  <p className={`card-text ${expandedInsight === insight._id ? '' : 'text-truncate'}`}>
                    {insight.body}
                  </p>
                  
                  <button 
                    className="btn btn-link p-0 mb-3" 
                    onClick={() => toggleInsightExpand(insight._id)}
                  >
                    {expandedInsight === insight._id ? 'Show less' : 'Read more'}
                  </button>
                  
                  {insight.tags && (
                    <div className="mb-3">
                      {insight.tags.split(',').map((tag, index) => (
                        <span 
                          key={index} 
                          className="badge bg-light text-dark me-1 mb-1 cursor-pointer"
                          onClick={() => setSelectedTag(tag.trim())}
                        >
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <VoteButtons
                    insightId={insight._id}
                    initialUpvotes={insight.upvotes || []}
                    initialDownvotes={insight.downvotes || []}
                  />
                </div>
                
                <div className="card-footer bg-transparent">
                  <CommentSection insightId={insight._id} />
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