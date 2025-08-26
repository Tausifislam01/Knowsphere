// frontend/src/components/ReportButton.js
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { reportContent } from '../utils/api';

const ReportButton = ({ itemId, itemType, currentUser, onClose }) => {
  const [isReporting, setIsReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [error, setError] = useState('');

  if (!currentUser) return null;

  const handleReport = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('Please log in to report content', { autoClose: 2000 });
      setShowForm(false);
      onClose && onClose();
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a reason for reporting');
      toast.error('Please provide a reason for reporting', { autoClose: 2000 });
      return;
    }

    setIsReporting(true);
    try {
      await reportContent(itemType, itemId, reason);
      toast.success('Report submitted successfully', { autoClose: 2000 });
      setShowForm(false);
      setReason('');
      setError('');
      onClose && onClose();
    } catch (err) {
      console.error('Report submission error:', err);
      setError(`Error submitting report: ${err.message}`);
      toast.error(`Error submitting report: ${err.message}`, { autoClose: 2000 });
    } finally {
      setIsReporting(false);
    }
  };

  if (!showForm) return null;

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
      onClick={() => {
        setShowForm(false);
        onClose && onClose();
      }}
    >
      <div
        className="card glossy-card p-4"
        style={{ maxWidth: '500px', width: '90%' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="card-header bg-warning text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Report {itemType}</h5>
          <button
            type="button"
            className="btn-close"
            onClick={() => {
              setShowForm(false);
              onClose && onClose();
            }}
            aria-label="Close"
          />
        </div>
        <form onSubmit={handleReport}>
          <div className="card-body">
            <p>Please provide a reason for reporting this {itemType.toLowerCase()}.</p>
            <textarea
              className={`form-control ${error ? 'is-invalid' : ''}`}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              placeholder="Enter reason for report."
              rows="4"
              autoFocus
              required
              aria-describedby="reasonError"
            />
            {error && <div id="reasonError" className="invalid-feedback d-block">{error}</div>}
          </div>
          <div className="card-footer d-flex justify-content-end">
            <button
              type="button"
              className="glossy-button bg-secondary me-2"
              onClick={() => {
                setShowForm(false);
                onClose && onClose();
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glossy-button bg-warning"
              disabled={isReporting}
            >
              {isReporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportButton;