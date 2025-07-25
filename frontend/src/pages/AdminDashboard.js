import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getReports, resolveReport, deleteInsight, hideComment, banUser, unbanUser } from '../utils/api';

const AdminDashboard = ({ currentUser }) => {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [insights, setInsights] = useState([]);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    console.log('AdminDashboard - currentUser:', currentUser);
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        console.log('AdminDashboard - Decoded token:', decoded);
      } catch (err) {
        console.error('AdminDashboard - Token decode error:', err.message);
      }
    } else {
      console.log('AdminDashboard - No token found, redirecting to login');
      navigate('/login');
      return;
    }

    if (currentUser && !currentUser.isAdmin) {
      console.log('AdminDashboard - Access denied, redirecting. isAdmin:', currentUser.isAdmin);
      toast.error('Access denied: Admins only', { autoClose: 2000 });
      navigate('/');
      return;
    }

    if (!currentUser) {
      console.log('AdminDashboard - Waiting for currentUser');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const usersResponse = await fetch('http://localhost:5000/api/admin/users', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        console.log('Users API response status:', usersResponse.status);
        if (!usersResponse.ok) {
          throw new Error(`Users API error: ${usersResponse.status} ${usersResponse.statusText}`);
        }
        const usersData = await usersResponse.json();
        console.log('Users API response data:', usersData);
        setUsers(usersData);

        const reportsData = await getReports();
        console.log('Reports API response data:', reportsData);
        setReports(reportsData);

        const insightIds = reportsData
          .filter(r => r.reportedItemType === 'Insight')
          .map(r => r.reportedItemId);
        console.log('Reported insight IDs:', insightIds);
        const insightPromises = insightIds.map(id =>
          fetch(`http://localhost:5000/api/insights/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }).then(res => res.json())
        );
        const insightsData = await Promise.all(insightPromises);
        console.log('Reported insights data:', insightsData);
        setInsights(insightsData.filter(i => i && i._id));

        const commentIds = reportsData
          .filter(r => r.reportedItemType === 'Comment')
          .map(r => r.reportedItemId);
        console.log('Reported comment IDs:', commentIds);
        const commentPromises = commentIds.map(id =>
          fetch(`http://localhost:5000/api/insights/comments/${id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }).then(res => res.json())
        );
        const commentsData = await Promise.all(commentPromises);
        console.log('Reported comments data:', commentsData);
        setComments(commentsData.filter(c => c && c._id));
      } catch (err) {
        console.error('Fetch data error:', err.message);
        setError(`Error fetching data: ${err.message}`);
        toast.error(`Error fetching data: ${err.message}`, { autoClose: 2000 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [currentUser, navigate]);

  const handleBanUser = async (userId) => {
    if (!window.confirm('Are you sure you want to ban this user?')) return;
    try {
      await banUser(userId);
      setUsers(users.map(u => u._id === userId ? { ...u, isBanned: true } : u));
      toast.success('User banned successfully', { autoClose: 2000 });
    } catch (err) {
      console.error('Ban user error:', err.message);
      toast.error(`Error banning user: ${err.message}`, { autoClose: 2000 });
    }
  };

  const handleUnbanUser = async (userId) => {
    if (!window.confirm('Are you sure you want to unban this user?')) return;
    try {
      await unbanUser(userId);
      setUsers(users.map(u => u._id === userId ? { ...u, isBanned: false } : u));
      toast.success('User unbanned successfully', { autoClose: 2000 });
    } catch (err) {
      console.error('Unban user error:', err.message);
      toast.error(`Error unbanning user: ${err.message}`, { autoClose: 2000 });
    }
  };

  const handleResolveReport = async (reportId) => {
    try {
      await resolveReport(reportId, 'resolved');
      setReports(reports.filter(r => r._id !== reportId));
      const resolvedReport = reports.find(r => r._id === reportId);
      if (resolvedReport.reportedItemType === 'Insight') {
        setInsights(insights.filter(i => i._id !== resolvedReport.reportedItemId));
      } else if (resolvedReport.reportedItemType === 'Comment') {
        setComments(comments.filter(c => c._id !== resolvedReport.reportedItemId));
      }
      toast.success('Report resolved', { autoClose: 2000 });
    } catch (err) {
      console.error('Resolve report error:', err.message);
      toast.error(`Error resolving report: ${err.message}`, { autoClose: 2000 });
    }
  };

  const handleHideContent = async (itemId, itemType) => {
    try {
      if (itemType === 'Insight') {
        await fetch(`http://localhost:5000/api/insights/${itemId}/hide`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setInsights(insights.map(i => i._id === itemId ? { ...i, isHidden: true } : i));
      } else {
        await hideComment(itemId);
        setComments(comments.map(c => c._id === itemId ? { ...c, isHidden: true } : c));
      }
      toast.success(`${itemType} hidden successfully`, { autoClose: 2000 });
    } catch (err) {
      console.error(`Hide ${itemType} error:`, err.message);
      toast.error(`Error hiding ${itemType.toLowerCase()}: ${err.message}`, { autoClose: 2000 });
    }
  };

  const handleDeleteContent = async (itemId, itemType) => {
    if (!window.confirm(`Are you sure you want to delete this ${itemType.toLowerCase()}?`)) return;
    try {
      if (itemType === 'Insight') {
        await deleteInsight(itemId);
        setInsights(insights.filter(i => i._id !== itemId));
      } else {
        await fetch(`http://localhost:5000/api/insights/comments/${itemId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setComments(comments.filter(c => c._id !== itemId));
      }
      toast.success(`${itemType} deleted successfully`, { autoClose: 2000 });
    } catch (err) {
      console.error(`Delete ${itemType} error:`, err.message);
      toast.error(`Error deleting ${itemType.toLowerCase()}: ${err.message}`, { autoClose: 2000 });
    }
  };

  if (!currentUser) {
    console.log('AdminDashboard - Rendering null until currentUser is loaded');
    return null;
  }

  return (
    <div className="container py-4">
      <h1 className="display-5 fw-bold mb-4 text-primary">
        <i className="bi bi-shield-lock me-2"></i>Admin Dashboard
      </h1>
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
          <p className="mt-3">Loading data...</p>
        </div>
      ) : (
        <>
          <div className="card glossy-card mb-4">
            <div className="card-body">
              <h3 className="card-title mb-4">Manage Users</h3>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="4">No users available</td>
                      </tr>
                    ) : (
                      users.map(user => (
                        <tr key={user._id}>
                          <td>{user.username}</td>
                          <td>{user.email}</td>
                          <td>{user.isBanned ? 'Banned' : 'Active'}</td>
                          <td>
                            {user.isBanned ? (
                              <button
                                className="glossy-button btn-sm"
                                onClick={() => handleUnbanUser(user._id)}
                              >
                                Unban
                              </button>
                            ) : (
                              <button
                                className="glossy-button btn-sm bg-danger"
                                onClick={() => handleBanUser(user._id)}
                              >
                                Ban
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card glossy-card mb-4">
            <div className="card-body">
              <h3 className="card-title mb-4">Manage Reports</h3>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Item Type</th>
                      <th>Reported By</th>
                      <th>Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.length === 0 ? (
                      <tr>
                        <td colSpan="4">No reports available</td>
                      </tr>
                    ) : (
                      reports.map(report => (
                        <tr key={report._id}>
                          <td>{report.reportedItemType}</td>
                          <td>{report.reporterId?.username || 'Unknown'}</td>
                          <td>{report.reason}</td>
                          <td>
                            <button
                              className="glossy-button btn-sm me-2"
                              onClick={() => handleResolveReport(report._id)}
                            >
                              Resolve
                            </button>
                            <button
                              className="glossy-button btn-sm bg-warning me-2"
                              onClick={() => handleHideContent(report.reportedItemId, report.reportedItemType)}
                            >
                              Hide
                            </button>
                            <button
                              className="glossy-button btn-sm bg-danger"
                              onClick={() => handleDeleteContent(report.reportedItemId, report.reportedItemType)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card glossy-card mb-4">
            <div className="card-body">
              <h3 className="card-title mb-4">Manage Reported Insights</h3>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {insights.length === 0 ? (
                      <tr>
                        <td colSpan="4">No reported insights available</td>
                      </tr>
                    ) : (
                      insights.map(insight => (
                        <tr key={insight._id}>
                          <td>{insight.title}</td>
                          <td>{insight.userId?.username || 'Unknown'}</td>
                          <td>{insight.isHidden ? 'Hidden' : 'Visible'}</td>
                          <td>
                            <button
                              className="glossy-button btn-sm bg-warning me-2"
                              onClick={() => handleHideContent(insight._id, 'Insight')}
                            >
                              {insight.isHidden ? 'Unhide' : 'Hide'}
                            </button>
                            <button
                              className="glossy-button btn-sm bg-danger"
                              onClick={() => handleDeleteContent(insight._id, 'Insight')}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card glossy-card">
            <div className="card-body">
              <h3 className="card-title mb-4">Manage Reported Comments</h3>
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Text</th>
                      <th>Author</th>
                      <th>Insight</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comments.length === 0 ? (
                      <tr>
                        <td colSpan="5">No reported comments available</td>
                      </tr>
                    ) : (
                      comments.map(comment => (
                        <tr key={comment._id}>
                          <td>{comment.text?.substring(0, 50) || 'No text'}...</td>
                          <td>{comment.userId?.username || 'Unknown'}</td>
                          <td>{comment.insightId?.title || 'Unknown'}</td>
                          <td>{comment.isHidden ? 'Hidden' : 'Visible'}</td>
                          <td>
                            <button
                              className="glossy-button btn-sm bg-warning me-2"
                              onClick={() => handleHideContent(comment._id, 'Comment')}
                            >
                              {comment.isHidden ? 'Unhide' : 'Hide'}
                            </button>
                            <button
                              className="glossy-button btn-sm bg-danger"
                              onClick={() => handleDeleteContent(comment._id, 'Comment')}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;