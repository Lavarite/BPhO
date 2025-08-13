import React, { useState } from 'react';
import { isMobile } from 'react-device-detect';

export const ResearchPage = ({ isSmallViewport }) => {
  const [isLoading, setIsLoading] = useState(true);
  const file = `https://bpho.vasylevskyi.net/PDFs/Research.pdf`;
  const viewer = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(file)}`;

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="h-[85vh] w-full relative">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col justify-center items-center bg-gray-50 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading PDF...</h2>
          <p className="text-gray-500 text-center px-4">
            Please wait while we load the Research PDF
          </p>
        </div>
      )}

      <iframe
        src={isMobile ? viewer : file}
        title="Research PDF"
        width="100%"
        height="100%"
        className="block border-none"
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

