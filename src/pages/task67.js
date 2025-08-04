import React, { useState, useCallback, useMemo } from "react";
import { OpticsGrid } from "../components/opticsGrid";
import { OpticsImage } from "../components/opticsImage";
import { ImageUploadControls } from "../components/ImageUploadControls";
import { layout } from "../design-guidelines";
import { Circle, Text, Line } from "react-konva";
import sampleImage from "../components/example image.jpg";

import Accordion from '../components/Accordion';

export const Task67 = ({ isSmallViewport }) => {
  const [image, setImage] = useState(null);
  const [isSelected, setIsSelected] = useState(false);
  const [radiusOfCurvature, setRadiusOfCurvature] = useState(5);
  const [refractiveIndex, setRefractiveIndex]   = useState(1.5);
  const [imageProcessing, setImageProcessing] = useState(false);

  const focalLength = useMemo(() => {
    const deltaN = refractiveIndex - 1;
    if (Math.abs(deltaN) < 1e-6) return Infinity;
    return radiusOfCurvature / (2 * deltaN);
  }, [radiusOfCurvature, refractiveIndex]);

  const focalPoints = useMemo(() => [
    { x: -focalLength, y: 0 },
    { x: focalLength, y: 0 }
  ], [focalLength]);

  const lensTransform = useCallback((x, y) => {
    if (Math.abs(x) < 0.01) return [x, y];

    const objectDistance = Math.abs(x);
    if (Math.abs(objectDistance - focalLength) < 0.001) return [Infinity, Infinity];

    const isObjectOnLeft = x < 0;
    const imageDistance = (focalLength * objectDistance) / (objectDistance - focalLength);
    const magnification = -imageDistance / objectDistance;

    const Y = y * magnification;
    const X = (isObjectOnLeft ? imageDistance : -imageDistance);

    return [X, Y];
  }, [focalLength]);

  const handleFileChange = useCallback(e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImage({ id: `${file.name}-${Date.now()}`, src: url });
    return () => URL.revokeObjectURL(url);
  }, []);

  const loadSampleImage = useCallback(() => {
    setImage({ id: `sample-${Date.now()}`, src: sampleImage });
  }, []);

  const deselectOnEmpty = useCallback(e => {
    if (e.target === e.target.getStage()) setIsSelected(false);
  }, []);

  const lensShapePoints = useMemo(() => {
    const midWidth = Math.min(1.5, 2.5 / radiusOfCurvature);
    const rightSide = [0, -3, midWidth, -1.5, midWidth, 1.5, 0, 3];
    const leftSide = [
      -rightSide[4], rightSide[5],
      -rightSide[2], rightSide[3],
      -rightSide[0], rightSide[1]
    ];
    return [...rightSide, ...leftSide];
  }, [radiusOfCurvature]);

  const parameters = [
    {
      label: "Radius of Curvature",
      value: radiusOfCurvature,
      onChange: setRadiusOfCurvature,
      min: 2,
      max: 8,
      step: 0.1,
      unit: "units"
    },
    {
      label: "Refractive Index",
      value: refractiveIndex,
      onChange: setRefractiveIndex,
      min: 1.2,
      max: 1.8,
      step: 0.01
    }
  ];

  return (
    <div className={layout.pageWrapperResponsive(isSmallViewport)}>
      <h1 className="text-2xl font-bold mb-4">Tasks 6 & 7: Thin-Lens Simulation</h1>

      <ImageUploadControls
        onFileChange={handleFileChange}
        onLoadSample={loadSampleImage}
        imageProcessing={imageProcessing}
        parameters={parameters}
      />

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" style={{ height: isSmallViewport ? "320px" : "49vh" }}>
        <OpticsGrid onBackgroundClick={deselectOnEmpty} presetName="default">
          {focalPoints.map((fp, i) => (
            <React.Fragment key={i}>
              <Circle x={fp.x} y={fp.y} radius={0.15} fill="#dc2626" listening={false} />
              <Text x={fp.x + (i === 0 ? -0.5 : 0.2)} y={fp.y - 0.8} text={`F${i + 1}`} fontSize={0.7} fill="#dc2626" listening={false} />
            </React.Fragment>
          ))}

          <Line
            points={lensShapePoints}
            stroke="#2563eb"
            strokeWidth={0.1}
            fill="#a5b4fc"
            opacity={Math.min(0.9, 0.2 + (refractiveIndex - 1))}
            listening={false}
            bezier={true}
            closed={true}
          />

          {image && (
            <OpticsImage
              key={image.id}
              shapeProps={{ ...image, extras: `R:${radiusOfCurvature};n:${refractiveIndex}` }}
              isSelected={isSelected}
              onSelect={() => setIsSelected(true)}
              onChange={attrs => setImage(attrs)}
              transformFunc={lensTransform}
              smooth={4}
              isMobile={isSmallViewport}
              onProcessingChange={setImageProcessing}
            />
          )}
        </OpticsGrid>
      </div>

        <Accordion title="How the Simulation Works">
            <div>
              <h4 className="font-semibold text-base text-gray-800 mb-2">Image Transformation</h4>
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
                <h4 className="font-semibold text-base text-gray-800 mb-2">Calculating Focal Length</h4>
                <p className="mb-2">
                    The simulation first calculates the lens's focal length (f) using the <strong>Lensmaker's Equation</strong>. For a symmetric, biconvex lens (where R₁ = -R₂ = R), the formula simplifies:
                </p>
                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                    1/f = (n - 1) * [1/R₁ - 1/R₂]  =&gt;  f = R / (2 * (n - 1))
                </div>
                 <p className="mt-1 text-xs">
                    With R = {radiusOfCurvature.toFixed(1)} and n = {refractiveIndex.toFixed(2)}, the focal length is <strong>{focalLength.toFixed(2)} units</strong>.
                </p>
            </div>
            <div>
                <ol className="list-decimal pl-5 space-y-2">
                    <li>
                        <strong>Image Distance (dᵢ):</strong> The new horizontal position is found using the formula:
                        <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                            1/f = 1/dₒ + 1/dᵢ  =&gt;  dᵢ = (f * dₒ) / (dₒ - f)
                        </div>
                    </li>
                    <li>
                        <strong>Magnification (M):</strong> The vertical position and size are determined by the magnification:
                        <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                           M = -dᵢ / dₒ
                        </div>
                    </li>
                    <li>
                        The final coordinates [X, Y] for each point [x, y] of the object are [dᵢ, y * M].
                    </li>
                </ol>
            </div>
        </Accordion>
    </div>
  );
};
