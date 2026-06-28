import React, { useRef, useState, useEffect, useMemo } from 'react';
import { InputPanelSource, OutfitHistoryEntry, SourceWardrobeItem } from '../../models/OutfitModels';
import { isValidImageSize, formatFileSize, createImagePreviewUrl, revokeImagePreviewUrl } from '../../utils/imageUtils';
import { CLIENT_MAX_SIZE_MB } from '../../constants/imageLimits';
import ModernSwitch from './suggestion/ModernSwitch';
import AnalysisPreferences from './AnalysisPreferences';
import FirstRunCoach from './FirstRunCoach';
import MainFlowCompactSummary from './MainFlowCompactSummary';
import RecentLooksSection from './RecentLooksSection';
import { DEFAULT_FILTERS } from '../../utils/outfitPreferences';
import { MICRO_HELP } from '../../utils/microHelpCopy';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';
import {
  canGenerateAnotherFromResult,
  shouldShowCompactUploadActions,
} from '../../utils/mainFlowResultRegenerate';
import {
  isFirstRunCoachDismissed,
  isFirstRunPrefsExpanded,
  setFirstRunPrefsExpanded,
} from '../../utils/firstRunCoach';
import { showsCompactResultLayout } from '../../utils/mainFlowLayoutLogic';

interface Filters {
  occasion: string;
  season: string;
  style: string;
}

function occasionDisplay(v: string): string {
  const m: Record<string, string> = {
    everyday: 'Everyday',
    work: 'Work',
    'date-night': 'Date Night',
    'dinner-night-out': 'Dinner / Night Out',
    party: 'Party',
    'wedding-guest': 'Wedding Guest',
    'formal-event': 'Formal Event',
    travel: 'Travel',
    workout: 'Workout',
    errands: 'Errands',
    lounge: 'Lounge',
    outdoor: 'Outdoor',
  };
  return v ? m[v] || v : 'Everyday';
}

function seasonDisplay(v: string): string {
  const m: Record<string, string> = {
    spring: 'Spring',
    summer: 'Summer',
    fall: 'Fall',
    winter: 'Winter',
    transitional: 'Transitional',
    'all-season': 'All Season',
  };
  return v ? m[v] || v : 'All Season';
}

function styleDisplay(v: string): string {
  const m: Record<string, string> = {
    classic: 'Classic',
    minimal: 'Minimal',
    'smart-casual': 'Smart Casual',
    streetwear: 'Streetwear',
    sporty: 'Sporty',
    preppy: 'Preppy',
    boho: 'Boho',
    edgy: 'Edgy',
    romantic: 'Romantic',
    trendy: 'Trendy',
    vintage: 'Vintage',
    elegant: 'Elegant',
  };
  return v ? m[v] || v : 'Classic';
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

const UploadIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
  </svg>
);

const CameraIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
  </svg>
);

const GalleryIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const DragDropIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
  </svg>
);

const HangerIcon = () => (
  <svg className="h-5 w-5 text-brand-purple" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v.75M17.25 3v.75M6.75 3a2.25 2.25 0 012.25-2.25h6.5A2.25 2.25 0 0117.25 3v.75M6.75 3h10.5M3.75 7.5h16.5l-1.5 9.75A2.25 2.25 0 0116.5 19.5h-9a2.25 2.25 0 01-2.25-2.25L3.75 7.5z" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
);

const LockIcon = () => (
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

const SparkleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5L12 2z" />
  </svg>
);

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
  onOpenInsights?: () => void;
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
  onClearPreferences?: () => void;
  sourceWardrobeItem?: SourceWardrobeItem | null;
  highlightGenerateButton?: boolean;
  onChangeWardrobeItem?: () => void;
  onClearSourceWardrobeItem?: () => void;
  flowPreviewUrl?: string | null;
  flowPreviewCaption?: string | null;
  inputPanelSource?: InputPanelSource;
  summaryFilters?: Filters | null;
  summaryPreferenceText?: string | null;
  guestRemaining?: number | null;
  guestLimitReached?: boolean;
  hasSuggestion?: boolean;
  onStartFreshUpload?: (file: File) => void;
  onGenerateAnother?: () => void;
  recentLooksHistory?: OutfitHistoryEntry[];
  recentLooksLoading?: boolean;
  onViewAllRecentLooks?: () => void;
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
  onOpenInsights,
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
  setShowAiPromptResponse,
  onClearPreferences,
  sourceWardrobeItem = null,
  highlightGenerateButton = false,
  onChangeWardrobeItem,
  onClearSourceWardrobeItem,
  flowPreviewUrl = null,
  flowPreviewCaption = null,
  inputPanelSource = null,
  summaryFilters = null,
  summaryPreferenceText = null,
  guestRemaining = null,
  guestLimitReached = false,
  hasSuggestion = false,
  onStartFreshUpload,
  onGenerateAnother,
  recentLooksHistory = [],
  recentLooksLoading = false,
  onViewAllRecentLooks,
}) => {
  const generateButtonRef = useRef<HTMLButtonElement>(null);
  const moreOptionsRef = useRef<HTMLDetailsElement>(null);
  const generateDisabled = !image || loading || guestLimitReached;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showEnlargeImage, setShowEnlargeImage] = useState(false);
  const [coachDismissed, setCoachDismissed] = useState(() => isFirstRunCoachDismissed());
  const [prefsManuallyExpanded, setPrefsManuallyExpanded] = useState(() => isFirstRunPrefsExpanded());

  const showCollapsedPrefs = !coachDismissed && !hasSuggestion && !prefsManuallyExpanded;

  useEffect(() => {
    if (hasSuggestion && !coachDismissed) {
      setCoachDismissed(true);
    }
  }, [hasSuggestion, coachDismissed]);

  const imagePreviewUrl = useMemo(() => (image ? createImagePreviewUrl(image) : null), [image]);
  const effectivePreviewUrl = imagePreviewUrl ?? flowPreviewUrl ?? null;
  const previewCaption = useMemo(() => {
    if (inputPanelSource === 'history') {
      return flowPreviewCaption ?? MAIN_FLOW_UX_COPY.fromHistory;
    }
    if (inputPanelSource === 'wardrobe') {
      return flowPreviewCaption ?? undefined;
    }
    if (sourceWardrobeItem) {
      return `Wardrobe · ${sourceWardrobeItem.category}`;
    }
    return image?.name ?? flowPreviewCaption ?? undefined;
  }, [inputPanelSource, sourceWardrobeItem, image, flowPreviewCaption]);

  useEffect(() => {
    if (!highlightGenerateButton || !generateButtonRef.current) return;
    generateButtonRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [highlightGenerateButton, sourceWardrobeItem?.id]);
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) revokeImagePreviewUrl(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasCamera(devices.some((device) => device.kind === 'videoinput'));
      } catch {
        setHasCamera(false);
      }
    };
    checkCamera();
  }, []);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  const compactMode = showsCompactResultLayout(
    hasSuggestion,
    sourceWardrobeItem?.id ?? null,
    highlightGenerateButton
  );
  const showCompactUploadActions = compactMode && shouldShowCompactUploadActions(hasSuggestion);
  const showGenerateAnotherInSidebar = canGenerateAnotherFromResult(
    inputPanelSource,
    !!image,
    !!effectivePreviewUrl,
    hasSuggestion
  );

  const applySelectedFile = (file: File) => {
    if (compactMode && onStartFreshUpload) {
      onStartFreshUpload(file);
    } else {
      setImage(file);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isValidImageSize(file, CLIENT_MAX_SIZE_MB)) {
        onFileReject?.(`Image must be under ${CLIENT_MAX_SIZE_MB}MB (current: ${formatFileSize(file.size)})`);
        event.target.value = '';
        return;
      }
      applySelectedFile(file);
    }
  };

  const handleClearPreferences = () => {
    if (onClearPreferences) {
      onClearPreferences();
      return;
    }
    setFilters({ ...DEFAULT_FILTERS });
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
    if (files?.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        if (!isValidImageSize(file, CLIENT_MAX_SIZE_MB)) {
          onFileReject?.(`Image must be under ${CLIENT_MAX_SIZE_MB}MB (current: ${formatFileSize(file.size)})`);
          return;
        }
        applySelectedFile(file);
      }
    }
  };

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
    } catch {
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
            applySelectedFile(new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' }));
            closeCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const preferencesHoverTitle = useMemo(() => {
    return preferenceSelectionSummary(filters, preferenceText);
  }, [filters, preferenceText]);

  const secondaryOptionsHoverTitle = useMemo(() => {
    const lines: string[] = [];
    if (onAddToWardrobe) {
      lines.push(image ? `Add to wardrobe: ready — ${image.name}` : 'Add to wardrobe: upload a photo first');
    }
    if (setUseWardrobeOnly) {
      lines.push(`Use my wardrobe only: ${useWardrobeOnly ? 'On' : 'Off'}`);
      lines.push(MICRO_HELP.WARDROBE_ONLY);
    }
    lines.push(
      'Random from Wardrobe uses the occasion, season, style, and notes in Preferences.',
      'Random from History loads a past saved suggestion.'
    );
    return lines.join('\n');
  }, [onAddToWardrobe, image, setUseWardrobeOnly, useWardrobeOnly]);

  const showWardrobeSection =
    isAuthenticated && (onAddToWardrobe || !!sourceWardrobeItem);

  const wardrobePrefsProps = {
    useWardrobeOnly,
    setUseWardrobeOnly,
    showWardrobeOnly: isAuthenticated && !!setUseWardrobeOnly,
  };

  const showRandomPicksSection =
    isAuthenticated && (onGetRandomSuggestion || onGetRandomFromHistory);

  const showAdvancedOptions = isAdmin;
  const showModelGenerationControls = isAdmin && modelGenerationEnabled;

  const advancedOptionsHoverTitle = useMemo(() => {
    const lines: string[] = [];
    if (showModelGenerationControls) {
      lines.push(
        generateModelImage
          ? 'Include AI model preview: On'
          : 'Include AI model preview: Off'
      );
      if (generateModelImage) {
        lines.push(`Image model: ${imageModel}`);
      }
    }
    if (setShowAiPromptResponse) {
      lines.push(`Show AI Prompt & Response: ${showAiPromptResponse ? 'On' : 'Off'}`);
    }
    return lines.join('\n');
  }, [
    showModelGenerationControls,
    generateModelImage,
    imageModel,
    setShowAiPromptResponse,
    showAiPromptResponse,
  ]);

  const detailsClass =
    'group mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]';
  const summaryClass =
    'flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 [&::-webkit-details-marker]:hidden';

  const selectClass =
    'w-full rounded-lg border border-white/15 bg-slate-800/80 px-3 py-2 text-sm text-white focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue';

  const openMoreOptions = () => {
    if (moreOptionsRef.current) {
      moreOptionsRef.current.open = true;
      moreOptionsRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const uploadCardClass = (active = false) =>
    `flex flex-col items-center gap-2 rounded-2xl border p-3 transition touch-manipulation sm:p-4 ${
      active
        ? 'border-brand-purple/60 bg-brand-purple/10'
        : 'border-white/10 bg-white/[0.03] hover:border-brand-purple/40 hover:bg-white/[0.05]'
    }`;

  return (
    <div
      className="md:sticky md:top-20"
      data-testid="main-flow-sidebar"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {!compactMode && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <HangerIcon />
            <div>
              <h1 className="text-lg font-semibold text-white sm:text-xl">Upload a clothing item</h1>
              <p className="mt-1 text-sm text-slate-400">
                We&apos;ll identify colors, fabric and style to suggest the perfect outfit.
              </p>
            </div>
          </div>
        </div>
      )}

      {compactMode && effectivePreviewUrl && (
        <div className="mt-4">
          <MainFlowCompactSummary
          filters={filters}
          preferenceText={preferenceText}
          imagePreviewUrl={effectivePreviewUrl}
          sourceWardrobeItem={inputPanelSource === 'history' ? null : sourceWardrobeItem}
          previewCaption={previewCaption}
          inputSource={inputPanelSource}
          summaryFilters={summaryFilters}
          summaryPreferenceText={summaryPreferenceText}
        />
        </div>
      )}

      {showCompactUploadActions && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3" data-testid="compact-upload-actions">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition touch-manipulation ${
                isDragging
                  ? 'border-brand-blue/60 bg-brand-gradient-soft'
                  : 'border-white/10 bg-white/[0.03] hover:border-brand-blue/40 hover:bg-white/[0.05]'
              }`}
              aria-label={MAIN_FLOW_UX_COPY.uploadNewItem}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-blue">
                <UploadIcon />
              </div>
              <span className="text-sm font-medium text-white">{MAIN_FLOW_UX_COPY.uploadNewItem}</span>
            </button>

            {hasCamera ? (
              <button
                type="button"
                onClick={openCamera}
                className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-brand-blue/40 hover:bg-white/[0.05] touch-manipulation"
                aria-label="Take photo with camera"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient-soft text-brand-blue">
                  <CameraIcon />
                </div>
                <span className="text-sm font-medium text-white">Take Photo</span>
              </button>
            ) : (
              <div
                className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-50"
                aria-hidden
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-500">
                  <CameraIcon />
                </div>
                <span className="text-sm font-medium text-slate-500">Take Photo</span>
              </div>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-slate-500">{MAIN_FLOW_UX_COPY.compactUploadHint}</p>
        </>
      )}

      {showCompactUploadActions && showGenerateAnotherInSidebar && onGenerateAnother && (
        <button
          type="button"
          onClick={onGenerateAnother}
          disabled={loading || guestLimitReached}
          className={`mt-4 flex w-full min-h-[48px] touch-manipulation items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 ${
            loading || guestLimitReached
              ? 'cursor-not-allowed bg-white/10 text-slate-500'
              : 'btn-brand'
          }`}
          aria-label={MAIN_FLOW_UX_COPY.generateAnother}
          data-testid="compact-generate-another"
        >
          <SparkleIcon />
          {MAIN_FLOW_UX_COPY.generateAnother}
        </button>
      )}

      {!coachDismissed && !compactMode && (
        <FirstRunCoach
          hasImage={!!image}
          hasSuggestion={hasSuggestion}
          onDismiss={() => {
            setCoachDismissed(true);
            setPrefsManuallyExpanded(true);
          }}
        />
      )}

      {!compactMode && sourceWardrobeItem && effectivePreviewUrl && (
        <div
          className="mt-5 rounded-2xl border border-brand-blue/40 bg-brand-gradient-soft p-4"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden>👔</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">From your wardrobe</p>
              <p className="mt-0.5 text-sm text-slate-200 capitalize">
                {sourceWardrobeItem.category}
                {sourceWardrobeItem.color ? ` · ${sourceWardrobeItem.color}` : ''}
              </p>
              <p className="mt-2 text-xs text-slate-300">
                Set occasion, season, and style below, then tap Generate Outfit.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {onChangeWardrobeItem && (
                  <button
                    type="button"
                    onClick={onChangeWardrobeItem}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    Change item
                  </button>
                )}
                {onClearSourceWardrobeItem && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearSourceWardrobeItem();
                      setImage(null);
                    }}
                    className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/10"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {!compactMode && effectivePreviewUrl && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <button
            type="button"
            onClick={() => setShowEnlargeImage(true)}
            className="block w-full overflow-hidden rounded-xl"
            aria-label="View full size image"
          >
            <img
              src={effectivePreviewUrl}
              alt={sourceWardrobeItem ? `Wardrobe ${sourceWardrobeItem.category}` : 'Uploaded clothing'}
              className="mx-auto max-h-36 object-contain"
            />
          </button>
          <p className="mt-2 truncate text-center text-xs text-slate-400">
            {previewCaption}
          </p>
          <p className="sr-only">JPG, PNG, WebP up to {CLIENT_MAX_SIZE_MB}MB</p>
        </div>
      )}

      {!compactMode && (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
          {hasCamera ? (
            <button
              type="button"
              onClick={openCamera}
              className={uploadCardClass()}
              aria-label="Take photo with camera"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/15 text-brand-purple">
                <CameraIcon />
              </div>
              <span className="text-center text-xs font-medium text-white sm:text-sm">Take Photo</span>
            </button>
          ) : (
            <div className={`${uploadCardClass()} opacity-50`} aria-hidden>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-500">
                <CameraIcon />
              </div>
              <span className="text-center text-xs font-medium text-slate-500 sm:text-sm">Take Photo</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            data-testid="main.uploadButton"
            className={uploadCardClass(isDragging)}
            aria-label="Upload clothing photo - click or drag and drop"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/15 text-brand-purple">
              <GalleryIcon />
            </div>
            <span className="text-center text-xs font-medium text-white sm:text-sm">Choose from Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={uploadCardClass(isDragging)}
            aria-label="Drag and drop image here"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-purple/15 text-brand-purple">
              <DragDropIcon />
            </div>
            <span className="text-center text-xs font-medium text-white sm:text-sm">Drag &amp; Drop</span>
            <span className="text-[10px] text-slate-500">PNG, JPG up to {CLIENT_MAX_SIZE_MB}MB</span>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="File input for clothing photo"
      />

      {!compactMode && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[10px] text-slate-500 sm:text-xs">
          <span className="inline-flex items-center gap-1">
            <LockIcon />
            Your photos are private
          </span>
          <span className="inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
            No background required
          </span>
          <span className="inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Takes about 5 seconds
          </span>
        </div>
      )}

      {compactMode ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Quick Preferences</h2>
            <span className="text-xs text-slate-500">Edit to refine your next look</span>
          </div>
          <AnalysisPreferences
            filters={filters}
            setFilters={setFilters}
            preferenceText={preferenceText}
            setPreferenceText={setPreferenceText}
            onClear={handleClearPreferences}
            variant="sidebar"
            quickLayout
            showSharedHint={false}
            {...wardrobePrefsProps}
          />
        </div>
      ) : showCollapsedPrefs ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Quick Preferences (optional)</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setFirstRunPrefsExpanded();
              setPrefsManuallyExpanded(true);
            }}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:border-brand-purple/40 hover:bg-white/[0.05]"
            aria-expanded="false"
            aria-controls="outfit-preferences"
            data-testid="first-run-prefs-collapsed"
          >
            <span className="text-sm text-slate-300">Occasion, season, style (optional)</span>
            <span className="flex items-center gap-1 text-xs font-medium text-brand-purple">
              Expand
              <span className="text-slate-500" aria-hidden>
                ▼
              </span>
            </span>
          </button>
        </div>
      ) : (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Quick Preferences (optional)</h2>
            <button
              type="button"
              onClick={openMoreOptions}
              className="text-xs font-medium text-brand-purple transition hover:text-brand-blue touch-manipulation"
              data-testid="main-flow-more-options-trigger"
            >
              More Options →
            </button>
          </div>
          <AnalysisPreferences
            filters={filters}
            setFilters={setFilters}
            preferenceText={preferenceText}
            setPreferenceText={setPreferenceText}
            onClear={handleClearPreferences}
            variant="sidebar"
            quickLayout
            showSharedHint={false}
            {...wardrobePrefsProps}
          />
        </div>
      )}

      {/* Primary: generate outfit */}
      {!compactMode && !isAuthenticated && guestRemaining !== null && guestRemaining > 0 && (
        <p className="mt-5 text-center text-xs text-slate-400">
          {guestRemaining} of 3 free AI suggestions left
        </p>
      )}

      {(!compactMode || (sourceWardrobeItem && image)) && (
        <button
          ref={generateButtonRef}
          onClick={onGetSuggestion}
          disabled={generateDisabled}
          className={`${!isAuthenticated && guestRemaining !== null && guestRemaining > 0 ? 'mt-2' : 'mt-5'} flex w-full min-h-[52px] touch-manipulation items-center justify-between gap-3 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white transition-all duration-200 ${
            generateDisabled
              ? 'cursor-not-allowed bg-white/10 text-slate-500'
              : highlightGenerateButton
                ? 'btn-brand animate-pulse ring-2 ring-brand-blue ring-offset-2 ring-offset-slate-900'
                : 'btn-brand'
          }`}
          aria-label={MAIN_FLOW_UX_COPY.primaryCtaAria}
        >
          {loading ? (
            <>
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Styling your outfit...
            </>
          ) : (
            <>
              <span className="flex items-center gap-2">
                <SparkleIcon />
                {MAIN_FLOW_UX_COPY.primaryCta}
              </span>
              <ArrowRightIcon />
            </>
          )}
        </button>
      )}

      {!compactMode && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
          <LockIcon />
          AI will analyze your item and create the best matching outfit.
        </p>
      )}

      {!compactMode && (
        <details ref={moreOptionsRef} className={`${detailsClass} mt-4`} data-testid="main-flow-more-options">
          <summary className={summaryClass}>
            <span>More options</span>
            <span className="text-slate-500 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-4 border-t border-white/10 px-4 py-4">
            {onAddToWardrobe && (
              <button
                onClick={onAddToWardrobe}
                disabled={!image || loading || addingToWardrobe}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  !image || loading || addingToWardrobe
                    ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
                    : 'border border-white/15 bg-white/5 text-slate-100 hover:border-brand-purple/40 hover:bg-brand-purple/10'
                }`}
                aria-label="Add current image to wardrobe"
              >
                {addingToWardrobe ? 'Adding...' : 'Add to Wardrobe'}
              </button>
            )}
            {onGetRandomSuggestion && (
              <button
                onClick={onGetRandomSuggestion}
                disabled={loading}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  loading
                    ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
                    : 'border border-white/15 bg-white/5 text-slate-200 hover:border-brand-purple/40 hover:bg-brand-purple/10'
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
                    : 'border border-white/15 bg-white/5 text-slate-200 hover:border-brand-blue/40 hover:bg-brand-blue/10'
                }`}
                aria-label="Show random outfit from your history"
              >
                Random from History
              </button>
            )}
            {showModelGenerationControls && setGenerateModelImage && (
              <ModernSwitch
                id="include-model-preview"
                checked={generateModelImage}
                onChange={(value) => setGenerateModelImage(value)}
                label="Include AI model preview"
                description={MICRO_HELP.MODEL_PREVIEW}
              />
            )}
            {showModelGenerationControls && generateModelImage && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Image model</label>
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className={selectClass}
                  aria-label="Select image generation model"
                >
                  <option value="dalle3">DALL-E 3 (OpenAI)</option>
                  <option value="stable-diffusion">Stable Diffusion</option>
                  <option value="nano-banana">Nano Banana</option>
                </select>
              </div>
            )}
            {isAdmin && setShowAiPromptResponse && (
              <ModernSwitch
                id="ai-prompt-response-toggle-more"
                checked={showAiPromptResponse}
                onChange={(value) => setShowAiPromptResponse(value)}
                label="Show AI Prompt & Response"
                description="Toggle full AI input/output panel in results."
              />
            )}
            <button
              type="button"
              onClick={handleClearPreferences}
              className="w-full py-2 text-xs text-slate-500 transition hover:text-slate-300"
              aria-label="Clear preferences"
            >
              Clear preferences
            </button>
            {isAuthenticated && onOpenInsights && (
              <button
                type="button"
                onClick={onOpenInsights}
                className="w-full text-left transition hover:text-brand-blue"
                aria-label="Open insights for wardrobe analysis"
              >
                <span className="text-xs text-slate-500">Open Insights →</span>
                <span className="mt-1 block text-[11px] leading-snug text-slate-500">
                  {MICRO_HELP.INSIGHTS}
                </span>
              </button>
            )}
          </div>
        </details>
      )}

      {compactMode && showWardrobeSection && (
        <details className={`${detailsClass} ${compactMode ? 'mt-4' : 'mt-5'}`}>
          <summary className={summaryClass}>
            <span>{MAIN_FLOW_UX_COPY.wardrobeSection}</span>
            <span className="text-slate-500 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-4 border-t border-white/10 px-4 py-4">
            {onAddToWardrobe && (
              <button
                onClick={onAddToWardrobe}
                disabled={!image || loading || addingToWardrobe}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                  !image || loading || addingToWardrobe
                    ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
                    : 'border border-white/15 bg-white/5 text-slate-100 hover:border-brand-blue/40 hover:bg-brand-blue/10'
                }`}
                aria-label="Add current image to wardrobe"
              >
                {addingToWardrobe ? 'Adding...' : 'Add to Wardrobe'}
              </button>
            )}
          </div>
        </details>
      )}

      {compactMode && showRandomPicksSection && (
        <details className={detailsClass}>
          <summary className={summaryClass}>
            <span>{MAIN_FLOW_UX_COPY.randomPicksSection}</span>
            <span className="text-slate-500 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-2 border-t border-white/10 px-4 py-4">
            {onGetRandomSuggestion && (
              <button
                onClick={onGetRandomSuggestion}
                disabled={loading}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                  loading
                    ? 'cursor-not-allowed border border-white/10 bg-white/10 text-slate-500'
                    : 'border border-white/15 bg-white/5 text-slate-200 hover:border-brand-purple/40 hover:bg-brand-purple/10'
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
                    : 'border border-white/15 bg-white/5 text-slate-200 hover:border-brand-blue/40 hover:bg-brand-blue/10'
                }`}
                aria-label="Show random outfit from your history"
              >
                Random from History
              </button>
            )}
          </div>
        </details>
      )}

      {/* Advanced: admin-only model & diagnostics (compact result mode) */}
      {compactMode && showAdvancedOptions && (
        <details className={detailsClass}>
          <summary className={summaryClass}>
            <span>{MAIN_FLOW_UX_COPY.advancedOptionsSection}</span>
            <span className="text-slate-500 transition-transform group-open:rotate-180">▼</span>
          </summary>
          <div className="space-y-4 border-t border-white/10 px-4 py-4">
            {showModelGenerationControls && setGenerateModelImage && (
              <ModernSwitch
                id="include-model-preview"
                checked={generateModelImage}
                onChange={(value) => setGenerateModelImage(value)}
                label="Include AI model preview"
                description={MICRO_HELP.MODEL_PREVIEW}
              />
            )}
            {showModelGenerationControls && generateModelImage && (
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Image model</label>
                <select
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className={selectClass}
                  aria-label="Select image generation model"
                >
                  <option value="dalle3">DALL-E 3 (OpenAI)</option>
                  <option value="stable-diffusion">Stable Diffusion</option>
                  <option value="nano-banana">Nano Banana</option>
                </select>
              </div>
            )}
            {setShowAiPromptResponse && (
              <ModernSwitch
                id="ai-prompt-response-toggle"
                checked={showAiPromptResponse}
                onChange={(value) => setShowAiPromptResponse(value)}
                label="Show AI Prompt & Response"
                description="Toggle full AI input/output panel in results."
              />
            )}
          </div>
        </details>
      )}

      {compactMode && (
        <button
          type="button"
          onClick={handleClearPreferences}
          className="mt-3 w-full py-2 text-xs text-slate-500 transition hover:text-slate-300"
          aria-label="Clear preferences"
        >
          Clear preferences
        </button>
      )}

      {compactMode && isAuthenticated && onOpenInsights && (
        <button
          type="button"
          onClick={onOpenInsights}
          className="mt-1 w-full text-center transition hover:text-brand-blue"
          aria-label="Open insights for wardrobe analysis"
        >
          <span className="text-xs text-slate-500">Open Insights →</span>
          <span className="mt-1 block text-[11px] leading-snug text-slate-500">
            {MICRO_HELP.INSIGHTS}
          </span>
        </button>
      )}

      {compactMode && isAuthenticated && onViewAllRecentLooks && (
        <div className="mt-6 hidden md:block" data-testid="sidebar-recent-looks">
          <RecentLooksSection
            history={recentLooksHistory}
            loading={recentLooksLoading}
            isAuthenticated={isAuthenticated}
            onViewAll={onViewAllRecentLooks}
            embedded
          />
        </div>
      )}

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h3 className="text-lg font-semibold text-white">Take Photo</h3>
              <button onClick={closeCamera} aria-label="Close camera" className="rounded p-2 text-slate-300 hover:bg-white/10">
                ✖
              </button>
            </div>
            <div className="p-4">
              <div className="relative overflow-hidden rounded-lg bg-black">
                <video ref={videoRef} autoPlay playsInline className="h-[400px] w-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>
            <div className="flex gap-3 border-t border-white/10 p-4">
              <button
                onClick={capturePhoto}
                className="btn-brand flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 font-medium"
              >
                Capture Photo
              </button>
              <button
                onClick={closeCamera}
                className="rounded-full border border-white/15 bg-white/10 px-6 py-3 font-medium text-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEnlargeImage && effectivePreviewUrl && (
        <div
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowEnlargeImage(false)}
        >
          <button
            type="button"
            onClick={() => setShowEnlargeImage(false)}
            aria-label="Close full image"
            className="absolute right-4 top-4 z-10 rounded-full bg-white/20 p-3 text-xl text-white"
          >
            ✕
          </button>
          <img
            src={effectivePreviewUrl}
            alt="Uploaded clothing - full size"
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Test compatibility tooltips */}
      <div role="tooltip" className="sr-only">
        {preferencesHoverTitle}
      </div>
      {(showWardrobeSection || showRandomPicksSection) && (
        <div role="tooltip" className="sr-only">
          {secondaryOptionsHoverTitle}
        </div>
      )}
      {showAdvancedOptions && (
        <div role="tooltip" className="sr-only">
          {advancedOptionsHoverTitle}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
