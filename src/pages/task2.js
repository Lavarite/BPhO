import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
    ComposedChart,
    Line,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    Dot,
} from 'recharts';
import { colors, chartConfig, chartStyles } from '../design-guidelines';
import { ZoomableChartWrapper } from '../components/ZoomableChartWrapper';
import Accordion from '../components/Accordion';

const CleanCircle = (props) => {
    const { cx, cy, r, fill } = props;
    if (cx === null || cy === null) return null;
    return <circle cx={cx} cy={cy} r={r} fill={fill} />;
};

export const Task2 = ({ isSmallViewport }) => {
    const tooltipPortalRef = useRef(null);
    const [infoData, setInfoData] = useState(null);

    const lensExperimentData = React.useMemo(() => [
        { u: 20, v: 65.5, oneOverU: 0.05, oneOverV: 0.0153 },
        { u: 25, v: 40, oneOverU: 0.04, oneOverV: 0.025 },
        { u: 30, v: 31, oneOverU: 0.0333, oneOverV: 0.0323 },
        { u: 35, v: 27, oneOverU: 0.0286, oneOverV: 0.037 },
        { u: 40, v: 25, oneOverU: 0.025, oneOverV: 0.04 },
        { u: 45, v: 23.1, oneOverU: 0.0222, oneOverV: 0.0433 },
        { u: 50, v: 21.5, oneOverU: 0.02, oneOverV: 0.0465 },
        { u: 55, v: 20.5, oneOverU: 0.0182, oneOverV: 0.0488 },
    ], []);

    const calculateLineOfBestFit = (data) => {
        const n = data.length;
        const sumX = data.reduce((sum, d) => sum + d.oneOverU, 0);
        const sumY = data.reduce((sum, d) => sum + d.oneOverV, 0);
        const sumXY = data.reduce((sum, d) => sum + d.oneOverU * d.oneOverV, 0);
        const sumX2 = data.reduce((sum, d) => sum + d.oneOverU * d.oneOverU, 0);

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const yMean = sumY / n;
        const ssTotal = data.reduce(
            (sum, d) => sum + (d.oneOverV - yMean) ** 2,
            0
        );
        const ssResidual = data.reduce((sum, d) => {
            const predicted = slope * d.oneOverU + intercept;
            return sum + (d.oneOverV - predicted) ** 2;
        }, 0);
        const rSquared = 1 - ssResidual / ssTotal;
        const focalLength = 1 / intercept;

        return { slope, intercept, focalLength, rSquared };
    };

    const { slope, intercept, focalLength, rSquared } = React.useMemo(
        () => calculateLineOfBestFit(lensExperimentData),
        [lensExperimentData]
    );

    const lineData = React.useMemo(() => {
        const data = [];
        for (let x = 0; x <= 0.055; x += 0.0001) {
            const y = slope * x + intercept;
            data.push({ oneOverU: x, bestFit: y });
        }
        return data;
    }, [slope, intercept]);

    const handleMouseMove = useCallback((e) => {
        if (!e || !e.activePayload || !e.activePayload.length) return;

        const label = e.activeLabel ?? e.activePayload[0].payload.oneOverU;

        let closestPoint = null;
        let minDiff = Infinity;
        for (const d of lensExperimentData) {
            const diff = Math.abs(d.oneOverU - label);
            if (diff < minDiff) { minDiff = diff; closestPoint = d; }
        }

        const threshold = 0.0005;

        if (closestPoint && minDiff <= threshold) {
            const predictedY = slope * closestPoint.oneOverU + intercept;
            const percentError = Math.abs((closestPoint.oneOverV - predictedY) / closestPoint.oneOverV * 100);
            setInfoData({
                ...closestPoint,
                predicted: predictedY,
                error: percentError,
                isExperimental: true,
            });
        } else {
            const yValue = slope * label + intercept;
            setInfoData({
                oneOverU: label,
                oneOverV: yValue,
                u: 1 / label,
                v: 1 / yValue,
                isExperimental: false,
            });
        }
    }, []);

    const CustomTooltip = () => {
        if (!infoData) return null;
        return (
            <div className="p-2 flex items-center justify-evenly flex-wrap gap-x-4 gap-y-1 bg-gray-50 rounded border border-gray-200 text-xs w-full">
                {infoData.isExperimental ? (
                    <>
                        <div className="flex items-center gap-1"><span className="text-gray-600">u:</span><span className="font-medium">{infoData.u.toFixed(1)} cm</span></div>
                        <div className="flex items-center gap-1 md:ml-auto flex-wrap justify-center md:justify-end"><span className="text-gray-600">v:</span><span className="font-medium">{infoData.v.toFixed(1)} cm</span></div>
                        <div className="flex items-center gap-1 md:ml-auto flex-wrap justify-center md:justify-end"><span className="text-gray-600">1/v meas:</span><span className="font-medium">{infoData.oneOverV.toFixed(4)}</span></div>
                        <div className="flex items-center gap-1 md:ml-auto flex-wrap justify-center md:justify-end"><span className="text-gray-600">1/v pred:</span><span className="font-medium text-blue-600">{infoData.predicted.toFixed(4)}</span></div>
                        <div className="flex items-center gap-1 md:ml-auto flex-wrap justify-center md:justify-end"><span className="text-gray-600">Err:</span><span className="font-medium text-orange-600">{infoData.error.toFixed(2)}%</span></div>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-1"><span className="text-gray-600">1/u:</span><span className="font-medium">{infoData.oneOverU.toFixed(4)}</span></div>
                        <div className="flex items-center gap-1 md:ml-auto flex-wrap justify-center md:justify-end"><span className="text-gray-600">1/v:</span><span className="font-medium">{infoData.oneOverV.toFixed(4)}</span></div>
                        <div className="flex items-center gap-1 md:ml-auto flex-wrap justify-center md:justify-end"><span className="text-gray-600">u:</span><span className="font-medium">{infoData.u.toFixed(1)} cm</span></div>
                        <div className="flex items-center gap-1 md:ml-auto flex-wrap justify-center md:justify-end"><span className="text-gray-600">v:</span><span className="font-medium">{infoData.v.toFixed(1)} cm</span></div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className={`w-full ${isSmallViewport ? '' : 'max-w-7xl mx-auto p-4'}`}>
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Task 2: Thin Lens Equation Verification</h1>

            <div className={`grid ${isSmallViewport ? 'grid-cols-1' : 'grid-cols-10'} gap-6`}>
                
                <div className={`${isSmallViewport ? 'col-span-1' : 'col-span-6'}`}>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow mb-6 relative pb-10">
                        <h2 className="text-xl font-semibold text-gray-700 mb-1">1/v vs. 1/u for a Converging Lens</h2>
                        <p className="text-sm text-gray-500 mb-4">Experimental data and line of best fit.</p>
                        <ZoomableChartWrapper data={lineData} xKey="oneOverU" yKeys={['bestFit']} height={isSmallViewport ? 300 : 350} initialYDomain={[0, intercept + 0.005]} initialXDomain={[0, 0.055]}>
                            {({ domain, yDomain, handlers, refArea }) => (
                            <ComposedChart 
                                {...handlers}
                                data={lensExperimentData}
                                margin={{
                                    top: chartConfig.general.marginTop,
                                    right: chartConfig.general.marginRight,
                                    left: chartConfig.general.marginLeft,
                                    bottom: chartConfig.general.marginBottom
                                }}
                                onMouseMove={(e)=>{handlers.onMouseMove?.(e); handleMouseMove(e);}}
                                onMouseLeave={() => setInfoData(null)}
                            >
                                <CartesianGrid strokeDasharray={chartConfig.general.gridDashArray}/>
                                <XAxis
                                    dataKey="oneOverU"
                                    type="number"
                                    domain={domain}
                                    allowDataOverflow
                                    label={chartStyles.axisLabel.x('1/u (cm⁻¹)')}
                                    tickCount={isSmallViewport ? 5 : 9}
                                    tickFormatter={chartStyles.tickFormat.threeSf}
                                />
                                <YAxis
                                    dataKey="oneOverV"
                                    domain={yDomain}
                                    allowDataOverflow
                                    label={chartStyles.axisLabel.y('1/v (cm⁻¹)')}
                                    tickCount={isSmallViewport ? 4 : 6}
                                    tickFormatter={chartStyles.tickFormat.threeSf}
                                />
                                <Tooltip 
                                    content={<CustomTooltip />} 
                                    wrapperStyle={{ position:'static', width:'100%', transform:'none' }}
                                    position={{ x: 0, y: (isSmallViewport ? 300 : 400)+chartConfig.general.marginBottom}}
                                    cursor={{ stroke: colors.gray[300], strokeWidth:1, strokeDasharray:'3 3' }}
                                />
                                <Line
                                    data={lineData}
                                    type="monotone"
                                    dataKey="bestFit"
                                    stroke={colors.primary}
                                    strokeWidth={chartConfig.lineChart.line.strokeWidth}
                                    dot={chartConfig.lineChart.line.dot}
                                    activeDot={{ 
                                        r: chartConfig.general.activeDotRadius, 
                                        fill: colors.primary, 
                                        stroke: '#fff', 
                                        strokeWidth: 1.5
                                    }}
                                    name="Best Fit Line"
                                    isAnimationActive={false}
                                />
                                <Scatter
                                    name="Experimental Data"
                                    dataKey="oneOverV" 
                                    fill={colors.error}
                                    shape={<CleanCircle r={isSmallViewport ? 3 : 4} />}
                                />
                                <ReferenceLine y={intercept} stroke={colors.accent} strokeDasharray={chartConfig.lineChart.referenceLineDashArray} label={{
                                    value: `1/f = ${intercept.toFixed(3)} cm⁻¹`,
                                    position: 'left',
                                    fill: colors.accent,
                                    fontSize: 11
                                }} />
                                {refArea}
                            </ComposedChart>
                            )}
                        </ZoomableChartWrapper>
                        
                        <div ref={tooltipPortalRef} className="absolute inset-x-4 bottom-2" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow">
                        <h2 className="text-xl font-semibold text-gray-700 mb-2">Results Analysis</h2>
                        <div className="space-y-1 text-sm text-gray-700">
                            <p><strong>Line of best fit:</strong> <code className="text-blue-600">1/v = {slope.toFixed(3)} * (1/u) + {intercept.toFixed(4)}</code></p>
                            <p><strong>Slope (m):</strong> {slope.toFixed(3)} (Theoretical: -1.000)</p>
                            <p><strong>Y-intercept (1/f):</strong> {intercept.toFixed(4)} cm⁻¹</p>
                            <p><strong>Focal Length (f):</strong> {focalLength.toFixed(2)} cm</p>
                            <p><strong>R² Value:</strong> {rSquared.toFixed(4)} (Closer to 1 shows a better fit)</p>
                        </div>
                    </div>
                </div>

                <div className={`${isSmallViewport ? 'col-span-1' : 'col-span-4'}`}>
                    <Accordion title="Physics Behind the Graph" defaultOpen={true}>
                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Thin Lens Equation</h4>
                            <p className="mb-2">
                                The fundamental relationship for thin lenses relates object distance (u), 
                                image distance (v), and focal length (f):
                            </p>
                            <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                1/f = 1/u + 1/v
                            </div>
                            <p className="mt-2 text-xs">
                                Rearranging: 1/v = -1/u + 1/f ⟺ y = mx + c
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Linear Regression Analysis</h4>
                            <p className="mb-2">
                                I used least squares regression to find the best-fit line through experimental data:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-xs">
                                <li><strong>Slope calculation:</strong> m = (nΣxy - ΣxΣy) / (nΣx² - (Σx)²)</li>
                                <li><strong>Intercept calculation:</strong> c = (Σy - mΣx) / n</li>
                                <li><strong>R² determination:</strong> 1 - SS<sub>residual</sub>/SS<sub>total</sub></li>
                                <li><strong>Focal length:</strong> f = 1/intercept</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Physical Interpretation</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Slope ≈ -1:</strong> Confirms theoretical prediction</li>
                                <li><strong>Y-intercept:</strong> Directly gives 1/f value</li>
                                <li><strong>R² → 1:</strong> Shows excellent agreement with theory</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Experimental Method</h4>
                            <p className="mb-2">
                                The graph plots 1/v against 1/u for measured object and image distances. According to the thin lens equation, this should yield a straight line with slope -1 and y-intercept 1/f, allowing direct determination of the focal length from experimental data.
                            </p>
                        </div>
                    </Accordion>
                </div>
            </div>
        </div>
    );
};
