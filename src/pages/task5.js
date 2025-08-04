import React, { useState, useCallback } from "react";
import { OpticsGrid } from "../components/opticsGrid";
import { OpticsImage } from "../components/opticsImage";
import { ImageUploadControls } from "../components/ImageUploadControls";
import { layout } from "../design-guidelines";
import sampleImage from "../components/example image.jpg";

export const Task5 = (props) => {
  const { isSmallViewport } = props;
  const [image, setImage] = useState(null);
  const [isSelected, setIsSelected] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);

    setImage({
      id: `${file.name}-${Date.now()}`,
      src: url,
      x: 0,
      y: 0,
      rotation: 0
    });

    return () => URL.revokeObjectURL(url);
  }, []);

  const loadSampleImage = useCallback(() => {
    setImage({
      id: `sample-${Date.now()}`,
      src: sampleImage,
      x: 0,
      y: 0,
      rotation: 0
    });
  }, []);

  const deselectOnEmpty = useCallback((e) => {
    if (e.target === e.target.getStage()) {
      setIsSelected(false);
    }
  }, []);

  const gridHeight = isSmallViewport ? "320px" : "65vh";

  return (
    <div className={layout.pageWrapperResponsive(isSmallViewport)}>
      <h1 className="text-2xl font-bold mb-4">Task 5: Plane Mirror (Image Reflection)</h1>

      <ImageUploadControls
        onFileChange={handleFileChange}
        onLoadSample={loadSampleImage}
        imageProcessing={imageProcessing}
      />

      <div
        className="bg-white border border-gray-200 rounded-lg overflow-hidden"
        style={{ height: gridHeight }}
      >
        <OpticsGrid onBackgroundClick={deselectOnEmpty} presetName="default">
          {image && (
            <OpticsImage
              key={image.id}
              shapeProps={{...image, sampleStep: 5}}
              isSelected={isSelected}
              onSelect={() => setIsSelected(true)}
              onChange={(attrs) => setImage(attrs)}
              transformFunc={(x, y) => [-x, y]}
              onProcessingChange={setImageProcessing}
            />
          )}
        </OpticsGrid>
      </div>
    </div>
  );
}
