/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Incident } from '../types';
import { Locate, ShieldAlert, Sparkles, Navigation, Check, AlertTriangle, RefreshCw, Eye, Upload } from 'lucide-react';
import { getCategoryColor } from './MapPage';

interface ValidatePageProps {
  incidents: Incident[];
  onVerify: (
    id: string,
    type: 'still_here' | 'resolved' | 'worse',
    comment?: string,
    userName?: string,
    trustScore?: number,
    photoData?: string,
    photoMimeType?: string
  ) => void;
  onSelectIncident: (id: string) => void;
  setActiveTab: (tab: string) => void;
  activeUserName: string;
  onChangeActiveUser: (name: string) => void;
}

// Haversine formula to compute distance in meters
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

// Preset neighborhoods in Bengaluru for instant virtual testing ("teleporting")
const TELEPORT_STATIONS = [
  { name: '12th Main Indiranagar', lat: 12.9718, lng: 77.6412 },
  { name: 'Koramangala 4th Block', lat: 12.9349, lng: 77.6190 },
  { name: 'Jayanagar Complex', lat: 12.9298, lng: 77.5843 },
  { name: 'HSR Layout Sec 3', lat: 12.9101, lng: 77.6416 },
  { name: 'MG Road Metro Station', lat: 12.9745, lng: 77.6074 }
];

export default function ValidatePage({ incidents, onVerify, onSelectIncident, setActiveTab, activeUserName, onChangeActiveUser }: ValidatePageProps) {
  const [optedIn, setOptedIn] = useState(false);
  const [lat, setLat] = useState<number>(12.9716); // default
  const [lng, setLng] = useState<number>(77.5946);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [isLocating, setIsLocating] = useState(false);
  const [votedIncidentIds, setVotedIncidentIds] = useState<Record<string, string>>({});

  // Worse photo upload states
  const [worsePhotos, setWorsePhotos] = useState<Record<string, string>>({});
  const [worsePhotoMimeTypes, setWorsePhotoMimeTypes] = useState<Record<string, string>>({});

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

  // Fetch true GPS coordinates on toggle if allowed
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
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setIsLocating(false);
        },
        (err) => {
          console.warn('Geolocation capture failed. Teleport tool active.', err);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handlePhotoChange = (incidentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setWorsePhotos(prev => ({ ...prev, [incidentId]: reader.result as string }));
      setWorsePhotoMimeTypes(prev => ({ ...prev, [incidentId]: file.type }));
    };
    reader.readAsDataURL(file);
  };

  const handleValidationAction = (incidentId: string, type: 'still_here' | 'resolved' | 'worse') => {
    const photo = type === 'worse' ? worsePhotos[incidentId] : undefined;
    const mime = type === 'worse' ? worsePhotoMimeTypes[incidentId] : undefined;

    onVerify(
      incidentId,
      type,
      comment[incidentId] || '',
      selectedAvatar.name,
      selectedAvatar.trustScore,
      photo,
      mime
    );

    // Log as voted locally
    setVotedIncidentIds((prev) => ({ ...prev, [incidentId]: type }));
    
    // Clear comment/photo for this card
    setComment((prev) => {
      const copy = { ...prev };
      delete copy[incidentId];
      return copy;
    });
    setWorsePhotos((prev) => {
      const copy = { ...prev };
      delete copy[incidentId];
      return copy;
    });
  };

  // Compute all incident distances and filter by open status
  const nearbyIncidents = incidents
    .filter((inc) => inc.status !== 'Resolved')
    .map((inc) => {
      const dist = getDistanceInMeters(lat, lng, inc.lat, inc.lng);
      return { ...inc, distance: Math.round(dist) };
    })
    // Sort by proximity
    .sort((a, b) => a.distance - b.distance);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="text-center mb-8">
        <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-100">
          Citizen Verification Node
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Validate Near Me</h2>
        <p className="text-slate-500 mt-2 max-w-lg mx-auto">
          Opt-in to share your location. When walking near logged reports in Bengaluru, verify their current state to help calibrate dispatch work queues.
        </p>
      </div>

      {/* OPT IN TOGGLE JUMBOTRON */}
      {!optedIn ? (
        <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center shadow-sm flex flex-col items-center max-w-xl mx-auto">
          <div className="bg-indigo-50 text-indigo-600 p-4 rounded-full mb-4">
            <Locate className="w-8 h-8 animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Activate Local Citizen Validation</h3>
          <p className="text-slate-500 text-sm mt-2 max-w-md">
            Your location coordinates remain fully private in-browser. Active indicators appear exclusively within Community Hero's sandbox. No third-party navigation app is affected.
          </p>
          <button
            onClick={() => setOptedIn(true)}
            className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-sm cursor-pointer"
          >
            Opt-in & Share Private Coordinates
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* CONTROL JUMBOTRON SHOWING COORDINATES & AVATAR TESTING */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div>
                <div className="flex items-center space-x-2 text-indigo-700 font-bold text-sm">
                  <Navigation className="w-4.5 h-4.5 text-indigo-600 animate-bounce" />
                  <span>Private Tracking Engine Active</span>
                </div>
                <div className="text-xxs font-mono text-slate-400 mt-1">
                  Pin coordinates: Lat <span className="text-slate-700 font-semibold">{lat.toFixed(6)}</span>, Lng <span className="text-slate-700 font-semibold">{lng.toFixed(6)}</span>
                </div>
              </div>

              {/* Dynamic Avatar Dropdown */}
              <div className="border-l border-slate-100 pl-0 md:pl-4">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Active Simulation Avatar
                </label>
                <select
                  value={selectedAvatar.name}
                  onChange={(e) => {
                    onChangeActiveUser(e.target.value);
                  }}
                  className="px-2 py-1 text-xxs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {AVATARS.map((av) => (
                    <option key={av.name} value={av.name}>
                      {av.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* GPS REFRESH OR TELEPORT STATIONS PANEL */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={captureRealLocation}
                disabled={isLocating}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>Refresh GPS</span>
              </button>

              <div className="h-6 w-px bg-slate-100"></div>

              {/* virtual test station switcher */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-slate-400 font-mono flex items-center font-bold uppercase">Teleport:</span>
                {TELEPORT_STATIONS.map((sta) => (
                  <button
                    key={sta.name}
                    onClick={() => {
                      setLat(sta.lat);
                      setLng(sta.lng);
                    }}
                    className={`px-2 py-1 text-[10px] font-mono rounded-lg transition border ${
                      Math.abs(lat - sta.lat) < 0.0001
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {sta.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ACTIVE PROXIMITY CARDS */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-900 text-md flex items-center space-x-1.5">
              <Sparkles className="w-4.5 h-4.5 text-indigo-600" />
              <span>Proximity Alerts: Under 5km Radius</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearbyIncidents.map((inc) => {
                // If it is voted locally, show a thank you message inside the card
                const userVote = votedIncidentIds[inc.id];

                return (
                  <div
                    key={inc.id}
                    className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col justify-between transition hover:shadow-md border-l-4"
                    style={{ borderLeftColor: getCategoryColor(inc.category) }}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                            {inc.category.replace('_', ' ')}
                          </span>
                          {inc.status === 'needs_community_verification' && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[8px] px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 animate-pulse">
                              <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>Needs Verification</span>
                            </span>
                          )}
                        </div>
                        <span className="bg-indigo-50 text-indigo-700 font-mono text-[10px] px-2 py-0.5 rounded-full font-bold">
                          ~{inc.distance >= 1000 ? `${(inc.distance/1000).toFixed(1)}km` : `${inc.distance}m`} away
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{inc.title}</h4>
                      <p className="text-slate-500 text-xxs mt-1 line-clamp-2">"{inc.description}"</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100">
                      {userVote ? (
                        <div className="flex items-center space-x-2 bg-indigo-50 text-indigo-850 p-2.5 rounded-xl text-xxs font-bold animate-scale-in border border-indigo-100">
                          <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>
                            Thank you! You reported this as: <span className="underline uppercase">{userVote.replace('_', ' ')}</span>. Database synced.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* OPTIONAL COMMENT */}
                          <input
                            type="text"
                            placeholder="Add comment (optional)..."
                            value={comment[inc.id] || ''}
                            onChange={(e) => {
                                const val = e.target.value;
                                setComment((prev) => ({ ...prev, [inc.id]: val }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xxs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/40 text-slate-800"
                          />

                          {/* Photo upload ONLY for Worse option */}
                          <div className="bg-amber-50/40 p-2 rounded-lg border border-dashed border-amber-200/50">
                            <label className="text-[10px] text-slate-600 font-bold flex items-center space-x-1.5 cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-amber-600" />
                              <span>Attach Worsened Photo (Worse option only)</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handlePhotoChange(inc.id, e)}
                                className="hidden"
                              />
                            </label>
                            {worsePhotos[inc.id] && (
                              <div className="mt-2 relative">
                                <img src={worsePhotos[inc.id]} alt="Worse Proof" className="w-24 h-16 object-cover rounded-md border" />
                                <button
                                  onClick={() => {
                                    setWorsePhotos(prev => {
                                      const copy = { ...prev };
                                      delete copy[inc.id];
                                      return copy;
                                    });
                                  }}
                                  className="absolute top-0.5 left-20 bg-red-600 text-white rounded-full p-0.5 text-[8px]"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>

                          {/* ACTION BUTTONS PANEL */}
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              onClick={() => handleValidationAction(inc.id, 'still_here')}
                              className="px-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition"
                            >
                              Still Here
                            </button>
                            <button
                              onClick={() => handleValidationAction(inc.id, 'worse')}
                              className="px-2 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition"
                            >
                              It's Worse
                            </button>
                            <button
                              onClick={() => handleValidationAction(inc.id, 'resolved')}
                              className="px-2 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold text-[10px] rounded-lg transition"
                            >
                              It's Solved
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 flex justify-between items-center text-[10px]">
                        <button
                          onClick={() => {
                            onSelectIncident(inc.id);
                            setActiveTab('map');
                          }}
                          className="text-slate-400 hover:text-indigo-600 font-bold flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect Action logs</span>
                        </button>
                        <span className="text-slate-400 text-xxs font-mono font-medium">Confidence: {inc.confidence}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {nearbyIncidents.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
                  <AlertTriangle className="w-8 h-8 mx-auto text-amber-400 mb-2" />
                  <p className="text-sm font-bold">No open incidents in your vicinity!</p>
                  <p className="text-xs text-slate-400 mt-1">Try using the "Teleport" station switchers to teleport simulated coordinates near reported craters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
