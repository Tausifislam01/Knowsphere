import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function EditProfile() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    bio: '',
    profilePicture: '',
    workplace: '',
    facebook: '',
    linkedin: '',
    github: '',
    interests: '',
    gender: '',
    skills: '',
    education: '',
    workExperience: '',
    languages: '',
    location: '',
    portfolio: '',
    connections: '',
    badges: '',
    availability: '',
    recentActivity: '',
    preferredTopics: '',
    genderPrivacy: true,
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/auth/profile', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setFormData({
            username: data.username || '',
            email: data.email || '',
            fullName: data.fullName || '',
            bio: data.bio || '',
            profilePicture: data.profilePicture || '',
            workplace: data.workplace || '',
            facebook: data.facebook || '',
            linkedin: data.linkedin || '',
            github: data.github || '',
            interests: data.interests || '',
            gender: data.gender || '',
            skills: data.skills || '',
            education: data.education || '',
            workExperience: data.workExperience || '',
            languages: data.languages || '',
            location: data.location || '',
            portfolio: data.portfolio || '',
            connections: data.connections || '',
            badges: data.badges || '',
            availability: data.availability || '',
            recentActivity: data.recentActivity || '',
            preferredTopics: data.preferredTopics || '',
            genderPrivacy: data.genderPrivacy ?? true,
          });
        } else {
          setError(data.message || 'Failed to fetch profile');
          navigate('/login');
        }
      } catch (error) {
        setError('Error: ' + error.message);
        navigate('/login');
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        navigate('/profile');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="card shadow-sm p-4">
        <h2 className="mb-4">Edit Profile</h2>
        {error && (
          <div className="toast show position-fixed bottom-0 end-0 m-3" role="alert">
            <div className="toast-header bg-danger text-white">
              <strong className="me-auto">Error</strong>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setError('')}
              ></button>
            </div>
            <div className="toast-body">{error}</div>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Username <span className="text-danger">*</span></label>
              <input
                type="text"
                name="username"
                className="form-control"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Email <span className="text-danger">*</span></label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="fullName"
                className="form-control"
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Workplace</label>
              <input
                type="text"
                name="workplace"
                className="form-control"
                value={formData.workplace}
                onChange={handleChange}
              />
            </div>
            <div className="col-12">
              <label className="form-label">Bio</label>
              <textarea
                name="bio"
                className="form-control"
                value={formData.bio}
                onChange={handleChange}
                rows="4"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Profile Picture URL</label>
              <input
                type="text"
                name="profilePicture"
                className="form-control"
                value={formData.profilePicture}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Facebook URL</label>
              <input
                type="text"
                name="facebook"
                className="form-control"
                value={formData.facebook}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">LinkedIn URL</label>
              <input
                type="text"
                name="linkedin"
                className="form-control"
                value={formData.linkedin}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">GitHub URL</label>
              <input
                type="text"
                name="github"
                className="form-control"
                value={formData.github}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Interests</label>
              <input
                type="text"
                name="interests"
                className="form-control"
                value={formData.interests}
                onChange={handleChange}
                placeholder="e.g., coding, AI, reading"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Gender</label>
              <select
                name="gender"
                className="form-select"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Skills</label>
              <input
                type="text"
                name="skills"
                className="form-control"
                value={formData.skills}
                onChange={handleChange}
                placeholder="e.g., JavaScript, Python"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Education</label>
              <input
                type="text"
                name="education"
                className="form-control"
                value={formData.education}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Work Experience</label>
              <input
                type="text"
                name="workExperience"
                className="form-control"
                value={formData.workExperience}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Languages</label>
              <input
                type="text"
                name="languages"
                className="form-control"
                value={formData.languages}
                onChange={handleChange}
                placeholder="e.g., English, Bangla"
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Location</label>
              <input
                type="text"
                name="location"
                className="form-control"
                value={formData.location}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Portfolio URL</label>
              <input
                type="text"
                name="portfolio"
                className="form-control"
                value={formData.portfolio}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Connections</label>
              <input
                type="text"
                name="connections"
                className="form-control"
                value={formData.connections}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Badges</label>
              <input
                type="text"
                name="badges"
                className="form-control"
                value={formData.badges}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Availability</label>
              <input
                type="text"
                name="availability"
                className="form-control"
                value={formData.availability}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Recent Activity</label>
              <input
                type="text"
                name="recentActivity"
                className="form-control"
                value={formData.recentActivity}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Preferred Topics</label>
              <input
                type="text"
                name="preferredTopics"
                className="form-control"
                value={formData.preferredTopics}
                onChange={handleChange}
                placeholder="e.g., tech, science"
              />
            </div>
            <div className="col-12">
              <div className="form-check">
                <input
                  type="checkbox"
                  name="genderPrivacy"
                  className="form-check-input"
                  checked={formData.genderPrivacy}
                  onChange={handleChange}
                />
                <label className="form-check-label">Keep gender private</label>
              </div>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary w-100">
                <i className="bi bi-save me-2"></i> Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditProfile;