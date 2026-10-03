import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  ShieldCheck, User, LogOut, LogIn, UserPlus, 
  LayoutDashboard, Menu, X, CheckCircle2 
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, isAuthority, logout, loginAuthorityDemo } = useContext(AuthContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleAuthorityDemo = async () => {
    setMobileMenuOpen(false);
    const res = await loginAuthorityDemo();
    if (res.success) {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    setMobileMenuOpen(false);
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
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '74px'
      }}>
        
        {/* Brand Logo - 🔵 Raise 2 Resolve */}
        <Link 
          to="/" 
          onClick={() => setMobileMenuOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 50%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
            flexShrink: 0
          }}>
            <CheckCircle2 size={22} strokeWidth={2.6} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontWeight: '800',
              fontSize: '1.25rem',
              lineHeight: '1.15',
              color: '#0f172a',
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              Raise 2 Resolve
            </span>
            <span style={{
              fontSize: '0.72rem',
              color: '#0d9488',
              fontWeight: '700',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Civic Resolution Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }} className="hide-mobile">
          <Link 
            to="/" 
            style={{ color: '#334155', fontWeight: '600', fontSize: '0.925rem' }}
          >
            Home
          </Link>
          
          {isAuthenticated && (
            <Link 
              to="/dashboard" 
              style={{
                color: '#334155',
                fontWeight: '600',
                fontSize: '0.925rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <LayoutDashboard size={17} color="#2563eb" /> Dashboard
            </Link>
          )}

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#f1f5f9',
                padding: '0.4rem 0.85rem',
                borderRadius: '30px',
                border: '1px solid #e2e8f0'
              }}>
                <User size={15} color="#64748b" />
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>{user?.name}</span>
                <span className={`badge ${isAuthority ? 'badge-authority' : 'badge-citizen'}`}>
                  {user?.role}
                </span>
              </div>
              <button 
                onClick={handleLogout} 
                className="btn btn-outline" 
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Link 
                to="/login" 
                className="btn btn-outline" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
              >
                <LogIn size={16} /> Login
              </Link>
              <Link 
                to="/register" 
                className="btn btn-primary" 
                style={{ padding: '0.5rem 1.15rem', fontSize: '0.875rem' }}
              >
                <UserPlus size={16} /> Register
              </Link>
              <button 
                onClick={handleAuthorityDemo} 
                className="btn btn-authority" 
                style={{ padding: '0.5rem 1.15rem', fontSize: '0.875rem' }}
              >
                <ShieldCheck size={16} /> Demo Authority
              </button>
            </div>
          )}
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            color: '#0f172a'
          }}
          className="show-mobile"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)'
        }}>
          <Link 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0f172a', fontWeight: '600', padding: '0.5rem 0' }}
          >
            Home
          </Link>

          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: '#2563eb',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0'
                }}
              >
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#f1f5f9',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px'
              }}>
                <User size={16} color="#64748b" />
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0f172a' }}>{user?.name}</span>
                <span className={`badge ${isAuthority ? 'badge-authority' : 'badge-citizen'}`}>
                  {user?.role}
                </span>
              </div>
              <button 
                onClick={handleLogout} 
                className="btn btn-outline" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link 
                to="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-outline" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <LogIn size={16} /> Login
              </Link>
              <Link 
                to="/register" 
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-primary" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <UserPlus size={16} /> Register
              </Link>
              <button 
                onClick={handleAuthorityDemo} 
                className="btn btn-authority" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ShieldCheck size={16} /> Demo Authority Login
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
