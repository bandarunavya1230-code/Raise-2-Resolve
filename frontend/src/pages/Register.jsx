import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await register(name, email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError('An error occurred during registration. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '460px', padding: '3.5rem 1.5rem' }}>
      <div className="card" style={{ padding: '2rem 1.75rem', border: '1px solid #e2e8f0', boxShadow: 'var(--shadow-md)' }}>
        
        {/* Header with 🔵 Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <img
            src="/logo.jpg"
            alt="Raise 2 Resolve Logo"
            referrerPolicy="no-referrer"
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '16px',
              objectFit: 'cover',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.25)',
              border: '2.5px solid #BFDBFE',
              margin: '0 auto 1rem auto',
              display: 'block'
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            lineHeight: '1',
            letterSpacing: '-0.02em',
            marginBottom: '0.4rem'
          }}>
            <span style={{
              fontWeight: '900',
              fontSize: '1.45rem',
              color: '#0F172A',
              letterSpacing: '-0.02em'
            }}>
              RAISE
            </span>
            <span style={{
              fontWeight: '950',
              fontSize: '2.3rem',
              color: '#2563EB',
              lineHeight: '0.8',
              display: 'inline-block',
              margin: '0',
              padding: '0 1px',
              transform: 'translateY(-1px)'
            }}>
              2
            </span>
            <span style={{
              fontWeight: '900',
              fontSize: '1.45rem',
              color: '#0284C7',
              letterSpacing: '-0.02em'
            }}>
              RESOLVE
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Join our civic network to report and upvote community issues
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              className="form-control"
              placeholder="e.g. Maria Gonzalez"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="citizen@example.org"
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
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-control"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem', padding: '0.75rem' }} 
            disabled={submitting}
          >
            {submitting ? 'Creating Citizen Account...' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: '#64748b' }}>
          Already have an account? <Link to="/login" style={{ fontWeight: '700', color: '#2563eb' }}>Sign in here</Link>
        </div>
      </div>
    </div>
  );
}
