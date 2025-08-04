import React, { useState, useCallback, useRef } from "react";
import { OpticsGrid } from "../components/opticsGrid";
import { OpticsImage } from "../components/opticsImage";
import { ImageUploadControls } from "../components/ImageUploadControls";
import { layout, colors } from "../design-guidelines";
import { Circle, Text, Line } from 'react-konva';
import sampleImage from "../components/example image.jpg";
import { hypot, atan2, tan, cos, sin } from "../math_functions";

import Accordion from '../components/Accordion';

export const Task89 = (props) => {
  const { isSmallViewport } = props;
  const [image, setImage] = useState(null);
  const [isSelected, setIsSelected] = useState(false);
  const [radius, setRadius] = useState(4);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [mirrorType, setMirrorType] = useState("concave");
  
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

    setImage({
      id: `${file.name}-${Date.now()}`,
      src: url,
      x: 5,
      y: 1,
      rotation: 0
    });

    return () => URL.revokeObjectURL(url);
  }, []);

  const loadSampleImage = useCallback(() => {
    setImage({
      id: `sample-${Date.now()}`,
      src: sampleImage,
      x: 5,
      y: 1,
      rotation: 0
    });
  }, []);

  const deselectOnEmpty = useCallback((e) => {
    if (e.target === e.target.getStage()) {
      setIsSelected(false);
    }
  }, []);
  
  const mirrorTransform = useCallback((x, y) => {
    if (mirrorType === "concave") {
      if (x < -radius / 2) return [Infinity, Infinity];
      if (x < 0 && hypot(x, y) > radius) return [Infinity, Infinity];

      const m = tan(2 * atan2(y, hypot(radius, y)));
      const den = 1 / ((y / x) + m);
      if (Math.abs(den) < 1e-9) return [Infinity, Infinity];
      const X = -(m * hypot(radius, y) - y) * den;
      const Y = (y / x) * X;
      return [X, Y];
    }

    if (x <= 0) return [Infinity, Infinity];
    if (Math.abs(y) < 1e-9) return [-x, 0];
    if (hypot(x, y) < radius) return [Infinity, Infinity];

    const a = 0.5 * atan2(y, x);
    const k = x / cos(2 * a);
    const denom = (k / radius) - cos(a) + (x * sin(a)) / (y);
    if (Math.abs(denom) < 1e-9) return [Infinity, Infinity];
    const Y = (k * sin(a)) / denom;
    const X = (x * Y) / y;
    return [X, Y];
  }, [radius, mirrorType]); 

  const gridHeight = isSmallViewport ? "320px" : "70vh";
  
  const getArcPoints = () => {
    const points = [];
    const segments = 30;
    const startAngle = -Math.PI / 2;
    const endAngle = Math.PI / 2;

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (endAngle - startAngle) * (i / segments);
      const direction = mirrorType === "concave" ? -1 : 1;
      const arcX = direction * radius * Math.cos(angle);
      const arcY = radius * Math.sin(angle);
      points.push(arcX, arcY);
    }

    return points;
  };

  const parameters = [
    {
      label: "Radius of Curvature (R)",
      value: radius,
      onChange: setRadius,
      min: 1,
      max: 10,
      step: 0.1,
      unit: "units"
    }
  ];

  return (
    <div className={layout.pageWrapperResponsive(isSmallViewport)}>
      <h1 className="text-2xl font-bold mb-4">Task 8 & 9: Spherical Mirror Simulation</h1>

      <ImageUploadControls
        onFileChange={handleFileChange}
        onLoadSample={loadSampleImage}
        imageProcessing={imageProcessing}
        parameters={parameters}
      >
        <div className="flex-1 min-w-[160px] flex gap-1">
          {['concave', 'convex'].map((type) => (
            <button
              key={type}
              onClick={() => setMirrorType(type)}
              disabled={imageProcessing}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                mirrorType === type
                  ? imageProcessing
                    ? 'bg-blue-400 text-white opacity-50 cursor-not-allowed'
                    : 'bg-blue-600 text-white'
                  : imageProcessing
                    ? 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </ImageUploadControls>

      <div
        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
        style={{ height: gridHeight }}
      >
        <OpticsGrid onBackgroundClick={deselectOnEmpty} presetName="default">
          
          <Line
            points={getArcPoints()}
            stroke="#2563eb"
            strokeWidth={0.1}
            fill="#93c5fd"
            opacity={0.7}
            listening={false}
          />
          
          {mirrorType === "concave" && (<>
            <Circle x={-radius/2} y={0} radius={0.15} fill="#dc2626" listening={false} />
            <Text x={-radius/2 + 0.2} y={-0.8} text="F" fontSize={0.7} fill="#dc2626" listening={false} />
          </>)}
          
          <Circle x={0} y={0} radius={0.15} fill="#4b5563" listening={false} />
          <Text x={0.2} y={-0.8} text="C" fontSize={0.7} fill="#4b5563" listening={false} />
          
          {image && (
            <OpticsImage
              key={image.id}
              shapeProps={{...image, extras: `R:${radius}, ${mirrorType}`}}
              isSelected={isSelected}
              onSelect={() => setIsSelected(true)}
              onChange={(attrs) => setImage(attrs)}
              transformFunc={mirrorTransform}
              isMobile={isSmallViewport}
              onProcessingChange={setImageProcessing}

            />
          )}
        </OpticsGrid>
      </div>
      
      <Accordion title="How the Simulation Works">
            <div>
                <h4 className="font-semibold text-base text-gray-800 mb-2">How the Image is Rendered</h4>
                 <p className="mb-2">
                    The final transformed image is drawn using mesh-based rendering.
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                    <li>
                        <strong>Creating Mesh:</strong> The source image is divided into a grid of small quadrilaterals (quads) by systematic sampling.
                    </li>
                    <li>
                        <strong>Transforming Vertices:</strong> The optical transformation for the mirror is applied to the four corner vertices of each quad in the grid, calculating where each corner would appear to be after reflecting off the mirror.
                    </li>
                    <li>
                        <strong>Drawing Triangles:</strong> Each transformed quad, which is now distorted, is split into two triangles. These triangles are then drawn onto the screen, but instead of being filled with a solid color, they are textured with the corresponding triangular piece of the original source image.
                    </li>
                </ol>
                 <p className="mt-2 text-sm">
                    This method differs from census transformation of points, since sometimes the set of transformed image points is a superset of the original set of points on the image.
                    As a side effect of systematic sampling, the less points have to be transformed, hence reducing the computational cost.
                </p>
            </div>
            <div>
                <h4 className="font-semibold text-base text-gray-800 mb-2">Concave Mirror Transformation</h4>
                 <p className="mb-2">For an object point P(x, y) and a concave mirror with its center of curvature at the origin and radius R, the corresponding image point P'(X, Y) is found with the following steps:</p>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>
                        An intermediate slope parameter, <code className="text-xs">m</code>, is calculated:
                         <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                            m = tan(2 * atan(y / √(R² + y²)))
                        </div>
                    </li>
                    <li>
                        The final image coordinates (X, Y) are then determined using <code className="text-xs">m</code>:
                        <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                           X = - (m√(R² + y²) - y) / (y/x + m)<br/>
                           Y = (y/x) * X
                        </div>
                    </li>
                </ol>
            </div>
            <div>
                <h4 className="font-semibold text-base text-gray-800 mb-2">Convex Mirror Transformation</h4>
                 <p className="mb-2">For a convex mirror, a different geometric approach is used:</p>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>
                        An intermediate angle, α, is calculated:
                        <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                           α = 0.5 * atan(y/x)
                        </div>
                    </li>
                     <li>
                        An intermediate distance, k, is found (this is the distance from the center of curvature to the object point):
                        <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                           k = x / cos(2α) = √(x² + y²)
                        </div>
                    </li>
                    <li>
                        The final image coordinates (X, Y) are then calculated:
                        <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                           Y = (k * sin(α)) / (k/R - cos(α) + (x/y)sin(α))<br/>
                           X = (x/y) * Y
                        </div>
                    </li>
                </ol>
            </div>
        </Accordion>
    </div>
  );
} 