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
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-vh-100 bg-light">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-lg-10">
            <div className="card border-0 shadow rounded-4 overflow-hidden">
              <div className="card-header glossy-navbar p-4">
                <h2 className="mb-0 text-black">
                  <i className="bi bi-person-gear me-2"></i>
                  Edit Profile
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
                    {/* Personal Information Section */}
                    <div className="col-md-6">
                      <div className="mb-4">
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
                          />
                        </div>
                      </div>

                      <div className="mb-4">
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
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold">Full Name</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-card-heading"></i>
                          </span>
                          <input
                            type="text"
                            name="fullName"
                            className="form-control"
                            value={formData.fullName}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold">Workplace</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-building"></i>
                          </span>
                          <input
                            type="text"
                            name="workplace"
                            className="form-control"
                            value={formData.workplace}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div className="mb-4">
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
                          />
                        </div>
                      </div>
                    </div>

                    {/* Profile Picture Section */}
                    <div className="col-md-6">
                      <div className="mb-4 text-center">
                        <label className="form-label fw-semibold">Profile Picture</label>
                        <div className="d-flex flex-column align-items-center">
                          <img
                            src={formData.profilePicture || 'https://via.placeholder.com/150'}
                            className="rounded-circle border border-3 border-light mb-3"
                            alt="Profile"
                            style={{ width: '150px', height: '150px', objectFit: 'cover' }}
                          />
                          <div className="input-group">
                            <span className="input-group-text">
                              <i className="bi bi-image-fill"></i>
                            </span>
                            <input
                              type="text"
                              name="profilePicture"
                              className="form-control"
                              value={formData.profilePicture}
                              onChange={handleChange}
                              placeholder="Enter image URL"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="form-label fw-semibold">Gender</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-gender-ambiguous"></i>
                          </span>
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
                      </div>

                      <div className="form-check mb-4">
                        <input
                          type="checkbox"
                          name="genderPrivacy"
                          className="form-check-input"
                          checked={formData.genderPrivacy}
                          onChange={handleChange}
                          id="genderPrivacy"
                        />
                        <label className="form-check-label" htmlFor="genderPrivacy">
                          Keep gender private
                        </label>
                      </div>
                    </div>

                    {/* Bio Section */}
                    <div className="col-12">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Bio</label>
                        <textarea
                          name="bio"
                          className="form-control"
                          value={formData.bio}
                          onChange={handleChange}
                          rows="4"
                          placeholder="Tell us about yourself..."
                        />
                      </div>
                    </div>

                    {/* Social Links Section */}
                    <div className="col-md-6">
                      <div className="mb-4">
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
                            placeholder="https://facebook.com/username"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-4">
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
                            placeholder="https://linkedin.com/in/username"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-4">
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
                            placeholder="https://github.com/username"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Portfolio URL</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-globe2"></i>
                          </span>
                          <input
                            type="text"
                            name="portfolio"
                            className="form-control"
                            value={formData.portfolio}
                            onChange={handleChange}
                            placeholder="https://yourportfolio.com"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Skills & Interests Section */}
                    <div className="col-md-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Skills</label>
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
                            placeholder="e.g., JavaScript, Python, Design"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Interests</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-heart-fill"></i>
                          </span>
                          <input
                            type="text"
                            name="interests"
                            className="form-control"
                            value={formData.interests}
                            onChange={handleChange}
                            placeholder="e.g., Coding, AI, Photography"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Education & Experience Section */}
                    <div className="col-md-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Education</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-mortarboard-fill"></i>
                          </span>
                          <input
                            type="text"
                            name="education"
                            className="form-control"
                            value={formData.education}
                            onChange={handleChange}
                            placeholder="e.g., University of XYZ, Computer Science"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="col-md-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Work Experience</label>
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
                            placeholder="e.g., Software Engineer at ABC Corp"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Additional Information Section */}
                    <div className="col-md-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Languages</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-translate"></i>
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
                    </div>

                    <div className="col-md-6">
                      <div className="mb-4">
                        <label className="form-label fw-semibold">Preferred Topics</label>
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
                            placeholder="e.g., Technology, Science, Art"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
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