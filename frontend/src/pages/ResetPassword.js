import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const API_ORIGIN = process.env.REACT_APP_API_URL || window.location.origin;
const API_URL = `${API_ORIGIN}/api`;

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const token = sp.get('token') || '';

  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr(''); setMsg('');
    if (!token) return setErr('Missing reset token');
    if (pwd.length < 6) return setErr('Password must be at least 6 characters');
    if (pwd !== confirm) return setErr('Passwords do not match');

    try {
      const res = await fetch(`${API_URL}/auth/reset-password/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ newPassword: pwd }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || 'Failed to reset password');
      setMsg('Password reset successful. Redirecting to login…');
      setTimeout(() => nav('/login'), 1500);
    } catch (e2) {
      setErr(e2.message);
    }
  }

  return (
    <div className="container py-5">
      <div className="card shadow rounded-4 mx-auto" style={{maxWidth: 640}}>
        <div className="card-body p-5">
          <h2 className="mb-4 text-center">Reset Password</h2>
          {err && <div className="alert alert-danger">{err}</div>}
          {msg && <div className="alert alert-success">{msg}</div>}
          <form onSubmit={submit}>
            <div className="mb-3">
              <label className="form-label">New Password</label>
              <input className="form-control" type="password" value={pwd} onChange={(e)=>setPwd(e.target.value)} />
            </div>
            <div className="mb-4">
              <label className="form-label">Confirm Password</label>
              <input className="form-control" type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
            </div>
            <button className="btn btn-primary w-100" type="submit">Update Password</button>
          </form>
          <div className="text-center mt-3">
            <Link to="/login">Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
