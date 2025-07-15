import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BookmarkButton from './BookmarkButton';

function Profile() {
  const [user, setUser] = useState(null);
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileAndInsights = async () => {
      try {
        const profileResponse = await fetch('http://localhost:5000/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const profileData = await profileResponse.json();
        if (!profileResponse.ok) {
          setError(profileData.message || 'Failed to fetch profile');
          navigate('/login');
          return;
        }
        setUser(profileData);

        const insightsResponse = await fetch('http://localhost:5000/api/insights', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const insightsData = await insightsResponse.json();
        if (insightsResponse.ok) {
          setInsights(insightsData);
        } else {
          setError(insightsData.message || 'Failed to fetch insights');
        }
      } catch (error) {
        setError('Error: ' + error.message);
        navigate('/login');
      }
    };
    fetchProfileAndInsights();
  }, [navigate]);

  const handleDeleteProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/auth/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.removeItem('token');
        navigate('/login', { replace: true });
      } else {
        setDeleteError(data.message || 'Failed to delete profile');
      }
    } catch (error) {
      setDeleteError('Error: ' + error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login', { replace: true });
  };

  const handleEditInsight = (insightId) => {
    navigate(`/insights/edit/${insightId}`);
  };

  const handleDeleteInsight = async (insightId) => {
    if (!window.confirm('Are you sure you want to delete this insight?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/insights/${insightId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        setInsights(insights.filter((insight) => insight._id !== insightId));
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete insight');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
  };

  if (!user) return <div className="container text-center mt-5">Loading...</div>;

  return (
    <div className="container-fluid py-4">
      <div className="row g-4">
        {/* Profile Section (Left, 25%) */}
        <div className="col-lg-3">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column align-items-center py-4">
              <img
                src={user.profilePicture || 'https://via.placeholder.com/150'}
                className="rounded-circle border border-4 border-light shadow mb-3"
                alt="Profile"
                style={{
                  width: '150px',
                  height: '150px',
                  objectFit: 'cover',
                }}
                onError={(e) => (e.target.src = 'https://via.placeholder.com/150')}
              />
              <h4 className="card-title mb-1">{user.fullName || user.username}</h4>
              <p className="text-muted mb-3">{user.bio || 'No bio available'}</p>
              <div className="w-100 px-3 mb-3">
                <div className="d-flex align-items-center mb-2">
                  <i className="bi bi-envelope me-2 text-primary"></i>
                  <span className="text-truncate">{user.email}</span>
                </div>
                {user.workplace && (
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-briefcase me-2 text-primary"></i>
                    <span>{user.workplace}</span>
                  </div>
                )}
                {user.location && (
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-geo-alt me-2 text-primary"></i>
                    <span>{user.location}</span>
                  </div>
                )}
                {!user.genderPrivacy && user.gender && (
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-person-fill me-2 text-primary"></i>
                    <span>{user.gender}</span>
                  </div>
                )}
                {user.facebook && (
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-facebook me-2 text-primary"></i>
                    <a href={user.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
                  </div>
                )}
                {user.linkedin && (
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-linkedin me-2 text-primary"></i>
                    <a href={user.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  </div>
                )}
                {user.github && (
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-github me-2 text-primary"></i>
                    <a href={user.github} target="_blank" rel="noopener noreferrer">GitHub</a>
                  </div>
                )}
                {user.portfolio && (
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-briefcase me-2 text-primary"></i>
                    <a href={user.portfolio} target="_blank" rel="noopener noreferrer">Portfolio</a>
                  </div>
                )}
              </div>
              <button
                className="glossy-button mt-auto w-75"
                onClick={() => navigate('/edit-profile')}
              >
                <i className="bi bi-pencil-square me-2"></i>
                Edit Profile
              </button>
              <button
                className="glossy-button mt-2 w-75 bg-danger hover:bg-danger-dark"
                onClick={() => setShowDeleteModal(true)}
              >
                <i className="bi bi-trash me-2"></i>
                Delete Profile
              </button>
            </div>
          </div>
        </div>

        {/* Main Content (Center, 50%) */}
        <div className="col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="mb-0">Your Insights</h3>
                <button
                  className="glossy-button btn-sm"
                  onClick={() => navigate('/insights/new')}
                >
                  <i className="bi bi-plus-lg me-1"></i> New
                </button>
              </div>
              {insights.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-lightbulb text-muted" style={{ fontSize: '3rem' }}></i>
                  <p className="text-muted mt-3">No insights posted yet.</p>
                  <button
                    className="glossy-button mt-2"
                    onClick={() => navigate('/insights/new')}
                  >
                    Create Your First Insight
                  </button>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {insights.map((insight) => (
                    <div key={insight._id} className="list-group-item border-0 py-3 px-0">
                      <div className="d-flex align-items-start mb-2">
                        <div className="flex-grow-1">
                          <h5 className="mb-1">{insight.title}</h5>
                          <p className="mb-2 text-muted">{insight.body}</p>
                          <small className="text-muted">Visibility: {insight.visibility}</small>
                        </div>
                        <div className="ms-2 d-flex align-items-center">
                          <BookmarkButton insightId={insight._id} />
                          <div className="dropdown ms-2">
                            <button
                              className="glossy-button btn-sm"
                              type="button"
                              data-bs-toggle="dropdown"
                              aria-expanded="false"
                            >
                              <i className="bi bi-three-dots"></i>
                            </button>
                            <ul className="dropdown-menu">
                              <li>
                                <button
                                  className="dropdown-item"
                                  onClick={() => handleEditInsight(insight._id)}
                                >
                                  <i className="bi bi-pencil me-2"></i> Edit
                                </button>
                              </li>
                              <li>
                                <button
                                  className="dropdown-item text-danger"
                                  onClick={() => handleDeleteInsight(insight._id)}
                                >
                                  <i className="bi bi-trash me-2"></i> Delete
                                </button>
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar (Right, 25%) */}
        <div className="col-lg-3">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h5 className="card-title mb-3">Quick Actions</h5>
              <div className="d-grid gap-2">
                <button
                  className="glossy-button text-start d-flex align-items-center"
                  onClick={() => navigate('/insights/new')}
                >
                  <i className="bi bi-pencil-square me-2"></i>
                  Create Insight
                </button>
                <button
                  className="glossy-button text-start d-flex align-items-center"
                  onClick={() => navigate('/bookmarks')}
                >
                  <i className="bi bi-bookmark me-2"></i>
                  Bookmarks
                </button>
                <button
                  className="glossy-button text-start d-flex align-items-center"
                  onClick={() => navigate('/settings')}
                >
                  <i className="bi bi-gear me-2"></i>
                  Settings
                </button>
                <button
                  className="glossy-button text-start d-flex align-items-center bg-danger hover:bg-danger-dark"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right me-2"></i>
                  Logout
                </button>
              </div>
              <hr className="my-4" />
              <h6 className="mb-3">Stats</h6>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Insights</span>
                <span className="fw-bold">{insights.length}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span className="text-muted">Following</span>
                <span className="fw-bold">{user.following ? user.following.length : 0}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span className="text-muted">Followers</span>
                <span className="fw-bold">{user.followers ? user.followers.length : 0}</span>
              </div>
              <hr className="my-4" />
              <h6 className="mb-3">Additional Info</h6>
              {user.skills && user.skills.length > 0 && (
                <div className="mb-2">
                  <span className="text-muted">Skills: </span>
                  <span>{user.skills.join(', ')}</span>
                </div>
              )}
              {user.education && user.education.length > 0 && (
                <div className="mb-2">
                  <span className="text-muted">Education: </span>
                  <span>{user.education.join(', ')}</span>
                </div>
              )}
              {user.workExperience && user.workExperience.length > 0 && (
                <div className="mb-2">
                  <span className="text-muted">Work Experience: </span>
                  <span>{user.workExperience.join(', ')}</span>
                </div>
              )}
              {user.languages && user.languages.length > 0 && (
                <div className="mb-2">
                  <span className="text-muted">Languages: </span>
                  <span>{user.languages.join(', ')}</span>
                </div>
              )}
              {user.interests && user.interests.length > 0 && (
                <div className="mb-2">
                  <span className="text-muted">Interests: </span>
                  <span>{user.interests.join(', ')}</span>
                </div>
              )}
              {user.badges && user.badges.length > 0 && (
                <div className="mb-2">
                  <span className="text-muted">Badges: </span>
                  <span>{user.badges.join(', ')}</span>
                </div>
              )}
              {user.availability && (
                <div className="mb-2">
                  <span className="text-muted">Availability: </span>
                  <span>{user.availability}</span>
                </div>
              )}
              {user.preferredTopics && user.preferredTopics.length > 0 && (
                <div className="mb-2">
                  <span className="text-muted">Preferred Topics: </span>
                  <span>{user.preferredTopics.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="toast show position-fixed bottom-0 end-0 m-3" role="alert">
          <div className="toast-header bg-danger text-white">
            <strong className="me-auto">Error</strong>
            <button
              type="button"
              className="btn-close"
              onClick={() => setError('')}
            ></button>
          </div>
          <div className="toast-body">{error}</div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">Delete Profile</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                ></button>
              </div>
              <form onSubmit={handleDeleteProfile}>
                <div className="modal-body">
                  <p className="text-danger">
                    Warning: This action is irreversible. All your data, including insights, will be deleted.
                  </p>
                  <div className="mb-3">
                    <label className="form-label">Enter your password to confirm</label>
                    <input
                      type="password"
                      className="form-control"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                    />
                  </div>
                  {deleteError && <p className="text-danger">{deleteError}</p>}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="glossy-button bg-secondary hover:bg-secondary-dark"
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletePassword('');
                      setDeleteError('');
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="glossy-button bg-danger hover:bg-danger-dark">
                    <i className="bi bi-trash me-2"></i> Delete Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;