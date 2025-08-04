import React, { useState, useMemo, useCallback } from 'react';
import { Group, Line, Circle } from 'react-konva';
import { layout } from '../design-guidelines';
import { OpticsGrid } from '../components/opticsGrid';
import { ParameterSlider } from '../components/parameterSlider';
import { abs, max } from '../math_functions'

const DM_PER_M = 10;

export const VisionPage = ({ isSmallViewport }) => {
    const [refractiveError, setRefractiveError] = useState(0);  // Rx in D (‑ for myopia, + for hyperopia)
    const [accommodation,  setAccommodation]   = useState(0);   // D
    const [vitreousDepth,  setVitreousDepth]   = useState(17);  // mm
    const [objectX,        setObjectX]         = useState(0.8); // m (object distance)

    const imageX = useMemo(() => {
        const Ptotal = 1000 / vitreousDepth + refractiveError + accommodation;
        return 1 / (Ptotal - 1 / objectX);
    }, [vitreousDepth, refractiveError, accommodation, objectX]);

    const farPoint = useMemo(() => (
        abs(refractiveError) < 1e-6 ? Infinity : 1 / refractiveError
    ), [refractiveError]);

    const boundXAxis = useCallback(function (this: any, pos: { x: number; y: number }) {
        const stage     = this.getStage();
        const scale     = stage.scaleX();
        const stagePos  = stage.position();

        const toWorld = (p: { x: number; y: number }) => ({
            x: (p.x - stagePos.x) / scale,
            y: (p.y - stagePos.y) / scale,
        });
        const toStage = (p: { x: number; y: number }) => ({
            x: p.x * scale + stagePos.x,
            y: p.y * scale + stagePos.y,
        });

        const world = toWorld(pos);
        world.y = 0;
        world.x = max(0.5, world.x);
        return toStage(world);
    }, []);

    const eyePoints = useMemo(() => {
        const SQ_PER_MM = 0.5;
        const cx = -4;
        const xLeft = -vitreousDepth * SQ_PER_MM;
        const a = cx - xLeft;

        const aSafe = Math.max(a, Math.abs(cx) + 1e-6);

        const denom = 1 - (cx * cx) / (aSafe * aSafe);
        const b = Math.sqrt(4 / denom);

        const STEPS = 180;
        const pts: number[] = [];

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

    return (
        <div className={layout.pageWrapperResponsive(isSmallViewport)}>
            <h1 className="text-2xl font-bold mb-4">Thin‑lens Vision Model</h1>

            <div className="grid gap-2 md:grid-cols-3 md:gap-6 mb-6">
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
            </div>

            <div
                className="border border-gray-700 rounded-lg overflow-hidden"
                style={{ height: isSmallViewport ? '320px' : '70vh' }}
            >
                <OpticsGrid presetName="default">
                    <Group>
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

                        {Number.isFinite(farPoint) && (
                            <Line
                                points={[0, -1, 0, 1]}
                                x={farPoint * DM_PER_M}
                                stroke="#ffa502"
                                strokeWidth={0.1}
                                dash={[0.3, 0.3]}
                                listening={false}
                            />
                        )}

                        <Circle
                            x={-5 * imageX * DM_PER_M * DM_PER_M}
                            y={0}
                            radius={0.2}
                            stroke="#00e0ff"
                            strokeWidth={0.1}
                            listening={false}
                        />
                    </Group>
                    <Group>
                        <Line points={eyePoints} strokeWidth={.05} stroke="ff0000"/>
                    </Group>
                </OpticsGrid>
            </div>
        </div>
    );
};
