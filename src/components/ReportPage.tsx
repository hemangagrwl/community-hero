/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Sparkles, Loader2, Upload, AlertCircle, CheckCircle, Mic, MicOff, Volume2, Globe, Languages, Square, Play, RefreshCw } from 'lucide-react';
import { Incident } from '../types';

interface ReportPageProps {
  onReportSubmitted: (incident: Incident) => void;
  setActiveTab: (tab: string) => void;
  setSelectedIncidentId: (id: string | null) => void;
  activeUserName?: string;
}

// Pre-packaged high-quality Unsplash images representing civic issues to make testing instant
const PRESET_TEST_IMAGES = [
  {
    name: 'Bengaluru Asphalt Pothole',
    url: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&w=600&q=80',
    description: 'A deep pothole on an urban road filled with water'
  },
  {
    name: 'Drinking Water Pipeline Leak',
    url: 'https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&w=600&q=80',
    description: 'Clean water gushing from an underground municipal pipe burst'
  },
  {
    name: 'Fallen Tree Branch',
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
    description: 'A heavy tree branch blocking the entire street lane'
  },
  {
    name: 'Uncollected Garbage Pile',
    url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=600&q=80',
    description: 'Trash accumulated on a main road pedestrian walkway'
  }
];

export default function ReportPage({ onReportSubmitted, setActiveTab, setSelectedIncidentId, activeUserName }: ReportPageProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoMime, setPhotoMime] = useState<string>('image/jpeg');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState(activeUserName || '');
  const [lat, setLat] = useState<number>(12.9716); // Default Bengaluru
  const [lng, setLng] = useState<number>(77.5946);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Voice recording and accessibility state
  const [originalLanguage, setOriginalLanguage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceAnalysis, setVoiceAnalysis] = useState<{
    transcription: string;
    detectedLanguage: string;
    englishTranslation: string;
    category: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    if (activeUserName) {
      setReporterName(activeUserName);
    }
  }, [activeUserName]);

  const startRecording = async () => {
    setErrorMessage(null);
    setVoiceAnalysis(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all audio tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Failed to access microphone:', err);
      setErrorMessage('Failed to access microphone. Please ensure microphone permissions are granted in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsTranscribing(true);
    setErrorMessage(null);
    try {
      // Convert Blob to Base64
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          
          const res = await fetch('/api/voice-report/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64Data,
              mimeType: blob.type
            })
          });

          if (!res.ok) {
            throw new Error('Server failed to transcribe audio');
          }

          const data = await res.json();
          if (data.success) {
            setVoiceAnalysis(data);
            setDescription(data.englishTranslation);
            setOriginalLanguage(data.detectedLanguage);
          } else {
            throw new Error(data.error || 'Failed to analyze voice report');
          }
        } catch (innerErr: any) {
          console.error('Error in reader onload:', innerErr);
          setErrorMessage(innerErr.message || 'An error occurred while communicating with the transcription service.');
        } finally {
          setIsTranscribing(false);
        }
      };
    } catch (err: any) {
      console.error('Error analyzing audio:', err);
      setErrorMessage('Failed to process and translate voice report. Please try typing or try recording again.');
      setIsTranscribing(false);
    }
  };

  // Auto capture location on mount
  useEffect(() => {
    captureLocation();
  }, []);

  const captureLocation = () => {
    setIsCapturingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
          setIsCapturingLocation(false);
        },
        (error) => {
          console.warn('Geolocation failed, falling back to central Bengaluru.', error);
          // Add some jitter so they are not exactly stacked
          setLat(12.9716 + (Math.random() - 0.5) * 0.04);
          setLng(77.5946 + (Math.random() - 0.5) * 0.04);
          setIsCapturingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsCapturingLocation(false);
    }
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload a valid image file.');
      return;
    }
    setPhotoMime(file.type);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const selectPresetImage = async (presetUrl: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // Fetch the preset image and convert it to base64 so it can be sent to Gemini server-side
      const response = await fetch(presetUrl);
      const blob = await response.blob();
      setPhotoMime(blob.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
        setIsSubmitting(false);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error('Error loading preset image:', err);
      setPhoto(presetUrl); // fallback URL
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photo) {
      setErrorMessage('A photo is strictly required so the AI pipeline can classify and evaluate the issue.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoData: photo,
          photoMimeType: photoMime,
          description,
          lat,
          lng,
          reporterName: reporterName.trim() || 'Civic Citizen',
          originalLanguage: originalLanguage || undefined
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run AI intake pipeline. Please try again.');
      }

      const createdIncident: Incident = await response.json();
      onReportSubmitted(createdIncident);

      // Redirect immediately to detailed incident page
      setSelectedIncidentId(createdIncident.id);
      setActiveTab('map');
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during report submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider border border-indigo-100">
          AI-Powered Intake Portal
        </span>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-3">Report Local Civic Issue</h2>
        <p className="text-slate-500 mt-2 max-w-lg mx-auto">
          Upload a photo of any issue. Our dual-stage Gemini pipeline will classify the category, evaluate safety risks, and auto-route it to simulated municipal authorities.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        {/* Error Notification */}
        {errorMessage && (
          <div className="flex items-start space-x-2 bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Photo Upload Area - Required */}
        <div>
          <label className="block text-sm font-bold text-slate-800 mb-2">
            Upload Issue Photo <span className="text-red-500">*</span>
          </label>

          {!photo ? (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="bg-white p-3 rounded-full shadow-xs border border-slate-100 mb-4 text-slate-400">
                <Camera className="w-8 h-8" />
              </div>
              <p className="text-sm text-slate-700 font-medium">
                Drag and drop your photo here, or{' '}
                <label className="text-indigo-600 hover:text-indigo-700 cursor-pointer font-bold underline">
                  browse files
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              </p>
              <p className="text-xs text-slate-400 mt-1.5">Supports PNG, JPG, JPEG up to 5MB</p>

              {/* Instant preset simulation options */}
              <div className="mt-6 pt-5 border-t border-slate-200/80 w-full text-center">
                <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
                  ⚡ Don't have a photo? Select a test preset:
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
                  {PRESET_TEST_IMAGES.map((img) => (
                    <button
                      key={img.name}
                      type="button"
                      onClick={() => selectPresetImage(img.url)}
                      className="px-3 py-1.5 text-xxs font-semibold bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-slate-700 hover:text-indigo-700 transition shadow-2xs"
                    >
                      {img.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative border border-slate-200 rounded-xl overflow-hidden group bg-black">
              <img
                src={photo}
                alt="Civic report attachment preview"
                className="max-h-72 w-full object-contain mx-auto"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="bg-white/95 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-semibold shadow transition"
                >
                  Remove Photo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Reporter Info & Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              Reporter Name (Optional)
            </label>
            <input
              type="text"
              id="reporter-name-input"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="e.g. Ramesh K."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-800 mb-1.5">
              AI Categorization Notice
            </label>
            <div className="flex items-center space-x-2 bg-indigo-50/60 border border-indigo-100 p-2.5 rounded-xl text-xs text-indigo-800">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Leave category empty! Our AI agent will read the photo to infer categorization.</span>
            </div>
          </div>
        </div>

        {/* Text Description */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <label className="block text-sm font-bold text-slate-800">
              Describe the Problem
            </label>
            <span className="text-[10px] text-slate-400 font-medium">
              Type or record your report in Kannada, Hindi, English, etc.
            </span>
          </div>
          
          <textarea
            id="description-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the issue, landmarks, hazard level, or anything that helps dispatch crews..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm placeholder-slate-400"
          />

          {/* Voice Reporting Accessible Alternative */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Mic className={`w-4 h-4 text-indigo-600 ${isRecording ? 'animate-pulse' : ''}`} />
                <span>Accessible Voice Reporting (Any Language)</span>
              </h4>
              <p className="text-[11px] text-slate-500 max-w-md leading-relaxed">
                Record your complaint verbally in any language (Kannada, Hindi, etc.). Gemini will transcribe, translate, and guess the category.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 active:scale-95 transition-all shadow-xs"
                >
                  <Square className="w-3.5 h-3.5 fill-current animate-pulse" />
                  <span className="animate-pulse">Stop Recording</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={isTranscribing}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 active:scale-95 transition-all shadow-xs"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Start Recording</span>
                </button>
              )}
            </div>
          </div>

          {/* Voice Processing Status */}
          {isTranscribing && (
            <div className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-xl flex items-center space-x-3 text-xs text-indigo-800 animate-pulse">
              <Loader2 className="w-4.5 h-4.5 animate-spin text-indigo-600 shrink-0" />
              <span>Gemini is transcribing, detecting language, translating to English, and extracting report parameters...</span>
            </div>
          )}

          {/* Voice Transcription Results Panel */}
          {voiceAnalysis && (
            <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl space-y-3 text-xs text-slate-700 animate-fade-in">
              <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                <span className="font-bold text-emerald-800 flex items-center space-x-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>AI Voice Synthesis Complete!</span>
                </span>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider flex items-center space-x-1">
                  <Globe className="w-3 h-3" />
                  <span>Detected: {voiceAnalysis.detectedLanguage}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Original Voice Transcription</div>
                  <p className="italic text-slate-800 bg-white border border-slate-100 p-2.5 rounded-lg leading-relaxed">
                    "{voiceAnalysis.transcription}"
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">English Translation (Copied above)</div>
                  <p className="text-slate-800 bg-white border border-slate-100 p-2.5 rounded-lg leading-relaxed font-semibold">
                    "{voiceAnalysis.englishTranslation}"
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 pt-1 text-[11px] font-medium text-slate-500">
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-slate-700">Guessed Category:</span>
                  <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded uppercase text-[10px] font-bold">
                    {voiceAnalysis.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-slate-700">Suggested Title:</span>
                  <span className="text-slate-800 italic">
                    {voiceAnalysis.title}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Location Section */}
        <div className="border border-slate-200 p-4 rounded-xl bg-slate-50/50">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
              <MapPin className="w-4.5 h-4.5 text-indigo-600" />
              <span>Report Geolocation</span>
            </span>
            <button
              type="button"
              onClick={captureLocation}
              disabled={isCapturingLocation}
              className="text-xs bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg text-slate-600 flex items-center space-x-1"
            >
              {isCapturingLocation ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                  <span>Pinpointing GPS...</span>
                </>
              ) : (
                <span>Recapture My Location</span>
              )}
            </button>
          </div>

          {/* Location values shown clearly */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-500 mb-4 bg-white p-3 border border-slate-200 rounded-lg">
            <div>Latitude: <span className="font-semibold text-slate-800">{lat.toFixed(6)}</span></div>
            <div>Longitude: <span className="font-semibold text-slate-800">{lng.toFixed(6)}</span></div>
          </div>

          {/* Simulated Mini-Map for choosing coordinates */}
          <div className="relative h-44 bg-slate-100 border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1.5px,transparent_1.5px)] [background-size:16px_16px] bg-slate-50 flex items-center justify-center">
              {/* Fake Bengaluru Grid Layout */}
              <div className="absolute text-xxs text-slate-400 font-mono top-4 left-4">INDIRANAGAR WARD-80</div>
              <div className="absolute text-xxs text-slate-400 font-mono bottom-4 right-4">KORAMANGALA SECTOR-4</div>
              <div className="absolute text-xxs text-slate-400 font-mono top-12 right-12">HAL STAGE 2</div>

              {/* Click instruction */}
              <div className="absolute inset-x-0 bottom-2 text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                📍 Coordinates auto-captured. Click anywhere to shift report pin.
              </div>

              {/* Grid line overlay to feel like a high-tech civic canvas */}
              <div className="absolute w-full h-px bg-slate-200/50 top-1/2"></div>
              <div className="absolute h-full w-px bg-slate-200/50 left-1/2"></div>

              {/* Pinned Marker */}
              <div className="absolute transform -translate-x-1/2 -translate-y-full flex flex-col items-center animate-bounce" style={{ top: '50%', left: '50%' }}>
                <div className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap mb-0.5 shadow-xs border border-indigo-500">
                  REPORT LOCATION
                </div>
                <div className="w-5 h-5 bg-indigo-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Click to adjust handler */}
            <div
              className="absolute inset-0 cursor-crosshair"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                // Jitter lat and lng around central Bengaluru based on click relative offset
                const dx = (x / rect.width - 0.5) * 0.05;
                const dy = (0.5 - y / rect.height) * 0.05;
                setLat(12.9716 + dy);
                setLng(77.5946 + dx);
              }}
            ></div>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting || !photo}
          className={`w-full py-3.5 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center space-x-2 transition-all ${
            !photo
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md cursor-pointer'
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Executing Multi-Stage AI Pipeline...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              <span>Submit Report to AI Pipeline</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
