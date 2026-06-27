/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const VisionVerify = z.object({
  matchesClaim: z.boolean(),
  detectedObjects: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type VisionVerifyType = z.infer<typeof VisionVerify>;

export const Cluster = z.object({
  decision: z.enum(["merge", "new"]),
  targetIncidentId: z.string().nullable(),
  reasoning: z.string(),
});

export type ClusterType = z.infer<typeof Cluster>;

export const Route = z.object({
  authorityId: z.string(),
  jurisdictionReasoning: z.string(),
});

export type RouteType = z.infer<typeof Route>;

export const Draft = z.object({
  complaintTitle: z.string(),
  complaintBody: z.string(),
  format: z.enum(["email", "grievance_portal", "letter"]),
});

export type DraftType = z.infer<typeof Draft>;

export const Pathfinder = z.object({
  firstAction: z.string(),
  escalationLadder: z.array(z.object({
    level: z.number(),
    action: z.string(),
    triggerCondition: z.string(),   // what makes us climb to here
    waitDays: z.number(),
  })),
});

export type PathfinderType = z.infer<typeof Pathfinder>;

export const FollowUp = z.object({
  action: z.enum(["wait", "escalate", "close"]),
  nextLevel: z.number().nullable(),
  reasoning: z.string(),
});

export type FollowUpType = z.infer<typeof FollowUp>;

export const ConfirmationEval = z.object({
  acceptedWeight: z.number().min(0).max(1),  // scaled by submitter trustScore
  confidenceDelta: z.number(),               // applied to incident.confidence
  brigadingFlag: z.boolean(),                // burst of identical confirmations?
  reasoning: z.string(),
});

export type ConfirmationEvalType = z.infer<typeof ConfirmationEval>;

export interface Report {
  id: string;
  photoUrl: string; // base64 or placeholder URL
  description: string;
  lat: number;
  lng: number;
  category: string; // e.g. "pothole", "water_leak", "broken_streetlight", "garbage", "drainage", "fallen_tree"
  subType?: string;
  attributes?: Record<string, any>;
  createdAt: string;
  reporterName: string;
  originalLanguage?: string;
}

export interface Authority {
  id: string;
  name: string;
  department: string;
  contactPhone: string;
  isSimulated: boolean;
}

export interface TimelineEvent {
  id: string;
  type: 'intake' | 'classification' | 'severity' | 'routing' | 'citizen_confirmation' | 'resolution';
  title: string;
  description: string;
  timestamp: string;
  payload?: any;
}

export interface Incident {
  id: string;
  category: string;
  subType?: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  severity: number; // 0-100
  safetyRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  confidence: number; // 0-100 (from community confirmations)
  status: 'Open' | 'Investigating' | 'In Progress' | 'Resolved' | 'needs_community_verification';
  reports: Report[];
  timeline: TimelineEvent[];
  assignedAuthority: Authority;
  predictedTrajectory?: {
    willWorsen: boolean;
    timeframe: string;
    reasoning: string;
  };
  locationName: string; // e.g. "Indiranagar Ward", "Koramangala Ward", etc.
  confirmationCount?: number;
  routeResult?: RouteType;
  draftResult?: DraftType;
  submittedToAuthority?: boolean;
  pathfinderResult?: PathfinderType;
  escalationLevel?: number;
  confirmations?: Confirmation[];
  simulatedDaysElapsed?: number;
  createdAt?: string;
  lastAgentAction?: {
    action: 'wait' | 'escalate' | 'close';
    level?: number;
    reasoning: string;
    timestamp: string;
  };
}

export interface Confirmation {
  id: string;
  incidentId: string;
  type: 'still_here' | 'resolved' | 'worse';
  comment?: string;
  createdAt: string;
  userName: string;
  trustScore?: number;
  flagged?: boolean;
  acceptedWeight?: number;
  photoUrl?: string; // base64 or placeholder URL if "worse" photo provided
  confidenceDelta?: number;
  reasoning?: string;
}

export interface User {
  id: string;
  name: string;
  isOptedIn: boolean;
  lat?: number;
  lng?: number;
}
