import React, { useCallback, useRef } from 'react';
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

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
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
              <p className="text-sm text-gray-500">or click below to browse</p>
              
              {/* Upload Button */}
              <div className="flex justify-center mt-4">
                <button
                  onClick={openFileDialog}
                  className="flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Choose File
                </button>
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
