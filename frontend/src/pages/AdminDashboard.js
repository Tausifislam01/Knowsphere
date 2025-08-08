import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchReports, resolveReport,
  fetchReportedInsights, hideInsight, deleteInsight,
  fetchReportedComments, hideComment, deleteComment
} from '../utils/api';

function AdminDashboard({ currentUser }) {
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState([]);
  const [reportedInsights, setReportedInsights] = useState([]);
  const [reportedComments, setReportedComments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState({
    action: '',
    adminId: '',
    startDate: '',
    endDate: ''
  });

  useEffect(() => {
    if (!currentUser || !currentUser.isAdmin) {
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'reports') {
          const reportData = await fetchReports();
          console.log('Fetched reports:', reportData);
          if (reportData.length === 0) {
            console.log('No pending reports found');
          } else {
            reportData.forEach(report => {
              if (!report.reportedItemId) {
                console.warn(`Report ${report._id} has no reportedItemId`);
              }
            });
            setReports(reportData);
          }
        } else if (activeTab === 'insights') {
          const insightData = await fetchReportedInsights();
          setReportedInsights(insightData);
        } else if (activeTab === 'comments') {
          const commentData = await fetchReportedComments();
          setReportedComments(commentData);
        } else if (activeTab === 'logs') {
          const logData = await fetch('/api/admin/logs', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          }).then(res => res.json());
          setLogs(logData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error(`Error loading ${activeTab}: ${error.message}`, { autoClose: 2000 });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [activeTab, currentUser]);

  const handleLogSearch = async () => {
    try {
      const query = new URLSearchParams();
      if (logSearch.action) query.append('action', logSearch.action);
      if (logSearch.adminId) query.append('adminId', logSearch.adminId);
      if (logSearch.startDate) query.append('startDate', logSearch.startDate);
      if (logSearch.endDate) query.append('endDate', logSearch.endDate);
      
      const logData = await fetch(`/api/admin/logs?${query.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      }).then(res => res.json());
      setLogs(logData);
    } catch (error) {
      console.error('Error searching logs:', error);
      toast.error(`Error searching logs: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleLogSearchChange = (e) => {
    setLogSearch({ ...logSearch, [e.target.name]: e.target.value });
  };

  const addToReportedTab = (report) => {
    if (!report.reportedItemId) {
      console.warn(`Cannot add item to reported tab: report ${report._id} has no reportedItemId`);
      return;
    }
    if (report.reportedItemType === 'Insight') {
      const exists = reportedInsights.findIndex(insight => insight._id === report.reportedItemId._id) !== -1;
      if (!exists) {
        setReportedInsights([...reportedInsights, { ...report.reportedItemId, isHidden: report.reportedItemId.isHidden || false }]);
      }
    } else {
      const exists = reportedComments.findIndex(comment => comment._id === report.reportedItemId._id) !== -1;
      if (!exists) {
        setReportedComments([...reportedComments, { ...report.reportedItemId, isHidden: report.reportedItemId.isHidden || false }]);
      }
    }
  };

  const handleResolveReport = async (reportId, status, report) => {
    try {
      const response = await resolveReport(reportId, status);
      console.log(`Resolve report response:`, response);
      toast.success(`Report ${status} successfully`, { autoClose: 2000 });
      addToReportedTab(report);
      setReports(reports.filter(r => r._id !== reportId));
    } catch (error) {
      console.error(`Error ${status} report:`, error);
      toast.error(`Error ${status} report: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleHideItem = async (report, hide = true) => {
    try {
      if (report.reportedItemType === 'Insight') {
        const response = await hideInsight(report.reportedItemId._id);
        console.log(`Hide insight response:`, response);
        toast.success(`Insight ${hide ? 'hidden' : 'unhidden'} successfully`, { autoClose: 2000 });
        const exists = reportedInsights.findIndex(insight => insight._id === report.reportedItemId._id);
        if (exists === -1) {
          setReportedInsights([...reportedInsights, { ...report.reportedItemId, isHidden: hide }]);
        } else {
          setReportedInsights(reportedInsights.map(insight =>
            insight._id === report.reportedItemId._id ? { ...insight, isHidden: hide } : insight
          ));
        }
      } else {
        const response = await hideComment(report.reportedItemId._id);
        console.log(`Hide comment response:`, response);
        toast.success(`Comment ${hide ? 'hidden' : 'unhidden'} successfully`, { autoClose: 2000 });
        const exists = reportedComments.findIndex(comment => comment._id === report.reportedItemId._id);
        if (exists === -1) {
          setReportedComments([...reportedComments, { ...report.reportedItemId, isHidden: hide }]);
        } else {
          setReportedComments(reportedComments.map(comment =>
            comment._id === report.reportedItemId._id ? { ...comment, isHidden: hide } : comment
          ));
        }
      }
      setReports(reports.filter(r => r._id !== report._id));
    } catch (error) {
      console.error(`Error ${hide ? 'hiding' : 'unhiding'} item:`, error);
      toast.error(`Error ${hide ? 'hiding' : 'unhiding'} ${report.reportedItemType.toLowerCase()}: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleDeleteItem = async (report) => {
    if (!window.confirm(`Are you sure you want to delete this ${report.reportedItemType.toLowerCase()}?`)) return;
    try {
      if (report.reportedItemType === 'Insight') {
        const response = await deleteInsight(report.reportedItemId._id);
        console.log(`Delete insight response:`, response);
        toast.success('Insight deleted successfully', { autoClose: 2000 });
        setReportedInsights(reportedInsights.filter(insight => insight._id !== report.reportedItemId._id));
      } else {
        const response = await deleteComment(report.reportedItemId._id);
        console.log(`Delete comment response:`, response);
        toast.success('Comment deleted successfully', { autoClose: 2000 });
        setReportedComments(reportedComments.filter(comment => comment._id !== report.reportedItemId._id));
      }
      setReports(reports.filter(r => r._id !== report._id));
    } catch (error) {
      console.error(`Error deleting ${report.reportedItemType.toLowerCase()}:`, error);
      toast.error(`Error deleting ${report.reportedItemType.toLowerCase()}: ${error.message}`, { autoClose: 2000 });
    }
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
      console.error(`Error ${isHidden ? 'unhiding' : 'hiding'} insight:`, error);
      toast.error(`Error ${isHidden ? 'unhiding' : 'hiding'} insight: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleDeleteInsight = async (insightId) => {
    if (!window.confirm('Are you sure you want to delete this insight?')) return;
    try {
      const response = await deleteInsight(insightId);
      console.log(`Delete insight response:`, response);
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
      console.error(`Error ${isHidden ? 'unhiding' : 'hiding'} comment:`, error);
      toast.error(`Error ${isHidden ? 'unhiding' : 'hiding'} comment: ${error.message}`, { autoClose: 2000 });
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      const response = await deleteComment(commentId);
      console.log(`Delete comment response:`, response);
      toast.success('Comment deleted successfully', { autoClose: 2000 });
      setReportedComments(reportedComments.filter(comment => comment._id !== commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error(`Error deleting comment: ${error.message}`, { autoClose: 2000 });
    }
  };

  if (!currentUser || !currentUser.isAdmin) {
    return <div className="alert alert-danger">Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Admin Dashboard</h1>
      {isLoading && <div className="alert alert-info">Loading...</div>}
      
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`}
            onClick={() => setActiveTab('insights')}
          >
            Reported Insights
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            Reported Comments
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            Logs
          </button>
        </li>
      </ul>

      {activeTab === 'reports' && (
        <div className="card glossy-card">
          <div className="card-body">
            <h5 className="card-title">Pending Reports</h5>
            {reports.length === 0 ? (
              <div className="alert alert-info">No pending reports to display</div>
            ) : (
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Item</th>
                    <th>Reporter</th>
                    <th>Reason</th>
                    <th>Resolved By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report._id}>
                      <td>{report.reportedItemType}</td>
                      <td>
                        {report.reportedItemType === 'Insight' ? (
                          <Link to={`/insights/${report.reportedItemId?._id}`} className="text-decoration-none">
                            {report.reportedItemId?.title || 'N/A'}
                          </Link>
                        ) : (
                          <Link
                            to={`/insights/${report.reportedItemId?.insightId}?commentId=${report.reportedItemId?._id}`}
                            className="text-decoration-none"
                          >
                            {report.reportedItemId?.text.substring(0, 50) || 'N/A'}...
                          </Link>
                        )}
                      </td>
                      <td>{report.reporterId?.username || 'N/A'}</td>
                      <td>{report.reason}</td>
                      <td>{report.resolvedBy?.username || 'N/A'}</td>
                      <td>
                        <button
                          className="glossy-button btn-sm btn-primary me-1"
                          onClick={() => handleResolveReport(report._id, 'resolved', report)}
                        >
                          Resolve
                        </button>
                        <button
                          className="glossy-button btn-sm btn-secondary me-1"
                          onClick={() => handleResolveReport(report._id, 'dismissed', report)}
                        >
                          Dismiss
                        </button>
                        {report.reportedItemId && report.reportedItemId.isHidden ? (
                          <button
                            className="glossy-button btn-sm btn-success me-1"
                            onClick={() => handleHideItem(report, false)}
                          >
                            Unhide
                          </button>
                        ) : (
                          <button
                            className="glossy-button btn-sm btn-warning me-1"
                            onClick={() => handleHideItem(report, true)}
                          >
                            Hide
                          </button>
                        )}
                        <button
                          className="glossy-button btn-sm btn-danger"
                          onClick={() => handleDeleteItem(report)}
                        >
                          Delete
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

      {activeTab === 'insights' && (
        <div className="card glossy-card">
          <div className="card-body">
            <h5 className="card-title">Reported Insights</h5>
            {reportedInsights.length === 0 ? (
              <div className="alert alert-info">No reported insights to display</div>
            ) : (
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportedInsights.map(insight => (
                    <tr key={insight._id}>
                      <td>
                        <Link to={`/insights/${insight._id}`} className="text-decoration-none">
                          {insight.title}
                        </Link>
                      </td>
                      <td>{insight.userId?.username || 'N/A'}</td>
                      <td>{insight.isHidden ? 'Hidden' : 'Visible'}</td>
                      <td>
                        <button
                          className="glossy-button btn-sm btn-warning me-2"
                          onClick={() => handleHideInsight(insight._id, insight.isHidden)}
                        >
                          {insight.isHidden ? 'Unhide' : 'Hide'}
                        </button>
                        <button
                          className="glossy-button btn-sm btn-danger"
                          onClick={() => handleDeleteInsight(insight._id)}
                        >
                          Delete
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
        <div className="card glossy-card">
          <div className="card-body">
            <h5 className="card-title">Reported Comments</h5>
            {reportedComments.length === 0 ? (
              <div className="alert alert-info">No reported comments to display</div>
            ) : (
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Comment</th>
                    <th>Author</th>
                    <th>Insight</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportedComments.map(comment => (
                    <tr key={comment._id}>
                      <td>
                        <Link
                          to={`/insights/${comment.insightId}?commentId=${comment._id}`}
                          className="text-decoration-none"
                        >
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
                      <td>
                        <button
                          className="glossy-button btn-sm btn-warning me-2"
                          onClick={() => handleHideComment(comment._id, comment.isHidden)}
                        >
                          {comment.isHidden ? 'Unhide' : 'Hide'}
                        </button>
                        <button
                          className="glossy-button btn-sm btn-danger"
                          onClick={() => handleDeleteComment(comment._id)}
                        >
                          Delete
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
        <div className="card glossy-card">
          <div className="card-body">
            <h5 className="card-title">Admin Action Logs</h5>
            <div className="mb-4">
              <h6>Search Logs</h6>
              <div className="row">
                <div className="col-md-3">
                  <select
                    name="action"
                    value={logSearch.action}
                    onChange={handleLogSearchChange}
                    className="form-select mb-2"
                  >
                    <option value="">All Actions</option>
                    <option value="resolve_report">Resolve Report</option>
                    <option value="hide_insight">Hide Insight</option>
                    <option value="unhide_insight">Unhide Insight</option>
                    <option value="delete_insight">Delete Insight</option>
                    <option value="hide_comment">Hide Comment</option>
                    <option value="unhide_comment">Unhide Comment</option>
                    <option value="delete_comment">Delete Comment</option>
                    <option value="ban_user">Ban User</option>
                    <option value="unban_user">Unban User</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <input
                    type="text"
                    name="adminId"
                    value={logSearch.adminId}
                    onChange={handleLogSearchChange}
                    placeholder="Admin ID"
                    className="form-control mb-2"
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="date"
                    name="startDate"
                    value={logSearch.startDate}
                    onChange={handleLogSearchChange}
                    className="form-control mb-2"
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="date"
                    name="endDate"
                    value={logSearch.endDate}
                    onChange={handleLogSearchChange}
                    className="form-control mb-2"
                  />
                </div>
                <div className="col-md-2">
                  <button
                    className="glossy-button btn-primary"
                    onClick={handleLogSearch}
                  >
                    Search
                  </button>
                </div>
              </div>
            </div>
            {logs.length === 0 ? (
              <div className="alert alert-info">No logs to display</div>
            ) : (
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Admin</th>
                    <th>Target ID</th>
                    <th>Target Type</th>
                    <th>Details</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id}>
                      <td>{log.action}</td>
                      <td>{log.adminId?.username || 'N/A'}</td>
                      <td>{log.targetId || 'N/A'}</td>
                      <td>{log.targetType || 'N/A'}</td>
                      <td>{log.details}</td>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
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