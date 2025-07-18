
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

function FollowButton({ userId, tag, currentUser }) {
const [isFollowing, setIsFollowing] = useState(false);

useEffect(() => {
    if (userId && currentUser?.following) {
    setIsFollowing(currentUser.following.some((id) => id._id === userId));
    } else if (tag && currentUser?.followedTags) {
    setIsFollowing(currentUser.followedTags.includes(tag));
    }
}, [userId, tag, currentUser]);

const handleFollow = async () => {
    try {
    const url = userId
        ? `http://localhost:5000/api/auth/follow/${userId}`
        : `http://localhost:5000/api/auth/follow-tag/${encodeURIComponent(tag)}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    const data = await response.json();
    if (response.ok) {
        setIsFollowing(true);
        toast.success(userId ? 'User followed!' : 'Tag followed!', { autoClose: 2000 });
        // Update current user in parent component
        if (data.user) {
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: data.user }));
        }
    } else {
        toast.error(data.message || 'Failed to follow', { autoClose: 2000 });
    }
    } catch (error) {
    console.error('Follow error:', error);
    toast.error('Error following', { autoClose: 2000 });
    }
};

const handleUnfollow = async () => {
    try {
    const url = userId
        ? `http://localhost:5000/api/auth/unfollow/${userId}`
        : `http://localhost:5000/api/auth/unfollow-tag/${encodeURIComponent(tag)}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });
    const data = await response.json();
    if (response.ok) {
        setIsFollowing(false);
        toast.success(userId ? 'User unfollowed!' : 'Tag unfollowed!', { autoClose: 2000 });
        // Update current user in parent component
        if (data.user) {
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: data.user }));
        }
    } else {
        toast.error(data.message || 'Failed to unfollow', { autoClose: 2000 });
    }
    } catch (error) {
    console.error('Unfollow error:', error);
    toast.error('Error unfollowing', { autoClose: 2000 });
    }
};

if (!userId && !tag) return null;

return (
    <button
    className={`glossy-button btn btn-sm ${isFollowing ? 'bg-secondary' : 'bg-primary'}`}
    onClick={isFollowing ? handleUnfollow : handleFollow}
    >
    <i className={`bi ${isFollowing ? 'bi-person-dash' : 'bi-person-plus'} me-2`}></i>
    {isFollowing ? (userId ? 'Unfollow' : 'Unfollow Tag') : (userId ? 'Follow' : 'Follow Tag')}
    </button>
);
}

export default FollowButton;