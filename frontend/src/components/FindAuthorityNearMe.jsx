import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Navigation, Building2, Phone, Mail, Shield, 
  CheckCircle2, Compass, AlertCircle, ChevronRight, Filter, Users,
  ExternalLink, Search, Globe, FileText, Check, ArrowRight, Info,
  Zap, Droplets, Construction, Lightbulb, Trash2, Siren, HeartPulse,
  GraduationCap, Landmark, FileSpreadsheet, Copy
} from 'lucide-react';
import { INDIAN_STATES_AND_UTS, STATE_DISTRICTS, VERIFIED_CATEGORIES } from '../data/indiaGeographicData';

export default function FindAuthorityNearMe({ onSelectLocation, isEmbedded = false }) {
  // Mode selection: 'manual' (default) or 'gps'
  const [activeTab, setActiveTab] = useState('manual');

  // Searchable State & District state
  const [stateSearchTerm, setStateSearchTerm] = useState('');
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Bengaluru Urban');

  // Manual Locality Fields (Requirement #3)
  const [ward, setWard] = useState('');
  const [village, setVillage] = useState('');
  const [localArea, setLocalArea] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [mandalTaluk, setMandalTaluk] = useState('');
  const [pincode, setPincode] = useState('');

  // Selected Issue / Department (Requirement #5)
  const [selectedCategory, setSelectedCategory] = useState('Electricity');

  // GPS Coordinates & Status (Requirement #4)
  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [gpsSuccessMsg, setGpsSuccessMsg] = useState('');

  // Authority Result state
  const [authorityResult, setAuthorityResult] = useState(null);
  const [loadingResult, setLoadingResult] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const navigate = useNavigate();

  // Category Icon Mapping
  const categoryIconMap = {
    'Electricity': Zap,
    'Water': Droplets,
    'Roads': Construction,
    'Street Lights': Lightbulb,
    'Garbage/Sanitation': Trash2,
    'Police': Siren,
    'Health': HeartPulse,
    'Education': GraduationCap,
    'Municipal Services': Landmark,
    'Revenue/Land': FileSpreadsheet,
    'Other': Building2
  };

  // Filtered States list based on search term
  const filteredStates = useMemo(() => {
    if (!stateSearchTerm.trim()) return INDIAN_STATES_AND_UTS;
    const term = stateSearchTerm.toLowerCase();
    return INDIAN_STATES_AND_UTS.filter(s => s.name.toLowerCase().includes(term));
  }, [stateSearchTerm]);

  // Available districts for the selected state
  const currentDistricts = useMemo(() => {
    return STATE_DISTRICTS[selectedState] || [];
  }, [selectedState]);

  // Filtered districts list based on search term
  const filteredDistricts = useMemo(() => {
    if (!districtSearchTerm.trim()) return currentDistricts;
    const term = districtSearchTerm.toLowerCase();
    return currentDistricts.filter(d => d.toLowerCase().includes(term));
  }, [currentDistricts, districtSearchTerm]);

  // Handle State Change: reset district to first available in that state
  const handleStateChange = (newState) => {
    setSelectedState(newState);
    const districts = STATE_DISTRICTS[newState] || [];
    const firstDist = districts[0] || '';
    setSelectedDistrict(firstDist);
    setDistrictSearchTerm('');
  };

  // Fetch Authority Details from Backend API
  const fetchAuthorityDetails = async (overrideState, overrideDistrict, overrideCoords, overrideCategory) => {
    setLoadingResult(true);
    setGpsError('');

    const targetState = overrideState || selectedState;
    const targetDistrict = overrideDistrict || selectedDistrict;
    const targetCategory = overrideCategory || selectedCategory;
    const coords = overrideCoords || gpsCoords;

    try {
      const params = new URLSearchParams({
        state: targetState || '',
        district: targetDistrict || '',
        category: targetCategory || '',
        ward: ward.trim(),
        village: village.trim(),
        local_area: localArea.trim(),
        municipality: municipality.trim(),
        mandal_taluk: mandalTaluk.trim(),
        pincode: pincode.trim()
      });

      if (coords?.lat && coords?.lng) {
        params.append('lat', coords.lat);
        params.append('lng', coords.lng);
      }

      const res = await fetch(`/api/authorities/near-me?${params.toString()}`);
      const data = await res.json();

      if (data.success && (data.authority || data.primaryAuthority)) {
        setAuthorityResult(data.authority || data.primaryAuthority);
      } else {
        setAuthorityResult(null);
      }
    } catch (err) {
      console.error('Error fetching authority:', err);
    } finally {
      setLoadingResult(false);
    }
  };

  // Trigger initial lookup on mount or when category/district changes
  useEffect(() => {
    if (selectedState && selectedDistrict) {
      fetchAuthorityDetails();
    }
  }, [selectedState, selectedDistrict, selectedCategory]);

  // GPS "Use My Location" Handler (Requirement #4)
  const handleUseMyLocation = () => {
    setGpsError('');
    setGpsSuccessMsg('');

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser. Please select your State and District manually below.');
      return;
    }

    setGpsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setGpsCoords({ lat, lng });

          // Call reverse-geocoding endpoint to identify closest State & District
          const geoRes = await fetch(`/api/locations/reverse-geocode?lat=${lat}&lng=${lng}`);
          const geoData = await geoRes.json();

          if (geoData.success && geoData.state) {
            setSelectedState(geoData.state);
            if (geoData.district) {
              setSelectedDistrict(geoData.district);
            }
            setGpsSuccessMsg(`Detected jurisdiction: ${geoData.district ? geoData.district + ', ' : ''}${geoData.state} (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            
            // Immediately resolve authority with detected coordinates
            fetchAuthorityDetails(geoData.state, geoData.district, { lat, lng }, selectedCategory);
          } else {
            setGpsSuccessMsg(`Location captured (${lat.toFixed(4)}, ${lng.toFixed(4)}). Finding nearest authority...`);
            fetchAuthorityDetails(selectedState, selectedDistrict, { lat, lng }, selectedCategory);
          }
        } catch (err) {
          console.error('Reverse geocode error:', err);
          setGpsError('Detected coordinates, but could not determine exact administrative boundary. Please confirm your State & District manually.');
        } finally {
          setGpsLoading(false);
        }
      },
      (error) => {
        setGpsLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsError('Location permission was denied. Please select your State, District, and Local Area manually below.');
        } else if (error.code === error.TIMEOUT) {
          setGpsError('Location request timed out. Please select your location manually.');
        } else {
          setGpsError('Unable to detect GPS position. Please use manual location selection.');
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  // Copy Phone Number to clipboard helper
  const handleCopyPhone = (phoneNumber) => {
    if (!phoneNumber) return;
    navigator.clipboard.writeText(phoneNumber);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  // Apply to Report Form / Dashboard Navigation
  const handleApplyToForm = () => {
    const localityLabel = [
      ward ? `Ward: ${ward}` : null,
      village ? `Village: ${village}` : null,
      localArea ? `Area: ${localArea}` : null,
      municipality ? `Municipality: ${municipality}` : null,
      mandalTaluk ? `Taluk: ${mandalTaluk}` : null,
      pincode ? `PIN: ${pincode}` : null
    ].filter(Boolean).join(', ');

    const payload = {
      state: selectedState,
      district: selectedDistrict,
      city_town_village: municipality || village || selectedDistrict,
      ward_area: ward || localArea || 'Central Zone',
      location_type: village ? 'village' : municipality ? 'town' : 'city',
      landmark: localityLabel,
      category: selectedCategory,
      authority: authorityResult
    };

    if (onSelectLocation) {
      onSelectLocation(payload);
    } else {
      navigate('/dashboard', {
        state: {
          prefilledLocation: payload
        }
      });
    }
  };

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
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '1px solid #E2E8F0',
        paddingBottom: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
            flexShrink: 0
          }}>
            <Compass size={24} strokeWidth={2.4} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0F172A', lineHeight: '1.2' }}>
              Find Authority Near Me
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.875rem', marginTop: '0.15rem' }}>
              Official Directory of Municipal, District & State Grievance Authorities across all 28 States & 8 UTs of India
            </p>
          </div>
        </div>

        {/* Optional "Use My Location" Button (Requirement #4) */}
        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={gpsLoading}
          className="btn btn-outline"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.15rem',
            fontSize: '0.875rem',
            borderColor: '#38BDF8',
            color: '#0284C7',
            backgroundColor: '#F0F9FF',
            fontWeight: '700'
          }}
        >
          <Navigation size={16} color="#0284C7" className={gpsLoading ? "spinner" : ""} />
          {gpsLoading ? 'Detecting Location...' : 'Use My Location'}
        </button>
      </div>

      {/* GPS Status / Feedback Alerts */}
      {gpsSuccessMsg && (
        <div style={{
          backgroundColor: '#F0FDF4',
          color: '#166534',
          border: '1px solid #BBF7D0',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          fontSize: '0.85rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={17} color="#16A34A" style={{ flexShrink: 0 }} />
          <span>{gpsSuccessMsg}</span>
        </div>
      )}

      {gpsError && (
        <div style={{
          backgroundColor: '#FEF2F2',
          color: '#991B1B',
          border: '1px solid #FECACA',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          fontSize: '0.85rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={17} color="#DC2626" style={{ flexShrink: 0 }} />
          <span>{gpsError}</span>
        </div>
      )}

      {/* 2. Step 1: Issue / Department Category Selector (Requirement #5) */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          fontSize: '0.85rem',
          fontWeight: '700',
          color: '#334155',
          marginBottom: '0.65rem'
        }}>
          1. Select Civic Issue / Department
        </label>

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}>
          {VERIFIED_CATEGORIES.map(cat => {
            const IconComp = categoryIconMap[cat] || Building2;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.825rem',
                  fontWeight: '600',
                  border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                  backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                  color: isSelected ? '#1E40AF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 1px 3px rgba(37, 99, 235, 0.12)' : 'none'
                }}
              >
                <IconComp size={15} color={isSelected ? '#2563EB' : '#64748B'} />
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Step 2: Location Selection (State, District & Local Details) */}
      <div style={{
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.75rem'
      }}>
        
        {/* State & District Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem'
        }}>
          
          {/* State / UT Searchable Dropdown (Requirement #1) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B' }}>
                2. State / Union Territory ({INDIAN_STATES_AND_UTS.length} Total)
              </label>
            </div>

            {/* Optional search input to filter state */}
            <div style={{ position: 'relative', marginBottom: '0.35rem' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                value={stateSearchTerm}
                onChange={(e) => setStateSearchTerm(e.target.value)}
                placeholder="Filter State / UT..."
                className="form-control"
                style={{
                  paddingLeft: '32px',
                  paddingTop: '0.35rem',
                  paddingBottom: '0.35rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>

            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.875rem', backgroundColor: '#FFFFFF', fontWeight: '600' }}
            >
              <optgroup label="States (28)">
                {filteredStates.filter(s => s.type === 'state').map(s => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </optgroup>
              <optgroup label="Union Territories (8)">
                {filteredStates.filter(s => s.type === 'ut').map(s => (
                  <option key={s.name} value={s.name}>🏛️ {s.name}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* District Dropdown belonging only to selected State (Requirement #2) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1E293B' }}>
                3. District ({currentDistricts.length} in {selectedState})
              </label>
            </div>

            {/* Optional search input to filter district */}
            <div style={{ position: 'relative', marginBottom: '0.35rem' }}>
              <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                value={districtSearchTerm}
                onChange={(e) => setDistrictSearchTerm(e.target.value)}
                placeholder={`Filter ${selectedState} district...`}
                className="form-control"
                style={{
                  paddingLeft: '32px',
                  paddingTop: '0.35rem',
                  paddingBottom: '0.35rem',
                  fontSize: '0.8rem',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>

            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="form-control"
              style={{ fontSize: '0.875rem', backgroundColor: '#FFFFFF', fontWeight: '600' }}
            >
              {filteredDistricts.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Manual Locality Fields (Requirement #3) */}
        <div>
          <div style={{
            fontSize: '0.78rem',
            fontWeight: '700',
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginBottom: '0.65rem'
          }}>
            4. Local Area Details (Optional: Refines Nearest Office)
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '0.75rem'
          }}>
            
            {/* Ward */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B' }}>Ward / Division No.</label>
              <input
                type="text"
                value={ward}
                onChange={(e) => setWard(e.target.value)}
                placeholder="e.g. Ward 82"
                className="form-control"
                style={{ fontSize: '0.825rem', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Village */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B' }}>Village Name</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                placeholder="e.g. Nelamangala"
                className="form-control"
                style={{ fontSize: '0.825rem', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Local Area */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B' }}>Local Area / Street</label>
              <input
                type="text"
                value={localArea}
                onChange={(e) => setLocalArea(e.target.value)}
                placeholder="e.g. 100 Ft Road"
                className="form-control"
                style={{ fontSize: '0.825rem', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Municipality */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B' }}>Municipality / Corp</label>
              <input
                type="text"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="e.g. City Municipal Council"
                className="form-control"
                style={{ fontSize: '0.825rem', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Mandal / Block / Taluk */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B' }}>Mandal / Block / Taluk</label>
              <input
                type="text"
                value={mandalTaluk}
                onChange={(e) => setMandalTaluk(e.target.value)}
                placeholder="e.g. North Taluk"
                className="form-control"
                style={{ fontSize: '0.825rem', backgroundColor: '#FFFFFF' }}
              />
            </div>

            {/* Pincode */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748B' }}>Pincode (6-digits)</label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 560038"
                className="form-control"
                style={{ fontSize: '0.825rem', backgroundColor: '#FFFFFF' }}
              />
            </div>

          </div>

          <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => fetchAuthorityDetails()}
              disabled={loadingResult}
              className="btn btn-primary"
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.875rem' }}
            >
              {loadingResult ? 'Resolving...' : 'Lookup Responsible Authority'}
            </button>
          </div>
        </div>

      </div>

      {/* 4. Authority Result Display (Requirements #6, #7, #8, #9, #10) */}
      {loadingResult ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748B' }}>
          <div className="spinner" style={{ marginBottom: '0.75rem' }} />
          <p style={{ fontSize: '0.9rem' }}>Identifying official government authority for {selectedDistrict}, {selectedState}...</p>
        </div>
      ) : authorityResult ? (
        <div style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          border: '1.5px solid #BAE6FD',
          overflow: 'hidden',
          boxShadow: '0 4px 14px -2px rgba(15, 23, 42, 0.06)'
        }}>
          
          {/* Header Banner: Department & Jurisdiction Level */}
          <div style={{
            background: 'linear-gradient(90deg, #F0F9FF 0%, #EBF5FB 100%)',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #BAE6FD',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                padding: '0.3rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <Shield size={13} /> {authorityResult.jurisdictionLevel || 'District Level'}
              </span>

              <span style={{ fontSize: '0.9rem', color: '#0369A1', fontWeight: '700' }}>
                {authorityResult.department || selectedCategory}
              </span>
            </div>

            {/* Distance indicator (Requirement #10) */}
            {authorityResult.distanceKm !== null && authorityResult.distanceKm !== undefined && (
              <span style={{
                backgroundColor: '#EFF6FF',
                color: '#1E40AF',
                border: '1px solid #BFDBFE',
                padding: '0.25rem 0.65rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}>
                📍 ~{authorityResult.distanceKm} km from detected location
              </span>
            )}
          </div>

          {/* Clear message when exact ward-level officer data is not available (Requirement #8) */}
          {authorityResult.fallbackNote && (
            <div style={{
              backgroundColor: '#FFFBEB',
              color: '#92400E',
              borderBottom: '1px solid #FDE68A',
              padding: '0.75rem 1.5rem',
              fontSize: '0.825rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Info size={16} color="#D97706" style={{ flexShrink: 0 }} />
              <span>{authorityResult.fallbackNote}</span>
            </div>
          )}

          {/* Main Authority Information Grid */}
          <div style={{ padding: '1.5rem' }}>
            
            {/* Title & Official Office */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                Responsible Government Authority
              </span>
              <h4 style={{
                fontSize: '1.3rem',
                fontWeight: '800',
                color: '#0F172A',
                marginTop: '0.2rem',
                marginBottom: '0.35rem',
                lineHeight: '1.3'
              }}>
                {authorityResult.authorityName}
              </h4>
              <div style={{ fontSize: '0.95rem', color: '#0284C7', fontWeight: '700' }}>
                🏛️ {authorityResult.office}
              </div>
            </div>

            {/* Information Grid: Address, Phone, Website, Grievance Portal */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1rem',
              backgroundColor: '#F8FAFC',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              marginBottom: '1.25rem'
            }}>
              
              {/* Address */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                  Official Address
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: '#334155',
                  marginTop: '0.3rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.4rem',
                  lineHeight: '1.5'
                }}>
                  <MapPin size={16} color="#2563EB" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                  <span>{authorityResult.address}</span>
                </div>
              </div>

              {/* Phone / Helpline */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                  Official Helpline / Phone
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  marginTop: '0.3rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}>
                  <a
                    href={`tel:${authorityResult.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontWeight: '800',
                      fontSize: '1rem',
                      color: '#0F766E'
                    }}
                  >
                    <Phone size={16} color="#0D9488" /> {authorityResult.phone}
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyPhone(authorityResult.phone)}
                    style={{
                      background: 'none',
                      border: '1px solid #CBD5E1',
                      borderRadius: '4px',
                      padding: '0.2rem 0.45rem',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      color: copiedPhone ? '#16A34A' : '#64748B',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    {copiedPhone ? <Check size={12} /> : <Copy size={12} />}
                    {copiedPhone ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Official Website (Requirement #10) */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                  Official Government Website
                </div>
                <div style={{ marginTop: '0.3rem' }}>
                  {authorityResult.websiteUrl ? (
                    <a
                      href={authorityResult.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.875rem',
                        color: '#2563EB',
                        fontWeight: '700'
                      }}
                    >
                      <Globe size={15} color="#2563EB" />
                      Visit Official Portal
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Directory link unavailable</span>
                  )}
                </div>
              </div>

              {/* Official Complaint Portal (Requirement #10) */}
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
                  Online Grievance / Complaint Portal
                </div>
                <div style={{ marginTop: '0.3rem' }}>
                  {authorityResult.portalUrl ? (
                    <a
                      href={authorityResult.portalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.875rem',
                        color: '#0D9488',
                        fontWeight: '700'
                      }}
                    >
                      <FileText size={15} color="#0D9488" />
                      Lodge Complaint Online
                      <ExternalLink size={13} />
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Online portal unavailable</span>
                  )}
                </div>
              </div>

            </div>

            {/* Action Bar: Directions & File Complaint */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.85rem',
              borderTop: '1px solid #E2E8F0',
              paddingTop: '1.25rem'
            }}>
              
              {/* Get Directions Button (Requirement #10) */}
              {authorityResult.directionsUrl && (
                <a
                  href={authorityResult.directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1.15rem',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    color: '#0284C7',
                    borderColor: '#BAE6FD'
                  }}
                >
                  <Navigation size={15} color="#0284C7" />
                  Get Directions (Google Maps)
                  <ExternalLink size={13} />
                </a>
              )}

              {/* Action to file complaint in Raise 2 Resolve */}
              <button
                type="button"
                onClick={handleApplyToForm}
                className="btn btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.9rem',
                  fontWeight: '700'
                }}
              >
                File Complaint Under This Authority
                <ArrowRight size={16} />
              </button>

            </div>

          </div>

        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748B' }}>
          <p>Please select a State and District to identify the responsible authority.</p>
        </div>
      )}

    </div>
  );
}
