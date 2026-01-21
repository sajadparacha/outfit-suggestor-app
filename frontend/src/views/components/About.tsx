/**
 * About Component
 * Shows developer information and social links
 */

import React from 'react';

const About: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-12 text-white text-center">
          <div className="mb-4">
            <div className="w-24 h-24 bg-white rounded-full mx-auto flex items-center justify-center text-4xl">
              👨‍💻
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">AI Outfit Suggestor</h1>
          <p className="text-indigo-100 text-lg mb-2">
            Your Personal AI Fashion Stylist
          </p>
          <p className="text-indigo-200 text-sm font-medium">
            Multi-Model AI Application
          </p>
        </div>

        {/* Developer Section */}
        <div className="px-8 py-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Developed by Sajjad Ahmed Paracha
            </h2>
            <p className="text-gray-600">
              Full Stack Developer & AI Enthusiast
            </p>
          </div>

          {/* About the App */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">About This App</h3>
            <p className="text-gray-700 leading-relaxed mb-4">
              AI Outfit Suggestor is an intelligent fashion assistant that uses advanced AI 
              technology to analyze any piece of clothing and provide professional outfit recommendations. 
              Upload a photo of <strong>any clothing item</strong> - whether it's a shirt, blazer, footwear, 
              or even a partial outfit combination - and get instant, personalized styling advice.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              The AI intelligently understands what you're wearing and suggests complementary pieces 
              to complete your look. If you upload a combination, it identifies what's already there 
              and suggests the missing elements. The app now features a <strong>smart wardrobe management system</strong> 
              that learns your collection and prioritizes suggestions based on items you already own, 
              making outfit recommendations more practical and personalized.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Built with cutting-edge technologies including OpenAI's GPT-4 Vision, DALL-E 3, Stable Diffusion, 
              Hugging Face BLIP and ViT-GPT2 models, React, FastAPI, and PostgreSQL, this app combines the 
              power of artificial intelligence with modern web development to deliver a seamless fashion 
              experience. Generate stunning AI-powered model images to visualize complete outfits, manage 
              and edit your wardrobe with intelligent duplicate detection, get outfit suggestions directly from 
              wardrobe items, and track costs transparently. All suggestions are saved to your searchable history 
              with full-screen image viewing capabilities for easy reference.
            </p>
          </div>

          {/* Features */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">Key Features</h3>
            
            {/* Wardrobe Management Section */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">👔 Wardrobe Management</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">👔</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Smart Wardrobe Management</h4>
                    <p className="text-sm text-gray-600">Build and manage your digital wardrobe with AI-powered item recognition. Automatically categorize items, filter by category (shirts, trousers, blazers, shoes, belts), and get outfit suggestions that prioritize your existing clothing.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">✏️</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Edit Wardrobe Items</h4>
                    <p className="text-sm text-gray-600">Update category, color, description, and images for any wardrobe item. All changes are saved instantly, keeping your wardrobe up-to-date and accurate.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">AI-Powered Item Analysis</h4>
                    <p className="text-sm text-gray-600">Add items to your wardrobe with automatic AI analysis using BLIP or ViT-GPT2 models. The AI extracts category, color, and description from your photos, ready for you to review and edit.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">✨</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Get Suggestions from Wardrobe</h4>
                    <p className="text-sm text-gray-600">Click "Get AI Suggestion" on any wardrobe item to instantly get outfit recommendations. Uses the same powerful duplicate detection and filtering as the main suggestion flow.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🔍</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Intelligent Duplicate Detection</h4>
                    <p className="text-sm text-gray-600">Advanced perceptual hashing prevents duplicate wardrobe items and outfit suggestions, saving time and API costs while keeping your wardrobe organized.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🔍</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Image Viewer</h4>
                    <p className="text-sm text-gray-600">Click on any wardrobe item image to view it in full-screen mode. Perfect for inspecting details and getting a better look at your clothing items.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Outfit Suggestions Section */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">🎯 Outfit Suggestions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Flexible Input Support</h4>
                    <p className="text-sm text-gray-600">Upload any clothing item - shirts, blazers, footwear, or even partial outfit combinations. The AI adapts to what you provide.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🧩</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Smart Combination Analysis</h4>
                    <p className="text-sm text-gray-600">Upload a combination and the AI identifies existing pieces, then suggests only the missing elements to complete your look.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🎨</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Wardrobe-Aware Suggestions</h4>
                    <p className="text-sm text-gray-600">The AI analyzes your wardrobe and prioritizes outfit suggestions using items you already own, making recommendations practical and personalized to your collection.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI & Visualization Section */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">🖼️ AI & Visualization</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🖼️</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">AI Model Visualization</h4>
                    <p className="text-sm text-gray-600">Generate stunning AI-powered model images wearing your recommended outfit using DALL-E 3 or Stable Diffusion, customized based on your location for personalized appearance.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Transparent Cost Display</h4>
                    <p className="text-sm text-gray-600">See the exact cost breakdown in USD for each AI suggestion, including GPT-4 Vision analysis and optional model image generation. Full transparency on AI service costs.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🌍</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Location-Based Customization</h4>
                    <p className="text-sm text-gray-600">Model images are customized based on your geographical location for culturally appropriate and relatable appearances.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🎛️</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Multiple AI Models</h4>
                    <p className="text-sm text-gray-600">Choose between DALL-E 3 and Stable Diffusion for model image generation, and BLIP or ViT-GPT2 for wardrobe item analysis - each optimized for different use cases.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* History & Organization Section */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">📋 History & Organization</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">📋</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Complete Outfit History</h4>
                    <p className="text-sm text-gray-600">Track all your past suggestions with searchable history, including generated model images for easy reference and inspiration. Search by clothing items, colors, or context.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🗑️</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Manage History</h4>
                    <p className="text-sm text-gray-600">Delete individual outfit history entries you no longer need. Keep your history clean and organized with simple deletion controls.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🔍</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Full-Screen Image Viewing</h4>
                    <p className="text-sm text-gray-600">Click on any outfit history image (uploaded photos or AI-generated model images) to view them in full-screen mode for better detail inspection.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Experience Section */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-200">🔐 User Experience</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">🔐</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Secure User Accounts</h4>
                    <p className="text-sm text-gray-600">Create an account to save your wardrobe, outfit history, and preferences. Your data is securely stored and private.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">📱</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">Multi-Platform Support</h4>
                    <p className="text-sm text-gray-600">Web and iOS apps available, with seamless synchronization of your wardrobe and outfit history across devices.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="border-t border-gray-200 pt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">
              Connect With Me
            </h3>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/in/sajjadparacha/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg w-full sm:w-auto justify-center"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                <span className="font-medium">LinkedIn</span>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/sajadparacha"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-md hover:shadow-lg w-full sm:w-auto justify-center"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
                <span className="font-medium">GitHub</span>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/sajadparacha"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors shadow-md hover:shadow-lg w-full sm:w-auto justify-center"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span className="font-medium">Instagram</span>
              </a>
            </div>
          </div>

          {/* Tech Stack */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              Built With
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                React
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                TypeScript
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                FastAPI
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                Python
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                PostgreSQL
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                OpenAI GPT-4 Vision
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                DALL-E 3
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                Stable Diffusion
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                Hugging Face BLIP
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                ViT-GPT2
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                Tailwind CSS
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                SQLAlchemy
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                JWT Authentication
              </span>
              <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                SwiftUI (iOS)
              </span>
            </div>
          </div>

          {/* Version Info */}
          <div className="border-t border-gray-200 pt-6 mt-8 text-center">
            <p className="text-sm text-gray-500">
              Version 4.0.0 • © 2024 Sajjad Ahmed Paracha • All Rights Reserved
            </p>
          </div>
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Project Card */}
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl mb-3">🚀</div>
          <h4 className="font-semibold text-gray-800 mb-2">Open Source</h4>
          <p className="text-sm text-gray-600">
            This project is available on GitHub. Feel free to contribute!
          </p>
        </div>

        {/* AI Card */}
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl mb-3">🎨</div>
          <h4 className="font-semibold text-gray-800 mb-2">AI Fashion Expert</h4>
          <p className="text-sm text-gray-600">
            Powered by OpenAI's GPT-4 Vision for styling advice, BLIP/ViT-GPT2 for wardrobe analysis, and DALL-E 3 & Stable Diffusion for stunning outfit visualizations
          </p>
        </div>

        {/* Support Card */}
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-3xl mb-3">💡</div>
          <h4 className="font-semibold text-gray-800 mb-2">Continuous Updates</h4>
          <p className="text-sm text-gray-600">
            Regular updates with new features and improvements
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;

