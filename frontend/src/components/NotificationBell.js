import React, { useEffect, useState, useCallback } from 'react';
import {
  getNotifications,
  markNotificationRead,
  clearReadNotifications,
} from '../utils/api';
import NotificationsPanel from './NotificationsPanel';

const NotificationBell = ({ currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const list = await getNotifications();
      setNotifications(list);
    } catch (e) {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    load();
  }, [load]);

  // Optional: simple polling every 30s
  useEffect(() => {
    if (!currentUser) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [currentUser, load]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const onMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch {}
  };

  const onClearRead = async () => {
    if (!window.confirm('Clear read notifications?')) return;
    try {
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.read));
    } catch {}
  };

  if (!currentUser) return null;

  return (
    <div className="position-relative d-inline-block ms-2">
      <button
        className="btn btn-outline-secondary position-relative"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <i className="bi bi-bell"></i>
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            style={{ fontSize: '0.65rem' }}
          >
            {unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div
          className="position-absolute end-0 mt-2"
          style={{ zIndex: 1060, minWidth: 320 }}
        >
          <NotificationsPanel
            notifications={notifications}
            loading={loading}
            onRefresh={load}
            onMarkRead={onMarkRead}
            onClearRead={onClearRead}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default NotificationBell;