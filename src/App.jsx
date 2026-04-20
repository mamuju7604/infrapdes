import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { renderToString } from 'react-dom/server';
import { MapIcon, Filter, Layers, Navigation, MapPin, GraduationCap, HeartPulse, ShoppingBag, Landmark, X } from 'lucide-react';
import './index.css';

// Fix for default Leaflet markers issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Category colors based on CSS root variables
const KAT_COLORS = {
  'PENDIDIKAN NEGERI': '#3b82f6', // blue
  'PENDIDIKAN SWASTA': '#8b5cf6', // purple
  'KESEHATAN': '#ef4444',        // red
  'EKONOMI': '#10b981',         // green
  'PERBANKAN': '#f59e0b'        // gold
};

const KAT_ICONS = {
  'PENDIDIKAN NEGERI': <GraduationCap size={16} color="#ffffff" />,
  'PENDIDIKAN SWASTA': <GraduationCap size={16} color="#ffffff" />,
  'KESEHATAN': <HeartPulse size={16} color="#ffffff" />,
  'EKONOMI': <ShoppingBag size={16} color="#ffffff" />,
  'PERBANKAN': <Landmark size={16} color="#ffffff" />
};

const createCustomIcon = (color, category) => {
  const iconComponent = KAT_ICONS[category] || <MapPin size={16} color="#ffffff" />;
  const iconHtml = renderToString(iconComponent);
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="marker-icon-wrapper" style="background-color: ${color};">${iconHtml}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

export default function App() {
  const [villages, setVillages] = useState(null);
  const [infraData, setInfraData] = useState([]);
  const [activeFilters, setActiveFilters] = useState(Object.keys(KAT_COLORS));
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [geoRes, infraRes] = await Promise.all([
          fetch('/data/villages.json').then(r => r.json()),
          fetch('/data/infrastructure.json').then(r => r.json())
        ]);
        setVillages(geoRes);
        setInfraData(infraRes);
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleFilter = (kategori) => {
    setActiveFilters(prev => 
      prev.includes(kategori) 
        ? prev.filter(f => f !== kategori)
        : [...prev, kategori]
    );
  };

  const filteredData = infraData.filter(item => activeFilters.includes(item.kat));

  if (loading) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
        <h2>Loading Data Peta...</h2>
      </div>
    );
  }

  // Default Mamuju coordinates
  const bounds = [
    [-2.9, 118.6], // SW
    [-2.6, 119.0]  // NE
  ];

  return (
    <div className="app-container">
      <button 
        className="mobile-toggle" 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        <Filter size={24} />
      </button>

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="sidebar-title">
              <MapIcon size={28} color="var(--accent-blue)" />
              Peta Tata Ruang
            </h1>
            <button className="mobile-close" onClick={() => setIsSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>
          <p className="sidebar-subtitle" style={{ marginTop: '8px' }}>
            Visualisasi Direktori Infrastruktur Kab. Mamuju (2026)
          </p>
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <h3><Filter size={14} style={{ display: 'inline', marginRight: '6px' }}/> Filter Kategori</h3>
            {Object.entries(KAT_COLORS).map(([kat, color]) => {
              const count = infraData.filter(d => d.kat === kat).length;
              return (
                <div 
                  key={kat}
                  className={`filter-option ${activeFilters.includes(kat) ? 'active' : ''}`}
                  onClick={() => toggleFilter(kat)}
                >
                  <div className="filter-color" style={{ color: color, backgroundColor: color }} />
                  <span className="filter-text">{kat}</span>
                  <span className="filter-count">{count}</span>
                </div>
              );
            })}
          </div>

          <div className="stats-widget">
            <div className="stat-item">
              <span className="stat-label">Total Titik Map</span>
              <span className="stat-value">{filteredData.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Jumlah Desa</span>
              <span className="stat-value">{villages?.features?.length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="map-container">
        <MapContainer 
          bounds={bounds} 
          zoom={11} 
          scrollWheelZoom={true}
          zoomControl={false}
          preferCanvas={true}
          zoomAnimation={false}
          fadeAnimation={false}
          markerZoomAnimation={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {villages && (
            <GeoJSON 
              data={villages}
              style={{
                color: 'rgba(255, 255, 255, 0.4)',
                weight: 1,
                fillColor: 'rgba(59, 130, 246, 0.05)',
                fillOpacity: 0.1
              }}
              onEachFeature={(feature, layer) => {
                 if (feature.properties) {
                    layer.bindTooltip(feature.properties.nmdesa, {
                       direction: 'center',
                       className: 'custom-tooltip'
                    });
                 }
              }}
            />
          )}

          {filteredData.map(item => (
            <Marker 
              key={item.id} 
              position={[item.lat, item.lng]}
              icon={createCustomIcon(KAT_COLORS[item.kat] || '#fff', item.kat)}
            >
              <Popup>
                <div className="popup-kategori" style={{ color: KAT_COLORS[item.kat] || '#fff' }}>
                  {item.kat}
                </div>
                <div className="popup-nama">{item.nama}</div>
                <div className="popup-jenis">{item.jenis}</div>
                <div className="popup-alamat">
                  <MapPin size={14} color="var(--text-secondary)" />
                  <span>{item.alamat || 'Alamat tidak tersedia'}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
