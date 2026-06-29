import React, { useEffect, useRef, useState } from 'react';
import { MAIN_FLOW_UX_COPY } from '../../utils/mainFlowUxCopy';

export interface RefineMenuProps {
  onMakeMoreFormal?: () => void;
  onMakeMoreCasual?: () => void;
  onUseWardrobeOnly?: () => void;
  onChangeOccasion?: () => void;
  showWardrobeOnlyAction?: boolean;
  refineDisabled?: boolean;
  wardrobeOnlyDisabled?: boolean;
  variant?: 'default' | 'compact';
  wrapperClassName?: string;
}

const RefineMenu: React.FC<RefineMenuProps> = ({
  onMakeMoreFormal,
  onMakeMoreCasual,
  onUseWardrobeOnly,
  onChangeOccasion,
  showWardrobeOnlyAction = true,
  refineDisabled = false,
  wardrobeOnlyDisabled = false,
  variant = 'default',
  wrapperClassName = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const run = (handler?: () => void, requiresImage = true) => {
    if (!handler || (requiresImage && refineDisabled)) return;
    setOpen(false);
    handler();
  };

  const buttonClass =
    variant === 'compact'
      ? 'min-h-[44px] w-full flex-1 rounded-xl border border-white/20 bg-white/5 px-2 py-2 text-xs font-medium text-slate-100 transition hover:border-brand-purple/60 hover:bg-brand-purple/10 disabled:cursor-not-allowed disabled:opacity-40 md:min-h-[48px] md:text-sm'
      : 'min-h-[48px] w-full touch-manipulation rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-slate-100 transition hover:border-brand-purple/60 hover:bg-brand-purple/10 disabled:cursor-not-allowed disabled:opacity-40';

  const panelPositionClass =
    variant === 'compact'
      ? 'absolute bottom-full right-0 mb-2'
      : 'absolute bottom-full right-0 mb-2 sm:bottom-auto sm:top-full sm:mb-0 sm:mt-2';

  return (
    <div
      ref={containerRef}
      className={`relative ${open ? 'z-[60]' : ''} ${wrapperClassName}`.trim()}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={refineDisabled && !onChangeOccasion}
        className={buttonClass}
        aria-label={MAIN_FLOW_UX_COPY.refine}
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="refine-menu-trigger"
      >
        {MAIN_FLOW_UX_COPY.refine}
      </button>

      {open && (
        <div
          role="menu"
          className={`${panelPositionClass} z-[100] min-w-[220px] overflow-hidden rounded-xl border border-white/15 bg-slate-900/95 py-1 shadow-xl backdrop-blur`}
          data-testid="refine-menu-panel"
        >
          {onMakeMoreFormal && (
            <button
              type="button"
              role="menuitem"
              disabled={refineDisabled}
              onClick={() => run(onMakeMoreFormal, true)}
              className="block w-full px-4 py-2.5 text-left text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {MAIN_FLOW_UX_COPY.refineMoreFormal}
            </button>
          )}
          {onMakeMoreCasual && (
            <button
              type="button"
              role="menuitem"
              disabled={refineDisabled}
              onClick={() => run(onMakeMoreCasual, true)}
              className="block w-full px-4 py-2.5 text-left text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {MAIN_FLOW_UX_COPY.refineMoreCasual}
            </button>
          )}
          {showWardrobeOnlyAction && onUseWardrobeOnly && (
            <button
              type="button"
              role="menuitem"
              disabled={wardrobeOnlyDisabled}
              onClick={() => run(onUseWardrobeOnly, true)}
              className="block w-full px-4 py-2.5 text-left text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {MAIN_FLOW_UX_COPY.refineWardrobeOnly}
            </button>
          )}
          {onChangeOccasion && (
            <button
              type="button"
              role="menuitem"
              onClick={() => run(onChangeOccasion, false)}
              className="block w-full px-4 py-2.5 text-left text-sm text-slate-100 transition hover:bg-white/10"
            >
              {MAIN_FLOW_UX_COPY.refineChangeOccasion}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RefineMenu;
