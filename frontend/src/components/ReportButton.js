import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { reportContent } from '../utils/api';

const ReportButton = ({ itemId, itemType, currentUser }) => {
  const [isReporting, setIsReporting] = useState(false);
  const [reason, setReason] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleReport = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      toast.error('Please log in to report content', { autoClose: 2000 });
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide a reason for reporting', { autoClose: 2000 });
      return;
    }

    setIsReporting(true);
    try {
      await reportContent(itemType, itemId, reason);
      toast.success('Report submitted successfully', { autoClose: 2000 });
      setShowForm(false);
      setReason('');
    } catch (error) {
      console.error('Report submission error:', error);
      toast.error(`Error submitting report: ${error.message}`, { autoClose: 2000 });
    } finally {
      setIsReporting(false);
    }
  };

  if (!currentUser) return null;

  return (
    <>
      <button
        className="dropdown-item"
        onClick={() => setShowForm(true)}
      >
        <i className="bi bi-flag me-2"></i>Report
      </button>
      {showForm && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          onClick={() => setShowForm(false)}
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
                onClick={() => setShowForm(false)}
              />
            </div>
            <form onSubmit={handleReport}>
              <div className="card-body">
                <p>Please provide a reason for reporting this {itemType.toLowerCase()}.</p>
                <textarea
                  className="form-control"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Enter reason for report..."
                  rows="4"
                  required
                />
              </div>
              <div className="card-footer d-flex justify-content-end">
                <button
                  type="button"
                  className="glossy-button bg-secondary me-2"
                  onClick={() => setShowForm(false)}
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
      )}
    </>
  );
};

export default ReportButton;