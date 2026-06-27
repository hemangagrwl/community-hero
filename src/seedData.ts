/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Incident, Authority, Report, TimelineEvent } from './types';

// Raw Seed Data from the user
export const rawSeedData = {
  "authorities": [
    {
      "id": "bbmp",
      "name": "BBMP",
      "department": "Bruhat Bengaluru Mahanagara Palike",
      "jurisdiction": {
        "categories": ["pothole", "garbage", "drainage", "fallen_tree", "other"],
        "wards": ["all"]
      },
      "escalationLadder": [
        { "level": 0, "action": "Ward engineer ticket", "triggerCondition": "initial", "waitDays": 3 },
        { "level": 1, "action": "Assistant Executive Engineer escalation", "triggerCondition": "no action in 3 days", "waitDays": 4 },
        { "level": 2, "action": "Zonal commissioner grievance", "triggerCondition": "no action in 7 days", "waitDays": 5 },
        { "level": 3, "action": "Public escalation + RTI reference", "triggerCondition": "no action in 12 days", "waitDays": 0 }
      ],
      "contactMock": "ward-engineer@simulated.bbmp.local"
    },
    {
      "id": "bwssb",
      "name": "BWSSB",
      "department": "Bangalore Water Supply and Sewerage Board",
      "jurisdiction": { "categories": ["water_leak"], "wards": ["all"] },
      "escalationLadder": [
        { "level": 0, "action": "Sub-division complaint", "triggerCondition": "initial", "waitDays": 2 },
        { "level": 1, "action": "Executive Engineer escalation", "triggerCondition": "no action in 2 days", "waitDays": 3 },
        { "level": 2, "action": "Public grievance escalation", "triggerCondition": "no action in 5 days", "waitDays": 0 }
      ],
      "contactMock": "complaints@simulated.bwssb.local"
    },
    {
      "id": "bescom",
      "name": "BESCOM",
      "department": "Bangalore Electricity Supply Company",
      "jurisdiction": { "categories": ["streetlight"], "wards": ["all"] },
      "escalationLadder": [
        { "level": 0, "action": "Local section office ticket", "triggerCondition": "initial", "waitDays": 2 },
        { "level": 1, "action": "Junior Engineer escalation", "triggerCondition": "no action in 2 days", "waitDays": 3 },
        { "level": 2, "action": "Helpline + public grievance", "triggerCondition": "no action in 5 days", "waitDays": 0 }
      ],
      "contactMock": "1912@simulated.bescom.local"
    }
  ],

  "users": [
    { "id": "u1", "displayName": "Asha", "trustScore": 0.9, "reportsCount": 14, "points": 320 },
    { "id": "u2", "displayName": "Ravi", "trustScore": 0.6, "reportsCount": 3, "points": 70 },
    { "id": "u3", "displayName": "Newcomer", "trustScore": 0.2, "reportsCount": 0, "points": 0 }
  ],

  "reports": [
    { "id": "r1", "incidentId": "i1", "category": "pothole", "description": "Deep pothole on 80ft road near junction", "mediaType": "photo", "mediaRef": "seed/pothole1.jpg", "location": { "lat": 12.9352, "lng": 77.6245, "ward": "Koramangala" }, "reporterId": "u1", "originalLanguage": "en", "visionVerified": true, "visionConfidence": 0.92, "status": "clustered", "createdAt": "2026-06-23T09:10:00Z" },
    { "id": "r2", "incidentId": "i1", "category": "pothole", "description": "Same pothole, water-filled after rain", "mediaType": "photo", "mediaRef": "seed/pothole2.jpg", "location": { "lat": 12.9354, "lng": 77.6247, "ward": "Koramangala" }, "reporterId": "u2", "originalLanguage": "en", "visionVerified": true, "visionConfidence": 0.88, "status": "clustered", "createdAt": "2026-06-23T18:40:00Z" },
    { "id": "r3", "incidentId": "i2", "category": "water_leak", "description": "Pipeline leaking onto road for two days", "mediaType": "photo", "mediaRef": "seed/leak1.jpg", "location": { "lat": 12.9719, "lng": 77.6412, "ward": "Indiranagar" }, "reporterId": "u1", "originalLanguage": "en", "visionVerified": true, "visionConfidence": 0.9, "status": "clustered", "createdAt": "2026-06-22T14:05:00Z" },
    { "id": "r4", "incidentId": "i3", "category": "streetlight", "description": "Streetlight out, dark stretch near park", "mediaType": "photo", "mediaRef": "seed/light1.jpg", "location": { "lat": 12.9116, "lng": 77.6389, "ward": "HSR Layout" }, "reporterId": "u2", "originalLanguage": "kn", "visionVerified": true, "visionConfidence": 0.85, "status": "clustered", "createdAt": "2026-06-24T20:15:00Z" },
    { "id": "r5", "incidentId": "i4", "category": "garbage", "description": "Garbage dumped at corner, not collected", "mediaType": "photo", "mediaRef": "seed/garbage1.jpg", "location": { "lat": 12.9250, "lng": 77.5938, "ward": "Jayanagar" }, "reporterId": "u1", "originalLanguage": "en", "visionVerified": true, "visionConfidence": 0.8, "status": "clustered", "createdAt": "2026-06-24T08:00:00Z" },
    { "id": "r6", "incidentId": "i5", "category": "drainage", "description": "Open drain overflowing onto footpath", "mediaType": "photo", "mediaRef": "seed/drain1.jpg", "location": { "lat": 12.9166, "lng": 77.6101, "ward": "BTM Layout" }, "reporterId": "u2", "originalLanguage": "en", "visionVerified": true, "visionConfidence": 0.83, "status": "clustered", "createdAt": "2026-06-25T11:30:00Z" },
    { "id": "r7", "incidentId": "i6", "category": "fallen_tree", "description": "Tree branch down blocking half the lane", "mediaType": "photo", "mediaRef": "seed/tree1.jpg", "location": { "lat": 12.9569, "lng": 77.7011, "ward": "Marathahalli" }, "reporterId": "u1", "originalLanguage": "en", "visionVerified": true, "visionConfidence": 0.94, "status": "clustered", "createdAt": "2026-06-25T07:20:00Z" },
    { "id": "r8", "incidentId": "i7", "category": "pothole", "description": "Cluster of small potholes forming", "mediaType": "photo", "mediaRef": "seed/pothole3.jpg", "location": { "lat": 12.9259, "lng": 77.6760, "ward": "Bellandur" }, "reporterId": "u2", "originalLanguage": "en", "visionVerified": true, "visionConfidence": 0.79, "status": "clustered", "createdAt": "2026-06-26T09:00:00Z" },
    { "id": "r9", "incidentId": "i8", "category": "streetlight", "description": "Two lights flickering near bus stop", "mediaType": "photo", "mediaRef": "seed/light2.jpg", "location": { "lat": 12.9072, "lng": 77.6271, "ward": "Bommanahalli" }, "reporterId": "u1", "originalLanguage": "en", "visionVerified": true, "visionConfidence": 0.82, "status": "clustered", "createdAt": "2026-06-26T19:45:00Z" }
  ],

  "incidents": [
    { "id": "i1", "category": "pothole", "severity": 78, "confidence": 65, "centroid": { "lat": 12.9353, "lng": 77.6246 }, "radiusM": 40, "ward": "Koramangala", "reportIds": ["r1", "r2"], "confirmationCount": 3, "status": "open", "assignedAuthorityId": "bbmp", "escalationLevel": 1, "predictedTrajectory": "Likely to deepen sharply through monsoon (4-6 weeks)", "createdAt": "2026-06-23T09:10:00Z", "lastActionAt": "2026-06-26T09:10:00Z" },
    { "id": "i2", "category": "water_leak", "severity": 84, "confidence": 70, "centroid": { "lat": 12.9719, "lng": 77.6412 }, "radiusM": 25, "ward": "Indiranagar", "reportIds": ["r3"], "confirmationCount": 2, "status": "acknowledged", "assignedAuthorityId": "bwssb", "escalationLevel": 1, "predictedTrajectory": "Water loss worsening; road erosion risk within 1 week", "createdAt": "2026-06-22T14:05:00Z", "lastActionAt": "2026-06-25T14:05:00Z" },
    { "id": "i3", "category": "streetlight", "severity": 55, "confidence": 40, "centroid": { "lat": 12.9116, "lng": 77.6389 }, "radiusM": 30, "ward": "HSR Layout", "reportIds": ["r4"], "confirmationCount": 1, "status": "open", "assignedAuthorityId": "bescom", "escalationLevel": 0, "predictedTrajectory": "Safety risk after dark; stable otherwise", "createdAt": "2026-06-24T20:15:00Z", "lastActionAt": "2026-06-24T20:15:00Z" },
    { "id": "i4", "category": "garbage", "severity": 48, "confidence": 55, "centroid": { "lat": 12.9250, "lng": 77.5938 }, "radiusM": 20, "ward": "Jayanagar", "reportIds": ["r5"], "confirmationCount": 2, "status": "in_progress", "assignedAuthorityId": "bbmp", "escalationLevel": 0, "predictedTrajectory": "Will attract more dumping if not cleared in days", "createdAt": "2026-06-24T08:00:00Z", "lastActionAt": "2026-06-26T08:00:00Z" },
    { "id": "i5", "category": "drainage", "severity": 72, "confidence": 50, "centroid": { "lat": 12.9166, "lng": 77.6101 }, "radiusM": 25, "ward": "BTM Layout", "reportIds": ["r6"], "confirmationCount": 1, "status": "open", "assignedAuthorityId": "bbmp", "escalationLevel": 0, "predictedTrajectory": "Overflow + mosquito/health risk rising in monsoon", "createdAt": "2026-06-25T11:30:00Z", "lastActionAt": "2026-06-25T11:30:00Z" },
    { "id": "i6", "category": "fallen_tree", "severity": 88, "confidence": 75, "centroid": { "lat": 12.9569, "lng": 77.7011 }, "radiusM": 15, "ward": "Marathahalli", "reportIds": ["r7"], "confirmationCount": 4, "status": "resolved", "assignedAuthorityId": "bbmp", "escalationLevel": 0, "predictedTrajectory": "Immediate traffic hazard (resolved)", "createdAt": "2026-06-25T07:20:00Z", "lastActionAt": "2026-06-25T15:20:00Z" },
    { "id": "i7", "category": "pothole", "severity": 35, "confidence": 30, "centroid": { "lat": 12.9259, "lng": 77.6760 }, "radiusM": 20, "ward": "Bellandur", "reportIds": ["r8"], "confirmationCount": 0, "status": "open", "assignedAuthorityId": "bbmp", "escalationLevel": 0, "predictedTrajectory": "Early stage; predicted to merge into a large pothole in 3-5 weeks", "createdAt": "2026-06-26T09:00:00Z", "lastActionAt": "2026-06-26T09:00:00Z" },
    { "id": "i8", "category": "streetlight", "severity": 42, "confidence": 35, "centroid": { "lat": 12.9072, "lng": 77.6271 }, "radiusM": 25, "ward": "Bommanahalli", "reportIds": ["r9"], "confirmationCount": 1, "status": "open", "assignedAuthorityId": "bescom", "escalationLevel": 0, "predictedTrajectory": "Likely full failure soon", "createdAt": "2026-06-26T19:45:00Z", "lastActionAt": "2026-06-26T19:45:00Z" }
  ],

  "confirmations": [
    { "id": "c1", "incidentId": "i1", "userId": "u3", "response": "still_there", "location": { "lat": 12.9353, "lng": 77.6246 }, "acceptedWeight": 0.2, "flagged": false, "createdAt": "2026-06-24T10:00:00Z" },
    { "id": "c2", "incidentId": "i1", "userId": "u1", "response": "still_there", "location": { "lat": 12.9353, "lng": 77.6246 }, "acceptedWeight": 0.9, "flagged": false, "createdAt": "2026-06-25T17:30:00Z" },
    { "id": "c3", "incidentId": "i6", "userId": "u1", "response": "resolved", "location": { "lat": 12.9569, "lng": 77.7011 }, "acceptedWeight": 0.9, "flagged": false, "createdAt": "2026-06-25T15:10:00Z" }
  ]
};

// Map raw seed authorities to Record<string, Authority>
export const authorities: Record<string, Authority> = {};

rawSeedData.authorities.forEach((auth) => {
  authorities[auth.id] = {
    id: auth.id,
    name: auth.name,
    department: auth.department,
    contactPhone: auth.contactMock,
    isSimulated: true
  };
});

// Provide standard mapper for category -> Authority
export const getAuthorityForCategory = (category: string): Authority => {
  const normalizedCategory = category === 'broken_streetlight' ? 'streetlight' : category;
  if (normalizedCategory === 'water_leak') {
    return authorities.bwssb || authorities.bbmp;
  } else if (normalizedCategory === 'streetlight') {
    return authorities.bescom || authorities.bbmp;
  }
  return authorities.bbmp;
};

// Help map photo URLs beautifully using Unsplash high-quality photos
const getPhotoForCategory = (category: string) => {
  switch (category) {
    case 'pothole':
      return 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80';
    case 'water_leak':
      return 'https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&w=600&q=80';
    case 'streetlight':
    case 'broken_streetlight':
      return 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80';
    case 'garbage':
      return 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80';
    case 'drainage':
      return 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=600&q=80';
    case 'fallen_tree':
      return 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80';
    default:
      return 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80';
  }
};

const mapCategory = (cat: string): string => {
  if (cat === 'streetlight') return 'broken_streetlight';
  return cat;
};

// Status capitalizer mapper
const mapStatus = (status: string): 'Open' | 'Investigating' | 'In Progress' | 'Resolved' => {
  switch (status) {
    case 'resolved':
      return 'Resolved';
    case 'in_progress':
      return 'In Progress';
    case 'acknowledged':
      return 'Investigating';
    case 'open':
    default:
      return 'Open';
  }
};

// Safety Risk classifier based on severity index
const getSafetyRisk = (severity: number): 'Low' | 'Medium' | 'High' | 'Critical' => {
  if (severity >= 85) return 'Critical';
  if (severity >= 70) return 'High';
  if (severity >= 45) return 'Medium';
  return 'Low';
};

// Map Reports
const mappedReports: Report[] = rawSeedData.reports.map((rep) => {
  const reporter = rawSeedData.users.find((u) => u.id === rep.reporterId);
  const reporterName = reporter ? reporter.displayName : 'Anonymous Citizen';
  const finalCategory = mapCategory(rep.category);
  return {
    id: rep.id,
    photoUrl: getPhotoForCategory(finalCategory),
    description: rep.description,
    lat: rep.location.lat,
    lng: rep.location.lng,
    category: finalCategory,
    subType: finalCategory.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Report',
    createdAt: rep.createdAt,
    reporterName: reporterName
  };
});

// Map Incidents
export const initialIncidents: Incident[] = rawSeedData.incidents.map((inc) => {
  const finalCategory = mapCategory(inc.category);
  const reportsForInc = mappedReports.filter((r) => inc.reportIds.includes(r.id));
  const authorityObj = authorities[inc.assignedAuthorityId] || authorities.bbmp;

  // Title generation
  const cleanCategory = finalCategory.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  const title = `${cleanCategory} reported at ${inc.ward}`;

  // Description from reports
  const description = reportsForInc.length > 0 
    ? reportsForInc[0].description 
    : `A reported ${finalCategory} has been logged in ${inc.ward} ward.`;

  // Build a highly detailed real-time timeline for this incident
  const timeline: TimelineEvent[] = [
    {
      id: `ev_${inc.id}_intake`,
      type: 'intake',
      title: 'Report Intake & Localization',
      description: `Citizen report successfully registered. Geo-tagged at [${inc.centroid.lat.toFixed(5)}, ${inc.centroid.lng.toFixed(5)}] in ${inc.ward} Ward.`,
      timestamp: inc.createdAt
    },
    {
      id: `ev_${inc.id}_classify`,
      type: 'classification',
      title: 'AI Classification (Stage 1)',
      description: `AI automated classification pipeline completed. Category verified: "${finalCategory}". Subtype categorized.`,
      timestamp: new Date(new Date(inc.createdAt).getTime() + 4000).toISOString()
    },
    {
      id: `ev_${inc.id}_severity`,
      type: 'severity',
      title: 'AI Severity Assessment (Stage 2)',
      description: `Calculated severity score: ${inc.severity}/100. Safety level: ${getSafetyRisk(inc.severity)}. Predicted trajectory: "${inc.predictedTrajectory}".`,
      timestamp: new Date(new Date(inc.createdAt).getTime() + 8000).toISOString()
    },
    {
      id: `ev_${inc.id}_routing`,
      type: 'routing',
      title: 'Automated Dispatch & Authority Routing',
      description: `Incident dispatched to ${authorityObj.name} (${authorityObj.department}). Initial work order initiated.`,
      timestamp: new Date(new Date(inc.createdAt).getTime() + 15000).toISOString()
    }
  ];

  // Map confirmations for this incident to the timeline
  const confs = rawSeedData.confirmations.filter((c) => c.incidentId === inc.id);
  confs.forEach((c) => {
    const userObj = rawSeedData.users.find((u) => u.id === c.userId);
    const uName = userObj ? userObj.displayName : 'Civic Volunteer';
    
    let descriptionText = '';
    if (c.response === 'still_there') {
      descriptionText = `${uName} verified that the issue is still active at coordinates [${c.location.lat.toFixed(4)}, ${c.location.lng.toFixed(4)}]. Confidence score adjusted.`;
    } else if (c.response === 'resolved') {
      descriptionText = `${uName} verified that the issue has been successfully resolved.`;
    } else {
      descriptionText = `${uName} reported that the situation has worsened. Priority elevated.`;
    }

    timeline.push({
      id: c.id,
      type: 'citizen_confirmation',
      title: `Citizen Verification: ${c.response.replace('_', ' ').toUpperCase()}`,
      description: descriptionText,
      timestamp: c.createdAt
    });
  });

  // Sort timeline by timestamp so it's beautifully chronological
  timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const defaultPathfinder = {
    firstAction: `File formal digital complaint ticket to ${authorityObj.name} Central Intake portal.`,
    escalationLadder: [
      {
        level: 1,
        action: `Automated follow-up warning notice dispatched to department head of ${authorityObj.name}.`,
        triggerCondition: "No status change or acknowledgement received within 3 days.",
        waitDays: 3
      },
      {
        level: 2,
        action: `Elevate incident to ward commissioner office and request local community action delegation.`,
        triggerCondition: "Incident remains active, or severity escalated by community after 5 days.",
        waitDays: 5
      },
      {
        level: 3,
        action: `File formal public petition under citizen audit panel and alert local news/ombudsman.`,
        triggerCondition: "No action or physical resolve in 10 days since escalation.",
        waitDays: 10
      }
    ]
  };

  return {
    id: inc.id,
    category: finalCategory,
    subType: cleanCategory,
    title: title,
    description: description,
    lat: inc.centroid.lat,
    lng: inc.centroid.lng,
    severity: inc.severity,
    safetyRisk: getSafetyRisk(inc.severity),
    confidence: inc.confidence,
    status: mapStatus(inc.status),
    reports: reportsForInc,
    timeline: timeline,
    assignedAuthority: authorityObj,
    predictedTrajectory: {
      willWorsen: !inc.predictedTrajectory.includes('(resolved)'),
      timeframe: inc.predictedTrajectory.includes('within') ? inc.predictedTrajectory.split('within')[1].trim() : 'Next monsoon',
      reasoning: inc.predictedTrajectory
    },
    locationName: `${inc.ward} Ward`,
    confirmationCount: inc.confirmationCount,
    pathfinderResult: defaultPathfinder,
    escalationLevel: inc.escalationLevel || 0
  };
});
