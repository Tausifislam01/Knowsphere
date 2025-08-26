// frontend/src/pages/AdminDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  fetchReportedInsights, hideInsight, deleteInsight,
  fetchReportedComments, hideComment, deleteComment,
  banUserAdvanced, resolveReportWithNote, unbanUser,
  fetchHandledReports, fetchUserReportCount
} from '../utils/api';

function AdminDashboard({ currentUser }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('insights'); // 'insights' | 'comments' | 'logs'
  const [reportedInsights, setReportedInsights] = useState([]);
  const [reportedComments, setReportedComments] = useState([]);
  const [handledReports, setHandledReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters for "Handled" tab
  const [reportSearch, setReportSearch] = useState({
    status: '',       // '' | 'resolved' | 'dismissed'
    resolvedBy: '',   // userId string
    startDate: '',    // YYYY-MM-DD
    endDate: '',      // YYYY-MM-DD
    itemType: ''      // '' | 'Insight' | 'Comment'
  });

  // Resolve-with-note modal
  const [resolveModal, setResolveModal] = useState({
    open: false,
    reportId: null,
    status: 'resolved',     // 'resolved' | 'dismissed'
    resolutionNote: ''
  });

  // Manage ban modal
  const [banModal, setBanModal] = useState({
    open: false,
    userId: null,
    isBanned: false,
    durationDays: 7,
    reason: '',
    incrementStrike: true
  });

  const [busy, setBusy] = useState({}); // track per-item in-flight actions

  const token = () => localStorage.getItem('token');

  const ensureAuthOrRedirect = () => {
    if (!token()) {
      toast.error('Session expired. Please log in again.', { autoClose: 2000 });
      navigate('/login');
      return false;
    }
    return true;
  };

  /* ───────────────── Floating (top) horizontal scrollbar ───────────────── */
  const HScroll = ({ children }) => {
    const topRef = useRef(null);
    const bottomRef = useRef(null);
    const spacerRef = useRef(null);

    const sync = (from, to) => {
      if (!from || !to) return;
      if (to.scrollLeft !== from.scrollLeft) to.scrollLeft = from.scrollLeft;
    };

    useEffect(() => {
      const updateWidth = () => {
        const w = bottomRef.current?.scrollWidth || 0;
        if (spacerRef.current) spacerRef.current.style.width = `${w}px`;
      };
      updateWidth();

      // Keep in sync with layout changes
      const ro = new ResizeObserver(updateWidth);
      if (bottomRef.current) ro.observe(bottomRef.current);
      // When window resizes, recompute
      window.addEventListener('resize', updateWidth, { passive: true });

      return () => {
        ro.disconnect();
        window.removeEventListener('resize', updateWidth);
      };
    }, []);

    return (
      <div className="hscroll">
        {/* top floating scrollbar (sticky within the card) */}
        <div
          className="hscroll-top"
          ref={topRef}
          onScroll={() => sync(topRef.current, bottomRef.current)}
          role="presentation"
          aria-hidden="true"
        >
          <div ref={spacerRef} style={{ height: 1 }} />
        </div>

        {/* main table scroller (normal) */}
        <div
          className="table-responsive"
          ref={bottomRef}
          onScroll={() => sync(bottomRef.current, topRef.current)}
        >
          {children}
        </div>
      </div>
    );
  };

  /** ----------------- Resolve / Dismiss ----------------- */
  const dismissReport = async (reportId) => {
    if (!ensureAuthOrRedirect()) return;
    if (!window.confirm('Dismiss this report?')) return;
    try {
      await resolveReportWithNote(reportId, 'dismissed', '');
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

    const label =
      resolveModal.status === 'resolved'
        ? 'Resolve this report as valid?'
        : 'Mark this report as dismissed?';
    if (!window.confirm(label)) return;

    try {
      await resolveReportWithNote(
        resolveModal.reportId,
        resolveModal.status,
        resolveModal.resolutionNote
      );
      toast.success(`Report ${resolveModal.status}`, { autoClose: 2000 });
      setResolveModal({
        open: false,
        reportId: null,
        status: 'resolved',
        resolutionNote: ''
      });
      await refreshActiveTab();
    } catch (e) {
      console.error('Resolve with note error:', e);
      toast.error('Failed to update report', { autoClose: 2000 });
    }
  };

  /** ----------------- Data loaders ----------------- */
  const loadHandledReports = async () => {
    if (!ensureAuthOrRedirect()) return;
    try {
      const list = await fetchHandledReports({
        status: reportSearch.status,
        resolvedBy: reportSearch.resolvedBy,
        startDate: reportSearch.startDate,
        endDate: reportSearch.endDate,
        itemType: reportSearch.itemType,
      });
      const withCounts = await attachUserReportCounts(list);
      setHandledReports(withCounts);
    } catch (e) {
      console.error('loadHandledReports error:', e);
      toast.error('Failed to load handled reports', { autoClose: 2000 });
    }
  };

  const attachUserReportCounts = async (items) => {
    return Promise.all(
      (items || []).map(async (report) => {
        const userId =
          report?.reportedItemId?.userId?._id ||
          report?.contentSnapshot?.authorId;
        if (!userId) return { ...report, userReportCount: 0 };
        try {
          const count = await fetchUserReportCount(userId);
          return { ...report, userReportCount: count || 0 };
        } catch {
          return { ...report, userReportCount: 0 };
        }
      })
    );
  };

  const refreshActiveTab = async () => {
    if (activeTab === 'insights') {
      const list = await fetchReportedInsights();
      const withCounts = await attachUserReportCounts(list);
      setReportedInsights(withCounts);
    } else if (activeTab === 'comments') {
      const list = await fetchReportedComments();
      const withCounts = await attachUserReportCounts(list);
      setReportedComments(withCounts);
    } else if (activeTab === 'logs') {
      await loadHandledReports();
    }
  };

  useEffect(() => {
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

  /** ----------------- Hide/Unhide (toggle) ----------------- */
  const clickHideInsight = async (insightId, isHidden) => {
    if (!ensureAuthOrRedirect()) return;
    const actionLabel = isHidden ? 'unhide' : 'hide';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this insight?`)) return;

    try {
      setBusy((b) => ({ ...b, [`ins:${insightId}`]: true }));
      await hideInsight(insightId);
      toast.success(`Insight ${actionLabel}d`, { autoClose: 2000 });
      await refreshActiveTab();
    } catch (e) {
      console.error('Hide insight error:', e);
      toast.error(`Failed to ${actionLabel} insight`, { autoClose: 2000 });
    } finally {
      setBusy((b) => ({ ...b, [`ins:${insightId}`]: false }));
    }
  };

  const clickDeleteInsight = async (insightId) => {
    if (!ensureAuthOrRedirect()) return;
    if (!window.confirm('Delete this insight permanently?')) return;

    try {
      setBusy((b) => ({ ...b, [`ins:${insightId}`]: true }));
      await deleteInsight(insightId);
      toast.success('Insight deleted', { autoClose: 2000 });
      await refreshActiveTab();
    } catch (e) {
      console.error('Delete insight error:', e);
      toast.error('Failed to delete insight', { autoClose: 2000 });
    } finally {
      setBusy((b) => ({ ...b, [`ins:${insightId}`]: false }));
    }
  };

  const clickHideComment = async (commentId, isHidden) => {
    if (!ensureAuthOrRedirect()) return;
    const actionLabel = isHidden ? 'unhide' : 'hide';
    if (!window.confirm(`Are you sure you want to ${actionLabel} this comment?`)) return;

    try {
      setBusy((b) => ({ ...b, [`com:${commentId}`]: true }));
      await hideComment(commentId);
      toast.success(`Comment ${actionLabel}d`, { autoClose: 2000 });
      await refreshActiveTab();
    } catch (e) {
      console.error('Hide comment error:', e);
      toast.error(`Failed to ${actionLabel} comment`, { autoClose: 2000 });
    } finally {
      setBusy((b) => ({ ...b, [`com:${commentId}`]: false }));
    }
  };

  const clickDeleteComment = async (commentId) => {
    if (!ensureAuthOrRedirect()) return;
    if (!window.confirm('Delete this comment permanently?')) return;

    try {
      setBusy((b) => ({ ...b, [`com:${commentId}`]: true }));
      await deleteComment(commentId);
      toast.success('Comment deleted', { autoClose: 2000 });
      await refreshActiveTab();
    } catch (e) {
      console.error('Delete comment error:', e);
      toast.error('Failed to delete comment', { autoClose: 2000 });
    } finally {
      setBusy((b) => ({ ...b, [`com:${commentId}`]: false }));
    }
  };

  /** ----------------- Ban/Unban ----------------- */
  const openBanModal = (userId, isBanned) => {
    if (!ensureAuthOrRedirect()) return;
    setBanModal({
      open: true,
      userId,
      isBanned,
      durationDays: 7,
      reason: '',
      incrementStrike: true
    });
  };

  const submitBan = async () => {
    try {
      await banUserAdvanced(banModal.userId, {
        durationDays: Number(banModal.durationDays || 0),
        reason: banModal.reason,
        incrementStrike: banModal.incrementStrike
      });
      toast.success(
        `User banned ${
          Number(banModal.durationDays) > 0
            ? `for ${banModal.durationDays} day(s)`
            : 'permanently'
        }`,
        { autoClose: 2000 }
      );
      setBanModal({
        open: false,
        userId: null,
        isBanned: false,
        durationDays: 7,
        reason: '',
        incrementStrike: true
      });
      await refreshActiveTab();
    } catch (e) {
      console.error('Ban user error:', e);
      toast.error('Failed to ban user', { autoClose: 2000 });
    }
  };

  const submitUnban = async () => {
    try {
      await unbanUser(banModal.userId);
      toast.success('User unbanned', { autoClose: 2000 });
      setBanModal({
        open: false,
        userId: null,
        isBanned: false,
        durationDays: 7,
        reason: '',
        incrementStrike: true
      });
      await refreshActiveTab();
    } catch {
      toast.error('Failed to unban user', { autoClose: 2000 });
    }
  };

  const ActionButtons = ({ children }) => (
    <div className="d-flex flex-wrap gap-2">{children}</div>
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
        className={`btn btn-sm ${
          isBanned ? 'btn-outline-danger' : 'btn-outline-warning'
        }`}
        onClick={() => openBanModal(userId, isBanned)}
        title="Open ban management"
      >
        Manage Ban…
      </button>
    );
  };

  return (
    <div className="container admin-dashboard py-4">
      {!currentUser?.isAdmin ? (
        <div className="alert alert-danger d-flex align-items-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          <div>
            <div className="fw-bold">Admin access required</div>
            You need admin privileges to view this dashboard.
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h1 className="h4 mb-0">Admin Dashboard</h1>

            <ul className="nav nav-pills admin-tabs">
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
          </div>

          {isLoading ? (
            <div className="text-center my-5">
              <div className="spinner-border" role="status" />
              <div className="mt-2 text-muted">Loading…</div>
            </div>
          ) : (
            <div className="card admin-card">
              <div className="card-body">
                <div className="mb-3">
                  <div className="small text-muted">
                    Use this panel to handle reports, hide/delete abusive content, and manage bans.
                  </div>
                </div>

                <div>
                  {/* ----------------- Insights Tab ----------------- */}
                  {activeTab === 'insights' && (
                    <HScroll>
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
                            {reportedInsights.map((report) => {
                              const authorName =
                                report?.reportedItemId?.userId?.username ||
                                report?.contentSnapshot?.authorUsername ||
                                'Unknown';
                              const authorId =
                                report?.reportedItemId?.userId?._id ||
                                report?.contentSnapshot?.authorId;
                              const isAdmin =
                                report?.reportedItemId?.userId?.isAdmin;
                              const isBanned =
                                report?.reportedItemId?.userId?.isBanned;
                              const insightId = report?.reportedItemId?._id;

                              return (
                                <tr key={report._id || Math.random()}>
                                  <td className="text-monospace small">
                                    {insightId ?? 'N/A'}
                                  </td>
                                  <td className="text-truncate" style={{ maxWidth: 280 }}>
                                    <Link
                                      to={insightId ? `/insights/${insightId}` : '#'}
                                      className="text-decoration-none"
                                      title={
                                        report?.reportedItemId?.title ||
                                        report?.contentSnapshot?.title ||
                                        '(deleted)'
                                      }
                                    >
                                      {report?.reportedItemId?.title ??
                                        report?.contentSnapshot?.title ??
                                        '(deleted)'}
                                    </Link>
                                  </td>
                                  <td>
                                    {authorId ? (
                                      <Link to={`/profile/${authorId}`} className="text-decoration-none">
                                        {authorName}
                                      </Link>
                                    ) : (
                                      authorName
                                    )}
                                  </td>
                                  <td
                                    className="text-truncate"
                                    style={{ maxWidth: 260 }}
                                    title={report.reason || 'No reason provided'}
                                  >
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
                                        Resolve…
                                      </button>
                                      {insightId && (
                                        <>
                                          <button
                                            className="btn btn-sm btn-outline-warning"
                                            onClick={() =>
                                              clickHideInsight(
                                                report.reportedItemId._id,
                                                report?.reportedItemId?.isHidden
                                              )
                                            }
                                            disabled={!!busy[`ins:${report.reportedItemId._id}`]}
                                            title={report?.reportedItemId?.isHidden ? 'Unhide insight' : 'Hide insight'}
                                          >
                                            {report?.reportedItemId?.isHidden ? 'Unhide' : 'Hide'}
                                          </button>
                                          <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => clickDeleteInsight(report.reportedItemId._id)}
                                            disabled={!!busy[`ins:${report.reportedItemId._id}`]}
                                            title="Delete insight"
                                          >
                                            Delete
                                          </button>
                                        </>
                                      )}
                                      <BanButton userId={authorId} isAdmin={isAdmin} isBanned={isBanned} />
                                    </ActionButtons>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </HScroll>
                  )}

                  {/* ----------------- Comments Tab ----------------- */}
                  {activeTab === 'comments' && (
                    <HScroll>
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
                              <th style={{ minWidth: 340 }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportedComments.map((report) => {
                              const authorName =
                                report?.reportedItemId?.userId?.username ||
                                report?.contentSnapshot?.authorUsername ||
                                'Unknown';
                              const authorId =
                                report?.reportedItemId?.userId?._id ||
                                report?.contentSnapshot?.authorId;
                              const isAdmin =
                                report?.reportedItemId?.userId?.isAdmin;
                              const isBanned =
                                report?.reportedItemId?.userId?.isBanned;
                              const commentId = report?.reportedItemId?._id;
                              const isHidden = report?.reportedItemId?.isHidden ?? false;

                              return (
                                <tr key={report._id || Math.random()}>
                                  <td className="text-monospace small">{commentId ?? 'N/A'}</td>
                                  <td>
                                    <div>
                                      <div
                                        className="text-truncate"
                                        style={{ maxWidth: 320 }}
                                        title={
                                          report?.reportedItemId?.text ??
                                          report?.contentSnapshot?.text ??
                                          '(deleted)'
                                        }
                                      >
                                        {report?.reportedItemId?.text ??
                                          report?.contentSnapshot?.text ??
                                          '(deleted)'}
                                      </div>
                                      {(report?.reportedItemId?.insightId ||
                                        report?.contentSnapshot?.insightId) && (
                                        <Link
                                          to={`/insights/${
                                            report?.reportedItemId?.insightId ||
                                            report?.contentSnapshot?.insightId
                                          }${commentId ? `#comment-${commentId}` : ''}`}
                                          className="small text-decoration-none"
                                        >
                                          View in context
                                        </Link>
                                      )}
                                    </div>
                                  </td>
                                  <td>{authorName}</td>
                                  <td
                                    className="text-truncate"
                                    style={{ maxWidth: 260 }}
                                    title={report.reason || 'No reason provided'}
                                  >
                                    {report.reason || 'No reason provided'}
                                  </td>
                                  <td>
                                    {report.reporterId?._id ? (
                                      <Link
                                        to={`/profile/${report.reporterId._id}`}
                                        className="text-decoration-none"
                                      >
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
                                      <button
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={() => dismissReport(report._id)}
                                      >
                                        Dismiss
                                      </button>
                                      <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => openResolveModal(report._id, 'resolved')}
                                      >
                                        Resolve…
                                      </button>
                                      {commentId && (
                                        <button
                                          className="btn btn-sm btn-outline-warning"
                                          onClick={() => clickHideComment(commentId, isHidden)}
                                          disabled={!!busy[`com:${report.reportedItemId._id}`]}
                                        >
                                          {isHidden ? 'Unhide' : 'Hide'}
                                        </button>
                                      )}
                                      <button
                                        className="btn btn-sm btn-danger"
                                        onClick={() =>
                                          report?.reportedItemId?._id &&
                                          clickDeleteComment(report.reportedItemId._id)
                                        }
                                        disabled={!report?.reportedItemId?._id}
                                      >
                                        Delete
                                      </button>
                                      <BanButton userId={authorId} isAdmin={isAdmin} isBanned={isBanned} />
                                    </ActionButtons>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </HScroll>
                  )}

                  {/* ----------------- Handled Tab ----------------- */}
                  {activeTab === 'logs' && (
                    <div className="mt-4">
                      <div className="row g-2 align-items-end mb-3">
                        <div className="col-md-2">
                          <label className="form-label small text-muted">Status</label>
                          <select
                            className="form-select form-select-sm"
                            value={reportSearch.status}
                            onChange={(e) => setReportSearch({ ...reportSearch, status: e.target.value })}
                          >
                            <option value="">Any</option>
                            <option value="resolved">Resolved</option>
                            <option value="dismissed">Dismissed</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label small text-muted">Resolved By (User ID)</label>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="642e… (optional)"
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
                            <option value="">Any</option>
                            <option value="Insight">Insight</option>
                            <option value="Comment">Comment</option>
                          </select>
                        </div>
                      </div>

                      <HScroll>
                        {handledReports.length === 0 ? (
                          <EmptyState message="No handled reports match your filters" />
                        ) : (
                          <table className="table table-sm align-middle">
                            <thead className="table-light sticky-top">
                              <tr>
                                <th style={{ minWidth: 120 }}>ID</th>
                                <th style={{ minWidth: 100 }}>Type</th>
                                <th style={{ minWidth: 260 }}>Content</th>
                                <th style={{ minWidth: 200 }}>Reason</th>
                                <th style={{ minWidth: 120 }}>Status</th>
                                <th style={{ minWidth: 160 }}>Resolved By</th>
                                <th style={{ minWidth: 160 }}>Resolved At</th>
                                <th style={{ minWidth: 120 }}>User Reports</th>
                                <th style={{ minWidth: 160 }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {handledReports.map((report) => {
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
                                  ? (() => {
                                      const id =
                                        report?.reportedItemId?._id ||
                                        report?.contentSnapshot?.insightId;
                                      return id ? `/insights/${id}` : '#';
                                    })()
                                  : (() => {
                                      const insightId =
                                        report?.reportedItemId?.insightId ||
                                        report?.contentSnapshot?.insightId;
                                      const commentId = report?.reportedItemId?._id;
                                      return insightId
                                        ? `/insights/${insightId}${commentId ? `#comment-${commentId}` : ''}`
                                        : '#';
                                    })();

                                return (
                                  <tr key={report._id || Math.random()}>
                                    <td className="text-monospace small">
                                      {(report?.reportedItemId?._id ??
                                        report?.contentSnapshot?.insightId ??
                                        report?._id ??
                                        'N/A')}
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
                                    </td>
                                    <td>
                                      {report.resolvedBy?._id ? (
                                        <Link to={`/profile/${report.resolvedBy._id}`} className="text-decoration-none">
                                          {report.resolvedBy?.username || 'Unknown'}
                                        </Link>
                                      ) : ('Unknown')}
                                    </td>
                                    <td>{report.resolvedAt ? new Date(report.resolvedAt).toLocaleString() : '—'}</td>
                                    <td>
                                      <span className="badge bg-secondary-subtle text-dark border">
                                        {report.userReportCount || 0}
                                      </span>
                                    </td>
                                    <td>
                                      <ActionButtons>
                                        <button className="btn btn-sm btn-outline-secondary" onClick={() => dismissReport(report._id)}>
                                          Re-open / Dismiss Again
                                        </button>
                                        <button className="btn btn-sm btn-success" onClick={() => openResolveModal(report._id, 'resolved')}>
                                          Re-resolve…
                                        </button>
                                        {authorId && (
                                          <BanButton
                                            userId={authorId}
                                            isAdmin={report?.reportedItemId?.userId?.isAdmin}
                                            isBanned={report?.reportedItemId?.userId?.isBanned}
                                          />
                                        )}
                                      </ActionButtons>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </HScroll>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ----------------- Resolve Modal ----------------- */}
          {resolveModal.open && (
            <div
              className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
              onClick={() =>
                setResolveModal({
                  open: false,
                  reportId: null,
                  status: 'resolved',
                  resolutionNote: ''
                })
              }
            >
              <div className="card admin-card p-3" onClick={(e) => e.stopPropagation()} style={{ minWidth: 420 }}>
                <div className="card-body">
                  <h5 className="card-title">Resolve Report</h5>
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
                    <label className="form-label">Resolution Note</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={resolveModal.resolutionNote}
                      onChange={(e) => setResolveModal({ ...resolveModal, resolutionNote: e.target.value })}
                      placeholder="Explain your decision for audit trail and reporter notice"
                    />
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-end gap-2">
                  <button
                    className="btn btn-secondary"
                    onClick={() =>
                      setResolveModal({
                        open: false,
                        reportId: null,
                        status: 'resolved',
                        resolutionNote: ''
                      })
                    }
                  >
                    Cancel
                  </button>
                  <button className="btn btn-success" onClick={submitResolveWithNote}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ----------------- Manage Ban Modal ----------------- */}
          {banModal.open && (
            <div
              className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
              onClick={() =>
                setBanModal({
                  open: false,
                  userId: null,
                  isBanned: false,
                  durationDays: 7,
                  reason: '',
                  incrementStrike: true
                })
              }
            >
              <div className="card admin-card p-3" onClick={(e) => e.stopPropagation()} style={{ minWidth: 420 }}>
                <div className="card-body">
                  <h5 className="card-title">Manage Ban</h5>
                  <div className="mb-3">
                    <label className="form-label">Ban duration</label>
                    <select
                      className="form-select"
                      value={banModal.durationDays}
                      onChange={(e) => setBanModal({ ...banModal, durationDays: e.target.value })}
                    >
                      <option value={1}>1 day</option>
                      <option value={3}>3 days</option>
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
                      Increment strike count
                    </label>
                  </div>
                </div>
                <div className="card-footer d-flex justify-content-between">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() =>
                      setBanModal({
                        open: false,
                        userId: null,
                        isBanned: false,
                        durationDays: 7,
                        reason: '',
                        incrementStrike: true
                      })
                    }
                  >
                    Cancel
                  </button>
                  {banModal.isBanned ? (
                    <button className="btn btn-danger" onClick={submitUnban}>
                      Unban User
                    </button>
                  ) : (
                    <button className="btn btn-warning" onClick={submitBan}>
                      Confirm Ban
                    </button>
                  )}
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
