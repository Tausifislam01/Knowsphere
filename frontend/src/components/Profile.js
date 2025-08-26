// src/components/Profile.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import FollowButton from './FollowButton';
import Insight from './Insight';

function Profile({ currentUser }) {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams();

  const [headerUser, setHeaderUser] = useState(null);     // profile owner data
  const [insights, setInsights] = useState([]);
  const [activeTab, setActiveTab] = useState('insights'); // insights | about | followers | following | tags
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [error, setError] = useState('');

  // Followers / Following (expanded mini user objects)
  const [followersExpanded, setFollowersExpanded] = useState([]);
  const [followingExpanded, setFollowingExpanded] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // Back-to-top
  const [showTop, setShowTop] = useState(false);

  const isOwner = useMemo(() => {
    if (!headerUser || !currentUser) return false;
    return String(headerUser._id) === String(currentUser._id);
  }, [headerUser, currentUser]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token
      ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' };
  };

  // Load profile header (owner or target user)
  useEffect(() => {
    const loadHeader = async () => {
      setLoading(true);
      setError('');
      try {
        const url = paramUserId
          ? `http://localhost:5000/api/auth/profile/${paramUserId}`
          : `http://localhost:5000/api/auth/profile`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load profile');
        }
        const user = await res.json();
        setHeaderUser(user);
      } catch (e) {
        setError(e.message);
        toast.error(e.message, { autoClose: 2000 });
      } finally {
        setLoading(false);
      }
    };
    loadHeader();
  }, [paramUserId]);

  // Load that user's insights (respect owner/admin visibility on backend)
  useEffect(() => {
    const loadInsights = async () => {
      if (!headerUser?._id) return;
      setInsightsLoading(true);
      try {
        const res = await fetch(
          `http://localhost:5000/api/insights/user/${headerUser._id}`,
          { headers: getAuthHeaders() }
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || 'Failed to load insights');
        }
        const list = await res.json();
        setInsights(Array.isArray(list) ? list : []);
      } catch (e) {
        toast.error(e.message, { autoClose: 2000 });
      } finally {
        setInsightsLoading(false);
      }
    };
    loadInsights();
  }, [headerUser]);

  // Expand follower/following IDs to mini user objects
  const expandUserIds = useCallback(async (ids = []) => {
    const arr = Array.isArray(ids) ? ids : [];
    const results = [];
    for (const item of arr) {
      // if already a populated object, keep it
      if (item && typeof item === 'object' && (item.username || item._id)) {
        results.push(item);
        continue;
      }
      try {
        const res = await fetch(`http://localhost:5000/api/auth/profile/${item}`, { headers: getAuthHeaders() });
        if (res.ok) {
          results.push(await res.json());
        }
      } catch {
        // ignore individual failures
      }
    }
    return results;
  }, []);

  // After header user loads, fetch followers/following lists
  useEffect(() => {
    const loadSocialLists = async () => {
      if (!headerUser) return;
      setLoadingFollowers(true);
      setLoadingFollowing(true);
      try {
        const [follows, following] = await Promise.all([
          expandUserIds(headerUser.followers),
          expandUserIds(headerUser.following),
        ]);
        setFollowersExpanded(follows);
        setFollowingExpanded(following);
      } finally {
        setLoadingFollowers(false);
        setLoadingFollowing(false);
      }
    };
    loadSocialLists();
  }, [headerUser, expandUserIds]);

  // Back-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 240);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleEditProfile = () => navigate('/edit-profile');

  const copyProfileLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied', { autoClose: 1500 });
    } catch {
      toast.error('Copy failed', { autoClose: 1500 });
    }
  };

  const shareProfile = async () => {
    const url = window.location.href;
    const title = headerUser?.fullName || headerUser?.username || 'Profile';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied (no native share available)', { autoClose: 1500 });
      }
    } catch {
      /* share cancelled */
    }
  };

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Loading profile…</span>
        </div>
        <p className="mt-3">Loading profile…</p>
      </div>
    );
  }

  if (error || !headerUser) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>{error || 'Profile not found'}</div>
        </div>
        <Link to="/" className="glossy-button btn btn-sm">Back to Home</Link>
      </div>
    );
  }

  const placeholderAv = 'https://via.placeholder.com/150';
  const followerCount = headerUser.followers?.length || 0;
  const followingCount = headerUser.following?.length || 0;
  const insightsCount = insights.length;

  return (
    <div className="container py-4">
      {/* Header card */}
      <div className="card glossy-card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3">
            {/* Avatar + identity */}
            <div className="d-flex align-items-center gap-3">
              <img
                src={headerUser.profilePicture || placeholderAv}
                alt={headerUser.username}
                className="rounded-circle border border-3 border-dark-subtle"
                style={{ width: 104, height: 104, objectFit: 'cover' }}
                onError={(e) => (e.currentTarget.src = placeholderAv)}
              />
              <div>
                <h1 className="h4 mb-1">{headerUser.fullName || headerUser.username}</h1>
                <div className="text-muted">@{headerUser.username}</div>
                {headerUser.bio && <p className="mt-2 mb-0 text-body">{headerUser.bio}</p>}
                <div className="mt-2 d-flex flex-wrap gap-3 small text-muted">
                  {headerUser.location && (
                    <span><i className="bi bi-geo-alt me-1"></i>{headerUser.location}</span>
                  )}
                  {headerUser.workplace && (
                    <span><i className="bi bi-briefcase me-1"></i>{headerUser.workplace}</span>
                  )}
                </div>
                {Array.isArray(headerUser.badges) && headerUser.badges.length > 0 && (
                  <div className="mt-3 d-flex flex-wrap gap-2">
                    {headerUser.badges.map((b, i) => (
                      <span key={i} className="badge rounded-pill text-bg-dark-subtle">{b}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex flex-wrap gap-2">
              {isOwner ? (
                <>
                  <Link to="/insights/new" className="glossy-button btn btn-sm">
                    <i className="bi bi-plus-lg me-2"></i>Create Insight
                  </Link>
                  <button className="glossy-button btn btn-sm" onClick={handleEditProfile}>
                    <i className="bi bi-gear me-2"></i>Edit Profile
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <FollowButton userId={headerUser._id} currentUser={currentUser} />
                  </div>
                  {/* <button className="btn btn-sm btn-outline-secondary">
                    <i className="bi bi-chat-dots me-2"></i>Message
                  </button> */}
                </>
              )}
              <button className="btn btn-sm btn-outline-secondary" onClick={copyProfileLink}>
                <i className="bi bi-link-45deg me-2"></i>Copy Link
              </button>
              <button className="btn btn-sm btn-outline-secondary" onClick={shareProfile}>
                <i className="bi bi-share me-2"></i>Share
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="row g-2 mt-3">
            <div className="col-6 col-sm-3">
              <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-uppercase small text-muted">Followers</div>
                <div className="fs-5 fw-bold">{followerCount}</div>
              </div>
            </div>
            <div className="col-6 col-sm-3">
              <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-uppercase small text-muted">Following</div>
                <div className="fs-5 fw-bold">{followingCount}</div>
              </div>
            </div>
            <div className="col-6 col-sm-3">
              <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-uppercase small text-muted">Insights</div>
                <div className="fs-5 fw-bold">{insightsCount}</div>
              </div>
            </div>
            <div className="col-6 col-sm-3">
              <div className="p-3 rounded-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-uppercase small text-muted">Skills</div>
                <div className="fs-5 fw-bold">{headerUser.skills?.length || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 pb-3">
          <ul className="nav nav-tabs">
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>
                Insights
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>
                About
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'followers' ? 'active' : ''}`} onClick={() => setActiveTab('followers')}>
                Followers
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'following' ? 'active' : ''}`} onClick={() => setActiveTab('following')}>
                Following
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}>
                Tags ({(headerUser.followedTags || []).length})
              </button>
            </li>
          </ul>

          <div className="pt-3">
            {activeTab === 'insights' && (
              <section>
                {insightsLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                      <span className="visually-hidden">Loading insights…</span>
                    </div>
                    <p className="mt-3">Loading insights…</p>
                  </div>
                ) : insights.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bi bi-lightbulb text-muted" style={{ fontSize: '3rem' }}></i>
                    <h5 className="mt-3 text-muted">No insights yet</h5>
                    {isOwner && (
                      <>
                        <p className="text-muted">Start by creating your first insight!</p>
                        <Link to="/insights/new" className="glossy-button btn btn-sm">
                          <i className="bi bi-plus-lg me-2"></i>Create Insight
                        </Link>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="row g-4">
                    {insights.map((insight) => (
                      <Insight
                        key={insight._id}
                        insight={insight}
                        currentUser={currentUser}
                        onEdit={(id) => navigate(`/insights/edit/${id}`)}
                        onDelete={() => {}}
                        showRelated={false}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeTab === 'about' && (
              <section className="row g-3">
                <div className="col-12 col-lg-8">
                  <div className="card glossy-card">
                    <div className="card-body">
                      <h6 className="text-uppercase text-muted mb-2">About</h6>
                      <p className="mb-0">{headerUser.bio || '—'}</p>
                    </div>
                  </div>
                  <div className="card glossy-card mt-3">
                    <div className="card-body">
                      <h6 className="text-uppercase text-muted mb-3">Details</h6>
                      <div className="row g-3">
                        <Detail label="Full name" value={headerUser.fullName} icon="person" />
                        <Detail label="Workplace" value={headerUser.workplace} icon="briefcase" />
                        <Detail label="Location" value={headerUser.location} icon="geo-alt" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-4">
                  <div className="card glossy-card">
                    <div className="card-body">
                      <h6 className="text-uppercase text-muted mb-2">Skills</h6>
                      <Pills items={headerUser.skills} />
                    </div>
                  </div>
                  <div className="card glossy-card mt-3">
                    <div className="card-body">
                      <h6 className="text-uppercase text-muted mb-2">Links</h6>
                      <ProfileLinks user={headerUser} />
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'followers' && (
              <UsersGrid
                title="Followers"
                loading={loadingFollowers}
                users={followersExpanded}
                emptyText="No followers yet."
                currentUser={currentUser}
              />
            )}

            {activeTab === 'following' && (
              <UsersGrid
                title="Following"
                loading={loadingFollowing}
                users={followingExpanded}
                emptyText="Not following anyone yet."
                currentUser={currentUser}
              />
            )}

            {activeTab === 'tags' && <TagsPanel tags={headerUser.followedTags || []} />}
          </div>
        </div>
      </div>

      {/* Back to Top floating button */}
      {showTop && (
        <button
          className="btn btn-primary position-fixed"
          style={{ bottom: 20, right: 20, borderRadius: '50%', width: 44, height: 44 }}
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      )}
    </div>
  );
}

function Detail({ label, value, icon = 'dot' }) {
  return (
    <div className="col-12 col-md-6">
      <div className="d-flex align-items-center gap-2">
        <i className={`bi bi-${icon} text-muted`}></i>
        <div>
          <div className="text-muted small">{label}</div>
          <div className="fw-semibold">{value || '—'}</div>
        </div>
      </div>
    </div>
  );
}

function Pills({ items }) {
  if (!Array.isArray(items) || items.length === 0) return <div className="text-muted">—</div>;
  return (
    <div className="d-flex flex-wrap gap-2">
      {items.map((s, i) => (
        <span key={i} className="badge rounded-pill bg-dark text-light border border-1 border-secondary-subtle">
          {s}
        </span>
      ))}
    </div>
  );
}

function ProfileLinks({ user }) {
  const links = [
    { icon: 'link-45deg', label: 'Portfolio', href: user.portfolio },
    { icon: 'github', label: 'GitHub', href: user.github },
    { icon: 'linkedin', label: 'LinkedIn', href: user.linkedin },
    { icon: 'facebook', label: 'Facebook', href: user.facebook },
  ].filter((l) => !!l.href);

  if (links.length === 0) return <div className="text-muted">—</div>;

  return (
    <div className="d-grid gap-2">
      {links.map((l, i) => (
        <a
          key={i}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className="btn btn-sm btn-outline-secondary d-flex align-items-center justify-content-between"
        >
          <span><i className={`bi bi-${l.icon} me-2`}></i>{l.label}</span>
          <span className="text-muted">↗</span>
        </a>
      ))}
    </div>
  );
}

function UsersGrid({ title, loading, users, emptyText, currentUser }) {
  return (
    <section>
      <h5 className="mb-3">{title}</h5>
      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary" role="status" />
        </div>
      ) : !Array.isArray(users) || users.length === 0 ? (
        <div className="text-muted">{emptyText}</div>
      ) : (
        <div className="row g-3">
          {users.map((u) => {
            const id = u?._id || u?.id || u;
            const username = u?.username || String(id).slice(0, 6);
            const placeholderAv = 'https://via.placeholder.com/64';
            return (
              <div key={id} className="col-12 col-sm-6 col-md-4 col-lg-3">
                <div className="card glossy-card h-100 p-3 d-flex">
                  <div className="d-flex align-items-center gap-2">
                    <img
                      src={u?.profilePicture || placeholderAv}
                      alt={username}
                      className="rounded-circle"
                      style={{ width: 40, height: 40, objectFit: 'cover' }}
                      onError={(e) => (e.currentTarget.src = placeholderAv)}
                    />
                    <div className="flex-grow-1">
                      <div className="fw-semibold">@{username}</div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mt-3">
                    <Link to={`/profile/${id}`} className="btn btn-sm btn-outline-secondary">Open</Link>
                    {(!currentUser || String(currentUser._id) !== String(id)) && (
                      <FollowButton userId={id} currentUser={currentUser} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function TagsPanel({ tags = [] }) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return <div className="text-muted">No followed tags</div>;
  }
  return (
    <div className="d-flex flex-wrap gap-2">
      {tags.map((t) => (
        <Link key={t} to={`/tags/${encodeURIComponent(t)}`} className="badge bg-secondary text-decoration-none">
          #{t}
        </Link>
      ))}
    </div>
  );
}

export default Profile;