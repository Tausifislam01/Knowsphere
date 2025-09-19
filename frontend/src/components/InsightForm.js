import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { suggestTags } from '../utils/api';


const API_ORIGIN = process.env.REACT_APP_API_URL || window.location.origin;
const API_URL = `${API_ORIGIN}/api`;

function InsightForm({ mode = 'create' }) {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    tags: '',
    visibility: 'public',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
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
          const response = await fetch(`${API_URL}/insights/${insightId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          const data = await response.json();
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

  const handleSuggestTags = async () => {
    setIsSuggesting(true);
    setError('');
    try {
      const content = `${formData.title} ${formData.body}`.trim();
      if (!content) {
        throw new Error('Title or body is required to suggest tags');
      }
      const tags = await suggestTags(content);
      setFormData({ ...formData, tags: tags.join(', ') });
      toast.success('Tags suggested successfully!', { autoClose: 2000 });
    } catch (error) {
      setError(error.message);
      toast.error(error.message, { autoClose: 2000 });
    } finally {
      setIsSuggesting(false);
    }
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

    const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    try {
      const response = await fetch(`${API_URL}/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          body: formData.body,
          visibility: formData.visibility,
          tags: tagsArray,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success('Insight created successfully!', { autoClose: 2000 });
        navigate('/');
      } else {
        setError(data.message || 'Failed to create insight');
        toast.error(data.message || 'Failed to create insight', { autoClose: 2000 });
      }
    } catch (error) {
      setError('Error: ' + error.message);
      toast.error('Error creating insight: ' + error.message, { autoClose: 2000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container my-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow-sm p-4">
            <h2 className="text-center mb-4 fw-bold">
              {mode === 'edit' ? 'Edit Insight' : 'Create New Insight'}
            </h2>
            {error && <div className="alert alert-danger">{error}</div>}
            {isLoading ? (
              <div className="text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label fw-semibold">Title <span className="text-danger">*</span></label>
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="bi bi-type-h1"></i>
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
                    <label className="form-label fw-semibold">Content <span className="text-danger">*</span></label>
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
                        placeholder="e.g., neural networks, machine learning, data-driven"
                      />
                    </div>
                    <button
                      type="button"
                      className="glossy-button btn btn-sm mt-2"
                      onClick={handleSuggestTags}
                      disabled={isSuggesting || (!formData.title && !formData.body)}
                    >
                      {isSuggesting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>Suggesting...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-magic me-2"></i>Suggest Tags (AI)
                        </>
                      )}
                    </button>
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
  );
}

export default InsightForm;