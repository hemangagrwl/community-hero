/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Incident, Confirmation } from '../types';
import { ArrowLeft, Clock, Shield, ShieldCheck, AlertCircle, Sparkles, Building2, User, UserCheck, ChevronRight, Check, Volume2 } from 'lucide-react';
import { getCategoryColor } from './MapPage';
import { playTextToSpeech } from '../utils/tts';
import { getTrustTier } from './ProfilePage';

interface IncidentDetailPageProps {
  incident: Incident;
  onBack: () => void;
  onVerify: (id: string, type: 'still_here' | 'resolved' | 'worse', comment?: string) => void;
  activeUserName?: string;
}

export default function IncidentDetailPage({ incident, onBack, onVerify, activeUserName }: IncidentDetailPageProps) {
  const [comment, setComment] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [profiles, setProfiles] = useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setProfiles(data))
      .catch(err => console.error('Error fetching profiles:', err));
  }, []);

  const renderContributorPill = (name: string) => {
    const profile = profiles.find(p => p.name === name);
    const score = profile ? profile.trustScore : 0.25; // default
    const tier = getTrustTier(score);
    return (
      <span className="text-[9px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-full inline-flex items-center ml-2 font-mono shrink-0">
        {tier}
      </span>
    );
  };

  const handleVerifySubmit = (type: 'still_here' | 'resolved' | 'worse') => {
    setIsVerifying(true);
    onVerify(incident.id, type, comment);
    setComment('');
    setVerificationSuccess(true);
    setTimeout(() => {
      setVerificationSuccess(false);
      setIsVerifying(false);
    }, 2500);
  };

  // Status color pill mapper
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-800 border-emerald-100';
      case 'In Progress':
        return 'bg-amber-50 text-amber-800 border-amber-100';
      case 'Investigating':
        return 'bg-blue-50 text-blue-800 border-blue-100';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-100';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center space-x-1 text-sm font-semibold text-slate-500 hover:text-indigo-600 transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Live Map</span>
      </button>

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 mb-8 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: getCategoryColor(incident.category) }}
            >
              {incident.category.replace('_', ' ')}
            </span>
            <span className={`px-2.5 py-0.5 border rounded-full text-xs font-bold ${getStatusStyle(incident.status)}`}>
              ● {incident.status}
            </span>
            <button
              onClick={() => playTextToSpeech(`Incident status is currently ${incident.status.replace('_', ' ')}. Title: ${incident.title}. Description: ${incident.description}`)}
              className="p-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-indigo-600 rounded-lg transition-all border border-slate-200/80 flex items-center space-x-1 cursor-pointer"
              title="Read status update aloud"
            >
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Hear Status</span>
            </button>
            <span className="text-xs font-mono text-slate-400">ID: {incident.id}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{incident.title}</h2>
          <p className="text-slate-500 mt-1 flex items-center text-sm font-medium">
            <Clock className="w-4 h-4 text-slate-400 mr-1.5" />
            <span>Located at {incident.locationName} &middot; Coordinates: {incident.lat.toFixed(5)}, {incident.lng.toFixed(5)}</span>
          </p>
          
          {incident.lastAgentAction && (
            <div className="mt-3.5 bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-start gap-3 max-w-xl animate-fade-in text-xs text-slate-300">
              <span className="relative flex h-2 w-2 mt-1 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-white text-[10px] font-mono uppercase tracking-widest text-indigo-400">Last Agent Action Checkpoint</span>
                  <span className="text-[9px] font-mono text-slate-500">&middot; {new Date(incident.lastAgentAction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <button
                    onClick={() => playTextToSpeech(`AI Sentinel evaluated this incident and made a decision to ${incident.lastAgentAction!.action}. Reasoning: ${incident.lastAgentAction!.reasoning}`)}
                    className="p-1 text-slate-400 hover:text-indigo-400 rounded-md transition-all cursor-pointer flex items-center"
                    title="Read reasoning aloud"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  </button>
                </div>
                <p className="mt-1 leading-relaxed text-slate-300 italic">
                  "{incident.lastAgentAction.reasoning}"
                </p>
                <div className="mt-1.5 flex items-center space-x-2 text-[9px] font-mono text-slate-500">
                  <span>Decision:</span>
                  <span className={`px-1 rounded font-bold uppercase ${
                    incident.lastAgentAction.action === 'escalate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    incident.lastAgentAction.action === 'close' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    'bg-slate-800 text-slate-400'
                  }`}>
                    {incident.lastAgentAction.action}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick action: Citizen confirm */}
        <div className="bg-indigo-50/60 border border-indigo-100 p-4 rounded-2xl md:max-w-sm w-full">
          <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <UserCheck className="w-4.5 h-4.5 text-indigo-600" />
            <span>Civic Verification</span>
          </h4>
          <p className="text-xxs text-indigo-800 mb-3 font-semibold">
            Are you in the vicinity? Help the AI calibrate pipeline dispatch.
          </p>

          {verificationSuccess ? (
            <div className="flex items-center space-x-1.5 bg-white border border-indigo-200 p-2 rounded-xl text-xs text-indigo-800 font-bold animate-scale-in">
              <Check className="w-4.5 h-4.5 text-indigo-600" />
              <span>Feedback Submitted Successfully!</span>
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add optional notes (e.g. still spilling...)"
                className="w-full px-2.5 py-1.5 text-xxs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => handleVerifySubmit('still_here')}
                  className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg transition"
                >
                  Still Here
                </button>
                <button
                  onClick={() => handleVerifySubmit('worse')}
                  className="px-2 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition"
                >
                  It's Worse
                </button>
                <button
                  onClick={() => handleVerifySubmit('resolved')}
                  className="px-2 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-[10px] font-bold rounded-lg transition"
                >
                  It's Solved
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- CENTRAL FOCAL POINT: SEPARATE METERS --- */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Severity Meter */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <AlertCircle className="w-32 h-32 text-rose-600" />
          </div>
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full text-xxs font-bold uppercase tracking-wider border border-rose-100">
                  AI Evaluated Metrics
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">Issue Severity Index</h3>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-slate-900 font-mono">{incident.severity}</span>
                <span className="text-slate-400 text-xs font-bold">/100</span>
              </div>
            </div>

            {/* Linear visual progress slider */}
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden mb-4 relative">
              <div
                className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-amber-500 to-rose-500"
                style={{ width: `${incident.severity}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold">Safety Risk level</div>
                <div className={`font-bold mt-0.5 text-sm ${
                  incident.safetyRisk === 'Critical' || incident.safetyRisk === 'High' ? 'text-rose-600' : 'text-amber-600'
                }`}>
                  {incident.safetyRisk} Risk
                </div>
              </div>
              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold">Damage Vector</div>
                <div className="font-bold text-slate-800 mt-0.5 text-sm truncate">
                  {incident.subType || 'Structural Wear'}
                </div>
              </div>
            </div>
          </div>

          {/* AI Trajectory prediction */}
          {incident.predictedTrajectory && (
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-start space-x-2 text-xxs text-slate-500 leading-relaxed">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-bold text-slate-700">AI Trajectory Projection: </span>
                <span>
                  {incident.predictedTrajectory.willWorsen ? 'Will escalate significantly' : 'Expected to remain stable'} within {incident.predictedTrajectory.timeframe}.{' '}
                  <span className="italic">"{incident.predictedTrajectory.reasoning}"</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Confidence Meter */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <ShieldCheck className="w-32 h-32 text-indigo-600" />
          </div>
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full text-xxs font-bold uppercase tracking-wider border border-indigo-100">
                  Citizen Verified Metrics
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">Community Confidence score</h3>
              </div>
              <div className="text-right">
                <span className="text-3xl font-black text-slate-900 font-mono">{incident.confidence}</span>
                <span className="text-slate-400 text-xs font-bold">/100</span>
              </div>
            </div>

            {/* Linear visual progress slider */}
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden mb-4 relative">
              <div
                className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-teal-400 to-indigo-500"
                style={{ width: `${incident.confidence}%` }}
              ></div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold">Verify Status</div>
                <div className="font-bold text-indigo-700 mt-0.5 text-sm">
                  {incident.confidence >= 75 ? 'Highly Confirmed' : incident.confidence >= 40 ? 'Calibrating' : 'Needs Verification'}
                </div>
              </div>
              <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-200">
                <div className="text-slate-400 font-semibold">Incident Count</div>
                <div className="font-bold text-slate-800 mt-0.5 text-sm">
                  {incident.reports.length} citizen report{incident.reports.length > 1 ? 's' : ''} clustered
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-start space-x-2 text-xxs text-slate-500 leading-relaxed">
            <User className="w-4.5 h-4.5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-700">Consensus Engine: </span>
              <span>
                Determined through decentralized verification. Higher scores prompt urgent simulated priority and rapid dispatch response schedules.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Layout: Left Details, Right Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Clustered reports & Authority */}
        <div className="lg:col-span-7 space-y-6">
          {/* Assigned Authority (Simulated) */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 text-md flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-slate-500" />
                <span>Assigned Authority</span>
              </h3>
              {/* HONESTY CONSTRAINT Badge */}
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-mono font-bold rounded-md text-[10px] tracking-wider uppercase">
                Simulated Endpoint
              </span>
            </div>

            <div className="flex items-start space-x-4">
              <div className="bg-slate-100 p-3 rounded-xl text-slate-600 shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex-1 text-sm">
                <div className="font-bold text-slate-900">{incident.assignedAuthority.name}</div>
                <div className="text-slate-500 text-xs mt-0.5">{incident.assignedAuthority.department} division</div>
                <div className="text-xxs font-mono text-slate-400 mt-2">
                  Emergency dispatch contact: {incident.assignedAuthority.contactPhone}
                </div>
              </div>
            </div>

            {/* Simulated submission status badge */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {incident.submittedToAuthority || incident.status === 'Resolved' || incident.status === 'In Progress' || incident.status === 'Investigating' ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold uppercase tracking-wide">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Simulated Submission: Acknowledged</span>
                </span>
              ) : incident.status === 'needs_community_verification' ? (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold uppercase tracking-wide">
                  <span>Routing Suspended (Awaiting Verification)</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold uppercase tracking-wide">
                  <span>Routing Stage Initialized</span>
                </span>
              )}
            </div>

            {/* Display AI Route Reasoning */}
            {incident.routeResult && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
                <div className="font-bold text-slate-700 flex items-center space-x-1.5 mb-1.5 text-xxs uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  <span>AI Jurisdiction Routing Reasoning</span>
                </div>
                <p className="text-slate-600 bg-slate-50 p-3 border border-slate-100 rounded-xl italic leading-relaxed">
                  "{incident.routeResult.jurisdictionReasoning}"
                </p>
              </div>
            )}

            {/* Display Formal Complaint Draft */}
            {incident.draftResult && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
                <div className="font-bold text-slate-700 flex items-center justify-between mb-2.5 text-xxs uppercase tracking-wider">
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>AI Formal Complaint Draft</span>
                  </span>
                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-mono lowercase">
                    {incident.draftResult.format}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                  <div className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-1">
                    Subject: {incident.draftResult.complaintTitle}
                  </div>
                  <pre className="text-slate-600 font-mono text-[10px] whitespace-pre-wrap leading-relaxed">
                    {incident.draftResult.complaintBody}
                  </pre>
                </div>
              </div>
            )}

            {/* Display AI Pathfinder Escalation Strategy (Resolution Path) */}
            {incident.pathfinderResult && (
              <div className="mt-4 pt-4 border-t border-slate-100 text-xs">
                <div className="font-bold text-slate-700 flex items-center justify-between mb-3.5 text-xxs uppercase tracking-wider">
                  <span className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>AI Pathfinder: Resolution Path Strategy</span>
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-mono">
                    Escalation Level: {incident.escalationLevel ?? 0}
                  </span>
                </div>

                <div className="relative border-l-2 border-indigo-100 ml-3 pl-6 space-y-5">
                  {/* First Action / Level 0 Entry */}
                  <div className="relative">
                    <span className={`absolute -left-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-bold ${
                      (incident.escalationLevel ?? 0) === 0
                        ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-50'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      {(incident.escalationLevel ?? 0) > 0 ? '✓' : '0'}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-[11px] flex items-center space-x-1.5">
                        <span>Core Action: Initial Transmission</span>
                        {(incident.escalationLevel ?? 0) === 0 && (
                          <span className="px-1.5 py-0.2 text-[8px] bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100 font-bold uppercase tracking-wide">ACTIVE / DEPLOYED</span>
                        )}
                      </span>
                      <p className="text-slate-500 mt-1 leading-relaxed">
                        {incident.pathfinderResult.firstAction}
                      </p>
                    </div>
                  </div>

                  {/* Escalation ladder steps */}
                  {incident.pathfinderResult.escalationLadder.map((step) => {
                    const isCurrent = (incident.escalationLevel ?? 0) === step.level;
                    const isPassed = (incident.escalationLevel ?? 0) > step.level;
                    
                    return (
                      <div key={step.level} className="relative">
                        <span className={`absolute -left-[33px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-bold ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-50'
                            : isPassed
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-white text-slate-400 border-slate-200'
                        }`}>
                          {isPassed ? '✓' : step.level}
                        </span>
                        
                        <div className={`p-3 rounded-xl border ${
                          isCurrent
                            ? 'bg-indigo-50/40 border-indigo-150 shadow-sm'
                            : 'bg-slate-50/50 border-slate-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`font-bold text-[11px] ${isCurrent ? 'text-indigo-950' : 'text-slate-800'}`}>
                              Escalation Level {step.level}: {step.action.split(':')[0] || 'Targeted Escalation'}
                            </span>
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 text-[9px] font-semibold rounded border border-amber-100">
                              Wait {step.waitDays} {step.waitDays === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                          
                          <p className={`mt-1.5 leading-relaxed text-[10.5px] ${isCurrent ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
                            {step.action}
                          </p>
                          
                          <div className="mt-2 pt-2 border-t border-dashed border-slate-200/60 flex items-center space-x-1 text-[9.5px] text-slate-500">
                            <span className="font-semibold text-slate-600 shrink-0">Trigger Condition:</span>
                            <span className="italic">"{step.triggerCondition}"</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Underling Clustered Reports list */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 text-md mb-4">
              Clustered Incident Reports ({incident.reports.length})
            </h3>

            <div className="space-y-4">
              {incident.reports.map((report) => (
                <div key={report.id} className="border border-slate-200 p-4 rounded-xl hover:bg-slate-50/50 transition">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Report Photo (Required) */}
                    <div className="w-full sm:w-24 h-24 rounded-lg bg-black overflow-hidden shrink-0 border border-slate-200">
                      <img
                        src={report.photoUrl}
                        alt="Citizen uploaded report visual"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="flex-1 text-xs">
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800">{report.reporterName}</span>
                          {renderContributorPill(report.reporterName)}
                        </div>
                        <span className="text-slate-400 text-xxs font-mono">
                          {new Date(report.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed mb-3">
                        "{report.description || 'No descriptive text provided.'}"
                      </p>

                      {/* Display Inferred Attributes if any */}
                      {report.attributes && Object.keys(report.attributes).length > 0 && (
                        <div className="mt-2">
                          <span className="font-mono text-xxs text-indigo-600 uppercase tracking-wider font-bold block mb-1">
                            Inferred AI Attributes
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(report.attributes).map(([k, v]) => (
                              <span
                                key={k}
                                className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded-md font-mono text-[9px]"
                              >
                                {k}: {String(v)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Community Validations & Signatures */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 text-md mb-4">
              Community Validations & Signatures ({incident.confirmations?.length || 0})
            </h3>

            {!incident.confirmations || incident.confirmations.length === 0 ? (
              <p className="text-slate-400 text-xs italic">
                No local community validations submitted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {incident.confirmations.map((conf) => (
                  <div key={conf.id} className="border border-slate-100 p-3.5 rounded-xl bg-slate-50/50">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 text-xs">{conf.userName}</span>
                        {renderContributorPill(conf.userName)}
                        {conf.flagged && (
                          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full inline-flex items-center font-mono uppercase tracking-wider">
                            Flagged Brigade
                          </span>
                        )}
                      </div>
                      <span className="text-slate-400 text-xxs font-mono">
                        {new Date(conf.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <p className="text-slate-600 text-xs leading-relaxed mt-2 italic">
                      "{conf.comment || 'Validated without comment.'}"
                    </p>

                    <div className="mt-2.5 flex items-center space-x-4 text-xxs font-mono text-slate-400">
                      <span>Vote: <strong className="text-slate-600 uppercase">{conf.type.replace('_', ' ')}</strong></span>
                      <span>Weight: <strong className="text-slate-600">{conf.acceptedWeight?.toFixed(2) || '0.00'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Agent Multi-Stage Pipeline Timeline */}
        <div className="lg:col-span-5">
          <div className="bg-slate-950 text-slate-100 p-5 rounded-3xl border border-slate-900 shadow-lg relative overflow-hidden">
            {/* Visual gradient indicator */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>

            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-slate-5
                 text-md flex items-center space-x-1.5">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <span>AI Pipeline Action Stream</span>
                </h3>
                <p className="text-xxs text-slate-400 mt-0.5">Real-time trace logs of AI pipeline execution</p>
              </div>
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 font-mono text-xxs rounded-md">
                Active
              </span>
            </div>

            {/* Timeline Stream */}
            <div className="relative border-l border-slate-800/80 ml-3.5 space-y-6 py-2">
              {incident.timeline.map((event, index) => {
                const isLast = index === incident.timeline.length - 1;
                return (
                  <div key={event.id} className="relative pl-6 group">
                    {/* Bullet */}
                    <div className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-slate-900 border-2 border-indigo-500 z-10 flex items-center justify-center group-hover:scale-125 transition-transform">
                      <div className="w-1 h-1 bg-indigo-400 rounded-full"></div>
                    </div>

                    <div className="text-xs">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-200 uppercase tracking-wide text-xxs font-mono">
                            {event.title}
                          </span>
                          <button
                            onClick={() => playTextToSpeech(`Update: ${event.title}. ${event.description}`)}
                            className="p-0.5 text-slate-500 hover:text-indigo-400 rounded transition-colors cursor-pointer"
                            title="Listen to this event update"
                          >
                            <Volume2 className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500">
                          {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xxs mt-1 leading-relaxed bg-slate-900/40 p-2 border border-slate-900 rounded-lg">
                        {event.description}
                      </p>

                      {/* Timeline Payload inspection button (Civic Transperency) */}
                      {event.payload && (
                        <details className="mt-1">
                          <summary className="text-[9px] font-mono text-slate-500 hover:text-slate-300 cursor-pointer focus:outline-hidden">
                            Inspect Raw JSON Metadata
                          </summary>
                          <pre className="text-[9px] font-mono text-indigo-400 bg-slate-900 p-2 rounded-lg mt-1 overflow-x-auto border border-slate-950/40">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
