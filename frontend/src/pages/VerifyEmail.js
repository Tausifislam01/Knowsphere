import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const API_ORIGIN = process.env.REACT_APP_API_URL || window.location.origin;
const API_URL = `${API_ORIGIN}/api`;

export default function VerifyEmail() {
  const [sp] = useSearchParams();
  const [state, setState] = useState({ loading: true, ok: false, msg: '' });

  useEffect(() => {
    const token = sp.get('token');
    if (!token) return setState({ loading: false, ok: false, msg: 'Missing token' });
    fetch(`${API_URL}/auth/verify-email/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (r.ok) setState({ loading: false, ok: true, msg: j.message || 'Email verified' });
        else setState({ loading: false, ok: false, msg: j.message || 'Verification failed' });
      })
      .catch((e) => setState({ loading: false, ok: false, msg: e.message }));
  }, [sp]);

  if (state.loading) return <div style={{padding:'4rem', textAlign:'center'}}>Verifying…</div>;

  return (
    <div className="container py-5">
      <div className="card shadow rounded-4 mx-auto" style={{maxWidth: 640}}>
        <div className="card-body text-center p-5">
          <h2 className="mb-4">Email Verification</h2>
          <div className={`alert ${state.ok ? 'alert-success' : 'alert-danger'}`}>
            {state.msg}
          </div>
          <Link to="/login" className="btn btn-primary">Go to login</Link>
        </div>
      </div>
    </div>
  );
}
