import React from 'react';

interface UploadBoxProps {
  isDragging: boolean;
  imagePreviewUrl: string | null;
  imageName: string | null;
  maxSizeMb: number;
  onClick: () => void;
  onPreviewClick: () => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

const UploadBox: React.FC<UploadBoxProps> = ({
  isDragging,
  imagePreviewUrl,
  imageName,
  maxSizeMb,
  onClick,
  onPreviewClick,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}) => {
  return (
    <div
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className={`w-full cursor-pointer rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all duration-200 ${
        isDragging
          ? 'border-teal-300 bg-gradient-to-b from-teal-400/20 to-cyan-400/10'
          : 'border-slate-500/40 bg-gradient-to-b from-slate-800/70 to-slate-900/40 hover:border-teal-400/70 hover:from-slate-700/70 hover:to-slate-900/50'
      }`}
      role="button"
      tabIndex={0}
      aria-label="Upload clothing photo - click or drag and drop"
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      {imagePreviewUrl ? (
        <div className="mx-auto max-w-xs space-y-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPreviewClick();
            }}
            className="block w-full overflow-hidden rounded-xl border border-white/15 bg-slate-900/70 transition hover:border-teal-300/70 focus:outline-none focus:ring-2 focus:ring-teal-400"
            aria-label="View full size image"
          >
            <img src={imagePreviewUrl} alt="Uploaded clothing" className="h-40 w-full object-contain" />
          </button>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <p className="truncate text-sm text-slate-100">{imageName}</p>
          </div>
          <p className="text-xs text-slate-400">Drag & drop or click to replace</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-3xl">{isDragging ? '↘' : '⤴'}</div>
          <p className="text-sm font-medium text-slate-100">Drag & drop or click to upload</p>
          <p className="text-xs text-slate-400">JPG, PNG, WebP up to {maxSizeMb}MB</p>
        </div>
      )}
    </div>
  );
};

export default UploadBox;
