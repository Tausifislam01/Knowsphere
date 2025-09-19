import { API_URL } from '../utils/api';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchUsers } from '../utils/api';
import { toast } from 'react-toastify';
import FollowButton from '../components/FollowButton';

const useDebouncedValue = (value, delay = 350) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
};

// Helper: shuffle an array (Fisher–Yates)
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Defensive admin check (in case the backend param is omitted)
const isAdminUser = (u) => {
  if (!u) return false;
  const role = String(u.role || '').toLowerCase();
  const roles = Array.isArray(u.roles) ? u.roles.map(r => String(r).toLowerCase()) : [];
  const uname = String(u.username || '').toLowerCase();
  return (
    u.isAdmin === true ||
    u.isadmin === true ||
    u.is_admin === true ||
    role === 'admin' ||
    roles.includes('admin') ||
    uname === 'admin' || uname.startsWith('admin_') || uname.endsWith('_admin')
  );
};

export default function UsersSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(''); // keep & use
  const debouncedQ = useDebouncedValue(q, 350);
  const firstLoad = useRef(true);

  // Current user (for FollowButton state)
  const [currentUser, setCurrentUser] = useState(null);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
  fetch(`${API_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => me && setCurrentUser(me))
      .catch(() => {});
    const onUserUpdated = (e) => setCurrentUser(e.detail);
    window.addEventListener('userUpdated', onUserUpdated);
    return () => window.removeEventListener('userUpdated', onUserUpdated);
  }, []);

  // Suggestions state
  const [suggestions, setSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');

  // ---- SEARCH ----
  useEffect(() => {
    const run = async () => {
      if (firstLoad.current) {
        firstLoad.current = false;
        return;
      }
      if (!debouncedQ.trim()) {
        // When query is cleared, clear explicit results (we'll show suggestions below)
        setUsers([]);
        setError('');
        return;
      }
      setIsLoading(true);
      setError('');
      try {
        const results = await searchUsers(debouncedQ, 20 /* limit */, { excludeAdmins: false });
        setUsers(Array.isArray(results) ? results : []);
        if (Array.isArray(results) && results.length === 0) {
          setError('No users found');
        }
      } catch (e) {
        const msg = e.message || 'Failed to search users';
        setError(msg);
        toast.error(msg, { autoClose: 2000 });
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [debouncedQ]);

  // ---- SUGGESTIONS (when there is NO query) ----
  const loadSuggestions = useCallback(async () => {
    setIsSuggesting(true);
    setSuggestionError('');
    try {
      // Sample several lightweight queries and merge unique results.
      const seeds = shuffle(['a', 'e', 'i', 'o', 'u', 's', 't', 'n', 'r', 'm', 'l', 'c']).slice(0, 6);

      // Ask server to exclude admins directly (and keep client-side guard as backup)
      const promises = seeds.map((seed) => searchUsers(seed, 10, { excludeAdmins: true }));
      const lists = await Promise.all(promises);

      // Deduplicate by _id, keep order by first appearance, and exclude admins defensively
      const map = new Map();
      lists
        .flat()
        .filter((u) => u && u._id && !isAdminUser(u))
        .forEach((u) => {
          if (!map.has(u._id)) map.set(u._id, u);
        });

      const merged = Array.from(map.values()).slice(0, 12);
      setSuggestions(merged);
      if (merged.length === 0) {
        setSuggestionError('No suggestions to show yet. Try searching by username!');
      }
    } catch (e) {
      const msg = e.message || 'Failed to load suggestions';
      setSuggestionError(msg);
      toast.warn(msg, { autoClose: 2000 });
    } finally {
      setIsSuggesting(false);
    }
  }, []);

  // Auto-load suggestions whenever query is empty
  useEffect(() => {
    if (!q.trim()) {
      loadSuggestions();
    }
  }, [q, loadSuggestions]);

  const placeholderAv = 'https://via.placeholder.com/64';

  const emptyState = useMemo(
    () => (
      <div className="text-center py-5">
        <i className="bi bi-people text-muted" style={{ fontSize: '3rem' }}></i>
        <h4 className="mt-3 text-muted">Find people by username</h4>
        <p className="text-muted">Start typing a username to see matching profiles.</p>
      </div>
    ),
    []
  );

  const handleUserClick = (id) => {
    navigate(`/profile/${id}`);
  };

  return (
    <div className="container py-4">
      <div className="card glossy-card mb-3">
        <div className="card-body">
          <div className="d-flex align-items-center gap-2">
            {/* Back to Home */}
            <Link to="/" className="btn btn-sm btn-outline-secondary me-2" title="Back to Home">
              <i className="bi bi-arrow-left me-1"></i>
              Home
            </Link>

            {/* Search box */}
            <div className="input-group">
              <span className="input-group-text bg-dark text-white border-0">
                <i className="bi bi-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by username…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
                aria-label="Search users by username"
              />
            </div>

            {/* Refresh suggestions when no query */}
            {!q.trim() && (
              <button
                className="glossy-button btn btn-sm ms-2"
                onClick={loadSuggestions}
                disabled={isSuggesting}
                title="Refresh suggestions"
              >
                <i className="bi bi-shuffle me-1"></i>
                {isSuggesting ? 'Refreshing…' : 'Refresh'}
              </button>
            )}
          </div>

          {/* show any error from the search */}
          {error && (
            <div className="alert alert-warning mt-2 mb-0" role="alert" aria-live="polite">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">
              {q.trim() ? `Searching for “${q.trim()}”` : 'Tip: Try partial matches (e.g., "tau")'}
            </small>
            <small className="text-muted">
              {q.trim()
                ? users.length > 0 && `${users.length} result(s)`
                : suggestions.length > 0 && `${suggestions.length} suggestion(s)`}
            </small>
          </div>
        </div>
      </div>

      {/* MAIN BODY */}
      {q.trim() ? (
        // ---------- SEARCH RESULTS ----------
        isLoading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Searching users…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-5">
            <i className="bi bi-emoji-frown text-muted" style={{ fontSize: '3rem' }}></i>
            <h4 className="mt-3 text-muted">No users found</h4>
            <p className="text-muted">Try a different username.</p>
          </div>
        ) : (
          <div className="row g-3">
            {users.map((u) => (
              <div key={u._id} className="col-12 col-sm-6 col-lg-4">
                <Link
                  to={`/profile/${u._id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleUserClick(u._id);
                  }}
                  className="text-decoration-none"
                >
                  <div className="card glossy-card h-100">
                    <div className="card-body d-flex">
                      <img
                        src={u.profilePicture || placeholderAv}
                        alt={u.username}
                        className="rounded-circle me-3"
                        style={{ width: 56, height: 56, objectFit: 'cover' }}
                        onError={(e) => (e.target.src = placeholderAv)}
                      />
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between">
                          <h6 className="mb-0 text-truncate">{u.fullName || u.username}</h6>
                          {/* Prevent Link navigation when clicking Follow */}
                          <div
                            className="ms-2"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <FollowButton userId={u._id} currentUser={currentUser} />
                          </div>
                        </div>
                        <div className="text-muted small">@{u.username}</div>
                        {u.bio && (
                          <div className="small mt-1 text-truncate" title={u.bio}>
                            {u.bio}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )
      ) : (
        // ---------- SUGGESTIONS (admins removed) ----------
        <>
          {isSuggesting ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3">Loading suggestions…</p>
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="d-flex align-items-center justify-content-between mb-2">
                <h5 className="mb-0">Suggested users</h5>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={loadSuggestions}
                  disabled={isSuggesting}
                >
                  <i className="bi bi-shuffle me-1"></i> Refresh
                </button>
              </div>
              <div className="row g-3">
                {suggestions.map((u) => (
                  <div key={u._id} className="col-12 col-sm-6 col-lg-4">
                    <Link
                      to={`/profile/${u._id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleUserClick(u._id);
                      }}
                      className="text-decoration-none"
                    >
                      <div className="card glossy-card h-100">
                        <div className="card-body d-flex">
                          <img
                            src={u.profilePicture || placeholderAv}
                            alt={u.username}
                            className="rounded-circle me-3"
                            style={{ width: 56, height: 56, objectFit: 'cover' }}
                            onError={(e) => (e.target.src = placeholderAv)}
                          />
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center justify-content-between">
                              <h6 className="mb-0 text-truncate">{u.fullName || u.username}</h6>
                              <div
                                className="ms-2"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                <FollowButton userId={u._id} currentUser={currentUser} />
                              </div>
                            </div>
                            <div className="text-muted small">@{u.username}</div>
                            {u.bio && (
                              <div className="small mt-1 text-truncate" title={u.bio}>
                                {u.bio}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
              {suggestionError && (
                <div className="alert alert-warning mt-3" role="alert">
                  <i className="bi bi-info-circle me-2"></i>
                  {suggestionError}
                </div>
              )}
            </>
          ) : (
            <>
              {emptyState}
              {suggestionError && (
                <div className="alert alert-warning mt-3" role="alert">
                  <i className="bi bi-info-circle me-2"></i>
                  {suggestionError}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}