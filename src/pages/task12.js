import React, {useState, useMemo, useEffect, useCallback} from 'react';
import {Group, Line, Circle, Text} from 'react-konva';
import {
    LineChart,
    Line as RechartsLine,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ReferenceDot
} from 'recharts';
import {layout, chartConfig, colors, spectrum, wavelengthToHex, chartStyles} from '../design-guidelines';
import {OpticsGrid} from '../components/opticsGrid';
import {ParameterSlider} from '../components/parameterSlider';
import {
    norm,
    dot,
    sub,
    add,
    mul,
    pow,
    sqrt,
    floor,
    sin,
    cos,
    tan,
    abs,
    min,
    max,
    asin,
    acos,
    toDeg
} from '../math_functions';
import {ZoomableChartWrapper} from '../components/ZoomableChartWrapper';

const A_COEFF = [1.03961212, 0.231792344, 1.01046945];
const B_COEFF = [0.00600069867, 0.0200179144, 103.560653];

const nBK7 = (lambda_nm) => {
    const lambda_um_sq = pow(lambda_nm / 1000, 2);
    let sum = 0;
    for (let i = 0; i < 3; i++) {
        sum += (A_COEFF[i] * lambda_um_sq) / (lambda_um_sq - B_COEFF[i]);
    }
    return sqrt(1 + sum);
};

const spectrumData = Array.from({length: floor((spectrum.wavelength.max - spectrum.wavelength.min) / 3) + 1}, (_, i) => {
    const lambda = spectrum.wavelength.min + i * 3; // 3 nm step
    return {lambda, col: wavelengthToHex(lambda)};
});

const refract = (v_in, normal, n1, n2) => {
    const n = {...normal};
    let cosI = -dot(n, v_in);
    if (cosI < 0) {
        cosI = -cosI;
        n.x *= -1;
        n.y *= -1;
    }
    const eta = n1 / n2;
    const k = 1 - eta * eta * (1 - cosI * cosI);
    if (k < 0) return null;
    const term = eta * cosI - sqrt(k);
    return norm(add(mul(v_in, eta), mul(n, term)));
};

const intersectParam = (p0, d, p1, p2) => {
    const x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
    const det = d.x * (y1 - y2) - d.y * (x1 - x2);
    if (abs(det) < 1e-9) return null; // parallel
    const t = ((x1 - p0.x) * (y1 - y2) - (y1 - p0.y) * (x1 - x2)) / det;
    return t;
};

const APEX_ANGLES = Array.from({length: (90 - 10) / 5 + 1}, (_, i) => 10 + i * 5);

export const Task12 = ({isSmallViewport, headerHeight}) => {
    const [alphaDeg, setAlphaDeg] = useState(60);
    const [chartFreq, setChartFreq] = useState(545);

    const chartLambda = useMemo(() => (3e8 / (chartFreq * 1e12)) * 1e9, [chartFreq]);

    const nGlass = useMemo(() => nBK7(chartLambda), [chartLambda]);

    const prism = useMemo(() => {
        const baseLen = 12;
        const halfBase = baseLen / 2;
        const alphaRad = alphaDeg / toDeg;
        const height = halfBase / tan(alphaRad / 2);
        return [
            -halfBase, 0,
            halfBase, 0,
            0, -height,
        ];
    }, [alphaDeg]);

    const midPoint = useMemo(() => {
        const [x1, y1, , , x3, y3] = prism;
        const midX = (x1 + x3) / 2;
        const midY = (y1 + y3) / 2;
        return {x: midX, y: midY};
    }, [prism]);

    const initialOrigin = useMemo(() => ({
        x: midPoint.x - 4,
        y: midPoint.y,
    }), [midPoint]);

    const [rayOrigin, setRayOrigin] = useState(initialOrigin);

    useEffect(() => {
        setRayOrigin(initialOrigin);
    }, [initialOrigin]);

    const geo = useMemo(() => {
        const edgeL = {x: prism[4] - prism[0], y: prism[5] - prism[1]}; // along the left face
        let nL = norm({x: edgeL.y, y: -edgeL.x});
        if (dot(nL, {x: 1, y: 0}) > 0) nL = {x: -nL.x, y: -nL.y};
        const tL = norm(edgeL);
        return {nL, tL};
    }, [prism]);

    const clampWorld = ({x, y}) => {
        const {nL, tL} = geo;
        const H = -prism[5];
        y = min(max(y, -H), 0);
        let dOut = dot(sub({x, y}, {x: prism[0], y: prism[1]}), nL);
        if (dOut < 0.1) {
            x -= nL.x * (dOut - 0.1);
            y -= nL.y * (dOut - 0.1);
        }
        let dTang = dot(sub({x, y}, midPoint), tL);
        if (dTang > 0) {
            x -= tL.x * dTang;
            y -= tL.y * dTang;
        }
        return {x, y};
    };

    function boundToWedge(pos) {
        const stage = this.getStage();
        if (!stage) return pos;
        const scale = stage.scaleX();
        const stagePos = stage.position();
        const toWorld = p => ({x: (p.x - stagePos.x) / scale, y: (p.y - stagePos.y) / scale});
        const toStage = p => ({x: p.x * scale + stagePos.x, y: p.y * scale + stagePos.y});
        return toStage(clampWorld(toWorld(pos)));
    }

    const interactiveRayData = useMemo(() => {
        const n = nGlass;
        const dirIn = norm(sub(midPoint, rayOrigin));

        const normal1 = geo.nL;
        const cos_theta_i = dot(dirIn, mul(normal1, -1));
        const theta_i_rad = acos(max(-1, min(1, cos_theta_i)));
        const theta_i_deg = theta_i_rad * toDeg;

        const dirInside = refract(dirIn, normal1, 1, n);
        if (!dirInside) return {theta_i_deg, theta_t_deg: '---', isTIR: true, normal1_pts: [], normal2_pts: []};

        const p0 = midPoint;
        const pR1 = {x: prism[2], y: prism[3]}; // (halfBase, 0)
        const pR2 = {x: prism[4], y: prism[5]}; // (0, -height)
        const pBase1 = {x: prism[0], y: prism[1]}; // (-halfBase, 0)
        const pBase2 = {x: prism[2], y: prism[3]}; // (halfBase, 0)

        const tIntRight = intersectParam(p0, dirInside, pR1, pR2);
        const tIntBase = intersectParam(p0, dirInside, pBase1, pBase2);

        let hitPoint, hitFace;
        if (tIntRight > 0 && (tIntBase <= 0 || tIntRight < tIntBase)) {
            hitPoint = add(p0, mul(dirInside, tIntRight));
            hitFace = 'right';
        } else if (tIntBase > 0) {
            hitPoint = add(p0, mul(dirInside, tIntBase));
            hitFace = 'base';
        } else {
            return {theta_i_deg, theta_t_deg: '---', isTIR: true, normal1_pts: [], normal2_pts: []};
        }

        let normal2, dirOut, theta_t_deg = '---';

        if (hitFace === 'right') {
            const edgeRight = sub(pR2, pR1);
            normal2 = norm({x: edgeRight.y, y: -edgeRight.x});
            if (dot(normal2, dirInside) < 0) normal2 = mul(normal2, -1);

            dirOut = refract(dirInside, normal2, n, 1);
            if (dirOut) {
                const cos_theta_t = dot(dirOut, normal2);
                theta_t_deg = acos(max(-1, min(1, cos_theta_t))) * toDeg;
            }
        } else if (hitFace === 'base') {
            normal2 = {x: 0, y: -1};
            dirOut = null;
            theta_t_deg = '---';
        }

        const normal_len = 4;
        const normal1_pts = [...Object.values(sub(midPoint, mul(normal1, normal_len))), ...Object.values(add(midPoint, mul(normal1, normal_len)))];
        const normal2_pts = normal2 ? [...Object.values(sub(hitPoint, mul(normal2, normal_len))), ...Object.values(add(hitPoint, mul(normal2, normal_len)))] : [];

        return {theta_i_deg, theta_t_deg, isTIR: !dirOut, normal1_pts, normal2_pts, hitFace};
    }, [rayOrigin, prism, nGlass, midPoint, geo]);

    const {multiCurveData, currentApexData, criticalAngle} = useMemo(() => {
        const data = [];
        const n = nGlass;

        const alphaRad = alphaDeg / toDeg;
        let critAngle = null;
        const sin_theta_i_crit = -cos(alphaRad) + sin(alphaRad) * sqrt(n * n - 1);
        if (abs(sin_theta_i_crit) <= 1) {
            critAngle = asin(sin_theta_i_crit) * toDeg;
        }

        for (let i = 0; i <= 90; i += 0.5) {
            const theta_i_rad = i / toDeg;
            const sin_theta_i = sin(theta_i_rad);

            const row = {theta_i: i};

            APEX_ANGLES.forEach(a => {
                const alphaRad = a / toDeg;

                const radicand = n * n - sin_theta_i * sin_theta_i;
                if (radicand >= 0) {
                    const sin_theta_t = sin(alphaRad) * sqrt(radicand) - cos(alphaRad) * sin_theta_i;

                    if (abs(sin_theta_t) <= 1) {
                        const theta_t_raw = asin(sin_theta_t) * toDeg;
                        row[`a${a}`] = i + theta_t_raw - a; // deviation
                        row[`t${a}`] = abs(theta_t_raw); // transmission angle
                    } else {
                        row[`a${a}`] = null;
                        row[`t${a}`] = null;
                    }
                } else {
                    row[`a${a}`] = null;
                    row[`t${a}`] = null;
                }
            });

            data.push(row);
        }

        const extractedData = data.map(row => ({
            theta_i: row.theta_i,
            theta_t: row[`t${alphaDeg}`],
            delta: row[`a${alphaDeg}`]
        }));

        return {
            multiCurveData: {data, apexAngles: APEX_ANGLES},
            currentApexData: extractedData,
            criticalAngle: critAngle
        };
    }, [nGlass, alphaDeg]);

    return (
        <div className={layout.pageWrapperResponsive(isSmallViewport)}>
            <h1 className="text-2xl font-bold mb-4">Task 12: Isosceles Prism</h1>

            <ControlPanel
                headerHeight={headerHeight}
                alphaDeg={alphaDeg}
                setAlphaDeg={setAlphaDeg}
                chartFreq={chartFreq}
                setChartFreq={setChartFreq}
                interactive={interactiveRayData}
            />

            <div className="border border-gray-700 rounded-lg overflow-hidden"
                 style={{height: isSmallViewport ? '320px' : '70vh', background: '#000'}}>
                <OpticsGrid presetName="task12" initialShowGrid={false}>
                    <Group listening={false}>
                        <Line points={prism} closed stroke="#ffffff" strokeWidth={0.15} fill="#1e1e1e"/>
                        {(() => {
                            const apexY = prism[5];
                            const label = `α = ${alphaDeg}°   θi = ${interactiveRayData.theta_i_deg.toFixed(1)}°`;
                            return (
                                <Text
                                    text={label}
                                    x={-3}
                                    y={apexY - 1.5}
                                    fontSize={0.8}
                                    fill="#ffffff"
                                    listening={false}
                                />
                            );
                        })()}
                    </Group>
                    <Group>
                        <Line points={interactiveRayData.normal1_pts} stroke="gray" strokeWidth={0.05} dash={[0.2, 0.2]}
                              listening={false}/>
                        <Line points={interactiveRayData.normal2_pts} stroke="gray" strokeWidth={0.05} dash={[0.2, 0.2]}
                              listening={false}/>
                        <Line
                            points={[rayOrigin.x, rayOrigin.y, midPoint.x, midPoint.y]}
                            stroke="white"
                            strokeWidth={0.05}
                        />

                        {spectrumData.map(({lambda, col}) => {
                            const nGlass = nBK7(lambda);
                            const dirIn = norm(sub(midPoint, rayOrigin));
                            const edgeLeft = {x: prism[4] - prism[0], y: prism[5] - prism[1]};
                            let normalLeft = norm({x: edgeLeft.y, y: -edgeLeft.x});
                            if (dot(normalLeft, dirIn) > 0) normalLeft = {x: -normalLeft.x, y: -normalLeft.y};

                            const dirInside = refract(dirIn, normalLeft, 1, nGlass);
                            if (!dirInside) return null;

                            const p0 = {x: midPoint.x, y: midPoint.y};
                            const pR1 = {x: prism[2], y: prism[3]};
                            const pR2 = {x: prism[4], y: prism[5]};
                            const pBase1 = {x: prism[0], y: prism[1]};
                            const pBase2 = {x: prism[2], y: prism[3]};

                            // Check both intersections
                            const tIntRight = intersectParam(p0, dirInside, pR1, pR2);
                            const tIntBase = intersectParam(p0, dirInside, pBase1, pBase2);

                            let hit, hitFace;
                            if (tIntRight > 0 && (tIntBase <= 0 || tIntRight < tIntBase)) {
                                hit = add(p0, mul(dirInside, tIntRight));
                                hitFace = 'right';
                            } else if (tIntBase > 0) {
                                hit = add(p0, mul(dirInside, tIntBase));
                                hitFace = 'base';
                            } else {
                                return null;
                            }

                            let exteriorLine;
                            if (hitFace === 'right') {
                                const edgeRight = {x: pR2.x - pR1.x, y: pR2.y - pR1.y};
                                let normalRight = norm({x: edgeRight.y, y: -edgeRight.x});
                                if (dot(normalRight, dirInside) < 0) normalRight = {
                                    x: -normalRight.x,
                                    y: -normalRight.y
                                };

                                const dirOut = refract(dirInside, normalRight, nGlass, 1);
                                if (dirOut) {
                                    const endPt = add(hit, mul(dirOut, 15));
                                    exteriorLine =
                                        <Line points={[hit.x, hit.y, endPt.x, endPt.y]} stroke={col} strokeWidth={0.02}
                                              listening={false}/>;
                                } else {
                                    const dotIN = dot(dirInside, normalRight);
                                    const dirRef = norm(sub(dirInside, mul(normalRight, 2 * dotIN)));
                                    const endPt = add(hit, mul(dirRef, 15));
                                    exteriorLine =
                                        <Line points={[hit.x, hit.y, endPt.x, endPt.y]} stroke={col} strokeWidth={0.02}
                                              dash={[0.3, 0.3]} listening={false}/>;
                                }
                            } else {
                                exteriorLine = null;
                            }

                            return (
                                <React.Fragment key={lambda}>
                                    <Line points={[p0.x, p0.y, hit.x, hit.y]} stroke={col} strokeWidth={0.02}
                                          listening={false}/>
                                    {exteriorLine}
                                </React.Fragment>
                            );
                        })}

                        <Circle
                            x={rayOrigin.x}
                            y={rayOrigin.y}
                            radius={0.4}
                            fill="#ffffff"
                            stroke="#38bdf8"
                            strokeWidth={0.1}
                            draggable
                            dragBoundFunc={boundToWedge}
                            onDragMove={e => setRayOrigin({x: e.target.x(), y: e.target.y()})}
                        />
                    </Group>
                </OpticsGrid>
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Task 12b: Transmission Angle vs. Incidence Angle</h2>

                <div className={`grid ${isSmallViewport ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>

                    <TransmissionChart
                        data={currentApexData}
                        criticalAngle={criticalAngle}
                        interactive={interactiveRayData}
                        strokeColor={wavelengthToHex(chartLambda)}
                        isSmallViewport={isSmallViewport}
                    />

                    <DeviationChart data={currentApexData} criticalAngle={criticalAngle}
                                    interactive={interactiveRayData} strokeColor={wavelengthToHex(chartLambda)}
                                    isSmallViewport={isSmallViewport}/>

                </div>
            </div>

            <MultiApexChart data={multiCurveData.data} isSmallViewport={isSmallViewport}/>

        </div>
    );
};

const TransmissionChart = ({data, criticalAngle, interactive, strokeColor, isSmallViewport}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden p-4">
            <ZoomableChartWrapper data={data} xKey="theta_i" yKeys={["theta_t"]} height={isSmallViewport ? 250 : 400}>
                {({domain, yDomain, handlers, refArea}) => (
                    <LineChart {...handlers}
                               data={data}
                               margin={{
                                   top: chartConfig.general.marginTop,
                                   right: chartConfig.general.marginRight,
                                   left: chartConfig.general.marginLeft,
                                   bottom: chartConfig.general.marginBottom
                               }}
                    >
                        <CartesianGrid strokeDasharray={chartConfig.general.gridDashArray}/>

                        <XAxis dataKey="theta_i" type="number" domain={domain} tickCount={10}
                               label={chartStyles.axisLabel.x('Incidence angle θi (°)')}
                               tickFormatter={chartStyles.tickFormat.oneDp} allowDataOverflow/>

                        <YAxis dataKey="theta_t" type="number" domain={yDomain || [0, 90]}
                               label={chartStyles.axisLabel.y('Transmission angle θt (°)')}
                               tickFormatter={chartStyles.tickFormat.oneDp} allowDataOverflow/>

                        <Tooltip
                            formatter={(value, name) => [`${value.toFixed(1)}°`, 'θt']}
                            labelFormatter={(l) => `θi = ${l.toFixed(1)}°`}
                            contentStyle={{fontSize: '12px', padding: '4px 8px'}}
                        />

                        {criticalAngle != null && criticalAngle >= 0 &&
                            <ReferenceLine x={criticalAngle} stroke={colors.error}
                                           strokeDasharray={chartConfig.lineChart.referenceLineDashArray}
                                           strokeWidth={2} label={{
                                value: 'TIR limit',
                                position: 'insideBottomLeft',
                                fill: colors.error
                            }} isAnimationActive={false}/>}
                        <ReferenceLine x={interactive.theta_i_deg} stroke={colors.accent}
                                       strokeDasharray={chartConfig.lineChart.referenceLineDashArray} strokeWidth={2}
                                       label={{value: 'Current', fill: colors.accent, position: 'insideTopLeft'}}
                                       isAnimationActive={false}/>

                        <RechartsLine type="monotone" dataKey="theta_t" stroke={strokeColor} strokeWidth={2} dot={false}
                                      connectNulls={false} isAnimationActive={false}/>
                        {refArea}
                    </LineChart>
                )}
            </ZoomableChartWrapper>
        </div>
    );
};

const DeviationChart = ({data, criticalAngle, interactive, strokeColor, isSmallViewport}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden p-4">
            <ZoomableChartWrapper data={data} xKey="theta_i" yKeys={["delta"]} height={isSmallViewport ? 250 : 400}>
                {({domain, yDomain, handlers, refArea}) => (
                    <LineChart {...handlers} data={data} margin={{
                        top: chartConfig.general.marginTop,
                        right: chartConfig.general.marginRight,
                        left: chartConfig.general.marginLeft,
                        bottom: chartConfig.general.marginBottom
                    }}>
                        <CartesianGrid strokeDasharray="3 3"/>
                        <XAxis dataKey="theta_i" type="number" domain={domain} tickCount={10}
                               label={chartStyles.axisLabel.x('Incidence angle θi (°)')}
                               tickFormatter={chartStyles.tickFormat.oneDp} allowDataOverflow/>
                        <YAxis dataKey="delta" type="number" domain={yDomain || [0, 180]}
                               label={chartStyles.axisLabel.y('Deviation δ (°)')}
                               tickFormatter={chartStyles.tickFormat.oneDp} allowDataOverflow/>
                        <Tooltip
                            formatter={(v, name) => [`${v.toFixed(1)}°`, 'δ']}
                            labelFormatter={(l) => `θi = ${l.toFixed(1)}°`}
                            contentStyle={{fontSize: '12px', padding: '4px 8px'}}
                        />
                        {criticalAngle != null && criticalAngle >= 0 &&
                            <ReferenceLine x={criticalAngle} stroke={colors.error}
                                           strokeDasharray={chartConfig.lineChart.referenceLineDashArray}
                                           strokeWidth={2} label={{
                                value: 'TIR limit',
                                position: 'insideBottomLeft',
                                fill: colors.error
                            }} isAnimationActive={false}/>}
                        <ReferenceLine x={interactive.theta_i_deg} stroke={colors.accent}
                                       strokeDasharray={chartConfig.lineChart.referenceLineDashArray} strokeWidth={2}
                                       label={{value: 'Current', fill: colors.accent, position: 'insideTopLeft'}}
                                       isAnimationActive={false}/>
                        <RechartsLine type="monotone" dataKey="delta" stroke={strokeColor} strokeWidth={2} dot={false}
                                      connectNulls={false} isAnimationActive={false}/>
                        {refArea}
                    </LineChart>
                )}
            </ZoomableChartWrapper>
        </div>
    );
};

const MultiApexChart = ({data, isSmallViewport}) => {
    const [infoData, setInfoData] = useState(null);

    const handleMouseMove = useCallback(
        (e) => {
            if (!e || e.activeLabel === undefined) return;
            const theta_i = e.activeLabel;
            const row = data.find((d) => d.theta_i === theta_i);
            if (!row) return;

            const values = [];
            APEX_ANGLES.forEach((a, idx) => {
                const v = row[`a${a}`];
                if (v !== null && v !== undefined) {
                    values.push({
                        apex: a,
                        value: v,
                        color: `hsl(${(idx * 360) / APEX_ANGLES.length},70%,50%)`,
                    });
                }
            });

            setInfoData({theta: theta_i, values});
        },
        [data]
    );

    const handleMouseLeave = () => setInfoData(null);

    const InfoPanel = () => {
        if (!infoData) {
            return <span className="text-gray-400 text-xs">Hover over graph</span>;
        }

        if (isSmallViewport) {
            return (
                <div
                    className="w-full flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-xs py-1 border-t border-gray-300">
                    <div className="font-medium text-gray-700 mr-2 whitespace-nowrap">θi
                        = {infoData.theta.toFixed(1)}°
                    </div>
                    {infoData.values.map(({apex, value}) => (
                        <div key={apex} className="flex items-center gap-1 whitespace-nowrap">
                            <span className="text-gray-600">α={apex}°:</span>
                            <span className="font-medium">{value.toFixed(1)}°</span>
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="text-xs overflow-y-auto pr-1 max-h-full">
                <div className="mb-1 font-medium text-gray-700 whitespace-nowrap">θi = {infoData.theta.toFixed(1)}°
                </div>
                {infoData.values.map(({apex, value, color}) => (
                    <div key={apex} className="flex items-center gap-1 mb-0.5 whitespace-nowrap">
            <span
                className="inline-block w-2 h-2 rounded-full"
                style={{backgroundColor: color}}
            />
                        <span className="text-gray-600">α={apex}°:</span>
                        <span className="font-medium">{value.toFixed(1)}°</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Task 12c: Deviation vs Incidence for Multiple Apex Angles</h2>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden p-4">
                <div className={`${isSmallViewport ? '' : 'flex gap-4'}`}>
                    <div className="flex-1">
                        <ZoomableChartWrapper
                            data={data}
                            xKey="theta_i"
                            yKeys={APEX_ANGLES.map((a) => `a${a}`)}
                            height={isSmallViewport ? 350 : 450}
                        >
                            {({domain, yDomain, handlers, refArea}) => (
                                <LineChart
                                    {...handlers}
                                    data={data}
                                    margin={{
                                        top: chartConfig.general.marginTop,
                                        right: chartConfig.general.marginRight,
                                        left: chartConfig.general.marginLeft,
                                        bottom: chartConfig.general.marginBottom,
                                    }}
                                    onMouseMove={(e) => {
                                        handlers.onMouseMove?.(e);
                                        handleMouseMove(e);
                                    }}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis
                                        dataKey="theta_i"
                                        type="number"
                                        domain={domain}
                                        tickCount={10}
                                        label={chartStyles.axisLabel.x('Incidence angle θi (°)')}
                                        tickFormatter={chartStyles.tickFormat.oneDp}
                                        allowDataOverflow
                                    />
                                    <YAxis
                                        type="number"
                                        domain={yDomain || [0, 180]}
                                        label={chartStyles.axisLabel.y('Deviation δ (°)')}
                                        tickFormatter={chartStyles.tickFormat.oneDp}
                                        allowDataOverflow
                                    />
                                    {/* Cursor vertical line via Tooltip (content hidden) */}
                                    <Tooltip
                                        content={() => null}
                                        wrapperStyle={{display: 'none'}}
                                    />
                                    {APEX_ANGLES.map((a, idx) => {
                                        const hue = (idx * 360) / APEX_ANGLES.length;
                                        return (
                                            <RechartsLine
                                                key={a}
                                                type="monotone"
                                                dataKey={`a${a}`}
                                                stroke={`hsl(${hue},70%,50%)`}
                                                strokeWidth={1.5}
                                                dot={false}
                                                isAnimationActive={false}
                                            />
                                        );
                                    })}
                                    {refArea}
                                </LineChart>
                            )}
                        </ZoomableChartWrapper>
                    </div>
                    {/* Info panel to the right (large) */}
                    {!isSmallViewport && (
                        <div
                            className="w-[calc(min(110px,30%))] border-l pl-3 flex flex-col max-h-full overflow-y-auto">
                            <InfoPanel/>
                        </div>
                    )}
                </div>

                {isSmallViewport && (
                    <InfoPanel/>
                )}
            </div>
        </div>
    );
};

const ControlPanel = ({headerHeight, alphaDeg, setAlphaDeg, chartFreq, setChartFreq, interactive}) => (
    <div
        style={{top: headerHeight}}
        className="sticky z-30 p-4 bg-white/80 backdrop-blur rounded-b-lg shadow border border-gray-200 mb-4 flex flex-wrap gap-x-8 gap-y-4">
        <ParameterSlider label="Apex angle α" value={alphaDeg} onChange={setAlphaDeg} min={30} max={90} step={5}
                         unit="°"/>
        <ParameterSlider label="Frequency f" value={chartFreq} onChange={setChartFreq} min={spectrum.frequency.min}
                         max={spectrum.frequency.max} step={1} unit="THz"/>

        <div className="text-sm flex flex-row items-center gap-x-4 md:flex-col md:items-start">
            <div className="font-medium text-gray-700 whitespace-nowrap">Ray Angles</div>
            <div className="text-gray-600 md:mt-1">θi: {interactive.theta_i_deg.toFixed(1)}°</div>
            <div
                className="text-gray-600">θt: {typeof interactive.theta_t_deg === 'number' ? `${interactive.theta_t_deg.toFixed(1)}°` : '--- (TIR)'} </div>
        </div>
    </div>
); 