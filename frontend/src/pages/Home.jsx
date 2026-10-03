import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  ThumbsUp, ShieldCheck, MapPin, Clock, AlertCircle, PlusCircle, 
  CheckCircle2, ArrowRight, Activity, Users, Building2, Search, 
  Filter, Shield, Zap, FileText, Check, ChevronRight, Eye, ArrowUpRight,
  Compass, Droplets, Construction, Trash2, Lightbulb, Waves, ArrowRightLeft 
} from 'lucide-react';
import ComplaintDetailsModal from '../components/ComplaintDetailsModal';
import FindAuthorityNearMe from '../components/FindAuthorityNearMe';

export default function Home() {
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalId, setActiveModalId] = useState(null);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState('priority'); // 'priority' | 'recent' | 'upvotes'

  // Quick Tracker input state
  const [trackQuery, setTrackQuery] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  const { isAuthenticated, loginAuthorityDemo, token } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [compRes, deptRes] = await Promise.all([
        fetch('/api/complaints'),
        fetch('/api/departments')
      ]);
      const compData = await compRes.json();
      const deptData = await deptRes.json();

      if (compData.success) setComplaints(compData.data || []);
      if (deptData.success) setDepartments(deptData.data || []);
    } catch (err) {
      console.error('Error fetching homepage data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        fetchData();
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
      return code.includes(query) || String(c.id) === query || (c.title && c.title.toLowerCase().includes(query));
    });

    if (matched) {
      setTrackResult(matched);
    } else {
      setTrackError(`No complaint found matching "${trackQuery}". Check code or search feed.`);
    }
  };

  // Stats derived dynamically
  const totalReported = complaints.length;
  const totalResolved = complaints.filter(c => c.status === 'resolved').length;
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length;
  const verifiedCount = complaints.filter(c => c.verification_status === 'verified' || c.is_verified === 1).length;
  const totalUpvotes = complaints.reduce((sum, c) => sum + (c.support_count || 0), 0);
  const resolutionRate = totalReported > 0 ? Math.round((totalResolved / totalReported) * 100) : 0;

  // Filtered & Sorted complaints
  const filteredComplaints = complaints
    .filter(c => {
      const matchesSearch = 
        !searchTerm ||
        (c.title && c.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.ward_area && c.ward_area.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.city_town_village && c.city_town_village.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (c.complaint_code && c.complaint_code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesDept = selectedDepartment === 'All' || c.department_name === selectedDepartment;
      const matchesStatus = selectedStatus === 'All' || c.status === selectedStatus;
      return matchesSearch && matchesDept && matchesStatus;
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
    if (score >= 65) return { bg: '#DC2626', text: 'Urgent' };
    if (score >= 45) return { bg: '#EA580C', text: 'High' };
    return { bg: '#2563EB', text: 'Normal' };
  };

  const departmentIcons = {
    'Electricity': Zap,
    'Water Supply': Droplets,
    'Roads/Public Works': Construction,
    'Sanitation/Waste Management': Trash2,
    'Streetlights': Lightbulb,
    'Drainage': Waves,
    'Public Safety': Shield,
    'Other': Building2
  };

  return (
    <div style={{ backgroundColor: '#F4F9FC', paddingBottom: '4rem' }}>
      
      {/* 1. HERO SECTION - Light Sky-Blue Civic-Tech Theme */}
      <section style={{
        background: 'linear-gradient(180deg, #EBF5FB 0%, #F4F9FC 100%)',
        borderBottom: '1px solid #E2E8F0',
        padding: '4.5rem 0 4rem 0',
        position: 'relative'
      }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '920px' }}>
          
          {/* Big Emblem & Brand Tag */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.85rem',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #BFDBFE',
            padding: '0.4rem 1.35rem 0.4rem 0.5rem',
            borderRadius: '9999px',
            marginBottom: '1.5rem',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.1)'
          }}>
            <img
              src="/logo.jpg"
              alt="Raise 2 Resolve Logo"
              referrerPolicy="no-referrer"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid #93C5FD',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)'
              }}
            />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              lineHeight: '1'
            }}>
              <span style={{ fontWeight: '900', fontSize: '1.15rem', color: '#0F172A', letterSpacing: '-0.02em' }}>RAISE</span>
              <span style={{ fontWeight: '950', fontSize: '1.75rem', color: '#2563EB', lineHeight: '0.8', margin: '0', padding: '0 1px' }}>2</span>
              <span style={{ fontWeight: '900', fontSize: '1.15rem', color: '#0284C7', letterSpacing: '-0.02em' }}>RESOLVE</span>
              <span style={{ fontSize: '0.825rem', color: '#64748B', fontWeight: '600', marginLeft: '0.65rem' }}>· Public Civic Platform</span>
            </div>
          </div>

          {/* Hero Heading */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.75rem)',
            fontWeight: '900',
            lineHeight: '1.15',
            letterSpacing: '-0.03em',
            marginBottom: '1.25rem',
            color: '#0F172A'
          }}>
            Report. Prioritize. Resolve.
          </h1>

          {/* Clear Supporting Message (Requirement 3) */}
          <p style={{
            fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
            color: '#475569',
            lineHeight: '1.65',
            marginBottom: '2.5rem',
            maxWidth: '760px',
            margin: '0 auto 2.5rem auto'
          }}>
            Citizens can easily report local civic issues and track their municipal resolution step-by-step. Complaints are automatically routed to the responsible department and geographical authority based on location.
          </p>

          {/* Prominent Action Buttons (Requirement 3) */}
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
                style={{ padding: '0.85rem 2.25rem', fontSize: '1.05rem' }}
              >
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link 
                  to="/register" 
                  className="btn btn-primary" 
                  style={{ padding: '0.85rem 2.25rem', fontSize: '1.05rem' }}
                >
                  <PlusCircle size={19} /> Register as Citizen
                </Link>

                <button 
                  onClick={handleDemoAuth} 
                  className="btn btn-authority" 
                  style={{ padding: '0.85rem 1.85rem', fontSize: '1.05rem' }}
                >
                  <ShieldCheck size={19} color="#38BDF8" /> Quick Authority Demo Login
                </button>
              </>
            )}

            <a 
              href="#find-authority" 
              className="btn btn-outline" 
              style={{ padding: '0.85rem 1.75rem', fontSize: '1.05rem' }}
            >
              <Compass size={18} color="#0284C7" /> Find Authority Near Me
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1.25rem',
            marginTop: '3.5rem',
            backgroundColor: '#FFFFFF',
            padding: '1.5rem',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#0F172A' }}>{totalReported}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <Building2 size={15} color="#2563EB" /> Total Reported
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#0284C7' }}>{verifiedCount}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <ShieldCheck size={15} color="#0284C7" /> Authority Verified
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#14B8A6' }}>{totalUpvotes}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <ThumbsUp size={15} color="#14B8A6" /> Community Upvotes
              </div>
            </div>

            <div>
              <div style={{ fontSize: '2.1rem', fontWeight: '900', color: '#10B981' }}>{totalResolved}</div>
              <div style={{ fontSize: '0.85rem', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                <CheckCircle2 size={15} color="#10B981" /> Resolved ({resolutionRate}%)
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. FIND AUTHORITY NEAR ME INTERACTIVE SECTION (Requirement 5) */}
      <section id="find-authority" className="container" style={{ padding: '4rem 1.5rem 2rem 1.5rem' }}>
        <FindAuthorityNearMe />
      </section>

      {/* 3. HOW IT WORKS SECTION (Requirement 4) */}
      <section id="how-it-works" className="container" style={{ padding: '3.5rem 1.5rem 2rem 1.5rem' }}>
        <div className="section-header">
          <div className="section-tag">
            <CheckCircle2 size={14} /> Resolution Workflow
          </div>
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            1. Raise → 2. Review → 3. Prioritize → 4. Resolve
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Step 1 */}
          <div className="card card-hover" style={{ backgroundColor: '#FFFFFF', borderTop: '4px solid #2563EB' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#2563EB', opacity: 0.25 }}>01</span>
              <div style={{ backgroundColor: '#EFF6FF', color: '#2563EB', padding: '0.65rem', borderRadius: '10px' }}>
                <PlusCircle size={22} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem', color: '#0F172A' }}>1. Raise</h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: '1.55' }}>
              Citizens log local complaints with photos, category, and geographical hierarchy (State → District → Village/Town/City → Ward).
            </p>
          </div>

          {/* Step 2 */}
          <div className="card card-hover" style={{ backgroundColor: '#FFFFFF', borderTop: '4px solid #0284C7' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#0284C7', opacity: 0.25 }}>02</span>
              <div style={{ backgroundColor: '#F0F9FF', color: '#0284C7', padding: '0.65rem', borderRadius: '10px' }}>
                <Search size={22} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem', color: '#0F172A' }}>2. Review</h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: '1.55' }}>
              Automated routing directs the ticket to the responsible department and local village/town/city authority, screening for duplicates.
            </p>
          </div>

          {/* Step 3 */}
          <div className="card card-hover" style={{ backgroundColor: '#FFFFFF', borderTop: '4px solid #14B8A6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#14B8A6', opacity: 0.25 }}>03</span>
              <div style={{ backgroundColor: '#F0FDF4', color: '#14B8A6', padding: '0.65rem', borderRadius: '10px' }}>
                <Zap size={22} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem', color: '#0F172A' }}>3. Prioritize</h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: '1.55' }}>
              Algorithmic scoring ranks urgency based on severity level, category safety impact, and local community upvotes.
            </p>
          </div>

          {/* Step 4 */}
          <div className="card card-hover" style={{ backgroundColor: '#FFFFFF', borderTop: '4px solid #10B981' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.75rem', fontWeight: '900', color: '#10B981', opacity: 0.25 }}>04</span>
              <div style={{ backgroundColor: '#D1FAE5', color: '#10B981', padding: '0.65rem', borderRadius: '10px' }}>
                <CheckCircle2 size={22} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '0.5rem', color: '#0F172A' }}>4. Resolve</h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: '1.55' }}>
              Responsible department officers verify the issue, assign field crews, and complete repairs with transparent status milestones.
            </p>
          </div>
        </div>
      </section>

      {/* 4. FOUR KEY HOMEPAGE SECTIONS (Requirement 4) */}
      <section style={{ padding: '3rem 0' }}>
        <div className="container">
          
          <div className="section-header">
            <div className="section-tag">
              <Building2 size={14} /> Comprehensive Features
            </div>
            <h2 className="section-title">Core Civic Capabilities</h2>
            <p className="section-subtitle">
              Seamless infrastructure for citizens, local authorities, and municipal field teams.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            
            {/* 1. Raise a Complaint */}
            <div className="card card-hover" style={{ backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <PlusCircle size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.5rem' }}>
                Raise a Complaint
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem', flexGrow: 1 }}>
                Submit civic grievances with photo evidence, landmark details, and category tagging. The system automatically determines the responsible department and local authority.
              </p>
              <Link to={isAuthenticated ? "/dashboard" : "/register"} className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }}>
                <PlusCircle size={15} /> File a Civic Issue
              </Link>
            </div>

            {/* 2. Track Complaint */}
            <div id="track-section" className="card card-hover" style={{ backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#F0F9FF',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <Search size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.5rem' }}>
                Track Complaint
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '0.85rem', flexGrow: 1 }}>
                Enter your ticket code (e.g. <code>R2R-2026-0001</code>) to view the 5-stage status timeline and see which department is handling your repair.
              </p>
              
              <form onSubmit={handleQuickTrack} style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    placeholder="e.g. R2R-2026-0001"
                    value={trackQuery}
                    onChange={(e) => setTrackQuery(e.target.value)}
                    className="form-control"
                    style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                  />
                  <button type="submit" className="btn btn-sky" style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}>
                    Track
                  </button>
                </div>
              </form>

              {trackError && <div style={{ fontSize: '0.8rem', color: '#DC2626' }}>{trackError}</div>}

              {trackResult && (
                <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                    <strong style={{ color: '#0284C7' }}>{trackResult.complaint_code}</strong>
                    <span className={`badge badge-${trackResult.status}`}>{trackResult.status.replace('_', ' ')}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#0F172A' }}>{trackResult.title}</div>
                  <button onClick={() => setActiveModalId(trackResult.id)} className="btn btn-outline" style={{ width: '100%', padding: '0.35rem', fontSize: '0.78rem', marginTop: '0.5rem' }}>
                    View Full Status Timeline &rarr;
                  </button>
                </div>
              )}
            </div>

            {/* 3. Community Upvotes */}
            <div className="card card-hover" style={{ backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#F0FDF4',
                color: '#14B8A6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <ThumbsUp size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.5rem' }}>
                Community Upvotes
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem', flexGrow: 1 }}>
                Neighbors can upvote open community issues instead of filing duplicate complaints. Upvotes directly escalate the priority score to alert municipal leadership.
              </p>
              <a href="#community-feed" className="btn btn-outline" style={{ width: '100%', fontSize: '0.85rem' }}>
                <ThumbsUp size={15} color="#14B8A6" /> Explore & Upvote
              </a>
            </div>

            {/* 4. Resolution Status */}
            <div className="card card-hover" style={{ backgroundColor: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <CheckCircle2 size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.5rem' }}>
                Resolution Status
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.25rem', flexGrow: 1 }}>
                Public status transparency: <strong>Submitted → Under Verification → Assigned → In Progress → Resolved</strong> with official municipal inspection remarks.
              </p>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
                <span className="badge badge-submitted">Submitted</span>
                <span className="badge badge-verified">Verified</span>
                <span className="badge badge-assigned">Assigned</span>
                <span className="badge badge-resolved">Resolved</span>
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
              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0F172A' }}>
                Community Issues Feed
              </h2>
              <span className="badge badge-dept">
                {filteredComplaints.length} tickets
              </span>
            </div>
            <p style={{ color: '#64748B', fontSize: '0.925rem' }}>
              View and upvote civic problems in your area. Sorted by algorithm priority.
            </p>
          </div>

          <Link to={isAuthenticated ? "/dashboard" : "/register"} className="btn btn-primary" style={{ fontSize: '0.9rem' }}>
            <PlusCircle size={16} /> Report an Issue
          </Link>
        </div>

        {/* Filters Card */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem', backgroundColor: '#FFFFFF' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.85rem',
            alignItems: 'center'
          }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search title, ward, ticket code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-control"
                style={{ paddingLeft: '2.4rem', fontSize: '0.875rem' }}
              />
            </div>

            {/* Department Filter */}
            <div>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.875rem' }}
              >
                <option value="All">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.875rem' }}
              >
                <option value="All">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-control"
                style={{ fontSize: '0.875rem' }}
              >
                <option value="priority">Highest Priority Score</option>
                <option value="upvotes">Most Upvoted</option>
                <option value="recent">Most Recent</option>
              </select>
            </div>
          </div>
        </div>

        {/* FEED CONTENT */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748B' }}>
            <div className="spinner" style={{ marginBottom: '1rem' }} />
            <p>Loading community issues feed...</p>
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', backgroundColor: '#FFFFFF' }}>
            <Building2 size={36} color="#94A3B8" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.5rem' }}>
              No Complaints Match Your Filters
            </h3>
            <p style={{ color: '#64748B', maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
              Try adjusting your department, status, or search terms to view other tickets.
            </p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedDepartment('All'); setSelectedStatus('All'); }}
              className="btn btn-outline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem'
          }}>
            {filteredComplaints.map(c => {
              const priorityInfo = getPriorityBadgeStyle(c.priority_score || 0);
              return (
                <div key={c.id} className="card card-hover" style={{
                  backgroundColor: '#FFFFFF',
                  padding: '1.35rem',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* Card Header: Badges & Ticket Code */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className={`badge badge-${c.status}`}>
                        {c.status.replace('_', ' ')}
                      </span>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        color: '#FFFFFF',
                        backgroundColor: priorityInfo.bg,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        <Zap size={11} /> Score {c.priority_score || 0}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#2563EB' }}>
                      {c.complaint_code || `R2R-2026-${c.id}`}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.4rem', lineHeight: '1.3' }}>
                    {c.title}
                  </h3>

                  {/* Responsible Department Tag */}
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#0369A1',
                    backgroundColor: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <Building2 size={13} color="#0284C7" />
                    <strong>{c.department_name || 'General Municipal Grievances'}</strong>
                  </div>

                  {/* Description */}
                  <p style={{ color: '#475569', fontSize: '0.875rem', marginBottom: '1rem', flexGrow: 1, lineHeight: '1.55' }}>
                    {c.description}
                  </p>

                  {/* Location & Authority */}
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <MapPin size={13} color="#14B8A6" />
                      <span><strong>Location:</strong> {c.location}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Building2 size={13} color="#0284C7" />
                      <span><strong>Authority:</strong> {c.authority_name || 'Local Grievance Desk'}</span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div style={{
                    borderTop: '1px solid #F1F5F9',
                    paddingTop: '0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <button
                      type="button"
                      onClick={() => handleSupport(c.id)}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', gap: '0.35rem' }}
                      title="Upvote this complaint"
                    >
                      <ThumbsUp size={13} color="#2563EB" /> Upvote ({c.support_count || 0})
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveModalId(c.id)}
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#2563EB' }}
                    >
                      <Eye size={13} /> View Timeline
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
          onSupportToggle={fetchData}
        />
      )}

    </div>
  );
}
