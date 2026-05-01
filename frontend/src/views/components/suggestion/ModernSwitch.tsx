import React from 'react';

interface ModernSwitchProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  id: string;
}

const ModernSwitch: React.FC<ModernSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  id,
}) => {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-slate-100">
          {label}
        </label>
        {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
      </div>
      <button
        type="button"
        id={id}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
          checked ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 'bg-white/20'
        }`}
        role="switch"
        aria-checked={checked}
        aria-label={label}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

export default ModernSwitch;
