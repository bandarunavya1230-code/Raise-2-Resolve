import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, CheckCircle2, Clock, AlertTriangle, Search, Filter, 
  Eye, MessageSquare, MapPin, Tag, Zap, ShieldCheck, Flag, Check,
  FileSpreadsheet, FileText, Bell, Building2, ArrowRightLeft, UserCheck, 
  Wrench, Plus, Users, Globe, ExternalLink, Phone, Mail 
} from 'lucide-react';
import ComplaintDetailsModal from './ComplaintDetailsModal';
import SectorGISMap from './SectorGISMap';
import SimulatedNotificationModal from './SimulatedNotificationModal';
import { exportToCSV, exportToPDF } from '../utils/exportHelpers';

export default function AuthorityDashboardView({ complaints, loading, token, onRefresh }) {
  // Main view tab: 'complaints' | 'map' | 'admin_authorities'
  const [viewMode, setViewMode] = useState('complaints');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'new' | 'verified' | 'assigned' | 'in_progress' | 'resolved' | 'rejected'
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [jurisdictionFilter, setJurisdictionFilter] = useState('ALL');

  // Metadata from backend
  const [departments, setDepartments] = useState([]);
  const [authoritiesList, setAuthoritiesList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);

  // Active modals
  const [activeModalId, setActiveModalId] = useState(null);
  const [activeNotification, setActiveNotification] = useState(null);

  // Quick Action Modal states
  const [actionComplaint, setActionComplaint] = useState(null);
  const [modalType, setModalType] = useState(''); // 'assign' | 'reassign' | 'status'
  
  // Assign state
  const [assignedToInput, setAssignedToInput] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');

  // Reassign state
  const [targetDeptId, setTargetDeptId] = useState('');
  const [reassignReason, setReassignReason] = useState('');

  // Status update state
  const [nextStatus, setNextStatus] = useState('in_progress');
  const [updateText, setUpdateText] = useState('');

  // Admin New Authority form state
  const [newAuthName, setNewAuthName] = useState('');
  const [newAuthTitle, setNewAuthTitle] = useState('');
  const [newAuthDept, setNewAuthDept] = useState('');
  const [newAuthJurisdiction, setNewAuthJurisdiction] = useState('ward');
  const [newAuthState, setNewAuthState] = useState('Karnataka');
  const [newAuthDistrict, setNewAuthDistrict] = useState('Bengaluru Urban');
  const [newAuthCity, setNewAuthCity] = useState('');
  const [newAuthWard, setNewAuthWard] = useState('');
  const [newAuthEmail, setNewAuthEmail] = useState('');
  const [newAuthPhone, setNewAuthPhone] = useState('');
  const [newAuthOffice, setNewAuthOffice] = useState('');
  const [adminMsg, setAdminMsg] = useState({ type: '', text: '' });
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' });
  const [submittingAction, setSubmittingAction] = useState(false);

  // Fetch departments, authorities, and locations for admin & filtering
  const fetchMetadata = async () => {
    try {
      const [deptRes, authRes, locRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/authorities'),
        fetch('/api/locations/hierarchy')
      ]);
      const deptData = await deptRes.json();
      const authData = await authRes.json();
      const locData = await locRes.json();

      if (deptData.success) setDepartments(deptData.data || []);
      if (authData.success) setAuthoritiesList(authData.data || []);
      if (locData.success) setLocationsList(locData.locations || []);
    } catch (err) {
      console.error('Error fetching admin metadata:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Filter stats
  const stats = useMemo(() => {
    const total = complaints.length;
    const newUnverified = complaints.filter(c => (c.verification_status === 'unverified' && c.is_verified !== 1) || c.status === 'pending').length;
    const verified = complaints.filter(c => c.verification_status === 'verified' || c.is_verified === 1).length;
    const assigned = complaints.filter(c => c.status === 'assigned').length;
    const inProgress = complaints.filter(c => c.status === 'in_progress').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const rejected = complaints.filter(c => c.status === 'rejected' || c.is_flagged === 1).length;

    return { total, newUnverified, verified, assigned, inProgress, resolved, rejected };
  }, [complaints]);

  // Filtered complaints list
  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const code = (c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`).toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        c.title.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower) ||
        (c.location && c.location.toLowerCase().includes(searchLower)) ||
        (c.ward_area && c.ward_area.toLowerCase().includes(searchLower)) ||
        (c.city_town_village && c.city_town_village.toLowerCase().includes(searchLower)) ||
        code.includes(searchLower) ||
        (c.department_name && c.department_name.toLowerCase().includes(searchLower)) ||
        (c.author_name && c.author_name.toLowerCase().includes(searchLower));

      const matchesDept = departmentFilter === 'ALL' || c.department_name === departmentFilter;
      const matchesSeverity = severityFilter === 'ALL' || (c.severity || 'medium') === severityFilter;
      
      let matchesStatus = true;
      if (statusFilter === 'new') {
        matchesStatus = (c.verification_status === 'unverified' && c.is_verified !== 1) || c.status === 'pending';
      } else if (statusFilter === 'verified') {
        matchesStatus = c.verification_status === 'verified' || c.is_verified === 1;
      } else if (statusFilter === 'assigned') {
        matchesStatus = c.status === 'assigned';
      } else if (statusFilter === 'in_progress') {
        matchesStatus = c.status === 'in_progress';
      } else if (statusFilter === 'resolved') {
        matchesStatus = c.status === 'resolved';
      } else if (statusFilter === 'rejected') {
        matchesStatus = c.status === 'rejected' || c.is_flagged === 1;
      }

      const matchesJurisdiction = jurisdictionFilter === 'ALL' || 
        (c.location_type && c.location_type.toLowerCase() === jurisdictionFilter.toLowerCase());

      return matchesSearch && matchesDept && matchesSeverity && matchesStatus && matchesJurisdiction;
    });
  }, [complaints, searchTerm, departmentFilter, severityFilter, statusFilter, jurisdictionFilter]);

  // Verify Action
  const handleVerify = async (complaintId) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'success', text: data.message });
        if (data.simulatedNotification) {
          setActiveNotification(data.simulatedNotification);
        }
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Verify error:', err);
    }
  };

  // Assign Submit
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!actionComplaint || !assignedToInput) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/complaints/${actionComplaint.id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          assigned_to: assignedToInput,
          instructions: assignInstructions
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'success', text: data.message });
        if (data.simulatedNotification) {
          setActiveNotification(data.simulatedNotification);
        }
        setModalType('');
        setActionComplaint(null);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Assign error:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Reassign Submit
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!actionComplaint || !targetDeptId || !reassignReason) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/complaints/${actionComplaint.id}/reassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          target_department_id: targetDeptId,
          reason: reassignReason
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'success', text: data.message });
        if (data.simulatedNotification) {
          setActiveNotification(data.simulatedNotification);
        }
        setModalType('');
        setActionComplaint(null);
        setReassignReason('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Reassign error:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Status Update Submit
  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!actionComplaint || !updateText) return;
    setSubmittingAction(true);
    try {
      const res = await fetch(`/api/complaints/${actionComplaint.id}/authority-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status_change: nextStatus,
          update_text: updateText,
          action_type: nextStatus === 'resolved' ? 'resolution' : 'progress'
        })
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg({ type: 'success', text: data.message });
        if (data.simulatedNotification) {
          setActiveNotification(data.simulatedNotification);
        }
        setModalType('');
        setActionComplaint(null);
        setUpdateText('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Status update error:', err);
    } finally {
      setSubmittingAction(false);
    }
  };

  // Admin Create Authority Mapping Submit
  const handleAdminCreateAuthority = async (e) => {
    e.preventDefault();
    setSubmittingAdmin(true);
    setAdminMsg({ type: '', text: '' });
    try {
      const res = await fetch('/api/authorities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newAuthName,
          title: newAuthTitle,
          department_name: newAuthDept || departments[0]?.name,
          jurisdiction_type: newAuthJurisdiction,
          state: newAuthState,
          district: newAuthDistrict,
          city_town_village: newAuthCity,
          ward_area: newAuthWard,
          contact_email: newAuthEmail,
          contact_phone: newAuthPhone,
          office_address: newAuthOffice
        })
      });
      const data = await res.json();
      if (data.success) {
        setAdminMsg({ type: 'success', text: 'New Authority mapping successfully configured!' });
        setNewAuthName('');
        setNewAuthTitle('');
        setNewAuthCity('');
        setNewAuthWard('');
        setNewAuthPhone('');
        fetchMetadata();
      } else {
        setAdminMsg({ type: 'danger', text: data.message || 'Failed to configure authority.' });
      }
    } catch (err) {
      setAdminMsg({ type: 'danger', text: 'Server error configuring authority.' });
    } finally {
      setSubmittingAdmin(false);
    }
  };

  return (
    <div>
      
      {/* Top Banner & View Switcher */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="badge badge-verified" style={{ backgroundColor: '#2563EB', color: '#ffffff' }}>
              <Shield size={12} /> Municipal Authority Portal
            </span>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
              Live Jurisdictional Operations
            </span>
          </div>
          <h2 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0F172A' }}>
            Civic Grievances & Routing Control
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            backgroundColor: '#FFFFFF',
            padding: '0.25rem',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            gap: '0.25rem'
          }}>
            <button
              type="button"
              onClick={() => setViewMode('complaints')}
              className="btn"
              style={{
                padding: '0.45rem 0.95rem',
                fontSize: '0.85rem',
                backgroundColor: viewMode === 'complaints' ? '#2563EB' : 'transparent',
                color: viewMode === 'complaints' ? '#ffffff' : '#64748B',
                boxShadow: viewMode === 'complaints' ? 'var(--shadow-sm)' : 'none',
                borderRadius: '8px'
              }}
            >
              Complaints Queue
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className="btn"
              style={{
                padding: '0.45rem 0.95rem',
                fontSize: '0.85rem',
                backgroundColor: viewMode === 'map' ? '#2563EB' : 'transparent',
                color: viewMode === 'map' ? '#ffffff' : '#64748B',
                boxShadow: viewMode === 'map' ? 'var(--shadow-sm)' : 'none',
                borderRadius: '8px'
              }}
            >
              GIS Sector Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('admin_authorities')}
              className="btn"
              style={{
                padding: '0.45rem 0.95rem',
                fontSize: '0.85rem',
                backgroundColor: viewMode === 'admin_authorities' ? '#2563EB' : 'transparent',
                color: viewMode === 'admin_authorities' ? '#ffffff' : '#64748B',
                boxShadow: viewMode === 'admin_authorities' ? 'var(--shadow-sm)' : 'none',
                borderRadius: '8px'
              }}
            >
              <Users size={14} /> Authority Config
            </button>
          </div>

          {/* Export Actions */}
          <button 
            onClick={() => exportToCSV(filteredComplaints)}
            className="btn btn-outline"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            title="Export CSV"
          >
            <FileSpreadsheet size={15} color="#14B8A6" /> CSV
          </button>
          <button 
            onClick={() => exportToPDF(filteredComplaints)}
            className="btn btn-outline"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
            title="Export PDF"
          >
            <FileText size={15} color="#2563EB" /> PDF
          </button>
        </div>
      </div>

      {feedbackMsg.text && (
        <div className={`alert alert-${feedbackMsg.type || 'info'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} /> {feedbackMsg.text}
        </div>
      )}

      {/* VIEW 1: COMPLAINTS QUEUE */}
      {viewMode === 'complaints' && (
        <>
          {/* STATS TILES (Clickable quick filters) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div 
              onClick={() => setStatusFilter('ALL')}
              className="card card-hover" 
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderLeft: statusFilter === 'ALL' ? '4px solid #2563EB' : '1px solid #E2E8F0',
                backgroundColor: statusFilter === 'ALL' ? '#F0F9FF' : '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>Total Issues</span>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0F172A' }}>{stats.total}</div>
            </div>

            <div 
              onClick={() => setStatusFilter('new')}
              className="card card-hover" 
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderLeft: statusFilter === 'new' ? '4px solid #F59E0B' : '1px solid #E2E8F0',
                backgroundColor: statusFilter === 'new' ? '#FEF3C7' : '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400E', textTransform: 'uppercase' }}>New / Unverified</span>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#B45309' }}>{stats.newUnverified}</div>
            </div>

            <div 
              onClick={() => setStatusFilter('verified')}
              className="card card-hover" 
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderLeft: statusFilter === 'verified' ? '4px solid #0284C7' : '1px solid #E2E8F0',
                backgroundColor: statusFilter === 'verified' ? '#E0F2FE' : '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369A1', textTransform: 'uppercase' }}>Verified</span>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0284C7' }}>{stats.verified}</div>
            </div>

            <div 
              onClick={() => setStatusFilter('assigned')}
              className="card card-hover" 
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderLeft: statusFilter === 'assigned' ? '4px solid #8B5CF6' : '1px solid #E2E8F0',
                backgroundColor: statusFilter === 'assigned' ? '#EDE9FE' : '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#5B21B6', textTransform: 'uppercase' }}>Assigned</span>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#7C3AED' }}>{stats.assigned}</div>
            </div>

            <div 
              onClick={() => setStatusFilter('in_progress')}
              className="card card-hover" 
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderLeft: statusFilter === 'in_progress' ? '4px solid #0284C7' : '1px solid #E2E8F0',
                backgroundColor: statusFilter === 'in_progress' ? '#F0F9FF' : '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369A1', textTransform: 'uppercase' }}>In Progress</span>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0284C7' }}>{stats.inProgress}</div>
            </div>

            <div 
              onClick={() => setStatusFilter('resolved')}
              className="card card-hover" 
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderLeft: statusFilter === 'resolved' ? '4px solid #10B981' : '1px solid #E2E8F0',
                backgroundColor: statusFilter === 'resolved' ? '#D1FAE5' : '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#065F46', textTransform: 'uppercase' }}>Resolved</span>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#16A34A' }}>{stats.resolved}</div>
            </div>

            <div 
              onClick={() => setStatusFilter('rejected')}
              className="card card-hover" 
              style={{
                padding: '1rem',
                cursor: 'pointer',
                borderLeft: statusFilter === 'rejected' ? '4px solid #EF4444' : '1px solid #E2E8F0',
                backgroundColor: statusFilter === 'rejected' ? '#FEE2E2' : '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#991B1B', textTransform: 'uppercase' }}>Rejected</span>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#DC2626' }}>{stats.rejected}</div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', backgroundColor: '#FFFFFF' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.85rem',
              alignItems: 'center'
            }}>
              {/* Search */}
              <div style={{ position: 'relative' }}>
                <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Search code, title, ward..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-control"
                  style={{ paddingLeft: '2.4rem', fontSize: '0.875rem' }}
                />
              </div>

              {/* Department Filter */}
              <div>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.875rem' }}
                >
                  <option value="ALL">All Departments</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.875rem' }}
                >
                  <option value="ALL">All Status Stages</option>
                  <option value="new">New (Awaiting Verification)</option>
                  <option value="verified">Verified</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="rejected">Rejected / Flagged</option>
                </select>
              </div>

              {/* Jurisdiction Type Filter */}
              <div>
                <select
                  value={jurisdictionFilter}
                  onChange={(e) => setJurisdictionFilter(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.875rem' }}
                >
                  <option value="ALL">All Jurisdictions</option>
                  <option value="city">Cities (Municipal Zones)</option>
                  <option value="town">Towns (Municipal Councils)</option>
                  <option value="village">Villages (Gram Panchayats)</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.875rem' }}
                >
                  <option value="ALL">All Severities</option>
                  <option value="critical">Critical Severity</option>
                  <option value="high">High Severity</option>
                  <option value="medium">Medium Severity</option>
                  <option value="low">Low Severity</option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE OF COMPLAINTS */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748B' }}>
                <div className="spinner" style={{ marginBottom: '1rem' }} />
                <p>Loading complaints queue...</p>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748B' }}>
                <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>No complaints matching current filters.</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Try clearing filters or search terms.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#475569' }}>
                      <th style={{ padding: '0.85rem 1rem' }}>Ticket</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Issue & Category</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Department & Authority</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Location & Jurisdiction</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Priority & Upvotes</th>
                      <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredComplaints.map((c) => {
                      return (
                        <tr key={c.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          
                          {/* Ticket Code */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                            <span style={{ fontWeight: '800', color: '#2563EB', fontSize: '0.85rem' }}>
                              {c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                              {new Date(c.created_at).toLocaleDateString()}
                            </div>
                          </td>

                          {/* Issue & Category */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', maxWidth: '240px' }}>
                            <div style={{ fontWeight: '700', color: '#0F172A', marginBottom: '0.2rem' }}>
                              {c.title}
                            </div>
                            <span className="badge badge-dept" style={{ fontSize: '0.72rem' }}>
                              {c.category}
                            </span>
                          </td>

                          {/* Assigned Department & Authority */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', maxWidth: '220px' }}>
                            <div style={{ fontWeight: '600', color: '#0F172A', fontSize: '0.85rem' }}>
                              {c.department_name || 'General Municipal Grievances'}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                              {c.authority_name || 'Local Officer'}
                            </div>
                            {c.assigned_to && (
                              <div style={{ fontSize: '0.72rem', color: '#2563EB', marginTop: '0.2rem' }}>
                                Crew: <strong>{c.assigned_to}</strong>
                              </div>
                            )}
                          </td>

                          {/* Location & Jurisdiction */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                            <div style={{ color: '#334155', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <MapPin size={13} color="#14B8A6" /> {c.city_town_village || c.location}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.15rem' }}>
                              {c.ward_area || 'Central Ward'}
                            </div>
                            <span className="badge badge-jurisdiction" style={{ fontSize: '0.68rem', marginTop: '0.25rem' }}>
                              {c.jurisdiction_level || 'Ward Level'}
                            </span>
                          </td>

                          {/* Priority & Upvotes */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                            <span style={{
                              fontWeight: '700',
                              fontSize: '0.75rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              backgroundColor: c.priority_score >= 65 ? '#FEE2E2' : c.priority_score >= 45 ? '#FFEDD5' : '#EFF6FF',
                              color: c.priority_score >= 65 ? '#B91C1C' : c.priority_score >= 45 ? '#C2410C' : '#1D4ED8',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem'
                            }}>
                              <Zap size={11} /> Score {c.priority_score || 0}
                            </span>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                              Upvotes: {c.support_count || 0}
                            </div>
                          </td>

                          {/* Status & Verification */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top' }}>
                            <div style={{ marginBottom: '0.35rem' }}>
                              <span className={`badge badge-${c.status}`}>
                                {c.status.replace('_', ' ')}
                              </span>
                            </div>
                            {c.is_verified === 1 ? (
                              <span style={{ fontSize: '0.72rem', color: '#0D9488', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <ShieldCheck size={12} /> Verified
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '600' }}>
                                Unverified
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.85rem 1rem', verticalAlign: 'top', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              {/* Verify */}
                              <button
                                type="button"
                                onClick={() => handleVerify(c.id)}
                                className="btn btn-outline"
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.75rem',
                                  color: c.is_verified === 1 ? '#0D9488' : '#64748B'
                                }}
                                title="Toggle Verification"
                              >
                                <ShieldCheck size={13} /> {c.is_verified === 1 ? 'Verified' : 'Verify'}
                              </button>

                              {/* Assign Crew */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionComplaint(c);
                                  setModalType('assign');
                                  setAssignedToInput(c.assigned_to || '');
                                }}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#2563EB' }}
                                title="Assign Work Crew"
                              >
                                <UserCheck size={13} /> Assign
                              </button>

                              {/* Reassign Department */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionComplaint(c);
                                  setModalType('reassign');
                                  setTargetDeptId('');
                                  setReassignReason('');
                                }}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: '#0284C7' }}
                                title="Reassign Department"
                              >
                                <ArrowRightLeft size={13} /> Reassign
                              </button>

                              {/* Update Status */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActionComplaint(c);
                                  setModalType('status');
                                  setNextStatus(c.status);
                                  setUpdateText('');
                                }}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                title="Update Status & Remarks"
                              >
                                <Wrench size={13} /> Status
                              </button>

                              {/* Details */}
                              <button
                                type="button"
                                onClick={() => setActiveModalId(c.id)}
                                className="btn btn-outline"
                                style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                                title="View Full Details"
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* VIEW 2: GIS MAP */}
      {viewMode === 'map' && (
        <div className="card" style={{ padding: '1.5rem', backgroundColor: '#FFFFFF' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1rem', color: '#0F172A' }}>
            Sector GIS Heatmap & Incident Clusters
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            Visualizes complaints pinned by derived/GPS coordinates, color-coded by priority score and resolution status across jurisdictions.
          </p>
          <SectorGISMap 
            complaints={filteredComplaints} 
            onSelectComplaint={(c) => setActiveModalId(c.id)} 
          />
        </div>
      )}

      {/* VIEW 3: AUTHORITY & JURISDICTION CONFIGURATION (Admin requirement) */}
      {viewMode === 'admin_authorities' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Add Authority Form */}
          <div className="card" style={{ backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.35rem' }}>
              Add New Authority Mapping
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Configure authority mappings for new villages, towns, or city zones without modifying code.
            </p>

            {adminMsg.text && (
              <div className={`alert alert-${adminMsg.type || 'info'}`}>{adminMsg.text}</div>
            )}

            <form onSubmit={handleAdminCreateAuthority}>
              <div className="form-group">
                <label>Authority / Office Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Whitefield Zonal Municipal Directorate"
                  value={newAuthName}
                  onChange={(e) => setNewAuthName(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div className="form-group">
                <label>Designation / Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Assistant Executive Engineer (AEE)"
                  value={newAuthTitle}
                  onChange={(e) => setNewAuthTitle(e.target.value)}
                  className="form-control"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Department *</label>
                  <select
                    value={newAuthDept}
                    onChange={(e) => setNewAuthDept(e.target.value)}
                    className="form-control"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Jurisdiction Type *</label>
                  <select
                    value={newAuthJurisdiction}
                    onChange={(e) => setNewAuthJurisdiction(e.target.value)}
                    className="form-control"
                  >
                    <option value="ward">City Ward / Area</option>
                    <option value="town">Town Municipality</option>
                    <option value="village">Village Gram Panchayat</option>
                    <option value="city">City Zonal Level</option>
                    <option value="district">District Administrative</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    value={newAuthState}
                    onChange={(e) => setNewAuthState(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>District *</label>
                  <input
                    type="text"
                    value={newAuthDistrict}
                    onChange={(e) => setNewAuthDistrict(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>City / Town / Village *</label>
                  <input
                    type="text"
                    placeholder="e.g. Whitefield"
                    value={newAuthCity}
                    onChange={(e) => setNewAuthCity(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Ward / Area</label>
                  <input
                    type="text"
                    placeholder="e.g. Ward 84 - Kadugodi"
                    value={newAuthWard}
                    onChange={(e) => setNewAuthWard(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 80 2297 XXXX"
                    value={newAuthPhone}
                    onChange={(e) => setNewAuthPhone(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Email</label>
                  <input
                    type="email"
                    placeholder="officer@raise2resolve.gov"
                    value={newAuthEmail}
                    onChange={(e) => setNewAuthEmail(e.target.value)}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Office Address</label>
                <input
                  type="text"
                  placeholder="e.g. BBMP Whitefield Sub-division, ECC Road"
                  value={newAuthOffice}
                  onChange={(e) => setNewAuthOffice(e.target.value)}
                  className="form-control"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={submittingAdmin}
              >
                {submittingAdmin ? 'Configuring...' : 'Save Authority Mapping'}
              </button>
            </form>
          </div>

          {/* List of Configured Authorities */}
          <div className="card" style={{ backgroundColor: '#FFFFFF' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0F172A', marginBottom: '0.35rem' }}>
              Configured Authorities & Jurisdictions ({authoritiesList.length})
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
              Dynamic mappings connecting categories and locations to responsible officers.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '540px', overflowY: 'auto' }}>
              {authoritiesList.map(a => (
                <div key={a.id} style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#F8FAFC'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                    <span className="badge badge-dept" style={{ fontSize: '0.72rem' }}>
                      {a.department_name}
                    </span>
                    <span className="badge badge-jurisdiction" style={{ fontSize: '0.7rem' }}>
                      {a.jurisdiction_type.toUpperCase()}
                    </span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0F172A', marginBottom: '0.15rem' }}>
                    {a.name}
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: '#2563EB', fontWeight: '600', marginBottom: '0.45rem' }}>
                    {a.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <div>📍 <strong>Jurisdiction:</strong> {a.city_town_village} · {a.ward_area || 'All Wards'} ({a.district})</div>
                    <div>📞 <strong>Phone:</strong> {a.contact_phone || 'N/A'} · ✉️ {a.contact_email || 'N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* QUICK ACTION MODALS: Assign, Reassign, Status */}
      {modalType && actionComplaint && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '1.5rem'
        }}>
          <div className="card" style={{
            maxWidth: '520px',
            width: '100%',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#2563EB' }}>
                  {actionComplaint.complaint_code || `R2R-2026-${actionComplaint.id}`}
                </span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0F172A' }}>
                  {modalType === 'assign' && 'Assign Field Crew'}
                  {modalType === 'reassign' && 'Reassign Department (Audit Trail)'}
                  {modalType === 'status' && 'Update Resolution Status'}
                </h3>
              </div>
              <button 
                onClick={() => { setModalType(''); setActionComplaint(null); }}
                style={{ border: 'none', background: '#F1F5F9', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL 1: ASSIGN CREW */}
            {modalType === 'assign' && (
              <form onSubmit={handleAssignSubmit}>
                <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  Assign ground staff or engineering field team to execute work on this issue.
                </p>
                <div className="form-group">
                  <label>Assigned Personnel / Crew Team *</label>
                  <input
                    type="text"
                    placeholder="e.g. Ward 82 PWD Rapid Response Crew #3"
                    value={assignedToInput}
                    onChange={(e) => setAssignedToInput(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Work Instructions / Priorities</label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Inspect road crater, deploy cold bitumen patch, confirm drainage seal"
                    value={assignInstructions}
                    onChange={(e) => setAssignInstructions(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setModalType('')} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingAction}>
                    {submittingAction ? 'Assigning...' : 'Dispatch Assignment'}
                  </button>
                </div>
              </form>
            )}

            {/* MODAL 2: REASSIGN DEPARTMENT */}
            {modalType === 'reassign' && (
              <form onSubmit={handleReassignSubmit}>
                <div style={{ backgroundColor: '#F0F9FF', padding: '0.85rem', borderRadius: '8px', border: '1px solid #BAE6FD', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div>Current Department: <strong>{actionComplaint.department_name || 'General Municipal Grievances'}</strong></div>
                  <div style={{ fontSize: '0.75rem', color: '#0369A1', marginTop: '0.2rem' }}>
                    Reassignment transfers routing authority and creates a transparent audit trail.
                  </div>
                </div>

                <div className="form-group">
                  <label>Target Department *</label>
                  <select
                    value={targetDeptId}
                    onChange={(e) => setTargetDeptId(e.target.value)}
                    className="form-control"
                    required
                  >
                    <option value="">Select correct department...</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Reason for Reassignment (Audit Log) *</label>
                  <textarea
                    rows="3"
                    placeholder="Explain why this complaint was re-routed (e.g. citizen reported as road defect, but inspection revealed underground sewage pipeline burst)"
                    value={reassignReason}
                    onChange={(e) => setReassignReason(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setModalType('')} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-sky" disabled={submittingAction}>
                    {submittingAction ? 'Transferring...' : 'Confirm Reassignment'}
                  </button>
                </div>
              </form>
            )}

            {/* MODAL 3: UPDATE STATUS */}
            {modalType === 'status' && (
              <form onSubmit={handleStatusSubmit}>
                <div className="form-group">
                  <label>Status Stage *</label>
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="form-control"
                  >
                    <option value="in_progress">In Progress (Active Work on Ground)</option>
                    <option value="resolved">Resolved (Completed & Inspected)</option>
                    <option value="rejected">Rejected (Invalid or Outside Jurisdiction)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Official Remarks *</label>
                  <textarea
                    rows="3"
                    placeholder="Enter official resolution details, contractor reports, or rejection rationale..."
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => setModalType('')} className="btn btn-secondary">
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submittingAction}>
                    {submittingAction ? 'Saving...' : 'Post Status Update'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {activeModalId && (
        <ComplaintDetailsModal
          complaintId={activeModalId}
          onClose={() => setActiveModalId(null)}
          token={token}
          onSupportToggle={onRefresh}
        />
      )}

      {/* SIMULATED SMS / EMAIL MODAL */}
      {activeNotification && (
        <SimulatedNotificationModal
          notification={activeNotification}
          onClose={() => setActiveNotification(null)}
        />
      )}

    </div>
  );
}
