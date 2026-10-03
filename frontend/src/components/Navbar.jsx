import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Shield, User, LogOut, LogIn, UserPlus, Building2, LayoutDashboard } from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAuthority, logout, loginAuthorityDemo } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleAuthorityDemo = async () => {
    const res = await loginAuthorityDemo();
    if (res.success) {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header style={{
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '72px' }}>
        
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
            padding: '0.55rem',
            borderRadius: '10px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            boxShadow: '0 2px 5px rgba(37, 99, 235, 0.3)'
          }}>
            <Building2 size={24} />
          </div>
          <div>
            <div style={{ fontWeight: '900', fontSize: '1.25rem', lineHeight: '1.1', color: '#0f172a', letterSpacing: '-0.01em' }}>
              BUILDION
            </div>
            <div style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: '700', letterSpacing: '0.02em' }}>
              Raise 2 Resolve
            </div>
          </div>
        </Link>

        {/* Navigation Actions */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link to="/" style={{ color: '#475569', fontWeight: '600', fontSize: '0.925rem' }}>Home</Link>
          
          {isAuthenticated && (
            <Link to="/dashboard" style={{ color: '#475569', fontWeight: '600', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <LayoutDashboard size={16} /> Dashboard
            </Link>
          )}

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.4rem 0.85rem', borderRadius: '30px' }}>
                <User size={16} color="#64748b" />
                <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0f172a' }}>{user?.name}</span>
                <span className={`badge ${isAuthority ? 'badge-authority' : 'badge-citizen'}`}>
                  {user?.role}
                </span>
              </div>
              <button onClick={handleLogout} className="btn btn-outline" style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}>
                <LogOut size={16} /> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Link to="/login" className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                <LogIn size={16} /> Login
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                <UserPlus size={16} /> Register
              </Link>
              <button onClick={handleAuthorityDemo} className="btn btn-authority" style={{ padding: '0.5rem 1rem' }}>
                <Shield size={16} /> Demo Authority
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
