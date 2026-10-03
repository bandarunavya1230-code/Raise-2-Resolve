import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Tag, Shield, Zap, AlertTriangle, Filter, Layers, Info } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function SectorGISMap({ complaints = [], onSelectComplaint }) {
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [mapError, setMapError] = useState(false);
  const [activePin, setActivePin] = useState(null);

  const mapContainerRef = useRef(null);
  const leafletMapRef = useRef(null);

  // Categories list
  const sectors = [
    'ALL',
    'Electricity',
    'Water Supply',
    'Roads/Public Works',
    'Sanitation/Waste Management',
    'Streetlights',
    'Drainage',
    'Public Safety',
    'Other'
  ];

  // Filter complaints by selected sector
  const filteredComplaints = complaints.filter(c => {
    if (selectedSector === 'ALL') return true;
    return c.category === selectedSector || (c.category && c.category.toLowerCase().includes(selectedSector.toLowerCase().split('/')[0]));
  });

  // Sector Color Mapping
  const sectorColors = {
    'Electricity': '#eab308',
    'Water Supply': '#0284c7',
    'Roads/Public Works': '#f59e0b',
    'Roads & Potholes': '#f59e0b',
    'Sanitation/Waste Management': '#14b8a6',
    'Waste Management': '#14b8a6',
    'Streetlights': '#38bdf8',
    'Electricity & Lighting': '#38bdf8',
    'Drainage': '#64748b',
    'Drainage & Sewage': '#64748b',
    'Public Safety': '#dc2626',
    'Other': '#8b5cf6'
  };

  // Initialize Leaflet Map with Safe Fallback
  useEffect(() => {
    if (mapError || !mapContainerRef.current) return;

    try {
      if (!leafletMapRef.current) {
        // Center around city base coordinates (12.9716, 77.5946)
        const map = L.map(mapContainerRef.current, {
          center: [12.9716, 77.5946],
          zoom: 13,
          zoomControl: true
        });

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        leafletMapRef.current = map;
      }

      const map = leafletMapRef.current;

      // Clear existing markers
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
          map.removeLayer(layer);
        }
      });

      // Add pins for filtered complaints
      filteredComplaints.forEach((c) => {
        const lat = c.latitude || 12.9716;
        const lng = c.longitude || 77.5946;
        const color = sectorColors[c.category] || '#2563eb';

        const marker = L.circleMarker([lat, lng], {
          radius: 9,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }).addTo(map);

        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px; max-width: 200px;">
            <div style="font-size: 11px; font-weight: bold; color: #2563eb;">${c.complaint_code || `R2R-${c.id}`}</div>
            <div style="font-size: 13px; font-weight: bold; margin: 2px 0;">${c.title}</div>
            <div style="font-size: 11px; color: #64748b;">📍 ${c.location}</div>
            <div style="font-size: 11px; color: #475569; margin-top: 4px;">Category: <b>${c.category}</b></div>
            <div style="font-size: 11px; color: #dc2626; font-weight: bold;">Priority Score: ${c.priority_score || 0}</div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.on('click', () => {
          setActivePin(c);
          if (onSelectComplaint) onSelectComplaint(c.id);
        });
      });

    } catch (err) {
      console.warn('Leaflet map initialization failed, falling back to SVG Sector Grid:', err);
      setMapError(true);
    }
  }, [filteredComplaints, mapError]);

  return (
    <div className="card" style={{ padding: '1.25rem', backgroundColor: '#ffffff', marginBottom: '1.5rem' }}>
      
      {/* Header & Sector Filter Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={20} color="#2563eb" /> GIS Municipal Sector Map Visualization
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Real-time geospatial mapping of complaints by latitude & longitude
          </p>
        </div>

        {/* Sector Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers size={16} color="#7c3aed" />
          <select
            className="form-control"
            value={selectedSector}
            onChange={(e) => setSelectedSector(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', fontWeight: '600' }}
          >
            {sectors.map(sec => (
              <option key={sec} value={sec}>
                {sec === 'ALL' ? '🗺️ All Sector Categories' : `Sector: ${sec}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Display Box */}
      {!mapError ? (
        <div 
          ref={mapContainerRef} 
          style={{ 
            height: '380px', 
            width: '100%', 
            borderRadius: '10px', 
            overflow: 'hidden', 
            border: '1px solid #cbd5e1',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            zIndex: 1
          }} 
        />
      ) : (
        /* SAFE SVG SECTOR GRID FALLBACK */
        <div style={{
          height: '380px',
          width: '100%',
          borderRadius: '10px',
          backgroundColor: '#0f172a',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={16} /> SVG Geospatial Sector Canvas (Offline Fallback Mode)
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Active Pins: {filteredComplaints.length}
            </span>
          </div>

          {/* Interactive SVG Sector Canvas */}
          <svg style={{ width: '100%', height: '260px', overflow: 'visible' }}>
            {/* Grid lines */}
            <line x1="0" y1="60" x2="100%" y2="60" stroke="#1e293b" strokeDasharray="4" />
            <line x1="0" y1="130" x2="100%" y2="130" stroke="#1e293b" strokeDasharray="4" />
            <line x1="0" y1="200" x2="100%" y2="200" stroke="#1e293b" strokeDasharray="4" />

            <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#1e293b" strokeDasharray="4" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#1e293b" strokeDasharray="4" />
            <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#1e293b" strokeDasharray="4" />

            {/* Plot complaint pins dynamically on grid */}
            {filteredComplaints.map((c, idx) => {
              const xPct = 15 + ((c.id * 17 + idx * 23) % 70);
              const yPct = 20 + ((c.id * 29 + idx * 19) % 65);
              const color = sectorColors[c.category] || '#3b82f6';
              const isSelected = activePin?.id === c.id;

              return (
                <g key={c.id} onClick={() => { setActivePin(c); if (onSelectComplaint) onSelectComplaint(c.id); }} style={{ cursor: 'pointer' }}>
                  <circle 
                    cx={`${xPct}%`} 
                    cy={`${yPct}%`} 
                    r={isSelected ? 10 : 7} 
                    fill={color} 
                    stroke="#ffffff" 
                    strokeWidth={isSelected ? 3 : 2} 
                  />
                  <text 
                    x={`${xPct}%`} 
                    y={`${yPct - 10}%`} 
                    fill="#ffffff" 
                    fontSize="10" 
                    textAnchor="middle" 
                    fontWeight="bold"
                  >
                    {c.complaint_code || `#${c.id}`}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Fallback Active Pin Info */}
          {activePin && (
            <div style={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{activePin.complaint_code || `#${activePin.id}`}</strong>: {activePin.title} ({activePin.location})
              </div>
              <span style={{ color: '#60a5fa', fontWeight: '700' }}>Score: {activePin.priority_score}</span>
            </div>
          )}
        </div>
      )}

      {/* Map Legend */}
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.775rem', color: '#64748b' }}>
        <span style={{ fontWeight: '700', color: '#0f172a' }}>Category Colors:</span>
        {Object.entries(sectorColors).map(([cat, color]) => (
          <span key={cat} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color, display: 'inline-block' }}></span>
            {cat}
          </span>
        ))}
      </div>
    </div>
  );
}
