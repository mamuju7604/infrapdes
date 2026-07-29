import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapIcon, Filter, MapPin, X, Tag, Satellite } from 'lucide-react';
import './index.css';

const KAT_COLORS = {
  'PENDIDIKAN NEGERI': '#3b82f6',
  'PENDIDIKAN SWASTA': '#8b5cf6',
  'KESEHATAN': '#ef4444',
  'EKONOMI': '#10b981',
  'PERBANKAN': '#f59e0b'
};

const KAT_LABELS = {
  'PENDIDIKAN NEGERI': '🎓',
  'PENDIDIKAN SWASTA': '📚',
  'KESEHATAN': '🏥',
  'EKONOMI': '🛒',
  'PERBANKAN': '🏦'
};

export default function App() {
  const [villages, setVillages] = useState(null);
  const [infraData, setInfraData] = useState([]);
  const [activeFilters, setActiveFilters] = useState(Object.keys(KAT_COLORS));
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [isSatellite, setIsSatellite] = useState(false);

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

  const filteredData = useMemo(() =>
    infraData.filter(item => activeFilters.includes(item.k)),
    [infraData, activeFilters]
  );

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const item of infraData) {
      counts[item.k] = (counts[item.k] || 0) + 1;
    }
    return counts;
  }, [infraData]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <h2>Memuat Peta...</h2>
      </div>
    );
  }

  const bounds = [[-2.95, 118.55], [-2.15, 119.5]];

  return (
    <div className="app-container">
      <button className="mobile-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
        <Filter size={22} />
      </button>

      <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 className="sidebar-title">
              <MapIcon size={26} color="var(--accent-blue)" />
              Peta Infrastruktur
            </h1>
            <button className="mobile-close" onClick={() => setIsSidebarOpen(false)}>
              <X size={22} />
            </button>
          </div>
          <p className="sidebar-subtitle">Direktori Infrastruktur Kab. Mamuju 2026</p>
        </div>

        <div className="filter-section">
          <div className="filter-group">
            <h3>Filter Kategori</h3>
            {Object.entries(KAT_COLORS).map(([kat, color]) => (
              <div
                key={kat}
                className={`filter-option ${activeFilters.includes(kat) ? 'active' : ''}`}
                onClick={() => toggleFilter(kat)}
              >
                <span style={{ fontSize: '18px' }}>{KAT_LABELS[kat]}</span>
                <span className="filter-text">{kat}</span>
                <span className="filter-count">{categoryCounts[kat] || 0}</span>
              </div>
            ))}
          </div>

          {/* === MAP OPTIONS TOGGLES === */}
          <div className="filter-group" style={{ marginTop: '16px' }}>
            <h3>Opsi Peta</h3>

            <div
              className={`toggle-option ${showLabels ? 'active' : ''}`}
              onClick={() => setShowLabels(v => !v)}
            >
              <Tag size={16} />
              <span className="toggle-label-text">Label Nama</span>
              <div className={`toggle-switch ${showLabels ? 'on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>

            <div
              className={`toggle-option ${isSatellite ? 'active' : ''}`}
              onClick={() => setIsSatellite(v => !v)}
            >
              <Satellite size={16} />
              <span className="toggle-label-text">Peta Satelit</span>
              <div className={`toggle-switch ${isSatellite ? 'on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>
          </div>

          <div className="stats-widget">
            <div className="stat-item">
              <span className="stat-label">Titik Ditampilkan</span>
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
          scrollWheelZoom={true}
          zoomControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          {isSatellite ? (
            <TileLayer
              attribution='&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          ) : (
            <TileLayer
              attribution='&copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          )}

          {villages && (
            <GeoJSON
              data={villages}
              style={{
                color: 'rgba(255,255,255,0.3)',
                weight: 1,
                fillColor: 'rgba(59,130,246,0.05)',
                fillOpacity: 0.08
              }}
              onEachFeature={(feature, layer) => {
                if (feature.properties?.nm) {
                  layer.bindTooltip(feature.properties.nm, {
                    direction: 'center', permanent: false, className: 'village-tooltip'
                  });
                }
              }}
            />
          )}

          {filteredData.map(item => (
            <CircleMarker
              key={item.i}
              center={[item.la, item.lo]}
              radius={6}
              pathOptions={{
                color: '#fff',
                weight: 1.5,
                fillColor: KAT_COLORS[item.k] || '#fff',
                fillOpacity: 0.9
              }}
            >
              {showLabels && (
                <Tooltip
                  permanent
                  direction="top"
                  offset={[0, -8]}
                  className="label-tooltip"
                >
                  {item.n}
                </Tooltip>
              )}
              <Popup>
                <div className="popup-kategori" style={{ color: KAT_COLORS[item.k] }}>
                  {KAT_LABELS[item.k]} {item.k}
                </div>
                <div className="popup-nama">{item.n}</div>
                <div className="popup-jenis">{item.j}</div>
                {item.a && (
                  <div className="popup-alamat">
                    <MapPin size={13} />
                    <span>{item.a}</span>
                  </div>
                )}
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
