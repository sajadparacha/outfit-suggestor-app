/**
 * Main Application Component
 * Refactored with MVC architecture
 * Uses controllers for business logic and views for presentation
 */

import React, { useState, useRef, useCallback } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Hero from './views/components/Hero';
import NavBar from './views/components/NavBar';
import HowItWorksStepper from './views/components/HowItWorksStepper';
import RecentLooksSection from './views/components/RecentLooksSection';
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
import { OUTFIT_VARIATION_MODIFIERS } from './utils/outfitPromptUtils';
import { canGenerateAnotherFromResult } from './utils/mainFlowResultRegenerate';
import { useHistoryController } from './controllers/useHistoryController';
import { useHistorySearchController } from './controllers/useHistorySearchController';
import { useToastController } from './controllers/useToastController';
import { useAuthController } from './controllers/useAuthController';
import { useWardrobeController } from './controllers/useWardrobeController';
import ApiService from './services/ApiService';
import WardrobeInsightsPage from './views/components/insights/WardrobeInsightsPage';
import { WardrobeGapAnalysisResponse } from './models/WardrobeModels';
import { resolveFilters } from './utils/outfitPreferences';
import { LOGIN_REDIRECT_STATE, ROUTES, wardrobePath } from './navigation/routes';
import AuthGateCard from './views/components/AuthGateCard';
import FirstOutfitPromptBanner from './views/components/FirstOutfitPromptBanner';
import {
  AuthPromptContextKey,
  FIRST_OUTFIT_PROMPT_KEY,
  getAuthPromptCopy,
  prefersRegister,
} from './utils/authPromptCopy';
import { INSIGHTS_COPY } from './utils/insightsCopy';
import { MICRO_HELP } from './utils/microHelpCopy';
import { dismissFirstRunCoach, isFirstRunCoachDismissed } from './utils/firstRunCoach';
import { MAIN_FLOW_UX_COPY } from './utils/mainFlowUxCopy';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const wardrobeCategoryFilter = searchParams.get('category');

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
  const modelGenerationEnabled = !!user?.is_admin;
  const [showRegister, setShowRegister] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPromptContext, setLoginPromptContext] = useState<AuthPromptContextKey | null>(null);
  const [showFirstOutfitBanner, setShowFirstOutfitBanner] = useState(false);
  const [guestRemaining, setGuestRemaining] = useState<number | null>(null);

  const refreshGuestUsage = useCallback(async () => {
    if (isAuthenticated) {
      setGuestRemaining(null);
      return;
    }
    try {
      const usage = await ApiService.getGuestUsage();
      setGuestRemaining(usage.remaining);
    } catch (err) {
      console.warn('Failed to fetch guest usage:', err);
      setGuestRemaining(3);
    }
  }, [isAuthenticated]);

  const handleGuestLimitReached = useCallback(() => {
    setGuestRemaining(0);
  }, []);

  const guestLimitReached = !isAuthenticated && guestRemaining === 0;

  const [showChangePassword, setShowChangePassword] = useState(false);
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
  const [highlightGenerateButton, setHighlightGenerateButton] = useState(false);

  // Controllers (Business Logic)
  const {
    image,
    loadingMessage,
    activeOperation,
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
    sourceWardrobeItem,
    setSourceWardrobeItem,
    flowPreviewUrl,
    setFlowPreviewUrl,
    flowPreviewCaption,
    setFlowPreviewCaption,
    inputPanelSource,
    summaryFilters,
    summaryPreferenceText,
    clearPreferences,
    getSuggestion,
    getRandomSuggestion,
    completeOutfitFromWardrobeSelection,
    loadRandomFromHistory,
    handleUseCachedSuggestion,
    handleGetNewSuggestion,
    cancelOperation,
    resetMainFlowState,
    startFreshUpload,
    generateAnotherFromResult,
    prepareStyleFromWardrobeItem,
  } = useOutfitController({
    onSuggestionSuccess: async () => {
      if (!isFirstRunCoachDismissed()) {
        dismissFirstRunCoach();
      }
      if (!isAuthenticated) {
        if (!localStorage.getItem(FIRST_OUTFIT_PROMPT_KEY)) {
          localStorage.setItem(FIRST_OUTFIT_PROMPT_KEY, 'true');
          setShowFirstOutfitBanner(true);
        }
      }
      await fetchRecentHistory();
      if (!isAuthenticated) {
        await refreshGuestUsage();
      }
      requestAnimationFrame(() => {
        document.getElementById('outfit-result-hero')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      });
    },
    onGuestLimitReached: handleGuestLimitReached,
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
  const wardrobeAnalysisAbortRef = useRef<AbortController | null>(null);
  const wasAuthenticatedRef = useRef<boolean | null>(null);

  const clearMainFlowOnLogout = useCallback(() => {
    resetMainFlowState();
    setShowFirstOutfitBanner(false);
    setShowAddWardrobeModal(false);
    setWardrobeFormData(null);
    setWardrobeImageToAdd(null);
    setShowWardrobeDuplicateModal(false);
    setDuplicateWardrobeItem(null);
    setWardrobeGapResult(null);
    wardrobeAnalysisAbortRef.current?.abort();
    wardrobeAnalysisAbortRef.current = null;
    setWardrobeGapLoading(false);
    setShowWardrobeAnalysisModeModal(false);
    setHighlightGenerateButton(false);
  }, [resetMainFlowState]);

  // Turn off model generation when neither URL flag nor admin access applies
  React.useEffect(() => {
    if (!modelGenerationEnabled && generateModelImage) {
      setGenerateModelImage(false);
    }
  }, [modelGenerationEnabled, generateModelImage, setGenerateModelImage]);

  // Persist AI Prompt & Response visibility preference
  React.useEffect(() => {
    localStorage.setItem('show_ai_prompt_response', String(showAiPromptResponse));
  }, [showAiPromptResponse]);

  React.useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      setGuestRemaining(null);
      return;
    }
    refreshGuestUsage();
  }, [authLoading, isAuthenticated, refreshGuestUsage]);

  React.useEffect(() => {
    if (authLoading) return;
    const wasAuthenticated = wasAuthenticatedRef.current;
    wasAuthenticatedRef.current = isAuthenticated;
    if (wasAuthenticated === true && !isAuthenticated) {
      clearMainFlowOnLogout();
    }
  }, [authLoading, isAuthenticated, clearMainFlowOnLogout]);

  const closeAuthModal = () => {
    setShowRegister(false);
    setShowLoginModal(false);
    setLoginPromptContext(null);
    clearError();
  };

  const openAuthPromptRegister = (context: AuthPromptContextKey) => {
    setLoginPromptContext(context);
    clearError();
    setShowRegister(true);
    setShowLoginModal(false);
  };

  const openAuthPromptSignIn = (context: AuthPromptContextKey) => {
    setLoginPromptContext(context);
    clearError();
    setShowRegister(false);
    setShowLoginModal(true);
  };

  const openAuthPrompt = (context: AuthPromptContextKey) => {
    if (prefersRegister(context)) {
      openAuthPromptRegister(context);
    } else {
      openAuthPromptSignIn(context);
    }
  };

  React.useEffect(() => {
    const state = location.state as Record<string, unknown> | null;
    if (state?.[LOGIN_REDIRECT_STATE]) {
      openAuthPrompt('wardrobe');
      navigate(location.pathname + location.search, {
        replace: true,
        state: null,
      });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const authModalCopy = loginPromptContext ? getAuthPromptCopy(loginPromptContext) : null;

  const dismissFirstOutfitBanner = () => {
    setShowFirstOutfitBanner(false);
  };

  // Event Handlers (UI orchestration only)
  const handleGetSuggestion = async () => {
    if (guestLimitReached) return;
    if (!image) {
      showToast('Please upload an image first', 'error');
      return;
    }
    await getSuggestion();
  };

  const hasFlowPreview = !!(flowPreviewUrl || currentSuggestion?.imageUrl);
  const canGenerateAnother = canGenerateAnotherFromResult(
    inputPanelSource,
    !!image,
    hasFlowPreview,
    !!currentSuggestion
  );

  const requireCanGenerateAnother = (): boolean => {
    if (!canGenerateAnother) {
      showToast('Please upload an image first', 'error');
      return false;
    }
    return true;
  };

  /** Generate another look using the current outfit as context (same source). */
  const handleGenerateAnother = async () => {
    if (guestLimitReached) return;
    if (!requireCanGenerateAnother()) return;
    await generateAnotherFromResult();
  };

  const handleMakeMoreFormal = async () => {
    if (guestLimitReached) return;
    if (!requireCanGenerateAnother()) return;
    await generateAnotherFromResult({
      promptModifier: OUTFIT_VARIATION_MODIFIERS.moreFormal,
    });
  };

  const handleMakeMoreCasual = async () => {
    if (guestLimitReached) return;
    if (!requireCanGenerateAnother()) return;
    await generateAnotherFromResult({
      promptModifier: OUTFIT_VARIATION_MODIFIERS.moreCasual,
    });
  };

  const handleUseWardrobeOnlyFromResult = async () => {
    if (!requireCanGenerateAnother()) return;
    if (!isAuthenticated) {
      showToast('Please log in to use wardrobe-only suggestions.', 'error');
      return;
    }
    await generateAnotherFromResult({
      promptModifier: OUTFIT_VARIATION_MODIFIERS.wardrobeOnly,
      forceWardrobeOnly: true,
    });
  };

  const handleChangeOccasion = () => {
    document.getElementById('outfit-preferences')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(MAIN_FLOW_UX_COPY.changeOccasionHint, 'success');
  };

  const handleSetImage = (file: File | null) => {
    setSourceWardrobeItem(null);
    setFlowPreviewUrl(null);
    setFlowPreviewCaption(null);
    setImage(file);
    setHighlightGenerateButton(false);
  };

  React.useEffect(() => {
    if (!highlightGenerateButton) return;
    const timer = window.setTimeout(() => setHighlightGenerateButton(false), 8000);
    return () => window.clearTimeout(timer);
  }, [highlightGenerateButton]);

  const handleUseCachedSuggestionWrapper = () => {
    handleUseCachedSuggestion();
    showToast('Loaded suggestion from history! 📋', 'success');
  };

  const handleGetNewSuggestionGuarded = async () => {
    if (guestLimitReached) return;
    await handleGetNewSuggestion();
  };

  const handleGetRandomFromHistory = async () => {
    try {
      const result = await loadRandomFromHistory(ensureFullHistory);
      if (result === 'empty') {
        showToast('No history yet. Get some outfit suggestions first! 📋', 'error');
        return;
      }
      navigate(ROUTES.MAIN);
      showToast('Random outfit from your history! 📋', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load history';
      showToast(errorMessage, 'error');
    }
  };

  const runWardrobeAnalysis = async (mode: 'free' | 'premium') => {
    if (!isAuthenticated) {
      showToast('Please login to analyze your wardrobe.', 'error');
      return;
    }

    setWardrobeAnalysisLoadingMessage(
      mode === 'premium'
        ? INSIGHTS_COPY.LOADING_AI
        : INSIGHTS_COPY.LOADING_QUICK
    );
    wardrobeAnalysisAbortRef.current?.abort();
    const abortController = new AbortController();
    wardrobeAnalysisAbortRef.current = abortController;
    setWardrobeGapLoading(true);
    setWardrobeGapError(null);
    try {
      const resolved = resolveFilters(filters);
      const result = await ApiService.analyzeWardrobeGaps({
        occasion: resolved.occasion,
        season: resolved.season,
        style: resolved.style,
        text_input: preferenceText || '',
        analysis_mode: mode,
      }, abortController.signal);
      setWardrobeGapResult(result);
      navigate(ROUTES.INSIGHTS);
      showToast(
        mode === 'premium'
          ? INSIGHTS_COPY.TOAST_AI_READY
          : 'Wardrobe analysis is ready. ✅',
        'success'
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to analyze wardrobe';
      setWardrobeGapError(message);
      showToast(message, 'error');
    } finally {
      setWardrobeGapLoading(false);
      wardrobeAnalysisAbortRef.current = null;
    }
  };

  const handleCancelAiOperation = () => {
    if (loading) {
      cancelOperation();
      showToast('Outfit generation cancelled', 'success');
    }
    if (wardrobeGapLoading) {
      wardrobeAnalysisAbortRef.current?.abort();
      setWardrobeGapLoading(false);
      wardrobeAnalysisAbortRef.current = null;
      showToast('Wardrobe analysis cancelled', 'success');
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
    clearMainFlowOnLogout();
    logout();
    showToast('Logged out successfully', 'success');
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-navy">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue mx-auto"></div>
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
  const appBusyOperationType = wardrobeGapLoading
    ? 'wardrobe-analysis' as const
    : (activeOperation ?? 'outfit-suggestion');

  return (
    <div 
      className="relative min-h-screen overflow-x-hidden bg-brand-navy text-white"
    >
      {/* Subtle gradient orbs */}
      <div className="fixed inset-0 opacity-20 md:opacity-25 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-brand-blue blur-3xl" />
        <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-brand-purple blur-3xl" />
      </div>

      <NavBar
        isAuthenticated={isAuthenticated}
        user={user}
        testRunnerEnabled={testRunnerEnabled}
        hideGuestAuthActions={guestLimitReached}
        onLogin={() => {
          setLoginPromptContext(null);
          setShowRegister(false);
          setShowLoginModal(true);
        }}
        onSignUp={() => {
          setLoginPromptContext(null);
          setShowRegister(true);
          setShowLoginModal(false);
        }}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div 
        className="relative container mx-auto px-3 sm:px-4 py-4 sm:py-8"
      >
        <Routes>
          <Route
            path={ROUTES.MAIN}
            element={
          guestLimitReached ? (
            <div className="flex min-h-[60vh] items-center justify-center">
              <AuthGateCard
                contextKey="guest-limit"
                onCreateAccount={() => openAuthPromptRegister('guest-limit')}
                onSignIn={() => openAuthPromptSignIn('guest-limit')}
              />
            </div>
          ) : (
          <>
            {/* Main flow — side-by-side from md (matches iPad regular width) */}
            <div className="mx-auto grid max-w-[980px] grid-cols-1 items-start gap-8 md:grid-cols-2 md:items-stretch md:gap-5">
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
                onOpenInsights={isAuthenticated ? () => navigate(ROUTES.INSIGHTS) : undefined}
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
                onClearPreferences={clearPreferences}
                sourceWardrobeItem={sourceWardrobeItem}
                highlightGenerateButton={highlightGenerateButton}
                onChangeWardrobeItem={
                  isAuthenticated ? () => navigate(ROUTES.WARDROBE) : undefined
                }
                onClearSourceWardrobeItem={() => setSourceWardrobeItem(null)}
                flowPreviewUrl={flowPreviewUrl}
                flowPreviewCaption={flowPreviewCaption}
                inputPanelSource={inputPanelSource}
                summaryFilters={summaryFilters}
                summaryPreferenceText={summaryPreferenceText}
                guestRemaining={guestRemaining}
                guestLimitReached={guestLimitReached}
                hasSuggestion={!!currentSuggestion}
                onStartFreshUpload={startFreshUpload}
                onGenerateAnother={handleGenerateAnother}
                onAddToWardrobe={async () => {
                  if (!image) {
                    showToast('Please upload an image first to add it to your wardrobe', 'error');
                    return;
                  }

                  if (addingToWardrobe || wardrobeLoading) {
                    return;
                  }

                  setAddingToWardrobe(true);
                  try {
                    const duplicateCheck = await ApiService.checkWardrobeDuplicate(image);
                    
                    if (duplicateCheck.is_duplicate && duplicateCheck.existing_item) {
                      setDuplicateWardrobeItem(duplicateCheck.existing_item);
                      setWardrobeImageToAdd(image);
                      setShowWardrobeDuplicateModal(true);
                      setAddingToWardrobe(false);
                      return;
                    }
                    
                    const properties = await analyzeImage(image, 'blip');
                    
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
                  } finally {
                    setAddingToWardrobe(false);
                  }
                }}
                addingToWardrobe={addingToWardrobe}
                recentLooksHistory={history}
                recentLooksLoading={historyLoading}
                onViewAllRecentLooks={() => navigate(ROUTES.HISTORY)}
              />

              <div className="flex h-full min-h-0 flex-col">
              <OutfitPreview
                suggestion={currentSuggestion}
                loading={loading}
                error={error}
                filters={filters}
                hasImage={!!image}
                canGenerateAnother={canGenerateAnother}
                onGenerateAnother={handleGenerateAnother}
                onMakeMoreFormal={handleMakeMoreFormal}
                onMakeMoreCasual={handleMakeMoreCasual}
                onUseWardrobeOnly={handleUseWardrobeOnlyFromResult}
                onChangeOccasion={handleChangeOccasion}
                showWardrobeOnlyAction={isAuthenticated}
                isAuthenticated={isAuthenticated}
                guestLimitReached={guestLimitReached}
              />
              </div>
            </div>

            {!isAuthenticated && showFirstOutfitBanner && currentSuggestion && (
              <FirstOutfitPromptBanner
                onCreateAccount={() => openAuthPromptRegister('first-outfit')}
                onSignIn={() => openAuthPromptSignIn('first-outfit')}
                onDismiss={dismissFirstOutfitBanner}
              />
            )}

            <div className="md:hidden">
              <HowItWorksStepper />
            </div>
            <div className="md:hidden">
              <RecentLooksSection
                history={history}
                loading={historyLoading}
                isAuthenticated={isAuthenticated}
                onViewAll={() => navigate(ROUTES.HISTORY)}
              />
            </div>
          </>
          )
            }
          />

          <Route
            path={ROUTES.WARDROBE}
            element={
          !isAuthenticated ? (
            <AuthGateCard
              contextKey="wardrobe"
              onCreateAccount={() => openAuthPromptRegister('wardrobe')}
              onSignIn={() => openAuthPromptSignIn('wardrobe')}
            />
          ) : (
            <ErrorBoundary label="Wardrobe" resetKey={location.pathname}>
              <Wardrobe 
                initialCategory={wardrobeCategoryFilter}
                isAuthenticated={isAuthenticated}
                onAnalyzeWardrobe={handleAnalyzeWardrobe}
                analyzingWardrobe={wardrobeGapLoading}
                onSuggestionReady={(suggestion) => {
                  // Suggestion is already set by the outfit controller's getSuggestion
                  setCurrentSuggestion(suggestion);
                }}
                onNavigateToMain={() => {
                  navigate(ROUTES.MAIN);
                }}
                onSourceImageLoaded={() => {
                  setHighlightGenerateButton(true);
                  showToast('Item loaded on Suggest — set your preferences, then tap Generate Outfit.', 'success');
                }}
                outfitController={{
                  setImage,
                  setSourceWardrobeItem,
                  prepareStyleFromWardrobeItem,
                  completeOutfitFromWardrobeSelection,
                  getSuggestion,
                  filters,
                  setFilters,
                  preferenceText,
                  setPreferenceText,
                  loading,
                  error,
                  showDuplicateModal,
                  handleUseCachedSuggestion,
                  useWardrobeOnly,
                  setUseWardrobeOnly,
                }}
              />
            </ErrorBoundary>
          )
            }
          />

          <Route
            path={ROUTES.INSIGHTS}
            element={
          isAuthenticated ? (
            <WardrobeInsightsPage
              result={wardrobeGapResult}
              loading={wardrobeGapLoading}
              error={wardrobeGapError}
              isAdmin={!!user?.is_admin}
              filters={filters}
              setFilters={setFilters}
              preferenceText={preferenceText}
              setPreferenceText={setPreferenceText}
              onClearPreferences={clearPreferences}
              onAnalyze={handleAnalyzeWardrobe}
              onNavigateToGuide={() => navigate(ROUTES.GUIDE)}
              onNavigateToWardrobe={() => navigate(ROUTES.WARDROBE)}
              onNewAnalysis={() => setWardrobeGapResult(null)}
            />
          ) : (
            <AuthGateCard
              contextKey="insights"
              onCreateAccount={() => openAuthPromptRegister('insights')}
              onSignIn={() => openAuthPromptSignIn('insights')}
            />
          )
            }
          />

          <Route
            path={ROUTES.ADMIN_REPORTS}
            element={
          isAuthenticated && user && user.is_admin ? (
            <ErrorBoundary label="Reports" resetKey={location.pathname}>
              <AdminReports user={user} />
            </ErrorBoundary>
          ) : (
            <Navigate to={ROUTES.MAIN} replace />
          )
            }
          />

          <Route
            path={ROUTES.ADMIN_INTEGRATION_TESTS}
            element={
          isAuthenticated && user && user.is_admin ? (
            testRunnerEnabled ? (
              <ErrorBoundary label="Integration Tests" resetKey={location.pathname}>
                <AdminIntegrationTestRunner user={user} />
              </ErrorBoundary>
            ) : (
              <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 shadow-xl backdrop-blur p-8 text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Integration Tests</h2>
                <p className="text-slate-200 mb-6">Test Runner is disabled in this environment.</p>
              </div>
            )
          ) : (
            <Navigate to={ROUTES.MAIN} replace />
          )
            }
          />

          <Route
            path={ROUTES.HISTORY}
            element={
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
            <AuthGateCard
              contextKey="history"
              onCreateAccount={() => openAuthPromptRegister('history')}
              onSignIn={() => openAuthPromptSignIn('history')}
            />
          )
            }
          />

          <Route path={ROUTES.ABOUT} element={<About isAdmin={!!user?.is_admin} />} />

          <Route path={ROUTES.GUIDE} element={<UserGuide isAdmin={!!user?.is_admin} />} />

          <Route
            path={ROUTES.SETTINGS}
            element={
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
                      className="px-4 py-2 btn-brand rounded-full"
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
                    onClick={() => navigate(ROUTES.WARDROBE)}
                    className="px-4 py-2 bg-slate-600 text-white rounded-full hover:bg-slate-500 transition-colors"
                  >
                    👔 Manage Wardrobe
                  </button>
                </div>
              </div>
            </div>
          </div>
          ) : (
            <AuthGateCard
              contextKey="settings"
              onCreateAccount={() => openAuthPromptRegister('settings')}
              onSignIn={() => openAuthPromptSignIn('settings')}
            />
          )
            }
          />

          <Route path="*" element={<Navigate to={ROUTES.MAIN} replace />} />
        </Routes>
      </div>

      {/* Intro overlay - shown once after first successful login/register */}
      {showIntroOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="relative max-w-3xl w-full mx-4 rounded-3xl overflow-hidden shadow-2xl">
            <button
              type="button"
              onClick={() => setShowIntroOverlay(false)}
              className="absolute top-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white text-sm hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
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
            onClick={closeAuthModal}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-w-md w-full transform transition-all backdrop-blur">
              <button
                onClick={closeAuthModal}
                className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
              >
                ✕
              </button>
              {showRegister ? (
                <Register
                  headline={authModalCopy?.headline}
                  subheadline={authModalCopy?.subheadline}
                  onRegister={async (data) => {
                    const success = await handleRegister(data);
                    if (success) {
                      closeAuthModal();
                      setShowFirstOutfitBanner(false);
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
                  headline={authModalCopy?.headline}
                  subheadline={authModalCopy?.subheadline}
                  onLogin={async (credentials) => {
                    const success = await handleLogin(credentials);
                    if (success) {
                      closeAuthModal();
                      setShowFirstOutfitBanner(false);
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
        onCancel={handleGetNewSuggestionGuarded}
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
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
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
                    className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/5 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
                    rows={3}
                    placeholder="e.g., Classic fit, casual style"
                    required
                  />
                </div>

                <div className="bg-brand-gradient-soft border border-brand-blue/30 rounded-lg p-3 mb-4">
                  <p className="text-sm text-slate-200">
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
                    className="flex-1 px-6 py-3 btn-brand rounded-full font-semibold transition-all disabled:opacity-50"
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

      {/* AI progress panel — keeps the page visible while blocking duplicate submissions via button disabled states */}
      <LoadingOverlay
        isLoading={appBusy}
        operationType={appBusyOperationType}
        message={appBusyMessage}
        onCancel={handleCancelAiOperation}
      />

      {/* Wardrobe Analysis Mode Picker */}
      {showWardrobeAnalysisModeModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setShowWardrobeAnalysisModeModal(false)}
          ></div>
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative rounded-2xl bg-slate-900 border border-white/10 shadow-2xl max-w-md w-full p-6 transform transition-all backdrop-blur">
              <h3 className="text-lg font-semibold text-white text-center mb-2">{INSIGHTS_COPY.MODE_PICKER_TITLE}</h3>
              <p className="text-sm text-slate-200 text-center mb-6">
                {INSIGHTS_COPY.MODE_PICKER_SUBTITLE}
              </p>
              <div className="space-y-3">
                <button
                  onClick={async () => {
                    setShowWardrobeAnalysisModeModal(false);
                    await runWardrobeAnalysis('free');
                  }}
                  className="w-full rounded-xl border border-brand-blue/30 bg-brand-blue/10 px-4 py-3 text-left transition hover:bg-brand-blue/20"
                >
                  <div className="text-sm font-semibold text-brand-blue">{INSIGHTS_COPY.QUICK_WARDROBE_CHECK}</div>
                  <div className="text-xs text-slate-300 mt-1">
                    {INSIGHTS_COPY.QUICK_MODE_SUBTITLE}
                  </div>
                </button>
                <button
                  onClick={async () => {
                    setShowWardrobeAnalysisModeModal(false);
                    await runWardrobeAnalysis('premium');
                  }}
                  className="w-full rounded-xl border border-brand-blue/30 bg-brand-purple/15 px-4 py-3 text-left transition hover:bg-brand-purple/25"
                >
                  <div className="text-sm font-semibold text-brand-purple/90">{INSIGHTS_COPY.AI_STYLIST_REVIEW}</div>
                  <div className="text-xs text-brand-purple/90 mt-1">
                    {INSIGHTS_COPY.AI_MODE_SUBTITLE}
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
        onOpenUserGuide={() => navigate(ROUTES.GUIDE)}
        onOpenAbout={() => navigate(ROUTES.ABOUT)}
      />
    </div>
  );
}

export default App;
