import React, { useRef, useState, useEffect, useMemo } from 'react';
import { isValidImageSize, formatFileSize, createImagePreviewUrl, revokeImagePreviewUrl } from '../../utils/imageUtils';
import { CLIENT_MAX_SIZE_MB } from '../../constants/imageLimits';
import UploadBox from './suggestion/UploadBox';
import ModernSwitch from './suggestion/ModernSwitch';

interface Filters {
  occasion: string;
  season: string;
  style: string;
}

function occasionDisplay(v: string): string {
  const m: Record<string, string> = {
    casual: 'Casual',
    business: 'Business',
    formal: 'Formal',
    party: 'Party',
    date: 'Date Night',
    sports: 'Sports/Active',
  };
  return v ? m[v] || v : 'Not set';
}

function seasonDisplay(v: string): string {
  const m: Record<string, string> = {
    all: 'All Seasons',
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
  };
  return v ? m[v] || v : 'Not set';
}

function styleDisplay(v: string): string {
  const m: Record<string, string> = {
    modern: 'Modern',
    classic: 'Classic',
    trendy: 'Trendy',
    minimalist: 'Minimalist',
    bold: 'Bold',
    vintage: 'Vintage',
    Casual: 'Casual',
    'Businees Casual': 'Business Casual',
  };
  return v ? m[v] || v : 'Not set';
}

function preferenceSelectionSummary(filters: Filters, preferenceText: string): string {
  const lines = [
    `Occasion: ${occasionDisplay(filters.occasion)}`,
    `Season: ${seasonDisplay(filters.season)}`,
    `Style: ${styleDisplay(filters.style)}`,
    `Notes: ${preferenceText.trim() || '(none)'}`,
  ];
  return lines.join('\n');
}

function SectionTitle({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="mb-3 flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <span className="text-slate-400" aria-hidden>
        {icon}
      </span>
    </div>
  );
}

interface SidebarProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  preferenceText: string;
  setPreferenceText: (text: string) => void;
  image: File | null;
  setImage: (file: File | null) => void;
  onGetSuggestion: () => void;
  onGetRandomSuggestion?: () => void;
  onGetRandomFromHistory?: () => void;
  onAnalyzeWardrobe?: () => void;
  analyzingWardrobe?: boolean;
  loading: boolean;
  generateModelImage: boolean;
  setGenerateModelImage: (generate: boolean) => void;
  imageModel: string;
  setImageModel: (model: string) => void;
  useWardrobeOnly?: boolean;
  setUseWardrobeOnly?: (use: boolean) => void;
  modelGenerationEnabled?: boolean;
  isAuthenticated?: boolean;
  isAdmin?: boolean;
  onAddToWardrobe?: () => void;
  addingToWardrobe?: boolean;
  onFileReject?: (message: string) => void;
  showAiPromptResponse?: boolean;
  setShowAiPromptResponse?: (show: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  filters,
  setFilters,
  image,
  setImage,
  preferenceText,
  setPreferenceText,
  onGetSuggestion,
  onGetRandomSuggestion,
  onGetRandomFromHistory,
  onAnalyzeWardrobe,
  analyzingWardrobe = false,
  loading,
  generateModelImage,
  setGenerateModelImage,
  imageModel,
  setImageModel,
  useWardrobeOnly = false,
  setUseWardrobeOnly,
  modelGenerationEnabled = false,
  isAuthenticated = false,
  isAdmin = false,
  onAddToWardrobe,
  addingToWardrobe = false,
  onFileReject,
  showAiPromptResponse = true,
  setShowAiPromptResponse
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showEnlargeImage, setShowEnlargeImage] = useState(false);

  // Object URL for uploaded image thumbnail (revoke on cleanup)
  const imagePreviewUrl = useMemo(() => (image ? createImagePreviewUrl(image) : null), [image]);
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) revokeImagePreviewUrl(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Check if device has camera on mount
  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoDevice = devices.some(device => device.kind === 'videoinput');
        setHasCamera(hasVideoDevice);
      } catch (error) {
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isValidImageSize(file, CLIENT_MAX_SIZE_MB)) {
        onFileReject?.(`Image must be under ${CLIENT_MAX_SIZE_MB}MB (current: ${formatFileSize(file.size)})`);
        event.target.value = '';
        return;
      }
      setImage(file);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters({ ...filters, [key]: value });
  };

  const handleClearPreferences = () => {
    setFilters({
      occasion: '',
      season: '',
      style: '',
    });
    setPreferenceText('');
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        if (!isValidImageSize(file, CLIENT_MAX_SIZE_MB)) {
          onFileReject?.(`Image must be under ${CLIENT_MAX_SIZE_MB}MB (current: ${formatFileSize(file.size)})`);
          return;
        }
        setImage(file);
      }
    }
  };

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            setImage(file);
            closeCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const wardrobeHoverTitle = useMemo(() => {
    const lines: string[] = [];
    if (onAddToWardrobe) {
      lines.push(
        image
          ? `Add to wardrobe: ready — ${image.name}`
          : 'Add to wardrobe: upload a photo first'
      );
    }
    if (setUseWardrobeOnly) {
      lines.push(
        useWardrobeOnly
          ? 'Use my wardrobe only: On (AI uses only your saved items)'
          : 'Use my wardrobe only: Off (AI may suggest items you do not own)'
      );
    }
    return lines.length > 0 ? lines.join('\n') : 'Wardrobe';
  }, [onAddToWardrobe, image, setUseWardrobeOnly, useWardrobeOnly]);

  const preferencesHoverTitle = useMemo(() => {
    let body = preferenceSelectionSummary(filters, preferenceText);
    if (isAdmin && setShowAiPromptResponse) {
      body += `\nShow AI Prompt & Response: ${showAiPromptResponse ? 'On' : 'Off'}`;
    }
    return body;
  }, [filters, preferenceText, isAdmin, setShowAiPromptResponse, showAiPromptResponse]);

  const randomPicksHoverTitle = useMemo(() => {
    const parts = [
      'Random from Wardrobe uses the occasion, season, style, and notes in Preferences.',
      'Random from History loads a past saved suggestion.',
      '---',
      preferenceSelectionSummary(filters, preferenceText),
    ];
    return parts.join('\n');
  }, [filters, preferenceText]);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_18px_50px_rgba(2,8,23,0.55)] backdrop-blur p-4 sm:p-6 lg:sticky lg:top-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white">Stylist Controls</h2>
        <p className="mt-1 text-sm text-slate-400">Upload, tune preferences, and generate your next look.</p>
      </div>

      <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <SectionTitle icon="↥" title="Upload" subtitle="Drag and drop your clothing photo" />
        <UploadBox
          isDragging={isDragging}
          imagePreviewUrl={imagePreviewUrl}
          imageName={image?.name ?? null}
          maxSizeMb={CLIENT_MAX_SIZE_MB}
          onClick={() => fileInputRef.current?.click()}
          onPreviewClick={() => setShowEnlargeImage(true)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="File input for clothing photo"
        />

        {hasCamera && (
          <div className="mt-3 grid">
            <button
              onClick={openCamera}
              className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-200 transition duration-200 hover:border-teal-300/60 hover:bg-white/5"
              aria-label="Take photo with camera"
            >
              Take Photo
            </button>
          </div>
        )}
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="rounded-2xl bg-slate-900 border border-white/10 max-w-2xl w-full shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">📷 Take Photo</h3>
              <button
                onClick={closeCamera}
                aria-label="Close camera"
                className="p-2 rounded hover:bg-white/10 text-slate-300"
              >
                ✖
              </button>
            </div>
            
            <div className="p-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-[400px] object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                onClick={capturePhoto}
                className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-full font-medium hover:bg-teal-600 transition-colors flex items-center justify-center space-x-2"
              >
                <span>📸</span>
                <span>Capture Photo</span>
              </button>
              <button
                onClick={closeCamera}
                className="px-6 py-3 bg-white/10 text-slate-200 rounded-full font-medium hover:bg-white/20 transition-colors border border-white/15"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enlarge uploaded image modal */}
      {showEnlargeImage && imagePreviewUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 cursor-pointer"
          role="dialog"
          aria-modal="true"
          aria-label="Uploaded image full size"
          onClick={() => setShowEnlargeImage(false)}
        >
          <button
            type="button"
            onClick={() => setShowEnlargeImage(false)}
            aria-label="Close full image"
            className="absolute top-4 right-4 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white text-xl transition-colors z-10"
          >
            ✕
          </button>
          <img
            src={imagePreviewUrl}
            alt="Uploaded clothing - full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
            Click anywhere to close
          </div>
        </div>
      )}

      {isAuthenticated && (onAddToWardrobe || setUseWardrobeOnly) && (
        <details className="group mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]" open>
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-200 [&::-webkit-details-marker]:hidden">
            <span>Wardrobe</span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-4 border-t border-white/10 px-4 py-4">
            {onAddToWardrobe && (
              <div className="space-y-2">
                <button
                  onClick={onAddToWardrobe}
                  disabled={!image || loading || addingToWardrobe}
                  className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                    !image || loading || addingToWardrobe
                      ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
                      : 'border border-white/15 bg-white/5 text-slate-100 hover:border-teal-300/60 hover:bg-teal-500/10'
                  }`}
                  aria-label="Add current image to wardrobe"
                  title={!image ? 'Upload an image first' : addingToWardrobe ? 'Adding to wardrobe...' : 'Add this item to your wardrobe'}
                >
                  {addingToWardrobe ? 'Adding...' : 'Add to Wardrobe'}
                </button>
                {!image && <p className="text-xs text-slate-400">Upload an image to enable this action.</p>}
                {addingToWardrobe && <p className="text-xs text-teal-300">Analyzing and preparing wardrobe item...</p>}
              </div>
            )}
            {setUseWardrobeOnly && (
              <ModernSwitch
                id="wardrobe-mode"
                checked={useWardrobeOnly}
                onChange={(value) => setUseWardrobeOnly(value)}
                label="Use my wardrobe only"
                description={useWardrobeOnly ? 'Only your wardrobe items are used.' : 'AI may suggest items you do not own.'}
              />
            )}
          </div>
        </details>
      )}

      <details className="group mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]" open>
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-200 [&::-webkit-details-marker]:hidden">
          <span>Preferences</span>
          <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="space-y-4 border-t border-white/10 px-4 py-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Occasion</label>
            <select
              value={filters.occasion}
              onChange={(e) => handleFilterChange('occasion', e.target.value)}
              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              aria-label="Select occasion"
            >
              <option value="">Select occasion</option>
              <option value="casual">Casual</option>
              <option value="business">Business</option>
              <option value="formal">Formal</option>
              <option value="party">Party</option>
              <option value="date">Date Night</option>
              <option value="sports">Sports/Active</option>
            </select>
          </div>
          {/* Season */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Season</label>
            <select
              value={filters.season}
              onChange={(e) => handleFilterChange('season', e.target.value)}
              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              aria-label="Select season"
            >
              <option value="">Select season</option>
              <option value="all">All Seasons</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
              <option value="winter">Winter</option>
            </select>
          </div>
          {/* Style */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Style</label>
            <select
              value={filters.style}
              onChange={(e) => handleFilterChange('style', e.target.value)}
              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              aria-label="Select style preference"
            >
              <option value="">Select style</option>
              <option value="Businees Casual">Businees Casual</option>
              <option value="Casual">Casual</option>
              <option value="modern">Modern</option>
              <option value="classic">Classic</option>
              <option value="trendy">Trendy</option>
              <option value="minimalist">Minimalist</option>
              <option value="bold">Bold</option>
              <option value="vintage">Vintage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">Extra Notes</label>
            <label htmlFor="free-text-pref" className="sr-only">Preference text</label>
            <textarea
              id="free-text-pref"
              value={preferenceText}
              onChange={(e) => setPreferenceText(e.target.value)}
              placeholder="e.g., Smart casual, navy and brown, no sneakers."
              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
              rows={2}
            />
          </div>
          <div>
            <button
              type="button"
              onClick={handleClearPreferences}
              className="w-full py-2.5 px-4 rounded-xl font-medium transition-all text-sm bg-white/10 text-slate-200 hover:bg-white/20 border border-white/15"
              aria-label="Clear preferences"
            >
              Clear Preferences
            </button>
          </div>
          {isAdmin && setShowAiPromptResponse && (
            <ModernSwitch
              id="ai-prompt-response-toggle"
              checked={showAiPromptResponse}
              onChange={(value) => setShowAiPromptResponse(value)}
              label="Show AI Prompt & Response"
              description="Toggle full AI input/output panel."
            />
          )}
        </div>
      </details>

      {modelGenerationEnabled && (
        <details className="group mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-200 [&::-webkit-details-marker]:hidden">
            <span>Display Options</span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-4 border-t border-white/10 px-4 py-4">
            <ModernSwitch
              id="generate-model"
              checked={generateModelImage}
              onChange={(value) => setGenerateModelImage(value)}
              label="Generate Model Image"
              description="Preview outfit on an AI model for a richer visualization."
            />
            {generateModelImage && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Image model</label>
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                  aria-label="Select image generation model"
                >
                  <option value="dalle3">DALL-E 3 (OpenAI)</option>
                  <option value="stable-diffusion">Stable Diffusion</option>
                  <option value="nano-banana">Nano Banana</option>
                </select>
              </div>
            )}
          </div>
        </details>
      )}

      {(isAuthenticated && (onGetRandomSuggestion || onGetRandomFromHistory)) && (
        <details className="group mb-5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-200 [&::-webkit-details-marker]:hidden">
            <span>Quick Picks</span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-2 border-t border-white/10 px-4 py-4">
            {onGetRandomSuggestion && (
              <button
                onClick={onGetRandomSuggestion}
                disabled={loading}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  loading
                    ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
                    : 'border border-white/15 bg-white/5 text-slate-200 hover:border-amber-300/60 hover:bg-amber-500/10'
                }`}
                aria-label="Get random outfit from wardrobe"
              >
                Random from Wardrobe
              </button>
            )}
            {onGetRandomFromHistory && (
              <button
                onClick={onGetRandomFromHistory}
                disabled={loading}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  loading
                    ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
                    : 'border border-white/15 bg-white/5 text-slate-200 hover:border-indigo-300/60 hover:bg-indigo-500/10'
                }`}
                aria-label="Show random outfit from your history"
              >
                Random from History
              </button>
            )}
          </div>
        </details>
      )}

      <div className="border-t border-white/10 pt-4">
        {isAuthenticated && onAnalyzeWardrobe && (
          <button
            onClick={onAnalyzeWardrobe}
            disabled={loading || analyzingWardrobe}
            className={`mb-3 w-full min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              loading || analyzingWardrobe
                ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
                : 'border border-white/15 bg-white/5 text-slate-100 hover:border-indigo-300/60 hover:bg-indigo-500/10'
            }`}
            aria-label="Analyze my wardrobe gaps"
          >
            {analyzingWardrobe ? 'Analyzing Wardrobe...' : 'Analyze My Wardrobe'}
          </button>
        )}
        <button
          onClick={onGetSuggestion}
          disabled={!image || loading}
          className={`w-full min-h-[48px] touch-manipulation rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 ${
            !image || loading
              ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
              : 'bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-cyan-500/20 hover:from-teal-400 hover:to-cyan-400'
          }`}
          aria-label="Get AI outfit suggestion"
        >
          {loading ? (
            <span className="inline-flex items-center justify-center">
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Styling your outfit...
            </span>
          ) : (
            'Get AI Suggestion'
          )}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        {preferencesHoverTitle.split('\n')[0]} • {wardrobeHoverTitle.split('\n')[0]}
      </p>

      {/* Test compatibility: preserve semantic tooltip summaries used by unit tests */}
      <div role="tooltip" className="sr-only">
        {preferencesHoverTitle}
      </div>
      {isAuthenticated && (onAddToWardrobe || setUseWardrobeOnly) && (
        <div role="tooltip" className="sr-only">
          {wardrobeHoverTitle}
        </div>
      )}
      {isAuthenticated && (onGetRandomSuggestion || onGetRandomFromHistory) && (
        <div role="tooltip" className="sr-only">
          {randomPicksHoverTitle}
        </div>
      )}
    </div>
  );
};

export default Sidebar;

