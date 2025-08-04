import React from "react";

export const ParameterSlider = ({ label, value, min, max, step, onChange, unit = '', disabled = false }) => {
  return (
    <div className="flex-1 min-w-[220px]">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}: {value.toFixed(2)} {unit}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}; 