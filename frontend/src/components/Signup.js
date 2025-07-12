import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        navigate('/login');
      } else {
        setError(data.message || 'Signup failed');
      }
    } catch (error) {
      setError('Error: ' + error.message);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-light">
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-lg border-0 rounded-4">
              <div className="card-body p-5">
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary">Create Your Account</h2>
                  <p className="text-muted">Join our community to share your insights</p>
                </div>

                {error && (
                  <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    {error}
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setError('')}
                    ></button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="needs-validation" noValidate>
                  <div className="mb-4">
                    <label htmlFor="username" className="form-label fw-semibold">Username</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-person-fill text-muted"></i>
                      </span>
                      <input
                        id="username"
                        type="text"
                        className="form-control py-2"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="Enter your username"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="email" className="form-label fw-semibold">Email</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-envelope-fill text-muted"></i>
                      </span>
                      <input
                        id="email"
                        type="email"
                        className="form-control py-2"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="form-label fw-semibold">Password</label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-lock-fill text-muted"></i>
                      </span>
                      <input
                        id="password"
                        type="password"
                        className="form-control py-2"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Create a password"
                      />
                    </div>
                    <div className="form-text">Use 8 or more characters with a mix of letters, numbers & symbols</div>
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-100 py-2 fw-semibold rounded-3 mt-2"
                  >
                    Sign Up
                  </button>
                </form>

                <div className="text-center mt-4">
                  <p className="text-muted">
                    Already have an account?{' '}
                    <a 
                      href="/login" 
                      className="text-primary fw-semibold text-decoration-none"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/login');
                      }}
                    >
                      Log in
                    </a>
                  </p>
                </div>

                <div className="d-flex align-items-center my-4">
                  <hr className="flex-grow-1" />
                  <span className="px-3 text-muted">or</span>
                  <hr className="flex-grow-1" />
                </div>

                <div className="d-grid gap-3">
                  <button className="btn btn-outline-primary rounded-3 py-2">
                    <i className="bi bi-google me-2"></i>
                    Continue with Google
                  </button>
                  <button className="btn btn-outline-dark rounded-3 py-2">
                    <i className="bi bi-github me-2"></i>
                    Continue with GitHub
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;