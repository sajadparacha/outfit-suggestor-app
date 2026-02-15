import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-teal-500 to-purple-600 text-white">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 font-['Poppins']">
            AI Outfit Suggestor
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-teal-50">
            Your AI Stylist, Anytime ✨
          </p>
        </div>
      </div>
    </div>
  );
};

export default Hero;

