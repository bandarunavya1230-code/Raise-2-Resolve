import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, Navigation, Building2, Phone, Mail, Shield, 
  CheckCircle2, Compass, AlertCircle, Filter, Users,
  ExternalLink, Search, Globe, Check, Info, ShieldCheck,
  Zap, Droplets, Construction, Lightbulb, Trash2, Siren, HeartPulse,
  GraduationCap, Landmark, Copy, AlertTriangle, FileSpreadsheet, RefreshCw
} from 'lucide-react';
import { INDIAN_STATES_AND_UTS, STATE_DISTRICTS } from '../data/indiaGeographicData';

export default function FindAuthorityNearMe({ isEmbedded = false }) {
  // Selected State and District state
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState('Bengaluru Urban');
  const [stateSearchTerm, setStateSearchTerm] = useState('');
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');

  // Department directory and complaint statistics
  const [departmentList, setDepartmentList] = useState([]);
  const [totalDistrictComplaints, setTotalDistrictComplaints] = useState(0);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [copiedPhoneMap, setCopiedPhoneMap] = useState({});

  // GPS detection state
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsSuccessMsg, setGpsSuccessMsg] = useState('');
  const [gpsError, setGpsError] = useState('');

  // Icon mapping for departments
  const departmentIconMap = {
    'ELEC': Zap,
    'WATER': Droplets,
    'ROADS': Construction,
    'SANITATION': Trash2,
    'LIGHTS': Lightbulb,
    'DRAINAGE': Droplets,
    'SAFETY': Siren,
    'OTHER': Landmark
  };

  // Filtered list of States based on search
  const filteredStates = useMemo(() => {
    if (!stateSearchTerm.trim()) return INDIAN_STATES_AND_UTS;
    const term = stateSearchTerm.toLowerCase();
    return INDIAN_STATES_AND_UTS.filter(s => s.name.toLowerCase().includes(term));
  }, [stateSearchTerm]);

  // Available districts for the selected state
  const availableDistricts = useMemo(() => {
    return STATE_DISTRICTS[selectedState] || [];
  }, [selectedState]);

  // Filtered list of districts based on search
  const filteredDistricts = useMemo(() => {
    if (!districtSearchTerm.trim()) return availableDistricts;
    const term = districtSearchTerm.toLowerCase();
    return availableDistricts.filter(d => d.toLowerCase().includes(term));
  }, [availableDistricts, districtSearchTerm]);

  // Handle State Change: reset district to first available
  const handleStateChange = (newState) => {
    setSelectedState(newState);
    const districts = STATE_DISTRICTS[newState] || [];
    const firstDist = districts[0] || '';
    setSelectedDistrict(firstDist);
    setDistrictSearchTerm('');
  };

  // Fetch all respective departments and complaint counts for the chosen State and District
  const fetchDepartments = async (st, dist) => {
    if (!st || !dist) return;
    setLoadingDepartments(true);
    try {
      const res = await fetch(`/api/departments/by-district?state=${encodeURIComponent(st)}&district=${encodeURIComponent(dist)}`);
      const data = await res.json();
      if (data.success) {
        setDepartmentList(data.departments || []);
        setTotalDistrictComplaints(data.total_complaints_in_district || 0);
      }
    } catch (err) {
      console.error('Error fetching departments for district:', err);
    } finally {
      setLoadingDepartments(false);
    }
  };

  useEffect(() => {
    if (selectedState && selectedDistrict) {
      fetchDepartments(selectedState, selectedDistrict);
    }
  }, [selectedState, selectedDistrict]);

  // Handle Copy Phone Number
  const handleCopyPhone = (deptId, phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhoneMap(prev => ({ ...prev, [deptId]: true }));
    setTimeout(() => {
      setCopiedPhoneMap(prev => ({ ...prev, [deptId]: false }));
    }, 2000);
  };

  // GPS "Use My Location" to detect District and State
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError('');
    setGpsSuccessMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(`/api/authorities/near-me?lat=${lat}&lng=${lng}`);
          const data = await res.json();
          if (data.success && data.resolvedLocation) {
            const detectedState = data.resolvedLocation.state || 'Karnataka';
            const detectedDistrict = data.resolvedLocation.district || 'Bengaluru Urban';
            setSelectedState(detectedState);
            setSelectedDistrict(detectedDistrict);
            setGpsSuccessMsg(`Detected Location: ${detectedDistrict}, ${detectedState}`);
          }
        } catch (err) {
          setGpsError('Could not resolve location coordinates.');
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError('Location permission denied or unavailable.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Filter departments by selected category tab if any
  const displayedDepartments = useMemo(() => {
    if (selectedCategoryFilter === 'ALL') return departmentList;
    return departmentList.filter(d => 
      d.code === selectedCategoryFilter || 
      d.category.toLowerCase().includes(selectedCategoryFilter.toLowerCase())
    );
  }, [departmentList, selectedCategoryFilter]);

  return (
    <div className={isEmbedded ? "" : "card"} style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      padding: isEmbedded ? '1rem 0' : '2rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      
      {/* 1. Header Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: '1.25rem'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#2563EB', fontWeight: '700', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <Building2 size={16} /> Official Government Directory
          </div>
          <h3 style={{ fontSize: '1.45rem', fontWeight: '800', color: '#0F172A', marginTop: '0.2rem', lineHeight: '1.2' }}>
            Find Authority & Department Directory
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Choose your State and District below to view respective responsible departments, verified official contact details, and filed complaint metrics.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDetectLocation}
          className="btn btn-outline"
          disabled={gpsLoading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            fontSize: '0.85rem',
            fontWeight: '600',
            borderColor: '#CBD5E1',
            color: '#334155'
          }}
        >
          <Compass size={16} className={gpsLoading ? "animate-spin" : ""} color="#2563EB" />
          {gpsLoading ? 'Detecting...' : 'Detect Near Me'}
        </button>
      </div>

      {gpsSuccessMsg && (
        <div style={{
          backgroundColor: '#F0FDF4',
          color: '#166534',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid #BBF7D0',
          fontSize: '0.875rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} color="#16A34A" />
          <span>{gpsSuccessMsg}</span>
        </div>
      )}

      {gpsError && (
        <div style={{
          backgroundColor: '#FEF2F2',
          color: '#991B1B',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid #FECACA',
          fontSize: '0.875rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} color="#DC2626" />
          <span>{gpsError}</span>
        </div>
      )}

      {/* 2. State & District Selectors */}
      <div style={{
        backgroundColor: '#F8FAFC',
        padding: '1.25rem',
        borderRadius: '12px',
        border: '1px solid #E2E8F0',
        marginBottom: '1.75rem'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.25rem'
        }}>
          {/* Select State */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#334155',
              marginBottom: '0.45rem'
            }}>
              Step 1: Select State / Union Territory *
            </label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                borderColor: '#CBD5E1',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF'
              }}
            >
              {filteredStates.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name} {s.type === 'ut' ? '(UT)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Select District */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#334155',
              marginBottom: '0.45rem'
            }}>
              Step 2: Select District / Administrative Area *
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="form-control"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                fontSize: '0.9rem',
                fontWeight: '600',
                borderColor: '#CBD5E1',
                borderRadius: '8px',
                backgroundColor: '#FFFFFF'
              }}
            >
              {filteredDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Jurisdiction Summary Bar */}
        <div style={{
          marginTop: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.85rem',
          color: '#475569'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={16} color="#2563EB" />
            <span>
              Selected Jurisdiction: <strong>{selectedDistrict}</strong>, <strong>{selectedState}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              padding: '0.25rem 0.65rem',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.8rem'
            }}>
              {departmentList.length} Respective Departments
            </span>

            <span style={{
              backgroundColor: totalDistrictComplaints > 0 ? '#FEF3C7' : '#F1F5F9',
              color: totalDistrictComplaints > 0 ? '#92400E' : '#475569',
              padding: '0.25rem 0.65rem',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.8rem'
            }}>
              {totalDistrictComplaints} Total Complaints Filed
            </span>
          </div>
        </div>
      </div>

      {/* 3. Category Quick Filter Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        overflowX: 'auto',
        paddingBottom: '0.75rem',
        marginBottom: '1.25rem',
        borderBottom: '1px solid #F1F5F9'
      }}>
        <button
          type="button"
          onClick={() => setSelectedCategoryFilter('ALL')}
          className={selectedCategoryFilter === 'ALL' ? 'btn btn-primary' : 'btn btn-outline'}
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            borderRadius: '20px'
          }}
        >
          All Departments ({departmentList.length})
        </button>

        {departmentList.map(dept => (
          <button
            key={dept.id}
            type="button"
            onClick={() => setSelectedCategoryFilter(dept.code)}
            className={selectedCategoryFilter === dept.code ? 'btn btn-primary' : 'btn btn-outline'}
            style={{
              padding: '0.4rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              borderRadius: '20px',
              borderColor: selectedCategoryFilter === dept.code ? '#2563EB' : '#E2E8F0',
              color: selectedCategoryFilter === dept.code ? '#FFFFFF' : '#475569'
            }}
          >
            {dept.name} ({dept.complaints_count})
          </button>
        ))}
      </div>

      {/* 4. Respective Department Details Cards */}
      {loadingDepartments ? (
        <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <RefreshCw className="animate-spin" size={32} color="#2563EB" style={{ margin: '0 auto 0.75rem auto' }} />
          <p style={{ color: '#64748B', fontWeight: '600' }}>
            Retrieving respective department contacts and complaint statistics for {selectedDistrict}...
          </p>
        </div>
      ) : displayedDepartments.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1.5rem',
          backgroundColor: '#F8FAFC',
          borderRadius: '12px',
          border: '1px dashed #CBD5E1',
          color: '#64748B'
        }}>
          <Building2 size={36} color="#94A3B8" style={{ margin: '0 auto 0.5rem auto' }} />
          <h4 style={{ fontWeight: '700', color: '#334155' }}>No Departments Found</h4>
          <p style={{ fontSize: '0.875rem' }}>Please select another State and District to view responsible departments.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '1.25rem'
        }}>
          {displayedDepartments.map((dept) => {
            const IconComponent = departmentIconMap[dept.code] || Building2;
            const isCopied = copiedPhoneMap[dept.id];

            return (
              <div 
                key={dept.id} 
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '1.4rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Department Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.85rem',
                  marginBottom: '1rem',
                  borderBottom: '1px solid #F1F5F9',
                  paddingBottom: '0.85rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{
                      backgroundColor: '#EFF6FF',
                      padding: '0.65rem',
                      borderRadius: '10px',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <IconComponent size={22} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                          {dept.name}
                        </h4>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          backgroundColor: '#F1F5F9',
                          color: '#475569',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px'
                        }}>
                          {dept.code}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.875rem', color: '#0284C7', fontWeight: '600', marginTop: '0.2rem' }}>
                        🏛️ {dept.authority_name}
                      </div>
                      
                      <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '0.15rem' }}>
                        Office: {dept.office_title} • SLA Target: {dept.sla_hours} hrs
                      </div>
                    </div>
                  </div>

                  {/* Number of Complaints Filed Badge */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      backgroundColor: dept.complaints_count > 0 ? '#EFF6FF' : '#F8FAFC',
                      color: dept.complaints_count > 0 ? '#1D4ED8' : '#64748B',
                      border: dept.complaints_count > 0 ? '1px solid #BFDBFE' : '1px solid #E2E8F0'
                    }}>
                      <FileSpreadsheet size={15} color={dept.complaints_count > 0 ? "#2563EB" : "#94A3B8"} />
                      <span>{dept.complaints_count} Complaints Filed</span>
                    </div>

                    {dept.complaints_count > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '0.25rem' }}>
                        {dept.verified_complaints_count} Verified • {dept.resolved_complaints_count} Resolved
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact & Location Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                  backgroundColor: '#F8FAFC',
                  padding: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.85rem'
                }}>
                  {/* Office Address */}
                  <div>
                    <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                      Office Location / Address
                    </div>
                    <div style={{
                      color: '#334155',
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.4rem',
                      lineHeight: '1.4'
                    }}>
                      <MapPin size={15} color="#2563EB" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                      <span>{dept.office_address}</span>
                    </div>
                  </div>

                  {/* Helpline / Phone */}
                  <div>
                    <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                      Official Helpline / Contact
                    </div>
                    <div style={{
                      marginTop: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <a
                        href={`tel:${dept.contact_phone}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontWeight: '700',
                          fontSize: '0.95rem',
                          color: '#0F766E'
                        }}
                      >
                        <Phone size={15} color="#0D9488" /> {dept.contact_phone}
                      </a>

                      <button
                        type="button"
                        onClick={() => handleCopyPhone(dept.id, dept.contact_phone)}
                        style={{
                          background: 'none',
                          border: '1px solid #CBD5E1',
                          borderRadius: '4px',
                          padding: '0.15rem 0.4rem',
                          fontSize: '0.725rem',
                          cursor: 'pointer',
                          color: isCopied ? '#16A34A' : '#64748B',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}
                      >
                        {isCopied ? <Check size={11} /> : <Copy size={11} />}
                        {isCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Official Email */}
                  <div>
                    <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                      Official Email
                    </div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <a
                        href={`mailto:${dept.contact_email}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#2563EB',
                          fontWeight: '600'
                        }}
                      >
                        <Mail size={14} color="#2563EB" />
                        {dept.contact_email}
                      </a>
                    </div>
                  </div>

                  {/* Official Website */}
                  <div>
                    <div style={{ fontSize: '0.725rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                      Government Portal
                    </div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <a
                        href={dept.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: '#0F766E',
                          fontWeight: '600'
                        }}
                      >
                        <Globe size={14} color="#0D9488" />
                        Visit Official Website
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Footer Bar: Directions Link & Verified Directory Badge */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px solid #F1F5F9'
                }}>
                  {dept.directions_url ? (
                    <a
                      href={dept.directions_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.45rem 0.9rem',
                        fontSize: '0.825rem',
                        fontWeight: '600',
                        color: '#0284C7',
                        borderColor: '#BAE6FD'
                      }}
                    >
                      <Navigation size={14} color="#0284C7" />
                      Get Directions (Google Maps)
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      Jurisdiction: {dept.jurisdiction_level}
                    </span>
                  )}

                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.8rem',
                    color: '#047857',
                    backgroundColor: '#ECFDF5',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #A7F3D0',
                    fontWeight: '600'
                  }}>
                    <ShieldCheck size={14} color="#059669" />
                    Verified Official Contact Details
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Information-only note */}
      <div style={{
        marginTop: '1.5rem',
        padding: '0.85rem 1rem',
        backgroundColor: '#F8FAFC',
        borderRadius: '8px',
        border: '1px solid #E2E8F0',
        fontSize: '0.8rem',
        color: '#64748B',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Info size={16} color="#64748B" />
        <span>
          Information-only directory: Official contact details and complaint statistics based on selected State & District. To file a civic issue, please log in to your citizen account and use the portal dashboard.
        </span>
      </div>

    </div>
  );
}
