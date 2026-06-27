/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, Map, PlusCircle, BarChart3, Locate, User } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedIncidentId: string | null;
}

export default function Header({ activeTab, setActiveTab, selectedIncidentId }: HeaderProps) {
  const tabs = [
    { id: 'report', label: 'Report Issue', icon: PlusCircle },
    { id: 'map', label: 'Live Map', icon: Map },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'validate', label: 'Validate Near Me', icon: Locate },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center py-2.5 sm:py-0 sm:h-16 gap-2 sm:gap-4">
          {/* Logo / Branding */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('map')}>
            <div className="w-9 h-9 bg-indigo-600 text-white rounded-xl shadow-sm flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none">Community Hero</h1>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded border border-slate-200 uppercase tracking-widest">Bengaluru Hub</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-1" aria-label="Global">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id && !selectedIncidentId;
              return (
                <button
                  key={tab.id}
                  id={`nav-tab-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                >
                  <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Simulated Notice Badge */}
          <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full text-slate-600 text-xxs font-bold uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Simulated Authorities Enabled</span>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-t border-slate-100 bg-white">
        <div className="flex justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id && !selectedIncidentId;
            return (
              <button
                key={tab.id}
                id={`mobile-nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center space-y-0.5 px-2 py-1 rounded-lg text-xxs transition-colors ${
                  isActive
                    ? 'text-indigo-600 font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
