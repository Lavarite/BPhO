import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from "react";
import { Image as KonvaImage, Transformer, Text, Circle, Group } from "react-konva";
import useImage from "use-image";
import { createRoot } from "react-dom/client";
import { min, max, round, cos, sin, sqrt, floor, hypot, toDeg } from "../math_functions";
import canvasSize from "canvas-size";

export const defaultTransform = (x, y) => [x, y];

export const OpticsImage = ({
  shapeProps,
  isSelected,
  onSelect,
  onChange,
  smooth = 2,
  isMobile = false,
  transformFunc = defaultTransform,
  onProcessingChange = () => {},
  highlightRealImage = false,
  disableDrag = false,
}) => {
  const shapeRef = useRef();
  const trRef = useRef();
  const [rawBitmap] = useImage(shapeProps.src);
  const [bitmap, setBitmap] = React.useState(null);
  const [derived, setDerived] = React.useState({canvas: null, x: 0, y: 0, width: 0, height: 0});

  const [canvasLimits, setCanvasLimits] = React.useState({
    maxPixels: 4096 * 4096,
    maxSide: 4096
  });
  
  // Spinner animation state
  const [spinnerAngle, setSpinnerAngle] = React.useState(0);
  
  // Indicates whether a (re)transformation is currently being processed
  const [processing, setProcessing] = React.useState(false);
  
  const transformStateRef = useRef({
    pending: false,
    latest: null
  });

  React.useMemo(() => {try {
    canvasSize.test({sizes: [
      [16384, 16384],
      [8192, 8192],
      [4096, 4096],
    ],
      onSuccess({ width, height, testTime, totalTime }) {
        setCanvasLimits({
          maxPixels: width * height,
          maxSide  : Math.min(width, height),
        });
      },
    });
  } catch (e){
    setCanvasLimits({ maxPixels: 4096 * 4096, maxSide: 4096 });
  }}, []);

  React.useEffect(() => {
    if (!rawBitmap) return;
    const MAX_PIXELS = 1200 * 1000; // ~1.2 MP
    const total = rawBitmap.width * rawBitmap.height;
    if (total <= MAX_PIXELS) {
      setBitmap(rawBitmap);
      return;
    }
    // Determine scale factor to reduce total pixel count
    const scale = sqrt(MAX_PIXELS / total);
    const outW = round(rawBitmap.width * scale);
    const outH = round(rawBitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(rawBitmap, 0, 0, outW, outH);
    const img = new Image();
    img.onload = () => setBitmap(img);
    img.src = canvas.toDataURL();
  }, [rawBitmap]);

  // Initialize width/height once bitmap loads and trigger selection
  useEffect(() => {
    if (!bitmap || !shapeRef.current) return;
    if (shapeProps.width && shapeProps.height) return; // already set

    const stageScale = shapeRef.current.getStage()?.scaleX() ?? 1;
    let wUnits = bitmap.width / stageScale;
    let hUnits = bitmap.height / stageScale;

    const maxUnits = 3;
    const scaleFactor = min(1, maxUnits / max(wUnits, hUnits));
    wUnits *= scaleFactor;
    hUnits *= scaleFactor;

    // Set initial position and size, and force selection of the new image
    onChange({ ...shapeProps, width: wUnits, height: hUnits, x: 6, y: -hUnits/2 });
    onSelect();
  }, [bitmap]);

  // Recompute when transform-relevant props change
  const transformKey = `${shapeProps.x},${shapeProps.y},${shapeProps.width},${shapeProps.height},${shapeProps.rotation},${shapeProps.extras || ''}`;
  const prevTransformKeyRef = useRef(null);

  useEffect(() => {
    if (!bitmap) return;
    if (!shapeProps.width || !shapeProps.height) return;

    // Only proceed if transform-relevant values changed
    if (transformKey === prevTransformKeyRef.current) return;
    prevTransformKeyRef.current = transformKey;

    // Store latest transform request
    transformStateRef.current.latest = {
      bitmap,
      shapeProps: { ...shapeProps },
      transformFunc
    };

    // If we're already processing, let the queued job finish first
    if (transformStateRef.current.pending) return;

    transformStateRef.current.pending = true;
    // Clear any previously rendered transformed image while new processing begins
    setDerived({ canvas: null, x: 0, y: 0, width: 0, height: 0 });
    setProcessing(true);
    setSpinnerAngle(0);

    requestAnimationFrame(() => {
      processTransformation();
    });
  }, [bitmap, transformKey, transformFunc]);

  // Async transformation processor
  const processTransformation = () => {
    const { bitmap, shapeProps, transformFunc } = transformStateRef.current.latest;

    const WORLD_LIMIT = 60; // crop region to ±100 units in both axes

    // Create an offscreen canvas for processing
    const processAsync = () => {
      const { width: pxWidth, height: pxHeight } = bitmap;

      // World-space size of a single pixel (before rotation)
      const pixelW = shapeProps.width / pxWidth;
      const pixelH = shapeProps.height / pxHeight;

      // Rotation (Konva uses degrees)
      const rotRad = (shapeProps.rotation || 0) / toDeg;
      const cosR = cos(rotRad);
      const sinR = sin(rotRad);

      const originX = shapeProps.x; // top-left
      const originY = shapeProps.y;

      // --- New Mesh-based rendering ---
      
      // 1. Transform all edge points to find the bounds of the new shape
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const edgePoints = [];
      // Top and bottom edges
      for (let px = 0; px < pxWidth; px++) {
        edgePoints.push([px, 0]);
        edgePoints.push([px, pxHeight - 1]);
      }
      // Left and right edges
      for (let py = 1; py < pxHeight - 1; py++) {
        edgePoints.push([0, py]);
        edgePoints.push([pxWidth - 1, py]);
      }
      
      for (const [px, py] of edgePoints) {
        const dx = px * pixelW;
        const dy = py * pixelH;
        const worldX = originX + dx * cosR - dy * sinR;
        const worldY = originY + dx * sinR + dy * cosR;
        const [tX, tY] = transformFunc(worldX, worldY);
        
        // Skip points that map outside the visible window to avoid extreme bounds
        if (!isFinite(tX) || !isFinite(tY)) continue;
        if (Math.abs(tX) > WORLD_LIMIT || Math.abs(tY) > WORLD_LIMIT) continue;
        
        if (tX < minX) minX = tX;
        if (tY < minY) minY = tY;
        if (tX > maxX) maxX = tX;
        if (tY > maxY) maxY = tY;
      }

      // Guard: avoid degenerate bounds
      if (!isFinite(minX)) {
        transformStateRef.current.pending = false;
        setProcessing(false);
        return;
      }
      
      const worldWidth = maxX - minX;
      const worldHeight = maxY - minY;
      
      // Estimate destination pixel density based on world size
      const estDestPxWidth = floor(worldWidth / pixelW);
      const estDestPxHeight = floor(worldHeight / pixelH);

      // 2. Create destination canvas with memory safety limits
      let destPxWidth = estDestPxWidth;
      let destPxHeight = estDestPxHeight;
      const MAX_TOTAL_PIXELS = canvasLimits.maxPixels;

      if (destPxWidth * destPxHeight > MAX_TOTAL_PIXELS) {
        const scale = sqrt(MAX_TOTAL_PIXELS / (destPxWidth * destPxHeight));
        destPxWidth = floor(destPxWidth * scale);
        destPxHeight = floor(destPxHeight * scale);
      }
      
      destPxWidth = min(destPxWidth, canvasLimits.maxSide);
      destPxHeight = min(destPxHeight, canvasLimits.maxSide);

      const destCanvas = document.createElement("canvas");
      destCanvas.width = destPxWidth;
      destCanvas.height = destPxHeight;
      const destCtx = destCanvas.getContext("2d");
      // 3. Helper function to draw a textured triangle
      // Calculates an affine transform to map src triangle to dest triangle,
      // sets a clip path, and draws the transformed image.
      function drawTexturedTriangle(p0_src, p1_src, p2_src, p0_dest, p1_dest, p2_dest) {
          const { x: u0, y: v0 } = p0_src;
          const { x: u1, y: v1 } = p1_src;
          const { x: u2, y: v2 } = p2_src;

          let { x: x0, y: y0 } = p0_dest;
          let { x: x1, y: y1 } = p1_dest;
          let { x: x2, y: y2 } = p2_dest;

          //--- FIX for seams: slightly extrude vertices to create overlap ---
          const cX = (x0 + x1 + x2) / 3;
          const cY = (y0 + y1 + y2) / 3;
          
          const scale = smooth; 
          
          let d_v0 = hypot(x0 - cX, y0 - cY);
          if (d_v0 > 1e-6) {
              x0 += (x0 - cX) / d_v0 * scale;
              y0 += (y0 - cY) / d_v0 * scale;
          }
          
          let d_v1 = hypot(x1 - cX, y1 - cY);
          if (d_v1 > 1e-6) {
              x1 += (x1 - cX) / d_v1 * scale;
              y1 += (y1 - cY) / d_v1 * scale;
          }

          let d_v2 = hypot(x2 - cX, y2 - cY);
          if (d_v2 > 1e-6) {
              x2 += (x2 - cX) / d_v2 * scale;
              y2 += (y2 - cY) / d_v2 * scale;
          }
          //--- END FIX ---
          
          const den = u0 * (v1 - v2) + u1 * (v2 - v0) + u2 * (v0 - v1);
          if (den === 0) return; // Degenerate triangle

          destCtx.save();
          destCtx.beginPath();
          destCtx.moveTo(x0, y0);
          destCtx.lineTo(x1, y1);
          destCtx.lineTo(x2, y2);
          destCtx.closePath();
          destCtx.clip();
          
          const a = (x0 * (v1 - v2) + x1 * (v2 - v0) + x2 * (v0 - v1)) / den;
          const b = (x0 * (u2 - u1) + x1 * (u0 - u2) + x2 * (u1 - u0)) / den;
          const c = (y0 * (v1 - v2) + y1 * (v2 - v0) + y2 * (v0 - v1)) / den;
          const d = (y0 * (u2 - u1) + y1 * (u0 - u2) + y2 * (u1 - u0)) / den;
          const e = (x0 * (u1 * v2 - u2 * v1) + x1 * (u2 * v0 - u0 * v2) + x2 * (u0 * v1 - u1 * v0)) / den;
          const f = (y0 * (u1 * v2 - u2 * v1) + y1 * (u2 * v0 - u0 * v2) + y2 * (u0 * v1 - u1 * v0)) / den;

          destCtx.setTransform(a, c, b, d, e, f);
          destCtx.drawImage(bitmap, 0, 0);
          destCtx.restore();
      }
      
      // 4. Create and transform a mesh
      const divisions = isMobile ? 100 : 200;
      
      // Process in chunks to keep UI responsive
      let j = 0;
      function processMeshChunk() {
          const endJ = min(j + 10, divisions);
          
          for (let jj = j; jj < endJ; jj++) {
              for (let i = 0; i < divisions; i++) {
                  // Define the four corners of a quad on the source image
                  const p0_src = { x: (i / divisions) * pxWidth, y: (jj / divisions) * pxHeight };
                  const p1_src = { x: ((i + 1) / divisions) * pxWidth, y: (jj / divisions) * pxHeight };
                  const p2_src = { x: (i / divisions) * pxWidth, y: ((jj + 1) / divisions) * pxHeight };
                  const p3_src = { x: ((i + 1) / divisions) * pxWidth, y: ((jj + 1) / divisions) * pxHeight };
                  
                  // Transform these four points
                  const points_src = [p0_src, p1_src, p2_src, p3_src];
                  const points_dest = points_src.map(p => {
                      const dx_w = p.x * pixelW;
                      const dy_w = p.y * pixelH;
                      const worldX = originX + dx_w * cosR - dy_w * sinR;
                      const worldY = originY + dx_w * sinR + dy_w * cosR;
                      const [tX, tY] = transformFunc(worldX, worldY);
                      
                      // Discard points outside crop window
                      if (!isFinite(tX) || !isFinite(tY)) return { x: Infinity, y: Infinity };
                      if (Math.abs(tX) > WORLD_LIMIT || Math.abs(tY) > WORLD_LIMIT) return { x: Infinity, y: Infinity };

                      // Map from world coordinates to destination canvas coordinates
                      const canvasX = ((tX - minX) / worldWidth) * destPxWidth;
                      const canvasY = ((tY - minY) / worldHeight) * destPxHeight;
                      
                      return { x: canvasX, y: canvasY };
                  });

                  // Split quad into two triangles and render them
                  if (points_dest.every(p => isFinite(p.x) && isFinite(p.y))) {
                    drawTexturedTriangle(points_src[0], points_src[1], points_src[2], points_dest[0], points_dest[1], points_dest[2]);
                    drawTexturedTriangle(points_src[1], points_src[3], points_src[2], points_dest[1], points_dest[3], points_dest[2]);
                  }
              }
          }
          
          j = endJ;
          
          if (j < divisions) {
              requestAnimationFrame(processMeshChunk); // Process next chunk
          } else {
              // 5. Optionally tint the real image red if it is effectively a point (degenerate) or too small
              if (highlightRealImage) {
                const TOO_SMALL = 2; // destination pixels threshold per side
                if (destPxWidth < TOO_SMALL || destPxHeight < TOO_SMALL) {
                  destCtx.fillStyle = "rgba(255,0,0,0.35)";
                  destCtx.fillRect(0, 0, destCanvas.width, destCanvas.height);
                }
              }

              // 6. We're done, update the image
              setDerived({
                canvas: destCanvas,
                x: minX,
                y: minY,
                width: worldWidth,
                height: worldHeight,
              });
              
              requestAnimationFrame(() => {
                  transformStateRef.current.pending = false;
                  setProcessing(false);
                  const current = transformStateRef.current.latest;
                  if (current.bitmap !== bitmap || current.shapeProps !== shapeProps || current.transformFunc !== transformFunc) {
                      requestAnimationFrame(processTransformation);
                  }
              });
          }
      }
      
      // Start processing
      processMeshChunk();
    };
    
    // Start async processing
    requestAnimationFrame(processAsync);
  };

  // Transformer for the draggable original image
  useEffect(() => {
    if (isSelected && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  // Spinner animation effect
  useEffect(() => {
    let animFrame;
    const animate = () => {
      if (processing) {
        setSpinnerAngle(prev => (prev + 15) % 360);
        animFrame = requestAnimationFrame(animate);
      }
    };
    
    if (processing) {
      animFrame = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animFrame) {
        cancelAnimationFrame(animFrame);
      }
    };
  }, [processing]);

  // Notify parent about processing state changes
  useEffect(() => {
    onProcessingChange(processing);
  }, [processing, onProcessingChange]);

  const handleDragEnd = (e) => {
    onChange({ ...shapeProps, x: e.target.x(), y: e.target.y() });
  };
  
  const handleTransformEnd = () => {
    const node = shapeRef.current;
    const sX = node.scaleX();
    const sY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange({
      ...shapeProps,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: max(0.1, node.width() * sX),
      height: max(0.1, node.height() * sY),
    });
  };

  // If bitmap not ready yet, just skip rendering
  if (!bitmap) return null;

  // Calculate rotated center position of the image (for spinner)
  let centerX = 0, centerY = 0;
  if (shapeProps.width && shapeProps.height) {
    const rotRadCenter = (shapeProps.rotation || 0) / toDeg;
    const dxC = shapeProps.width / 2;
    const dyC = shapeProps.height / 2;
    centerX = shapeProps.x + dxC * cos(rotRadCenter) - dyC * sin(rotRadCenter);
    centerY = shapeProps.y + dxC * sin(rotRadCenter) + dyC * cos(rotRadCenter);
  }

  return (
    <>
      {/* Draggable ORIGINAL image */}
      <KonvaImage
        ref={shapeRef}
        {...shapeProps}
        image={bitmap}
        draggable={!processing && !disableDrag}
        opacity={processing ? 0.5 : 1}
        listening={true}
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={(e) => e.cancelBubble = true}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          handleDragEnd(e);
        }}
        onTransformEnd={handleTransformEnd}
        cached={true}
      />

      {/* Non-draggable TRANSFORMED image */}
      {derived.canvas && (
        <KonvaImage
          x={derived.x}
          y={derived.y}
          width={derived.width}
          height={derived.height}
          image={derived.canvas}
          opacity={0.5}
          listening={false}
          imageSmoothingEnabled={true}
          cached={true}
        />
      )}

      {/* Loading overlay */}
      {processing && bitmap && (
        <Group x={centerX} y={centerY}>
          {/* Outer circle */}
          <Circle
            radius={0.3} // Fixed size in board units
            fill="rgba(255, 255, 255, 0.7)"
            stroke="#000"
            strokeWidth={0.02}
            listening={false}
          />
          {/* Spinner dot */}
          <Circle
            x={Math.cos(spinnerAngle / toDeg) * 0.24}
            y={Math.sin(spinnerAngle / toDeg) * 0.24}
            radius={0.06}
            fill="#000"
            listening={false}
          />
        </Group>
      )}

      {isSelected && !disableDrag && (
        <Transformer
          ref={trRef}
          rotateEnabled
          resizeEnabled={!processing}
          draggable={!processing && !disableDrag}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 0.1 || newBox.height < 0.1) return oldBox;
            return newBox;
          }}
          flipEnabled={false}
          visible={true}
          opacity={processing ? 0.3 : 1}
          rotationSnaps={[0, 90, 180, 270]}
        />
      )}
    </>
  );
}; 