// frontend/src/components/FollowButton.js
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { followUser, unfollowUser, getProfile } from '../utils/api';

/**
 * Normalizes a "following" list from different possible shapes
 * (following, followingUsers, followedUsers) into a string[] of userIds.
 */
const extractFollowingIds = (user) => {
  if (!user) return [];
  const candidates = user.following || user.followingUsers || user.followedUsers || [];
  // candidates could be strings or objects like {_id: "..."}; normalize:
  return candidates.map((x) => (typeof x === 'string' ? x : (x?._id || x?.id || String(x))));
};

export default function FollowButton({
  userId,              // person to (un)follow
  currentUser,         // logged-in user object
  size = 'sm',         // 'sm' | 'md' | 'lg' (just for classes)
  className = '',      // extra classNames
  onChange,            // optional callback(newIsFollowing)
}) {
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(currentUser || null);

  // keep internal "me" in sync with prop changes
  useEffect(() => setMe(currentUser || null), [currentUser]);

  const myId = me?._id || me?.id;
  const followingIds = useMemo(() => extractFollowingIds(me), [me]);
  const isMe = myId && userId && String(myId) === String(userId);
  const isFollowing = useMemo(
    () => followingIds.some((id) => String(id) === String(userId)),
    [followingIds, userId]
  );

  const btnSize = size === 'lg' ? 'btn-lg' : size === 'md' ? '' : 'btn-sm';

  const refreshProfile = async () => {
    try {
      const fresh = await getProfile();
      setMe(fresh);
      // also notify the rest of the app
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: fresh }));
    } catch {
      /* ignore */
    }
  };

  const handleToggle = async () => {
    if (!me) {
      toast.error('Please log in first', { autoClose: 1500 });
      return;
    }
    if (isMe) return; // cannot follow yourself

    setLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(userId);
        toast.info('Unfollowed', { autoClose: 1200 });
      } else {
        await followUser(userId);
        toast.success('Followed', { autoClose: 1200 });
      }

      // Optimistic local update
      const next = { ...(me || {}) };
      const list = extractFollowingIds(next);

      if (isFollowing) {
        next.following = list.filter((id) => String(id) !== String(userId));
      } else {
        next.following = [...new Set([...list.map(String), String(userId)])];
      }

      setMe(next);
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: next }));
      onChange && onChange(!isFollowing);

      // Defensive: refresh from server to stay accurate with any server-side logic
      await refreshProfile();
    } catch (err) {
      console.error('Follow toggle error:', err);
      toast.error(err.message || 'Action failed', { autoClose: 1500 });
    } finally {
      setLoading(false);
    }
  };

  // Hide button when it's me
  if (isMe) return null;

  return (
    <button
      type="button"
      className={`btn ${isFollowing ? 'btn-outline-secondary' : 'btn-outline-primary'} ${btnSize} ${className}`}
      disabled={loading}
      onClick={handleToggle}
      title={isFollowing ? 'Unfollow' : 'Follow'}
    >
      {loading ? (
        <>
          <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" />
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </>
      ) : isFollowing ? (
        <>
          <i className="bi bi-person-dash me-1" />
          Unfollow
        </>
      ) : (
        <>
          <i className="bi bi-person-plus me-1" />
          Follow
        </>
      )}
    </button>
  );
}