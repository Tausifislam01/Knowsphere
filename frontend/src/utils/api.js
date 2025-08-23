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

// Suggest tags
export const suggestTags = async (text) => {
  const response = await fetch(`${API_URL}/insights/suggest-tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders().headers,
    },
    body: JSON.stringify({ title: '', body: text }),
  });
  const data = await handleApiError(response, 'Failed to suggest tags');
  return data.tags.map(tag => tag.trim()); // Ensure tags are trimmed
};

// Other functions unchanged
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

export const fetchReports = async () => {
  const response = await fetch(`${API_URL}/admin/reports`, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch reports');
};

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

export const fetchUsers = async () => {
  const response = await fetch(`${API_URL}/admin/users`, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch users');
};

export const fetchReportedInsights = async () => {
  const response = await fetch(`${API_URL}/admin/insights/reported`, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch reported insights');
};

export const fetchReportedComments = async () => {
  const response = await fetch(`${API_URL}/admin/comments/reported`, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch reported comments');
};

export const deleteInsight = async (insightId) => {
  const response = await fetch(`${API_URL}/admin/insights/${insightId}`, {
    method: 'DELETE',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to delete insight');
};

export const deleteComment = async (commentId) => {
  const response = await fetch(`${API_URL}/admin/comments/${commentId}`, {
    method: 'DELETE',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to delete comment');
};

export const hideInsight = async (insightId) => {
  const response = await fetch(`${API_URL}/admin/insights/${insightId}/hide`, {
    method: 'PUT',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to hide insight');
};

export const hideComment = async (commentId) => {
  const response = await fetch(`${API_URL}/admin/comments/${commentId}/hide`, {
    method: 'PUT',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to hide comment');
};

export const banUser = async (userId) => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/ban`, {
    method: 'POST',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to ban user');
};

export const unbanUser = async (userId) => {
  const response = await fetch(`${API_URL}/admin/users/${userId}/unban`, {
    method: 'POST',
    ...getAuthHeaders(),
  });
  return handleApiError(response, 'Failed to unban user');
};

export const searchInsights = async (query, tag, followed = false) => {
  let url = followed ? `${API_URL}/insights/followed` : `${API_URL}/insights/search`;
  if (query || tag) {
    url = `${API_URL}/insights/search?${query ? `q=${encodeURIComponent(query)}` : ''}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`;
  }
  const response = await fetch(url, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch insights');
};

export const getRelatedInsights = async (insightId, limit = 5) => {
  const response = await fetch(`${API_URL}/insights/${insightId}/related?limit=${limit}`, getAuthHeaders());
  return handleApiError(response, 'Failed to fetch related insights');
};