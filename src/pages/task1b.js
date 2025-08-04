import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';
import { colors, chartConfig, spectrum, buildFrequencyGradientStops, wavelengthToHex, chartStyles } from '../design-guidelines';
import { ZoomableChartWrapper } from '../components/ZoomableChartWrapper';
import Accordion from '../components/Accordion';

export const Task1b = ({ isSmallViewport }) => {
    const waterRefractiveData = useMemo(() => {
        const data = [];
        const C1 = 1.731;
        const C2 = 0.261;
        const f0_sq_inv = 1e-30;

        for (let f_THz = spectrum.frequency.min; f_THz <= spectrum.frequency.max; f_THz += 0.5) {
            const fHz = f_THz * 1e12;
            const rhs_inner = C1 - C2 * fHz * fHz * f0_sq_inv;
            const n = Math.sqrt(1 + 1 / Math.sqrt(rhs_inner));

            data.push({
                frequency: parseFloat(f_THz.toFixed(1)),
                n,
            });
        }
        return data;
    }, []);

    const allN = waterRefractiveData.map((d) => d.n);
    const minN = Math.min(...allN);
    const maxN = Math.max(...allN);

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;
        const { frequency, n } = payload[0].payload;
        const hexColor = wavelengthToHex(3e5 / frequency);
        const speed = 3e8 / n;
        return (
            <div className="p-2 flex items-center justify-evenly flex-wrap gap-x-4 gap-y-1 bg-gray-50 rounded border border-gray-200 text-xs w-full">
                <div className="flex items-center gap-1">
                    <span className="text-gray-600">f:</span>
                    <span className="font-medium">{frequency.toFixed(0)} THz</span>
                    <div className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: hexColor }}></div>
                </div>
                <div className="flex items-center gap-1 md:ml-auto flex-wrap justify-center md:justify-end">
                    <span className="text-gray-600">n:</span>
                    <span className="font-medium text-gray-800 mr-2">{n.toFixed(4)}</span>
                </div>
                <div className="flex items-center flex-wrap gap-x-1 md:ml-auto justify-center md:justify-end">
                    <span className="text-gray-600">Speed:</span>
                    <span className="font-medium">{(speed / 1e6).toFixed(2)} × 10⁶ m/s</span>
                </div>
            </div>
        );
    };

    return (
        <div className={`w-full ${isSmallViewport ? '' : 'max-w-7xl mx-auto p-4'}`}>
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Task 1b: Water Refractive Index and Dispersion</h1>

            <div className={`grid ${isSmallViewport ? 'grid-cols-1' : 'grid-cols-10'} gap-6`}>
                
                <div className={`${isSmallViewport ? 'col-span-1' : 'col-span-6'} bg-white border border-gray-200 rounded-lg p-4 shadow relative pb-10`}>
                    <h2 className="text-xl font-semibold text-gray-700 mb-1">Refractive Index vs. Frequency</h2>
                    <p className="text-sm text-gray-500 mb-4">Water (380 THz - 740 THz)</p>
                    <ZoomableChartWrapper data={waterRefractiveData} xKey="frequency" yKeys={['n']} height={isSmallViewport ? 300 : 400}>
                        {({ domain, yDomain, handlers, refArea }) => (
                        <LineChart
                            {...handlers}
                            data={waterRefractiveData}
                            margin={{
                                top: chartConfig.general.marginTop,
                                right: chartConfig.general.marginRight,
                                left: chartConfig.general.marginLeft,
                                bottom: chartConfig.general.marginBottom
                            }}
                            onMouseMove={(e)=>{handlers.onMouseMove?.(e);}}
                        >
                            <defs>
                                <linearGradient id="waterColorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    {buildFrequencyGradientStops().map((s) => (
                                        <stop key={s.offset} offset={`${(s.offset * 100).toFixed(2)}%`} stopColor={s.color} />
                                    ))}
                                </linearGradient>
                            </defs>
                                <CartesianGrid strokeDasharray={chartConfig.general.gridDashArray} stroke={colors.gray[300]} />
                            <XAxis
                                dataKey="frequency"
                                type="number"
                                domain={domain}
                                allowDataOverflow
                                tickCount={isSmallViewport ? 5 : 9}
                                label={chartStyles.axisLabel.x('Frequency (THz)')}
                                tickFormatter={chartStyles.tickFormat.oneDp}
                            />
                            <YAxis
                                dataKey="n"
                                domain={yDomain || [minN - 0.0005, maxN + 0.0005]}
                                allowDataOverflow
                                tickCount={isSmallViewport ? 4 : 6}
                                label={chartStyles.axisLabel.y('Refractive Index (n)')}
                                tickFormatter={(value) => value.toFixed(3)}
                            />
                            <Tooltip 
                                content={<CustomTooltip />} 
                                wrapperStyle={{ position:'static', width:'100%', transform:'none' }}
                                position={{ x: 0, y: (isSmallViewport ? 300 : 400)+chartConfig.general.marginBottom}}
                                cursor={{ stroke: colors.gray[300], strokeWidth:1, strokeDasharray:'3 3' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="n"
                                stroke="url(#waterColorGradient)"
                                strokeWidth={chartConfig.lineChart.line.strokeWidth}
                                dot={chartConfig.lineChart.line.dot}
                                activeDot={(props) => {
                                    const { cx, cy, payload } = props;
                                    if (!payload) return null;
                                    const color = wavelengthToHex(3e5 / payload.frequency);
                                    return <circle cx={cx} cy={cy} r={chartConfig.general.activeDotRadius} fill={color} stroke="#fff" strokeWidth={1.5}/>;
                                }}
                                name="n"
                                isAnimationActive={false}
                            />
                                {refArea}
                        </LineChart>
                        )}
                    </ZoomableChartWrapper>

                </div>

                <div className={`${isSmallViewport ? 'col-span-1' : 'col-span-4'}`}>
                    <Accordion title="Physics Behind the Graph" defaultOpen={true}>
                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Water's Dispersion Model</h4>
                            <p className="mb-2">
                                Water's refractive index varies with frequency due to molecular absorption resonances. 
                                This empirical model captures the dispersion:
                            </p>
                            <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                n = √(1 + 1/√(C₁ - C₂f²/f₀²))
                            </div>
                        </div>

                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Physical Origin</h4>
                            <p className="mb-2">
                                Water molecules interact with electromagnetic radiation:
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Molecular vibrations</strong>: H-O stretching and bending modes</li>
                                <li><strong>Electronic transitions</strong>: UV absorption bands</li>
                                <li><strong>Hydrogen bonding</strong>: Affects molecular response</li>
                            </ul>
                            <p className="mb-2">Where the constants represent collective molecular properties</p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Observed Behavior</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Correlation</strong>: n increases with frequency in visible range</li>
                                <li><strong>Blue light</strong>: Higher refractive index (~1.337)</li>
                                <li><strong>Red light</strong>: Lower refractive index (~1.331)</li>
                                <li><strong>Light speed</strong>: v = c/n ≈ 2.25 * 10⁸ m/s in water</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Applications</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Rainbow formation</strong>: Dispersion in water droplets</li>
                                <li><strong>Oceanography</strong>: Light penetration depths</li>
                            </ul>
                        </div>
                    </Accordion>
                </div>
            </div>
        </div>
    );
};
