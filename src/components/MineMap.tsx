import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, Crosshair, Maximize2 } from 'lucide-react';
import { NodeData } from '../types';

interface MineMapProps {
  nodes: NodeData[];
  selectedNodeId: string | null;
  focusCoords: { lat: number; lon: number } | null;
  onSelectNode: (lat: number, lon: number, nodeId: string) => void;
}

export const MineMap: React.FC<MineMapProps> = ({
  nodes,
  selectedNodeId,
  focusCoords,
  onSelectNode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const polylineRef = useRef<L.Polyline | null>(null);
  const [mapType, setMapType] = useState<'DARK' | 'SATELLITE'>('DARK');

  const baseTilesRef = useRef<{ [key: string]: L.TileLayer }>({});

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered at Node-3: 19.054900, 73.069300
    const map = L.map(mapContainerRef.current, {
      center: [19.054900, 73.069300],
      zoom: 18,
      zoomControl: true,
      attributionControl: false,
    });

    const darkTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      subdomains: 'abcd',
    });

    const satelliteTile = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
      }
    );

    baseTilesRef.current = {
      DARK: darkTile,
      SATELLITE: satelliteTile,
    };

    darkTile.addTo(map);

    // Node Coordinates
    const routeCoords: [number, number][] = [
      [19.054400, 73.068800], // NODE-1
      [19.054650, 73.069050], // NODE-2
      [19.054900, 73.069300], // NODE-3
      [19.055150, 73.069550], // NODE-4
      [19.055400, 73.069800], // NODE-5
    ];

    // Corridors
    L.polyline(routeCoords, {
      color: '#06b6d4',
      weight: 12,
      opacity: 0.2,
      lineCap: 'round',
    }).addTo(map);

    const polyline = L.polyline(routeCoords, {
      color: '#38bdf8',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8',
      lineCap: 'round',
    }).addTo(map);

    polylineRef.current = polyline;

    // Auto-fit all 5 nodes with comfortable padding
    map.fitBounds(polyline.getBounds().pad(0.35));

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Tile Switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !baseTilesRef.current.DARK) return;

    if (mapType === 'DARK') {
      map.removeLayer(baseTilesRef.current.SATELLITE);
      baseTilesRef.current.DARK.addTo(map);
    } else {
      map.removeLayer(baseTilesRef.current.DARK);
      baseTilesRef.current.SATELLITE.addTo(map);
    }
  }, [mapType]);

  // Update Markers with interlinked selectedNodeId styling
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    nodes.forEach((node) => {
      const isSelected = node.node === selectedNodeId;
      const isDanger = node.status === 'DANGER';
      const isWarning = node.status === 'WARNING';
      const color = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

      const customHtml = `
        <div style="position:relative; width:48px; height:54px; display:flex; flex-direction:column; align-items:center; cursor:pointer;">
          ${
            isSelected
              ? `<div style="position:absolute; width:48px; height:48px; border-radius:50%; border:2.5px solid #38bdf8; animation: pulse-ring 1.8s infinite; top:-6px; left:0;"></div>`
              : isDanger || isWarning
              ? `<div style="position:absolute; width:44px; height:44px; border-radius:50%; border:2px solid ${color}; animation: pulse-ring 1.8s infinite; top:-6px; left:2px;"></div>`
              : ''
          }
          <div style="width:${isSelected ? '32px' : '28px'}; height:${isSelected ? '32px' : '28px'}; border-radius:50%; background:${isSelected ? '#0ea5e9' : color}; border:${isSelected ? '3px solid #ffffff' : '2.5px solid #ffffff'}; box-shadow:0 0 ${isSelected ? '20px #38bdf8' : '14px ' + color}; display:flex; align-items:center; justify-content:center; color:#ffffff; font-family:'JetBrains Mono',monospace; font-size:${isSelected ? '13px' : '12px'}; font-weight:800; z-index:2; transition:all 0.2s;">
            ${node.node.replace('NODE-', '')}
          </div>
          <div style="background:${isSelected ? 'rgba(14, 165, 233, 0.96)' : 'rgba(11, 15, 25, 0.96)'}; border:1px solid ${isSelected ? '#ffffff' : color}; border-radius:4px; padding:1px 6px; font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:800; color:#ffffff; white-space:nowrap; margin-top:2px; box-shadow:0 4px 10px rgba(0,0,0,0.8); z-index:2;">
            ${node.node}
          </div>
        </div>
      `;

      const popupHtml = `
        <div style="font-family:'Inter',sans-serif; min-width:210px; padding:2px;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.15); padding-bottom:6px; margin-bottom:8px;">
            <div>
              <strong style="font-size:14px; color:#38bdf8; font-family:'JetBrains Mono',monospace;">${node.node}</strong>
              <div style="font-size:10px; color:#94a3b8;">${node.role || 'Sensor Station'}</div>
            </div>
            <span style="font-size:10px; font-weight:800; padding:2px 8px; border-radius:4px; background:${color}; color:#fff; font-family:'Chakra Petch',sans-serif;">${node.status}</span>
          </div>

          <div style="font-size:11px; color:#cbd5e1; display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div style="background:rgba(255,255,255,0.05); padding:4px 6px; border-radius:4px;">
              <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">Tilt</div>
              <strong style="color:#fff; font-family:'JetBrains Mono';">${node.tilt_deg.toFixed(2)}°</strong>
            </div>
            <div style="background:rgba(255,255,255,0.05); padding:4px 6px; border-radius:4px;">
              <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">Roof Load</div>
              <strong style="color:#fff; font-family:'JetBrains Mono';">${node.load_kg.toFixed(2)} kg</strong>
            </div>
            <div style="background:rgba(255,255,255,0.05); padding:4px 6px; border-radius:4px;">
              <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">Gas Ind.</div>
              <strong style="color:#fff; font-family:'JetBrains Mono';">${node.gas_ppm_equiv.toFixed(0)} ppm</strong>
            </div>
            <div style="background:rgba(255,255,255,0.05); padding:4px 6px; border-radius:4px;">
              <div style="font-size:9px; color:#94a3b8; text-transform:uppercase;">Risk Score</div>
              <strong style="color:#fff; font-family:'JetBrains Mono';">${node.risk_score} / 100</strong>
            </div>
          </div>

          <div style="margin-top:8px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.1); font-size:10px; display:flex; justify-content:space-between; color:#94a3b8; font-family:'JetBrains Mono';">
            <span>TX: ${node.sample_interval_seconds}s</span>
            <span style="color:${node.buzzerActive ? '#ef4444' : '#64748b'}; font-weight:700;">
              ${node.buzzerActive ? '🚨 3kHz SIREN ACTIVE' : 'SIREN OFF'}
            </span>
          </div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-leaflet-marker-wrapper',
        html: customHtml,
        iconSize: [48, 54],
        iconAnchor: [24, 27],
      });

      if (!markersRef.current[node.node]) {
        const marker = L.marker([node.latitude, node.longitude], { icon })
          .addTo(map)
          .bindPopup(popupHtml);

        marker.on('click', () => {
          onSelectNode(node.latitude, node.longitude, node.node);
        });

        markersRef.current[node.node] = marker;
      } else {
        markersRef.current[node.node].setIcon(icon);
        markersRef.current[node.node].setPopupContent(popupHtml);
      }
    });
  }, [nodes, selectedNodeId, onSelectNode]);

  // Handle focus request and open popup
  useEffect(() => {
    if (!focusCoords || !mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([focusCoords.lat, focusCoords.lon], 19, {
      duration: 1.2,
    });

    const matchingNode = nodes.find(
      (n) => Math.abs(n.latitude - focusCoords.lat) < 0.00005 && Math.abs(n.longitude - focusCoords.lon) < 0.00005
    );
    if (matchingNode && markersRef.current[matchingNode.node]) {
      setTimeout(() => {
        markersRef.current[matchingNode.node].openPopup();
      }, 1200);
    }
  }, [focusCoords, nodes]);

  const handleFitAll = () => {
    if (polylineRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.fitBounds(polylineRef.current.getBounds().pad(0.35));
    }
  };

  const handleFocusCritical = () => {
    const criticalNode = nodes.find((n) => n.status === 'DANGER') || nodes.find((n) => n.status === 'WARNING');
    if (criticalNode && mapInstanceRef.current) {
      onSelectNode(criticalNode.latitude, criticalNode.longitude, criticalNode.node);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <Layers size={18} color="#06b6d4" />
          <h2 className="panel-title">Underground Mine GIS Map & Station Radar</h2>
        </div>

        {/* Map Toolbar Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <button
            className="btn-action"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
            onClick={() => setMapType((prev) => (prev === 'DARK' ? 'SATELLITE' : 'DARK'))}
            title="Toggle between Satellite Imagery and Dark Vector Map"
          >
            <Layers size={13} />
            {mapType === 'DARK' ? 'Satellite View' : 'Dark Carto'}
          </button>

          <button
            className="btn-action"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem' }}
            onClick={handleFitAll}
            title="Auto-Fit all 5 nodes on screen"
          >
            <Maximize2 size={13} />
            Fit All
          </button>

          <button
            className="btn-action"
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.72rem', borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' }}
            onClick={handleFocusCritical}
            title="Fly directly to active critical/warning node"
          >
            <Crosshair size={13} />
            Focus Critical
          </button>
        </div>
      </div>

      <div
        id="mine-map"
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '380px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
          background: '#090d16',
        }}
      />
    </div>
  );
};
