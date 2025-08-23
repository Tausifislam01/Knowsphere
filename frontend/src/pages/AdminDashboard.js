import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchReportedInsights, hideInsight, deleteInsight,
  fetchReportedComments, hideComment, deleteComment,
  banUser, unbanUser
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

  const authHeader = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  });

  const dismissReport = async (reportId) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ status: 'dismissed' }),
      });
      if (!res.ok) throw new Error('Failed to dismiss report');
      toast.success('Report dismissed', { autoClose: 2000 });
      if (activeTab === 'insights') {
        const data = await fetchReportedInsights();
        setReportedInsights(data);
      } else if (activeTab === 'comments') {
        const data = await fetchReportedComments();
        setReportedComments(data);
      } else {
        loadHandledReports();
      }
    } catch (e) {
      console.error('Dismiss report error:', e);
      toast.error('Failed to dismiss report', { autoClose: 2000 });
    }
  };

  const loadHandledReports = async () => {
    const query = new URLSearchParams();
    if (reportSearch.status) query.append('status', reportSearch.status);
    if (reportSearch.resolvedBy) query.append('resolvedBy', reportSearch.resolvedBy);
    if (reportSearch.startDate) query.append('startDate', reportSearch.startDate);
    if (reportSearch.endDate) query.append('endDate', reportSearch.endDate);
    if (reportSearch.itemType) query.append('itemType', reportSearch.itemType);
    const response = await fetch(`/api/admin/handled-reports?${query.toString()}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    });
    const data = await response.json();
    setHandledReports(data);
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'insights') {
          const insightReports = await fetchReportedInsights();
          const insightsWithReportCount = await Promise.all(insightReports.map(async (report) => {
            const userId =
              report?.reportedItemId?.userId?._id ||
              report?.contentSnapshot?.authorId;
            if (userId) {
              try {
                const res = await fetch(`/api/admin/user-report-count/${userId}`, {
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                });
                const { count } = await res.json();
                return { ...report, userReportCount: count };
              } catch (error) {
                console.error(`Failed to fetch report count for user ${userId}:`, error);
                return { ...report, userReportCount: 0 };
              }
            }
            return { ...report, userReportCount: 0 };
          }));
          setReportedInsights(insightsWithReportCount);
        } else if (activeTab === 'comments') {
          const commentReports = await fetchReportedComments();
          const commentsWithReportCount = await Promise.all(commentReports.map(async (report) => {
            const userId =
              report?.reportedItemId?.userId?._id ||
              report?.contentSnapshot?.authorId;
            if (userId) {
              try {
                const res = await fetch(`/api/admin/user-report-count/${userId}`, {
                  headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                });
                const { count } = await res.json();
                return { ...report, userReportCount: count };
              } catch (error) {
                console.error(`Failed to fetch report count for user ${userId}:`, error);
                return { ...report, userReportCount: 0 };
              }
            }
            return { ...report, userReportCount: 0 };
          }));
          setReportedComments(commentsWithReportCount);
        } else if (activeTab === 'logs') {
          await loadHandledReports();
        }
      } catch (error) {
        console.error('Load data error:', error);
        toast.error('Failed to load data', { autoClose: 2000 });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, reportSearch]);

  const handleBanUser = async (userId, isBanned, tab) => {
    if (!userId) {
      toast.error('Invalid user ID', { autoClose: 2000 });
      return;
    }
    try {
      if (isBanned) {
        await unbanUser(userId);
        toast.success('User unbanned successfully', { autoClose: 2000 });
      } else {
        await banUser(userId);
        toast.success('User banned successfully', { autoClose: 2000 });
      }
      if (tab === 'insights') {
        const insightData = await fetchReportedInsights();
        setReportedInsights(insightData);
      } else if (tab === 'comments') {
        const commentData = await fetchReportedComments();
        setReportedComments(commentData);
      } else if (tab === 'logs') {
        await loadHandledReports();
      }
    } catch (error) {
      console.error('Ban/unban error:', error);
      toast.error(`Failed to ${isBanned ? 'unban' : 'ban'} user`, { autoClose: 2000 });
    }
  };

  const TitleCell = ({ report }) => {
    const title =
      report?.reportedItemId?.title ??
      report?.contentSnapshot?.title ??
      '(deleted)';
    const insightId =
      report?.reportedItemId?._id || report?.contentSnapshot?.insightId;

    return (
      <Link
        to={insightId ? `/insights/${insightId}` : '#'}
        className="text-decoration-none"
      >
        {title?.length > 50 ? `${title.slice(0, 50)}...` : title}
      </Link>
    );
  };

  const CommentCell = ({ report }) => {
    const text =
      report?.reportedItemId?.text ??
      report?.contentSnapshot?.text ??
      '(deleted)';
    const insightId =
      report?.reportedItemId?.insightId ||
      report?.contentSnapshot?.insightId;
    const commentId =
      report?.reportedItemId?._id || report?.contentSnapshot?.commentId;

    return (
      <Link
        to={insightId ? `/insights/${insightId}#comment-${commentId}` : '#'}
        className="text-decoration-none"
      >
        {text?.length > 50 ? `${text.slice(0, 50)}...` : text}
      </Link>
    );
  };

  return (
    <div className="container py-4">
      {!currentUser?.isAdmin ? (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>Access denied: Admin privileges required</div>
        </div>
      ) : (
        <>
          <h2>Admin Dashboard</h2>
          <ul className="nav nav-tabs mb-4">
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
                Handled Reports
              </button>
            </li>
          </ul>

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div>
              {activeTab === 'insights' && (
                <div>
                  {reportedInsights.length === 0 ? (
                    <div className="alert alert-info">No reported insights to display</div>
                  ) : (
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Insight ID</th>
                          <th>Title</th>
                          <th>Author</th>
                          <th>Reason</th>
                          <th>Reporter</th>
                          <th>User Reports</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportedInsights.map(report => {
                          const authorName =
                            report?.reportedItemId?.userId?.username ||
                            report?.contentSnapshot?.authorUsername ||
                            'Unknown';
                          const authorId =
                            report?.reportedItemId?.userId?._id ||
                            report?.contentSnapshot?.authorId;

                          return (
                            <tr key={report._id}>
                              <td>{(report.reportedItemId?._id || report?.contentSnapshot?.insightId) ?? 'N/A'}</td>
                              <td><TitleCell report={report} /></td>
                              <td>{authorName}</td>
                              <td>{report.reason || 'No reason provided'}</td>
                              <td>
                                {report.reporterId?._id ? (
                                  <Link to={`/profile/${report.reporterId._id}`} className="text-decoration-none">
                                    {report.reporterId?.username || 'Unknown'}
                                  </Link>
                                ) : (
                                  'Unknown'
                                )}
                              </td>
                              <td>{report.userReportCount || 0}</td>
                              <td>
                                <button
                                  className="glossy-button btn-sm btn-secondary me-2"
                                  onClick={() => dismissReport(report._id)}
                                >
                                  Dismiss Report
                                </button>
                                <button
                                  className="glossy-button btn-sm btn-warning me-2"
                                  onClick={() =>
                                    report.reportedItemId &&
                                    hideInsight(report.reportedItemId._id).then(async () => {
                                      toast.success('Insight hidden', { autoClose: 2000 });
                                      const data = await fetchReportedInsights();
                                      setReportedInsights(data);
                                    })
                                  }
                                  disabled={!report.reportedItemId || report.reportedItemId?.isHidden}
                                >
                                  Hide
                                </button>
                                <button
                                  className="glossy-button btn-sm btn-danger me-2"
                                  onClick={() =>
                                    report.reportedItemId &&
                                    deleteInsight(report.reportedItemId._id).then(async () => {
                                      toast.success('Insight deleted', { autoClose: 2000 });
                                      const data = await fetchReportedInsights();
                                      setReportedInsights(data);
                                    })
                                  }
                                  disabled={!report.reportedItemId}
                                >
                                  Delete
                                </button>
                                <button
                                  className="glossy-button btn-sm btn-warning"
                                  onClick={() =>
                                    handleBanUser(
                                      authorId,
                                      report.reportedItemId?.userId?.isBanned,
                                      'insights'
                                    )
                                  }
                                  disabled={!authorId || report.reportedItemId?.userId?.isAdmin}
                                >
                                  Ban User
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'comments' && (
                <div>
                  {reportedComments.length === 0 ? (
                    <div className="alert alert-info">No reported comments to display</div>
                  ) : (
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Comment ID</th>
                          <th>Content</th>
                          <th>Author</th>
                          <th>Reason</th>
                          <th>Reporter</th>
                          <th>User Reports</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportedComments.map(report => {
                          const authorName =
                            report?.reportedItemId?.userId?.username ||
                            report?.contentSnapshot?.authorUsername ||
                            'Unknown';
                          const authorId =
                            report?.reportedItemId?.userId?._id ||
                            report?.contentSnapshot?.authorId;

                          return (
                            <tr key={report._id}>
                              <td>{(report.reportedItemId?._id || report?.contentSnapshot?.commentId) ?? 'N/A'}</td>
                              <td><CommentCell report={report} /></td>
                              <td>{authorName}</td>
                              <td>{report.reason || 'No reason provided'}</td>
                              <td>
                                {report.reporterId?._id ? (
                                  <Link to={`/profile/${report.reporterId._id}`} className="text-decoration-none">
                                    {report.reporterId?.username || 'Unknown'}
                                  </Link>
                                ) : (
                                  'Unknown'
                                )}
                              </td>
                              <td>{report.userReportCount || 0}</td>
                              <td>
                                <button
                                  className="glossy-button btn-sm btn-secondary me-2"
                                  onClick={() => dismissReport(report._id)}
                                >
                                  Dismiss Report
                                </button>
                                <button
                                  className="glossy-button btn-sm btn-warning me-2"
                                  onClick={() =>
                                    report.reportedItemId &&
                                    hideComment(report.reportedItemId._id).then(async () => {
                                      toast.success('Comment hidden', { autoClose: 2000 });
                                      const data = await fetchReportedComments();
                                      setReportedComments(data);
                                    })
                                  }
                                  disabled={!report.reportedItemId || report.reportedItemId?.isHidden}
                                >
                                  Hide
                                </button>
                                <button
                                  className="glossy-button btn-sm btn-danger me-2"
                                  onClick={() =>
                                    report.reportedItemId &&
                                    deleteComment(report.reportedItemId._id).then(async () => {
                                      toast.success('Comment deleted', { autoClose: 2000 });
                                      const data = await fetchReportedComments();
                                      setReportedComments(data);
                                    })
                                  }
                                  disabled={!report.reportedItemId}
                                >
                                  Delete
                                </button>
                                <button
                                  className="glossy-button btn-sm btn-warning"
                                  onClick={() =>
                                    handleBanUser(
                                      authorId,
                                      report.reportedItemId?.userId?.isBanned,
                                      'comments'
                                    )
                                  }
                                  disabled={!authorId || report.reportedItemId?.userId?.isAdmin}
                                >
                                  Ban User
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div>
                  <form className="mb-4">
                    <div className="row g-3">
                      <div className="col-md-3">
                        <select
                          className="form-select"
                          value={reportSearch.status}
                          onChange={(e) => setReportSearch({ ...reportSearch, status: e.target.value })}
                        >
                          <option value="">All Statuses</option>
                          <option value="resolved">Resolved</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Resolved By (User ID)"
                          value={reportSearch.resolvedBy}
                          onChange={(e) => setReportSearch({ ...reportSearch, resolvedBy: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <input
                          type="date"
                          className="form-control"
                          value={reportSearch.startDate}
                          onChange={(e) => setReportSearch({ ...reportSearch, startDate: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <input
                          type="date"
                          className="form-control"
                          value={reportSearch.endDate}
                          onChange={(e) => setReportSearch({ ...reportSearch, endDate: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <select
                          className="form-select"
                          value={reportSearch.itemType}
                          onChange={(e) => setReportSearch({ ...reportSearch, itemType: e.target.value })}
                        >
                          <option value="">All Types</option>
                          <option value="Insight">Insight</option>
                          <option value="Comment">Comment</option>
                        </select>
                      </div>
                    </div>
                  </form>

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
                        {handledReports.map(report => {
                          const isInsight = report.reportedItemType === 'Insight';
                          const exists = !!report?.reportedItemId;

                          const authorId =
                            report?.reportedItemId?.userId?._id ||
                            report?.contentSnapshot?.authorId;

                          const contentPreview = isInsight
                            ? (report?.reportedItemId?.title ??
                               report?.contentSnapshot?.title ??
                               '(deleted)')
                            : (report?.reportedItemId?.text ??
                               report?.contentSnapshot?.text ??
                               '(deleted)');

                          const linkHref = isInsight
                            ? (report?.reportedItemId?._id || report?.contentSnapshot?.insightId
                                ? `/insights/${report?.reportedItemId?._id || report?.contentSnapshot?.insightId}`
                                : '#')
                            : (() => {
                                const insightId =
                                  report?.reportedItemId?.insightId || report?.contentSnapshot?.insightId;
                                const commentId =
                                  report?.reportedItemId?._id || report?.contentSnapshot?.commentId;
                                return insightId ? `/insights/${insightId}#comment-${commentId}` : '#';
                              })();

                          return (
                            <tr key={report._id}>
                              <td>{report._id}</td>
                              <td>
                                {report.reporterId?._id ? (
                                  <Link to={`/profile/${report.reporterId._id}`} className="text-decoration-none">
                                    {report.reporterId?.username || 'N/A'}
                                  </Link>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td>{report.reportedItemType}</td>
                              <td>
                                <Link to={linkHref} className="text-decoration-none">
                                  {contentPreview?.length > 50
                                    ? `${contentPreview.slice(0, 50)}...`
                                    : contentPreview}
                                </Link>
                                {!exists && <span className="badge bg-secondary ms-2">deleted</span>}
                              </td>
                              <td>{report.reason}</td>
                              <td>{report.status}</td>
                              <td>{report.resolvedBy?.username || 'N/A'}</td>
                              <td>{report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : 'N/A'}</td>
                              <td>{report.userReportCount || 0}</td>
                              <td>
                                <button
                                  className="glossy-button btn-sm btn-warning"
                                  onClick={() =>
                                    handleBanUser(
                                      authorId,
                                      report.reportedItemId?.userId?.isBanned,
                                      'logs'
                                    )
                                  }
                                  disabled={!authorId || report.reportedItemId?.userId?.isAdmin}
                                >
                                  Ban User
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;