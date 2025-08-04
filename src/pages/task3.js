import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Stage, Layer, Line, Circle, Text, Rect, Group } from 'react-konva';
import {
    LineChart,
    Line as RechartsLine,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
} from 'recharts';
import { colors, chartConfig, layout, taskConfig, chartStyles } from '../design-guidelines';
import { abs, min, max, floor,  hypot, atan, toDeg } from '../math_functions';

import Accordion from '../components/Accordion';

export const Task3 = (props) => {
    const { isSmallViewport } = props;
    
    const config = taskConfig.task3;
    const fermatConfig = taskConfig.fermat;
    const mediaProperties = fermatConfig.media;
    
    const L_MAX = config.worldSize.L_MAX;
    const H_MAX = config.worldSize.H_MAX;
    const H_MIN = config.worldSize.H_MIN;

    const [pointA, setPointA] = useState(config.defaultPoints.A);
    const [pointB, setPointB] = useState(config.defaultPoints.B);
    const [pointS, setPointS] = useState(config.defaultPoints.S);

    const [snapToOptimal, setSnapToOptimal] = useState(false);
    const [medium, setMedium] = useState(config.defaults.medium);
    const [waveType, setWaveType] = useState(config.defaults.waveType);

    const [stageSize, setStageSize] = useState({ width: 600, height: 400 });
    const [offsets, setOffsets] = useState({ x: 0, y: 0 });
    const stageParentRef = useRef(null);
    const isCanvasSmall = useMemo(() => stageSize.width < 500, [stageSize.width]);
    const padding = isCanvasSmall ? config.ui.padding.small : config.ui.padding.normal;

    // Scale and offsets
    const scale = useMemo(() => {
        if (stageSize.width <= 0) return 1;
        const horizontalScale = (stageSize.width - 2 * padding) / L_MAX;
        const verticalScale = (stageSize.height - 2 * padding) / H_MAX;
        return min(horizontalScale, verticalScale);
    }, [stageSize, padding, L_MAX, H_MAX]);

    useEffect(() => {
        if (stageSize.width <= 0 || stageSize.height <= 0) return;
        const contentWidth = L_MAX * scale;
        const contentHeight = H_MAX * scale;
        setOffsets({
            x: (stageSize.width - contentWidth) / 2,
            y: (stageSize.height - contentHeight) / 2,
        });
    }, [stageSize, scale, L_MAX, H_MAX]);

    const chartHeight = useMemo(() => {
        if (isSmallViewport) return 300;
        return stageSize.width < 500 ? 320 : 370;
    }, [stageSize, isSmallViewport]);
    
    useEffect(() => {
        const handleResize = () => {
            if (stageParentRef.current) {
                const { width, height } = stageParentRef.current.getBoundingClientRect();
                setStageSize({ width, height });
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        const node = stageParentRef.current;
        if (node) {
            resizeObserver.observe(node);
            handleResize();
        }

        return () => {
            if (node) {
                resizeObserver.unobserve(node);
            }
        };
    }, []);


    // Coordinate conversion functions
    const toCanvas = (x, y) => ({
        x: offsets.x + x * scale,
        y: stageSize.height - (offsets.y + y * scale),
    });

    const fromCanvas = ({ x, y }) => ({
        x: (x - offsets.x) / scale,
        y: (stageSize.height - y - offsets.y) / scale
    });

    const canvasZero = toCanvas(0, 0);

    const handleWaveTypeChange = (newType) => {
        setWaveType(newType);
        if (!mediaProperties[newType][medium]) {
            setMedium('air');
        }
    };


    const { plotData, minTimeData, timeRange } = useMemo(() => {
        const data        = [];
        const numPoints   = fermatConfig.chart.plotPoints;
        const timeMul     = fermatConfig.chart.timeMultiplier[waveType];

        let minTimeAll    =  Infinity;
        let maxTimeAll    = -Infinity;
        let minTime       =  Infinity;
        let minX          =  0;

        const getTime = (xPos) => {
            const distAS = hypot(xPos, pointA.y);
            const distSB = hypot(pointB.x - xPos, pointB.y);
            return (distAS + distSB) / (mediaProperties[waveType][medium]?.speed || 3e8);
        };

        for (let i = 0; i <= numPoints; i++) {
            const xPos = (i / numPoints) * pointB.x;
            const t    = getTime(xPos) * timeMul;

            if (t < minTime) {
                minTime = t;
                minX    = xPos;
            }

            if (t < minTimeAll) minTimeAll = t;
            if (t > maxTimeAll) maxTimeAll = t;

            data.push({ x: xPos, time: t });
        }

        const span = maxTimeAll - minTimeAll || 1; // avoid zero span
        const pad  = span * 0.1;

        return {
            plotData: data,
            minTimeData: { x: minX, time: minTime },
            timeRange: { min: minTimeAll - pad, max: maxTimeAll + pad }
        };
    }, [pointA, pointB, medium, waveType]);

    const angles = useMemo(() => {
        const angleIncidence = atan(pointS.x / pointA.y) * toDeg;
        const angleReflection = atan((pointB.x - pointS.x) / pointB.y) * toDeg;
        const expectedX = (pointB.x) * pointA.y / (pointA.y + pointB.y);
        return {
            incident: angleIncidence,
            reflection: angleReflection,
            expectedX: expectedX,
        };
    }, [pointA, pointB, pointS]);

    const handleDragA = (e) => {
        setPointA({x: 0, y: fromCanvas(e.target.position()).y});
    };

    const handleDragB = (e) => {
        setPointB({x: pointB.x, y: fromCanvas(e.target.position()).y});
    };

    const handleDragS = (e) => {
        setPointS({ x: fromCanvas(e.target.position()).x, y: 0 });
    };

    const handleDragL = (e) => {
        setPointB({ x: fromCanvas(e.target.position()).x, y: pointB.y });
    };

    useEffect(() => {
        if (snapToOptimal) {
            const optimalX = (pointB.x * pointA.y) / (pointA.y + pointB.y);
            setPointS({ x: optimalX, y: 0 });
        }
    }, [snapToOptimal, pointA, pointB]);

    const ParameterDisplay = () => (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 h-full">
            <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-gray-600">h₁:</span>
                    <span className="font-semibold text-blue-700">{pointA.y.toFixed(1)} m</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-600">h₂:</span>
                    <span className="font-semibold text-blue-700">{pointB.y.toFixed(1)} m</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-600">x:</span>
                    <span className="font-semibold text-green-700">{pointS.x.toFixed(1)} m</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-600">L:</span>
                    <span className="font-semibold text-purple-700">{pointB.x.toFixed(1)} m</span>
                </div>
            </div>
            <div className="mt-2 pt-2 border-t border-blue-200">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">θᵢ = {angles.incident.toFixed(1)}°</span>
                    <span className="text-gray-600">θᵣ = {angles.reflection.toFixed(1)}°</span>
                    <span
                        className={`font-semibold ${
                            abs(angles.incident - angles.reflection) < 0.5
                                ? 'text-green-600'
                                : 'text-orange-600'
                        }`}
                    >
                        Δθ = {abs(angles.incident - angles.reflection).toFixed(1)}°
                    </span>
                </div>
            </div>
        </div>
    );

    const MaterialSelector = () => (
        <div className="bg-white border border-gray-200 rounded-lg p-3 h-full">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Wave Type</label>
                    <div className="flex gap-1">
                        {['light', 'sound'].map((type) => (
                            <button
                                key={type}
                                onClick={() => handleWaveTypeChange(type)}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                    waveType === type
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                {type === 'light' ? 'Light' : 'Sound'}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Medium</label>
                    <div className="grid grid-cols-2 gap-1">
                        {Object.entries(mediaProperties[waveType]).map(([key, props]) => (
                            <button
                                key={key}
                                onClick={() => setMedium(key)}
                                className={`px-2 py-1 text-xs rounded transition-colors ${
                                    medium === key
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                                style={{
                                    backgroundColor: medium === key ? undefined : props.color,
                                    color: medium === key ? undefined : '#374151',
                                }}
                                title={props.shortLabel}
                            >
                                {props.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
                {waveType === 'light' ? (
                    <span>
                        Speed: {((mediaProperties[waveType][medium]?.speed || 3e8) / 1e8).toFixed(2)} × 10⁸ m/s (n = {mediaProperties.light[medium].n.toFixed(2)})
                    </span>
                ) : (
                    <span>Speed: {(mediaProperties[waveType][medium]?.speed || 3e8).toFixed(1)} m/s</span>
                )}
            </div>
        </div>
    );

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload[0]) {
            const xPosition = payload[0].payload.x;
            const time = payload[0].payload.time;
            const distAS = hypot(xPosition, pointA.y);
            const distSB = hypot(pointB.x - xPosition, pointB.y);
            
            return (
                <div className="bg-white/95 px-2 py-1 rounded shadow-md border border-gray-200 text-xs">
                    <div className="font-semibold">x = {xPosition.toFixed(2)} m</div>
                    <div className="text-gray-700">
                        t = {time.toPrecision(3)} {waveType === 'sound' ? 'ms' : 'ns'}
                    </div>
                    <div className="text-gray-600 text-[10px] mt-0.5">
                        A→S: {distAS.toFixed(1)}m, S→B: {distSB.toFixed(1)}m
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className={layout.pageWrapperResponsive(isSmallViewport)}>
            <h1 className="text-2xl font-bold mb-4">Task 3: Fermat's Principle - Law of Reflection</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <MaterialSelector />
                <ParameterDisplay />
            </div>

            <div className={`grid ${isSmallViewport ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <div className="bg-white border border-gray-200 rounded-lg p-2 flex flex-col">
                    <div className="flex justify-between items-center mb-2 px-2">
                        <h2 className="text-lg font-semibold">Interactive Ray Diagram</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-600">Snap to Optimal</span>
                            <button
                                onClick={() => setSnapToOptimal(!snapToOptimal)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                                    snapToOptimal ? 'bg-blue-600' : 'bg-gray-200'
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                        snapToOptimal ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>
                    <div className="relative flex-grow min-h-[350px]">
                        <div ref={stageParentRef} className="absolute inset-0">
                            <Stage width={stageSize.width} height={stageSize.height}>
                                <Layer>
                                    <Rect
                                        x={0}
                                        y={0}
                                        width={stageSize.width}
                                        height={canvasZero.y}
                                        fill={mediaProperties[waveType][medium]?.color || '#F9FAFB'}
                                    />

                                    <Line
                                        points={[canvasZero.x, canvasZero.y, toCanvas(pointB.x + 0.5, 0).x, canvasZero.y]}
                                        stroke="#1F2937"
                                        strokeWidth={4}
                                    />

                                    <Line
                                        points={[
                                            toCanvas(pointS.x, 0).x,
                                            canvasZero.y,
                                            toCanvas(pointS.x, 0).x,
                                            max(padding, toCanvas(0, pointS.y).y - max(pointA.y, pointB.y) * scale - 20),
                                        ]}
                                        stroke="#6B7280"
                                        strokeWidth={2}
                                        dash={[5, 5]}
                                    />

                                    <Line
                                        points={[
                                            canvasZero.x,
                                            toCanvas(0, pointA.y).y,
                                            toCanvas(pointS.x, 0).x,
                                            canvasZero.y
                                        ]}
                                        stroke="#DC2626"
                                        strokeWidth={3}
                                    />

                                    <Line
                                        points={[
                                            toCanvas(pointS.x, 0).x,
                                            canvasZero.y,
                                            toCanvas(pointB.x, 0).x,
                                            toCanvas(0, pointB.y).y
                                        ]}
                                        stroke="#DC2626"
                                        strokeWidth={3}
                                    />

                                    <Group>
                                        <Circle
                                            x={canvasZero.x}
                                            y={toCanvas(0, pointA.y).y}
                                            radius={isCanvasSmall ? fermatConfig.canvas.pointRadius.normal : fermatConfig.canvas.pointRadius.small}
                                            fill={colors.primary}
                                            stroke={colors.gray[50]}
                                            strokeWidth={fermatConfig.canvas.lineWidth.normal}
                                            draggable
                                            dragBoundFunc={(pos) => {
                                                const worldHeight = (stageSize.height - 2 * offsets.y) / scale;
                                                return {
                                                    x: canvasZero.x,
                                                    y: max(
                                                        toCanvas(0, min(worldHeight, H_MAX)).y,
                                                        min(toCanvas(0, H_MIN).y, pos.y)
                                                    ),
                                                };
                                            }}
                                            onDragMove={handleDragA}
                                            onDragEnd={() => document.body.style.cursor = 'default'}
                                            onMouseEnter={() => document.body.style.cursor = 'ns-resize'}
                                            onMouseLeave={() => document.body.style.cursor = 'default'}
                                        />
                                        <Text
                                            x={canvasZero.x - 10}
                                            y={toCanvas(0, pointA.y).y - 25}
                                            text="A"
                                            fontSize={16}
                                            fontStyle="bold"
                                            fill="#1F2937"
                                        />
                                    </Group>

                                    <Group>
                                        <Circle
                                            x={toCanvas(pointS.x, 0).x}
                                            y={canvasZero.y}
                                            radius={isCanvasSmall ? fermatConfig.canvas.pointRadius.normal : fermatConfig.canvas.pointRadius.small}
                                            fill={snapToOptimal ? colors.error : colors.primary}
                                            stroke={colors.gray[50]}
                                            strokeWidth={fermatConfig.canvas.lineWidth.normal}
                                            draggable={!snapToOptimal}
                                            dragBoundFunc={(pos) => {
                                                const maxX = padding + pointB.x * scale;
                                                return {
                                                    x: max(canvasZero.x, min(maxX, pos.x)),
                                                    y: canvasZero.y,
                                                };
                                            }}
                                            onDragMove={handleDragS}
                                            onDragEnd={() => document.body.style.cursor = 'default'}
                                            onMouseEnter={() => { document.body.style.cursor = !snapToOptimal ? 'ew-resize' : 'not-allowed'; }}
                                            onMouseLeave={() => document.body.style.cursor = 'default'}
                                        />
                                        <Text
                                            x={toCanvas(pointS.x, 0).x - 10}
                                            y={canvasZero.y + 15}
                                            text="S"
                                            fontSize={16}
                                            fontStyle="bold"
                                            fill="#1F2937"
                                        />
                                    </Group>

                                    <Group>
                                        <Circle
                                            x={toCanvas(pointB.x, 0).x}
                                            y={toCanvas(0, pointB.y).y}
                                            radius={isCanvasSmall ? fermatConfig.canvas.pointRadius.normal : fermatConfig.canvas.pointRadius.small}
                                            fill={colors.primary}
                                            stroke={colors.gray[50]}
                                            strokeWidth={fermatConfig.canvas.lineWidth.normal}
                                            draggable
                                            dragBoundFunc={(pos) => {
                                                const worldHeight = (stageSize.height - 2 * offsets.y) / scale;
                                                return {
                                                    x: toCanvas(pointB.x, 0).x,
                                                    y: max(
                                                        toCanvas(0, min(worldHeight, H_MAX)).y,
                                                        min(toCanvas(0, H_MIN).y, pos.y)
                                                    ),
                                                };
                                            }}
                                            onDragMove={handleDragB}
                                            onDragEnd={() => document.body.style.cursor = 'default'}
                                            onMouseEnter={() => document.body.style.cursor = 'ns-resize'}
                                            onMouseLeave={() => document.body.style.cursor = 'default'}
                                        />
                                        <Text
                                            x={toCanvas(pointB.x, 0).x - 10}
                                            y={toCanvas(0, pointB.y).y - 25}
                                            text="B"
                                            fontSize={16}
                                            fontStyle="bold"
                                            fill="#1F2937"
                                        />
                                    </Group>

                                    <Line
                                        points={[
                                            canvasZero.x,
                                            canvasZero.y + (isSmallViewport ? 20 : 30),
                                            canvasZero.x,
                                            canvasZero.y + (isSmallViewport ? 30 : 40),
                                            toCanvas(pointB.x, 0).x,
                                            canvasZero.y + (isSmallViewport ? 30 : 40),
                                            toCanvas(pointB.x, 0).x,
                                            canvasZero.y + (isSmallViewport ? 20 : 30),
                                        ]}
                                        stroke="#6B7280"
                                        strokeWidth={1}
                                        dash={[5, 5]}
                                    />
                                    <Text
                                        x={toCanvas(pointB.x, 0).x / 2}
                                        y={canvasZero.y + (isSmallViewport ? 35 : 45)}
                                        text={`L = ${pointB.x.toFixed(1)} m`}
                                        fontSize={14}
                                        fill="#4B5563"
                                    />

                                    <Circle
                                        x={toCanvas(pointB.x, 0).x}
                                        y={canvasZero.y}
                                        radius={fermatConfig.canvas.pointRadius.normal}
                                        fill={colors.secondary}
                                        stroke={colors.gray[50]}
                                        strokeWidth={fermatConfig.canvas.lineWidth.normal}
                                        draggable
                                        dragBoundFunc={(pos) => ({
                                            x: max(
                                                padding + 5 * scale,
                                                toCanvas(pointS.x, 0).x,
                                                min(
                                                    padding + min(L_MAX * scale, (stageSize.width - 2 * padding)),
                                                    pos.x
                                                )
                                            ),
                                            y: canvasZero.y,
                                        })}
                                        onDragMove={handleDragL}
                                        onDragEnd={() => (document.body.style.cursor = 'default')}
                                        onMouseEnter={() => (document.body.style.cursor = 'ew-resize')}
                                        onMouseLeave={() => (document.body.style.cursor = 'default')}
                                    />
                                </Layer>
                            </Stage>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h2 className="text-lg font-semibold mb-4">Travel Time vs Position</h2>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                        <LineChart 
                            data={plotData} 
                            margin={{
                                top: chartConfig.general.marginTop,
                                right: chartConfig.general.marginRight,
                                left: chartConfig.general.marginLeft,
                                bottom: chartConfig.general.marginBottom
                            }}
                        >
                            <CartesianGrid strokeDasharray={chartConfig.general.gridDashArray} />
                            <XAxis
                                dataKey="x"
                                domain={[0, pointB.x.toFixed(1)]}
                                type="number"
                                ticks={[0, ...[...Array(floor(pointB.x)).keys()].map(i => i + 1).filter(v => v < pointB.x), +pointB.x.toFixed(1)]}
                                label={chartStyles.axisLabel.x('Position x (m)')}
                            />
                            <YAxis
                                label={chartStyles.axisLabel.y(`Travel Time (${waveType === 'sound' ? 'ms' : 'ns'})`)}
                                domain={[timeRange.min, timeRange.max]}
                                tickFormatter={chartStyles.tickFormat.threeSf}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine
                                x={pointS.x}
                                stroke={colors.error}
                                strokeDasharray={chartConfig.lineChart.referenceLineDashArray}
                                strokeWidth={2}
                                label={{
                                    value: 'Current x',
                                    fill: colors.error,
                                    fontSize: chartConfig.lineChart.referenceLabelFontSize,
                                    position: 'insideTopRight',
                                }}
                            />
                            <ReferenceLine
                                x={minTimeData.x}
                                stroke={colors.accent}
                                strokeDasharray={chartConfig.lineChart.referenceLineDashArray}
                                strokeWidth={2}
                                label={{
                                    value: 'Minimum',
                                    fill: colors.accent,
                                    fontSize: chartConfig.lineChart.referenceLabelFontSize,
                                    position: 'insideBottomLeft',
                                }}
                            />
                            <RechartsLine
                                type="monotone"
                                dataKey="time"
                                stroke={colors.primary}
                                strokeWidth={chartConfig.lineChart.line.strokeWidth}
                                dot={chartConfig.lineChart.line.dot}
                                activeDot={(props) => {
                                    const { cx, cy } = props;
                                    return <circle cx={cx} cy={cy} r={chartConfig.general.activeDotRadius} fill={colors.primary} stroke="none" />;
                                }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-6">
                <Accordion title="Physics Explanation & Calculations">
                    <div>
                        <h4 className="font-semibold text-base text-gray-800 mb-2">Optimal Position (Fermat's Principle)</h4>
                        <p className="mb-2">
                            Fermat's Principle states that the path taken by a ray of light between two points is the path that takes the least time. For reflection, this leads to the Law of Reflection (θᵢ = θᵣ).
                        </p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>
                                Total time T(x) is the sum of times for paths AS and SB:
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    T(x) = (√(h₁² + x²) + √(h₂² + (L-x)²)) / v
                                </div>
                            </li>
                            <li>
                                Minimize time by taking the derivative with respect to x and setting it to zero (dT/dx = 0):
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    d/dx [√(h₁² + x²) + √(h₂² + (L-x)²)] = 0
                                </div>
                            </li>
                            <li>
                                This yields <code className="font-mono text-xs">x/√(h₁²+x²) = (L-x)/√(h₂²+(L-x)²)</code>, which is <code className="font-mono text-xs">sin(θᵢ) = sin(θᵣ)</code>.
                            </li>
                            <li>
                                The optimal position x is found by similar triangles:
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    x / h₁ = (L - x) / h₂  =&gt;  x = L * h₁ / (h₁ + h₂)
                                </div>
                                <p className="mt-1 text-xs">
                                    For h₁={pointA.y.toFixed(1)}m, h₂={pointB.y.toFixed(1)}m, L={pointB.x.toFixed(1)}m, the optimal x is <strong>{angles.expectedX.toFixed(2)} m</strong>.
                                </p>
                            </li>
                        </ol>
                    </div>
                    <div>
                        <h4 className="font-semibold text-base text-gray-800 mb-2">Current Position Calculations</h4>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                Incident Angle (θᵢ) is calculated from the triangle formed by A and S.
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    θᵢ = atan(x / h₁) = atan({pointS.x.toFixed(1)} / {pointA.y.toFixed(1)}) = {angles.incident.toFixed(2)}°
                                </div>
                            </li>
                            <li>
                                Reflection Angle (θᵣ) is calculated from the triangle formed by S and B.
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    θᵣ = atan((L - x) / h₂) = atan(({(pointB.x - pointS.x).toFixed(1)}) / {pointB.y.toFixed(1)}) = {angles.reflection.toFixed(2)}°
                                </div>
                            </li>
                             <li>
                                Angle Difference (Δθ) is the absolute difference between the angles.
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    Δθ = |θᵢ - θᵣ| = |{angles.incident.toFixed(2)}° - {angles.reflection.toFixed(2)}°| = {abs(angles.incident - angles.reflection).toFixed(2)}°
                                </div>
                            </li>
                        </ul>
                    </div>
                </Accordion>
            </div>
        </div>
    );
};