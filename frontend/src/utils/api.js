const API_URL = 'http://localhost:5000/api';

// Helper function to get auth headers
const getAuthHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

// Helper function to handle API errors
const handleApiError = async (response, defaultMessage) => {
  if (!response.ok) {
    let errorMessage = defaultMessage;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // Ignore JSON parse errors, use default message
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

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
  return handleApiError(response, 'Failed to submit report');
};

// Fetch all pending reports (admin only)
export const fetchReports = async () => {
  const response = await fetch(`${API_URL}/admin/reports`, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch reports');
};

// Resolve or dismiss a report (admin only)
export const resolveReport = async (reportId, status = 'resolved') => {
  const response = await fetch(`${API_URL}/admin/reports/${reportId}/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders().headers,
    },
    body: JSON.stringify({ status }),
  });
  return handleApiError(response, 'Failed to resolve report');
};

// Fetch all users (admin only)
export const fetchUsers = async () => {
  const response = await fetch(`${API_URL}/admin/users`, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch users');
};

// Fetch reported insights (admin only)
export const fetchReportedInsights = async () => {
  const response = await fetch(`${API_URL}/admin/insights/reported`, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch reported insights');
};

// Fetch reported comments (admin only)
export const fetchReportedComments = async () => {
  const response = await fetch(`${API_URL}/admin/comments/reported`, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch reported comments');
};

// Delete an insight (admin only)
export const deleteInsight = async (insightId) => {
  const response = await fetch(`${API_URL}/admin/insights/${insightId}`, {
    method: 'DELETE',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to delete insight');
};

// Delete a comment (admin only)
export const deleteComment = async (commentId) => {
  const response = await fetch(`${API_URL}/admin/comments/${commentId}`, {
    method: 'DELETE',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to delete comment');
};

// Hide an insight (admin only)
export const hideInsight = async (insightId) => {
  const response = await fetch(`${API_URL}/admin/insights/${insightId}/hide`, {
    method: 'PUT',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to hide insight');
};

// Hide a comment (admin only)
export const hideComment = async (commentId) => {
  const response = await fetch(`${API_URL}/admin/comments/${commentId}/hide`, {
    method: 'PUT',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to hide comment');
};

// Ban a user (admin only)
export const banUser = async (userId) => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/ban`, {
    method: 'POST',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to ban user');
};

// Unban a user (admin only)
export const unbanUser = async (userId) => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/unban`, {
    method: 'POST',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to unban user');
};