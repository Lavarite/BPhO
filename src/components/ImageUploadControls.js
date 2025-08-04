import React from 'react';
import { ParameterSlider } from './parameterSlider';

export const ImageUploadControls = ({
  onFileChange,
  onLoadSample,
  imageProcessing = false,
  parameters = [],
  children
}) => {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex flex-wrap items-center gap-3">
      {/* Upload */}
      <div className="flex-1 min-w-[140px]">
        <label
          htmlFor="fileInput"
          className={`w-full inline-flex justify-center items-center px-4 py-2 rounded-lg font-medium cursor-pointer transition-colors ${
            imageProcessing ? 'bg-blue-400 text-white opacity-50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          style={imageProcessing ? { pointerEvents: 'none' } : {}}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
          </svg>
          Upload Image
        </label>
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {/* Sample image */}
      <button
        onClick={onLoadSample}
        disabled={imageProcessing}
        className={`flex-1 min-w-[140px] inline-flex justify-center items-center px-4 py-2 rounded-lg font-medium transition-colors ${
          imageProcessing ? 'bg-gray-300 text-gray-400 opacity-50 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        }`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"></path>
        </svg>
        Use Sample Image
      </button>

      {/* Optional parameter sliders */}
      {parameters.length > 0 && (
        <div className="w-full flex flex-wrap gap-3 mt-3">
          {parameters.map((param, index) => (
            <ParameterSlider
              key={index}
              label={param.label}
              value={param.value}
              onChange={param.onChange}
              min={param.min}
              max={param.max}
              step={param.step}
              unit={param.unit}
              disabled={imageProcessing || param.disabled}
            />
          ))}
        </div>
      )}

      {/* Additional custom controls */}
      {children}
    </div>
  );
}; 