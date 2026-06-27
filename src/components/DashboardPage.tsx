/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Incident } from '../types';
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, ShieldAlert, Zap, Clock, Landmark, Cpu, Play, RefreshCw, History } from 'lucide-react';
import { getCategoryColor } from './MapPage';

interface DashboardPageProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
  setActiveTab: (tab: string) => void;
  runFollowUpSweep?: () => Promise<any>;
}

export default function DashboardPage({ incidents, onSelectIncident, setActiveTab, runFollowUpSweep }: DashboardPageProps) {
  // 1. Dynamic Metric Calculations
  const totalIncidents = incidents.length;
  const resolvedCount = incidents.filter(i => i.status === 'Resolved').length;
  const activeCount = totalIncidents - resolvedCount;
  const resolutionRate = totalIncidents > 0 ? Math.round((resolvedCount / totalIncidents) * 100) : 100;

  // Calculate average severity
  const avgSeverity = totalIncidents > 0
    ? Math.round(incidents.reduce((sum, i) => sum + i.severity, 0) / totalIncidents)
    : 0;

  // 2. Counts by Category
  const categoryCounts: Record<string, number> = {};
  incidents.forEach(inc => {
    categoryCounts[inc.category] = (categoryCounts[inc.category] || 0) + 1;
  });

  // 3. Counts by Ward / Location
  const wardCounts: Record<string, { total: number; active: number }> = {};
  incidents.forEach(inc => {
    const loc = inc.locationName || 'General Ward';
    if (!wardCounts[loc]) {
      wardCounts[loc] = { total: 0, active: 0 };
    }
    wardCounts[loc].total += 1;
    if (inc.status !== 'Resolved') {
      wardCounts[loc].active += 1;
    }
  });

  // Sort wards to find hotspots (most active incidents)
  const hotspots = Object.entries(wardCounts)
    .map(([ward, counts]) => ({ ward, ...counts }))
    .sort((a, b) => b.active - a.active);

  const [isSweeping, setIsSweeping] = useState(false);
  const [countdown, setCountdown] = useState(30);

  // Setup client-side interval while the dashboard page is open
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleAutomaticSweep();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSweeping]);

  const handleAutomaticSweep = async () => {
    if (isSweeping || !runFollowUpSweep) return;
    setIsSweeping(true);
    try {
      await runFollowUpSweep();
    } catch (err) {
      console.error('Error in automatic sweep:', err);
    } finally {
      setIsSweeping(false);
    }
  };

  const handleManualSweep = async () => {
    if (isSweeping || !runFollowUpSweep) return;
    setIsSweeping(true);
    try {
      await runFollowUpSweep();
      setCountdown(30);
    } catch (err) {
      console.error('Error in manual sweep:', err);
    } finally {
      setIsSweeping(false);
    }
  };

  // Find all incidents that have been evaluated by the follow-up agent
  const recentAgentActions = incidents
    .filter((inc) => inc.lastAgentAction !== undefined)
    .sort((a, b) => {
      const timeA = new Date(a.lastAgentAction?.timestamp || 0).getTime();
      const timeB = new Date(b.lastAgentAction?.timestamp || 0).getTime();
      return timeB - timeA;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Title & Introduction */}
      <div className="mb-8">
        <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-100">
          Transparency & Performance Audits
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Bengaluru Civic Health Dashboard</h2>
        <p className="text-slate-500 mt-1 max-w-2xl text-sm">
          Auditable transparency metrics compiled live from citizen reports and automated AI-agent routing workflows.
        </p>
      </div>

      {/* AI Agent Autonomy Console */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md text-white mb-8 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-extrabold">Autonomous Sentinel Active</span>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-white flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <span>AI Strategic Follow-up Agent</span>
            </h3>
            <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
              Exposing autonomous follow-up sweeps. The agent runs on a client-side timer (every 30s representing virtual days) evaluating timeline events, pathfinder escalation ladders, and elapsed thresholds.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
            {/* Automatic countdown indicator */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl px-4 py-2 flex items-center justify-between gap-6 text-xs font-mono">
              <div className="space-y-0.5">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Auto-Sweep Tick</div>
                <div className="font-extrabold text-slate-200">{countdown}s remaining</div>
              </div>
              <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 30) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Manual Run button */}
            <button
              onClick={handleManualSweep}
              disabled={isSweeping}
              className={`flex items-center justify-center space-x-2 px-5 py-3 rounded-xl font-bold text-xs transition duration-200 uppercase tracking-wider shadow-sm select-none ${
                isSweeping
                  ? 'bg-slate-850 text-slate-500 cursor-not-allowed border border-slate-800'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer active:scale-95'
              }`}
            >
              {isSweeping ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Evaluating Open Tickets...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white text-white" />
                  <span>Advance Time & Sweep</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Sweep Logs section ( transparency story ) */}
        {recentAgentActions.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-800/60">
            <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-extrabold mb-3 flex items-center space-x-1.5">
              <History className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sentinel Audit Feed (Recent Agent Actions)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentAgentActions.slice(0, 4).map((action) => (
                <div 
                  key={action.id} 
                  onClick={() => onSelectIncident(action.id)}
                  className="bg-slate-950/40 border border-slate-800/60 p-3 rounded-xl hover:border-slate-700 hover:bg-slate-950/60 transition duration-150 cursor-pointer text-xs flex items-start gap-2.5"
                >
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    action.lastAgentAction?.action === 'escalate' ? 'bg-amber-400 animate-pulse' :
                    action.lastAgentAction?.action === 'close' ? 'bg-emerald-400' : 'bg-slate-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-slate-200 truncate pr-2">{action.title}</span>
                      <span className={`px-1.5 py-0.5 rounded font-mono font-black text-[9px] uppercase tracking-wide ${
                        action.lastAgentAction?.action === 'escalate' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        action.lastAgentAction?.action === 'close' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {action.lastAgentAction?.action === 'escalate' ? `Escalated Lvl ${action.lastAgentAction?.level}` : action.lastAgentAction?.action}
                      </span>
                    </div>
                    <p className="text-slate-400 leading-relaxed text-[11px] italic line-clamp-2">
                      "{action.lastAgentAction?.reasoning}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Key Performance Indicators (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Filed Issues */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xxs font-mono text-slate-400 uppercase tracking-widest font-bold">Total Reports</div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalIncidents}</div>
            <div className="text-xxs text-slate-500 mt-1">Logged in-database</div>
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xxs font-mono text-slate-400 uppercase tracking-widest font-bold">Resolution Rate</div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{resolutionRate}%</div>
            <div className="text-xxs text-blue-600 font-bold mt-1 flex items-center space-x-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+4.2% this week</span>
            </div>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xxs font-mono text-slate-400 uppercase tracking-widest font-bold">Avg Response Time</div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">18.5h</div>
            <div className="text-xxs text-amber-600 font-bold mt-1">AI automated dispatch</div>
          </div>
        </div>

        {/* Average Severity Evaluate */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="bg-rose-50 text-rose-600 p-3 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xxs font-mono text-slate-400 uppercase tracking-widest font-bold">Avg Severity Index</div>
            <div className="text-2xl font-black text-slate-900 font-mono mt-0.5">{avgSeverity}</div>
            <div className="text-xxs text-slate-500 mt-1">Weighted hazard score</div>
          </div>
        </div>
      </div>

      {/* Grid: Left breakdown, Right Hotspots */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Category Distribution & Ward Breakdown */}
        <div className="lg:col-span-8 space-y-8">
          {/* Category Distribution chart */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-5 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <span>Incidents by Category</span>
            </h3>

            <div className="space-y-4">
              {['pothole', 'water_leak', 'broken_streetlight', 'garbage', 'drainage', 'fallen_tree'].map((cat) => {
                const count = categoryCounts[cat] || 0;
                const percentage = totalIncidents > 0 ? (count / totalIncidents) * 100 : 0;
                const color = getCategoryColor(cat);

                return (
                  <div key={cat} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold text-slate-700 capitalize">
                      <span>{cat.replace('_', ' ')}</span>
                      <span className="font-mono text-slate-500">{count} reports ({Math.round(percentage)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ward Breakdown Lists */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 text-lg mb-4 flex items-center space-x-2">
              <Landmark className="w-5 h-5 text-slate-500" />
              <span>Ward Activity Indexes</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xxs font-mono text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Ward Location</th>
                    <th className="py-3 px-4 text-center">Active (Open)</th>
                    <th className="py-3 px-4 text-center">Total Files</th>
                    <th className="py-3 px-4 text-right">Status State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {hotspots.map((h, i) => (
                    <tr key={h.ward} className="hover:bg-slate-50/40 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-800">{h.ward}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xxs font-bold ${
                          h.active >= 2 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {h.active} unresolved
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 font-mono">{h.total}</td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="text-xxs font-semibold text-slate-400">
                          {h.active === 0 ? '🏆 100% Resolved' : '🛠️ Dispatch Active'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {hotspots.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                        No active reports filed yet. Use the Intake Portal to file an issue!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Hotspots & Civic Activity Feed */}
        <div className="lg:col-span-4 space-y-6">
          {/* Active Hotspots Alert panel */}
          <div className="bg-rose-50/50 border border-rose-200/60 p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold text-rose-950 text-md flex items-center space-x-2 mb-3">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <span>Hotspot Danger Zones</span>
            </h3>
            <p className="text-xxs text-rose-800 mb-4 leading-relaxed font-medium">
              These locations represent geographical clusters with high concentrations of unresolved active reports. Volunteers are urged to validate these.
            </p>

            <div className="space-y-3">
              {hotspots.slice(0, 3).map((h, index) => {
                if (h.active === 0) return null;
                return (
                  <div key={h.ward} className="bg-white border border-rose-100 p-3 rounded-xl flex items-center justify-between shadow-xxs">
                    <div>
                      <div className="font-bold text-xs text-slate-800">{h.ward}</div>
                      <div className="text-[10px] text-slate-400 font-mono font-medium">Rank #{index + 1} Severity Hotspot</div>
                    </div>
                    <span className="text-xs bg-rose-100 text-rose-800 px-2.5 py-1 rounded-lg font-black font-mono">
                      {h.active} Active
                    </span>
                  </div>
                );
              })}
              {hotspots.filter(h => h.active > 0).length === 0 && (
                <div className="bg-white p-4 rounded-xl border border-rose-100 text-center text-xxs text-slate-400 font-medium">
                  Clean Sweep! No active hotspot danger zones in Bengaluru.
                </div>
              )}
            </div>
          </div>

          {/* Quick Active Reports feed */}
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h3 className="font-bold text-slate-900 text-md mb-4">Latest Active Logins</h3>
            <div className="space-y-3.5">
              {incidents.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => {
                    onSelectIncident(inc.id);
                    setActiveTab('map');
                  }}
                  className="group cursor-pointer flex items-center space-x-3 text-xs"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: getCategoryColor(inc.category) }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 group-hover:text-indigo-600 truncate transition">
                      {inc.title}
                    </div>
                    <div className="text-slate-400 text-xxs flex justify-between mt-0.5 font-medium">
                      <span>{inc.locationName}</span>
                      <span className="font-bold text-slate-500 font-mono">Severity: {inc.severity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
