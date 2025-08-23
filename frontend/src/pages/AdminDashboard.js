import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchReportedInsights, hideInsight, deleteInsight,
  fetchReportedComments, hideComment, deleteComment,
  banUserAdvanced, resolveReportWithNote, unbanUser
} from '../utils/api';

function AdminDashboard({ currentUser }) {
  const navigate = useNavigate();

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

  // Resolve with note modal
  const [resolveModal, setResolveModal] = useState({
    open: false, reportId: null, status: 'resolved', resolutionNote: ''
  });

  // Manage Ban modal
  const [banModal, setBanModal] = useState({
    open: false, userId: null, isBanned: false, durationDays: 7, reason: '', incrementStrike: true
  });

  // Prevent double clicks while a hide/unhide is in flight
  const [busy, setBusy] = useState({}); // keys like `ins:<id>` or `com:<id>`

  /** ----------------- Auth helpers ----------------- */
  const token = () => localStorage.getItem('token');

  const ensureAuthOrRedirect = () => {
    if (!token()) {
      toast.error('Session expired. Please log in again.', { autoClose: 2000 });
      navigate('/login');
      return false;
    }
    return true;
  };

  const authHeader = () => ({
    'Authorization': `Bearer ${token()}`,
    'Content-Type': 'application/json',
  });

  const handleUnauthorized = (res) => {
    if (res?.status === 401) {
      toast.error('Session expired. Please log in again.', { autoClose: 2000 });
      navigate('/login');
      return true;
    }
    return false;
  };

  /** ----------------- Report actions (with confirm) ----------------- */
  const dismissReport = async (reportId) => {
    if (!ensureAuthOrRedirect()) return;
    if (!window.confirm('Dismiss this report as invalid?')) return;

    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: authHeader(),
        body: JSON.stringify({ status: 'dismissed' }),
      });
      if (handleUnauthorized(res)) return;
      if (!res.ok) throw new Error('Failed to dismiss report');
      toast.success('Report dismissed', { autoClose: 2000 });
      await refreshActiveTab();
    } catch (e) {
      console.error('Dismiss report error:', e);
      toast.error('Failed to dismiss report', { autoClose: 2000 });
    }
  };

  const openResolveModal = (reportId, status = 'resolved') => {
    setResolveModal({ open: true, reportId, status, resolutionNote: '' });
  };

  const submitResolveWithNote = async () => {
    if (!ensureAuthOrRedirect()) return;

    const label = resolveModal.status === 'resolved' ? 'Resolve this report as valid?' : 'Mark this report as dismissed?';
    if (!window.confirm(label)) return;

    try {
      await resolveReportWithNote(resolveModal.reportId, resolveModal.status, resolveModal.resolutionNote);
      toast.success(`Report ${resolveModal.status}`, { autoClose: 2000 });
      setResolveModal({ open: false, reportId: null, status: 'resolved', resolutionNote: '' });
      await refreshActiveTab();
    } catch (e) {
      if (!token()) return navigate('/login');
      toast.error('Failed to update report', { autoClose: 2000 });
    }
  };

  /** ----------------- Data loaders ----------------- */
  const loadHandledReports = async () => {
    if (!ensureAuthOrRedirect()) return;
    const query = new URLSearchParams();
    if (reportSearch.status) query.append('status', reportSearch.status);
    if (reportSearch.resolvedBy) query.append('resolvedBy', reportSearch.resolvedBy);
    if (reportSearch.startDate) query.append('startDate', reportSearch.startDate);
    if (reportSearch.endDate) query.append('endDate', reportSearch.endDate);
    if (reportSearch.itemType) query.append('itemType', reportSearch.itemType);
    const res = await fetch(`/api/admin/handled-reports?${query.toString()}`, {
      headers: { 'Authorization': `Bearer ${token()}` },
    });
    if (handleUnauthorized(res)) return;
    const data = await res.json();
    setHandledReports(data);
  };

  const attachUserReportCounts = async (items) => {
    return Promise.all(
      items.map(async (report) => {
        const userId =
          report?.reportedItemId?.userId?._id ||
          report?.contentSnapshot?.authorId;
        if (!userId) return { ...report, userReportCount: 0 };
        try {
          const res = await fetch(`/api/admin/user-report-count/${userId}`, {
            headers: { 'Authorization': `Bearer ${token()}` },
          });
          if (handleUnauthorized(res)) return { ...report, userReportCount: 0 };
          const { count } = await res.json();
          return { ...report, userReportCount: count };
        } catch {
          return { ...report, userReportCount: 0 };
        }
      })
    );
  };

  const refreshActiveTab = async () => {
    if (!ensureAuthOrRedirect()) return;

    try {
      if (activeTab === 'insights') {
        const insightReports = await fetchReportedInsights();
        const withCounts = await attachUserReportCounts(insightReports);
        setReportedInsights(withCounts);
      } else if (activeTab === 'comments') {
        const commentReports = await fetchReportedComments();
        const withCounts = await attachUserReportCounts(commentReports);
        setReportedComments(withCounts);
      } else if (activeTab === 'logs') {
        await loadHandledReports();
      }
    } catch (e) {
      if (!token()) return navigate('/login');
      toast.error('Failed to load data', { autoClose: 2000 });
    }
  };

  useEffect(() => {
    if (!ensureAuthOrRedirect()) return;
    (async () => {
      setIsLoading(true);
      try {
        await refreshActiveTab();
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, reportSearch]);

  /** ----------------- Hide/Unhide (buttons + confirm) ----------------- */
  const clickHideInsight = async (insightId, isHidden) => {
    if (!ensureAuthOrRedirect()) return;
    const key = `ins:${insightId}`;
    const actionLabel = isHidden ? 'unhide' : 'hide';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this insight?`)) return;

    setBusy((s) => ({ ...s, [key]: true }));
    try {
      await hideInsight(insightId); // server flips isHidden & logs action
      toast.success(`Insight ${isHidden ? 'unhidden' : 'hidden'}`, { autoClose: 1500 });
      await refreshActiveTab();
    } catch (e) {
      if (!token()) return navigate('/login');
      toast.error('Failed to change visibility', { autoClose: 2000 });
    } finally {
      setBusy((s) => ({ ...s, [key]: false }));
    }
  };

  const clickHideComment = async (commentId, isHidden) => {
    if (!ensureAuthOrRedirect()) return;
    const key = `com:${commentId}`;
    const actionLabel = isHidden ? 'unhide' : 'hide';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this comment?`)) return;

    setBusy((s) => ({ ...s, [key]: true }));
    try {
      await hideComment(commentId); // server flips isHidden & logs action
      toast.success(`Comment ${isHidden ? 'unhidden' : 'hidden'}`, { autoClose: 1500 });
      await refreshActiveTab();
    } catch (e) {
      if (!token()) return navigate('/login');
      toast.error('Failed to change visibility', { autoClose: 2000 });
    } finally {
      setBusy((s) => ({ ...s, [key]: false }));
    }
  };

  /** ----------------- Delete (confirm) ----------------- */
  const clickDeleteInsight = async (insightId) => {
    if (!ensureAuthOrRedirect()) return;
    if (!window.confirm('Delete this insight permanently? This cannot be undone.')) return;

    try {
      await deleteInsight(insightId);
      toast.success('Insight deleted', { autoClose: 2000 });
      await refreshActiveTab();
    } catch (e) {
      if (!token()) return navigate('/login');
      toast.error('Failed to delete insight', { autoClose: 2000 });
    }
  };

  const clickDeleteComment = async (commentId) => {
    if (!ensureAuthOrRedirect()) return;
    if (!window.confirm('Delete this comment permanently? This cannot be undone.')) return;

    try {
      await deleteComment(commentId);
      toast.success('Comment deleted', { autoClose: 2000 });
      await refreshActiveTab();
    } catch (e) {
      if (!token()) return navigate('/login');
      toast.error('Failed to delete comment', { autoClose: 2000 });
    }
  };

  /** ----------------- Ban flow ----------------- */
  const openBanModal = (userId, isBanned = false) => {
    if (!ensureAuthOrRedirect()) return;
    setBanModal({ open: true, userId, isBanned, durationDays: 7, reason: '', incrementStrike: true });
  };

  const submitBan = async () => {
    if (!ensureAuthOrRedirect()) return;
    const { userId, durationDays, reason, incrementStrike } = banModal;
    try {
      await banUserAdvanced(userId, {
        durationDays: Number(durationDays || 0),
        reason,
        incrementStrike
      });
      toast.success(
        `User banned ${Number(durationDays) > 0 ? `for ${durationDays} day(s)` : 'permanently'}`,
        { autoClose: 2000 }
      );
      setBanModal({ open: false, userId: null, isBanned: false, durationDays: 7, reason: '', incrementStrike: true });
      await refreshActiveTab();
    } catch (e) {
      if (!token()) return navigate('/login');
      toast.error('Failed to ban user', { autoClose: 2000 });
    }
  };

  const submitUnban = async () => {
    if (!ensureAuthOrRedirect()) return;
    try {
      await unbanUser(banModal.userId);
      toast.success('User unbanned', { autoClose: 2000 });
      setBanModal({ open: false, userId: null, isBanned: false, durationDays: 7, reason: '', incrementStrike: true });
      await refreshActiveTab();
    } catch (e) {
      if (!token()) return navigate('/login');
      toast.error('Failed to unban user', { autoClose: 2000 });
    }
  };

  /** ----------------- Small UI helpers ----------------- */
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
        {typeof title === 'string' && title.length > 64 ? `${title.slice(0, 64)}…` : title}
      </Link>
    );
  };

  const CommentCell = ({ report }) => {
    const text =
      report?.reportedItemId?.text ??
      report?.contentSnapshot?.text ??
      '(deleted)';
    const insightId =
      report?.reportedItemId?.insightId || report?.contentSnapshot?.insightId;
    const commentId =
      report?.reportedItemId?._id || report?.contentSnapshot?.commentId;

    return (
      <Link
        to={insightId ? `/insights/${insightId}#comment-${commentId}` : '#'}
        className="text-decoration-none"
        title={typeof text === 'string' ? text : ''}
      >
        {typeof text === 'string' && text.length > 64 ? `${text.slice(0, 64)}…` : text}
      </Link>
    );
  };

  const ActionButtons = ({ children }) => (
    <div className="admin-actions d-flex flex-wrap gap-2">{children}</div>
  );

  const EmptyState = ({ message }) => (
    <div className="text-center py-5">
      <i className="bi bi-inboxes text-muted" style={{ fontSize: '3rem' }} />
      <p className="text-muted mt-3 mb-0">{message}</p>
    </div>
  );

  const BanButton = ({ userId, isAdmin, isBanned }) => {
    if (!userId || isAdmin) return null;
    return (
      <button
        className={`btn btn-sm ${isBanned ? 'btn-outline-danger' : 'btn-outline-warning'}`}
        onClick={() => openBanModal(userId, isBanned)}
        title="Open ban management"
      >
        Manage Ban…
      </button>
    );
  };

  /** --------------- Render --------------- */
  return (
    <div className="container py-4">
      {!currentUser?.isAdmin ? (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>Access denied: Admin privileges required</div>
        </div>
      ) : (
        <>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h2 className="mb-0">Admin Dashboard</h2>
            <span className="badge bg-secondary-subtle text-dark border rounded-pill px-3 py-2">
              {activeTab === 'insights' && 'Reported Insights'}
              {activeTab === 'comments' && 'Reported Comments'}
              {activeTab === 'logs' && 'Handled Reports'}
            </span>
          </div>

          <ul className="nav nav-tabs mb-3">
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'insights' ? 'active' : ''}`}
                onClick={() => setActiveTab('insights')}
              >
                Insights
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveTab('comments')}
              >
                Comments
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${activeTab === 'logs' ? 'active' : ''}`}
                onClick={() => setActiveTab('logs')}
              >
                Handled
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
              {/* ---------------- Insights Tab ---------------- */}
              {activeTab === 'insights' && (
                <div className="table-responsive">
                  {reportedInsights.length === 0 ? (
                    <EmptyState message="No reported insights to display" />
                  ) : (
                    <table className="table table-sm align-middle">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ minWidth: 120 }}>Insight ID</th>
                          <th style={{ minWidth: 240 }}>Title</th>
                          <th style={{ minWidth: 160 }}>Author</th>
                          <th style={{ minWidth: 200 }}>Reason</th>
                          <th style={{ minWidth: 160 }}>Reporter</th>
                          <th style={{ minWidth: 120 }}>User Reports</th>
                          <th style={{ minWidth: 420 }}>Actions</th>
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
                          const isAdmin = report?.reportedItemId?.userId?.isAdmin;
                          const isHidden = !!report?.reportedItemId?.isHidden;
                          const isBanned = !!report?.reportedItemId?.userId?.isBanned;
                          const insightId = report?.reportedItemId?._id;

                          return (
                            <tr key={report._id}>
                              <td className="text-truncate" title={insightId || report?.contentSnapshot?.insightId || 'N/A'}>
                                {insightId ?? report?.contentSnapshot?.insightId ?? 'N/A'}
                              </td>
                              <td><TitleCell report={report} /></td>
                              <td>{authorName}</td>
                              <td className="text-truncate" style={{ maxWidth: 260 }} title={report.reason || 'No reason provided'}>
                                {report.reason || 'No reason provided'}
                              </td>
                              <td>
                                {report.reporterId?._id ? (
                                  <Link to={`/profile/${report.reporterId._id}`} className="text-decoration-none">
                                    {report.reporterId?.username || 'Unknown'}
                                  </Link>
                                ) : (
                                  'Unknown'
                                )}
                              </td>
                              <td>
                                <span className="badge bg-secondary-subtle text-dark border">
                                  {report.userReportCount || 0}
                                </span>
                              </td>
                              <td>
                                <ActionButtons>
                                  {/* Dismiss / Resolve (confirm on action) */}
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => dismissReport(report._id)}
                                    title="Dismiss report"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => openResolveModal(report._id, 'resolved')}
                                    title="Resolve with note"
                                  >
                                    Resolve
                                  </button>

                                  {/* Hide / Unhide (button + confirm) */}
                                  {insightId && (
                                    <button
                                      className={`btn btn-sm ${isHidden ? 'btn-primary' : 'btn-warning'}`}
                                      onClick={() => clickHideInsight(insightId, isHidden)}
                                      disabled={!!busy[`ins:${insightId}`]}
                                      title={isHidden ? 'Unhide insight' : 'Hide insight'}
                                    >
                                      {isHidden ? 'Unhide' : 'Hide'}
                                    </button>
                                  )}

                                  {/* Delete (confirm) */}
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => insightId && clickDeleteInsight(insightId)}
                                    disabled={!insightId}
                                    title="Delete insight"
                                  >
                                    Delete
                                  </button>

                                  {/* Manage Ban… (opens modal) */}
                                  <BanButton
                                    userId={authorId}
                                    isAdmin={isAdmin}
                                    isBanned={isBanned}
                                  />
                                </ActionButtons>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ---------------- Comments Tab ---------------- */}
              {activeTab === 'comments' && (
                <div className="table-responsive">
                  {reportedComments.length === 0 ? (
                    <EmptyState message="No reported comments to display" />
                  ) : (
                    <table className="table table-sm align-middle">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ minWidth: 120 }}>Comment ID</th>
                          <th style={{ minWidth: 240 }}>Content</th>
                          <th style={{ minWidth: 160 }}>Author</th>
                          <th style={{ minWidth: 200 }}>Reason</th>
                          <th style={{ minWidth: 160 }}>Reporter</th>
                          <th style={{ minWidth: 120 }}>User Reports</th>
                          <th style={{ minWidth: 420 }}>Actions</th>
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
                          const isAdmin = report?.reportedItemId?.userId?.isAdmin;
                          const isBanned = !!report?.reportedItemId?.userId?.isBanned;
                          const commentId = report?.reportedItemId?._id ?? report?.contentSnapshot?.commentId;
                          const isHidden = !!report?.reportedItemId?.isHidden;

                          return (
                            <tr key={report._id}>
                              <td className="text-truncate" title={commentId || 'N/A'}>
                                {commentId ?? 'N/A'}
                              </td>
                              <td><CommentCell report={report} /></td>
                              <td>{authorName}</td>
                              <td className="text-truncate" style={{ maxWidth: 260 }} title={report.reason || 'No reason provided'}>
                                {report.reason || 'No reason provided'}
                              </td>
                              <td>
                                {report.reporterId?._id ? (
                                  <Link to={`/profile/${report.reporterId._id}`} className="text-decoration-none">
                                    {report.reporterId?.username || 'Unknown'}
                                  </Link>
                                ) : (
                                  'Unknown'
                                )}
                              </td>
                              <td>
                                <span className="badge bg-secondary-subtle text-dark border">
                                  {report.userReportCount || 0}
                                </span>
                              </td>
                              <td>
                                <ActionButtons>
                                  {/* Dismiss / Resolve */}
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => dismissReport(report._id)}
                                    title="Dismiss report"
                                  >
                                    Dismiss
                                  </button>
                                  <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => openResolveModal(report._id, 'resolved')}
                                    title="Resolve with note"
                                  >
                                    Resolve
                                  </button>

                                  {/* Hide / Unhide (button + confirm) */}
                                  {report?.reportedItemId?._id && (
                                    <button
                                      className={`btn btn-sm ${isHidden ? 'btn-primary' : 'btn-warning'}`}
                                      onClick={() => clickHideComment(report.reportedItemId._id, isHidden)}
                                      disabled={!!busy[`com:${report.reportedItemId._id}`]}
                                      title={isHidden ? 'Unhide comment' : 'Hide comment'}
                                    >
                                      {isHidden ? 'Unhide' : 'Hide'}
                                    </button>
                                  )}

                                  {/* Delete (confirm) */}
                                  <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => report?.reportedItemId?._id && clickDeleteComment(report.reportedItemId._id)}
                                    disabled={!report?.reportedItemId?._id}
                                    title="Delete comment"
                                  >
                                    Delete
                                  </button>

                                  {/* Manage Ban… (opens modal) */}
                                  <BanButton
                                    userId={authorId}
                                    isAdmin={isAdmin}
                                    isBanned={isBanned}
                                  />
                                </ActionButtons>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* ---------------- Logs Tab ---------------- */}
              {activeTab === 'logs' && (
                <div>
                  <form className="mb-3">
                    <div className="row g-3">
                      <div className="col-md-3">
                        <label className="form-label small text-muted">Status</label>
                        <select
                          className="form-select form-select-sm"
                          value={reportSearch.status}
                          onChange={(e) => setReportSearch({ ...reportSearch, status: e.target.value })}
                        >
                          <option value="">All</option>
                          <option value="resolved">Resolved</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <label className="form-label small text-muted">Resolved By (User ID)</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          value={reportSearch.resolvedBy}
                          onChange={(e) => setReportSearch({ ...reportSearch, resolvedBy: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small text-muted">Start</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={reportSearch.startDate}
                          onChange={(e) => setReportSearch({ ...reportSearch, startDate: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small text-muted">End</label>
                        <input
                          type="date"
                          className="form-control form-control-sm"
                          value={reportSearch.endDate}
                          onChange={(e) => setReportSearch({ ...reportSearch, endDate: e.target.value })}
                        />
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small text-muted">Type</label>
                        <select
                          className="form-select form-select-sm"
                          value={reportSearch.itemType}
                          onChange={(e) => setReportSearch({ ...reportSearch, itemType: e.target.value })}
                        >
                          <option value="">All</option>
                          <option value="Insight">Insight</option>
                          <option value="Comment">Comment</option>
                        </select>
                      </div>
                    </div>
                  </form>

                  <div className="table-responsive">
                    {handledReports.length === 0 ? (
                      <EmptyState message="No handled reports to display" />
                    ) : (
                      <table className="table table-sm align-middle">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th style={{ minWidth: 120 }}>Report ID</th>
                            <th style={{ minWidth: 160 }}>Reporter</th>
                            <th style={{ minWidth: 100 }}>Type</th>
                            <th style={{ minWidth: 240 }}>Item</th>
                            <th style={{ minWidth: 200 }}>Reason</th>
                            <th style={{ minWidth: 120 }}>Status</th>
                            <th style={{ minWidth: 160 }}>Resolved By</th>
                            <th style={{ minWidth: 160 }}>Resolved At</th>
                            <th style={{ minWidth: 120 }}>User Reports</th>
                            <th style={{ minWidth: 160 }}>Actions</th>
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
                                <td className="text-truncate" title={report._id}>{report._id}</td>
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
                                    {typeof contentPreview === 'string' && contentPreview.length > 64
                                      ? `${contentPreview.slice(0, 64)}…`
                                      : contentPreview}
                                  </Link>
                                  {!exists && <span className="badge bg-secondary ms-2">deleted</span>}
                                </td>
                                <td className="text-truncate" style={{ maxWidth: 260 }} title={report.reason}>
                                  {report.reason}
                                </td>
                                <td>
                                  <span className={`badge ${report.status === 'resolved' ? 'bg-success' : 'bg-secondary'}`}>
                                    {report.status}
                                  </span>
                                  {report.resolutionNote && (
                                    <div className="small text-muted mt-1" title={report.resolutionNote}>
                                      Note: {report.resolutionNote.length > 64 ? `${report.resolutionNote.slice(0,64)}…` : report.resolutionNote}
                                    </div>
                                  )}
                                </td>
                                <td>{report.resolvedBy?.username || 'N/A'}</td>
                                <td>{report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : 'N/A'}</td>
                                <td>
                                  <span className="badge bg-secondary-subtle text-dark border">
                                    {report.userReportCount || 0}
                                  </span>
                                </td>
                                <td>
                                  <BanButton
                                    userId={authorId}
                                    isAdmin={report?.reportedItemId?.userId?.isAdmin}
                                    isBanned={report?.reportedItemId?.userId?.isBanned}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Resolve Modal */}
          {resolveModal.open && (
            <div
              className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
              onClick={() => setResolveModal({ open: false, reportId: null, status: 'resolved', resolutionNote: '' })}
            >
              <div className="card glossy-card p-3" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
                <div className="card-header d-flex align-items-center justify-content-between">
                  <strong>Resolve Report</strong>
                  <button className="btn-close" onClick={() => setResolveModal({ open: false, reportId: null, status: 'resolved', resolutionNote: '' })}></button>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={resolveModal.status}
                      onChange={(e) => setResolveModal({ ...resolveModal, status: e.target.value })}
                    >
                      <option value="resolved">Resolved</option>
                      <option value="dismissed">Dismissed</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Resolution Note (optional)</label>
                    <textarea
                      className="form-control"
                      rows={4}
                      value={resolveModal.resolutionNote}
                      onChange={(e) => setResolveModal({ ...resolveModal, resolutionNote: e.target.value })}
                      placeholder="Explain your decision for audit trail and reporter notice"
                    />
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-end gap-2">
                  <button className="btn btn-secondary" onClick={() => setResolveModal({ open: false, reportId: null, status: 'resolved', resolutionNote: '' })}>Cancel</button>
                  <button className="btn btn-success" onClick={submitResolveWithNote}>Save</button>
                </div>
              </div>
            </div>
          )}

          {/* Manage Ban Modal */}
          {banModal.open && (
            <div
              className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
              onClick={() => setBanModal({ open: false, userId: null, isBanned: false, durationDays: 7, reason: '', incrementStrike: true })}
            >
              <div className="card glossy-card p-3" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
                <div className="card-header d-flex align-items-center justify-content-between">
                  <strong>Manage Ban</strong>
                  <button
                    className="btn-close"
                    onClick={() => setBanModal({ open: false, userId: null, isBanned: false, durationDays: 7, reason: '', incrementStrike: true })}
                  />
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label className="form-label">Duration</label>
                    <select
                      className="form-select"
                      value={banModal.durationDays}
                      onChange={(e) => setBanModal({ ...banModal, durationDays: Number(e.target.value) })}
                    >
                      <option value={1}>1 day</option>
                      <option value={7}>7 days</option>
                      <option value={30}>30 days</option>
                      <option value={0}>Permanent</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Reason (optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={banModal.reason}
                      onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
                      placeholder="This reason will be sent in the notification"
                    />
                  </div>
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={banModal.incrementStrike}
                      onChange={(e) => setBanModal({ ...banModal, incrementStrike: e.target.checked })}
                      id="banStrikeCheck"
                    />
                    <label className="form-check-label" htmlFor="banStrikeCheck">
                      Increment strike (violations)
                    </label>
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-between">
                  {banModal.isBanned ? (
                    <button className="btn btn-outline-secondary" onClick={submitUnban}>
                      Unban Now
                    </button>
                  ) : <span />}
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-secondary"
                      onClick={() => setBanModal({ open: false, userId: null, isBanned: false, durationDays: 7, reason: '', incrementStrike: true })}
                    >
                      Cancel
                    </button>
                    <button className="btn btn-warning" onClick={submitBan}>
                      Confirm Ban
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
