import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function EditProfile({ currentUser }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    bio: '',
    profilePicture: null,
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
    genderPrivacy: false,
  });
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
            workplace: data.workplace || '',
            facebook: data.facebook || '',
            linkedin: data.linkedin || '',
            github: data.github || '',
            interests: data.interests ? data.interests.join(', ') : '',
            gender: data.gender || '',
            skills: data.skills ? data.skills.join(', ') : '',
            education: data.education ? data.education.join(', ') : '',
            workExperience: data.workExperience ? data.workExperience.join(', ') : '',
            languages: data.languages ? data.languages.join(', ') : '',
            location: data.location || '',
            portfolio: data.portfolio || '',
            connections: data.connections ? data.connections.join(', ') : '',
            badges: data.badges ? data.badges.join(', ') : '',
            availability: data.availability || '',
            recentActivity: data.recentActivity ? data.recentActivity.join(', ') : '',
            preferredTopics: data.preferredTopics ? data.preferredTopics.join(', ') : '',
            genderPrivacy: data.genderPrivacy || false,
            profilePicture: null,
          });
          setPreview(data.profilePicture || 'https://via.placeholder.com/150');
          toast.success('Your profile data has been loaded successfully', { autoClose: 2000 });
        } else {
          setError(data.message || 'Failed to fetch profile');
          toast.error(data.message || 'Failed to fetch profile', { autoClose: 2000 });
          navigate('/login');
        }
      } catch (error) {
        setError('Error: ' + error.message);
        toast.error('Error fetching profile: ' + error.message, { autoClose: 2000 });
        navigate('/login');
      }
    };
    fetchProfile();
  }, [navigate]);

  const handleChange = (e) => {
    if (e.target.name === 'profilePicture') {
      const file = e.target.files[0];
      setFormData({ ...formData, profilePicture: file });
      if (file) {
        setPreview(URL.createObjectURL(file));
      }
    } else if (e.target.name === 'genderPrivacy') {
      setFormData({ ...formData, genderPrivacy: e.target.checked });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!currentUser) {
      setError('You must be logged in to edit your profile');
      toast.error('You must be logged in to edit your profile', { autoClose: 2000 });
      // window.alert('You must be logged in to edit your profile');
      navigate('/login');
      setIsLoading(false);
      return;
    }

    const form = new FormData();
    form.append('username', formData.username);
    form.append('email', formData.email);
    form.append('fullName', formData.fullName);
    form.append('bio', formData.bio);
    form.append('workplace', formData.workplace);
    form.append('facebook', formData.facebook);
    form.append('linkedin', formData.linkedin);
    form.append('github', formData.github);
    form.append('interests', formData.interests);
    form.append('gender', formData.gender);
    form.append('skills', formData.skills);
    form.append('education', formData.education);
    form.append('workExperience', formData.workExperience);
    form.append('languages', formData.languages);
    form.append('location', formData.location);
    form.append('portfolio', formData.portfolio);
    form.append('connections', formData.connections);
    form.append('badges', formData.badges);
    form.append('availability', formData.availability);
    form.append('recentActivity', formData.recentActivity);
    form.append('preferredTopics', formData.preferredTopics);
    form.append('genderPrivacy', formData.genderPrivacy.toString());
    if (formData.profilePicture) {
      form.append('profilePicture', formData.profilePicture);
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: form,
      });
      if (response.ok) {
        toast.success('Your profile has been updated successfully', { autoClose: 2000 });
        // window.alert('Your profile has been updated successfully');
        navigate(`/profile/${currentUser._id}`);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update profile');
        toast.error(data.message || 'Failed to update profile', { autoClose: 2000 });
        // window.alert(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setError('Error: ' + error.message);
      toast.error('Error updating profile: ' + error.message, { autoClose: 2000 });
      // window.alert('Error updating profile: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card border-0 shadow rounded-4 overflow-hidden">
              <div className="card-header glossy-navbar p-4">
                <h2 className="mb-0 text-black">
                  <i className="bi bi-pencil-square me-2"></i> Edit Profile
                </h2>
              </div>
              <div className="card-body p-4 p-md-5">
                {error && (
                  <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>{error}</div>
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="row g-4">
                    <div className="col-12 text-center">
                      <img
                        src={preview}
                        className="rounded-circle border border-4 border-light shadow mb-3"
                        alt="Profile Preview"
                        style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                        onError={(e) => (e.target.src = 'https://via.placeholder.com/150')}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Username <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-person-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="username"
                          className="form-control"
                          value={formData.username}
                          onChange={handleChange}
                          required
                          placeholder="Enter username"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Email <span className="text-danger">*</span></label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-envelope-fill"></i>
                        </span>
                        <input
                          type="email"
                          name="email"
                          className="form-control"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="Enter email"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Full Name</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-person-circle"></i>
                        </span>
                        <input
                          type="text"
                          name="fullName"
                          className="form-control"
                          value={formData.fullName}
                          onChange={handleChange}
                          placeholder="Enter full name"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Profile Picture</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-image-fill"></i>
                        </span>
                        <input
                          type="file"
                          name="profilePicture"
                          className="form-control"
                          accept="image/*"
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Bio</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-text-paragraph"></i>
                        </span>
                        <textarea
                          name="bio"
                          className="form-control"
                          value={formData.bio}
                          onChange={handleChange}
                          rows="4"
                          placeholder="Tell us about yourself"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Workplace</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-briefcase-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="workplace"
                          className="form-control"
                          value={formData.workplace}
                          onChange={handleChange}
                          placeholder="Enter workplace"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Facebook URL</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-facebook"></i>
                        </span>
                        <input
                          type="text"
                          name="facebook"
                          className="form-control"
                          value={formData.facebook}
                          onChange={handleChange}
                          placeholder="Enter Facebook URL"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">LinkedIn URL</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-linkedin"></i>
                        </span>
                        <input
                          type="text"
                          name="linkedin"
                          className="form-control"
                          value={formData.linkedin}
                          onChange={handleChange}
                          placeholder="Enter LinkedIn URL"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">GitHub URL</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-github"></i>
                        </span>
                        <input
                          type="text"
                          name="github"
                          className="form-control"
                          value={formData.github}
                          onChange={handleChange}
                          placeholder="Enter GitHub URL"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Portfolio URL</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-briefcase-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="portfolio"
                          className="form-control"
                          value={formData.portfolio}
                          onChange={handleChange}
                          placeholder="Enter portfolio URL"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Interests (comma-separated)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-star-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="interests"
                          className="form-control"
                          value={formData.interests}
                          onChange={handleChange}
                          placeholder="e.g., coding, AI, music"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Gender</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-person-fill"></i>
                        </span>
                        <select
                          name="gender"
                          className="form-control"
                          value={formData.gender}
                          onChange={handleChange}
                        >
                          <option value="">Select gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Gender Privacy</label>
                      <div className="input-group">
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
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Skills (comma-separated)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-tools"></i>
                        </span>
                        <input
                          type="text"
                          name="skills"
                          className="form-control"
                          value={formData.skills}
                          onChange={handleChange}
                          placeholder="e.g., JavaScript, Python, React"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Education (comma-separated)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-book-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="education"
                          className="form-control"
                          value={formData.education}
                          onChange={handleChange}
                          placeholder="e.g., BSc in CS, MBA"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Work Experience (comma-separated)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-briefcase-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="workExperience"
                          className="form-control"
                          value={formData.workExperience}
                          onChange={handleChange}
                          placeholder="e.g., Software Engineer at XYZ, 2020-2022"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Languages (comma-separated)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-globe"></i>
                        </span>
                        <input
                          type="text"
                          name="languages"
                          className="form-control"
                          value={formData.languages}
                          onChange={handleChange}
                          placeholder="e.g., English, Spanish"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Location</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-geo-alt-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="location"
                          className="form-control"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="Enter location"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Connections (comma-separated)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-people-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="connections"
                          className="form-control"
                          value={formData.connections}
                          onChange={handleChange}
                          placeholder="e.g., user1, user2"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Badges (comma-separated)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-award-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="badges"
                          className="form-control"
                          value={formData.badges}
                          onChange={handleChange}
                          placeholder="e.g., Top Contributor, Verified"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Availability</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-clock-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="availability"
                          className="form-control"
                          value={formData.availability}
                          onChange={handleChange}
                          placeholder="e.g., Available for freelance"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Recent Activity (comma-separated)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-activity"></i>
                        </span>
                        <input
                          type="text"
                          name="recentActivity"
                          className="form-control"
                          value={formData.recentActivity}
                          onChange={handleChange}
                          placeholder="e.g., Posted insight, Commented"
                        />
                      </div>
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Preferred Topics (comma-separated)</label>
                      <div className="input-group">
                        <span className="input-group-text">
                          <i className="bi bi-bookmark-fill"></i>
                        </span>
                        <input
                          type="text"
                          name="preferredTopics"
                          className="form-control"
                          value={formData.preferredTopics}
                          onChange={handleChange}
                          placeholder="e.g., AI, Web Development"
                        />
                      </div>
                    </div>
                    <div className="col-12 mt-4">
                      <button
                        type="submit"
                        className="glossy-button w-100 py-3 fw-bold"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-save-fill me-2"></i>
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditProfile;