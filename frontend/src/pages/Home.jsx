import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  ThumbsUp, ShieldCheck, MapPin, Clock, AlertCircle, PlusCircle, 
  Sparkles, Zap, Info, Shield, CheckCircle2, ArrowRight, Activity, Users, Building2 
} from 'lucide-react';
import ComplaintDetailsModal from '../components/ComplaintDetailsModal';

export default function Home() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalId, setActiveModalId] = useState(null);

  const { isAuthenticated, loginAuthorityDemo, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchComplaints = async () => {
    try {
      const res = await fetch('/api/complaints');
      const data = await res.json();
      if (data.success) {
        setComplaints(data.data);
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  const handleSupport = async (id) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const res = await fetch(`/api/complaints/${id}/support`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        fetchComplaints();
      }
    } catch (err) {
      console.error('Error supporting complaint:', err);
    }
  };

  const handleDemoAuth = async () => {
    const res = await loginAuthorityDemo();
    if (res.success) {
      navigate('/dashboard');
    }
  };

  // Stats derived from complaints
  const totalReported = complaints.length;
  const totalResolved = complaints.filter(c => c.status === 'resolved').length;
  const totalUpvotes = complaints.reduce((sum, c) => sum + (c.support_count || 0), 0);

  const getPriorityBadgeStyle = (score) => {
    if (score >= 65) return { bg: '#dc2626', text: 'Urgent' };
    if (score >= 45) return { bg: '#ea580c', text: 'High' };
    return { bg: '#2563eb', text: 'Normal' };
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      
      {/* HERO BANNER - Professional Blue/White Theme */}
      <section style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #2563eb 100%)',
        color: 'white',
        padding: '5rem 0 4.5rem 0',
        marginBottom: '3rem',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)'
      }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '880px' }}>
          
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(8px)',
            color: '#ffffff',
            padding: '0.4rem 1.2rem',
            borderRadius: '30px',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.25)'
          }}>
            <Sparkles size={16} color="#60a5fa" /> BUILDION Hackathon Civic Platform
          </div>

          <h1 style={{
            fontSize: '3.25rem',
            fontWeight: '900',
            lineHeight: '1.15',
            letterSpacing: '-0.02em',
            marginBottom: '1.25rem'
          }}>
            Report. Prioritize. Resolve.
          </h1>

          <p style={{
            fontSize: '1.2rem',
            color: '#cbd5e1',
            lineHeight: '1.6',
            marginBottom: '2.5rem',
            maxWidth: '740px',
            margin: '0 auto 2.5rem auto'
          }}>
            Empowering citizens to report municipal issues with instant photo evidence while using automated priority scoring to help civic authorities act fast.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', backgroundColor: '#ffffff', color: '#1e3a8a' }}>
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', backgroundColor: '#ffffff', color: '#1e3a8a' }}>
                  Register as Citizen
                </Link>
                <button onClick={handleDemoAuth} className="btn btn-authority" style={{ padding: '0.85rem 2rem', fontSize: '1.05rem', backgroundColor: '#7c3aed' }}>
                  <ShieldCheck size={20} /> Quick Authority Demo Login
                </button>
              </>
            )}
          </div>

          {/* STATS HIGHLIGHT COUNTER */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1.5rem',
            marginTop: '3.5rem',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(10px)',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#ffffff' }}>{totalReported}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <Building2 size={14} /> Issues Logged
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#60a5fa' }}>{totalUpvotes}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <ThumbsUp size={14} /> Community Upvotes
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#4ade80' }}>{totalResolved}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                <CheckCircle2 size={14} /> Issues Resolved
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* THREE VALUE PROPOSITIONS GRID */}
      <div className="container" style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          <div className="card card-hover" style={{ backgroundColor: '#ffffff', borderTop: '4px solid #2563eb' }}>
            <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.75rem', borderRadius: '10px', width: 'fit-content', marginBottom: '1rem' }}>
              <PlusCircle size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>1. Report Issue</h3>
            <p style={{ color: '#64748b', fontSize: '0.925rem' }}>
              Submit civic problems (potholes, streetlights, drainage) with location details & photo evidence.
            </p>
          </div>

          <div className="card card-hover" style={{ backgroundColor: '#ffffff', borderTop: '4px solid #7c3aed' }}>
            <div style={{ backgroundColor: '#f3e8ff', color: '#7c3aed', padding: '0.75rem', borderRadius: '10px', width: 'fit-content', marginBottom: '1rem' }}>
              <Zap size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>2. Prioritize</h3>
            <p style={{ color: '#64748b', fontSize: '0.925rem' }}>
              Algorithmic scoring ranks issues based on severity, category impact, and community upvotes.
            </p>
          </div>

          <div className="card card-hover" style={{ backgroundColor: '#ffffff', borderTop: '4px solid #16a34a' }}>
            <div style={{ backgroundColor: '#d1fae5', color: '#16a34a', padding: '0.75rem', borderRadius: '10px', width: 'fit-content', marginBottom: '1rem' }}>
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>3. Resolve</h3>
            <p style={{ color: '#64748b', fontSize: '0.925rem' }}>
              Municipal authorities inspect, verify, and post status updates with step-by-step progress tracking.
            </p>
          </div>
        </div>
      </div>

      {/* COMMUNITY ISSUES FEED */}
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>Active Community Feed</h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Sorted automatically by Priority Score</p>
          </div>
          {isAuthenticated && (
            <Link to="/dashboard" className="btn btn-primary">
              <PlusCircle size={18} /> Report New Issue
            </Link>
          )}
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="spinner" style={{ marginBottom: '1rem' }}></div>
            <p style={{ color: '#64748b', fontWeight: '500' }}>Loading community issues...</p>
          </div>
        ) : complaints.length === 0 ? (
          /* EMPTY STATE */
          <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
            <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '1rem', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1rem auto' }}>
              <Building2 size={36} />
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '0.5rem' }}>No Issues Reported Yet</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
              Be the first citizen to report a civic issue in your locality.
            </p>
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary">Report an Issue Now</Link>
            ) : (
              <Link to="/register" className="btn btn-primary">Register Account</Link>
            )}
          </div>
        ) : (
          /* ISSUE CARDS GRID */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {complaints.map((c) => {
              const priorityInfo = getPriorityBadgeStyle(c.priority_score || 0);
              return (
                <div key={c.id} className="card card-hover" style={{ display: 'flex', flexDirection: 'column' }}>
                  
                  {/* Badges Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`badge badge-${c.status}`}>{c.status.replace('_', ' ')}</span>
                      
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        color: 'white',
                        backgroundColor: priorityInfo.bg,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        <Zap size={11} /> Score {c.priority_score || 0}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.825rem', fontWeight: '700', color: '#2563eb' }}>
                      {c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.4rem', color: '#0f172a' }}>{c.title}</h3>
                  <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '0.875rem', flexGrow: 1, lineHeight: '1.5' }}>{c.description}</p>

                  {/* Priority Reason Banner */}
                  {c.priority_reason && (
                    <div style={{ fontSize: '0.775rem', color: '#1e40af', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', padding: '0.35rem 0.65rem', borderRadius: '6px', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Info size={13} color="#2563eb" /> {c.priority_reason}
                    </div>
                  )}

                  {/* Metadata info */}
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <MapPin size={14} color="#2563eb" /> <strong>Location:</strong> {c.location}
                    </div>
                    <div><strong>Category:</strong> {c.category}</div>
                  </div>

                  {/* Card Actions Footer */}
                  <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button 
                      onClick={() => handleSupport(c.id)} 
                      className="btn btn-outline" 
                      style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                    >
                      <ThumbsUp size={14} /> Upvote ({c.support_count || 0})
                    </button>
                    <button 
                      onClick={() => setActiveModalId(c.id)}
                      style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '700' }}
                    >
                      Details &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeModalId && (
        <ComplaintDetailsModal
          complaintId={activeModalId}
          onClose={() => setActiveModalId(null)}
          token={token}
          onSupportToggle={() => fetchComplaints()}
        />
      )}
    </div>
  );
}
