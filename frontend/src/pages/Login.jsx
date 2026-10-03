import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, loginAuthorityDemo } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('An error occurred during login. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthorityDemo = async () => {
    setError('');
    setSubmitting(true);
    try {
      const res = await loginAuthorityDemo();
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Authority demo login failed.');
      }
    } catch (err) {
      setError('Failed to log in as authority.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '440px', padding: '3rem 1.5rem' }}>
      <div className="card">
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', padding: '0.75rem', backgroundColor: '#e0f2fe', color: '#0284c7', borderRadius: '50%', marginBottom: '0.75rem' }}>
            <LogIn size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Login to Raise 2 Resolve</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Access your citizen or authority account</p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }} disabled={submitting}>
            {submitting ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase' }}>OR DEMO ACCESS</span>
          <div style={{ flexGrow: 1, height: '1px', backgroundColor: '#e2e8f0' }}></div>
        </div>

        <button 
          onClick={handleAuthorityDemo} 
          className="btn btn-authority" 
          style={{ width: '100%', justifyContent: 'center' }}
          disabled={submitting}
        >
          <ShieldCheck size={18} /> Instant Authority Demo Login
        </button>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: '600' }}>Register here</Link>
        </div>
      </div>
    </div>
  );
}
