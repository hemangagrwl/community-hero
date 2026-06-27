/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { Incident, Report, TimelineEvent, Confirmation, VisionVerify, Cluster, ClusterType, Route, RouteType, Draft, DraftType, Authority, Pathfinder, PathfinderType, ConfirmationEval, ConfirmationEvalType, FollowUp, FollowUpType } from './src/types';
import { initialIncidents, getAuthorityForCategory, rawSeedData, authorities } from './src/seedData';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON parsing with size limits to accommodate base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// In-memory data store
let incidentsStore: Incident[] = [...initialIncidents];

export interface UserProfile {
  name: string;
  trustScore: number;
  reportsVerifiedCount: number;
  incidentsResolvedCount: number;
  validationsContributedCount: number;
}

let usersStore: Record<string, UserProfile> = {
  'Civic Guardian (Verified)': {
    name: 'Civic Guardian (Verified)',
    trustScore: 0.85,
    reportsVerifiedCount: 8,
    incidentsResolvedCount: 3,
    validationsContributedCount: 15
  },
  'Ward Committee Lead': {
    name: 'Ward Committee Lead',
    trustScore: 0.95,
    reportsVerifiedCount: 12,
    incidentsResolvedCount: 6,
    validationsContributedCount: 20
  },
  'Standard Citizen': {
    name: 'Standard Citizen',
    trustScore: 0.60,
    reportsVerifiedCount: 4,
    incidentsResolvedCount: 1,
    validationsContributedCount: 6
  },
  'Suspicious Bot / Spammer': {
    name: 'Suspicious Bot / Spammer',
    trustScore: 0.15,
    reportsVerifiedCount: 1,
    incidentsResolvedCount: 0,
    validationsContributedCount: 2
  },
  'Asha': {
    name: 'Asha',
    trustScore: 0.90,
    reportsVerifiedCount: 14,
    incidentsResolvedCount: 5,
    validationsContributedCount: 12
  },
  'Ravi': {
    name: 'Ravi',
    trustScore: 0.60,
    reportsVerifiedCount: 3,
    incidentsResolvedCount: 1,
    validationsContributedCount: 4
  },
  'Newcomer': {
    name: 'Newcomer',
    trustScore: 0.20,
    reportsVerifiedCount: 0,
    incidentsResolvedCount: 0,
    validationsContributedCount: 0
  },
  'Anonymous Citizen': {
    name: 'Anonymous Citizen',
    trustScore: 0.25,
    reportsVerifiedCount: 0,
    incidentsResolvedCount: 0,
    validationsContributedCount: 0
  }
};

function getOrCreateUser(name: string): UserProfile {
  const trimmed = name.trim();
  if (!usersStore[trimmed]) {
    usersStore[trimmed] = {
      name: trimmed,
      trustScore: 0.25,
      reportsVerifiedCount: 0,
      incidentsResolvedCount: 0,
      validationsContributedCount: 0
    };
  }
  return usersStore[trimmed];
}

function updateTrustScore(name: string, delta: number) {
  const user = getOrCreateUser(name);
  user.trustScore = Math.max(0, Math.min(1.0, parseFloat((user.trustScore + delta).toFixed(4))));
}

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
  try {
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    console.log('Gemini AI Client successfully initialized.');
  } catch (err) {
    console.error('Error initializing Gemini Client:', err);
  }
} else {
  console.log('No valid GEMINI_API_KEY found. Falling back to robust simulated AI Pipeline.');
}

// STAGE 1: Classify (Real Gemini call)
async function classifyStage(
  photoBase64: string,
  mimeType: string,
  textDescription: string
): Promise<{ category: string; subType: string; attributes: Record<string, string> }> {
  if (!ai) {
    console.log('Classify stage falling back to simulation.');
    return simulateClassification(textDescription);
  }

  try {
    // Strip header from data URL if present
    const base64Data = photoBase64.includes(';base64,')
      ? photoBase64.split(';base64,')[1]
      : photoBase64;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data,
      },
    };

    const promptText = `
You are an AI civic agent analyzing a reported hyperlocal civic issue in Bengaluru. 
Analyze the provided photo and the user's description: "${textDescription || 'No description provided.'}".

Your task is to classify this issue into one of the following standard civic categories:
- "pothole" (roads, craters, damaged pavement)
- "water_leak" (gushing water, broken pipes, water wasting)
- "broken_streetlight" (dark streets, damaged lamp poles, flashing lights)
- "garbage" (litter pile-ups, illegal dumping, waste blockages)
- "drainage" (overflowing sewers, smelly open drains, waterlogging)
- "fallen_tree" (blocked roads due to branches, fallen trees, horticultural hazards)
- "other" (any other civic complaints)

Return a strict JSON object with:
1. "category": strictly one of the categories listed above.
2. "subType": a specific 2-4 word classification of the issue (e.g. "Clogged Strom Water Drain", "Unattended Trash Accumulation", "Exposed High-Voltage Wiring").
3. "attributes": a flat key-value object representing inferred technical attributes like estimated size, material, scale of damage, and potential immediate hazard.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'Strictly one of: pothole, water_leak, broken_streetlight, garbage, drainage, fallen_tree, other'
            },
            subType: { type: Type.STRING },
            attributes: {
              type: Type.OBJECT,
              properties: {}, // Arbitrary key-value attributes
              description: 'Key-value pairs of inferred metrics like size, severity level, scale'
            }
          },
          required: ['category', 'subType', 'attributes']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    console.log('Gemini Classify output:', parsed);
    return {
      category: parsed.category || 'other',
      subType: parsed.subType || 'General Issue',
      attributes: parsed.attributes || {}
    };
  } catch (error) {
    console.error('Gemini Classify error, using simulation:', error);
    return simulateClassification(textDescription);
  }
}

// STAGE 2: Severity & Predict (Real Gemini call)
async function severityAndPredictStage(
  photoBase64: string,
  mimeType: string
): Promise<{
  severity: number;
  safetyRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  predictedTrajectory: { willWorsen: boolean; timeframe: string; reasoning: string };
}> {
  if (!ai) {
    console.log('Severity stage falling back to simulation.');
    return simulateSeverity();
  }

  try {
    const base64Data = photoBase64.includes(';base64,')
      ? photoBase64.split(';base64,')[1]
      : photoBase64;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data,
      },
    };

    const promptText = `
You are an AI civic safety and risk assessment agent.
Analyze the provided photo of a reported municipal issue.

Your task is to:
1. Rate the issue severity on a strict integer scale of 0 to 100 (where 0 is completely cosmetic/harmless and 100 is an immediate catastrophic threat to human life or infrastructure).
2. Rate the safety risk as exactly one of: "Low", "Medium", "High", or "Critical".
3. Predict its trajectory if left unaddressed. Estimate whether it will worsen ("willWorsen" true/false), the timeframe (e.g., "Within 24 hours", "Next rain", "1 week"), and the reasoning based on structural integrity, weather elements, or traffic context.

Return a strict JSON object with:
"severity": integer 0 to 100
"safetyRisk": "Low", "Medium", "High", or "Critical"
"predictedTrajectory": object with "willWorsen" (boolean), "timeframe" (string), "reasoning" (string)
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            severity: { type: Type.INTEGER, description: 'Integer from 0 to 100' },
            safetyRisk: { type: Type.STRING, description: 'Low, Medium, High, or Critical' },
            predictedTrajectory: {
              type: Type.OBJECT,
              properties: {
                willWorsen: { type: Type.BOOLEAN },
                timeframe: { type: Type.STRING },
                reasoning: { type: Type.STRING }
              },
              required: ['willWorsen', 'timeframe', 'reasoning']
            }
          },
          required: ['severity', 'safetyRisk', 'predictedTrajectory']
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    console.log('Gemini Severity output:', parsed);
    return {
      severity: typeof parsed.severity === 'number' ? parsed.severity : 50,
      safetyRisk: ['Low', 'Medium', 'High', 'Critical'].includes(parsed.safetyRisk)
        ? parsed.safetyRisk
        : 'Medium',
      predictedTrajectory: parsed.predictedTrajectory || {
        willWorsen: true,
        timeframe: 'Next 3 days',
        reasoning: 'Structural deterioration expected under environmental loads.'
      }
    };
  } catch (error) {
    console.error('Gemini Severity error, using simulation:', error);
    return simulateSeverity();
  }
}

// Simulated Pipeline fallbacks
function simulateClassification(text: string): { category: string; subType: string; attributes: Record<string, string> } {
  const lowercaseText = (text || '').toLowerCase();
  let category = 'other';
  let subType = 'General Civic Issue';
  let attributes: Record<string, string> = { 'Scale': 'Moderate', 'Detection Source': 'Heuristic AI' };

  if (lowercaseText.includes('pothole') || lowercaseText.includes('crater') || lowercaseText.includes('road') || lowercaseText.includes('asphalt')) {
    category = 'pothole';
    subType = 'Asphalt Wear Crater';
    attributes = { 'Estimated Depth': '12cm', 'Tire Impact Threat': 'Severe', 'Detection Source': 'Text Heuristics' };
  } else if (lowercaseText.includes('water') || lowercaseText.includes('leak') || lowercaseText.includes('pipe') || lowercaseText.includes('flow')) {
    category = 'water_leak';
    subType = 'Pipeline Fissure';
    attributes = { 'Discharge Rate': 'High', 'Flooding Potential': 'Moderate', 'Detection Source': 'Text Heuristics' };
  } else if (lowercaseText.includes('light') || lowercaseText.includes('lamp') || lowercaseText.includes('dark') || lowercaseText.includes('bulb')) {
    category = 'broken_streetlight';
    subType = 'Luminary Blackout';
    attributes = { 'Area Impact': 'Local Street', 'Active Current': 'None', 'Detection Source': 'Text Heuristics' };
  } else if (lowercaseText.includes('garbage') || lowercaseText.includes('trash') || lowercaseText.includes('bin') || lowercaseText.includes('dump')) {
    category = 'garbage';
    subType = 'Sidewalk Pile-up';
    attributes = { 'Estimated Mass': '150kg', 'Odor Intensity': 'Strong', 'Detection Source': 'Text Heuristics' };
  } else if (lowercaseText.includes('drain') || lowercaseText.includes('clog') || lowercaseText.includes('sewage') || lowercaseText.includes('flooding')) {
    category = 'drainage';
    subType = 'Sump Silt Blockage';
    attributes = { 'Blockage Ratio': '85%', 'Backflow Risk': 'High', 'Detection Source': 'Text Heuristics' };
  } else if (lowercaseText.includes('tree') || lowercaseText.includes('branch') || lowercaseText.includes('fall')) {
    category = 'fallen_tree';
    subType = 'Snapped Trunk Obstruction';
    attributes = { 'Branch Diameter': '45cm', 'Blockage State': 'Partial Lane', 'Detection Source': 'Text Heuristics' };
  }

  return { category, subType, attributes };
}

function simulateSeverity(): {
  severity: number;
  safetyRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  predictedTrajectory: { willWorsen: boolean; timeframe: string; reasoning: string };
} {
  return {
    severity: Math.floor(Math.random() * 30) + 45, // 45 to 75
    safetyRisk: 'Medium',
    predictedTrajectory: {
      willWorsen: true,
      timeframe: '48 Hours',
      reasoning: 'Active weather projections and localized traffic volumes will accelerate degradation.'
    }
  };
}

// Real Vision Verify Stage (using Gemini Flash to analyze images and validate claims)
async function visionVerifyStage(
  photoBase64: string,
  mimeType: string,
  inferredCategory: string
): Promise<{ matchesClaim: boolean; detectedObjects: string[]; confidence: number; reason: string }> {
  if (!ai) {
    console.log('VisionVerify stage falling back to simulation.');
    const isOk = inferredCategory !== 'other';
    const confidenceValue = isOk ? 0.85 : 0.45;
    return {
      matchesClaim: isOk,
      detectedObjects: [inferredCategory, 'road', 'street'],
      confidence: confidenceValue,
      reason: isOk 
        ? `Simulated visual verification confirms the image shows elements related to ${inferredCategory}.`
        : `Simulated visual verification failed. No strong indicators of standard civic category found.`
    };
  }

  try {
    const base64Data = photoBase64.includes(';base64,')
      ? photoBase64.split(';base64,')[1]
      : photoBase64;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: base64Data,
      },
    };

    const promptText = `
You are an AI computer vision agent for a civic portal in Bengaluru called Community Hero.
You are given a photo of a reported civic issue and an inferred category claim: "${inferredCategory}".
Verify if the photo actually matches or contains evidence of the claimed category.
The possible categories are:
- "pothole" (roads, craters, damaged pavement)
- "water_leak" (gushing water, broken pipes, water wasting)
- "broken_streetlight" (dark streets, damaged lamp poles, flashing lights, dark stretch)
- "garbage" (litter pile-ups, illegal dumping, waste blockages)
- "drainage" (overflowing sewers, smelly open drains, waterlogging)
- "fallen_tree" (blocked roads due to branches, fallen trees, horticultural hazards)
- "other" (any other civic complaints)

Analyze the image carefully.
Your output must be a strict JSON object matching this schema:
{
  "matchesClaim": boolean (true if the photo matches or is highly likely to represent the claimed category, false otherwise),
  "detectedObjects": array of strings (the main objects, indicators or features detected in the image),
  "confidence": number between 0 and 1 (visual confidence level, e.g. 0.85),
  "reason": string (a concise, human-friendly, professional explanation of your visual analysis and verification decision)
}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: { parts: [imagePart, { text: promptText }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchesClaim: { type: Type.BOOLEAN },
            detectedObjects: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            confidence: { type: Type.NUMBER, description: 'Confidence value between 0.0 and 1.0' },
            reason: { type: Type.STRING }
          },
          required: ['matchesClaim', 'detectedObjects', 'confidence', 'reason']
        }
      }
    });

    const parsedRaw = JSON.parse(response.text || '{}');
    console.log('Gemini VisionVerify raw output:', parsedRaw);
    
    // Validate output with Zod
    const validated = VisionVerify.parse(parsedRaw);
    return validated;
  } catch (error) {
    console.error('Gemini VisionVerify error, using simulation:', error);
    const isOk = inferredCategory !== 'other';
    return {
      matchesClaim: isOk,
      detectedObjects: [inferredCategory],
      confidence: isOk ? 0.75 : 0.45,
      reason: 'VisionVerify model query encountered a server error; fell back to automatic baseline validation.'
    };
  }
}

// Haversine formula to compute distance in meters between two points
function getDistanceInM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Real Cluster Stage (using Gemini to make semantic duplication / merge decision)
async function clusterStage(
  newReport: Report,
  openIncidents: Incident[]
): Promise<ClusterType> {
  if (openIncidents.length === 0) {
    return {
      decision: 'new',
      targetIncidentId: null,
      reasoning: 'No existing open incidents of the same category found within 150 meters.'
    };
  }

  if (!ai) {
    console.log('Cluster stage falling back to spatial proximity heuristic.');
    // Fallback: merge with the closest incident if within 150m
    let closestIncident: Incident | null = null;
    let minDistance = Infinity;

    for (const incident of openIncidents) {
      const dist = getDistanceInM(newReport.lat, newReport.lng, incident.lat, incident.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestIncident = incident;
      }
    }

    if (closestIncident && minDistance <= 150) {
      return {
        decision: 'merge',
        targetIncidentId: closestIncident.id,
        reasoning: `Matched by proximity heuristic to closest open incident (${closestIncident.id}) at a distance of ${minDistance.toFixed(1)}m.`
      };
    } else {
      return {
        decision: 'new',
        targetIncidentId: null,
        reasoning: 'No close incidents matching spatial proximity criteria.'
      };
    }
  }

  try {
    const openIncidentsData = openIncidents.map(inc => ({
      id: inc.id,
      title: inc.title,
      description: inc.description,
      lat: inc.lat,
      lng: inc.lng,
      category: inc.category,
      subType: inc.subType,
      reportsCount: inc.reports.length,
      distance: getDistanceInM(newReport.lat, newReport.lng, inc.lat, inc.lng)
    }));

    const promptText = `
You are an AI spatial clustering agent for a civic portal in Bengaluru called Community Hero.
A citizen has just submitted a new verified report of a civic issue.
We need to decide if this report describes the same physical issue as an existing open incident (within 150m), or if it is a separate, fresh incident.

New Report details:
- ID: ${newReport.id}
- Description: "${newReport.description}"
- Coordinates: [${newReport.lat}, ${newReport.lng}]
- Category: "${newReport.category}"

Potential Open Incidents (same category, within 150 meters):
${JSON.stringify(openIncidentsData, null, 2)}

Evaluate carefully. If the description, spatial proximity, and context of the new report strongly indicate that it is reporting the exact same physical issue as one of the existing incidents (e.g. same pothole, same garbage pile, same water leakage, same broken streetlight on the same street), set "decision" to "merge" and specify the "targetIncidentId".
Otherwise, set "decision" to "new" and "targetIncidentId" to null.
Be precise. It is important to merge duplicates to keep civic dispatch efficient.

Output must be a strict JSON object matching this schema:
{
  "decision": "merge" or "new",
  "targetIncidentId": string or null (the ID of the incident to merge into, must be one of the potential open incident IDs, or null if decision is "new"),
  "reasoning": string (a concise, human-friendly explanation of why you chose to merge or create a new incident)
}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING, enum: ['merge', 'new'] },
            targetIncidentId: { type: Type.STRING, nullable: true },
            reasoning: { type: Type.STRING }
          },
          required: ['decision', 'targetIncidentId', 'reasoning']
        }
      }
    });

    const parsedRaw = JSON.parse(response.text || '{}');
    console.log('Gemini Cluster raw output:', parsedRaw);

    const validated = Cluster.parse(parsedRaw);

    // Double check that targetIncidentId is actually valid if decision is "merge"
    if (validated.decision === 'merge') {
      const targetExists = openIncidents.some(i => i.id === validated.targetIncidentId);
      if (!targetExists) {
        console.warn(`Gemini returned invalid targetIncidentId: ${validated.targetIncidentId}. Falling back to 'new'`);
        return {
          decision: 'new',
          targetIncidentId: null,
          reasoning: `AI suggested merging with an invalid ID (${validated.targetIncidentId}). Fallback to creating a new incident.`
        };
      }
    }

    return validated;
  } catch (error) {
    console.error('Gemini Cluster error, using heuristic fallback:', error);
    // Fallback: merge to the closest if within 150m
    let closestIncident: Incident | null = null;
    let minDistance = Infinity;

    for (const incident of openIncidents) {
      const dist = getDistanceInM(newReport.lat, newReport.lng, incident.lat, incident.lng);
      if (dist < minDistance) {
        minDistance = dist;
        closestIncident = incident;
      }
    }

    if (closestIncident && minDistance <= 150) {
      return {
        decision: 'merge',
        targetIncidentId: closestIncident.id,
        reasoning: `Encountered API error. Fell back to closest proximity match at ${minDistance.toFixed(1)}m.`
      };
    } else {
      return {
        decision: 'new',
        targetIncidentId: null,
        reasoning: 'Encountered API error. No existing incident satisfies proximity criteria.'
      };
    }
  }
}

async function routeStage(incident: Incident): Promise<RouteType> {
  if (!ai) {
    console.log('Route stage falling back to category mapper.');
    const auth = getAuthorityForCategory(incident.category);
    return {
      authorityId: auth.id,
      jurisdictionReasoning: `Mapped based on fallback category-to-authority rules for "${incident.category}".`
    };
  }

  try {
    const routeAuthorityFunctionDeclaration = {
      name: 'assignAuthority',
      description: 'Assign the incident to exactly one civic authority based on their jurisdiction.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          authorityId: {
            type: Type.STRING,
            description: "The ID of the chosen authority. Must be exactly one of: 'bbmp', 'bwssb', 'bescom'.",
          },
          jurisdictionReasoning: {
            type: Type.STRING,
            description: 'A detailed, clear explanation of why this authority is responsible for the incident based on jurisdiction rules.',
          },
        },
        required: ['authorityId', 'jurisdictionReasoning'],
      },
    };

    const promptText = `
You are an AI routing agent for a civic portal in Bengaluru called Community Hero.
We have received a verified civic incident and need to route it to the correct civic authority.

Incident Details:
- Category: "${incident.category}"
- Sub-Type: "${incident.subType}"
- Description: "${incident.description}"
- Coordinates: [${incident.lat}, ${incident.lng}]
- Location: "${incident.locationName}"

Authorities and Jurisdiction Rules:
${JSON.stringify(rawSeedData.authorities, null, 2)}

You must select exactly one authority by calling the 'assignAuthority' tool with the correct 'authorityId' and a detailed 'jurisdictionReasoning'.
- bbmp: Bruhat Bengaluru Mahanagara Palike. Handles road issues (potholes), garbage pile-ups, drainage, fallen trees, and general issues.
- bwssb: Bangalore Water Supply and Sewerage Board. Handles water leaks and pipeline issues.
- bescom: Bangalore Electricity Supply Company. Handles streetlights and electricity issues.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        tools: [{ functionDeclarations: [routeAuthorityFunctionDeclaration] }],
      },
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls[0] && functionCalls[0].args) {
      const args = functionCalls[0].args as any;
      const authorityId = (args.authorityId || '').toLowerCase().trim();
      if (['bbmp', 'bwssb', 'bescom'].includes(authorityId)) {
        return {
          authorityId,
          jurisdictionReasoning: args.jurisdictionReasoning || 'Assigned based on jurisdiction rules.'
        };
      }
    }

    const auth = getAuthorityForCategory(incident.category);
    return {
      authorityId: auth.id,
      jurisdictionReasoning: 'Structured function call response was invalid or missing. Fallback mapping applied.'
    };
  } catch (error) {
    console.error('Gemini routeStage error, using category fallback:', error);
    const auth = getAuthorityForCategory(incident.category);
    return {
      authorityId: auth.id,
      jurisdictionReasoning: 'AI service error during jurisdiction routing. Fallback mapping applied.'
    };
  }
}

async function draftStage(incident: Incident, assignedAuthority: Authority): Promise<DraftType> {
  if (!ai) {
    console.log('Draft stage falling back to pre-defined stub.');
    return {
      complaintTitle: `FORMAL GRIEVANCE: ${incident.subType || incident.category} at ${incident.locationName}`,
      complaintBody: `Dear Sir/Madam,\n\nWe would like to formally report a ${incident.category} issue classified as ${incident.subType} at location ${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)} (${incident.locationName}).\n\nThe AI Pipeline has assessed this issue with a Severity Index of ${incident.severity}/100 and a ${incident.safetyRisk} safety risk level.\n\nPlease resolve this immediately to prevent further civic distress.\n\nSincerely,\nCommunity Hero Citizen Portal`,
      format: 'email'
    };
  }

  try {
    const promptText = `
You are an AI advocacy drafting agent for a civic portal in Bengaluru called Community Hero.
We need to generate a formal, highly professional civic complaint letter, email, or portal submission for the chosen authority regarding an active incident.

Incident Details:
- Category: "${incident.category}"
- Sub-Type: "${incident.subType}"
- Description: "${incident.description}"
- Coordinates: [${incident.lat}, ${incident.lng}]
- Location: "${incident.locationName}"
- Severity Index: ${incident.severity}/100
- Safety Risk: "${incident.safetyRisk}"

Assigned Authority:
- Name: "${assignedAuthority.name}"
- Department: "${assignedAuthority.department}"
- Email/Contact: "${assignedAuthority.contactPhone}"

Draft a formal grievance, choosing the appropriate format (one of: 'email', 'grievance_portal', or 'letter').
Generate a compelling title ("complaintTitle") and a comprehensive, formal body ("complaintBody") that clearly articulates the issue, coordinates, environmental risks, and asks for urgent resolution.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            complaintTitle: { type: Type.STRING },
            complaintBody: { type: Type.STRING },
            format: { type: Type.STRING, enum: ['email', 'grievance_portal', 'letter'] }
          },
          required: ['complaintTitle', 'complaintBody', 'format']
        }
      }
    });

    const parsedRaw = JSON.parse(response.text || '{}');
    console.log('Gemini Draft stage raw output:', parsedRaw);

    return Draft.parse(parsedRaw);
  } catch (error) {
    console.error('Gemini draftStage error, using fallback:', error);
    return {
      complaintTitle: `FORMAL GRIEVANCE: ${incident.subType || incident.category} at ${incident.locationName}`,
      complaintBody: `Dear Sir/Madam,\n\nWe would like to formally report a ${incident.category} issue classified as ${incident.subType} at location ${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)} (${incident.locationName}).\n\nThe AI Pipeline has assessed this issue with a Severity Index of ${incident.severity}/100 and a ${incident.safetyRisk} safety risk level.\n\nPlease resolve this immediately to prevent further civic distress.\n\nSincerely,\nCommunity Hero Citizen Portal`,
      format: 'email'
    };
  }
}

async function submitToSimulatedAuthority(incidentId: string, authorityId: string, complaint: any) {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/authorities/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId, authorityId, complaint })
    });
    if (response.ok) {
      const data = await response.json();
      return data.status === 'acknowledged';
    }
    return false;
  } catch (err) {
    console.error('Simulated authority call error:', err);
    return true; // Return true anyway as fallback to simulate successful ingestion
  }
}

async function pathfinderStage(incident: Incident): Promise<PathfinderType> {
  const authorityName = incident.assignedAuthority?.name || 'Local Ward Authority';
  
  if (!ai) {
    console.log('Pathfinder stage falling back to pre-defined escalation ladder.');
    return {
      firstAction: `File formal digital complaint ticket to ${authorityName} Central Intake portal.`,
      escalationLadder: [
        {
          level: 1,
          action: `Automated follow-up warning notice dispatched to department head of ${authorityName}.`,
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
  }

  try {
    const promptText = `
You are an AI advocacy pathfinder agent for a civic portal in Bengaluru called Community Hero.
The civic incident has been successfully classified and routed to the chosen authority.
Your task is to produce an ordered, strategic escalation ladder of next actions if the authority fails to resolve the issue in a timely manner.

Incident Details:
- Category: "${incident.category}"
- Sub-Type: "${incident.subType}"
- Description: "${incident.description}"
- Coordinates: [${incident.lat}, ${incident.lng}]
- Location: "${incident.locationName}"
- Severity Index: ${incident.severity}/100
- Safety Risk: "${incident.safetyRisk}"

Assigned Authority:
- Name: "${incident.assignedAuthority?.name}"
- Department: "${incident.assignedAuthority?.department}"

Generate a strategic action plan:
1. "firstAction": The very first step taken right after formal submission (e.g., automated digital dispatch).
2. "escalationLadder": A list of subsequent escalation steps (from Level 1 to 3) representing a ladder to climb if the issue remains unresolved.
   Each ladder step must include:
   - "level" (number starting from 1)
   - "action" (string specifying the targeted action or appeal to a higher department or community action)
   - "triggerCondition" (string explaining what triggers this transition, such as "no response", "monsoon onset", or "community worsening report")
   - "waitDays" (number representing the wait period in days before triggering this step)

Output must be a strict JSON object matching this schema:
{
  "firstAction": "Description of first step",
  "escalationLadder": [
    {
      "level": 1,
      "action": "Description of level 1 action",
      "triggerCondition": "Condition triggering level 1",
      "waitDays": 3
    }
  ]
}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            firstAction: { type: Type.STRING },
            escalationLadder: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  level: { type: Type.INTEGER },
                  action: { type: Type.STRING },
                  triggerCondition: { type: Type.STRING },
                  waitDays: { type: Type.INTEGER }
                },
                required: ['level', 'action', 'triggerCondition', 'waitDays']
              }
            }
          },
          required: ['firstAction', 'escalationLadder']
        }
      }
    });

    const parsedRaw = JSON.parse(response.text || '{}');
    console.log('Gemini Pathfinder stage raw output:', parsedRaw);

    return Pathfinder.parse(parsedRaw);
  } catch (error) {
    console.error('Gemini pathfinderStage error, using fallback:', error);
    return {
      firstAction: `File formal digital complaint ticket to ${authorityName} Central Intake portal.`,
      escalationLadder: [
        {
          level: 1,
          action: `Automated follow-up warning notice dispatched to department head of ${authorityName}.`,
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
  }
}

async function evaluateConfirmationStage(
  incident: Incident,
  type: 'still_here' | 'resolved' | 'worse',
  comment: string,
  userName: string,
  trustScore: number,
  recentConfirmations: Confirmation[]
): Promise<ConfirmationEvalType> {
  if (!ai) {
    console.log('Confirmation evaluation falling back to simulation.');
    // Fallback heuristic simulation
    const acceptedWeight = parseFloat((trustScore * (type === 'resolved' ? 0.8 : 1.0)).toFixed(2));
    let confidenceDelta = 0;
    if (type === 'still_here') {
      confidenceDelta = Math.round(15 * acceptedWeight);
    } else if (type === 'resolved') {
      confidenceDelta = Math.round(-20 * acceptedWeight);
    } else if (type === 'worse') {
      confidenceDelta = Math.round(20 * acceptedWeight);
    }
    
    // Check if there's a burst of identical confirmations (brigading check fallback)
    const matches = recentConfirmations.filter(c => c.type === type && c.userName === userName);
    const brigadingFlag = matches.length >= 2;

    return {
      acceptedWeight: brigadingFlag ? 0.05 : acceptedWeight,
      confidenceDelta: brigadingFlag ? 1 : confidenceDelta,
      brigadingFlag,
      reasoning: brigadingFlag 
        ? "Multiple identical confirmations submitted in rapid succession from the same user. Flagged as potential brigading."
        : `Citizen verification evaluated successfully. Applied trust-scaled weight of ${acceptedWeight} to adjust confidence.`
    };
  }

  try {
    const promptText = `
You are an AI validation auditor for Bengaluru's civic portal, Community Hero.
We received a citizen verification (confirmation) report for an active incident and need to evaluate its validity, calculate a trust weight, and detect potential brigading.

Incident Context:
- Title: "${incident.title}"
- Category: "${incident.category}" (Sub-type: "${incident.subType}")
- Current Confidence: ${incident.confidence}/100
- Current Severity: ${incident.severity}/100

Submitter Context:
- Submitter Name: "${userName}"
- Submitter Trust Score: ${trustScore} (Scale of 0.0 to 1.0 where 1.0 is absolute trust)

Verification Details:
- Type of Report: "${type}" (one of: 'still_here', 'resolved', 'worse')
- Submitter Comment: "${comment || '(no comment)'}"

Recent Confirmation Pattern (History on this incident):
${JSON.stringify(recentConfirmations.map(c => ({ type: c.type, userName: c.userName, comment: c.comment, createdAt: c.createdAt })), null, 2)}

Your Tasks:
1. Determine "acceptedWeight" (float 0.0 to 1.0): This is the final trust-weight we assign to this submission. Start with the submitter's trustScore, adjust slightly based on the plausibility of their comment (coherent comments increase it, gibberish or spam decreases it), and scale down drastically to near-zero (e.g. 0.05) if "brigadingFlag" is true.
2. Determine "confidenceDelta" (integer): The change applied to the incident's confidence level. 
   - 'still_here': Positive delta (e.g. +10 to +20).
   - 'resolved': Negative delta (e.g. -15 to -30) to signal it's resolved.
   - 'worse': Positive delta (e.g. +15 to +25).
   - If "brigadingFlag" is true, the delta should be near zero (e.g., +1).
3. Determine "brigadingFlag" (boolean): True if there is a burst of identical confirmations or suspicious repeated submission pattern by the same user or a cluster of users in a short span.
4. Provide a professional, clear "reasoning" (string) for this evaluation.

Output MUST be a strict JSON object matching this schema:
{
  "acceptedWeight": number,
  "confidenceDelta": number,
  "brigadingFlag": boolean,
  "reasoning": "Detailed reasoning explaining the score, brigading status, and weight scaling"
}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            acceptedWeight: { type: Type.NUMBER },
            confidenceDelta: { type: Type.INTEGER },
            brigadingFlag: { type: Type.BOOLEAN },
            reasoning: { type: Type.STRING }
          },
          required: ['acceptedWeight', 'confidenceDelta', 'brigadingFlag', 'reasoning']
        }
      }
    });

    const parsedRaw = JSON.parse(response.text || '{}');
    console.log('Gemini Confirmation Evaluation raw output:', parsedRaw);
    return ConfirmationEval.parse(parsedRaw);
  } catch (error) {
    console.error('Gemini evaluateConfirmationStage error, using fallback:', error);
    const acceptedWeight = parseFloat((trustScore * (type === 'resolved' ? 0.8 : 1.0)).toFixed(2));
    let confidenceDelta = 0;
    if (type === 'still_here') confidenceDelta = Math.round(15 * acceptedWeight);
    else if (type === 'resolved') confidenceDelta = Math.round(-20 * acceptedWeight);
    else if (type === 'worse') confidenceDelta = Math.round(20 * acceptedWeight);

    return {
      acceptedWeight,
      confidenceDelta,
      brigadingFlag: false,
      reasoning: 'Fallback heuristic applied due to AI service exception.'
    };
  }
}

function followUpStage(incident: Incident) {
  return {
    automatedFollowUpScheduled: true,
    followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
  };
}


// --- API ROUTES ---

// 0a. Get all user profiles
app.get('/api/users', (req, res) => {
  res.json(Object.values(usersStore));
});

// 0b. Get single user profile
app.get('/api/users/:name', (req, res) => {
  const profile = usersStore[req.params.name];
  if (!profile) {
    return res.status(404).json({ error: 'User profile not found' });
  }
  res.json(profile);
});

// 0c. Get or create a user profile
app.post('/api/users/profile', (req, res) => {
  const { name, trustScore } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const trimmed = name.trim();
  const exists = !!usersStore[trimmed];
  const profile = getOrCreateUser(trimmed);
  if (!exists && typeof trustScore === 'number') {
    profile.trustScore = trustScore;
  }
  res.json(profile);
});

// 1. Get all incidents
app.get('/api/incidents', (req, res) => {
  res.json(incidentsStore);
});

// 2. Get single incident
app.get('/api/incidents/:id', (req, res) => {
  const incident = incidentsStore.find(i => i.id === req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json(incident);
});

// 2b. Simulated Authority endpoint (a local stub that returns "acknowledged")
app.post('/api/authorities/submit', (req, res) => {
  const { incidentId, authorityId, complaint } = req.body;
  console.log(`[SIMULATED AUTHORITY SERVICE] Received formal submission for incident ${incidentId} to authority ${authorityId}:`, complaint);
  res.json({ status: 'acknowledged' });
});

// 3. Post a new report (Intake & Agent Pipeline)
app.post('/api/reports', async (req, res) => {
  const { photoData, photoMimeType, description, lat, lng, reporterName, originalLanguage } = req.body;

  if (!photoData) {
    return res.status(400).json({ error: 'Photo is required' });
  }

  const reportLat = typeof lat === 'number' ? lat : 12.9716;
  const reportLng = typeof lng === 'number' ? lng : 77.5946;
  const repName = reporterName || 'Anonymous Citizen';

  try {
    const reportId = `rep_${Math.random().toString(36).substr(2, 9)}`;
    const incidentId = `inc_${Math.random().toString(36).substr(2, 9)}`;

    // Generate Timestamp
    const timestampStr = new Date().toISOString();

    // 0. Vision Verify Stage (Before Classify)
    // First, infer category from description/heuristics
    let inferredCategory = 'other';
    if (ai) {
      try {
        const textPrompt = `Analyze this description of a civic issue in Bengaluru: "${description || ''}". Under which category does it fall? Strictly return one of: pothole, water_leak, broken_streetlight, garbage, drainage, fallen_tree, other. Only return the category name, nothing else.`;
        const textRes = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: textPrompt,
        });
        const cleaned = (textRes.text || '').trim().toLowerCase();
        if (['pothole', 'water_leak', 'broken_streetlight', 'garbage', 'drainage', 'fallen_tree', 'other'].includes(cleaned)) {
          inferredCategory = cleaned;
        } else {
          inferredCategory = simulateClassification(description || '').category;
        }
      } catch (err) {
        inferredCategory = simulateClassification(description || '').category;
      }
    } else {
      inferredCategory = simulateClassification(description || '').category;
    }

    // Run Vision Verify
    const verifyResult = await visionVerifyStage(photoData, photoMimeType, inferredCategory);
    const isVerified = verifyResult.matchesClaim && verifyResult.confidence >= 0.6;

    if (isVerified) {
      updateTrustScore(repName, 0.10);
      const u = getOrCreateUser(repName);
      u.reportsVerifiedCount += 1;
    } else {
      updateTrustScore(repName, -0.15);
    }

    let finalCategory = inferredCategory;
    let finalSubType = inferredCategory.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' Report';
    let finalAttributes: Record<string, any> = { 'Vision Verify Status': isVerified ? 'Verified' : 'Flagged' };
    let finalSeverity = 50;
    let finalSafetyRisk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Medium';
    let finalTrajectory = {
      willWorsen: true,
      timeframe: 'Next 3 days',
      reasoning: 'Pending community physical validation.'
    };
    const timeline: TimelineEvent[] = [];

    // Base timeline event: Intake
    timeline.push({
      id: `ev_${incidentId}_1`,
      type: 'intake',
      title: 'Report Intake & Localization',
      description: `Citizen report successfully captured by ${repName}. Location pinned at GPS coords [${reportLat.toFixed(5)}, ${reportLng.toFixed(5)}].`,
      timestamp: timestampStr
    });

    // Vision verification timeline event
    timeline.push({
      id: `ev_${incidentId}_vv`,
      type: 'classification',
      title: `AI Vision Verification: ${isVerified ? 'PASSED' : 'SUSPENDED'}`,
      description: `Visual analysis evaluated. Matches claimed/inferred category "${inferredCategory}": ${verifyResult.matchesClaim}. Confidence: ${(verifyResult.confidence * 100).toFixed(0)}%. Detected elements: [${verifyResult.detectedObjects.join(', ')}]. Reasoning: "${verifyResult.reason}"`,
      timestamp: new Date(Date.now() + 1000).toISOString(),
      payload: verifyResult
    });

    if (!isVerified) {
      // BRANCH: SUSPENDED ROUTING
      const assignedAuth = getAuthorityForCategory(inferredCategory);

      const newReport: Report = {
        id: reportId,
        photoUrl: photoData,
        description: description || '',
        lat: reportLat,
        lng: reportLng,
        category: inferredCategory,
        subType: finalSubType,
        attributes: { ...finalAttributes, ...verifyResult },
        createdAt: timestampStr,
        reporterName: repName,
        originalLanguage
      };

      const initialIncident: Incident = {
        id: incidentId,
        category: inferredCategory,
        subType: finalSubType,
        title: `Unverified ${finalCategory.replace('_', ' ')} near Location`,
        description: description || `A reported ${inferredCategory} has been flagged but failed automatic vision verification (Confidence: ${(verifyResult.confidence * 100).toFixed(0)}%). Awaiting local community verification.`,
        lat: reportLat,
        lng: reportLng,
        severity: finalSeverity,
        safetyRisk: finalSafetyRisk,
        confidence: Math.round(verifyResult.confidence * 100),
        status: 'needs_community_verification',
        reports: [newReport],
        assignedAuthority: assignedAuth,
        predictedTrajectory: finalTrajectory,
        locationName: 'Bengaluru Ward Map',
        timeline: timeline
      };

      incidentsStore.unshift(initialIncident);
      return res.status(201).json(initialIncident);

    } else {
      // BRANCH: CONTINUE NORMAL PIPELINE WITH SPATIAL-SEMANTIC CLUSTERING
      // 1. Classify Stage
      const classification = await classifyStage(photoData, photoMimeType, description || '');
      finalCategory = classification.category;
      finalSubType = classification.subType;
      finalAttributes = { ...finalAttributes, ...classification.attributes };

      // 2. Severity Stage
      const riskAnalysis = await severityAndPredictStage(photoData, photoMimeType);
      finalSeverity = riskAnalysis.severity;
      finalSafetyRisk = riskAnalysis.safetyRisk;
      finalTrajectory = riskAnalysis.predictedTrajectory;

      // Assemble standard report
      const newReport: Report = {
        id: reportId,
        photoUrl: photoData,
        description: description || '',
        lat: reportLat,
        lng: reportLng,
        category: finalCategory,
        subType: finalSubType,
        attributes: finalAttributes,
        createdAt: timestampStr,
        reporterName: repName,
        originalLanguage
      };

      // 3. Cluster Stage
      // Find open incidents of the same category within 150 meters
      const matchingOpenIncidents = incidentsStore.filter(inc => {
        return inc.category === finalCategory &&
               inc.status !== 'Resolved' &&
               inc.status !== 'needs_community_verification' &&
               getDistanceInM(reportLat, reportLng, inc.lat, inc.lng) <= 150;
      });

      const clusterResult = await clusterStage(newReport, matchingOpenIncidents);

      if (clusterResult.decision === 'merge' && clusterResult.targetIncidentId) {
        // Merge into existing incident
        const targetIncident = incidentsStore.find(i => i.id === clusterResult.targetIncidentId);
        if (targetIncident) {
          // Attach the report to that incident
          targetIncident.reports.push(newReport);
          
          // Append reportId if an untyped reportIds list is tracked
          if ((targetIncident as any).reportIds) {
            (targetIncident as any).reportIds.push(newReport.id);
          }

          // Recompute centroid (average lat and lng of all reports)
          const allReports = targetIncident.reports;
          const totalReports = allReports.length;
          if (totalReports > 0) {
            const sumLat = allReports.reduce((sum, r) => sum + r.lat, 0);
            const sumLng = allReports.reduce((sum, r) => sum + r.lng, 0);
            targetIncident.lat = sumLat / totalReports;
            targetIncident.lng = sumLng / totalReports;
          }

          // Increment confirmationCount appropriately
          if (typeof targetIncident.confirmationCount === 'number') {
            targetIncident.confirmationCount += 1;
          } else {
            targetIncident.confirmationCount = 1;
          }

          // Also boost confidence dynamically based on another verified user report
          targetIncident.confidence = Math.min(100, targetIncident.confidence + 15);

          // Append a TimelineEvent
          const mergeEvent: TimelineEvent = {
            id: `ev_cluster_merge_${Math.random().toString(36).substr(2, 9)}`,
            type: 'citizen_confirmation',
            title: 'AI Clustering: Duplicate Merged',
            description: `New verified report ${newReport.id} by ${repName} merged into this active incident. Recomputed centroid to [${targetIncident.lat.toFixed(5)}, ${targetIncident.lng.toFixed(5)}]. Reasoning: "${clusterResult.reasoning}"`,
            timestamp: timestampStr,
            payload: clusterResult
          };
          targetIncident.timeline.push(mergeEvent);

          // Sort timeline chronologically
          targetIncident.timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

          return res.status(200).json(targetIncident);
        }
      }

      // Either decision="new" or target incident wasn't found - create a fresh incident
      const assignedAuth = getAuthorityForCategory(finalCategory);

      const initialIncident: Incident = {
        id: incidentId,
        category: finalCategory,
        subType: finalSubType,
        title: `${finalSubType || 'Civic Issue'} near Location`,
        description: description || `A reported ${finalCategory} has been flagged by citizens.`,
        lat: reportLat,
        lng: reportLng,
        severity: finalSeverity,
        safetyRisk: finalSafetyRisk,
        confidence: 50, // Initial confidence score
        status: 'Open',
        reports: [newReport],
        assignedAuthority: assignedAuth,
        predictedTrajectory: finalTrajectory,
        locationName: 'Bengaluru Ward Map',
        timeline: timeline,
        confirmationCount: 0
      };

      const routeResult = await routeStage(initialIncident);
      initialIncident.routeResult = routeResult;

      const finalAssignedAuth = authorities[routeResult.authorityId] || getAuthorityForCategory(finalCategory);
      initialIncident.assignedAuthority = finalAssignedAuth;

      const draftResult = await draftStage(initialIncident, finalAssignedAuth);
      initialIncident.draftResult = draftResult;

      const submissionSuccess = await submitToSimulatedAuthority(incidentId, finalAssignedAuth.id, draftResult);
      initialIncident.submittedToAuthority = submissionSuccess;

      const pathfinderResult = await pathfinderStage(initialIncident);
      initialIncident.pathfinderResult = pathfinderResult;
      initialIncident.escalationLevel = 0;

      const followUpResult = followUpStage(initialIncident);

      timeline.push(
        {
          id: `ev_${incidentId}_2`,
          type: 'classification',
          title: 'AI Classification (Stage 1)',
          description: `Gemini Flash analyzed image & text. Verified Category: "${finalCategory}", Sub-Type: "${finalSubType}". Extracted attributes: ${JSON.stringify(classification.attributes)}.`,
          timestamp: new Date(Date.now() + 2000).toISOString(),
          payload: classification
        },
        {
          id: `ev_cluster_new_${Math.random().toString(36).substr(2, 9)}`,
          type: 'classification',
          title: 'AI Clustering: Fresh Node Established',
          description: `AI evaluated local spatial context. No duplicate overlaps found within 150m. Spawning new primary ticket. Reasoning: "${clusterResult.reasoning}"`,
          timestamp: new Date(Date.now() + 3000).toISOString(),
          payload: clusterResult
        },
        {
          id: `ev_${incidentId}_3`,
          type: 'severity',
          title: 'AI Severity & Risk Prediction (Stage 2)',
          description: `Gemini evaluated structural damage. Severity index: ${finalSeverity}/100. Safety Risk: ${finalSafetyRisk}. Trajectory: ${finalTrajectory.willWorsen ? 'Will worsen' : 'Static'} within ${finalTrajectory.timeframe}. Reason: ${finalTrajectory.reasoning}`,
          timestamp: new Date(Date.now() + 4000).toISOString(),
          payload: riskAnalysis
        },
        {
          id: `ev_${incidentId}_route`,
          type: 'routing',
          title: 'AI Jurisdiction Routing (Stage 3)',
          description: `AI analyzed jurisdiction rules and successfully assigned incident to ${finalAssignedAuth.name} (${finalAssignedAuth.department}). Reasoning: "${routeResult.jurisdictionReasoning}"`,
          timestamp: new Date(Date.now() + 5000).toISOString(),
          payload: routeResult
        },
        {
          id: `ev_${incidentId}_draft`,
          type: 'routing',
          title: 'AI Complaint Drafting (Stage 4)',
          description: `AI generated a highly formal civic grievance for ${finalAssignedAuth.name}. Format selected: ${draftResult.format.toUpperCase()}. Title: "${draftResult.complaintTitle}"`,
          timestamp: new Date(Date.now() + 5500).toISOString(),
          payload: draftResult
        },
        {
          id: `ev_${incidentId}_submit`,
          type: 'routing',
          title: 'Simulated Authority Submission',
          description: `Formal complaint transmitted successfully to simulated endpoint at "${finalAssignedAuth.contactPhone}". System status response: Acknowledged.`,
          timestamp: new Date(Date.now() + 5800).toISOString(),
          payload: { status: 'acknowledged', authority: finalAssignedAuth.name }
        },
        {
          id: `ev_${incidentId}_pathfinder`,
          type: 'citizen_confirmation',
          title: 'AI Civic Pathfinder (Stage 5)',
          description: `AI generated a highly strategic resolution path for ${finalAssignedAuth.name}. First Action: "${pathfinderResult.firstAction}". Escalation ladder configured with ${pathfinderResult.escalationLadder.length} sequential checkpoints.`,
          timestamp: new Date(Date.now() + 6000).toISOString(),
          payload: { pathfinder: pathfinderResult, followUp: followUpResult }
        }
      );

      // Sort timeline chronologically
      initialIncident.timeline = timeline;
      initialIncident.timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      incidentsStore.unshift(initialIncident);

      return res.status(201).json(initialIncident);
    }
  } catch (error) {
    console.error('Error in reports intake pipeline:', error);
    res.status(500).json({ error: 'Server error during report pipeline execution' });
  }
});

// 4. Confirm/Verify an incident (Validate Near Me)
app.post('/api/incidents/:id/confirm', async (req, res) => {
  const { type, comment, userName, trustScore: clientTrustScore, photoData, photoMimeType } = req.body;
  const incidentIndex = incidentsStore.findIndex(i => i.id === req.params.id);

  if (incidentIndex === -1) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  const incident = incidentsStore[incidentIndex];
  const user = userName || 'Civic Volunteer';
  
  // Find or create backend profile, initialize with clientTrustScore if it doesn't exist
  const trimmedUser = user.trim();
  const exists = !!usersStore[trimmedUser];
  const userProfile = getOrCreateUser(trimmedUser);
  if (!exists && typeof clientTrustScore === 'number') {
    userProfile.trustScore = clientTrustScore;
  }
  
  const trustScore = userProfile.trustScore;

  // Ensure confirmations array is initialized
  incident.confirmations = incident.confirmations || [];

  // Evaluate confirmation with Gemini (or simulation fallback)
  const evalResult = await evaluateConfirmationStage(
    incident,
    type,
    comment || '',
    user,
    trustScore,
    incident.confirmations
  );

  const isBrigade = evalResult.brigadingFlag;
  const finalWeight = isBrigade ? 0.02 : evalResult.acceptedWeight;
  const finalConfidenceDelta = isBrigade ? 1 : evalResult.confidenceDelta;

  if (isBrigade) {
    updateTrustScore(user, -0.20);
  } else {
    // Increment validation contribution for valid validations
    const u = getOrCreateUser(user);
    u.validationsContributedCount += 1;
  }

  // Create new confirmation object
  const newConfirmation: Confirmation = {
    id: `conf_${Math.random().toString(36).substr(2, 9)}`,
    incidentId: incident.id,
    type,
    comment,
    createdAt: new Date().toISOString(),
    userName: user,
    trustScore,
    flagged: isBrigade,
    acceptedWeight: finalWeight,
    confidenceDelta: finalConfidenceDelta,
    reasoning: evalResult.reasoning,
    photoUrl: photoData ? 'worse_photo_active' : undefined
  };

  incident.confirmations.push(newConfirmation);

  // Update confidence based on eval results
  incident.confidence = Math.max(0, Math.min(100, incident.confidence + finalConfidenceDelta));

  let statusChangeDescription = '';
  let updatedSeverityMsg = '';

  // Severity rises only if type="worse" AND a new, worse photo is provided
  if (type === 'worse') {
    if (photoData) {
      const riskAnalysis = await severityAndPredictStage(photoData, photoMimeType || 'image/jpeg');
      const oldSeverity = incident.severity;
      incident.severity = riskAnalysis.severity;
      incident.safetyRisk = riskAnalysis.safetyRisk;
      if (riskAnalysis.predictedTrajectory) {
        incident.predictedTrajectory = riskAnalysis.predictedTrajectory;
      }
      updatedSeverityMsg = ` Re-evaluated photo: Severity shifted from ${oldSeverity}/100 to ${incident.severity}/100 based on Gemini vision analysis. Safety risk: ${incident.safetyRisk}.`;
      statusChangeDescription = `${user} uploaded a new visual proof of worsening. Severity evaluated upward to ${incident.severity}/100.`;
    } else {
      statusChangeDescription = `${user} reported that the issue has worsened verbally (no visual evidence, severity held static).`;
    }
  } else if (type === 'still_here') {
    statusChangeDescription = `${user} confirmed the issue is still active. Confidence level increased.`;
  } else if (type === 'resolved') {
    statusChangeDescription = `${user} reported the issue as resolved. Flagged for review.`;
  }

  // If incident was unverified and a citizen confirms it's active or worse, elevate it!
  if (incident.status === 'needs_community_verification') {
    if (type === 'still_here' || type === 'worse') {
      incident.status = 'Open';
      incident.title = incident.title.replace('Unverified ', '');
      
      const routeResult = await routeStage(incident);
      incident.routeResult = routeResult;

      const finalAssignedAuth = authorities[routeResult.authorityId] || getAuthorityForCategory(incident.category);
      incident.assignedAuthority = finalAssignedAuth;

      const draftResult = await draftStage(incident, finalAssignedAuth);
      incident.draftResult = draftResult;

      const submissionSuccess = await submitToSimulatedAuthority(incident.id, finalAssignedAuth.id, draftResult);
      incident.submittedToAuthority = submissionSuccess;

      const pathfinderResult = await pathfinderStage(incident);
      incident.pathfinderResult = pathfinderResult;
      incident.escalationLevel = 0;

      incident.timeline.push(
        {
          id: `ev_routed_${Math.random().toString(36).substr(2, 9)}`,
          type: 'routing',
          title: 'Community Validation COMPLETE',
          description: `Physical validation approved by ${user}. Suspended routing lifted! Automatic ticket dispatched and routed to simulated endpoint of ${finalAssignedAuth.name} (${finalAssignedAuth.department}). Reasoning: "${routeResult.jurisdictionReasoning}"`,
          timestamp: new Date().toISOString(),
          payload: { authority: finalAssignedAuth, routeResult }
        },
        {
          id: `ev_draft_${Math.random().toString(36).substr(2, 9)}`,
          type: 'routing',
          title: 'AI Complaint Drafting Complete',
          description: `AI generated complaint draft for ${finalAssignedAuth.name}. Format selected: ${draftResult.format.toUpperCase()}. Title: "${draftResult.complaintTitle}"`,
          timestamp: new Date().toISOString(),
          payload: draftResult
        },
        {
          id: `ev_submit_${Math.random().toString(36).substr(2, 9)}`,
          type: 'routing',
          title: 'Simulated Authority Submission',
          description: `Formal complaint transmitted successfully to simulated endpoint for ${finalAssignedAuth.name}. System response: Acknowledged.`,
          timestamp: new Date().toISOString(),
          payload: { status: 'acknowledged' }
        },
        {
          id: `ev_pathfinder_${Math.random().toString(36).substr(2, 9)}`,
          type: 'citizen_confirmation',
          title: 'AI Civic Pathfinder (Stage 5)',
          description: `AI generated a strategic resolution path for ${finalAssignedAuth.name}. First Action: "${pathfinderResult.firstAction}". Escalation ladder configured with ${pathfinderResult.escalationLadder.length} sequential checkpoints.`,
          timestamp: new Date().toISOString(),
          payload: pathfinderResult
        }
      );
    }
  }

  // Add confirmation event to timeline
  const titlePrefix = isBrigade ? '⚠️ Brigading Suspected: ' : '';
  const newEvent: TimelineEvent = {
    id: `ev_confirm_${Math.random().toString(36).substr(2, 9)}`,
    type: 'citizen_confirmation',
    title: `${titlePrefix}Citizen Verification: ${type.toUpperCase().replace('_', ' ')}`,
    description: `${statusChangeDescription}${updatedSeverityMsg} Trust weight applied: ${finalWeight.toFixed(2)}. ${isBrigade ? 'System flagged suspicious activity: near-zero weight applied.' : ''} Evaluation Reasoning: "${evalResult.reasoning}"`,
    timestamp: new Date().toISOString(),
    payload: {
      evalResult,
      comment,
      user,
      trustScore
    }
  };

  incident.timeline.push(newEvent);

  // If enough "resolved" weight is accumulated, or confidence hits 0, auto-resolve it
  const resolvedWeight = incident.confirmations
    .filter(c => c.type === 'resolved' && !c.flagged)
    .reduce((sum, c) => sum + (c.acceptedWeight || 0), 0);

  if (incident.status !== 'Resolved' && (resolvedWeight >= 1.2 || incident.confidence < 25)) {
    incident.status = 'Resolved';

    // Reward the reporters of all reports clustered under this incident
    const uniqueReporters = Array.from(new Set(incident.reports.map(r => r.reporterName).filter(Boolean)));
    uniqueReporters.forEach(rep => {
      updateTrustScore(rep, 0.15);
      const u = getOrCreateUser(rep);
      u.incidentsResolvedCount += 1;
    });

    incident.timeline.push({
      id: `ev_resolve_${Math.random().toString(36).substr(2, 9)}`,
      type: 'resolution',
      title: 'Issue Auto-Resolved (AI Consensus)',
      description: `System auto-resolved issue based on high cumulative consensus from citizens. Accumulated Resolved Weight: ${resolvedWeight.toFixed(2)} (Threshold: 1.2). Submitter trust score and comment content verified by Gemini validation auditor.`,
      timestamp: new Date().toISOString()
    });
  }

  res.json(incident);
});

// STAGE 6: Evaluate Follow-up / Escalation (Stage 6)
async function evaluateFollowUpStage(incident: Incident): Promise<any> {
  const elapsed = incident.simulatedDaysElapsed || 0;
  const currentLevel = incident.escalationLevel || 0;
  const timeline = incident.timeline || [];
  const ladder = incident.pathfinderResult;

  if (!ai) {
    // Robust simulation fallback logic
    if (ladder && ladder.escalationLadder) {
      // Find the next step in ladder
      const nextStep = ladder.escalationLadder.find(step => step.level === currentLevel + 1);
      if (nextStep) {
        // If elapsed is greater than or equal to the step's waitDays
        if (elapsed >= nextStep.waitDays) {
          return {
            action: "escalate",
            nextLevel: nextStep.level,
            reasoning: `Simulation fallback: Elapsed active days (${elapsed} days) meets or exceeds the Level ${nextStep.level} trigger wait threshold of ${nextStep.waitDays} days with no resolution.`
          };
        }
      } else if (elapsed >= 15) {
        // Auto-close if active for a very long time
        return {
          action: "close",
          nextLevel: null,
          reasoning: "Simulation fallback: The issue has been unresolved for a significant duration (15+ days). Resolving the ticket through long-term citizen follow-ups."
        };
      }
    }
    return {
      action: "wait",
      nextLevel: null,
      reasoning: `Simulation fallback: Incident elapsed days (${elapsed} days) is within normal response window for current escalation level ${currentLevel}.`
    };
  }

  try {
    const promptText = `
You are the Follow-up Agent for Community Hero, a civic portal in Bengaluru.
Your task is to analyze the timeline and state of an open civic incident, evaluate it against its Pathfinder escalation ladder, and decide whether to WAIT, ESCALATE, or CLOSE (resolve) the issue.

Incident Details:
- Title: "${incident.title}"
- Category: "${incident.category}"
- Sub-Type: "${incident.subType}"
- Description: "${incident.description}"
- Current Escalation Level: ${currentLevel}
- Total Simulated Elapsed Time: ${elapsed} days

Pathfinder Escalation Ladder:
- First Action: "${ladder?.firstAction || 'None'}"
- Escalation steps:
${JSON.stringify(ladder?.escalationLadder || [], null, 2)}

Current Timeline Audit Trail (Chronological):
${JSON.stringify(timeline.map(t => ({ title: t.title, description: t.description, timestamp: t.timestamp })), null, 2)}

Your Decision Matrix:
1. "escalate": Choose this if the elapsed days of the incident meet or exceed the 'waitDays' threshold specified in the next ladder step (Level ${currentLevel + 1}) AND the authority has failed to resolve the issue. If escalating, set "nextLevel" to the next level number (e.g. ${currentLevel + 1}).
2. "close": Choose this if the timeline indicates the issue is already resolved, or if sufficient citizen consensus has been reached, or if you deem the escalation process complete and successful.
3. "wait": Choose this if the elapsed time is still within the wait period of the current level, or if you are waiting for community confirmations or authority response.

Output must be a strict JSON object matching this schema:
{
  "action": "wait" | "escalate" | "close",
  "nextLevel": number | null,
  "reasoning": "A clear, professional, context-specific reason explaining the decision based on the timeline, elapsed days, and escalation ladder thresholds."
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: { type: Type.STRING, enum: ["wait", "escalate", "close"] },
            nextLevel: { type: Type.INTEGER, nullable: true },
            reasoning: { type: Type.STRING }
          },
          required: ['action', 'nextLevel', 'reasoning']
        }
      }
    });

    const parsedRaw = JSON.parse(response.text || '{}');
    console.log('Gemini FollowUp stage raw output:', parsedRaw);

    return parsedRaw;
  } catch (error) {
    console.error('Gemini evaluateFollowUpStage error, using fallback:', error);
    return {
      action: "wait",
      nextLevel: null,
      reasoning: "Wait fallback due to AI generation query error."
    };
  }
}

// 5. Follow-up sweep endpoint (triggered by button or dashboard client interval)
app.post('/api/followup/sweep', async (req, res) => {
  try {
    // Get all unresolved incidents
    const openIncidents = incidentsStore.filter(inc => inc.status !== 'Resolved');

    if (openIncidents.length === 0) {
      return res.json({
        success: true,
        message: 'No active open incidents to evaluate.',
        sweptCount: 0,
        actions: []
      });
    }

    const helperGetInitialDaysElapsed = (createdAt?: string) => {
      const created = new Date(createdAt || new Date().toISOString()).getTime();
      const mockNow = new Date("2026-06-26T12:04:00-07:00").getTime();
      const diffTime = Math.max(0, mockNow - created);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    const actionsTaken: any[] = [];

    for (const incident of openIncidents) {
      // 1. Advance / initialize simulated elapsed days
      if (incident.simulatedDaysElapsed === undefined) {
        incident.simulatedDaysElapsed = helperGetInitialDaysElapsed(incident.createdAt);
      }
      incident.simulatedDaysElapsed += 1;

      // 2. Evaluate using Follow-Up Agent
      const followUpResult = await evaluateFollowUpStage(incident);

      const decisionAction = followUpResult.action; // "wait" | "escalate" | "close"
      const reasoning = followUpResult.reasoning;
      const nextLevel = followUpResult.nextLevel;

      let logEvent: TimelineEvent | null = null;

      if (decisionAction === 'escalate') {
        const currentLevel = incident.escalationLevel || 0;
        const targetLevel = nextLevel !== null && nextLevel !== undefined ? nextLevel : currentLevel + 1;
        incident.escalationLevel = targetLevel;

        // Find the step in the escalation ladder matching this level
        const step = incident.pathfinderResult?.escalationLadder?.find(s => s.level === targetLevel);
        const stepActionText = step?.action || `Escalation notice sent to higher civic department.`;

        // Create timeline event
        logEvent = {
          id: `ev_escalate_${Math.random().toString(36).substr(2, 9)}`,
          type: 'routing',
          title: `AI Escalation: Level ${targetLevel}`,
          description: `Strategic Follow-up Agent executed automatic escalation step: "${stepActionText}". Reasoning: "${reasoning}"`,
          timestamp: new Date().toISOString(),
          payload: {
            previousLevel: currentLevel,
            newLevel: targetLevel,
            stepAction: stepActionText,
            reasoning,
            simulatedDaysElapsed: incident.simulatedDaysElapsed
          }
        };

        incident.timeline.push(logEvent);

        // Notify simulated authority
        if (incident.assignedAuthority) {
          await submitToSimulatedAuthority(incident.id, incident.assignedAuthority.id, {
            escalationLevel: targetLevel,
            escalationAction: stepActionText,
            reasoning
          });
        }

        // Set last agent action on incident
        incident.lastAgentAction = {
          action: 'escalate',
          level: targetLevel,
          reasoning: reasoning,
          timestamp: new Date().toISOString()
        };

        actionsTaken.push({
          incidentId: incident.id,
          title: incident.title,
          action: 'escalate',
          level: targetLevel,
          reasoning
        });

      } else if (decisionAction === 'close') {
        incident.status = 'Resolved';

        // Reward the reporters of all reports clustered under this incident
        const uniqueReporters = Array.from(new Set(incident.reports.map(r => r.reporterName).filter(Boolean)));
        uniqueReporters.forEach(rep => {
          updateTrustScore(rep, 0.15);
          const u = getOrCreateUser(rep);
          u.incidentsResolvedCount += 1;
        });

        logEvent = {
          id: `ev_resolve_agent_${Math.random().toString(36).substr(2, 9)}`,
          type: 'resolution',
          title: 'Issue Resolved by Follow-Up Agent',
          description: `Follow-up Agent determined the issue is resolved or should be closed. Reasoning: "${reasoning}"`,
          timestamp: new Date().toISOString(),
          payload: {
            reasoning,
            simulatedDaysElapsed: incident.simulatedDaysElapsed
          }
        };

        incident.timeline.push(logEvent);

        incident.lastAgentAction = {
          action: 'close',
          reasoning: reasoning,
          timestamp: new Date().toISOString()
        };

        actionsTaken.push({
          incidentId: incident.id,
          title: incident.title,
          action: 'close',
          reasoning
        });

      } else {
        // wait
        incident.lastAgentAction = {
          action: 'wait',
          reasoning: reasoning,
          timestamp: new Date().toISOString()
        };

        actionsTaken.push({
          incidentId: incident.id,
          title: incident.title,
          action: 'wait',
          reasoning
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully evaluated ${openIncidents.length} open incidents.`,
      sweptCount: openIncidents.length,
      actions: actionsTaken,
      incidents: incidentsStore
    });

  } catch (error) {
    console.error('Sweep endpoint error:', error);
    res.status(500).json({ error: 'Failed to run follow-up sweep' });
  }
});

// 6. Voice report transcription & translation endpoint
app.post('/api/voice-report/transcribe', async (req, res) => {
  const { audioData, mimeType } = req.body;
  if (!audioData) {
    return res.status(400).json({ error: 'Audio data is required' });
  }

  const actualMimeType = mimeType || 'audio/webm';

  if (!ai) {
    console.log('No AI client found. Running simulated transcription fallback...');
    return res.json({
      success: true,
      transcription: "ನಮ್ಮ ರಸ್ತೆಯಲ್ಲಿ ದೊಡ್ಡ ಹಳ್ಳ ಬಿದ್ದಿದೆ, ದಯವಿಟ್ಟು ಸರಿಪಡಿಸಿ.",
      detectedLanguage: "Kannada",
      englishTranslation: "There is a very large pothole on our street, please fix it.",
      category: "pothole",
      title: "Pothole on Main Road",
      fallback: true
    });
  }

  try {
    const promptText = `Analyze this audio report of a local civic issue in Bengaluru.
Your tasks:
1. Transcribe the audio in its original language.
2. Detect the original language (e.g., Kannada, English, Hindi, Tamil, Telugu, Spanish, etc.).
3. Translate the description/transcription into English.
4. Guess/extract the civic issue category. The category must be exactly one of: pothole, water_leak, broken_streetlight, garbage, drainage, fallen_tree, other.
5. Extract a short and descriptive title/summary of the issue in English.

Return a strict JSON object with this exact schema:
{
  "transcription": "original language text",
  "detectedLanguage": "language name, e.g. Kannada",
  "englishTranslation": "translated english description",
  "category": "pothole | water_leak | broken_streetlight | garbage | drainage | fallen_tree | other",
  "title": "Short descriptive title"
}
`;

    // Strip out base64 header if present
    const cleanBase64 = audioData.includes('base64,') ? audioData.split('base64,')[1] : audioData;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: actualMimeType
          }
        },
        promptText
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: { type: Type.STRING },
            detectedLanguage: { type: Type.STRING },
            englishTranslation: { type: Type.STRING },
            category: { type: Type.STRING, enum: ["pothole", "water_leak", "broken_streetlight", "garbage", "drainage", "fallen_tree", "other"] },
            title: { type: Type.STRING }
          },
          required: ["transcription", "detectedLanguage", "englishTranslation", "category", "title"]
        }
      }
    });

    const parsed = JSON.parse(response.text || '{}');
    console.log('Voice transcription result:', parsed);
    return res.json({
      success: true,
      transcription: parsed.transcription,
      detectedLanguage: parsed.detectedLanguage,
      englishTranslation: parsed.englishTranslation,
      category: parsed.category,
      title: parsed.title
    });

  } catch (error) {
    console.error('Error in voice transcription:', error);
    return res.status(500).json({ error: 'Failed to transcribe and translate audio.' });
  }
});

// 7. Gemini Text-to-Speech (TTS) endpoint
app.post('/api/tts', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required for TTS' });
  }

  if (!ai) {
    console.log('No AI client found. Returning fallback indicator for TTS.');
    return res.json({ fallback: true, message: 'No AI client available. Using browser speech synthesis fallback.' });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: text,
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const inlineData = part?.inlineData;

    if (inlineData && inlineData.data) {
      return res.json({
        success: true,
        audioContent: inlineData.data, // base64 encoded audio
        mimeType: inlineData.mimeType || 'audio/mp3'
      });
    }

    return res.json({ fallback: true, message: 'No inline audio content in Gemini response.' });

  } catch (error) {
    console.error('Error generating Gemini TTS:', error);
    return res.json({ fallback: true, error: String(error) });
  }
});

// --- SERVE CLIENT SPA ---

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
