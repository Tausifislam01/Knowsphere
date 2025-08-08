import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';

function InsightForm({ mode = 'create' }) {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    tags: '',
    visibility: 'public',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { insightId } = useParams();

  useEffect(() => {
    if (mode === 'edit' && insightId) {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to edit an insight');
        toast.error('Please log in to edit an insight', { autoClose: 2000 });
        navigate('/login');
        return;
      }

      const fetchInsight = async () => {
        setIsLoading(true);
        try {
          console.log(`Fetching insight with ID: ${insightId}`);
          const response = await fetch(`http://localhost:5000/api/insights/${insightId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
          console.log('Fetch response:', data);
          if (response.ok) {
            setFormData({
              title: data.title || '',
              body: data.body || '',
              tags: data.tags ? data.tags.join(', ') : '',
              visibility: data.visibility || 'public',
            });
            toast.success('Insight data loaded successfully', { autoClose: 2000 });
          } else {
            setError(data.message || 'Failed to fetch insight');
            toast.error(data.message || 'Failed to fetch insight', { autoClose: 2000 });
            navigate('/');
          }
        } catch (error) {
          console.error('Fetch insight exception:', error);
          setError('Error: ' + error.message);
          toast.error('Error fetching insight: ' + error.message, { autoClose: 2000 });
          navigate('/');
        } finally {
          setIsLoading(false);
        }
      };
      fetchInsight();
    }
  }, [insightId, mode, navigate]);

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.body.trim()) {
      setError('Body is required');
      return false;
    }
    if (!['public', 'private'].includes(formData.visibility)) {
      setError('Invalid visibility selection');
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to submit');
      toast.error('Please log in to submit', { autoClose: 2000 });
      setIsLoading(false);
      navigate('/login');
      return;
    }

    const tagsArray = formData.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag !== '');

    try {
      const url = mode === 'edit' && insightId 
        ? `http://localhost:5000/api/insights/${insightId}`
        : 'http://localhost:5000/api/insights';
      const method = mode === 'edit' && insightId ? 'PUT' : 'POST';
      console.log('Submitting to:', url, 'Method:', method, 'Data:', {
        title: formData.title,
        body: formData.body,
        tags: tagsArray,
        visibility: formData.visibility,
      });
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          body: formData.body,
          tags: tagsArray,
          visibility: formData.visibility,
        }),
      });
      const data = await response.json();
      console.log('Submit response:', data);
      if (response.ok) {
        toast.success(`Your insight has been ${mode === 'edit' ? 'updated' : 'created'} successfully`, { autoClose: 2000 });
        navigate('/');
      } else {
        setError(data.message || `Failed to ${mode} insight`);
        toast.error(data.message || `Failed to ${mode} insight`, { autoClose: 2000 });
      }
    } catch (error) {
      console.error('Submit insight exception:', error);
      setError('Error: ' + error.message);
      toast.error(`Error ${mode === 'edit' ? 'updating' : 'creating'} insight: ${error.message}`, { autoClose: 2000 });
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
                  <i className="bi bi-lightbulb me-2"></i>
                  {mode === 'edit' ? 'Edit Insight' : 'Create Insight'}
                </h2>
              </div>
              <div className="card-body p-4 p-md-5">
                {error && (
                  <div className="alert alert-danger d-flex align-items-center" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div>{error}</div>
                  </div>
                )}
                {isLoading && mode === 'edit' && (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <p>Loading insight...</p>
                  </div>
                )}
                {!isLoading && (
                  <form onSubmit={handleSubmit}>
                    <div className="row g-4">
                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Title <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-fonts"></i>
                          </span>
                          <input
                            type="text"
                            name="title"
                            className="form-control"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            placeholder="Enter insight title"
                          />
                        </div>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Body <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-text-paragraph"></i>
                          </span>
                          <textarea
                            name="body"
                            className="form-control"
                            value={formData.body}
                            onChange={handleChange}
                            rows="6"
                            required
                            placeholder="Share your insight..."
                          />
                        </div>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">Tags (comma-separated)</label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-tags-fill"></i>
                          </span>
                          <input
                            type="text"
                            name="tags"
                            className="form-control"
                            value={formData.tags}
                            onChange={handleChange}
                            placeholder="e.g., tech, science, ai"
                          />
                        </div>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold">
                          Visibility <span className="text-danger">*</span>
                        </label>
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="bi bi-eye-fill"></i>
                          </span>
                          <select
                            name="visibility"
                            className="form-select"
                            value={formData.visibility}
                            onChange={handleChange}
                            required
                          >
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                          </select>
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
                              {mode === 'edit' ? 'Saving...' : 'Creating...'}
                            </>
                          ) : (
                            <>
                              <i className="bi bi-save-fill me-2"></i>
                              {mode === 'edit' ? 'Save Changes' : 'Create Insight'}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsightForm;