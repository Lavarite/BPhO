import React, { useState, useCallback, useEffect } from "react";
import { Circle, Star, Image as KonvaImage } from "react-konva";
import { OpticsGrid } from "../components/opticsGrid";
import { ImageUploadControls } from "../components/ImageUploadControls";
import useImage from "use-image";
import sampleImageSrc from "../components/example anamorphic.jpg";
import {layout} from "../design-guidelines";
import { hypot, atan2, PI, abs } from "../math_functions";

import Accordion from '../components/Accordion';

export const Task10 = ({ isSmallViewport }) => {
  const [image, setImage] = useState(null);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [transformedImage, setTransformedImage] = useState(null);
  const [Rf, setRf] = useState(3);
  const [arcDegrees, setArcDegrees] = useState(90);

  const [origBmp] = useImage(image?.src || null, "anonymous");
  const [transformedBmp] = useImage(transformedImage || null, "anonymous");

  const createAnamorphicTransform = useCallback((sourceCanvas, Rf, arcDegrees) => {
    const srcWidth = sourceCanvas.width;
    const srcHeight = sourceCanvas.height;
    const srcCtx = sourceCanvas.getContext("2d");
    const srcData = srcCtx.getImageData(0, 0, srcWidth, srcHeight);
  
    const scale = Rf * 1.5;
    const dstSize = Math.ceil(srcWidth * scale / Math.SQRT2);
    const dstCan = document.createElement("canvas");
    dstCan.width = dstCan.height = dstSize;
    const dstCtx = dstCan.getContext("2d");
    const dstData = dstCtx.createImageData(dstSize, dstSize);
  
    const centerX = dstSize / 2;
    const centerY = dstSize / 2 - dstSize * 0.1;
    
    const worldToCanvas = (dstSize / 2) / scale;
    const canvasToWorld = scale / (dstSize / 2);
    
    const starX = 0;
    const starY = -Math.SQRT1_2;
    
    const bilinearSample = (x, y) => {
      const x0 = Math.floor(x);
      const x1 = Math.min(x0 + 1, srcWidth - 1);
      const y0 = Math.floor(y);
      const y1 = Math.min(y0 + 1, srcHeight - 1);
      
      const wx = x - x0;
      const wy = y - y0;
      
      const idx00 = (y0 * srcWidth + x0) * 4;
      const idx10 = (y0 * srcWidth + x1) * 4;
      const idx01 = (y1 * srcWidth + x0) * 4;
      const idx11 = (y1 * srcWidth + x1) * 4;
      
      const r = (1-wx)*(1-wy)*srcData.data[idx00] + wx*(1-wy)*srcData.data[idx10] +
                (1-wx)*wy*srcData.data[idx01] + wx*wy*srcData.data[idx11];
      const g = (1-wx)*(1-wy)*srcData.data[idx00+1] + wx*(1-wy)*srcData.data[idx10+1] +
                (1-wx)*wy*srcData.data[idx01+1] + wx*wy*srcData.data[idx11+1];
      const b = (1-wx)*(1-wy)*srcData.data[idx00+2] + wx*(1-wy)*srcData.data[idx10+2] +
                (1-wx)*wy*srcData.data[idx01+2] + wx*wy*srcData.data[idx11+2];
      const a = (1-wx)*(1-wy)*srcData.data[idx00+3] + wx*(1-wy)*srcData.data[idx10+3] +
                (1-wx)*wy*srcData.data[idx01+3] + wx*wy*srcData.data[idx11+3];
      
      return [Math.round(r), Math.round(g), Math.round(b), Math.round(a)];
    };
    
    const arcRadians = arcDegrees * (PI / 180);

    for (let dstY = 0; dstY < dstSize; dstY++) {
      for (let dstX = 0; dstX < dstSize; dstX++) {
        const worldX = (dstX - centerX) * canvasToWorld;
        const worldY = -(dstY - centerY) * canvasToWorld;
        
        const dx = worldX - starX;
        const dy = worldY - starY;
        const radius = hypot(dx, dy);
        
        if (radius < 1 || radius > Rf) continue;
        
        const angle = atan2(dy, dx);
        const centerAngle = -PI / 2;
        
        let angleDiff = angle - centerAngle;
        if (angleDiff > PI) angleDiff -= 2 * PI;
        if (angleDiff < -PI) angleDiff += 2 * PI;

        const halfArc = arcRadians / 2;
        if (abs(angleDiff) > halfArc) {
            continue;
        }

        const u = (angleDiff + halfArc) / arcRadians;
        const v = 1 - (radius - 1) / (Rf - 1);
        
        const srcX = u * (srcWidth - 1);
        const srcY = v * (srcHeight - 1);
        
        if (srcX < 0 || srcX >= srcWidth - 1 || srcY < 0 || srcY >= srcHeight - 1) continue;
        
        const [r, g, b, a] = bilinearSample(srcX, srcY);
        
        const dstIdx = (dstY * dstSize + dstX) * 4;
        dstData.data[dstIdx] = r;
        dstData.data[dstIdx + 1] = g;
        dstData.data[dstIdx + 2] = b;
        dstData.data[dstIdx + 3] = a;
      }
    }
  
    dstCtx.putImageData(dstData, 0, 0);
    return dstCan.toDataURL();
  }, []);

  const processImageToSquare = useCallback((htmlImg) => {
    const size = Math.min(htmlImg.width, htmlImg.height);
    const sx = (htmlImg.width - size) / 2;
    const sy = (htmlImg.height - size) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(htmlImg, sx, sy, size, size, 0, 0, size, size);
    return canvas.toDataURL();
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageProcessing(true);
    const tmpUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const processed = processImageToSquare(img);
      const side = Math.SQRT2;
      setImage({
        id: `${file.name}-${Date.now()}`,
        src: processed,
        x: -side / 2,
        y: -side / 2,
        width: side,
        height: side,
        rotation: 0,
      });
      setImageProcessing(false);
      URL.revokeObjectURL(tmpUrl);
    };
    img.src = tmpUrl;
  }, [processImageToSquare]);

  const loadSampleImage = useCallback(() => {
    setImageProcessing(true);
    const img = new Image();
    img.onload = () => {
      const processed = processImageToSquare(img);
      const side = Math.SQRT2;
      setImage({
        id: `sample-${Date.now()}`,
        src: processed,
        x: -side / 2,
        y: -side / 2,
        width: side,
        height: side,
        rotation: 0,
      });
      setImageProcessing(false);
    };
    img.src = sampleImageSrc;
  }, [processImageToSquare]);

  useEffect(() => {
    if (!origBmp) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = origBmp.width;
    canvas.height = origBmp.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(origBmp, 0, 0);
    
    const transformed = createAnamorphicTransform(canvas, Rf, arcDegrees);
    setTransformedImage(transformed);
  }, [origBmp, Rf, arcDegrees, createAnamorphicTransform]);

  const deselectOnEmpty = useCallback(() => {}, []);

  const gridHeight = isSmallViewport ? "320px" : "49vh";

  const parameters = [
    {
      label: "Arc Radius (Rf)",
      value: Rf,
      onChange: setRf,
      min: 1.5,
      max: 5,
      step: 0.1
    },
    {
      label: "Arc Degrees",
      value: arcDegrees,
      onChange: setArcDegrees,
      min: 90,
      max: 360,
      step: 1
    }
  ];

  return (
    <div className={layout.pageWrapperResponsive(isSmallViewport)}>
      <h1 className="text-2xl font-bold mb-4">
        Task&nbsp;10: Cylindrical Mirror Anamorphosis
      </h1>

      <ImageUploadControls
        onFileChange={handleFileChange}
        onLoadSample={loadSampleImage}
        imageProcessing={imageProcessing}
        parameters={parameters}
      />

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" style={{ height: gridHeight }}>
        <OpticsGrid onBackgroundClick={deselectOnEmpty} presetName="default" initialShowPolar={true}>
          <Circle x={0} y={0} radius={1} stroke="#2563eb" strokeWidth={0.05} listening={false} />
          
          <Star
            x={0}
            y={Math.SQRT1_2}
            innerRadius={0.05}
            outerRadius={0.15}
            numPoints={5}
            fill="#dc2626"
            listening={false}
          />

          {transformedBmp && (
            <KonvaImage
              image={transformedBmp}
              x={-Rf * 1.5}
              y={-Rf * 1.5 + Rf * 0.3}
              width={Rf * 3}
              height={Rf * 3}
              listening={false}
              opacity={0.9}
            />
          )}
          
          {image && origBmp && (
            <KonvaImage
              image={origBmp}
              x={image.x}
              y={image.y}
              width={image.width}
              height={image.height}
              rotation={image.rotation}
              listening={false}
              opacity={0.3}
            />
          )}
        </OpticsGrid>
      </div>
      
      <Accordion title="How the Anamorphic Transformation Works">
        <div>
            <h4 className="font-semibold text-base text-gray-800 mb-2">Core Concept: Inverse Polar Transform</h4>
            <p className="mb-2">
                This simulation creates a cylindrical anamorphosis effect, which distorts a rectangular image so that it appears normal when viewed in a cylindrical mirror. The algorithm used is an implementation of an inverse polar coordinate transformation, similar to Photoshop's "Polar Coordinates" filter.
            </p>
            <p>
                Instead of taking each pixel from the source and calculating where it goes (which can leave gaps), this method iterates through each pixel of the destination arc and calculates which pixel it corresponds to in the original source image.
            </p>
        </div>
        <div>
            <h4 className="font-semibold text-base text-gray-800 mb-2">The Mapping Process</h4>
            <ol className="list-decimal pl-5 space-y-2 text-sm">
                <li>
                    <strong>Destination to Polar:</strong> Each pixel in the output image is converted into a polar coordinate (radius r, angle θ) relative to the red star at the base of the cylinder.
                </li>
                <li>
                    <strong>Polar to Source:</strong> These polar coordinates are then mapped to the rectangular coordinates (u, v) of the source image.
                    <ul className="list-disc pl-6 mt-1 space-y-1">
                        <li>The <strong>angle `θ`</strong> (from 0 to the chosen Arc Degrees) is mapped to the horizontal position u (from 0 to 1).</li>
                        <li>The <strong>radius `r`</strong> (from 1 to Rf) is mapped to the vertical position v (from 0 to 1), with the inner radius corresponding to the top of the image.</li>
                    </ul>
                </li>
                <li>
                    <strong>Bilinear Interpolation:</strong> Since the calculated source coordinate (u, v) rarely falls exactly on a single pixel, its color is determined by sampling the four surrounding pixels and blending their colors based on proximity. This makes the final transformed image smooth.
                </li>
            </ol>
        </div>
      </Accordion>
    </div>
  );
};
