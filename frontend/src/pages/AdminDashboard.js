import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchReportedInsights, hideInsight, deleteInsight,
  fetchReportedComments, hideComment, deleteComment
} from '../utils/api';

function AdminDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('insights');
  const [reportedInsights, setReportedInsights] = useState([]);
  const [reportedComments, setReportedComments] = useState([]);
  const [handledReports, setHandledReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportSearch, setReportSearch] = useState({
    status: '',
    resolvedBy: '',
    startDate: '',
    endDate: '',
    itemType: ''
  });

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'insights') {
          const insightData = await fetchReportedInsights();
          const insightsWithReportCount = await Promise.all(insightData.map(async (insight) => {
            const userId = insight.userId?._id;
            if (userId) {
              const res = await fetch(`/api/admin/user-report-count/${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              });
              const { count } = await res.json();
              return { ...insight, userReportCount: count };
            }
            return insight;
          }));
          setReportedInsights(insightsWithReportCount);
        } else if (activeTab === 'comments') {
          const commentData = await fetchReportedComments();
          const commentsWithReportCount = await Promise.all(commentData.map(async (comment) => {
            const userId = comment.userId?._id;
            if (userId) {
              const res = await fetch(`/api/admin/user-report-count/${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              });
              const { count } = await res.json();
              return { ...comment, userReportCount: count };
            }
            return comment;
          }));
          setReportedComments(commentsWithReportCount);
        } else if (activeTab === 'logs') {
          const query = new URLSearchParams();
          if (reportSearch.status) query.append('status', reportSearch.status);
          if (reportSearch.resolvedBy) query.append('resolvedBy', reportSearch.resolvedBy);
          if (reportSearch.startDate) query.append('startDate', reportSearch.startDate);
          if (reportSearch.endDate) query.append('endDate', reportSearch.endDate);
          if (reportSearch.itemType) query.append('itemType', reportSearch.itemType);
          
          let handledData = await fetch(`/api/admin/handled-reports?${query.toString()}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          }).then(res => res.json());
          handledData = await Promise.all(handledData.map(async (report) => {
            const userId = report.reportedItemId?.userId?._id;
            if (userId) {
              const res = await fetch(`/api/admin/user-report-count/${userId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              });
              const { count } = await res.json();
              return { ...report, userReportCount: count };
            }
            return report;
          }));
          setHandledReports(handledData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(`Error loading ${activeTab}: ${error.message}`, { autoClose: 2000 });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeTab, currentUser, reportSearch]);

  const handleReportSearch = async () => {
    try {
      const query = new URLSearchParams();
      if (reportSearch.status) query.append('status', reportSearch.status);
      if (reportSearch.resolvedBy) query.append('resolvedBy', reportSearch.resolvedBy);
      if (reportSearch.startDate) query.append('startDate', reportSearch.startDate);
      if (reportSearch.endDate) query.append('endDate', reportSearch.endDate);
      if (reportSearch.itemType) query.append('itemType', reportSearch.itemType);
      
      let handledData = await fetch(`/api/admin/handled-reports?${query.toString()}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      }).then(res => res.json());
      handledData = await Promise.all(handledData.map(async (report) => {
        const userId = report.reportedItemId?.userId?._id;
        if (userId) {
          const res = await fetch(`/api/admin/user-report-count/${userId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          });
          const { count } = await res.json();
          return { ...report, userReportCount: count };
        }
        return report;
      }));
      setHandledReports(handledData);
    } catch (error) {
      console.error('Error searching handled reports:', error);
      toast.error(`Error searching handled reports: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleReportSearchChange = (e) => {
    setReportSearch({ ...reportSearch, [e.target.name]: e.target.value });
  };

  const handleHideInsight = async (insightId, isHidden) => {
    try {
      const response = await hideInsight(insightId);
      console.log(`Hide insight response:`, response);
      toast.success(`Insight ${isHidden ? 'unhidden' : 'hidden'} successfully`, { autoClose: 2000 });
      setReportedInsights(reportedInsights.map(insight => 
        insight._id === insightId ? { ...insight, isHidden: !isHidden } : insight
      ));
    } catch (error) {
      console.error('Error hiding insight:', error);
      toast.error(`Error hiding insight: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleDeleteInsight = async (insightId) => {
    if (!window.confirm('Are you sure you want to delete this insight?')) return;
    try {
      await deleteInsight(insightId);
      toast.success('Insight deleted successfully', { autoClose: 2000 });
      setReportedInsights(reportedInsights.filter(insight => insight._id !== insightId));
    } catch (error) {
      console.error('Error deleting insight:', error);
      toast.error(`Error deleting insight: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleHideComment = async (commentId, isHidden) => {
    try {
      const response = await hideComment(commentId);
      console.log(`Hide comment response:`, response);
      toast.success(`Comment ${isHidden ? 'unhidden' : 'hidden'} successfully`, { autoClose: 2000 });
      setReportedComments(reportedComments.map(comment => 
        comment._id === commentId ? { ...comment, isHidden: !isHidden } : comment
      ));
    } catch (error) {
      console.error('Error hiding comment:', error);
      toast.error(`Error hiding comment: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteComment(commentId);
      toast.success('Comment deleted successfully', { autoClose: 2000 });
      setReportedComments(reportedComments.filter(comment => comment._id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(`Error deleting comment: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleBanUser = async (userId, isBanned, tab) => {
    try {
      const endpoint = isBanned ? 'unban' : 'ban';
      const response = await fetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        toast.success(`User ${isBanned ? 'unbanned' : 'banned'} successfully`, { autoClose: 2000 });
        if (tab === 'insights') {
          const updatedInsights = reportedInsights.map(i => {
            if (i.userId._id === userId) {
              return { ...i, userId: { ...i.userId, isBanned: !isBanned } };
            }
            return i;
          });
          setReportedInsights(updatedInsights);
        } else if (tab === 'comments') {
          const updatedComments = reportedComments.map(c => {
            if (c.userId._id === userId) {
              return { ...c, userId: { ...c.userId, isBanned: !isBanned } };
            }
            return c;
          });
          setReportedComments(updatedComments);
        } else if (tab === 'logs') {
          const updatedHandled = handledReports.map(r => {
            if (r.reportedItemId.userId._id === userId) {
              return { ...r, reportedItemId: { ...r.reportedItemId, userId: { ...r.reportedItemId.userId, isBanned: !isBanned } } };
            }
            return r;
          });
          setHandledReports(updatedHandled);
        }
      } else {
        throw new Error('Failed to update user status');
      }
    } catch (error) {
      console.error('Error banning/unbanning user:', error);
      toast.error(`Error: ${error.message}`, { autoClose: 2000 });
    }
  };

  if (!currentUser || !currentUser.isAdmin) {
    return <div className="container mt-5"><h2>Access Denied</h2><p>You do not have permission to access this page.</p></div>;
  }

  return (
    <div className="container mt-5">
      <h2>Admin Dashboard</h2>
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`} onClick={() => setActiveTab('insights')}>Pending Reported Insights</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>Pending Reported Comments</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>Logs</button>
        </li>
      </ul>

      {isLoading && <div className="alert alert-info mt-3">Loading...</div>}

      {activeTab === 'insights' && (
        <div className="card glossy-card mt-3">
          <div className="card-body">
            <h5 className="card-title">Pending Reported Insights</h5>
            {reportedInsights.length === 0 ? (
              <div className="alert alert-info">No pending reported insights</div>
            ) : (
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>User Reports</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportedInsights.map(insight => (
                    <tr key={insight._id}>
                      <td>
                        <Link to={`/insights/${insight._id}`} className="text-decoration-none">
                          {insight.title.substring(0, 50)}...
                        </Link>
                      </td>
                      <td>{insight.userId?.username || 'N/A'}</td>
                      <td>{insight.isHidden ? 'Hidden' : 'Visible'}</td>
                      <td>{insight.userReportCount || 0}</td>
                      <td>
                        <button
                          className="glossy-button btn-sm btn-warning me-2"
                          onClick={() => handleHideInsight(insight._id, insight.isHidden)}
                        >
                          {insight.isHidden ? 'Unhide' : 'Hide'}
                        </button>
                        <button
                          className="glossy-button btn-sm btn-danger me-2"
                          onClick={() => handleDeleteInsight(insight._id)}
                        >
                          Delete
                        </button>
                        <button 
                          className="glossy-button btn-sm btn-warning"
                          onClick={() => handleBanUser(insight.userId._id, insight.userId.isBanned, 'insights')}
                          disabled={insight.userId.isAdmin || insight.userId.isBanned}
                        >
                          Ban User
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="card glossy-card mt-3">
          <div className="card-body">
            <h5 className="card-title">Pending Reported Comments</h5>
            {reportedComments.length === 0 ? (
              <div className="alert alert-info">No pending reported comments</div>
            ) : (
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Content</th>
                    <th>Author</th>
                    <th>Insight</th>
                    <th>Status</th>
                    <th>User Reports</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportedComments.map(comment => (
                    <tr key={comment._id}>
                      <td>
                        <Link to={`/insights/${comment.insightId}#comment-${comment._id}`} className="text-decoration-none">
                          {comment.text.substring(0, 50)}...
                        </Link>
                      </td>
                      <td>{comment.userId?.username || 'N/A'}</td>
                      <td>
                        <Link to={`/insights/${comment.insightId}`} className="text-decoration-none">
                          Insight
                        </Link>
                      </td>
                      <td>{comment.isHidden ? 'Hidden' : 'Visible'}</td>
                      <td>{comment.userReportCount || 0}</td>
                      <td>
                        <button
                          className="glossy-button btn-sm btn-warning me-2"
                          onClick={() => handleHideComment(comment._id, comment.isHidden)}
                        >
                          {comment.isHidden ? 'Unhide' : 'Hide'}
                        </button>
                        <button
                          className="glossy-button btn-sm btn-danger me-2"
                          onClick={() => handleDeleteComment(comment._id)}
                        >
                          Delete
                        </button>
                        <button 
                          className="glossy-button btn-sm btn-warning"
                          onClick={() => handleBanUser(comment.userId._id, comment.userId.isBanned, 'comments')}
                          disabled={comment.userId.isAdmin || comment.userId.isBanned}
                        >
                          Ban User
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="card glossy-card mt-3">
          <div className="card-body">
            <h5 className="card-title">Logs (Handled Reports)</h5>
            <div className="mb-4">
              <h6>Search Handled Reports</h6>
              <div className="row">
                <div className="col-md-3">
                  <select
                    name="status"
                    value={reportSearch.status}
                    onChange={handleReportSearchChange}
                    className="form-select mb-2"
                  >
                    <option value="">All Statuses</option>
                    <option value="resolved">Resolved</option>
                    <option value="dismissed">Dismissed</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <select
                    name="itemType"
                    value={reportSearch.itemType}
                    onChange={handleReportSearchChange}
                    className="form-select mb-2"
                  >
                    <option value="">All Item Types</option>
                    <option value="Insight">Insight</option>
                    <option value="Comment">Comment</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <input
                    type="text"
                    name="resolvedBy"
                    value={reportSearch.resolvedBy}
                    onChange={handleReportSearchChange}
                    placeholder="Resolved By Admin ID"
                    className="form-control mb-2"
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="date"
                    name="startDate"
                    value={reportSearch.startDate}
                    onChange={handleReportSearchChange}
                    className="form-control mb-2"
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="date"
                    name="endDate"
                    value={reportSearch.endDate}
                    onChange={handleReportSearchChange}
                    className="form-control mb-2"
                  />
                </div>
                <div className="col-md-2">
                  <button
                    className="glossy-button btn-primary"
                    onClick={handleReportSearch}
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
            {handledReports.length === 0 ? (
              <div className="alert alert-info">No handled reports to display</div>
            ) : (
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Report ID</th>
                    <th>Reporter</th>
                    <th>Item Type</th>
                    <th>Item Content</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Resolved By</th>
                    <th>Resolved At</th>
                    <th>User Reports</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {handledReports.map(report => (
                    <tr key={report._id}>
                      <td>{report._id}</td>
                      <td>{report.reporterId?.username || 'N/A'}</td>
                      <td>{report.reportedItemType}</td>
                      <td>
                        <Link to={report.reportedItemType === 'Insight' ? `/insights/${report.reportedItemId._id}` : `/insights/${report.reportedItemId.insightId}#comment-${report.reportedItemId._id}`} className="text-decoration-none">
                          {report.reportedItemType === 'Insight' ? report.reportedItemId.title.substring(0, 50) + '...' : report.reportedItemId.text.substring(0, 50) + '...'}
                        </Link>
                      </td>
                      <td>{report.reason}</td>
                      <td>{report.status}</td>
                      <td>{report.resolvedBy?.username || 'N/A'}</td>
                      <td>{report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : 'N/A'}</td>
                      <td>{report.userReportCount || 0}</td>
                      <td>
                        <button 
                          className="glossy-button btn-sm btn-warning" 
                          onClick={() => handleBanUser(report.reportedItemId.userId._id, report.reportedItemId.userId.isBanned, 'logs')}
                          disabled={report.reportedItemId.userId.isAdmin || report.reportedItemId.userId.isBanned}
                        >
                          Ban User
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;