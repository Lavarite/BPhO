import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line, Text, Circle } from 'react-konva';
import { max, min, hypot, floor } from '../math_functions';
import { konvaConfig } from '../design-guidelines';

if (typeof window !== 'undefined' && window.Konva) {
  window.Konva.hitOnDragEnabled = true;
}

export const OpticsGrid = ({
  children,
  onBackgroundClick = null,
  presetName = 'default',
  initialShowGrid = true,
  initialShowPolar = false,
  ...restProps
}) => {
  const preset = konvaConfig.presets[presetName] || konvaConfig.presets.default;
  const config = konvaConfig.defaults;

  const {
    worldWidth: initialWorldWidth,
    worldHeight: initialWorldHeight,
    centerOrigin
  } = preset;

  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 300, h: 300 });

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const { width: w, height: h } = entries[0].contentRect;
      setSize({ w, h });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const worldHeightUnits = initialWorldHeight ?? initialWorldWidth;
  const initialScale = Math.min(size.w / initialWorldWidth, size.h / worldHeightUnits);

  const baseScaleRef = useRef(initialScale);
  const MIN_ZOOM_FACTOR = config.zoom.minFactor;
  const MAX_ZOOM_FACTOR = config.zoom.maxFactor;

  const [stageScale, setStageScale] = useState(initialScale);
  const [stagePosition, setStagePosition] = useState(centerOrigin ? { x: size.w / 2, y: size.h / 2 } : { x: 0, y: 0 });
  const stageRef = useRef(null);
  const lastCenter = useRef(null);
  const lastDist = useRef(0);

  // Grid display state: 'cartesian', 'polar', 'none'
  const getInitialGridState = () => {
    if (initialShowPolar) return 'polar';
    if (initialShowGrid) return 'cartesian';
    return 'none';
  };
  const [gridState, setGridState] = useState(getInitialGridState());

  useEffect(() => {
    const newScale = Math.min(size.w / initialWorldWidth, size.h / worldHeightUnits);
    baseScaleRef.current = newScale;
    setStageScale(newScale);
    if (centerOrigin) {
      setStagePosition({ x: size.w / 2, y: size.h / 2 });
    }
  }, [size.w, size.h, initialWorldWidth, worldHeightUnits, centerOrigin]);

  const clampStagePos = (xPos, yPos, scaleVal = stageScale) => {
    const MAX_UNITS = config.pan.limitUnits;
    const centerX = size.w / 2;
    const centerY = size.h / 2;
    const viewHalfWorldX = (size.w / 2) / scaleVal;
    const viewHalfWorldY = (size.h / 2) / scaleVal;
    const limitX = MAX_UNITS - viewHalfWorldX;
    const limitY = MAX_UNITS - viewHalfWorldY;
    const clampedLimitX = Math.max(limitX, 0);
    const clampedLimitY = Math.max(limitY, 0);
    const minX = centerX - clampedLimitX * scaleVal;
    const maxX = centerX + clampedLimitX * scaleVal;
    const minY = centerY - clampedLimitY * scaleVal;
    const maxY = centerY + clampedLimitY * scaleVal;
    return {
      x: min(max(xPos, minX), maxX),
      y: min(max(yPos, minY), maxY),
    };
  };

  const getGridLines = () => {
    const lines = [];
    const scale = stageScale;
    const spacing = config.grid.spacing;
    const startX = -stagePosition.x / scale;
    const endX = (size.w - stagePosition.x) / scale;
    const startY = -stagePosition.y / scale;
    const endY = (size.h - stagePosition.y) / scale;
    for (let x = floor(startX / spacing) * spacing; x <= endX; x += spacing) {
      if (x === 0 && gridState === 'polar') continue;
      lines.push({
        points: [x, startY, x, endY],
        stroke: config.grid.stroke,
        strokeWidth: config.grid.strokeWidth,
        opacity: 0.2
      });
    }
    for (let y = floor(startY / spacing) * spacing; y <= endY; y += spacing) {
      if (y === 0 && gridState === 'polar') continue;
      lines.push({
        points: [startX, y, endX, y],
        stroke: config.grid.stroke,
        strokeWidth: config.grid.strokeWidth,
        opacity: 0.2
      });
    }
    return lines;
  };

  const getPolarGridLines = () => {
    const polarLines = [];
    const scale = stageScale;
    const center = { x: 0, y: 0 };
    const maxR = Math.max(
      hypot(-stagePosition.x / scale, -stagePosition.y / scale),
      hypot((size.w - stagePosition.x) / scale, -stagePosition.y / scale),
      hypot(-stagePosition.x / scale, (size.h - stagePosition.y) / scale),
      hypot((size.w - stagePosition.x) / scale, (size.h - stagePosition.y) / scale)
    );

    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * 2 * Math.PI;
      polarLines.push({
        isLine: true,
        points: [center.x, center.y, center.x + maxR * Math.cos(angle), center.y + maxR * Math.sin(angle)],
      });
    }

    for (let r = config.grid.spacing; r <= maxR; r += config.grid.spacing) {
      polarLines.push({
        isLine: false,
        radius: r,
      });
    }
    return polarLines;
  };

  const getAxisLines = () => {
    const scale = stageScale;
    const startX = -stagePosition.x / scale;
    const endX = (size.w - stagePosition.x) / scale;
    const startY = -stagePosition.y / scale;
    const endY = (size.h - stagePosition.y) / scale;
    return [
      { points: [startX, 0, endX, 0], stroke: config.grid.axisStroke, strokeWidth: config.grid.axisStrokeWidth },
      { points: [0, startY, 0, endY], stroke: config.grid.axisStroke, strokeWidth: config.grid.axisStrokeWidth }
    ];
  };

  const getAxisLabels = () => {
    const labels = [];
    const scale = stageScale;
    const startX = -stagePosition.x / scale;
    const endX = (size.w - stagePosition.x) / scale;
    const startY = -stagePosition.y / scale;
    const endY = (size.h - stagePosition.y) / scale;
    if (startX < 0 && endX > 0 && startY < 0 && endY > 0) labels.push({ x: -10 / scale, y: 10 / scale, text: '0', fontSize: 14 / scale, fill: '#333', fontStyle: 'bold' });
    if (endX > 50 / scale) labels.push({ x: endX - (20 / scale), y: -20 / scale, text: 'X', fontSize: 16 / scale, fill: '#333', fontStyle: 'bold' });
    if (startY < -50 / scale) labels.push({ x: 10 / scale, y: startY + (10 / scale), text: 'Y', fontSize: 16 / scale, fill: '#333', fontStyle: 'bold' });
    return labels;
  };

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    const scaleBy = config.zoom.scaleBy;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const baseScale = baseScaleRef.current;
    const finalScale = max(baseScale * MIN_ZOOM_FACTOR, min(baseScale * MAX_ZOOM_FACTOR, newScale));
    setStageScale(finalScale);
    const newPos = {
      x: pointer.x - (pointer.x - stage.x()) / oldScale * finalScale,
      y: pointer.y - (pointer.y - stage.y()) / oldScale * finalScale,
    };
    setStagePosition(clampStagePos(newPos.x, newPos.y, finalScale));
  };

  const handleTouchMove = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && !touch2 && stage.isDragging()) {
       return;
    }

    if (touch1 && touch2) {
      if (stage.isDragging()) {
        stage.stopDrag();
      }

      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };

      if (!lastCenter.current) {
        lastCenter.current = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        lastDist.current = hypot(p1.x - p2.x, p1.y - p2.y);
        return;
      }
      
      const newDist = hypot(p1.x - p2.x, p1.y - p2.y);
      const newCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      
      const pointTo = {
        x: (newCenter.x - stage.x()) / stage.scaleX(),
        y: (newCenter.y - stage.y()) / stage.scaleY(),
      };

      const scale = stage.scaleX() * (newDist / lastDist.current);
      const baseScale = baseScaleRef.current;
      const newScale = max(baseScale * MIN_ZOOM_FACTOR, min(baseScale * MAX_ZOOM_FACTOR, scale));
      
      const dx = newCenter.x - lastCenter.current.x;
      const dy = newCenter.y - lastCenter.current.y;

      const newPos = {
        x: newCenter.x - pointTo.x * newScale + dx,
        y: newCenter.y - pointTo.y * newScale + dy,
      };

      setStageScale(newScale);
      setStagePosition(clampStagePos(newPos.x, newPos.y, newScale));
      
      lastDist.current = newDist;
      lastCenter.current = newCenter;
    }
  };

  const handleTouchEnd = (e) => {
    lastCenter.current = null;
    lastDist.current = 0;
    if (e.target.isDragging()) {
      e.target.stopDrag();
    }
  };
  
  const handleDragMove = (e) => {
    if (e.target === e.target.getStage()) {
      const clamped = clampStagePos(e.target.x(), e.target.y());
      e.target.position(clamped);
      setStagePosition(clamped);
    }
  };
  
  const handleDragEnd = (e) => {
    if (e.target === e.target.getStage()) {
      const clamped = clampStagePos(e.target.x(), e.target.y());
      setStagePosition(clamped);
    }
  };

  const handleMouseDown = (e) => {
    if (e.target === e.target.getStage() && onBackgroundClick) {
      onBackgroundClick(e);
    }
  };

  const cycleGridState = () => {
    setGridState(current => {
      if (current === 'cartesian') return 'polar';
      if (current === 'polar') return 'none';
      return 'cartesian';
    });
  };

  const getGridButtonLabel = () => {
    if (gridState === 'cartesian') return 'Switch to Polar Grid';
    if (gridState === 'polar') return 'Hide Grid';
    return 'Switch to Cartesian Grid';
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden', touchAction: 'none', position: 'relative' }}
    >
      <button
        onClick={cycleGridState}
        style={{ 
          position: 'absolute', 
          top: 10, 
          left: 10, 
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.8)', 
          border: '1px solid #ccc', 
          borderRadius: 4, 
          padding: '4px 8px', 
          fontSize: 14, 
          cursor: 'pointer' 
        }}
      >
        {getGridButtonLabel()}
      </button>
      <Stage
        ref={stageRef}
        width={size.w}
        height={size.h}
        onWheel={handleWheel}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePosition.x}
        y={stagePosition.y}
        draggable={true}
        dragBoundFunc={(pos) => clampStagePos(pos.x, pos.y)}
      >
        <Layer>
          {gridState === 'cartesian' && getGridLines().map((line, i) => <Line key={`grid-${i}`} {...line} />)}
          
          {gridState === 'polar' && getPolarGridLines().map((line, i) =>
            line.isLine ? (
              <Line key={`polar-line-${i}`} {...line} stroke={config.grid.stroke} strokeWidth={config.grid.strokeWidth} opacity={0.2} />
            ) : (
              <Circle key={`polar-circ-${i}`} x={0} y={0} radius={line.radius} stroke={config.grid.stroke} strokeWidth={config.grid.strokeWidth} opacity={0.2} />
            )
          )}

          {gridState !== 'none' && getAxisLines().map((line, i) => <Line key={`axis-${i}`} {...line} />)}
          
          {children}
          
          {gridState !== 'none' && getAxisLabels().map((label, i) => <Text key={`label-${i}`} {...label} />)}
        </Layer>
      </Stage>
    </div>
  );
}; 