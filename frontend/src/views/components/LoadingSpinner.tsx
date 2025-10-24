import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <h3 className="text-lg font-semibold text-gray-700">Analyzing Your Image</h3>
        <p className="text-gray-500">Our AI is working on your perfect outfit suggestion...</p>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
