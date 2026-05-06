/**
 * Main Application Component
 * Refactored with MVC architecture
 * Uses controllers for business logic and views for presentation
 */

import React, { useState } from 'react';
import Hero from './views/components/Hero';
import Sidebar from './views/components/Sidebar';
import OutfitPreview from './views/components/OutfitPreview';
import OutfitHistory from './views/components/OutfitHistory';
import About from './views/components/About';
import UserGuide from './views/components/UserGuide';
import Wardrobe from './views/components/Wardrobe';
import AdminReports from './views/components/AdminReports';
import AdminIntegrationTestRunner from './views/components/AdminIntegrationTestRunner';
import Toast from './views/components/Toast';
import Footer from './views/components/Footer';
import ConfirmationModal from './views/components/ConfirmationModal';
import LoadingOverlay from './views/components/LoadingOverlay';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './views/components/Login';
import Register from './views/components/Register';
import ChangePassword from './views/components/ChangePassword';
import { useOutfitController } from './controllers/useOutfitController';
import { useHistoryController } from './controllers/useHistoryController';
import { useHistorySearchController } from './controllers/useHistorySearchController';
import { useToastController } from './controllers/useToastController';
import { useAuthController } from './controllers/useAuthController';
import { useWardrobeController } from './controllers/useWardrobeController';
import ApiService from './services/ApiService';
import { historyEntryToSuggestion } from './utils/historyUtils';
import WardrobeGapAnalysis from './views/components/WardrobeGapAnalysis';
import { WardrobeGapAnalysisResponse } from './models/WardrobeModels';

function App() {
  // Check URL parameter for model generation feature flag
  const modelGenerationEnabled = React.useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('modelGeneration') === 'true';
  }, []);

  // Test runner should be hidden in production unless explicitly enabled.
  const testRunnerEnabled = React.useMemo(() => {
    const flag = process.env.REACT_APP_ENABLE_ADMIN_TEST_RUNNER;
    if (flag === 'true') return true;
    if (flag === 'false') return false;

    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1';
  }, []);

  // Authentication
  const { user, isAuthenticated, isLoading: authLoading, login, register, logout, error: authError, clearError } = useAuthController();
  const [showRegister, setShowRegister] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // View state (UI-only state)
  const [currentView, setCurrentView] = useState<
    'main' | 'history' | 'wardrobe' | 'insights' | 'reports' | 'integration-tests' | 'about' | 'guide' | 'settings'
  >('main');
  const [wardrobeCategoryFilter, setWardrobeCategoryFilter] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showModelImageConfirm, setShowModelImageConfirm] = useState(false);
  const [modelImageConfirmed, setModelImageConfirmed] = useState(false);
  const [pendingAlternateAfterModel, setPendingAlternateAfterModel] = useState(false);
  const [showAddWardrobeModal, setShowAddWardrobeModal] = useState(false);
  const [wardrobeFormData, setWardrobeFormData] = useState<{category: string; color: string; description: string} | null>(null);
  const [wardrobeImageToAdd, setWardrobeImageToAdd] = useState<File | null>(null);
  const [showWardrobeDuplicateModal, setShowWardrobeDuplicateModal] = useState(false);
  const [duplicateWardrobeItem, setDuplicateWardrobeItem] = useState<any>(null);
  const [showIntroOverlay, setShowIntroOverlay] = useState(false);
  const [showAiPromptResponse, setShowAiPromptResponse] = useState<boolean>(() => {
    const saved = localStorage.getItem('show_ai_prompt_response');
    if (saved === null) return true;
    return saved === 'true';
  });
  const [wardrobeGapResult, setWardrobeGapResult] = useState<WardrobeGapAnalysisResponse | null>(null);
  const [wardrobeGapLoading, setWardrobeGapLoading] = useState(false);
  const [wardrobeGapError, setWardrobeGapError] = useState<string | null>(null);
  const [wardrobeAnalysisLoadingMessage, setWardrobeAnalysisLoadingMessage] = useState('Analyzing your wardrobe...');
  const [showWardrobeAnalysisModeModal, setShowWardrobeAnalysisModeModal] = useState(false);

  // Controllers (Business Logic)
  const {
    image,
    loadingMessage,
    filters,
    preferenceText,
    currentSuggestion,
    loading,
    error,
    generateModelImage,
    imageModel,
    useWardrobeOnly,
    showDuplicateModal,
    setImage,
    setFilters,
    setPreferenceText,
    setCurrentSuggestion,
    setGenerateModelImage,
    setImageModel,
    setUseWardrobeOnly,
    setSourceWardrobeItemId,
    getSuggestion,
    getRandomSuggestion,
    handleUseCachedSuggestion,
    handleGetNewSuggestion,
  } = useOutfitController({
    onSuggestionSuccess: async () => {
      await fetchRecentHistory();
    }
  });

  const {
    history,
    loading: historyLoading,
    error: historyError,
    isFullView,
    refreshHistory,
    fetchRecentHistory,
    ensureFullHistory,
    deleteHistoryEntry,
  } = useHistoryController({
    userId: user?.id ?? null,
    isAuthenticated: isAuthenticated,
  });

  // History search controller
  const historySearchController = useHistorySearchController(
    history,
    ensureFullHistory,
    isFullView
  );

  const { toast, showToast, hideToast } = useToastController();

  // Wardrobe controller for auto-add functionality
  const { analyzeImage, addItem, loading: wardrobeLoading } = useWardrobeController();
  const [addingToWardrobe, setAddingToWardrobe] = useState(false);

  // Ensure model generation is disabled if feature flag is off
  React.useEffect(() => {
    if (!modelGenerationEnabled && generateModelImage) {
      setGenerateModelImage(false);
    }
  }, [modelGenerationEnabled, generateModelImage, setGenerateModelImage]);

  // Persist AI Prompt & Response visibility preference
  React.useEffect(() => {
    localStorage.setItem('show_ai_prompt_response', String(showAiPromptResponse));
  }, [showAiPromptResponse]);

  // Event Handlers (UI orchestration only)
  const handleGetSuggestion = async (skipModelImageConfirm: boolean = false) => {
    setPendingAlternateAfterModel(false);
    if (!image) {
      showToast('Please upload an image first', 'error');
      return;
    }

    // Show confirmation dialog if model image generation is enabled and not already confirmed
    if (generateModelImage && !skipModelImageConfirm && !modelImageConfirmed) {
      setShowModelImageConfirm(true);
      return;
    }

    // Reset confirmation state for next time
    if (skipModelImageConfirm) {
      setModelImageConfirmed(false);
    }

    // All business logic is now in the controller
    await getSuggestion();
  };

  /** Next suggestion: ask AI for a different outfit using the current one as context (same photo). */
  const handleNextSuggestion = async (skipModelImageConfirm: boolean = false) => {
    if (!image) {
      showToast('Please upload an image first', 'error');
      return;
    }

    if (generateModelImage && !skipModelImageConfirm && !modelImageConfirmed) {
      setPendingAlternateAfterModel(true);
      setShowModelImageConfirm(true);
      return;
    }

    if (skipModelImageConfirm) {
      setModelImageConfirmed(false);
    }
    setPendingAlternateAfterModel(false);
    await getSuggestion(true, undefined, !!currentSuggestion);
  };

  const handleSetImage = (file: File | null) => {
    setSourceWardrobeItemId(null);
    setImage(file);
  };

  const handleUseCachedSuggestionWrapper = () => {
    handleUseCachedSuggestion();
    showToast('Loaded suggestion from history! 📋', 'success');
  };

  const handleGetRandomFromHistory = async () => {
    try {
      const fullHistory = await ensureFullHistory();
      if (fullHistory.length === 0) {
        showToast('No history yet. Get some outfit suggestions first! 📋', 'error');
        return;
      }
      const randomEntry = fullHistory[Math.floor(Math.random() * fullHistory.length)];
      const suggestion = historyEntryToSuggestion(randomEntry);
      setCurrentSuggestion(suggestion);
      setCurrentView('main');
      showToast('Random outfit from your history! 📋', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history';
      showToast(errorMessage, 'error');
    }
  };

  const handleLike = () => {
    showToast('Thanks for the feedback! 👍', 'success');
  };

  const handleDislike = async () => {
    showToast("We'll improve our suggestions! 👎", 'success');
    await handleGetSuggestion(); // Get a new suggestion
  };

  const runWardrobeAnalysis = async (mode: 'free' | 'premium') => {
    if (!isAuthenticated) {
      showToast('Please login to analyze your wardrobe.', 'error');
      return;
    }

    setWardrobeAnalysisLoadingMessage(
      mode === 'premium'
        ? 'Running Premium Analysis with ChatGPT...'
        : 'Analyzing your wardrobe with free rules...'
    );
    setWardrobeGapLoading(true);
    setWardrobeGapError(null);
    try {
      const result = await ApiService.analyzeWardrobeGaps({
        occasion: filters.occasion || 'casual',
        season: filters.season || 'all',
        style: filters.style || 'modern',
        text_input: preferenceText || '',
        analysis_mode: mode,
      });
      setWardrobeGapResult(result);
      setCurrentView('insights');
      showToast(
        mode === 'premium'
          ? 'Premium Analysis is ready. ✅'
          : 'Wardrobe analysis is ready. ✅',
        'success'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze wardrobe';
      setWardrobeGapError(message);
      showToast(message, 'error');
    } finally {
      setWardrobeGapLoading(false);
    }
  };

  const handleAnalyzeWardrobe = () => {
    if (!isAuthenticated) {
      showToast('Please login to analyze your wardrobe.', 'error');
      return;
    }
    setShowWardrobeAnalysisModeModal(true);
  };

  const handleLogin = async (credentials: { username: string; password: string }): Promise<boolean> => {
    try {
      await login(credentials);
      showToast('Welcome back! 👋', 'success');
      if (!localStorage.getItem('intro_hero_seen')) {
        localStorage.setItem('intro_hero_seen', 'true');
        setShowIntroOverlay(true);
      }
      return true;
    } catch (err) {
      // Error is handled by auth controller
      return false;
    }
  };

  const handleRegister = async (data: { email: string; password: string; full_name?: string }): Promise<boolean> => {
    try {
      await register(data);
      // Auto-login happens in the controller
      showToast('Registration successful! Welcome! 👋', 'success');
      if (!localStorage.getItem('intro_hero_seen')) {
        localStorage.setItem('intro_hero_seen', 'true');
        setShowIntroOverlay(true);
      }
      return true;
    } catch (err) {
      // Error is handled by auth controller
      return false;
    }
  };

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'success');
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 md:bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
          <p className="mt-4 text-slate-200">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow anonymous access - show login/register as optional modal, not required
  const appBusy = loading || wardrobeGapLoading;
  const appBusyMessage = loading
    ? (loadingMessage || 'Generating AI suggestion...')
    : wardrobeAnalysisLoadingMessage;

  return (
    <div 
      className="min-h-screen bg-slate-900 md:bg-slate-950 text-white relative"
      style={{ pointerEvents: appBusy ? 'none' : 'auto' }}
    >
      {/* Subtle gradient orbs – lighter on mobile for daytime use */}
      <div className="fixed inset-0 opacity-20 md:opacity-30 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-indigo-500 blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-teal-400 blur-3xl" />
      </div>
      <div className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-3 sm:px-4 py-2.5">
          <div className="flex min-h-[48px] items-center justify-between gap-2">
            <div className="flex flex-1 min-w-0 overflow-x-auto overflow-y-hidden scrollbar-none -mx-1 px-1 sm:mx-0 sm:px-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-nowrap mx-auto sm:mx-0">
                <button
                  onClick={() => setCurrentView('main')}
                  className={`inline-flex items-center rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                    currentView === 'main'
                      ? 'bg-white/95 text-slate-900 shadow-sm'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="mr-1.5 text-[10px] text-teal-300">●</span>
                  <span>Get Suggestion</span>
                </button>
                {isAuthenticated && (
                  <>
                    <button
                      onClick={() => setCurrentView('history')}
                      className={`inline-flex items-center rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                        currentView === 'history'
                          ? 'bg-white/95 text-slate-900 shadow-sm'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>History</span>
                    </button>
                    <button
                      onClick={() => setCurrentView('wardrobe')}
                      className={`inline-flex items-center rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                        currentView === 'wardrobe'
                          ? 'bg-white/95 text-slate-900 shadow-sm'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>Wardrobe</span>
                    </button>
                    <button
                      onClick={() => setCurrentView('insights')}
                      className={`inline-flex items-center rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                        currentView === 'insights'
                          ? 'bg-white/95 text-slate-900 shadow-sm'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>Insights</span>
                    </button>
                    {user?.is_admin && (
                      <>
                        <button
                          onClick={() => setCurrentView('reports')}
                          className={`inline-flex items-center rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                            currentView === 'reports'
                              ? 'bg-white/95 text-slate-900 shadow-sm'
                              : 'text-slate-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span>Reports</span>
                        </button>
                        {testRunnerEnabled && (
                          <button
                            onClick={() => setCurrentView('integration-tests')}
                            className={`inline-flex items-center rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                              currentView === 'integration-tests'
                                ? 'bg-white/95 text-slate-900 shadow-sm'
                                : 'text-slate-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <span>Test Runner</span>
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setCurrentView('settings')}
                      className={`inline-flex items-center rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                        currentView === 'settings'
                          ? 'bg-white/95 text-slate-900 shadow-sm'
                          : 'text-slate-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>Settings</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setCurrentView('guide')}
                  className={`inline-flex items-center rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                    currentView === 'guide'
                      ? 'bg-white/95 text-slate-900 shadow-sm'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                  aria-current={currentView === 'guide' ? 'page' : undefined}
                >
                  <span>Guide</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div
                    className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 text-sm font-semibold text-slate-900 flex items-center justify-center"
                    aria-label="User avatar"
                    title={user?.full_name || user?.email || 'User'}
                  >
                    {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="min-h-[36px] rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-100 transition hover:bg-white/10"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setShowRegister(true)}
                    className="min-h-[36px] rounded-full border border-indigo-400/50 bg-transparent px-3 py-1.5 text-xs sm:text-sm font-medium text-indigo-200 transition-colors hover:bg-indigo-500/20 touch-manipulation"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => {
                      setShowRegister(false);
                      setShowLoginModal(true);
                    }}
                    className="min-h-[36px] rounded-full bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-900 transition-colors hover:bg-slate-100 touch-manipulation"
                  >
                    Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className="relative container mx-auto px-3 sm:px-4 py-4 sm:py-8"
        style={{ pointerEvents: appBusy ? 'none' : 'auto' }}
      >
        {currentView === 'main' && (
          <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 xl:grid-cols-12">
            {/* Left Sidebar */}
            <div className="lg:col-span-3">
              <Sidebar
                filters={filters}
                setFilters={setFilters}
                preferenceText={preferenceText}
                setPreferenceText={setPreferenceText}
                image={image}
                setImage={handleSetImage}
                onGetSuggestion={handleGetSuggestion}
                onGetRandomSuggestion={isAuthenticated ? getRandomSuggestion : undefined}
                onGetRandomFromHistory={isAuthenticated ? handleGetRandomFromHistory : undefined}
                onOpenInsights={isAuthenticated ? () => setCurrentView('insights') : undefined}
                loading={loading}
                generateModelImage={generateModelImage}
                setGenerateModelImage={setGenerateModelImage}
                imageModel={imageModel}
                setImageModel={setImageModel}
                useWardrobeOnly={useWardrobeOnly}
                setUseWardrobeOnly={setUseWardrobeOnly}
                modelGenerationEnabled={modelGenerationEnabled}
                isAuthenticated={isAuthenticated}
                isAdmin={!!user?.is_admin}
                onFileReject={(msg) => showToast(msg, 'error')}
                showAiPromptResponse={showAiPromptResponse}
                setShowAiPromptResponse={setShowAiPromptResponse}
                onAddToWardrobe={async () => {
                  if (!image) {
                    showToast('Please upload an image first to add it to your wardrobe', 'error');
                    return;
                  }

                  if (addingToWardrobe || wardrobeLoading) {
                    return; // Prevent multiple clicks
                  }

                  setAddingToWardrobe(true);
                  try {
                    console.log('🔍 Checking for duplicate...');
                    
                    // Check for duplicate FIRST before AI analysis
                    const duplicateCheck = await ApiService.checkWardrobeDuplicate(image);
                    
                    if (duplicateCheck.is_duplicate && duplicateCheck.existing_item) {
                      // Show duplicate notification immediately
                      setDuplicateWardrobeItem(duplicateCheck.existing_item);
                      setWardrobeImageToAdd(image);
                      setShowWardrobeDuplicateModal(true);
                      setAddingToWardrobe(false);
                      return;
                    }
                    
                    console.log('✅ No duplicate found, proceeding with AI analysis...');
                    
                    // No duplicate found, proceed with AI analysis
                    console.log('📸 Analyzing image with AI...');
                    const properties = await analyzeImage(image, 'blip');
                    console.log('✅ Analysis complete:', properties);
                    
                    // Show form modal with extracted data for user to review/edit
                    setWardrobeFormData({
                      category: properties.category || 'shirt',
                      color: properties.color || '',
                      description: properties.description || '',
                    });
                    setWardrobeImageToAdd(image);
                    setShowAddWardrobeModal(true);
                  } catch (err) {
                    console.error('❌ Error:', err);
                    const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
                    showToast(errorMessage, 'error');
                  } finally {
                    setAddingToWardrobe(false);
                  }
                }}
                addingToWardrobe={addingToWardrobe}
              />
            </div>

            {/* Main Content Area */}
            <div className="xl:col-span-9">
              <OutfitPreview
                suggestion={currentSuggestion}
                loading={loading}
                error={error}
                hasImage={!!image}
                isAdmin={!!user?.is_admin}
                onLike={handleLike}
                onDislike={handleDislike}
                onNext={handleNextSuggestion}
                onNavigateToWardrobe={(category?: string) => {
                  setWardrobeCategoryFilter(category || null);
                  setCurrentView('wardrobe');
                }}
                showAiPromptResponse={!!user?.is_admin && showAiPromptResponse}
                isAuthenticated={isAuthenticated}
                onAddToWardrobe={async () => {
                  if (!image) {
                    showToast('No image to add. Please upload an image first.', 'error');
                    return;
                  }

                  setAddingToWardrobe(true);
                  try {
                    console.log('🔍 Checking for duplicate...');
                    
                    // Check for duplicate FIRST before AI analysis
                    const duplicateCheck = await ApiService.checkWardrobeDuplicate(image);
                    
                    if (duplicateCheck.is_duplicate && duplicateCheck.existing_item) {
                      // Show duplicate notification immediately
                      setDuplicateWardrobeItem(duplicateCheck.existing_item);
                      setWardrobeImageToAdd(image);
                      setShowWardrobeDuplicateModal(true);
                      setAddingToWardrobe(false);
                      return;
                    }
                    
                    console.log('✅ No duplicate found, proceeding with AI analysis...');
                    
                    // No duplicate found, proceed with AI analysis
                    const properties = await analyzeImage(image, 'blip');
                    
                    // Show form modal with extracted data for user to review/edit
                    setWardrobeFormData({
                      category: properties.category || 'shirt',
                      color: properties.color || '',
                      description: properties.description || '',
                    });
                    setWardrobeImageToAdd(image);
                    setShowAddWardrobeModal(true);
                  } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
                    showToast(errorMessage, 'error');
                    console.error('Failed to process image:', err);
                  } finally {
                    setAddingToWardrobe(false);
                  }
                }}
              />
            </div>

          </div>
        )}

        {currentView === 'wardrobe' && (
          isAuthenticated ? (
            <ErrorBoundary label="Wardrobe" resetKey={currentView}>
              <Wardrobe 
                initialCategory={wardrobeCategoryFilter}
                onAnalyzeWardrobe={handleAnalyzeWardrobe}
                analyzingWardrobe={wardrobeGapLoading}
                onSuggestionReady={(suggestion) => {
                  // Suggestion is already set by the outfit controller's getSuggestion
                  setCurrentSuggestion(suggestion);
                }}
                onNavigateToMain={() => {
                  setCurrentView('main');
                }}
                onSourceImageLoaded={() => {
                  showToast('Your selected item has been loaded. Now select the options and try to generate AI outfit.', 'success');
                }}
                outfitController={{
                  setImage,
                  setSourceWardrobeItemId,
                  getSuggestion,
                  loading,
                  error,
                  showDuplicateModal,
                  handleUseCachedSuggestion,
                  useWardrobeOnly
                }}
              />
            </ErrorBoundary>
          ) : (
            <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">👔 Wardrobe Management</h2>
              <p className="text-slate-200 mb-6">
                Please log in to manage your wardrobe and get personalized outfit suggestions based on your existing clothes.
              </p>
              <button
                onClick={() => {
                  setShowRegister(false);
                  setShowLoginModal(true);
                }}
                className="px-6 py-3 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-colors"
              >
                Login to Continue
              </button>
            </div>
          )
        )}

        {currentView === 'insights' && (
          isAuthenticated ? (
            <div className="max-w-5xl mx-auto">
              <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Wardrobe Insights</h2>
                    <p className="text-slate-300 mt-1">
                      Understand wardrobe gaps by category and plan what to buy next.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAnalyzeWardrobe}
                      disabled={wardrobeGapLoading}
                      className={`px-4 py-2.5 rounded-xl font-semibold transition-all ${
                        wardrobeGapLoading
                          ? 'cursor-not-allowed bg-white/10 text-slate-500 border border-white/10'
                          : 'bg-indigo-500 text-white hover:bg-indigo-600'
                      }`}
                    >
                      {wardrobeGapLoading ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                    <button
                      onClick={() => setCurrentView('wardrobe')}
                      className="px-4 py-2.5 rounded-xl font-medium bg-white/10 text-slate-200 hover:bg-white/20 border border-white/15 transition-colors"
                    >
                      Open Wardrobe
                    </button>
                  </div>
                </div>
              </div>

              <WardrobeGapAnalysis
                result={wardrobeGapResult}
                loading={wardrobeGapLoading}
                error={wardrobeGapError}
                isAdmin={!!user?.is_admin}
              />
            </div>
          ) : (
            <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Wardrobe Insights</h2>
              <p className="text-slate-200 mb-6">Please log in to analyze your wardrobe and view insights.</p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors"
              >
                Login
              </button>
            </div>
          )
        )}

        {currentView === 'reports' && (
          isAuthenticated && user && user.is_admin ? (
            <ErrorBoundary label="Reports" resetKey={currentView}>
              <AdminReports user={user} />
            </ErrorBoundary>
          ) : (
            <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">📊 Reports</h2>
              <p className="text-slate-200 mb-6">Admin privileges are required to view reports.</p>
            </div>
          )
        )}

        {currentView === 'integration-tests' && (
          isAuthenticated && user && user.is_admin ? (
            testRunnerEnabled ? (
              <ErrorBoundary label="Integration Tests" resetKey={currentView}>
                <AdminIntegrationTestRunner user={user} />
              </ErrorBoundary>
            ) : (
              <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Integration Tests</h2>
                <p className="text-slate-200 mb-6">Test Runner is disabled in this environment.</p>
              </div>
            )
          ) : (
            <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Integration Tests</h2>
              <p className="text-slate-200 mb-6">Admin privileges are required to run integration tests.</p>
            </div>
          )
        )}

        {currentView === 'history' && (
          isAuthenticated ? (
            <OutfitHistory
              history={history}
              loading={historyLoading}
              error={historyError}
              isFullView={isFullView}
              onRefresh={refreshHistory}
              onEnsureFullHistory={ensureFullHistory}
              onDelete={deleteHistoryEntry}
              searchController={historySearchController}
            />
          ) : (
            <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Outfit History</h2>
              <p className="text-slate-200 mb-6">Please log in to view your outfit history.</p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors"
              >
                Login
              </button>
            </div>
          )
        )}

        {currentView === 'about' && <About />}

        {currentView === 'guide' && <UserGuide />}

        {currentView === 'settings' && (
          isAuthenticated ? (
          <div className="max-w-2xl mx-auto">
            <div className="rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200 mb-2">User Information</h3>
                  <p className="text-slate-200">
                    <strong className="text-white">Email:</strong> {user?.email}
                  </p>
                  {user?.full_name && (
                    <p className="text-slate-200">
                      <strong className="text-white">Name:</strong> {user.full_name}
                    </p>
                  )}
                </div>
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Change Password</h3>
                  {showChangePassword ? (
                    <ChangePassword
                      onSuccess={() => {
                        setShowChangePassword(false);
                        showToast('Password changed successfully! ✅', 'success');
                      }}
                      onCancel={() => setShowChangePassword(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowChangePassword(true)}
                      className="px-4 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600"
                    >
                      Change Password
                    </button>
                  )}
                </div>
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">Wardrobe Management</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    Manage your wardrobe items to get personalized outfit suggestions based on what you own.
                  </p>
                  <button
                    onClick={() => setCurrentView('wardrobe')}
                    className="px-4 py-2 bg-slate-600 text-white rounded-full hover:bg-slate-500 transition-colors"
                  >
                    👔 Manage Wardrobe
                  </button>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Settings</h2>
              <p className="text-slate-200 mb-6">Please log in to access your account settings.</p>
              <button
                onClick={() => setShowLoginModal(true)}
                className="px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors"
              >
                Login
              </button>
            </div>
          )
        )}
      </div>

      {/* Intro overlay - shown once after first successful login/register */}
      {showIntroOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative max-w-3xl w-full mx-4 rounded-3xl overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setShowIntroOverlay(false)}
              className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white text-sm hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              aria-label="Close intro"
            >
              ✕
            </button>
            <Hero />
          </div>
        </div>
      )}

      {/* Login/Register Modal - Only show when explicitly requested */}
      {(showRegister || showLoginModal) && !isAuthenticated && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
            onClick={() => {
              setShowRegister(false);
              setShowLoginModal(false);
            }}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-w-md w-full transform transition-all backdrop-blur">
              <button
                onClick={() => {
                  setShowRegister(false);
                  setShowLoginModal(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
              >
                ✕
              </button>
              {showRegister ? (
                <Register
                  onRegister={async (data) => {
                    const success = await handleRegister(data);
                    if (success) {
                      setShowRegister(false);
                    }
                  }}
                  onSwitchToLogin={() => {
                    setShowRegister(false);
                    setShowLoginModal(true);
                    clearError();
                  }}
                  loading={authLoading}
                  error={authError}
                />
              ) : (
                <Login
                  onLogin={async (credentials) => {
                    const success = await handleLogin(credentials);
                    if (success) {
                      setShowLoginModal(false);
                    }
                  }}
                  onSwitchToRegister={() => {
                    setShowLoginModal(false);
                    setShowRegister(true);
                    clearError();
                  }}
                  loading={authLoading}
                  error={authError}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* Duplicate Image Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDuplicateModal}
        title="Similar Image Found!"
        message="We found an existing outfit suggestion for this image in your history. Would you like to use the existing suggestion or get a new one from AI?"
        confirmText="Use Existing"
        cancelText="Get New"
        onConfirm={handleUseCachedSuggestionWrapper}
        onCancel={handleGetNewSuggestion}
      />

      {/* Model Image Generation Confirmation Modal */}
      <ConfirmationModal
        isOpen={showModelImageConfirm}
        title="Generate Model Image?"
        message="Would you like to create an AI-generated image of a model wearing your recommended outfit? The uploaded clothing item will be preserved exactly as shown in your photo. This may take a few extra seconds."
        confirmText="Yes, Generate"
        cancelText="Skip for Now"
        onConfirm={async () => {
          setShowModelImageConfirm(false);
          setModelImageConfirmed(true);
          if (pendingAlternateAfterModel) {
            setPendingAlternateAfterModel(false);
            await getSuggestion(true, undefined, !!currentSuggestion);
          } else {
            await handleGetSuggestion(true);
          }
        }}
        onCancel={async () => {
          setShowModelImageConfirm(false);
          setGenerateModelImage(false);
          setModelImageConfirmed(false);
          if (pendingAlternateAfterModel) {
            setPendingAlternateAfterModel(false);
            await getSuggestion(true, undefined, !!currentSuggestion);
          } else {
            await handleGetSuggestion(true);
          }
        }}
      />

      {/* Add to Wardrobe Modal with Editable Form */}
      {showAddWardrobeModal && wardrobeFormData && wardrobeImageToAdd && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto backdrop-blur">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">✏️ Review & Add to Wardrobe</h2>
                <button
                  onClick={() => {
                    setShowAddWardrobeModal(false);
                    setWardrobeFormData(null);
                    setWardrobeImageToAdd(null);
                  }}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!wardrobeFormData || !wardrobeImageToAdd) return;

                try {
                  setAddingToWardrobe(true);
                  
                  // No need to check duplicate again - already checked before AI analysis
                  // Proceed directly with adding
                  await addItem(wardrobeFormData, wardrobeImageToAdd);
                  showToast('Item added to wardrobe! ✅', 'success');
                  setShowAddWardrobeModal(false);
                  setWardrobeFormData(null);
                  setWardrobeImageToAdd(null);
                } catch (err) {
                  const errorMessage = err instanceof Error ? err.message : 'Failed to add item to wardrobe';
                  showToast(errorMessage, 'error');
                  console.error('Failed to add item to wardrobe:', err);
                } finally {
                  setAddingToWardrobe(false);
                }
              }} className="space-y-4">
                {/* Image Preview */}
                <div className="mb-4">
                  <img
                    src={URL.createObjectURL(wardrobeImageToAdd)}
                    alt="Item preview"
                    className="w-full max-h-48 object-contain rounded-lg border border-white/20 bg-white/5"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Category *
                  </label>
                  <select
                    value={wardrobeFormData.category}
                    onChange={(e) => setWardrobeFormData({ ...wardrobeFormData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  >
                    <option value="shirt">Shirt</option>
                    <option value="trouser">Trouser</option>
                    <option value="blazer">Blazer</option>
                    <option value="shoes">Shoes</option>
                    <option value="belt">Belt</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={wardrobeFormData.color}
                    onChange={(e) => setWardrobeFormData({ ...wardrobeFormData, color: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    placeholder="e.g., Navy blue, Black"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={wardrobeFormData.description}
                    onChange={(e) => setWardrobeFormData({ ...wardrobeFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    rows={3}
                    placeholder="e.g., Classic fit, casual style"
                    required
                  />
                </div>

                <div className="bg-teal-500/20 border border-teal-400/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-teal-100">
                    ✨ <strong>AI Analysis Complete!</strong> Review and edit the extracted details above before saving.
                  </p>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddWardrobeModal(false);
                      setWardrobeFormData(null);
                      setWardrobeImageToAdd(null);
                    }}
                    className="px-6 py-3 bg-white/10 text-slate-200 rounded-full font-semibold hover:bg-white/20 transition-all border border-white/15"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingToWardrobe || wardrobeLoading}
                    className="flex-1 px-6 py-3 bg-teal-500 text-white rounded-full font-semibold hover:bg-teal-600 transition-all disabled:opacity-50"
                  >
                    {addingToWardrobe || wardrobeLoading ? 'Adding...' : '✅ Save to Wardrobe'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Wardrobe Item Modal */}
      <ConfirmationModal
        isOpen={showWardrobeDuplicateModal}
        title="Similar Item Found! ⚠️"
        message={
          duplicateWardrobeItem ? (
            <div className="space-y-4">
              <p className="text-slate-200">We found a similar item already in your wardrobe:</p>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                {duplicateWardrobeItem.image_data && (
                  <img
                    src={`data:image/jpeg;base64,${duplicateWardrobeItem.image_data}`}
                    alt="Existing item"
                    className="w-full max-h-32 object-contain mb-3 rounded"
                  />
                )}
                <p className="font-semibold text-white capitalize">{duplicateWardrobeItem.category}</p>
                {duplicateWardrobeItem.color && (
                  <p className="text-sm text-slate-300">Color: {duplicateWardrobeItem.color}</p>
                )}
                {duplicateWardrobeItem.description && (
                  <p className="text-sm text-slate-300 mt-1">{duplicateWardrobeItem.description}</p>
                )}
              </div>
              <p className="text-sm text-slate-300">Do you still want to add this item anyway?</p>
            </div>
          ) : (
            "A similar item already exists in your wardrobe. Do you still want to add it?"
          )
        }
        confirmText="Yes, Add Anyway"
        cancelText="Cancel"
        onConfirm={async () => {
          setShowWardrobeDuplicateModal(false);
          if (!wardrobeFormData || !wardrobeImageToAdd) return;
          
          try {
            setAddingToWardrobe(true);
            await addItem(wardrobeFormData, wardrobeImageToAdd);
            showToast('Item added to wardrobe! ✅', 'success');
            setShowAddWardrobeModal(false);
            setWardrobeFormData(null);
            setWardrobeImageToAdd(null);
            setDuplicateWardrobeItem(null);
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to add item to wardrobe';
            showToast(errorMessage, 'error');
            console.error('Failed to add item to wardrobe:', err);
          } finally {
            setAddingToWardrobe(false);
          }
        }}
        onCancel={() => {
          setShowWardrobeDuplicateModal(false);
          setDuplicateWardrobeItem(null);
        }}
      />

      {/* Loading Overlay - Disables entire app when generating suggestion */}
      <LoadingOverlay isLoading={appBusy} message={appBusyMessage} />

      {/* Wardrobe Analysis Mode Picker */}
      {showWardrobeAnalysisModeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowWardrobeAnalysisModeModal(false)}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-w-md w-full p-6 transform transition-all backdrop-blur">
              <h3 className="text-lg font-semibold text-white text-center mb-2">Choose Analysis Mode</h3>
              <p className="text-sm text-slate-200 text-center mb-6">
                Pick how you want your wardrobe analyzed.
              </p>
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setShowWardrobeAnalysisModeModal(false);
                    await runWardrobeAnalysis('free');
                  }}
                  className="w-full rounded-xl border border-emerald-300/30 bg-emerald-500/15 px-4 py-3 text-left transition hover:bg-emerald-500/25"
                >
                  <div className="text-sm font-semibold text-emerald-100">Free Analysis (Current)</div>
                  <div className="text-xs text-emerald-200/90 mt-1">
                    Rules-based analysis on our backend. No external AI cost.
                  </div>
                </button>
                <button
                  onClick={async () => {
                    setShowWardrobeAnalysisModeModal(false);
                    await runWardrobeAnalysis('premium');
                  }}
                  className="w-full rounded-xl border border-indigo-300/30 bg-indigo-500/15 px-4 py-3 text-left transition hover:bg-indigo-500/25"
                >
                  <div className="text-sm font-semibold text-indigo-100">Premium Analysis</div>
                  <div className="text-xs text-indigo-200/90 mt-1">
                    ChatGPT-powered deep fashion analysis and recommendations.
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowWardrobeAnalysisModeModal(false)}
                className="w-full mt-4 px-4 py-2 bg-white/10 text-slate-200 rounded-full hover:bg-white/20 transition-colors font-medium border border-white/15"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer
        onOpenUserGuide={() => setCurrentView('guide')}
        onOpenAbout={() => setCurrentView('about')}
      />
    </div>
  );
}

export default App;
