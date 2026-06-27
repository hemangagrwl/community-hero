/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ReportPage from './components/ReportPage';
import MapPage from './components/MapPage';
import IncidentDetailPage from './components/IncidentDetailPage';
import DashboardPage from './components/DashboardPage';
import ValidatePage from './components/ValidatePage';
import ProfilePage from './components/ProfilePage';
import { Incident } from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('map');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeUserName, setActiveUserName] = useState<string>('Civic Guardian (Verified)');

  const onChangeActiveUser = (name: string) => {
    setActiveUserName(name);
  };

  // Fetch initial incidents from Server API on load
  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data);
      }
    } catch (err) {
      console.error('Error loading incidents:', err);
    } finally {
      setLoading(false);
    }
  };

  const runFollowUpSweep = async () => {
    try {
      const res = await fetch('/api/followup/sweep', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.incidents) {
          setIncidents(data.incidents);
        }
        return data;
      }
    } catch (err) {
      console.error('Error running follow-up sweep:', err);
    }
    return null;
  };

  const handleReportSubmitted = (newIncident: Incident) => {
    // Add to state and set active view to detailed incident page
    setIncidents((prev) => [newIncident, ...prev]);
  };

  const handleVerify = async (
    id: string,
    type: 'still_here' | 'resolved' | 'worse',
    comment?: string,
    userName?: string,
    trustScore?: number,
    photoData?: string,
    photoMimeType?: string
  ) => {
    try {
      const res = await fetch(`/api/incidents/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          comment,
          userName: userName || 'Civic Guardian',
          trustScore,
          photoData,
          photoMimeType
        })
      });

      if (res.ok) {
        const updatedIncident = await res.json();
        // Update local state
        setIncidents((prev) =>
          prev.map((inc) => (inc.id === id ? updatedIncident : inc))
        );
      }
    } catch (err) {
      console.error('Error verifying incident:', err);
    }
  };

  // Find currently selected incident
  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId);

  // Render correct panel
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm text-gray-500 font-medium">Booting Hyperlocal Civic AI Grid...</p>
        </div>
      );
    }

    if (selectedIncidentId && selectedIncident) {
      return (
        <IncidentDetailPage
          incident={selectedIncident}
          onBack={() => setSelectedIncidentId(null)}
          onVerify={handleVerify}
          activeUserName={activeUserName}
        />
      );
    }

    switch (activeTab) {
      case 'report':
        return (
          <ReportPage
            onReportSubmitted={handleReportSubmitted}
            setActiveTab={setActiveTab}
            setSelectedIncidentId={setSelectedIncidentId}
            activeUserName={activeUserName}
          />
        );
      case 'dashboard':
        return (
          <DashboardPage
            incidents={incidents}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
            }}
            setActiveTab={setActiveTab}
            runFollowUpSweep={runFollowUpSweep}
          />
        );
      case 'validate':
        return (
          <ValidatePage
            incidents={incidents}
            onVerify={handleVerify}
            onSelectIncident={setSelectedIncidentId}
            setActiveTab={setActiveTab}
            activeUserName={activeUserName}
            onChangeActiveUser={onChangeActiveUser}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            activeUserName={activeUserName}
            onChangeActiveUser={onChangeActiveUser}
          />
        );
      case 'map':
      default:
        return (
          <MapPage
            incidents={incidents}
            onSelectIncident={setSelectedIncidentId}
            selectedIncidentId={selectedIncidentId}
            onVerify={handleVerify}
            activeUserName={activeUserName}
            onChangeActiveUser={onChangeActiveUser}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-gray-900 font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setSelectedIncidentId(null); // Clear selected details on navigation click
          setActiveTab(tab);
        }}
        selectedIncidentId={selectedIncidentId}
      />
      <main className="flex-1">
        {renderContent()}
      </main>
    </div>
  );
}
