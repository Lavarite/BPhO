import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Stage, Layer, Line, Circle, Text, Rect, Group } from 'react-konva';
import {
    LineChart,
    Line as RechartsLine,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from 'recharts';
import { chartConfig, colors, layout, taskConfig, chartStyles } from '../design-guidelines';
import { abs, floor, hypot, min, max, asin, toDeg, distance, clamp, getIncidentAngle } from '../math_functions';

import Accordion from '../components/Accordion';

export const Task4 = (props) => {
    const { isSmallViewport } = props;
    
    const config = taskConfig.task4;
    const fermatConfig = taskConfig.fermat;
    const mediaProperties = fermatConfig.media;

    const L = config.worldSize.L;
    const L_MAX = config.worldSize.L_MAX;
    const H_MAX = config.worldSize.H_MAX;
    const H_MIN = config.worldSize.H_MIN;
    const INTERFACE_Y = config.interface.Y;

    const [pointA, setPointA] = useState(config.defaultPoints.A);
    const [pointB, setPointB] = useState(config.defaultPoints.B);
    const [pointS, setPointS] = useState({ x: config.defaultPoints.S, y: INTERFACE_Y });

    const [snapToOptimal, setSnapToOptimal] = useState(false);
    const [medium1, setMedium1] = useState(config.defaults.medium1);
    const [medium2, setMedium2] = useState(config.defaults.medium2);
    const [waveType, setWaveType] = useState(config.defaults.waveType);

    const [stageSize, setStageSize] = useState({ width: 600, height: 400 });
    const [offsets, setOffsets] = useState({ x: 0, y: 0 });
    const stageParentRef = useRef(null);
    const isCanvasSmall = useMemo(() => stageSize.width < 500, [stageSize.width]);

    // Scale and offsets
    const scale = useMemo(() => {
        if (stageSize.width <= 0 || stageSize.height <= 0) return 1;
        return min(
            (stageSize.width * 0.8) / L_MAX,
            (stageSize.height * 0.8) / H_MAX
        );
    }, [stageSize, L_MAX, H_MAX]);

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


    const toCanvas = (x, y) => ({
        x: offsets.x + x * scale,
        y: stageSize.height - (offsets.y + y * scale),
    });

    const fromCanvas = ({ x, y }) => ({
        x: (x - offsets.x) / scale,
        y: (stageSize.height - y - offsets.y) / scale
    });

    const getCriticalAngle = (waveType, n1, n2, c1, c2) => {
        if (waveType === 'light') {
            return n1 > n2 ? asin(n2 / n1) * toDeg : Infinity;
        }
        return c1 < c2 ? asin(c1 / c2) * toDeg : Infinity;
    };

    const handleWaveTypeChange = (newType) => {
        setWaveType(newType);
        if (!mediaProperties[newType][medium1]) {
            setMedium1('air');
        }
        if (!mediaProperties[newType][medium2]) {
            setMedium2('air');
        }
    };
    

    const {optimPath, currentPath, tirStatus} = useMemo(() => {
        const n1 = mediaProperties[waveType][medium1].n;
        const n2 = mediaProperties[waveType][medium2].n;

        const c1 = mediaProperties[waveType][medium1].speed;
        const c2 = mediaProperties[waveType][medium2].speed;

        const criticalAngle = getCriticalAngle(waveType, n1, n2, c1, c2);

        const timeAt = (ix) => {
            const d1 = distance(pointA.x, pointA.y, ix, INTERFACE_Y);
            const d2 = distance(ix, INTERFACE_Y, pointB.x, pointB.y);
            return d1 / c1 + d2 / c2;
        };

        let left  = Math.min(0, pointA.x, pointB.x);
        let right = Math.max(L_MAX, pointA.x, pointB.x);

        for (let i = 0; i < 30; ++i) {
            const m1 = left  + (right - left) / 3;
            const m2 = right - (right - left) / 3;
            (timeAt(m1) < timeAt(m2)) ? right = m2 : left = m1;
        }

        const optX          = (left + right) / 2;
        const incAngleOpt   = getIncidentAngle(optX - pointA.x, INTERFACE_Y - pointA.y);
        const violatesTIR   = incAngleOpt > criticalAngle;
        let   finalX        = optX;

        if (violatesTIR) {
            const dy        = INTERFACE_Y - pointA.y;
            const dxAllowed = Math.tan(criticalAngle / toDeg) * Math.abs(dy);
            finalX          = pointA.x + dxAllowed * Math.sign(optX - pointA.x);
        }

        const finalIncident   = getIncidentAngle(finalX - pointA.x, INTERFACE_Y - pointA.y);
        const finalRefracted  = getIncidentAngle(pointB.x - finalX,  pointB.y - INTERFACE_Y);
        const finalTime       = timeAt(finalX);

        const optimPath = {
            interfaceX     : finalX,
            incidentAngle  : finalIncident,
            refractedAngle : finalRefracted,
            time           : finalTime,
            hasTIR         : false
        };

        const currentPath = {
            interfaceX     : pointS.x,
            incidentAngle  : getIncidentAngle(pointS.x - pointA.x, INTERFACE_Y - pointA.y),
            refractedAngle : getIncidentAngle(pointB.x - pointS.x, pointB.y - INTERFACE_Y),
        };

        let tirStatus;
        if (!Number.isFinite(criticalAngle)) {
            tirStatus = { isPossible: false, criticalAngle: null, isOccurring: false };
        } else {
            const dxMax           = Math.max(Math.abs(pointA.x), Math.abs(pointA.x - L_MAX));
            const dy              = Math.abs(INTERFACE_Y - pointA.y);
            const maxIncident     = getIncidentAngle(dxMax, dy);

            tirStatus = {
                isPossible  : maxIncident > criticalAngle,
                criticalAngle,
                isOccurring : currentPath.incidentAngle > criticalAngle
            };
        }

        return { optimPath, currentPath, tirStatus };
    }, [
        pointA, pointB, pointS,
        medium1, medium2, waveType,
        INTERFACE_Y, mediaProperties, L_MAX
    ]);

    const { plotData, tirPoints } = useMemo(() => {
        const { chart }   = fermatConfig;
        const steps       = chart.plotPoints;
        const timeMul     = chart.timeMultiplier[waveType];
        const yI          = INTERFACE_Y;
    
        const { speed: c1, n: n1 } = mediaProperties[waveType][medium1];
        const { speed: c2, n: n2 } = mediaProperties[waveType][medium2];
    
        const tirPossible = waveType === "light" ? n1 > n2 : c1 < c2;
        const critAngle   = tirPossible ? Math.asin(waveType === "light" ? n2 / n1 : c1 / c2) * toDeg : Infinity;
    
        if (Math.abs(pointB.x - pointA.x) < 1e-2) {
            const d1   = Math.abs(yI - pointA.y);
            const d2   = Math.abs(pointB.y - yI);
            const t    = (d1 / c1 + d2 / c2) * timeMul;
        
            return {
                plotData : [{ x: 0, interfaceX: pointA.x, time: t, isTir: false, isOptimal: true }],
                tirPoints: []
            };
        }
    
        const xMin   = pointA.x;
        const dxSpan = pointB.x - xMin;
        const optX   = optimPath.interfaceX;
    
        const samples  = new Array(steps + 1);
        const tirList  = [];
    
        for (let i = 0; i <= steps; ++i) {
            const xS  = xMin + (i * dxSpan) / steps;
            const dxA = xS - pointA.x, dyA = yI - pointA.y;
            const dxB = xS - pointB.x, dyB = yI - pointB.y;
        
            const incAngle = getIncidentAngle(dxA, dyA);
            const isTir    = tirPossible && incAngle > critAngle;
        
            const time = (Math.hypot(dxA, dyA) / c1 + Math.hypot(dxB, dyB) / c2) * timeMul;
        
            const sample = {
                x         : Math.abs(dxA),
                interfaceX: xS,
                time,
                isTir,
                isOptimal : Math.abs(xS - optX) < 0.1
            };
        
            samples[i] = sample;
            if (isTir) tirList.push(sample);
        }
    
        return { plotData: samples, tirPoints: tirList };
    }, [
        pointA, pointB,
        optimPath.interfaceX,
        medium1, medium2, waveType,
        INTERFACE_Y, fermatConfig.chart
    ]);
    
    
    const { minTimePoint, timeRange } = useMemo(() => {
        if (plotData.length === 0) {
        return {
            minTimePoint: { x: L / 2, time: 0 },
            timeRange   : { min: 0, max: 100 }
        };
        }
    
        let minTimeAll   =  Infinity;
        let maxTime      = -Infinity;
        let minTimeValid =  Infinity;
        let minXValid    =  0;
        let hasNonTir    =  false;
    
        for (const p of plotData) {
            if (p.time < minTimeAll) minTimeAll = p.time;
            if (p.time > maxTime)    maxTime    = p.time;
        
            if (!p.isTir && p.time < minTimeValid) {
                minTimeValid = p.time;
                minXValid    = p.x;
                hasNonTir    = true;
            }
        }
    
        const bestTime = hasNonTir ? minTimeValid : minTimeAll;
        const bestX    = hasNonTir ? minXValid    : plotData.find(p => p.time === bestTime).x;
    
        const span  = maxTime - minTimeAll || 1;
        const pad   = span * 0.1;
    
        return {
        minTimePoint: { x: bestX, time: bestTime },
        timeRange   : { min: minTimeAll - pad, max: maxTime + pad }
        };
    }, [plotData, L]);

    useEffect(() => {
        if (snapToOptimal) {
            setPointS({ x: optimPath.interfaceX, y: INTERFACE_Y });
        }
    }, [snapToOptimal, optimPath.interfaceX, INTERFACE_Y]);
  

    const ParameterDisplay = () => {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 h-full">
                 <div className="grid grid-cols-2 gap-2 text-sm">
                    {waveType === 'light' ? (
                        <>
                            <p>Medium 1: n₁ = {mediaProperties[waveType][medium1].n.toFixed(2)}</p>
                            <p>Medium 2: n₂ = {mediaProperties[waveType][medium2].n.toFixed(2)}</p>
                        </>
                    ) : (
                        <>
                            <p>Medium 1: v = {mediaProperties[waveType][medium1].speed.toFixed(0)} m/s</p>
                            <p>Medium 2: v = {mediaProperties[waveType][medium2].speed.toFixed(0)} m/s</p>
                        </>
                    )}
                    <p>θᵢ = {currentPath.incidentAngle.toFixed(1)}°</p>
                    {!tirStatus.isOccurring ? (
                        <p>θᵣ = {currentPath.refractedAngle.toFixed(1)}°</p>
                    ) : (
                        <p>θᵣ = ---</p>
                    )}
                </div>
                <div className="mt-2 pt-2 border-t border-blue-200 text-xs">
                     {tirStatus.isPossible && (
                        <p className="text-blue-600 font-medium">
                            Critical Angle: θc = {tirStatus.criticalAngle.toFixed(1)}°
                        </p>
                    )}
                    <p className="text-gray-600 mt-1">
                        Optimal S at x = {optimPath.interfaceX.toFixed(2)} m
                    </p>
                </div>
            </div>
        );
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload[0]) {
            const data = payload[0].payload;
            const distanceAS = hypot(data.interfaceX - pointA.x, INTERFACE_Y - pointA.y);            
            const distanceSB = hypot(data.interfaceX - pointB.x, INTERFACE_Y - pointB.y);
            
            return (
                <div className="bg-white/95 px-2 py-1 rounded shadow-md border border-gray-200 text-xs">
                    <div className="font-semibold">x = {(data.interfaceX-pointA.x).toFixed(2)} m</div>
                    {data.isTir ? (
                        <div className="text-red-600 font-medium">TIR</div>
                    ) : (
                        <div className="text-gray-700">
                            t = {data.time.toPrecision(3)} {waveType === 'sound' ? 'ms' : 'ns'}
                        </div>
                    )}
                    <div className="text-gray-600 text-[10px] mt-0.5">
                        A→S: {distanceAS.toFixed(1)}m, S→B: {distanceSB.toFixed(1)}m
                    </div>
                    {data.isTir && (
                        <div className="text-red-600 text-[10px]">
                            θᵢ = {getIncidentAngle(data.interfaceX - pointA.x, INTERFACE_Y - pointA.y).toFixed(1)}° {'>'} θc
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    const handleDragA = (e) => {
        setPointA(fromCanvas(e.target.position()));
        if (pointS.x < pointA.x) setPointS({ x: fromCanvas(e.target.position()).x, y: INTERFACE_Y });
    };

    const handleDragB = (e) => {
        setPointB(fromCanvas(e.target.position()));
        if (pointS.x > pointB.x) setPointS({ x: fromCanvas(e.target.position()).x, y: INTERFACE_Y });
    };

    const handleDragS = (e) => {
        setPointS({ x: fromCanvas(e.target.position()).x, y: INTERFACE_Y });
    };

    const pointADragBound = (pos) => {
        const worldPos = fromCanvas(pos);
        
        const constrainedWorld = {
            x: clamp(worldPos.x, 0, min(pointB.x, L_MAX)),
            y: max(INTERFACE_Y + H_MIN, min(H_MAX, worldPos.y))
        };

        return {
            x: offsets.x + constrainedWorld.x * scale,
            y: stageSize.height - (offsets.y + constrainedWorld.y * scale)
        };
    };
    
    const pointBDragBound = (pos) => {
        const worldPos = fromCanvas(pos);
        
        const constrainedWorld = {
            x: clamp(worldPos.x, max(0, pointA.x), L_MAX),
            y: max(H_MIN, min(INTERFACE_Y - H_MIN, worldPos.y))
        };
        
        return {
            x: offsets.x + constrainedWorld.x * scale,
            y: stageSize.height - (offsets.y + constrainedWorld.y * scale)
        };
    };

    const pointSDragBound = (pos) => {
        const worldX = (pos.x - offsets.x) / scale;
        const constrainedX = max(pointA.x, min(pointB.x, worldX));
        return {
            x: offsets.x + constrainedX * scale,
            y: toCanvas(0, INTERFACE_Y).y,
        };
    };

    const MaterialSelector = () => (
        <div className="bg-white border border-gray-200 rounded-lg p-3 h-full">
            <div className="flex flex-col gap-3">
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
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="block text-xs font-medium text-gray-700">Medium 1</label>
                        <div className="grid grid-cols-2 gap-1">
                    {Object.entries(mediaProperties[waveType]).map(([key, props]) => (
                        <button
                            key={key}
                            onClick={() => setMedium1(key)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                medium1 === key
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            style={{
                                backgroundColor: medium1 === key ? undefined : props.color,
                                color: medium1 === key ? undefined : '#374151',
                            }}
                            title={props.shortLabel}
                        >
                            {props.label}
                        </button>
                    ))}
                </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="block text-xs font-medium text-gray-700">Medium 2</label>
                        <div className="grid grid-cols-2 gap-1">
                    {Object.entries(mediaProperties[waveType]).map(([key, props]) => (
                        <button
                            key={key}
                            onClick={() => setMedium2(key)}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                medium2 === key
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            style={{
                                backgroundColor: medium2 === key ? undefined : props.color,
                                color: medium2 === key ? undefined : '#374151',
                            }}
                            title={props.shortLabel}
                        >
                            {props.label}
                        </button>
                    ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className={layout.pageWrapperResponsive(isSmallViewport)}>
            <h2 className="text-2xl font-bold mb-4">Task 4: Fermat's Principle (Refraction)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <MaterialSelector />
                <ParameterDisplay />
            </div>

            <div className={`grid gap-6 ${isSmallViewport ? 'grid-cols-1' : 'grid-cols-2'}`}>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold">Interactive Ray Diagram</h3>
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

                    <div className="relative">
                        <div ref={stageParentRef} className="w-full" style={{ height: isSmallViewport ? '300px' : '400px' }}>
                            <Stage width={stageSize.width} height={stageSize.height}>
                                <Layer>
                                    <Rect
                                        x={0}
                                        y={0}
                                        width={stageSize.width}
                                        height={toCanvas(0, INTERFACE_Y).y}
                                        fill={mediaProperties[waveType][medium1].color}
                                        opacity={0.3}
                                    />
                                    <Rect
                                        x={0}
                                        y={toCanvas(0, INTERFACE_Y).y}
                                        width={stageSize.width}
                                        height={stageSize.height - toCanvas(0, INTERFACE_Y).y}
                                        fill={mediaProperties[waveType][medium2].color}
                                        opacity={0.3}
                                    />

                                    {tirStatus.isOccurring && (
                                        <Text
                                            x={toCanvas(pointS.x, INTERFACE_Y).x}
                                            y={toCanvas(pointS.x, INTERFACE_Y).y - 60}
                                            text={"Total Internal Reflection!"}
                                            fontSize={14}
                                            fill="#D97706"
                                            fontStyle="bold"
                                            align="center"
                                            width={150}
                                            offsetX={75}
                                        />
                                    )}
                                    
                                    <Line
                                        points={[0, toCanvas(0, INTERFACE_Y).y, stageSize.width, toCanvas(0, INTERFACE_Y).y]}
                                        stroke="#000"
                                        strokeWidth={2}
                                    />
                                    
                                    <Line
                                        points={[
                                            toCanvas(pointS.x, INTERFACE_Y).x,
                                            toCanvas(pointS.x, INTERFACE_Y).y - max(abs(pointA.y - INTERFACE_Y), abs(pointB.y - INTERFACE_Y)) * scale - 20,
                                            toCanvas(pointS.x, INTERFACE_Y).x,
                                            toCanvas(pointS.x, INTERFACE_Y).y + max(abs(pointA.y - INTERFACE_Y), abs(pointB.y - INTERFACE_Y)) * scale + 20
                                        ]}
                                        stroke="#666"
                                        strokeWidth={2}
                                        dash={[5, 5]}
                                    />
                                    
                                    <Line
                                        points={[
                                            toCanvas(pointA.x, pointA.y).x,
                                            toCanvas(pointA.x, pointA.y).y,
                                            toCanvas(pointS.x, INTERFACE_Y).x,
                                            toCanvas(pointS.x, INTERFACE_Y).y
                                        ]}
                                        stroke="#DC2626"
                                        strokeWidth={2.5}
                                    />
                                    <Line
                                        points={[
                                            toCanvas(pointS.x, INTERFACE_Y).x,
                                            toCanvas(pointS.x, INTERFACE_Y).y,
                                            toCanvas(pointB.x, pointB.y).x,
                                            toCanvas(pointB.x, pointB.y).y
                                        ]}
                                        stroke="#DC2626"
                                        strokeWidth={2.5}
                                        opacity={tirStatus.isOccurring ? 0.2 : 1}
                                        dash={tirStatus.isOccurring ? [10, 5] : []}
                                    />

                                    <Group>
                                        <Circle
                                            x={toCanvas(pointA.x, pointA.y).x}
                                            y={toCanvas(pointA.x, pointA.y).y}
                                            radius={isCanvasSmall ? fermatConfig.canvas.pointRadius.normal : fermatConfig.canvas.pointRadius.small}
                                            fill={colors.primary}
                                            stroke={colors.gray[50]}
                                            strokeWidth={fermatConfig.canvas.lineWidth.normal}
                                            draggable
                                            onDragMove={handleDragA}
                                            onMouseEnter={() => {document.body.style.cursor = 'move'}}
                                            onMouseLeave={() => {document.body.style.cursor = 'default'}}
                                            onDragEnd={() => {document.body.style.cursor = 'default'}}
                                            onDragStart={() => {document.body.style.cursor = 'move'}}
                                            dragBoundFunc={pointADragBound}
                                        />
                                        <Text
                                            x={toCanvas(pointA.x, pointA.y).x - 10}
                                            y={toCanvas(pointA.x, pointA.y).y - 25}
                                            text="A"
                                            fontSize={16}
                                            fontStyle="bold"
                                            fill="#1F2937"
                                        />
                                    </Group>
                                    
                                    <Group>
                                        <Circle
                                            x={toCanvas(pointB.x, pointB.y).x}
                                            y={toCanvas(pointB.x, pointB.y).y}
                                            radius={isCanvasSmall ? fermatConfig.canvas.pointRadius.normal : fermatConfig.canvas.pointRadius.small}
                                            fill={colors.primary}
                                            stroke={colors.gray[50]}
                                            strokeWidth={fermatConfig.canvas.lineWidth.normal}
                                            draggable
                                            onDragMove={handleDragB}
                                            onMouseEnter={() => {document.body.style.cursor = 'move'}}
                                            onMouseLeave={() => {document.body.style.cursor = 'default'}}
                                            onDragEnd={() => {document.body.style.cursor = 'default'}}
                                            dragBoundFunc={pointBDragBound}
                                        />
                                        <Text
                                            x={toCanvas(pointB.x, pointB.y).x - 10}
                                            y={toCanvas(pointB.x, pointB.y).y + 20}
                                            text="B"
                                            fontSize={16}
                                            fontStyle="bold"
                                            fill="#1F2937"
                                        />
                                    </Group>
                                    
                                    <Group>
                                        <Circle
                                            x={toCanvas(pointS.x, INTERFACE_Y).x}
                                            y={toCanvas(pointS.x, INTERFACE_Y).y}
                                            radius={isCanvasSmall ? fermatConfig.canvas.pointRadius.normal : fermatConfig.canvas.pointRadius.small}
                                            fill={snapToOptimal ? colors.error : colors.primary}
                                            stroke={colors.gray[50]}
                                            strokeWidth={fermatConfig.canvas.lineWidth.normal}
                                            draggable={!snapToOptimal}
                                            onDragMove={handleDragS}
                                            onMouseEnter={() => { document.body.style.cursor = !snapToOptimal ? 'ew-resize' : 'not-allowed'; }}
                                            onMouseLeave={() => {document.body.style.cursor = 'default'}}
                                            onDragEnd={() => {document.body.style.cursor = 'default'}}
                                            dragBoundFunc={pointSDragBound}
                                        />
                                        <Text
                                            x={toCanvas(pointS.x, INTERFACE_Y).x + 10}
                                            y={toCanvas(pointS.x, INTERFACE_Y).y}
                                            text="S"
                                            fontSize={16}
                                            fontStyle="bold"
                                            fill="#1F2937"
                                        />
                                    </Group>
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
                            margin={{top: chartConfig.general.marginTop, right: chartConfig.general.marginRight, left: chartConfig.general.marginLeft, bottom: chartConfig.general.marginBottom}}
                        >
                            <CartesianGrid strokeDasharray={chartConfig.general.gridDashArray} />
                            <XAxis
                                dataKey="x"
                                domain={(() => {
                                    return abs(pointB.x - pointA.x) < 1e-2 ? [0, 0] : [0, +abs(pointB.x - pointA.x).toFixed(1)];
                                })()}
                                ticks={(() => {
                                    const dist = abs(pointB.x - pointA.x);
                                    if (dist < 1e-2) return [0];
                                    if (dist < 1) return [0, +(dist / 2).toFixed(2), +dist.toFixed(2)];
                                    return [0, ...[...Array(floor(dist)).keys()].map(i => i + 1).filter(v => v < dist), +dist.toFixed(1)];
                                })()}
                                type="number"
                                label={chartStyles.axisLabel.x('Position x (m)')}
                            />
                            <YAxis
                                dataKey="time"
                                type="number"
                                domain={[timeRange.min, timeRange.max]}
                                label={chartStyles.axisLabel.y(`Travel Time (${waveType === 'light' ? 'ns' : 'ms'})`)}
                                tickFormatter={chartStyles.tickFormat.threeSf}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <ReferenceLine
                                x={(() => {
                                    if (abs(pointB.x - pointA.x) < 1e-2) return 0;
                                    return abs(pointS.x - pointA.x);
                                })()}
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
                                x={(() => {
                                    if (abs(pointB.x - pointA.x) < 1e-2) {
                                        return 0;
                                    }
                                    return minTimePoint.x;
                                })()}
                                stroke={colors.accent}
                                strokeWidth={2}
                                strokeDasharray={chartConfig.lineChart.referenceLineDashArray}
                                label={{
                                    value: 'Minimum',
                                    position: 'insideBottomLeft',
                                    fill: colors.accent,
                                    fontSize: chartConfig.lineChart.referenceLabelFontSize,
                                }}
                            />
                            {/* Main refraction line */}
                            <RechartsLine
                                name="Refraction"
                                type="monotone"
                                dataKey="time"
                                data={plotData.filter(point => !point.isTir)}
                                stroke={colors.primary}
                                strokeWidth={chartConfig.lineChart.line.strokeWidth}
                                dot={chartConfig.lineChart.line.dot}
                                activeDot={(props) => {
                                    const { cx, cy } = props;
                                    return <circle cx={cx} cy={cy} r={chartConfig.general.activeDotRadius} fill={colors.primary} stroke="none" />;
                                }}
                                isAnimationActive={false}
                            />
                            {/* Only show TIR line if TIR is possible */}
                            {tirPoints.length && (
                                <RechartsLine
                                    name="Total Internal Reflection"
                                    type="monotone"
                                    dataKey="time"
                                    data={tirPoints}
                                    stroke={colors.error}
                                    strokeDasharray="5 5"
                                    strokeWidth={chartConfig.lineChart.line.strokeWidth}
                                    dot={false}
                                    activeDot={false}
                                    isAnimationActive={false}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="mt-6">
                <Accordion title="Physics Explanation & Calculations">
                    <div>
                        <h4 className="font-semibold text-base text-gray-800 mb-2">Optimal Path (Fermat's Principle & Snell's Law)</h4>
                        <p className="mb-2">
                            Fermat's Principle states that light travels along the path of least time. When crossing an interface between two media with different refractive indices (n₁ and n₂), this principle leads to Snell's Law of Refraction.
                        </p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>
                                <strong>Total time T(x)</strong> depends on the distances in each medium (d₁, d₂) and the speeds of light in those media (v₁, v₂):
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    T(x) = d₁/v₁ + d₂/v₂ = (n₁d₁ + n₂d₂) / c
                                </div>
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    T(x) = (n₁√(h₁² + x²) + n₂√(h₂² + (L-x)²)) / c
                                </div>
                            </li>
                            <li>
                                <strong>Minimizing time</strong> by setting the derivative dT/dx = 0 yields Snell's Law:
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    n₁ * (x / √(h₁² + x²)) = n₂ * ((L-x) / √(h₂² + (L-x)²))
                                </div>
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    n₁ sin(θ₁) = n₂ sin(θ₂)
                                </div>
                            </li>
                             <li>
                                <strong>Optimal Path:</strong> Unlike reflection, there is no simple analytical solution for x. The optimal path is found numerically by minimizing the time function T(x).
                            </li>
                        </ol>
                    </div>
                     <div>
                        <h4 className="font-semibold text-base text-gray-800 mb-2">Total Internal Reflection (TIR)</h4>
                        <p className="mb-2">
                            When light travels from a denser medium (higher n) to a less dense medium (lower n), it bends away from the normal. If the incident angle θ₁ is greater than the critical angle θc, the light is completely reflected back into the first medium.
                        </p>
                        <ul className="list-disc pl-5 space-y-2">
                            <li>
                                <strong>Critical Angle (θc):</strong> This is the incident angle for which the refracted angle is 90°.
                                <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                    n₁ sin(θc) = n₂ sin(90°)  =&gt;  θc = asin(n₂ / n₁)
                                </div>
                                 {tirStatus.isPossible ? (
                                    <p className="mt-1 text-xs">
                                        For n₁={mediaProperties[waveType][medium1].n.toFixed(2)} and n₂={mediaProperties[waveType][medium2].n.toFixed(2)}, the critical angle is <strong>{tirStatus.criticalAngle.toFixed(2)}°</strong>.
                                    </p>
                                 ) : (
                                    <p className="mt-1 text-xs">TIR is not possible because n₁ ≤ n₂.</p>
                                 )}
                            </li>
                        </ul>
                    </div>
                </Accordion>
            </div>
        </div>
    );
};