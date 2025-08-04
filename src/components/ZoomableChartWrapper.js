import React, { useState } from "react";
import { ResponsiveContainer, ReferenceArea } from "recharts";

/*
 * ZoomableChartWrapper
 * --------------------
 * A lightweight wrapper that adds click-and-drag X-axis zoom (via <ReferenceArea>)
 * and a "Zoom Out" reset button around any Recharts <LineChart> / <ComposedChart>.
 *
 * Props:
 *   data      – chart data array (required so we can compute default domain)
 *   xKey      – key of the x-axis value in each data object
 *   yKeys     – array of keys for y-axis values in each data object
 *   height    – number (px). Defaults to 400.
 *   className – optional extra classNames for the outer <div>
 *   children  – function ({ domain, handlers, refArea }) => ChartJSX
 *               Receives the current x-axis domain plus mouse handlers and the
 *               reference-area fragment to drop into the chart.
 *
 * Example usage:
 *   <ZoomableChartWrapper data={rows} xKey="wavelength">
 *     {({ domain, handlers, refArea }) => (
 *        <LineChart {...handlers} data={rows}>
 *          <XAxis dataKey="wavelength" type="number" domain={domain} />
 *          {refArea}
 *          ...
 *        </LineChart>
 *     )}
 *   </ZoomableChartWrapper>
 */
export const ZoomableChartWrapper = ({ data, xKey, yKeys = null, height = 400, className = "", children, initialYDomain = null, initialXDomain = null }) => {
  const xValues = data.map((d) => d[xKey]);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);

  const [left, setLeft] = useState('dataMin');
  const [right, setRight] = useState('dataMax');
  const [refLeft, setRefLeft] = useState('');
  const [refRight, setRefRight] = useState('');
  const [isZoomed, setIsZoomed] = useState(false);

  const onMouseDown = (e) => {
    if (e && e.activeLabel !== undefined) setRefLeft(e.activeLabel);
  };
  
  const onMouseMove = (e) => {
    if (refLeft && e && e.activeLabel !== undefined) setRefRight(e.activeLabel);
  };

  const zoom = () => {
    if (!refLeft || refLeft === refRight || refRight === '') {
      // Invalid selection – reset highlights
      setRefLeft('');
      setRefRight('');
      return;
    }
    
    // Convert to numbers for comparison
    let leftNum = Number(refLeft);
    let rightNum = Number(refRight);
    
    // Ensure left < right
    if (leftNum > rightNum) [leftNum, rightNum] = [rightNum, leftNum];
    
    setLeft(leftNum);
    setRight(rightNum);
    setRefLeft('');
    setRefRight('');
    setIsZoomed(true);
  };

  const zoomOut = () => {
    setLeft('dataMin');
    setRight('dataMax');
    setRefLeft('');
    setRefRight('');
    setIsZoomed(false);
  };

  // Handlers object passed straight into the chart element
  const handlers = {
    onMouseDown,
    onMouseMove,
    onMouseUp: zoom,
  };

  const refArea =
    refLeft && refRight ? (
      <ReferenceArea x1={refLeft} x2={refRight} strokeOpacity={0.3} />
    ) : null;

  return (
    <div
      className={`zoomable-chart-wrapper w-full relative ${className}`}
      style={{ userSelect: 'none' }}
    >
      {/* Zoom-out button (absolute overlay) - only show when zoomed */}
      {isZoomed && (
        <button
          type="button"
          onClick={zoomOut}
          aria-label="Zoom Out"
          className="absolute top-1 right-4 p-1.5 rounded-full bg-white shadow-md hover:bg-gray-100 focus:outline-none z-10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-700"
          >
            <path d="M21 3L3 21" />
            <path d="M21 21L3 3" />
          </svg>
        </button>
      )}

      <ResponsiveContainer width="100%" height={height}>
        {(() => {
          let xDomain = [
            left === 'dataMin' ? (initialXDomain ? initialXDomain[0] : minX) : left, 
            right === 'dataMax' ? (initialXDomain ? initialXDomain[1] : maxX) : right
          ];

          // Compute y-domain
          let yDomain = null;
          if (yKeys && Array.isArray(yKeys) && yKeys.length) {
            const subset = data.filter((d) => {
              const xVal = d[xKey];
              // Ensure domain values are numbers for comparison
              const xDomainNum = [
                  left === 'dataMin' ? -Infinity : Number(xDomain[0]),
                  right === 'dataMax' ? Infinity : Number(xDomain[1])
              ];
              return xVal >= xDomainNum[0] && xVal <= xDomainNum[1];
            });
            if (subset.length) {
              let yMin = Infinity;
              let yMax = -Infinity;
              subset.forEach((row) => {
                yKeys.forEach((k) => {
                  const v = row[k];
                  if (v !== null && v !== undefined) {
                    if (Array.isArray(v)) { // For AreaCharts with a range
                        if (v[0] < yMin) yMin = v[0];
                        if (v[1] > yMax) yMax = v[1];
                    } else { // For LineCharts with single values
                        if (v < yMin) yMin = v;
                        if (v > yMax) yMax = v;
                    }
                  }
                });
              });
              if (yMin !== Infinity && yMax !== -Infinity) {
                // Add small padding
                const pad = (yMax - yMin) * 0.05 || 0.1;
                yDomain = [yMin - pad, yMax + pad];
              }
            }
          }

          if (isZoomed) {
            if (initialYDomain && yDomain) {
                yDomain[0] = Math.max(yDomain[0], initialYDomain[0]);
                yDomain[1] = Math.min(yDomain[1], initialYDomain[1]);
            }
            if (initialXDomain && xDomain) {
              xDomain[0] = Math.max(xDomain[0], initialXDomain[0]);
              xDomain[1] = Math.min(xDomain[1], initialXDomain[1]);
            } 
          } else {
            yDomain = initialYDomain || yDomain || ["auto", "auto"];
            xDomain = initialXDomain || xDomain || ["auto", "auto"];
          }

          return children({
            domain: xDomain,
            yDomain,
            handlers,
            refArea,
          });
        })()}
      </ResponsiveContainer>
    </div>
  );
}; 