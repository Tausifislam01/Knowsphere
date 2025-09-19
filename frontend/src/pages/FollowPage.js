import { API_URL } from '../utils/api';

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FollowButton from '../components/FollowButton';

function FollowPage() {
const [users, setUsers] = useState([]);
const [tags, setTags] = useState([]);
const [currentUser, setCurrentUser] = useState(null);
const [error, setError] = useState('');
const navigate = useNavigate();

useEffect(() => {
    const fetchData = async () => {
    try {
        // Fetch current user
    const userResponse = await fetch(`${API_URL}/auth/profile`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        });
        if (!userResponse.ok) {
        throw new Error('Failed to fetch user');
        }
        const userData = await userResponse.json();
        setCurrentUser(userData);

        // Fetch all users
    const usersResponse = await fetch(`${API_URL}/auth/users`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        });
        if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
        }
        const usersData = await usersResponse.json();
        setUsers(usersData);

        // Fetch all tags
    const insightsResponse = await fetch(`${API_URL}/insights/public`);
        if (!insightsResponse.ok) {
        throw new Error('Failed to fetch tags');
        }
        const insightsData = await insightsResponse.json();
        const allTags = [...new Set(
        insightsData.flatMap(insight =>
            insight.tags ? insight.tags.split(',').map(t => t.trim()) : []
        )
        )];
        setTags(allTags);
    } catch (error) {
        console.error('Fetch error:', error);
        setError('Error: ' + error.message);
        navigate('/login');
    }
    };

    const handleUserUpdate = (event) => {
    setCurrentUser(event.detail);
    };
    window.addEventListener('userUpdated', handleUserUpdate);

    fetchData();

    return () => {
    window.removeEventListener('userUpdated', handleUserUpdate);
    };
}, [navigate]);

if (!currentUser) return <div className="container text-center mt-5">Loading...</div>;

return (
    <div className="container py-4">
    <h1 className="display-5 fw-bold mb-3 text-primary">
        <i className="bi bi-person-plus me-2"></i>
        Get Started: Follow People and Topics
    </h1>
    <p className="lead text-muted mb-5">
        Follow users and tags to customize your feed and stay updated with relevant insights.
    </p>
    {error && (
        <div className="alert alert-danger d-flex align-items-center mb-4">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        <div>{error}</div>
        </div>
    )}
    <div className="row g-4">
        <div className="col-lg-6">
        <div className="card glossy-card">
            <div className="card-body">
            <h3 className="mb-4">Suggested Users</h3>
            {users.length === 0 ? (
                <p className="text-muted">No users found.</p>
            ) : (
                <div className="list-group list-group-flush">
                {users
                    .filter(user => user._id !== currentUser._id)
                    .map(user => (
                    <div
                        key={user._id}
                        className="list-group-item d-flex align-items-center justify-content-between"
                    >
                        <div className="d-flex align-items-center">
                        <img
                            src={user.profilePicture || 'https://via.placeholder.com/40'}
                            className="rounded-circle me-2"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            alt="User"
                            onError={(e) => (e.target.src = 'https://via.placeholder.com/40')}
                        />
                        <Link to={`/profile/${user._id}`} className="text-decoration-none">
                            {user.username}
                        </Link>
                        </div>
                        <FollowButton userId={user._id} currentUser={currentUser} />
                    </div>
                    ))}
                </div>
            )}
            </div>
        </div>
        </div>
        <div className="col-lg-6">
        <div className="card glossy-card">
            <div className="card-body">
            <h3 className="mb-4">Popular Tags</h3>
            {tags.length === 0 ? (
                <p className="text-muted">No tags found.</p>
            ) : (
                <div className="d-flex flex-wrap gap-2">
                {tags.map(tag => (
                    <div key={tag} className="d-flex align-items-center">
                    <span className="badge bg-light text-dark me-2">#{tag}</span>
                    <FollowButton tag={tag} currentUser={currentUser} />
                    </div>
                ))}
                </div>
            )}
            </div>
        </div>
        </div>
    </div>
    <div className="text-center mt-5">
        <Link to="/" className="glossy-button btn btn-sm">
        <i className="bi bi-house me-2"></i>
        Go to Home
        </Link>
    </div>
    </div>
);
}

export default FollowPage;
