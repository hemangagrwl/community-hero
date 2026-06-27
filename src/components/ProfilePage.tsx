/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, ShieldCheck, Award, Info, AlertTriangle, RefreshCw } from 'lucide-react';

export interface UserProfile {
  name: string;
  trustScore: number;
  reportsVerifiedCount: number;
  incidentsResolvedCount: number;
  validationsContributedCount: number;
}

export function getTrustTier(trustScore: number): string {
  if (trustScore < 0.3) return 'New Contributor';
  if (trustScore < 0.6) return 'Verified Contributor';
  if (trustScore < 0.85) return 'Trusted Contributor';
  return 'Community Steward';
}

interface ProfilePageProps {
  activeUserName: string;
  onChangeActiveUser: (name: string, initialTrust?: number) => void;
}

export default function ProfilePage({ activeUserName, onChangeActiveUser }: ProfilePageProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [customName, setCustomName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Default avatars list for quick switching
  const AVATARS = [
    { name: 'Civic Guardian (Verified)', trustScore: 0.85, label: '👮 Guardian' },
    { name: 'Ward Committee Lead', trustScore: 0.95, label: '🛡️ Committee Lead' },
    { name: 'Standard Citizen', trustScore: 0.60, label: '👤 Citizen' },
    { name: 'Suspicious Bot / Spammer', trustScore: 0.15, label: '⚠️ Suspicious Node' }
  ];

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [activeUserName]);

  const handleSwitchAvatar = async (name: string, trustScore: number) => {
    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, trustScore })
      });
      if (res.ok) {
        onChangeActiveUser(name, trustScore);
        fetchProfiles();
      }
    } catch (err) {
      console.error('Error switching avatar:', err);
    }
  };

  const handleCreateCustomProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: customName.trim(), trustScore: 0.25 })
      });
      if (res.ok) {
        const profile = await res.json();
        onChangeActiveUser(profile.name, profile.trustScore);
        setCustomName('');
        setErrorMsg(null);
        fetchProfiles();
      } else {
        setErrorMsg('Failed to create custom profile.');
      }
    } catch (err) {
      console.error('Error creating custom profile:', err);
      setErrorMsg('Server connection failed.');
    }
  };

  const activeProfile = profiles.find((p) => p.name === activeUserName) || {
    name: activeUserName,
    trustScore: 0.25,
    reportsVerifiedCount: 0,
    incidentsResolvedCount: 0,
    validationsContributedCount: 0
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Title */}
      <div className="mb-8 border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Credibility & Contributor Profiles</h1>
        <p className="text-slate-500 text-xs mt-1">
          A formal decentralized reputation registry tracking verified civic contributions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column: Active User Credibility Record Card */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono">
                Active Contributor Identity
              </span>
              <button 
                onClick={fetchProfiles} 
                className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
                title="Refresh Registry Data"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-none">{activeProfile.name}</h2>
                  <div className="mt-1.5 flex items-center space-x-1.5">
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full inline-flex items-center font-mono">
                      {getTrustTier(activeProfile.trustScore)}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      (Score: {activeProfile.trustScore.toFixed(2)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Factual Contribution Record */}
              <div className="border-t border-slate-100 pt-6 mt-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4 font-mono">
                  Factual Credibility Record
                </span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                    <span className="text-xs text-slate-500 font-medium block">Reports Verified</span>
                    <span className="text-xl font-bold text-slate-800 font-mono mt-1 block">
                      {activeProfile.reportsVerifiedCount}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                    <span className="text-xs text-slate-500 font-medium block">Incidents Resolved</span>
                    <span className="text-xl font-bold text-slate-800 font-mono mt-1 block">
                      {activeProfile.incidentsResolvedCount}
                    </span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
                    <span className="text-xs text-slate-500 font-medium block">Validations Contributed</span>
                    <span className="text-xl font-bold text-slate-800 font-mono mt-1 block">
                      {activeProfile.validationsContributedCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registry Rules explanation */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-xs text-slate-600 space-y-4">
            <h3 className="font-bold text-slate-900 font-mono uppercase tracking-wider text-xxs flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              Reputation System Integrity Rules
            </h3>
            <p className="leading-relaxed">
              To prevent manipulation and Sybil spamming, contributor standings are calculated mathematically from reliability, not activity. Standings can range from <strong>0.00 to 1.00</strong>.
            </p>
            <div className="space-y-2 font-mono text-[11px] border-t border-slate-200 pt-3">
              <div className="flex justify-between items-center text-slate-700">
                <span>✦ Report passes vision verification</span>
                <span className="text-emerald-700 font-bold">+0.10</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>✦ Reported incident is resolved</span>
                <span className="text-emerald-700 font-bold">+0.15</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>⚠️ Report fails vision verification</span>
                <span className="text-rose-700 font-bold">-0.15</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>⚠️ Validation flagged as brigading</span>
                <span className="text-rose-700 font-bold">-0.20</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Switch Identity & Manage Registry */}
        <div className="md:col-span-5 space-y-6">
          {/* Identity Switcher */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4 font-mono">
              Switch Simulation Profile
            </span>

            <div className="space-y-2">
              {AVATARS.map((avatar) => {
                const dbProfile = profiles.find((p) => p.name === avatar.name);
                const currentTrust = dbProfile ? dbProfile.trustScore : avatar.trustScore;
                const isSelected = activeUserName === avatar.name;

                return (
                  <button
                    key={avatar.name}
                    onClick={() => handleSwitchAvatar(avatar.name, avatar.trustScore)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex justify-between items-center ${
                      isSelected
                        ? 'bg-slate-100 border-slate-300 font-bold text-slate-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>{avatar.label}</span>
                    <span className="text-xxs font-mono text-slate-400">
                      Tier: {getTrustTier(currentTrust)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Identity Creator */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 font-mono">
              Register Custom Contributor
            </span>

            <form onSubmit={handleCreateCustomProfile} className="space-y-3">
              <div>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter unique contributor name"
                  maxLength={40}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-400 text-slate-800"
                />
              </div>

              {errorMsg && (
                <p className="text-xxs text-rose-600 flex items-center gap-1 font-mono">
                  <AlertTriangle className="w-3 h-3" />
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
              >
                Register & Select Identity
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
