import React, { useRef, useState, useEffect, useMemo } from 'react';
import { isValidImageSize, formatFileSize, createImagePreviewUrl, revokeImagePreviewUrl } from '../../utils/imageUtils';
import { CLIENT_MAX_SIZE_MB } from '../../constants/imageLimits';

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
    <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-4 sm:p-6 lg:sticky lg:top-6">
      {/* User Profile */}
      <div className="text-center mb-6 pb-6 border-b border-white/10">
        <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-indigo-500 rounded-3xl mx-auto mb-3 flex items-center justify-center text-white text-3xl font-bold shadow-sm">
          S
        </div>
        <h3 className="font-semibold text-white">Stylist Mode</h3>
        <p className="text-xs text-slate-300">
          Upload a piece and we&apos;ll do the matching.
        </p>
      </div>

      {/* Upload Photo - always visible */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
          Photo
        </p>
        <label className="block text-sm font-medium text-slate-200 mb-2">
          Upload or take a photo
        </label>
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-xl p-4 transition-all text-center cursor-pointer group ${
            isDragging
              ? 'border-teal-400 bg-teal-500/20 scale-[1.02]'
              : 'border-white/20 hover:border-teal-400 hover:bg-white/5'
          }`}
          role="button"
          tabIndex={0}
          aria-label="Upload clothing photo - click or drag and drop"
          onKeyPress={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              fileInputRef.current?.click();
            }
          }}
        >
          {image && imagePreviewUrl ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEnlargeImage(true);
                }}
                className="block w-full rounded-lg overflow-hidden border border-white/20 hover:border-teal-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                aria-label="View full size image"
              >
                <img
                  src={imagePreviewUrl}
                  alt="Uploaded clothing"
                  className="w-full h-32 object-contain bg-slate-800/50"
                />
              </button>
              <p className="text-sm text-slate-200 truncate">{image.name}</p>
              <p className="text-xs text-teal-300">Click thumbnail to enlarge · or drag to change</p>
            </div>
          ) : image ? (
            <div className="space-y-2">
              <div className="text-3xl">📸</div>
              <p className="text-sm text-slate-200 truncate">{image.name}</p>
              <p className="text-xs text-teal-300">Click or drag to change</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className={`text-3xl transition-transform ${
                isDragging ? 'scale-125' : 'group-hover:scale-110'
              }`}>
                {isDragging ? '🎯' : '📤'}
              </div>
              <p className="text-sm text-slate-200 font-medium">
                {isDragging ? 'Drop your photo here!' : 'Drag & Drop or Click'}
              </p>
              <p className="text-xs text-slate-400">
                JPG, PNG, WebP up to {CLIENT_MAX_SIZE_MB}MB
              </p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="File input for clothing photo"
        />
        
        {/* Camera Button - Only show if device has camera */}
        {hasCamera && (
          <div className="mt-3">
            <button
              onClick={openCamera}
              className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-indigo-500 text-white rounded-xl font-medium hover:from-teal-600 hover:to-indigo-600 transition-all shadow-md flex items-center justify-center space-x-2"
              aria-label="Take photo with camera"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>📷 Take Photo with Camera</span>
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

      {/* Wardrobe section - collapsible for logged-in users */}
      {isAuthenticated && (onAddToWardrobe || setUseWardrobeOnly) && (
        <details className="mb-4 group border border-white/10 rounded-xl overflow-hidden" open>
          <summary
            className="flex items-center justify-between px-4 py-3 bg-white/5 cursor-pointer list-none font-medium text-slate-200 hover:bg-white/10 transition-colors [&::-webkit-details-marker]:hidden"
            title={wardrobeHoverTitle}
          >
            <span className="flex items-center gap-2">
              <span>👔</span>
              <span>Wardrobe</span>
            </span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-4 pt-0 space-y-4">
            {onAddToWardrobe && (
              <div>
                <button
                  onClick={onAddToWardrobe}
                  disabled={!image || loading || addingToWardrobe}
                  className={`w-full px-4 py-3 rounded-xl font-medium transition-all shadow-md flex items-center justify-center space-x-2 ${
                    !image || loading || addingToWardrobe
                      ? 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/10'
                      : 'bg-teal-500 text-white hover:bg-teal-600 border border-transparent'
                  }`}
                  aria-label="Add current image to wardrobe"
                  title={!image ? 'Upload an image first' : addingToWardrobe ? 'Adding to wardrobe...' : 'Add this item to your wardrobe'}
                >
                  {addingToWardrobe ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <span>👔</span>
                      <span>Add to Wardrobe</span>
                    </>
                  )}
                </button>
                {!image && (
                  <p className="text-xs text-slate-400 text-center mt-2">
                    Upload an image first to add it to your wardrobe
                  </p>
                )}
                {addingToWardrobe && (
                  <p className="text-xs text-teal-300 text-center mt-2">
                    AI is analyzing your image...
                  </p>
                )}
              </div>
            )}
            {setUseWardrobeOnly && (
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label htmlFor="wardrobe-mode" className="flex items-center cursor-pointer">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-slate-200">Use my wardrobe only</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {useWardrobeOnly
                            ? 'Suggestions only from your wardrobe'
                            : 'AI can suggest any outfit'}
                        </p>
                      </div>
                    </label>
                  </div>
                  <div className="ml-4">
                    <button
                      type="button"
                      id="wardrobe-mode"
                      onClick={() => setUseWardrobeOnly(!useWardrobeOnly)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useWardrobeOnly ? 'bg-teal-500' : 'bg-white/20'
                      }`}
                      role="switch"
                      aria-checked={useWardrobeOnly}
                      aria-label="Use wardrobe only mode"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useWardrobeOnly ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </details>
      )}

      {/* Preferences - collapsible, default closed to reduce clutter */}
      <details className="mb-4 group border border-white/10 rounded-xl overflow-hidden">
        <summary
          className="flex items-center justify-between px-4 py-3 bg-white/5 cursor-pointer list-none font-medium text-slate-200 hover:bg-white/10 transition-colors [&::-webkit-details-marker]:hidden"
          title={preferencesHoverTitle}
        >
          <span className="flex items-center gap-2">
            <span>⚙️</span>
            <span>Preferences</span>
          </span>
          <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
        </summary>
        <div className="p-4 pt-0 space-y-4">
          {/* Occasion */}
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
          {/* Free-text preference */}
          <div>
            <div className="flex items-center mb-2">
              <span className="text-xs uppercase tracking-wide text-slate-400">Or describe</span>
              <span className="mx-2 text-slate-500">•</span>
              <span className="text-xs text-slate-400">Only one required</span>
            </div>
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
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="ai-prompt-response-toggle" className="flex items-center cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-slate-200">Show AI Prompt & Response</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Toggle the panel that shows full AI input and output.
                      </p>
                    </div>
                  </label>
                </div>
                <div className="ml-4">
                  <button
                    type="button"
                    id="ai-prompt-response-toggle"
                    onClick={() => setShowAiPromptResponse(!showAiPromptResponse)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      showAiPromptResponse ? 'bg-teal-500' : 'bg-white/20'
                    }`}
                    role="switch"
                    aria-checked={showAiPromptResponse}
                    aria-label="Toggle AI prompt and response visibility"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        showAiPromptResponse ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </details>

      {/* Display options - collapsible, only when model generation enabled */}
      {modelGenerationEnabled && (
        <details className="mb-4 group border border-white/10 rounded-xl overflow-hidden">
          <summary className="flex items-center justify-between px-4 py-3 bg-white/5 cursor-pointer list-none font-medium text-slate-200 hover:bg-white/10 transition-colors [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <span>🤖</span>
              <span>Display options</span>
            </span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-4 pt-0">
            <div className="p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="generate-model" className="flex items-center cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-slate-200">Generate Model Image</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        AI image of a model wearing your outfit. {generateModelImage ? '📍 Location-based.' : 'Enable to see on model.'}
                      </p>
                    </div>
                  </label>
                </div>
                <div className="ml-4">
                  <button
                    type="button"
                    id="generate-model"
                    onClick={() => setGenerateModelImage(!generateModelImage)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      generateModelImage ? 'bg-indigo-500' : 'bg-white/20'
                    }`}
                    role="switch"
                    aria-checked={generateModelImage}
                    aria-label="Toggle model image generation"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        generateModelImage ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              {generateModelImage && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <label className="block text-sm font-medium text-slate-200 mb-2">Image model</label>
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    aria-label="Select image generation model"
                  >
                    <option value="dalle3">DALL-E 3 (OpenAI)</option>
                    <option value="stable-diffusion">Stable Diffusion</option>
                    <option value="nano-banana">Nano Banana</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </details>
      )}

      {/* Random picks - not AI; in Wardrobe section or separate area */}
      {(isAuthenticated && (onGetRandomSuggestion || onGetRandomFromHistory)) && (
        <details className="mb-4 group border border-white/10 rounded-xl overflow-hidden">
          <summary
            className="flex items-center justify-between px-4 py-3 bg-white/5 cursor-pointer list-none font-medium text-slate-200 hover:bg-white/10 transition-colors [&::-webkit-details-marker]:hidden"
            title={randomPicksHoverTitle}
          >
            <span className="flex items-center gap-2">
              <span>🎲</span>
              <span>Random picks</span>
            </span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="p-4 pt-0 space-y-2">
            {onGetRandomSuggestion && (
              <button
                onClick={onGetRandomSuggestion}
                disabled={loading}
                className={`w-full min-h-[48px] py-3 px-4 rounded-xl font-medium transition-all text-sm touch-manipulation ${
                  loading
                    ? 'bg-white/10 cursor-not-allowed text-slate-500 border border-white/10'
                    : 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-400/30'
                }`}
                aria-label="Get random outfit from wardrobe"
              >
                🎲 Random from Wardrobe
              </button>
            )}
            {onGetRandomFromHistory && (
              <button
                onClick={onGetRandomFromHistory}
                disabled={loading}
                className={`w-full min-h-[48px] py-3 px-4 rounded-xl font-medium transition-all text-sm touch-manipulation ${
                  loading
                    ? 'bg-white/10 cursor-not-allowed text-slate-500 border border-white/10'
                    : 'bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 border border-indigo-400/30'
                }`}
                aria-label="Show random outfit from your history"
              >
                📋 Random from History
              </button>
            )}
          </div>
        </details>
      )}

      {/* AI Suggestion - primary action */}
      <div className="border-t border-white/10 pt-4 mt-2">
        <button
          onClick={onGetSuggestion}
          disabled={!image || loading}
          className={`w-full min-h-[48px] py-3 px-4 rounded-xl font-semibold text-white transition-all touch-manipulation ${
            !image || loading
              ? 'bg-white/10 cursor-not-allowed text-slate-500 border border-white/10'
              : 'bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-600 hover:to-indigo-600 shadow-lg hover:shadow-xl'
          }`}
          aria-label="Get AI outfit suggestion"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating...
            </span>
          ) : (
            '✨ Get AI Suggestion'
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

