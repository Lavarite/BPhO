import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Group, Line, Circle, Text } from 'react-konva';
import { layout } from '../design-guidelines';
import { OpticsGrid } from '../components/opticsGrid';
import { ParameterSlider } from '../components/parameterSlider';
import Accordion from '../components/Accordion';
import { max } from '../math_functions'

const DM_PER_M = 10;

export const VisionPage = ({ isSmallViewport }) => {
    const [refractiveError, setRefractiveError] = useState(0);
    const [accommodation,  setAccommodation]   = useState(0);
    const [vitreousDepth,  setVitreousDepth]   = useState(17);
    const [objectX,        setObjectX]         = useState(0.8);
    
    const [glassesEnabled, setGlassesEnabled] = useState(false);

    const glassesPower = useMemo(() => (glassesEnabled ? -refractiveError : 0), [refractiveError, glassesEnabled]);
    const imageX = useMemo(() => {
        const Ptotal = 1000 / vitreousDepth + refractiveError + accommodation + glassesPower;
        return 1 / (Ptotal - 1 / objectX);
    }, [vitreousDepth, refractiveError, accommodation, glassesPower, objectX]);

    const [snapFocus, setSnapFocus] = useState(false);
    useEffect(() => {
        if (!snapFocus) return;
        const desiredImageDistanceM = vitreousDepth / 1000;
        const requiredPtotal = 1 / desiredImageDistanceM + 1 / objectX;
        const basePower = 1000 / vitreousDepth + refractiveError + glassesPower;
        const requiredAccommodation = requiredPtotal - basePower;
        const clampedAccommodation = Math.max(0, Math.min(10, requiredAccommodation));
        if (Math.abs(clampedAccommodation - accommodation) > 1e-6) {
            setAccommodation(clampedAccommodation);
        }
    }, [snapFocus, objectX, vitreousDepth, refractiveError, glassesPower]);

    useEffect(() => {
        const currentObjectXUnits = objectX * DM_PER_M;
        if (Math.abs(glassesPower) > 1e-9 && currentObjectXUnits < glassesX) {
            setObjectX(glassesX / DM_PER_M);
        }
    }, [glassesPower, objectX]);

    const boundXAxis = useCallback(function (pos) {
        const stage     = this.getStage();
        const scale     = stage.scaleX();
        const stagePos  = stage.position();

        const toWorld = (p) => ({
            x: (p.x - stagePos.x) / scale,
            y: (p.y - stagePos.y) / scale,
        });
        const toStage = (p) => ({
            x: p.x * scale + stagePos.x,
            y: p.y * scale + stagePos.y,
        });

        const world = toWorld(pos);
        world.y = 0;
        const minX = (glassesPower ? glassesX : 0.5);
        world.x = max(minX, world.x);
        return toStage(world);
    }, [glassesPower]);

    const eyePoints = useMemo(() => {
        const cx = -8;
        const xLeft = -vitreousDepth;
        const a = cx - xLeft;

        const aSafe = Math.max(a, Math.abs(cx) + 1e-6);

        const denom = 1 - (cx * cx) / (aSafe * aSafe);
        const b = Math.sqrt(16 / denom);

        const STEPS = 180;
        const pts = [];

        for (let i = 0; i <= STEPS; i++) {
            const x = xLeft + ((0 - xLeft) * i) / STEPS;
            const y =  b * Math.sqrt(1 - ((x - cx) * (x - cx)) / (aSafe * aSafe));
            pts.push(x, y);
        }

        for (let i = STEPS; i >= 0; i--) {
            const x = xLeft + ((0 - xLeft) * i) / STEPS;
            const y = -b * Math.sqrt(1 - ((x - cx) * (x - cx)) / (aSafe * aSafe));
            pts.push(x, y);
        }

        return pts;
    }, [vitreousDepth]);

    const scaleBarY = -7;

    const lensShapePoints = useMemo(() => {
        const base = 0.4 + 0.06 * accommodation;
        const midWidth = Math.max(0.2, Math.min(1.2, base));
        const rightSide = [0, -4, midWidth, -2, midWidth, 2, 0, 4];
        const leftSide = [
            -rightSide[4], rightSide[5],
            -rightSide[2], rightSide[3],
            -rightSide[0], rightSide[1]
        ];
        return [...rightSide, ...leftSide];
    }, [accommodation]);

    const glassesX = 2;
    const glassesShapePoints = useMemo(() => {
        const heightHalf = 4;
        const magnitude = Math.min(1, Math.abs(refractiveError) / 8);
        const edgeWidth = 0.28 + 0.22 * magnitude;
        const centerDelta = 0.45 * magnitude;
        const isConcave = refractiveError > 0;

        const steps = 48;
        const pts = [];

        const widthAt = (y) => {
            const t = y / heightHalf;
            const bulge = 1 - (t * t);
            const centerAdjust = (isConcave ? -1 : 1) * centerDelta * bulge;
            return edgeWidth + centerAdjust;
        };

        // Right boundary: top -> bottom
        for (let i = 0; i <= steps; i++) {
            const y = -heightHalf + (2 * heightHalf * i) / steps;
            const w = widthAt(y);
            pts.push(w, y);
        }
        // Left boundary: bottom -> top (mirror X)
        for (let i = steps; i >= 0; i--) {
            const y = -heightHalf + (2 * heightHalf * i) / steps;
            const w = widthAt(y);
            pts.push(-w, y);
        }

        return pts;
    }, [refractiveError]);

    const objectXUnits = useMemo(() => objectX * DM_PER_M, [objectX]);
    const imageXUnitsLeft = useMemo(() => -1000 * imageX, [imageX]);

    const lensYAbs = useMemo(() => {
        if (!glassesEnabled) return 2;
        const k = Math.min(0.7, Math.abs(glassesPower) / 8);
        const factor = 1 + (glassesPower < 0 ? +k : -k);
        return 2 * factor;
    }, [glassesEnabled, glassesPower]);

    const lensYUpper = lensYAbs;
    const lensYLower = -lensYAbs;

    const yAtGlassesUpperAim = useMemo(() => {
        const targetY = 2;
        const m = (targetY - 0) / (0 - objectXUnits || 1e-9);
        return 0 + m * (glassesX - objectXUnits);
    }, [objectXUnits, glassesX]);

    const yAtGlassesLowerAim = useMemo(() => {
        const targetY = -2;
        const m = (targetY - 0) / (0 - objectXUnits || 1e-9);
        return 0 + m * (glassesX - objectXUnits);
    }, [objectXUnits, glassesX]);

    const preRayUpperPoints = useMemo(() => (
        Math.abs(glassesPower) > 1e-9
            ? [objectXUnits, 0, glassesX, yAtGlassesUpperAim, 0, lensYUpper]
            : [objectXUnits, 0, 0, 2]
    ), [glassesPower, objectXUnits, glassesX, yAtGlassesUpperAim, lensYUpper]);

    const preRayLowerPoints = useMemo(() => (
        Math.abs(glassesPower) > 1e-9
            ? [objectXUnits, 0, glassesX, yAtGlassesLowerAim, 0, lensYLower]
            : [objectXUnits, 0, 0, -2]
    ), [glassesPower, objectXUnits, glassesX, yAtGlassesLowerAim, lensYLower]);

    const postLensRayEnd = useMemo(() => {
        const lensY = lensYUpper;
        if (!Number.isFinite(imageXUnitsLeft)) {
            return { x: -200, y: lensY };
        }
        const x1 = 0, y1 = lensY;
        const x2 = imageXUnitsLeft, y2 = 0;
        const X_END = imageXUnitsLeft < 0 ? -200 : 200;
        const m = (y2 - y1) / (x2 - x1 || 1e-9);
        const yEnd = y1 + m * (X_END - x1);
        return { x: X_END, y: yEnd };
    }, [imageXUnitsLeft, lensYUpper]);

    const postLensRayEndLower = useMemo(() => ({ x: postLensRayEnd.x, y: -postLensRayEnd.y }), [postLensRayEnd]);

    return (
        <div className={layout.pageWrapperResponsive(isSmallViewport)}>
            <h1 className="text-2xl font-bold mb-4">Thin‑lens Vision Model</h1>

            <div className="grid gap-2 md:grid-cols-4 md:gap-6 mb-6">
                <ParameterSlider
                    label="Refractive Error (Rx)"
                    value={refractiveError}
                    onChange={setRefractiveError}
                    min={-10}
                    max={+10}
                    step={0.25}
                    unit="D"
                />
                <ParameterSlider
                    label="Accommodation Amplitude"
                    value={accommodation}
                    onChange={setAccommodation}
                    min={0}
                    max={10}
                    step={0.25}
                    unit="D"
                    disabled={snapFocus}
                />
                <ParameterSlider
                    label="Vitreous Depth"
                    value={vitreousDepth}
                    onChange={setVitreousDepth}
                    min={16.5}
                    max={19}
                    step={0.1}
                    unit="mm"
                />
                <div className="flex flex-col gap-2 mt-2 justify-start">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600">Snap focus to retina</span>
                        <button
                            onClick={() => setSnapFocus(!snapFocus)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${snapFocus ? 'bg-blue-600' : 'bg-gray-300'}`}
                            aria-pressed={snapFocus}
                            aria-label="Snap focus to retina"
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${snapFocus ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600">Enable correction (glasses)</span>
                        <button
                            onClick={() => setGlassesEnabled(!glassesEnabled)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${glassesEnabled ? 'bg-green-600' : 'bg-gray-300'}`}
                            aria-pressed={glassesEnabled}
                            aria-label="Enable correction"
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${glassesEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                            />
                        </button>
                    </div>
                </div>
            </div>

            <div
                className="border border-gray-700 rounded-lg overflow-hidden"
                style={{ height: isSmallViewport ? '320px' : '70vh' }}
            >
                <OpticsGrid presetName="default">
                    <Group>
                        <Group listening={false}>
                            <Line points={[-2, scaleBarY, -1, scaleBarY]} stroke="#374151" strokeWidth={0.12} listening={false} />
                            <Text x={-2} y={scaleBarY - 0.7} text="1 mm" fontSize={0.6} fill="#374151" listening={false} />
                            <Line points={[1, scaleBarY, 2, scaleBarY]} stroke="#374151" strokeWidth={0.12} listening={false} />
                            <Text x={1} y={scaleBarY - 0.7} text="10 cm" fontSize={0.6} fill="#374151" listening={false} />
                        </Group>

                        <Line
                            points={lensShapePoints}
                            stroke="#2563eb"
                            strokeWidth={0.1}
                            fill="#a5b4fc"
                            opacity={0.5}
                            listening={false}
                            bezier={true}
                            closed={true}
                        />

                        {Math.abs(glassesPower) > 1e-9 && (
                          <Group x={glassesX} listening={false}>
                            <Line
                              points={glassesShapePoints}
                              stroke="#059669"
                              strokeWidth={0.08}
                              fill="#10b98155"
                              closed={true}
                            />
                          </Group>
                        )}

                        <Circle
                            x={objectX * DM_PER_M}
                            y={0}
                            radius={0.3}
                            stroke="#00ff00"
                            strokeWidth={0.1}
                            draggable
                            dragBoundFunc={boundXAxis}
                            onDragMove={(evt) => setObjectX(evt.target.x() / DM_PER_M)}
                        />

                        {Number.isFinite(imageX) && (
                            <Circle
                                x={imageXUnitsLeft}
                                y={0}
                                radius={0.2}
                                stroke="#00e0ff"
                                strokeWidth={0.1}
                                listening={false}
                            />
                        )}

                        <Line
                            points={preRayUpperPoints}
                            stroke="#f59e0b"
                            strokeWidth={0.12}
                            listening={false}
                        />
                        <Line
                            points={[0, lensYUpper, postLensRayEnd.x, postLensRayEnd.y]}
                            stroke="#f59e0b"
                            strokeWidth={0.12}
                            listening={false}
                        />
                        <Line
                            points={preRayLowerPoints}
                            stroke="#f59e0b"
                            strokeWidth={0.12}
                            listening={false}
                        />
                        <Line
                            points={[0, lensYLower, postLensRayEndLower.x, postLensRayEndLower.y]}
                            stroke="#f59e0b"
                            strokeWidth={0.12}
                            listening={false}
                        />
                    </Group>
                    <Group>
                        <Line points={eyePoints} strokeWidth={0.05} stroke="#ff0000"/>
                    </Group>
                </OpticsGrid>
            </div>
            <div className="mt-6">
                <Accordion title="How the Vision Model Works">
                    <div>
                        <h4 className="font-semibold text-base text-gray-800 mb-2">Image Distance and Dioptric Power</h4>
                        <p className="mb-2 text-sm">
                            The total optical power P (in diopters) is the sum of the eye's base power, refractive error, and accommodation:
                        </p>
                        <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">P = 1000 / dᵥ + Rx + A</div>
                        <p className="mt-2 text-sm">Here dᵥ is vitreous depth in mm, Rx is refractive error (D), and A is accommodation (D).</p>
                        <p className="mt-2 text-sm">The thin-lens relation gives the image distance xᵢ (meters) for an object at distance xₒ (meters):</p>
                        <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">xᵢ = 1 / (P - 1 / xₒ)</div>
                    </div>
                    <div className="mt-3">
                        <h4 className="font-semibold text-base text-gray-800 mb-2">Scaling and Geometry</h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                            <li><b>Grid scale:</b> Left side uses 1 mm per square; right side uses 10 cm per square.</li>
                            <li><b>Lens:</b> Centered at (0,0), biconvex, height = 8 squares; width varies with accommodation.</li>
                            <li><b>Eye outline:</b> Computed as an ellipse-like boundary with left-most extent at −dᵥ (in squares) and vertical semi-axis of 4 squares.</li>
                        </ul>
                    </div>
                    <div className="mt-3">
                        <h4 className="font-semibold text-base text-gray-800 mb-2">Why changing the VCD does not change the image position</h4>
                        <p className="text-sm">
                            From the thin‑lens formula 1/xᵢ = P − 1/xₒ, increasing VCD (dᵥ) changes the base power term 1000/dᵥ. In the real eye, accommodation co‑varies with VCD and corneal curvature so that the total power P adjusts to keep the image near the retina over a wide range of VCD values. In this simplified model, you can emulate that behavior by enabling the snap toggle, which recomputes A to maintain xᵢ ≈ dᵥ/1000.
                        </p>
                    </div>
                </Accordion>
            </div>
        </div>
    );
};
