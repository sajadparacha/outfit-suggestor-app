import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

interface ImageUploadProps {
  image: File | null;
  setImage: (file: File | null) => void;
  textInput: string;
  setTextInput: (text: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  image,
  setImage,
  textInput,
  setTextInput,
  onSubmit,
  loading
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setImage(acceptedFiles[0]);
    }
  }, [setImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: false
  });

  const removeImage = () => {
    setImage(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImage(file);
    }
  };

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Try back camera first
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      // Set the video source
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Fallback to file input
      fileInputRef.current?.click();
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw the video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            setImage(file);
            closeCamera();
          }
        }, 'image/jpeg', 0.8);
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

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Cleanup camera stream on component unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  return (
    <div className="space-y-6">
      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Take a Photo</h3>
              <p className="text-sm text-gray-600">Position your item in the frame and click capture</p>
            </div>
            
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover rounded-lg"
              />
              <canvas
                ref={canvasRef}
                className="hidden"
              />
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
              >
                📸 Capture Photo
              </button>
              <button
                onClick={closeCamera}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Upload Image
        </label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400'
          }`}
        >
          <input {...getInputProps()} />
          {image ? (
            <div className="space-y-4">
              <img
                src={URL.createObjectURL(image)}
                alt="Uploaded"
                className="max-h-64 mx-auto rounded-lg shadow-md"
              />
              <button
                onClick={removeImage}
                className="text-red-600 hover:text-red-800 text-sm font-medium"
              >
                Remove Image
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-lg text-gray-600">
                {isDragActive ? 'Drop the image here' : 'Drag & drop an image here'}
              </p>
              <p className="text-sm text-gray-500">or choose an option below</p>
              
              {/* Upload Options */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
                <button
                  onClick={openFileDialog}
                  className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose File
                </button>
                {/* 
                <button
                  onClick={openCamera}
                  className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >

                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Open Camera
                </button>
              */}
                
              </div>
              
              <p className="text-xs text-gray-400">
                Supports: JPG, PNG, GIF, BMP, WebP
              </p>
            </div>
          )}
        </div>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Text Input */}
      <div>
        <label htmlFor="text-input" className="block text-sm font-medium text-gray-700 mb-2">
          Additional Context (Optional)
        </label>
        <input
          id="text-input"
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="e.g., Business meeting, Casual, Olive green shirt"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
        />
        <p className="text-xs text-gray-500 mt-1">
          Add any additional context about the occasion, style, or preferences
        </p>
      </div>

      {/* Submit Button */}
      <button
        onClick={onSubmit}
        disabled={!image || loading}
        className={`w-full py-3 px-6 rounded-lg font-medium transition-colors ${
          !image || loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 text-white'
        }`}
      >
        {loading ? 'Analyzing...' : 'Get Outfit Suggestion'}
      </button>
    </div>
  );
};

export default ImageUpload;
