import React from 'react';
import { Link } from 'react-router-dom';

const typeLabel = (t) => {
  switch (t) {
    case 'report_resolved': return 'Report resolved';
    case 'report_dismissed': return 'Report dismissed';
    case 'content_hidden': return 'Content visibility';
    case 'content_deleted': return 'Content removed';
    case 'user_banned': return 'Account status';
    case 'user_unbanned': return 'Account status';
    default: return 'Notification';
  }
};

const NotificationsPanel = ({
  notifications,
  loading,
  onRefresh,
  onMarkRead,
  onClearRead,
  onClose,
}) => {
  return (
    <div className="card shadow">
      <div className="card-header d-flex justify-content-between align-items-center">
        <strong>Notifications</strong>
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={onClearRead}
            title="Clear read notifications (soft-hide)"
          >
            <i className="bi bi-trash"></i>
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={onRefresh}
            title="Refresh"
          >
            <i className="bi bi-arrow-clockwise"></i>
          </button>
          <button
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
          ></button>
        </div>
      </div>
      <div
        className="list-group list-group-flush"
        style={{ maxHeight: 420, overflowY: 'auto' }}
      >
        {loading && (
          <div className="list-group-item text-muted">Loading…</div>
        )}
        {!loading && notifications.length === 0 && (
          <div className="list-group-item text-muted">No notifications</div>
        )}
        {!loading &&
          notifications.map((n) => (
            <div key={n._id} className="list-group-item d-flex">
              <div className="flex-grow-1">
                <div className="small text-muted">{typeLabel(n.type)}</div>
                <div>{n.message}</div>
                {n.link && (
                  <div className="mt-1">
                    <Link to={n.link} className="text-decoration-none">
                      View
                    </Link>
                  </div>
                )}
                <div className="small text-muted mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="ms-3 d-flex align-items-center">
                {!n.read ? (
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => onMarkRead(n._id)}
                  >
                    Mark read
                  </button>
                ) : (
                  <span className="badge bg-secondary">Read</span>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default NotificationsPanel;