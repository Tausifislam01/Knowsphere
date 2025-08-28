// frontend/src/utils/api.js
const API_ORIGIN = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = `${API_ORIGIN}/api`;

/* ---------------- Helpers ---------------- */

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
});

const jsonAuthHeaders = () => ({
  'Content-Type': 'application/json',
  ...authHeader(),
});

const handle = async (res, fallback) => {
  if (!res.ok) {
    let msg = fallback;
    try {
      const j = await res.json();
      msg = j.message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
};

/* -------------- Auth / Profile -------------- */

export const login = async ({ username, password }) => {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return handle(res, 'Login failed');
};

export const signup = async ({ username, email, password }) => {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  return handle(res, 'Signup failed');
};

export const getProfile = async () => {
  const res = await fetch(`${API_URL}/auth/profile`, { headers: authHeader() });
  return handle(res, 'Failed to load profile');
};

export const updateProfile = async (payloadOrFormData) => {
  const isForm = payloadOrFormData instanceof FormData;
  const res = await fetch(`${API_URL}/auth/profile`, {
    method: 'PUT',
    headers: isForm ? authHeader() : jsonAuthHeaders(),
    body: isForm ? payloadOrFormData : JSON.stringify(payloadOrFormData),
  });
  return handle(res, 'Failed to update profile');
};

export const changePassword = async (currentPassword, newPassword) => {
  const res = await fetch(`${API_URL}/auth/change-password`, {
    method: 'PUT',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handle(res, 'Failed to change password');
};

export const deleteProfile = async () => {
  const res = await fetch(`${API_URL}/auth/delete`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  return handle(res, 'Failed to delete account');
};

/* -------------- Users / Follow -------------- */

export const listUsers = async () => {
  const res = await fetch(`${API_URL}/auth/users`, { headers: authHeader() });
  return handle(res, 'Failed to load users');
};

export const searchUsers = async (q, limit = 20, { excludeAdmins = false } = {}) => {
  const params = new URLSearchParams();
  if (q && q.trim()) params.set('q', q.trim());
  params.set('limit', String(limit));
  if (excludeAdmins) params.set('excludeAdmins', 'true');
  const res = await fetch(`${API_URL}/auth/users/search?${params.toString()}`, { headers: authHeader() });
  return handle(res, 'Failed to search users');
};

export const followUser = async (userId) => {
  const res = await fetch(`${API_URL}/auth/follow/${userId}`, {
    method: 'POST',
    headers: authHeader(),
  });
  return handle(res, 'Failed to follow user');
};

export const unfollowUser = async (userId) => {
  const res = await fetch(`${API_URL}/auth/unfollow/${userId}`, {
    method: 'POST',
    headers: authHeader(),
  });
  return handle(res, 'Failed to unfollow user');
};

export const followTag = async (tag) => {
  const res = await fetch(`${API_URL}/auth/follow-tag/${encodeURIComponent(tag)}`, {
    method: 'POST',
    headers: authHeader(),
  });
  return handle(res, 'Failed to follow tag');
};

export const unfollowTag = async (tag) => {
  const res = await fetch(`${API_URL}/auth/unfollow-tag/${encodeURIComponent(tag)}`, {
    method: 'POST',
    headers: authHeader(),
  });
  return handle(res, 'Failed to unfollow tag');
};

/* ---------------- Insights ---------------- */

export const suggestTags = async (text) => {
  const res = await fetch(`${API_URL}/insights/suggest-tags`, {
    method: 'POST',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ title: '', body: text }),
  });
  const data = await handle(res, 'Failed to suggest tags');
  return Array.isArray(data.tags) ? data.tags : [];
};

export const createInsight = async ({ title, body, tags = [], visibility = 'public' }) => {
  const res = await fetch(`${API_URL}/insights`, {
    method: 'POST',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ title, body, tags, visibility }),
  });
  return handle(res, 'Failed to create insight');
};

export const updateInsight = async (id, payload) => {
  const res = await fetch(`${API_URL}/insights/${id}`, {
    method: 'PUT',
    headers: jsonAuthHeaders(),
    body: JSON.stringify(payload),
  });
  return handle(res, 'Failed to update insight');
};

/**
 * Delete an insight.
 * - If `reason` is provided (string), use the **admin** path and include `{ reason }` in the body.
 * - Otherwise, use the normal user path.
 */
export const deleteInsight = async (id, reason) => {
  if (typeof reason === 'string') {
    const res = await fetch(`${API_URL}/admin/insights/${id}`, {
      method: 'DELETE',
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handle(res, 'Failed to delete insight');
  }
  const res = await fetch(`${API_URL}/insights/${id}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  return handle(res, 'Failed to delete insight');
};

export const getPublicInsights = async () => {
  const res = await fetch(`${API_URL}/insights/public`);
  return handle(res, 'Failed to load public insights');
};

export const getFollowedInsights = async () => {
  const res = await fetch(`${API_URL}/insights/followed`, { headers: authHeader() });
  return handle(res, 'Failed to load followed insights');
};

export const searchInsights = async (q = '', tag = '') => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (tag) params.set('tag', tag);
  const res = await fetch(`${API_URL}/insights/search?${params.toString()}`);
  return handle(res, 'Failed to search insights');
};

export const getTrendingInsights = async (window = '7d', limit = 50, q = '', tag = '') => {
  const params = new URLSearchParams({ window: String(window), limit: String(limit) });
  if (q) params.set('q', q);
  if (tag) params.set('tag', tag);
  const res = await fetch(`${API_URL}/insights/trending?${params.toString()}`);
  return handle(res, 'Failed to load trending insights');
};

export const getRelatedInsights = async (id, limit = 5) => {
  const res = await fetch(`${API_URL}/insights/${id}/related?limit=${limit}`);
  return handle(res, 'Failed to load related insights');
};

export const voteInsight = async (id, voteType) => {
  const res = await fetch(`${API_URL}/insights/${id}/vote`, {
    method: 'POST',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ voteType }),
  });
  return handle(res, 'Failed to vote');
};

/* ---------------- Bookmarks ---------------- */

export const getMyBookmarks = async () => {
  const res = await fetch(`${API_URL}/bookmarks`, { headers: authHeader() });
  return handle(res, 'Failed to load bookmarks');
};

export const addBookmark = async (insightId) => {
  const res = await fetch(`${API_URL}/bookmarks`, {
    method: 'POST',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ insightId }),
  });
  return handle(res, 'Failed to add bookmark');
};

export const removeBookmark = async (insightId) => {
  const res = await fetch(`${API_URL}/bookmarks/${insightId}`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  return handle(res, 'Failed to remove bookmark');
};

/* ---------------- Reports / Admin ---------------- */

// Create a report for an Insight or Comment
export const reportContent = async (reportedItemType, reportedItemId, reason) => {
  const res = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ reportedItemType, reportedItemId, reason }),
  });
  return handle(res, 'Failed to submit report');
};

// Pending — optionally paginated; pass itemType so the server filters & counts correctly.
// Returns raw data: either an array OR { items, page, limit, total }.
export const fetchReportedInsights = async (params = {}) => {
  const qs = new URLSearchParams();
  qs.set('itemType', 'Insight');
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const url = `${API_URL}/admin/reports/pending${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: authHeader() });
  return handle(res, 'Failed to load reported insights');
};

export const fetchReportedComments = async (params = {}) => {
  const qs = new URLSearchParams();
  qs.set('itemType', 'Comment');
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const url = `${API_URL}/admin/reports/pending${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: authHeader() });
  return handle(res, 'Failed to load reported comments');
};

// ✅ send { status, note }
export const resolveReportWithNote = async (reportId, status = 'resolved', note = '') => {
  const res = await fetch(`${API_URL}/admin/reports/${reportId}/resolve`, {
    method: 'POST',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ status, note }),
  });
  return handle(res, 'Failed to update report');
};

// Admin-only hide/unhide & deletes — include optional { reason }
export const hideInsight = async (id, reason = '') => {
  const res = await fetch(`${API_URL}/admin/insights/${id}/hide`, {
    method: 'PUT',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handle(res, 'Failed to toggle insight visibility');
};

export const hideComment = async (commentId, reason = '') => {
  const res = await fetch(`${API_URL}/admin/comments/${commentId}/hide`, {
    method: 'PUT',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handle(res, 'Failed to toggle comment visibility');
};

export const deleteComment = async (commentId, reason = '') => {
  const res = await fetch(`${API_URL}/admin/comments/${commentId}`, {
    method: 'DELETE',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ reason }),
  });
  return handle(res, 'Failed to delete comment');
};

export const banUserAdvanced = async (userId, { durationDays = 7, reason = '', incrementStrike = true } = {}) => {
  // Compute "until" ISO if durationDays > 0
  let until = null;
  if (Number(durationDays) > 0) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + Number(durationDays));
    until = d.toISOString();
  }
  const res = await fetch(`${API_URL}/admin/users/${userId}/ban`, {
    method: 'POST',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ until, reason, incrementStrike }),
  });
  return handle(res, 'Failed to ban user');
};

export const unbanUser = async (userId) => {
  const res = await fetch(`${API_URL}/admin/users/${userId}/unban`, {
    method: 'POST',
    headers: authHeader(),
  });
  return handle(res, 'Failed to unban user');
};

/* ---------------- Notifications ---------------- */

export const getNotifications = async () => {
  const res = await fetch(`${API_URL}/notifications`, { headers: authHeader() });
  return handle(res, 'Failed to load notifications');
};

export const markNotificationRead = async (id) => {
  const res = await fetch(`${API_URL}/notifications/${id}/read`, {
    method: 'POST',
    headers: authHeader(),
  });
  return handle(res, 'Failed to mark notification read');
};

export const clearReadNotifications = async () => {
  const res = await fetch(`${API_URL}/notifications/clear-read`, {
    method: 'DELETE',
    headers: authHeader(),
  });
  return handle(res, 'Failed to clear notifications');
};

/* ---------------- Admin: Handled Reports ---------------- */

// Returns raw data: either an array OR { items, page, limit, total }
export const fetchHandledReports = async (params = {}) => {
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.resolvedBy) qs.set('resolvedBy', params.resolvedBy);
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.itemType) qs.set('itemType', params.itemType);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const url = `${API_URL}/admin/reports/handled${qs.toString() ? `?${qs.toString()}` : ''}`;
  const res = await fetch(url, { headers: authHeader() });
  return handle(res, 'Failed to load handled reports');
};

/* ---------------- Admin: Diagnostics (existing) ---------------- */

export const fetchUserReportCount = async (userId) => {
  const res = await fetch(`${API_URL}/admin/user-report-count/${userId}`, {
    headers: authHeader(),
  });
  const data = await handle(res, 'Failed to load report count');
  return typeof data?.count === 'number' ? data.count : 0;
};

/* ---------------- Comments: Voting (NEW) ---------------- */

export const voteComment = async (commentId, voteType /* 'upvote' | 'downvote' */) => {
  const res = await fetch(`${API_URL}/comments/${commentId}/vote`, {
    method: 'POST',
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ voteType }),
  });
  return handle(res, 'Failed to vote on comment');
};