import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  ThumbsUp, ShieldCheck, MapPin, Clock, AlertCircle, PlusCircle, 
  CheckCircle2, ArrowRight, Activity, Users, Building2, Search, 
  Filter, Shield, Zap, FileText, Check, ChevronRight, Eye, ArrowUpRight
} from 'lucide-react';
import ComplaintDetailsModal from '../components/ComplaintDetailsModal';

export default function Home() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalId, setActiveModalId] = useState(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('priority'); // 'priority' | 'recent' | 'upvotes'

  // Quick Tracker input state
  const [trackQuery, setTrackQuery] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

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

  const handleQuickTrack = (e) => {
    e.preventDefault();
    setTrackError('');
    setTrackResult(null);

    const query = trackQuery.trim().toLowerCase();
    if (!query) return;

    const matched = complaints.find(c => {
      const code = (c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`).toLowerCase();
      return code.includes(query) || String(c.id) === query || c.title.toLowerCase().includes(query);
    });

    if (matched) {
      setTrackResult(matched);
    } else {
      setTrackError(`No complaint ticket found matching "${trackQuery}". Check ticket code or search community feed.`);
    }
  };

  // Stats derived dynamically
  const totalReported = complaints.length;
  const totalResolved = complaints.filter(c => c.status === 'resolved').length;
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
  const pendingCount = complaints.filter(c => c.status === 'pending').length;
  const totalUpvotes = complaints.reduce((sum, c) => sum + (c.support_count || 0), 0);
  const resolutionRate = totalReported > 0 ? Math.round((totalResolved / totalReported) * 100) : 0;

  // Filtered & Sorted complaints
  const filteredComplaints = complaints
    .filter(c => {
      const matchesSearch = 
        (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.complaint_code && c.complaint_code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCat = selectedCategory === 'All' || c.category === selectedCategory;
      const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;
      return matchesSearch && matchesCat && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return (b.priority_score || 0) - (a.priority_score || 0);
      }
      if (sortBy === 'upvotes') {
        return (b.support_count || 0) - (a.support_count || 0);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const getPriorityBadgeStyle = (score) => {
    if (score >= 65) return { bg: '#dc2626', text: 'Urgent' };
    if (score >= 45) return { bg: '#ea580c', text: 'High' };
    return { bg: '#0284c7', text: 'Normal' };
  };

  const categories = [
    'All',
    'Roads & Potholes',
    'Water Supply',
    'Waste Management',
    'Electricity & Lighting',
    'Drainage & Sewage',
    'Public Safety'
  ];

  return (
    <div style={{ paddingBottom: '4rem' }}>
      
      {/* 1. HERO SECTION - Modern Civic-Tech Navy & Blue */}
      <section style={{
        background: 'linear-gradient(135deg, #07101e 0%, #0b192c 40%, #1e3a8a 100%)',
        color: '#ffffff',
        padding: '5rem 0 4.5rem 0',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(11, 25, 44, 0.2)'
      }}>
        {/* Subtle decorative background blur glow */}
        <div style={{
          position: 'absolute',
          top: '-20%',
          right: '10%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.25) 0%, rgba(37, 99, 235, 0.1) 70%, transparent 100%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        <div className="container" style={{ textAlign: 'center', maxWidth: '920px', position: 'relative', zIndex: 2 }}>
          
          {/* Civic Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(13, 148, 136, 0.2)',
            backdropFilter: 'blur(10px)',
            color: '#2dd4bf',
            padding: '0.45rem 1.25rem',
            borderRadius: '9999px',
            fontSize: '0.85rem',
            fontWeight: '700',
            marginBottom: '1.75rem',
            border: '1px solid rgba(45, 212, 191, 0.35)',
            letterSpacing: '0.02em'
          }}>
            <ShieldCheck size={17} /> Public Civic Issue Resolution Platform
          </div>

          {/* Hero Heading */}
          <h1 style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
            fontWeight: '900',
            lineHeight: '1.15',
            letterSpacing: '-0.03em',
            marginBottom: '1.35rem',
            color: '#ffffff'
          }}>
            Report. Prioritize. Resolve.
          </h1>

          {/* Supporting Message */}
          <p style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            color: '#cbd5e1',
            lineHeight: '1.6',
            marginBottom: '2.5rem',
            maxWidth: '760px',
            margin: '0 auto 2.5rem auto'
          }}>
            Citizens can easily report local infrastructure issues with photo evidence, upvote nearby complaints, and track municipal resolution step-by-step with real-time updates.
          </p>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {isAuthenticated ? (
              <Link 
                to="/dashboard" 
                className="btn btn-primary" 
                style={{
                  padding: '0.85rem 2rem',
                  fontSize: '1.05rem',
                  backgroundColor: '#ffffff',
                  color: '#1e3a8a',
                  border: 'none',
                  fontWeight: '700'
                }}
              >
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link 
                  to="/register" 
                  className="btn btn-primary" 
                  style={{
                    padding: '0.85rem 2.2rem',
                    fontSize: '1.05rem',
                    backgroundColor: '#ffffff',
                    color: '#0f172a',
                    border: 'none',
                    fontWeight: '700',
                    boxShadow: '0 4px 14px rgba(255, 255, 255, 0.2)'
                  }}
                >
                  <PlusCircle size={19} color="#2563eb" /> Register as Citizen
                </Link>

                <button 
                  onClick={handleDemoAuth} 
                  className="btn btn-authority" 
                  style={{
                    padding: '0.85rem 1.85rem',
                    fontSize: '1.05rem',
                    fontWeight: '700',
                    backgroundColor: '#0284c7'
                  }}
                >
                  <ShieldCheck size={19} /> Quick Authority Demo Login
                </button>
              </>
            )}

            <a 
              href="#track-section" 
              className="btn btn-outline" 
              style={{
                padding: '0.85rem 1.75rem',
                fontSize: '1.05rem',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                color: '#ffffff'
              }}
            >
              <Search size={18} /> Track an Issue
            </a>
          </div>

          {/* Quick Metrics Bar in Hero */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1.25rem',
            marginTop: '3.5rem',
            backgroundColor: 'rgba(11, 25, 44, 0.65)',
            backdropFilter: 'blur(12px)',
            padding: '1.5rem 2rem',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.12)'
          }}>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#ffffff' }}>{totalReported}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <Building2 size={15} color="#38bdf8" /> Total Reported
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#38bdf8' }}>{totalUpvotes}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <ThumbsUp size={15} color="#38bdf8" /> Community Upvotes
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#34d399' }}>{totalResolved}</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <CheckCircle2 size={15} color="#34d399" /> Resolved Issues
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '800', color: '#f59e0b' }}>{resolutionRate}%</div>
              <div style={{ fontSize: '0.85rem', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                <Activity size={15} color="#f59e0b" /> Resolution Rate
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="container" style={{ padding: '4.5rem 1.5rem 2.5rem 1.5rem' }}>
        <div className="section-header">
          <div className="section-tag">
            <CheckCircle2 size={14} /> Step-by-Step Workflow
          </div>
          <h2 className="section-title">How Raise 2 Resolve Works</h2>
          <p className="section-subtitle">
            An automated, community-driven resolution loop connecting everyday citizens directly with municipal response teams.
          </p>
        </div>

        {/* 4 Process Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem',
          position: 'relative'
        }}>
          {/* Step 1 */}
          <div className="card card-hover" style={{ borderTop: '4px solid #2563eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: '900', color: '#2563eb', opacity: 0.25 }}>01</span>
              <div style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.65rem', borderRadius: '10px' }}>
                <PlusCircle size={22} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>1. Raise</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.55' }}>
              Citizens submit local issues (potholes, water leaks, broken lights) with photos and landmark location details.
            </p>
          </div>

          {/* Step 2 */}
          <div className="card card-hover" style={{ borderTop: '4px solid #0d9488' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: '900', color: '#0d9488', opacity: 0.25 }}>02</span>
              <div style={{ backgroundColor: '#f0fdfa', color: '#0d9488', padding: '0.65rem', borderRadius: '10px' }}>
                <Search size={22} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>2. Review</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.55' }}>
              The system automatically calculates GIS map coordinates and checks for similar nearby issues to avoid duplicate tickets.
            </p>
          </div>

          {/* Step 3 */}
          <div className="card card-hover" style={{ borderTop: '4px solid #0284c7' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: '900', color: '#0284c7', opacity: 0.25 }}>03</span>
              <div style={{ backgroundColor: '#f0f9ff', color: '#0284c7', padding: '0.65rem', borderRadius: '10px' }}>
                <Zap size={22} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>3. Prioritize</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.55' }}>
              Algorithmic scoring ranks urgency based on severity level, category safety impact, and community neighbor upvotes.
            </p>
          </div>

          {/* Step 4 */}
          <div className="card card-hover" style={{ borderTop: '4px solid #16a34a' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem', fontWeight: '900', color: '#16a34a', opacity: 0.25 }}>04</span>
              <div style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '0.65rem', borderRadius: '10px' }}>
                <CheckCircle2 size={22} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem' }}>4. Resolve</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: '1.55' }}>
              Municipal authorities dispatch field units, log official updates, and notify citizens when the problem is solved.
            </p>
          </div>
        </div>
      </section>

      {/* 3. FOUR HOMEPAGE SECTIONS: Raise, Track, Upvotes, Resolution */}
      <section style={{ backgroundColor: '#f8fafc', padding: '3.5rem 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container">
          
          <div className="section-header">
            <div className="section-tag" style={{ backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
              <Building2 size={14} /> Core Civic Capabilities
            </div>
            <h2 className="section-title">Everything You Need for Civic Action</h2>
            <p className="section-subtitle">
              Comprehensive tools built for both active community residents and municipal administration teams.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: '1.5rem' }}>
            
            {/* PILLAR 1: Raise a Complaint */}
            <div className="card card-hover" style={{ backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <PlusCircle size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.65rem' }}>Raise a Complaint</h3>
              <p style={{ color: '#64748b', fontSize: '0.925rem', lineHeight: '1.6', marginBottom: '1.25rem', flexGrow: 1 }}>
                Submit civic grievances with photo evidence, precise landmark locations, category tagging, and severity indicators in under 60 seconds.
              </p>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <Link to={isAuthenticated ? "/dashboard" : "/register"} className="btn btn-primary" style={{ width: '100%', fontSize: '0.875rem' }}>
                  <PlusCircle size={16} /> File a Civic Complaint
                </Link>
              </div>
            </div>

            {/* PILLAR 2: Track Complaint */}
            <div id="track-section" className="card card-hover" style={{ backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#f0fdfa',
                color: '#0d9488',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Search size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.65rem' }}>Track Complaint</h3>
              <p style={{ color: '#64748b', fontSize: '0.925rem', lineHeight: '1.6', marginBottom: '1rem', flexGrow: 1 }}>
                Follow step-by-step progress using unique ticket IDs (e.g. <code>R2R-2026-0001</code>) with inspection milestones and official remarks.
              </p>
              
              {/* Quick Tracker Form */}
              <form onSubmit={handleQuickTrack} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="Ticket code / keyword..."
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  />
                  <button type="submit" className="btn btn-teal" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
                    Track
                  </button>
                </div>
              </form>

              {trackError && (
                <div style={{ fontSize: '0.8rem', color: '#dc2626', marginTop: '0.4rem' }}>
                  {trackError}
                </div>
              )}

              {trackResult && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#f0fdfa',
                  border: '1px solid #99f6e4',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#0d9488' }}>
                      {trackResult.complaint_code || `R2R-2026-${String(trackResult.id).padStart(4, '0')}`}
                    </span>
                    <span className={`badge badge-${trackResult.status}`}>
                      {trackResult.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0f172a', marginBottom: '0.4rem' }}>
                    {trackResult.title}
                  </div>
                  <button 
                    onClick={() => setActiveModalId(trackResult.id)}
                    className="btn btn-outline"
                    style={{ width: '100%', padding: '0.35rem', fontSize: '0.8rem' }}
                  >
                    View Full Timeline &rarr;
                  </button>
                </div>
              )}
            </div>

            {/* PILLAR 3: Community Upvotes */}
            <div className="card card-hover" style={{ backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <ThumbsUp size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.65rem' }}>Community Upvotes</h3>
              <p style={{ color: '#64748b', fontSize: '0.925rem', lineHeight: '1.6', marginBottom: '1.25rem', flexGrow: 1 }}>
                Local residents vote on open community issues. Upvotes escalate the algorithm’s Priority Score, highlighting urgent blockages to city officials without duplicate tickets.
              </p>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                <a href="#community-feed" className="btn btn-outline" style={{ width: '100%', fontSize: '0.875rem' }}>
                  <ThumbsUp size={16} /> Explore & Upvote Issues
                </a>
              </div>
            </div>

            {/* PILLAR 4: Resolution Status */}
            <div className="card card-hover" style={{ backgroundColor: '#ffffff', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.65rem' }}>Resolution Status</h3>
              <p style={{ color: '#64748b', fontSize: '0.925rem', lineHeight: '1.6', marginBottom: '1.25rem', flexGrow: 1 }}>
                Transparent public auditing. View status stages: <strong>Pending</strong>, <strong>In Progress</strong>, and <strong>Resolved</strong> with official municipal remarks and timestamps.
              </p>
              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span className="badge badge-pending">Pending</span>
                <span className="badge badge-in_progress">In Progress</span>
                <span className="badge badge-resolved">Resolved</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. STATISTICS SECTION */}
      <section style={{ padding: '4.5rem 0 3.5rem 0' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag">
              <Activity size={14} /> Live City Metrics
            </div>
            <h2 className="section-title">Transparent Complaint Statistics</h2>
            <p className="section-subtitle">
              Real-time platform data reflecting community reporting activity and municipal resolution efficiency.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.5rem'
          }}>
            
            {/* Stat 1 */}
            <div className="card" style={{
              backgroundColor: '#ffffff',
              borderLeft: '5px solid #2563eb',
              padding: '1.75rem 1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Total Reported
                </span>
                <Building2 size={20} color="#2563eb" />
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a', lineHeight: '1.1' }}>
                {totalReported}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.5rem' }}>
                Civic issues logged across city sectors
              </div>
            </div>

            {/* Stat 2 */}
            <div className="card" style={{
              backgroundColor: '#ffffff',
              borderLeft: '5px solid #0284c7',
              padding: '1.75rem 1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Under Action
                </span>
                <Clock size={20} color="#0284c7" />
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0284c7', lineHeight: '1.1' }}>
                {inProgressCount + pendingCount}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.5rem' }}>
                {inProgressCount} in progress · {pendingCount} awaiting inspection
              </div>
            </div>

            {/* Stat 3 */}
            <div className="card" style={{
              backgroundColor: '#ffffff',
              borderLeft: '5px solid #16a34a',
              padding: '1.75rem 1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Resolved & Closed
                </span>
                <CheckCircle2 size={20} color="#16a34a" />
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#16a34a', lineHeight: '1.1' }}>
                {totalResolved}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.5rem' }}>
                Verified municipal fixes completed
              </div>
            </div>

            {/* Stat 4 */}
            <div className="card" style={{
              backgroundColor: '#ffffff',
              borderLeft: '5px solid #0d9488',
              padding: '1.75rem 1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Community Upvotes
                </span>
                <ThumbsUp size={20} color="#0d9488" />
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0d9488', lineHeight: '1.1' }}>
                {totalUpvotes}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '0.5rem' }}>
                Active neighborhood endorsements
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. COMMUNITY ISSUES FEED */}
      <section id="community-feed" className="container" style={{ paddingTop: '1rem' }}>
        
        {/* Feed Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a' }}>Community Issues Feed</h2>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px'
              }}>
                {filteredComplaints.length} tickets
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.925rem' }}>
              Explore community issues or filter by category and priority
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
                <PlusCircle size={17} /> Report New Issue
              </Link>
            ) : (
              <Link to="/register" className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
                <PlusCircle size={17} /> Report an Issue
              </Link>
            )}
          </div>
        </div>

        {/* Filter & Search Bar Controls */}
        <div className="card" style={{
          padding: '1.25rem',
          marginBottom: '2rem',
          backgroundColor: '#ffffff'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            alignItems: 'center'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by title, location, code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '2.5rem', fontSize: '0.9rem' }}
              />
            </div>

            {/* Category Select */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.9rem' }}
              >
                {categories.map(c => (
                  <option key={c} value={c}>Category: {c}</option>
                ))}
              </select>
            </div>

            {/* Status Select */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.9rem' }}
              >
                <option value="All">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Sort By Select */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.9rem' }}
              >
                <option value="priority">Sort: Highest Priority Score</option>
                <option value="upvotes">Sort: Most Upvoted</option>
                <option value="recent">Sort: Most Recent</option>
              </select>
            </div>
          </div>
        </div>

        {/* FEED CONTENT */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div className="spinner" style={{ marginBottom: '1rem' }}></div>
            <p style={{ color: '#64748b', fontWeight: '600' }}>Loading live community issues...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem' }}>
            <div style={{
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              padding: '1.25rem',
              borderRadius: '50%',
              width: 'fit-content',
              margin: '0 auto 1.25rem auto'
            }}>
              <Building2 size={36} />
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              No Complaints Match Your Filter
            </h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem', maxWidth: '440px', margin: '0 auto 1.5rem auto' }}>
              Try adjusting your search keywords, category, or status filter to see community tickets.
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedStatus('All'); }}
              className="btn btn-outline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredComplaints.map((c) => {
              const priorityInfo = getPriorityBadgeStyle(c.priority_score || 0);
              return (
                <div 
                  key={c.id} 
                  className="card card-hover" 
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#ffffff'
                  }}
                >
                  
                  {/* Card Header: Badges & Ticket Code */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.75rem',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`badge badge-${c.status}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                      
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        color: 'white',
                        backgroundColor: priorityInfo.bg,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Zap size={11} /> Score {c.priority_score || 0}
                      </span>
                    </div>

                    <span style={{
                      fontSize: '0.825rem',
                      fontWeight: '800',
                      color: '#2563eb',
                      letterSpacing: '0.02em'
                    }}>
                      {c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 style={{
                    fontSize: '1.15rem',
                    fontWeight: '700',
                    marginBottom: '0.45rem',
                    color: '#0f172a',
                    lineHeight: '1.3'
                  }}>
                    {c.title}
                  </h3>
                  
                  <p style={{
                    color: '#475569',
                    fontSize: '0.9rem',
                    marginBottom: '1rem',
                    flexGrow: 1,
                    lineHeight: '1.55'
                  }}>
                    {c.description}
                  </p>

                  {/* Priority Reason / Algorithmic Insights */}
                  {c.priority_reason && (
                    <div style={{
                      fontSize: '0.78rem',
                      color: '#1e40af',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      padding: '0.4rem 0.65rem',
                      borderRadius: '6px',
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}>
                      <Zap size={12} color="#2563eb" style={{ flexShrink: 0 }} /> 
                      <span>{c.priority_reason}</span>
                    </div>
                  )}

                  {/* Metadata: Location & Category */}
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    marginBottom: '1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <MapPin size={14} color="#0d9488" /> 
                      <span><strong>Location:</strong> {c.location}</span>
                    </div>
                    <div>
                      <strong>Category:</strong> {c.category}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div style={{
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <button 
                      onClick={() => handleSupport(c.id)} 
                      className="btn btn-outline" 
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.85rem',
                        gap: '0.35rem'
                      }}
                      title={isAuthenticated ? "Upvote this community issue" : "Log in to upvote"}
                    >
                      <ThumbsUp size={14} color="#2563eb" /> 
                      <span>Upvote ({c.support_count || 0})</span>
                    </button>
                    
                    <button 
                      onClick={() => setActiveModalId(c.id)}
                      className="btn btn-secondary"
                      style={{
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.85rem',
                        gap: '0.3rem',
                        color: '#2563eb'
                      }}
                    >
                      <Eye size={14} /> Details
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </section>

      {/* COMPLAINT DETAILS MODAL */}
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
