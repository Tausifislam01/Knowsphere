import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

function InsightForm({ mode = 'create' }) {
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    tags: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    if (mode === 'edit' && id) {
      const fetchInsight = async () => {
        try {
          const response = await fetch(`http://localhost:5000/api/insights/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });
          const data = await response.json();
          if (response.ok) {
            setFormData({
              title: data.title || '',
              body: data.body || '',
              tags: data.tags || '',
            });
          } else {
            setError(data.message || 'Failed to fetch insight');
            navigate('/profile');
          }
        } catch (error) {
          setError('Error: ' + error.message);
          navigate('/profile');
        }
      };
      fetchInsight();
    }
  }, [id, mode, navigate]);

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (!formData.body.trim()) {
      setError('Body is required');
      return false;
    }
    return true;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      const url = mode === 'edit' && id 
        ? `http://localhost:5000/api/insights/${id}`
        : 'http://localhost:5000/api/insights';
      const method = mode === 'edit' && id ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
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
        setError(data.message || `Failed to ${mode} insight`);
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="card shadow-sm p-4">
        <h2 className="mb-4">{mode === 'edit' ? 'Edit Insight' : 'Create Insight'}</h2>
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
            <div className="col-12">
              <label className="form-label">Title <span className="text-danger">*</span></label>
              <input
                type="text"
                name="title"
                className="form-control"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Body <span className="text-danger">*</span></label>
              <textarea
                name="body"
                className="form-control"
                value={formData.body}
                onChange={handleChange}
                rows="6"
                required
              />
            </div>
            <div className="col-12">
              <label className="form-label">Tags (comma-separated)</label>
              <input
                type="text"
                name="tags"
                className="form-control"
                value={formData.tags}
                onChange={handleChange}
                placeholder="e.g., tech, science"
              />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary w-100">
                <i className="bi bi-save me-2"></i> {mode === 'edit' ? 'Save Changes' : 'Create Insight'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default InsightForm;