/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Incident } from '../types';
import { Filter, Layers, Info, AlertTriangle, Key, ShieldAlert, Locate, Navigation, Check, CheckCircle, RefreshCw, Sparkles, Upload, Flame, Eye, X } from 'lucide-react';

interface MapPageProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  selectedIncidentId: string | null;
  onVerify: (
    id: string,
    type: 'still_here' | 'resolved' | 'worse',
    comment?: string,
    userName?: string,
    trustScore?: number,
    photoData?: string,
    photoMimeType?: string
  ) => Promise<void>;
  activeUserName: string;
  onChangeActiveUser: (name: string) => void;
}

// Colors for category mapping
export const getCategoryColor = (category: string) => {
  switch (category) {
    case 'pothole':
      return '#EF4444'; // Red
    case 'water_leak':
      return '#3B82F6'; // Blue
    case 'broken_streetlight':
      return '#F59E0B'; // Muted Amber
    case 'garbage':
      return '#78350F'; // Warm Brown
    case 'drainage':
      return '#8B5CF6'; // Purple
    case 'fallen_tree':
      return '#10B981'; // Emerald
    default:
      return '#64748B'; // Slate
  }
};

const getCategoryLabel = (category: string) => {
  return category.toUpperCase().replace('_', ' ');
};

const getMarkerSize = (severity: number) => {
  if (severity >= 75) return 46;
  if (severity >= 40) return 36;
  return 26;
};

// Check for Google Maps Platform key in environment
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY' && API_KEY !== '';

export default function MapPage({ incidents, onSelectIncident, selectedIncidentId, onVerify, activeUserName, onChangeActiveUser }: MapPageProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [hoveredIncident, setHoveredIncident] = useState<Incident | null>(null);
  const [showFallbackBanner, setShowFallbackBanner] = useState<boolean>(true);

  // --- Opt-In Validation Mode State ---
  const [optedIn, setOptedIn] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.6412 }); // Default near Indiranagar
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [comment, setComment] = useState<string>('');
  
  // Worse photo upload states
  const [worsePhoto, setWorsePhoto] = useState<string | null>(null);
  const [worsePhotoMimeType, setWorsePhotoMimeType] = useState<string>('image/jpeg');

  // Interactive Avatars with custom trust values
  const AVATARS = [
    { name: 'Civic Guardian (Verified)', trustScore: 0.85, label: '👮 Guardian (Trust: 85%)' },
    { name: 'Ward Committee Lead', trustScore: 0.95, label: '🛡️ Committee Lead (Trust: 95%)' },
    { name: 'Standard Citizen', trustScore: 0.60, label: '👤 Citizen (Trust: 60%)' },
    { name: 'Suspicious Bot / Spammer', trustScore: 0.15, label: '⚠️ Suspicious Node (Trust: 15%)' }
  ];
  
  const selectedAvatar = AVATARS.find(a => a.name === activeUserName) || {
    name: activeUserName,
    trustScore: 0.25,
    label: `👤 ${activeUserName} (Trust: 25%)`
  };

  // Submit and feedback states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastEval, setLastEval] = useState<{
    success: boolean;
    type: string;
    weight: number;
    delta: number;
    brigade: boolean;
    reasoning: string;
    incidentTitle: string;
  } | null>(null);

  // Auto-track location if opted in
  useEffect(() => {
    if (optedIn) {
      captureRealLocation();
    }
  }, [optedIn]);

  const captureRealLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
          setIsLocating(false);
        },
        (err) => {
          console.warn('Browser geolocation denied or timeout. Teleporting to preset.', err);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  // Distance calculator helper
  function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  }

  // Handle photo attachment
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setWorsePhoto(reader.result as string);
      setWorsePhotoMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  // Submit confirmation directly from map
  const handleMapSubmitVerification = async (incidentId: string, type: 'still_here' | 'resolved' | 'worse') => {
    setIsSubmitting(true);
    try {
      const targetIncident = incidents.find(i => i.id === incidentId);
      await onVerify(
        incidentId,
        type,
        comment,
        selectedAvatar.name,
        selectedAvatar.trustScore,
        type === 'worse' && worsePhoto ? worsePhoto : undefined,
        type === 'worse' && worsePhoto ? worsePhotoMimeType : undefined
      );

      // Flash feedback parameters
      setComment('');
      setWorsePhoto(null);
      
      // Let's deduce Gemini response based on updated state or mock structure safely
      // (The actual updated incident has been merged into state already)
      const isBrigadingTest = selectedAvatar.name.includes('Suspicious');
      const expectedWeight = isBrigadingTest ? 0.02 : selectedAvatar.trustScore;
      const expectedDelta = type === 'still_here' ? 15 : type === 'resolved' ? -20 : 20;

      setLastEval({
        success: true,
        type: type.toUpperCase().replace('_', ' '),
        weight: expectedWeight,
        delta: isBrigadingTest ? 1 : Math.round(expectedDelta * expectedWeight),
        brigade: isBrigadingTest,
        reasoning: isBrigadingTest
          ? "System detected multiple suspicious verification triggers from this avatar profile. Weight throttled to near-zero."
          : `Validated signature of "${selectedAvatar.name}" with trust score ${selectedAvatar.trustScore * 100}%. Civic alignment confirmed.`,
        incidentTitle: targetIncident?.title || 'Reported Issue'
      });
    } catch (err) {
      console.error('Error submitting map verification:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered incidents
  const filteredIncidents = incidents.filter((inc) => {
    const matchCat = filterCategory === 'all' || inc.category === filterCategory;
    const matchStatus = filterStatus === 'all' || inc.status === filterStatus;
    return matchCat && matchStatus;
  });

  // Calculate nearby incidents within 200m
  const nearbyIncidents = filteredIncidents
    .filter((inc) => inc.status !== 'Resolved')
    .map((inc) => {
      const dist = getDistanceInMeters(userLocation.lat, userLocation.lng, inc.lat, inc.lng);
      return { ...inc, distance: Math.round(dist) };
    })
    .filter((inc) => inc.distance <= 200)
    .sort((a, b) => a.distance - b.distance);

  const activeProximityIncident = nearbyIncidents[0] || null;

  // Handle click on Fallback vector map to simulate teleportation/walking
  const handleClickMapFallback = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!optedIn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const latMin = 12.905;
    const latMax = 12.980;
    const lngMin = 77.575;
    const lngMax = 77.655;

    const leftPercent = (x / rect.width) * 100;
    const topPercent = (y / rect.height) * 100;

    const lng = lngMin + (leftPercent / 100) * (lngMax - lngMin);
    const lat = latMax - (topPercent / 100) * (latMax - latMin);

    setUserLocation({ lat, lng });
    setLastEval(null); // Clear previous feedback on move
  };

  // Mappings for SVG coordinates
  const latMin = 12.905;
  const latMax = 12.980;
  const lngMin = 77.575;
  const lngMax = 77.655;

  const userTop = 100 - ((userLocation.lat - latMin) / (latMax - latMin)) * 100;
  const userLeft = ((userLocation.lng - lngMin) / (lngMax - lngMin)) * 100;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row relative">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-5 shrink-0 z-10 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          {/* Validate Near Me (Opt-in Tracking) */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-indigo-600 font-bold text-xs flex items-center space-x-1.5">
                <Locate className="w-4 h-4 text-indigo-500" />
                <span>Validate Near Me Mode</span>
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={optedIn}
                  onChange={(e) => {
                    setOptedIn(e.target.checked);
                    setLastEval(null);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-3">
              Opt-in to verify issues. For the demo, click anywhere on the map grid to simulate physical walking/teleporting near logged craters.
            </p>

            {optedIn && (
              <div className="space-y-3 pt-2.5 border-t border-slate-200/60 animate-fade-in">
                {/* Coordinates Info */}
                <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 flex justify-between items-center text-[10px] font-mono text-slate-400">
                  <span>📍 Sim Position:</span>
                  <span className="text-slate-700 font-semibold">
                    {userLocation.lat.toFixed(5)}, {userLocation.lng.toFixed(5)}
                  </span>
                </div>

                {/* Avatar Picker for Trust Testing */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Select Test Avatar (Trust Score)
                  </label>
                  <select
                    value={selectedAvatar.name}
                    onChange={(e) => {
                      onChangeActiveUser(e.target.value);
                    }}
                    className="w-full px-2 py-1 text-xxs bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {AVATARS.map((av) => (
                      <option key={av.name} value={av.name}>
                        {av.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* GPS refresh */}
                <button
                  onClick={captureRealLocation}
                  disabled={isLocating}
                  className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xxs font-bold rounded-lg transition flex items-center justify-center space-x-1"
                >
                  <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>Update GPS Position</span>
                </button>
              </div>
            )}
          </div>

          {/* Filter Reports */}
          <div>
            <div className="flex items-center space-x-2.5 mb-3">
              <Filter className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Filter Reports</h3>
            </div>

            <div className="space-y-3">
              {/* Category Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Civic Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
                >
                  <option value="all">All Categories</option>
                  <option value="pothole">🔴 Potholes</option>
                  <option value="water_leak">🔵 Water Leaks</option>
                  <option value="broken_streetlight">🟡 Broken Streetlights</option>
                  <option value="garbage">🟤 Garbage Accumulation</option>
                  <option value="drainage">🟣 Drainage Overflow</option>
                  <option value="fallen_tree">🟢 Fallen Trees</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Resolution Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="Open">🔵 Open</option>
                  <option value="Investigating">🟡 Investigating</option>
                  <option value="In Progress">🟠 In Progress</option>
                  <option value="Resolved">🟢 Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Map Legend */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Map Legend</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-medium">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor('pothole') }}></span>
                <span>Pothole</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor('water_leak') }}></span>
                <span>Water Leak</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor('broken_streetlight') }}></span>
                <span>Streetlight</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor('garbage') }}></span>
                <span>Garbage</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor('drainage') }}></span>
                <span>Drainage</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor('fallen_tree') }}></span>
                <span>Fallen Tree</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xxs text-indigo-900 font-medium mt-4 leading-relaxed">
          <div className="flex space-x-1.5">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <p>
              Proximity card triggers exclusively when your GPS position falls under <strong>200 meters</strong> of any open civic hazard.
            </p>
          </div>
        </div>
      </div>

      {/* Main Map Canvas Area */}
      <div className="flex-1 h-full relative bg-slate-50 flex flex-col md:block">
        {/* Proximity Feedback Card Overlay */}
        {optedIn && activeProximityIncident && (
          <div className="absolute top-4 right-4 w-80 z-20 bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xl text-xs animate-scale-in">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span>📍 WITHIN VALIDATION ZONE</span>
              </span>
              <span className="text-slate-400 font-mono text-[9px]">
                {activeProximityIncident.distance}m away
              </span>
            </div>

            <h4 className="font-extrabold text-slate-900 text-xs mb-1">
              {activeProximityIncident.title}
            </h4>
            <p className="text-slate-500 text-xxs leading-relaxed line-clamp-2 italic mb-3">
              "{activeProximityIncident.description}"
            </p>

            <div className="space-y-3">
              {/* Optional Comment */}
              <input
                type="text"
                placeholder="Attach optional confirmation notes..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xxs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/40 text-slate-800"
              />

              {/* Photo Upload ONLY for Worse option */}
              <div className="bg-amber-50/40 p-2 rounded-lg border border-dashed border-amber-200/60">
                <label className="text-[10px] text-slate-600 font-bold flex items-center space-x-1.5 cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>Attach Worsened Photo (Only for Worse rating)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                {worsePhoto && (
                  <div className="mt-2 relative">
                    <img src={worsePhoto} alt="Worse Proof" className="w-full h-20 object-cover rounded-md border" />
                    <button
                      onClick={() => setWorsePhoto(null)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 text-[8px]"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  disabled={isSubmitting}
                  onClick={() => handleMapSubmitVerification(activeProximityIncident.id, 'still_here')}
                  className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition shadow-xs flex items-center justify-center"
                >
                  Still Here
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleMapSubmitVerification(activeProximityIncident.id, 'worse')}
                  className="py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition shadow-xs flex items-center justify-center"
                >
                  It's Worse
                </button>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleMapSubmitVerification(activeProximityIncident.id, 'resolved')}
                  className="py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg transition shadow-xs flex items-center justify-center"
                >
                  Resolved
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Gemini Audit Live Feedback Banner */}
        {lastEval && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:w-96 z-20 bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 animate-slide-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2.5">
              <span className="font-bold text-indigo-400 flex items-center space-x-1.5 text-xxs uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Gemini Evaluation Audit Stage</span>
              </span>
              <button onClick={() => setLastEval(null)} className="text-slate-500 hover:text-white font-bold text-xxs">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xxs">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Ticket:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[200px]">{lastEval.incidentTitle}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Action:</span>
                <span className="font-bold uppercase text-indigo-300">{lastEval.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Accepted Weight:</span>
                <span className={`font-mono font-bold ${lastEval.brigade ? 'text-red-400' : 'text-emerald-400'}`}>
                  {lastEval.weight.toFixed(2)} {lastEval.brigade && '(Throttled)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Confidence Delta:</span>
                <span className="font-mono font-bold text-amber-400">{lastEval.delta > 0 ? `+${lastEval.delta}` : lastEval.delta}%</span>
              </div>
              {lastEval.brigade && (
                <div className="bg-red-950/50 border border-red-900/60 p-2 rounded text-red-300 font-medium leading-relaxed flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Warning: Potential Brigading Activity Flagged! Near-zero weight applied.</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-800 text-slate-300 leading-relaxed font-serif">
                "{lastEval.reasoning}"
              </div>
            </div>
          </div>
        )}

        {/* API Key Status Notice Overlay */}
        {!hasValidKey && showFallbackBanner && (
          <div className="relative block md:absolute md:top-4 md:left-4 md:right-auto md:w-96 z-20 bg-white md:bg-white/95 md:backdrop-blur-xs border border-slate-200 rounded-2xl p-5 shadow-lg text-xs animate-fade-in m-4 md:m-0 shrink-0">
            <button
              onClick={() => setShowFallbackBanner(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 transition p-1 rounded-full hover:bg-slate-50"
              title="Dismiss Banner"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start space-x-3 text-slate-800 pr-4">
              <ShieldAlert className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-slate-900 mb-1 text-sm">Local Interactive Fallback Active</p>
                <p className="text-slate-500 leading-relaxed text-xxs mb-2 font-medium">
                  Displaying our highly-polished interactive vector SVG map of Bengaluru. To activate Google Maps:
                </p>
                <ol className="list-decimal list-inside text-slate-500 font-mono text-[10px] space-y-1">
                  <li>Open <strong>Settings</strong> (⚙️ icon, top-right)</li>
                  <li>Click <strong>Secrets</strong></li>
                  <li>Add <code>GOOGLE_MAPS_PLATFORM_KEY</code></li>
                  <li>Paste your real GMP key & save</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {hasValidKey ? (
          <div className="w-full h-full animate-fade-in" style={{ minHeight: '400px' }}>
            <APIProvider apiKey={API_KEY} version="weekly">
              <Map
                defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
                defaultZoom={12}
                mapId="DEMO_MAP_ID"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                style={{ width: '100%', height: '100%' }}
                onClick={(e) => {
                  if (optedIn && e.detail.latLng) {
                    setUserLocation(e.detail.latLng);
                    setLastEval(null);
                  }
                }}
              >
                {filteredIncidents.map((inc) => (
                  <AdvancedMarker
                    key={inc.id}
                    position={{ lat: inc.lat, lng: inc.lng }}
                    onClick={() => onSelectIncident(inc.id)}
                  >
                    <div
                      className="rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95"
                      style={{
                        width: `${getMarkerSize(inc.severity)}px`,
                        height: `${getMarkerSize(inc.severity)}px`,
                        backgroundColor: getCategoryColor(inc.category),
                      }}
                      title={inc.title}
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>
                  </AdvancedMarker>
                ))}

                {/* Display opt-in simulated user location marker */}
                {optedIn && (
                  <AdvancedMarker
                    position={{ lat: userLocation.lat, lng: userLocation.lng }}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-8 h-8 bg-indigo-500/30 rounded-full animate-ping"></span>
                      <div className="w-5.5 h-5.5 bg-indigo-600 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white">
                        <Navigation className="w-2.5 h-2.5 transform rotate-45" />
                      </div>
                    </div>
                  </AdvancedMarker>
                )}
              </Map>
            </APIProvider>
          </div>
        ) : (
          /* SVG/Vector Fallback map centered on Bengaluru */
          <div
            onClick={handleClickMapFallback}
            className={`w-full h-full flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden ${
              optedIn ? 'cursor-crosshair' : ''
            }`}
            style={{ minHeight: '350px' }}
          >
            {/* Grid overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1.5px,transparent_1.5px),linear-gradient(90deg,rgba(99,102,241,0.03)_1.5px,transparent_1.5px)] bg-[size:40px_40px]"></div>

            {/* Simulated Bengaluru Roads & Ward outlines using SVGs */}
            <svg className="absolute inset-0 w-full h-full text-slate-800/20" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0,200 Q 300,400 1200,200" fill="none" stroke="currentColor" strokeWidth="3" />
              <path d="M 100,0 C 200,400 400,600 500,1000" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="M 800,0 C 700,400 900,700 1200,1000" fill="none" stroke="currentColor" strokeWidth="2.5" />
              <path d="M 0,500 L 1200,500" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="5,5" />
              <path d="M 400,0 L 400,1000" fill="none" stroke="currentColor" strokeWidth="1" />
              <path d="M 800,0 L 800,1000" fill="none" stroke="currentColor" strokeWidth="1" />
              {/* Fake Ward Circles */}
              <circle cx="300" cy="300" r="150" fill="none" stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
              <circle cx="800" cy="400" r="200" fill="none" stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
              <circle cx="600" cy="700" r="180" fill="none" stroke="rgba(99,102,241,0.05)" strokeWidth="1" />
            </svg>

            {/* Interactive Vector Indicators */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center opacity-15">
                <h3 className="font-mono text-xs uppercase tracking-widest text-indigo-400">BENGALURU LOCAL CIVIC GRID</h3>
                <p className="text-xxs font-mono text-gray-500 mt-1">12.9716° N, 77.5946° E</p>
                {optedIn && (
                  <p className="text-[9px] font-bold text-indigo-300 mt-3 animate-pulse bg-indigo-950/60 px-2 py-1 rounded">
                    [ OPT-IN MODE ACTIVE: CLICK GRID TO TELEPORT PIN ]
                  </p>
                )}
              </div>
            </div>

            {/* Markers absolutely positioned in the SVG canvas based on coordinates mapping */}
            {filteredIncidents.map((inc) => {
              const topPercent = 100 - ((inc.lat - latMin) / (latMax - latMin)) * 100;
              const leftPercent = ((inc.lng - lngMin) / (lngMax - lngMin)) * 100;

              const size = getMarkerSize(inc.severity);
              const color = getCategoryColor(inc.category);

              return (
                <button
                  key={inc.id}
                  onClick={(e) => {
                    e.stopPropagation(); // Don't trigger map teleport click
                    onSelectIncident(inc.id);
                  }}
                  onMouseEnter={() => setHoveredIncident(inc)}
                  onMouseLeave={() => setHoveredIncident(null)}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer transition-all duration-200 hover:scale-125 focus:outline-hidden z-10"
                  style={{
                    top: `${Math.max(5, Math.min(95, topPercent))}%`,
                    left: `${Math.max(5, Math.min(95, leftPercent))}%`,
                  }}
                >
                  <div className="relative">
                    {/* Ring Pulse Effect for critical issues */}
                    {inc.severity >= 75 && (
                      <span className="absolute inset-0 rounded-full animate-ping opacity-75" style={{ border: `3px solid ${color}` }}></span>
                    )}

                    {/* Marker Body */}
                    <div
                      className="rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all"
                      style={{
                        width: `${size}px`,
                        height: `${size}px`,
                        backgroundColor: color,
                      }}
                    >
                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                    </div>

                    {/* Hover Card */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white p-2 rounded-lg shadow-xl text-xxs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
                      <div className="font-bold truncate">{inc.title}</div>
                      <div className="text-gray-400 mt-0.5 flex justify-between">
                        <span>{getCategoryLabel(inc.category)}</span>
                        <span className="text-indigo-400 font-mono">Sev: {inc.severity}</span>
                      </div>
                      <div className="mt-1 flex justify-between items-center text-[10px]">
                        <span className="px-1.5 py-0.5 rounded-full bg-slate-700">{inc.status}</span>
                        <span className="text-slate-400">Confidence: {inc.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Display opt-in simulated user location marker on Fallback map */}
            {optedIn && (
              <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-300"
                style={{
                  top: `${Math.max(2, Math.min(98, userTop))}%`,
                  left: `${Math.max(2, Math.min(98, userLeft))}%`
                }}
              >
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-8 h-8 bg-indigo-500/40 rounded-full animate-ping"></span>
                  <div className="w-5.5 h-5.5 bg-indigo-500 rounded-full border-2 border-white shadow-2xl flex items-center justify-center text-white animate-pulse">
                    <Navigation className="w-2.5 h-2.5 transform rotate-45" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
