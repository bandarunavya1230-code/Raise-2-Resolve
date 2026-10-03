import React, { useState, useMemo } from 'react';
import { 
  Shield, CheckCircle2, Clock, AlertTriangle, Search, Filter, 
  Eye, MessageSquare, MapPin, Tag, Zap, ShieldCheck, Flag, Check,
  FileSpreadsheet, FileText, Bell
} from 'lucide-react';
import ComplaintDetailsModal from './ComplaintDetailsModal';
import SectorGISMap from './SectorGISMap';
import SimulatedNotificationModal from './SimulatedNotificationModal';
import { exportToCSV, exportToPDF } from '../utils/exportHelpers';

export default function AuthorityDashboardView({ complaints, loading, token, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Authority Actions State
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [updateText, setUpdateText] = useState('');
  const [statusChange, setStatusChange] = useState('in_progress');
  const [actionType, setActionType] = useState('remark');
  
  // Flag modal state
  const [flaggingComplaintId, setFlaggingComplaintId] = useState(null);
  const [flagReason, setFlagReason] = useState('');

  // Simulated notification state
  const [activeNotification, setActiveNotification] = useState(null);

  const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' });
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  const [activeModalId, setActiveModalId] = useState(null);

  const stats = useMemo(() => {
    const total = complaints.length;
    const pending = complaints.filter(c => c.status === 'pending').length;
    const inProgress = complaints.filter(c => c.status === 'in_progress').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const verified = complaints.filter(c => c.is_verified === 1).length;
    const urgent = complaints.filter(c => c.priority_score >= 65 || c.priority_level === 'Urgent').length;

    return { total, pending, inProgress, resolved, verified, urgent };
  }, [complaints]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const searchLower = searchTerm.toLowerCase();
      const code = (c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`).toLowerCase();
      const matchesSearch = 
        !searchTerm || 
        c.title.toLowerCase().includes(searchLower) ||
        c.description.toLowerCase().includes(searchLower) ||
        c.location.toLowerCase().includes(searchLower) ||
        code.includes(searchLower) ||
        (c.author_name && c.author_name.toLowerCase().includes(searchLower));

      const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
      const matchesSeverity = severityFilter === 'ALL' || (c.severity || 'medium') === severityFilter;
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;

      let matchesPriority = true;
      if (priorityFilter !== 'ALL') {
        const pLevel = c.priority_level || (c.priority_score >= 65 ? 'Urgent' : c.priority_score >= 45 ? 'High' : 'Normal');
        matchesPriority = pLevel === priorityFilter;
      }

      return matchesSearch && matchesCategory && matchesSeverity && matchesStatus && matchesPriority;
    });
  }, [complaints, searchTerm, categoryFilter, severityFilter, statusFilter, priorityFilter]);

  const handleVerify = async (complaintId) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}/verify`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUpdateMsg({ type: 'success', text: data.message });
        if (data.simulatedNotification) {
          setActiveNotification(data.simulatedNotification);
        }
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Verify error:', err);
    }
  };

  const handleFlagSubmit = async (e) => {
    e.preventDefault();
    if (!flaggingComplaintId) return;

    try {
      const res = await fetch(`/api/complaints/${flaggingComplaintId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ flag_reason: flagReason })
      });
      const data = await res.json();
      if (data.success) {
        setUpdateMsg({ type: 'success', text: data.message });
        if (data.simulatedNotification) {
          setActiveNotification(data.simulatedNotification);
        }
        setFlaggingComplaintId(null);
        setFlagReason('');
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Flag error:', err);
    }
  };

  const handleAuthorityUpdate = async (e) => {
    e.preventDefault();
    if (!selectedComplaintId) return;

    setUpdateMsg({ type: '', text: '' });
    setSubmittingUpdate(true);

    try {
      const res = await fetch(`/api/complaints/${selectedComplaintId}/authority-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          update_text: updateText, 
          status_change: statusChange,
          action_type: actionType 
        })
      });
      const data = await res.json();

      if (data.success) {
        setUpdateMsg({ type: 'success', text: 'Official authority remarks & status saved! Simulated notifications generated.' });
        if (data.simulatedNotification) {
          setActiveNotification(data.simulatedNotification);
        }
        setUpdateText('');
        setSelectedComplaintId(null);
        if (onRefresh) onRefresh();
      } else {
        setUpdateMsg({ type: 'danger', text: data.message || 'Failed to save remarks.' });
      }
    } catch (err) {
      setUpdateMsg({ type: 'danger', text: 'Error connecting to backend server.' });
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const getPriorityStyle = (score) => {
    if (score >= 65) return { bg: '#dc2626', color: '#ffffff', label: 'Urgent' };
    if (score >= 45) return { bg: '#ea580c', color: '#ffffff', label: 'High' };
    return { bg: '#2563eb', color: '#ffffff', label: 'Normal' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. STATISTICS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ backgroundColor: '#ffffff', borderLeft: '4px solid #2563eb' }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Issues</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0.25rem 0' }}>{stats.total}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Community tickets</div>
        </div>

        <div className="card" style={{ backgroundColor: '#ffffff', borderLeft: '4px solid #7c3aed' }}>
          <div style={{ fontSize: '0.8rem', color: '#7c3aed', fontWeight: '600', textTransform: 'uppercase' }}>Verified</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#7c3aed', margin: '0.25rem 0' }}>{stats.verified}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Inspected & confirmed</div>
        </div>

        <div className="card" style={{ backgroundColor: '#ffffff', borderLeft: '4px solid #dc2626' }}>
          <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: '600', textTransform: 'uppercase' }}>Urgent Priority</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#dc2626', margin: '0.25rem 0' }}>{stats.urgent}</div>
          <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>Requires immediate action</div>
        </div>

        <div className="card" style={{ backgroundColor: '#ffffff', borderLeft: '4px solid #0284c7' }}>
          <div style={{ fontSize: '0.8rem', color: '#0284c7', fontWeight: '600', textTransform: 'uppercase' }}>In Progress</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0284c7', margin: '0.25rem 0' }}>{stats.inProgress}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Repair underway</div>
        </div>

        <div className="card" style={{ backgroundColor: '#ffffff', borderLeft: '4px solid #16a34a' }}>
          <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: '600', textTransform: 'uppercase' }}>Resolved</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#16a34a', margin: '0.25rem 0' }}>{stats.resolved}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Action completed</div>
        </div>
      </div>

      {/* 2. GIS MAP VISUALIZATION */}
      <SectorGISMap 
        complaints={filteredComplaints} 
        onSelectComplaint={(id) => setActiveModalId(id)} 
      />

      {/* 3. SEARCH, FILTERS & EXPORT TOOLBAR */}
      <div className="card" style={{ backgroundColor: '#f8fafc', padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
            <Filter size={18} color="#7c3aed" /> Filter & Search Complaints Queue
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            {activeNotification && (
              <button 
                onClick={() => setActiveNotification(activeNotification)} 
                className="btn btn-authority"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
              >
                <Bell size={16} /> View Simulated Notification Demo
              </button>
            )}

            <button 
              onClick={() => exportToCSV(filteredComplaints)} 
              className="btn btn-outline" 
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', backgroundColor: '#ffffff', borderColor: '#16a34a', color: '#15803d' }}
              title="Export active filtered complaints to CSV format"
            >
              <FileSpreadsheet size={16} /> Export CSV
            </button>

            <button 
              onClick={() => exportToPDF(filteredComplaints)} 
              className="btn btn-primary" 
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', backgroundColor: '#2563eb' }}
              title="Export active filtered complaints to PDF document"
            >
              <FileText size={16} /> Export PDF
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="form-group" style={{ marginBottom: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search by title, location, description, complaint code (e.g. R2R-2026-0004), or citizen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
        </div>

        {/* Filters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Category</label>
            <select className="form-control" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
              <option value="ALL">All Categories</option>
              <option value="Roads & Potholes">Roads & Potholes</option>
              <option value="Water Supply">Water Supply</option>
              <option value="Waste Management">Waste Management</option>
              <option value="Electricity & Lighting">Electricity & Lighting</option>
              <option value="Drainage & Sewage">Drainage & Sewage</option>
              <option value="Public Safety">Public Safety</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Severity</label>
            <select className="form-control" value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
              <option value="ALL">All Severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Status</label>
            <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
              <option value="ALL">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="flagged">Flagged / Invalid</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Priority</label>
            <select className="form-control" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
              <option value="ALL">All Priorities</option>
              <option value="Urgent">Urgent (Score ≥ 65)</option>
              <option value="High">High (Score ≥ 45)</option>
              <option value="Normal">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. COMPLAINT LIST QUEUE */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={20} /> Municipal Resolution Queue ({filteredComplaints.length})
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sorted by Algorithmic Priority</span>
        </div>

        {updateMsg.text && (
          <div className={`alert alert-${updateMsg.type}`}>
            {updateMsg.text}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#64748b' }}>
            Loading municipal queue...
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
            No complaints match the selected filter criteria.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredComplaints.map((c) => {
              const pStyle = getPriorityStyle(c.priority_score || 0);
              const isVerified = c.is_verified === 1;
              const isFlagged = c.is_flagged === 1;

              return (
                <div key={c.id} style={{
                  border: isFlagged ? '2px solid #fca5a5' : isVerified ? '2px solid #c084fc' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1.25rem',
                  backgroundColor: isFlagged ? '#fff5f5' : isVerified ? '#faf5ff' : '#ffffff',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                }}>
                  {/* Card Header Badges */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge badge-${c.status}`}>{c.status.replace('_', ' ')}</span>
                      
                      {isVerified && (
                        <span style={{ backgroundColor: '#7c3aed', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: '700', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <ShieldCheck size={13} /> Verified
                        </span>
                      )}

                      {isFlagged && (
                        <span style={{ backgroundColor: '#dc2626', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontWeight: '700', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Flag size={13} /> Flagged
                        </span>
                      )}

                      <span style={{
                        backgroundColor: pStyle.bg,
                        color: pStyle.color,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '9999px',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <Zap size={12} /> Score: {c.priority_score || 0} ({pStyle.label})
                      </span>
                    </div>

                    <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#7c3aed' }}>
                      {c.complaint_code || `R2R-2026-${String(c.id).padStart(4, '0')}`}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.35rem', color: '#0f172a' }}>{c.title}</h3>
                  <p style={{ fontSize: '0.925rem', color: '#475569', marginBottom: '0.75rem', lineHeight: '1.5' }}>{c.description}</p>

                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    {c.image_url && (
                      <div 
                        onClick={() => setActiveModalId(c.id)}
                        style={{
                          width: '100px',
                          height: '75px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                      >
                        <img src={c.image_url} alt="Evidence" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}

                    <div style={{ flexGrow: 1, fontSize: '0.85rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div><MapPin size={14} color="#2563eb" /> <strong>Location:</strong> {c.location} {c.latitude ? `(${c.latitude}, ${c.longitude})` : ''}</div>
                      <div><Tag size={14} color="#2563eb" /> <strong>Category:</strong> {c.category}</div>
                      <div><strong>Reporter:</strong> {c.author_name} &bull; <strong>Upvotes:</strong> {c.support_count || 0}</div>
                    </div>
                  </div>

                  {/* AUTHORITY ACTION TOOLBAR */}
                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.875rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    
                    <button 
                      onClick={() => handleVerify(c.id)}
                      className={`btn ${isVerified ? 'btn-secondary' : 'btn-authority'}`}
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem' }}
                    >
                      <ShieldCheck size={14} /> {isVerified ? 'Verified ✓' : 'Verify Report'}
                    </button>

                    <button 
                      onClick={() => setFlaggingComplaintId(c.id)}
                      className="btn btn-outline"
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem', color: isFlagged ? '#dc2626' : '#64748b' }}
                    >
                      <Flag size={14} /> {isFlagged ? 'Flagged (Reason)' : 'Flag / Invalid'}
                    </button>

                    <button 
                      onClick={() => { setSelectedComplaintId(c.id); setStatusChange(c.status); }} 
                      className="btn btn-primary" 
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem' }}
                    >
                      <MessageSquare size={14} /> Add Remarks & Change Status
                    </button>

                    <button 
                      onClick={() => setActiveModalId(c.id)} 
                      className="btn btn-outline" 
                      style={{ padding: '0.45rem 0.85rem', fontSize: '0.825rem', marginLeft: 'auto' }}
                    >
                      <Eye size={14} /> Full Details
                    </button>
                  </div>

                  {/* Flag Reason Form */}
                  {flaggingComplaintId === c.id && (
                    <form onSubmit={handleFlagSubmit} style={{ marginTop: '0.75rem', backgroundColor: '#fee2e2', padding: '0.875rem', borderRadius: '8px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#991b1b', display: 'block', marginBottom: '0.35rem' }}>
                        Specify Flag Reason
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Duplicate report already handled under R2R-2026-0001" 
                        value={flagReason} 
                        onChange={(e) => setFlagReason(e.target.value)} 
                        required 
                        style={{ marginBottom: '0.5rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', backgroundColor: '#dc2626' }}>
                          Save Flag Status
                        </button>
                        <button type="button" onClick={() => setFlaggingComplaintId(null)} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Authority Remarks & Status Change Form */}
                  {selectedComplaintId === c.id && (
                    <form onSubmit={handleAuthorityUpdate} style={{ marginTop: '0.75rem', backgroundColor: '#faf5ff', border: '1px solid #d8b4fe', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#6b21a8' }}>
                        Add Official Remarks for Ticket {c.complaint_code || `#${c.id}`}
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b21a8' }}>Update Status</label>
                          <select 
                            className="form-control" 
                            value={statusChange} 
                            onChange={(e) => setStatusChange(e.target.value)}
                          >
                            <option value="pending">Set Status: Pending</option>
                            <option value="in_progress">Set Status: In Progress</option>
                            <option value="resolved">Set Status: Resolved</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b21a8' }}>Action Type</label>
                          <select 
                            className="form-control" 
                            value={actionType} 
                            onChange={(e) => setActionType(e.target.value)}
                          >
                            <option value="remark">Official Remark</option>
                            <option value="inspection">Site Inspection Logged</option>
                            <option value="dispatch">Workforce Dispatched</option>
                            <option value="resolution">Final Resolution Notes</option>
                          </select>
                        </div>
                      </div>

                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Enter official resolution notes, team assigned, or progress update..."
                        value={updateText}
                        onChange={(e) => setUpdateText(e.target.value)}
                        required
                      ></textarea>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn btn-authority" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }} disabled={submittingUpdate}>
                          {submittingUpdate ? 'Saving Update & Triggering Notification...' : 'Save Remarks & Change Status'}
                        </button>
                        <button type="button" onClick={() => setSelectedComplaintId(null)} className="btn btn-outline" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Complaint Details Modal */}
      {activeModalId && (
        <ComplaintDetailsModal
          complaintId={activeModalId}
          onClose={() => setActiveModalId(null)}
          token={token}
          onSupportToggle={() => onRefresh && onRefresh()}
        />
      )}

      {/* Simulated Email & SMS Notification Demo Modal */}
      {activeNotification && (
        <SimulatedNotificationModal
          notification={activeNotification}
          onClose={() => setActiveNotification(null)}
        />
      )}
    </div>
  );
}
