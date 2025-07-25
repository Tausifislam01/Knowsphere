const API_URL = 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

// Report content (insight or comment)
export const reportContent = async (itemType, itemId, reason) => {
  const response = await fetch(`${API_URL}/reports`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders().headers,
    },
    body: JSON.stringify({ reportedItemType: itemType, reportedItemId: itemId, reason }),
  });
  if (!response.ok) {
    throw new Error('Failed to submit report');
  }
  return response.json();
};

// Get all pending reports (admin only)
export const getReports = async () => {
  const response = await fetch(`${API_URL}/admin/reports`, getAuthHeaders());
  if (!response.ok) {
    throw new Error('Failed to fetch reports');
  }
  return response.json();
};

// Resolve or dismiss a report (admin only)
export const resolveReport = async (reportId, status) => {
  const response = await fetch(`${API_URL}/admin/reports/${reportId}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders().headers,
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('Failed to resolve report');
  }
  return response.json();
};

// Delete an insight (admin only)
export const deleteInsight = async (insightId) => {
  const response = await fetch(`${API_URL}/insights/${insightId}`, {
    method: 'DELETE',
    ...getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to delete insight');
  }
  return response.json();
};

// Hide an insight (admin only)
export const hideInsight = async (insightId) => {
  const response = await fetch(`${API_URL}/insights/${insightId}/hide`, {
    method: 'PUT',
    ...getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to hide insight');
  }
  return response.json();
};

// Hide a comment (admin only)
export const hideComment = async (commentId) => {
  const response = await fetch(`${API_URL}/insights/comments/${commentId}/hide`, {
    method: 'PUT',
    ...getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to hide comment');
  }
  return response.json();
};

// Ban a user (admin only)
export const banUser = async (userId) => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/ban`, {
    method: 'POST',
    ...getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to ban user');
  }
  return response.json();
};

// Unban a user (admin only)
export const unbanUser = async (userId) => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/unban`, {
    method: 'POST',
    ...getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Failed to unban user');
  }
  return response.json();
};