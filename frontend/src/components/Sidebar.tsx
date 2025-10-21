import React, { useRef, useState, useEffect } from 'react';

interface Filters {
  occasion: string;
  season: string;
  style: string;
}

interface SidebarProps {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  preferenceText: string;
  setPreferenceText: (text: string) => void;
  image: File | null;
  setImage: (file: File | null) => void;
  onGetSuggestion: () => void;
  loading: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  filters,
  setFilters,
  image,
  setImage,
  preferenceText,
  setPreferenceText,
  onGetSuggestion,
  loading
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

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
      setImage(file);
    }
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters({ ...filters, [key]: value });
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

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-6">
      {/* User Profile */}
      <div className="text-center mb-6 pb-6 border-b border-gray-200">
        <div className="w-20 h-20 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full mx-auto mb-3 flex items-center justify-center text-white text-3xl font-bold">
          S
        </div>
        <h3 className="font-semibold text-gray-800">Stylist Mode</h3>
        <p className="text-sm text-gray-500">Personalized for you</p>
      </div>

      {/* Upload Photo */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Clothing Photo
        </label>
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`w-full border-2 border-dashed rounded-lg p-4 transition-all text-center cursor-pointer group ${
            isDragging
              ? 'border-teal-500 bg-teal-100 scale-105'
              : 'border-teal-300 hover:border-teal-500 hover:bg-teal-50'
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
          {image ? (
            <div className="space-y-2">
              <div className="text-3xl">📸</div>
              <p className="text-sm text-gray-600 truncate">{image.name}</p>
              <p className="text-xs text-teal-600">Click or drag to change</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className={`text-3xl transition-transform ${
                isDragging ? 'scale-125' : 'group-hover:scale-110'
              }`}>
                {isDragging ? '🎯' : '📤'}
              </div>
              <p className="text-sm text-gray-600 font-medium">
                {isDragging ? 'Drop your photo here!' : 'Drag & Drop or Click'}
              </p>
              <p className="text-xs text-gray-400">JPG, PNG up to 10MB</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="File input for clothing photo"
        />
        
        {/* Camera Button - Only show if device has camera */}
        {hasCamera && (
          <div className="mt-3">
            <button
              onClick={openCamera}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center justify-center space-x-2"
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
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">📷 Take Photo</h3>
              <button
                onClick={closeCamera}
                aria-label="Close camera"
                className="p-2 rounded hover:bg-gray-100 text-gray-600"
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

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={capturePhoto}
                className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-lg font-medium hover:bg-teal-600 transition-colors flex items-center justify-center space-x-2"
              >
                <span>📸</span>
                <span>Capture Photo</span>
              </button>
              <button
                onClick={closeCamera}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Preferences</h3>
        
        {/* Occasion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Occasion
          </label>
          <select
            value={filters.occasion}
            onChange={(e) => handleFilterChange('occasion', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            aria-label="Select occasion"
          >
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Season
          </label>
          <select
            value={filters.season}
            onChange={(e) => handleFilterChange('season', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            aria-label="Select season"
          >
            <option value="all">All Seasons</option>
            <option value="spring">Spring</option>
            <option value="summer">Summer</option>
            <option value="fall">Fall</option>
            <option value="winter">Winter</option>
          </select>
        </div>

        {/* Style */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Style
          </label>
          <select
            value={filters.style}
            onChange={(e) => handleFilterChange('style', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            aria-label="Select style preference"
          >
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
      </div>

      {/* OR free-text preference */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <span className="text-xs uppercase tracking-wide text-gray-500">Or describe your preferences</span>
          <span className="mx-2 text-gray-300">•</span>
          <span className="text-xs text-gray-500">Only one is required</span>
        </div>
        <label htmlFor="free-text-pref" className="sr-only">Preference text</label>
        <textarea
          id="free-text-pref"
          value={preferenceText}
          onChange={(e) => setPreferenceText(e.target.value)}
          placeholder="e.g., Smart casual for a client meeting, prefer navy and brown tones, no sneakers."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
          rows={3}
        />
        <p className="text-xs text-gray-500 mt-1">Tip: Leave this blank to use the dropdown preferences above.</p>
      </div>

      {/* Get Suggestion Button */}
      <button
        onClick={onGetSuggestion}
        disabled={!image || loading}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all ${
          !image || loading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-gradient-to-r from-teal-500 to-purple-600 hover:from-teal-600 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
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
  );
};

export default Sidebar;

