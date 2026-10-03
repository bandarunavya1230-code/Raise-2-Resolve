import React, { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  ShieldCheck, User, LogOut, LogIn, UserPlus, 
  LayoutDashboard, Menu, X, CheckCircle2, Compass, Building2 
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
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #E2E8F0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '84px'
      }}>
        
        {/* Brand Logo - 🔵 RAISE2RESOLVE */}
        <Link 
          to="/" 
          onClick={() => setMobileMenuOpen(false)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', textDecoration: 'none' }}
        >
          <img
            src="/logo.jpg"
            alt="Raise 2 Resolve Logo"
            referrerPolicy="no-referrer"
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '14px',
              objectFit: 'cover',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
              border: '2.5px solid #BFDBFE',
              flexShrink: 0
            }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              lineHeight: '1',
              letterSpacing: '-0.02em'
            }}>
              <span style={{
                fontWeight: '900',
                fontSize: '1.45rem',
                color: '#0F172A',
                letterSpacing: '-0.02em',
                lineHeight: '1'
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
                letterSpacing: '-0.02em',
                lineHeight: '1'
              }}>
                RESOLVE
              </span>
            </div>
            <span style={{
              fontSize: '0.72rem',
              color: '#0D9488',
              fontWeight: '800',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginTop: '0.2rem'
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

          <a 
            href="/#find-authority" 
            style={{ color: '#334155', fontWeight: '600', fontSize: '0.925rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Compass size={16} color="#0284C7" /> Find Authority
          </a>
          
          {isAuthenticated && (
            <Link 
              to="/dashboard" 
              style={{
                color: '#2563EB',
                fontWeight: '700',
                fontSize: '0.925rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#EFF6FF',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px'
              }}
            >
              <LayoutDashboard size={17} /> Dashboard
            </Link>
          )}

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#F8FAFC',
                padding: '0.35rem 0.85rem',
                borderRadius: '30px',
                border: '1px solid #E2E8F0'
              }}>
                <User size={15} color="#64748B" />
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0F172A' }}>{user?.name}</span>
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
                <ShieldCheck size={16} /> Authority Demo
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
            color: '#0F172A'
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
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <Link 
            to="/" 
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0F172A', fontWeight: '600', padding: '0.4rem 0' }}
          >
            Home
          </Link>

          <a 
            href="/#find-authority" 
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#0F172A', fontWeight: '600', padding: '0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Compass size={17} color="#0284C7" /> Find Authority Near Me
          </a>

          {isAuthenticated ? (
            <>
              <Link 
                to="/dashboard" 
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  color: '#2563EB',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0'
                }}
              >
                <LayoutDashboard size={18} /> Dashboard
              </Link>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#F8FAFC',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #E2E8F0'
              }}>
                <User size={16} color="#64748B" />
                <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#0F172A' }}>{user?.name}</span>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', paddingTop: '0.5rem' }}>
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
                <UserPlus size={16} /> Register as Citizen
              </Link>
              <button 
                onClick={handleAuthorityDemo} 
                className="btn btn-authority" 
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <ShieldCheck size={16} /> Quick Authority Demo
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
