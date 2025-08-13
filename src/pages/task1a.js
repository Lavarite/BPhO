import React, { useMemo, useCallback } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip
} from 'recharts';
import { colors, chartConfig, spectrum, wavelengthToHex, buildWavelengthGradientStops, getColorName, chartStyles } from '../design-guidelines';
import { ZoomableChartWrapper } from '../components/ZoomableChartWrapper';
import Accordion from '../components/Accordion';

const A_COEFF = [1.03961212, 0.231792344, 1.01046945];
const B_COEFF = [0.00600069867, 0.0200179144, 103.560653];

function nBK7(lambda_nm) {
    const lambda_um_sq = Math.pow(lambda_nm / 1000, 2);
    let sum = 0;
    for (let i = 0; i < 3; i++) {
        sum += (A_COEFF[i] * lambda_um_sq) / (lambda_um_sq - B_COEFF[i]);
    }
    return Math.sqrt(1 + sum);
}

export const Task1a = ({ isSmallViewport }) => {

    const chartData = useMemo(() => {
        const data = [];
        for (let lambda = spectrum.wavelength.min; lambda <= spectrum.wavelength.max; lambda += .5) {
            data.push({
                wavelength: lambda,
                n: nBK7(lambda)
            });
        }
        return data;
    }, []);

    const allN = chartData.map((d) => d.n);
    const minN = Math.min(...allN);
    const maxN = Math.max(...allN);

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload || !payload.length) return null;
        
        const { wavelength, n } = payload[0].payload;
        const lambda_um_sq = Math.pow(wavelength / 1000, 2);
        const terms = A_COEFF.map((a, i) => (a * lambda_um_sq) / (lambda_um_sq - B_COEFF[i]));
        
        return (
            <div className="p-2 flex items-center justify-evenly flex-wrap gap-x-4 gap-y-1 bg-gray-50 rounded border border-gray-200 text-xs w-full">
                <div className="flex items-center gap-1">
                    <span className="text-gray-600">λ:</span>
                    <span className="font-medium">{wavelength.toFixed(0)} nm</span>
                    <div className="w-3 h-3 rounded-full border border-gray-300" 
                         style={{backgroundColor: wavelengthToHex(wavelength)}}>
                    </div>
                </div>
                <div className="flex items-center gap-1 md:ml-auto flex-wrap justify-center md:justify-end">
                    <span className="text-gray-600">n:</span>
                    <span className="font-medium text-gray-800 mr-2">{n.toFixed(4)}</span>
                </div>
                <div className="flex items-center flex-wrap gap-x-1 md:ml-auto justify-center md:justify-end">
                    <span className="text-gray-600">Sellmeier terms:</span>
                    <span className="font-medium text-gray-700 ml-1">
                        {terms.map(t => t.toFixed(3)).join(' + ')}
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className={`w-full ${isSmallViewport ? '' : 'max-w-7xl mx-auto p-4'}`}>
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Task 1a: Crown Glass Refractive Index</h1>

            <div className={`grid ${isSmallViewport ? 'grid-cols-1' : 'grid-cols-10'} gap-6 items-start`}>
                
                <div className={`${isSmallViewport ? 'col-span-1' : 'col-span-6'} bg-white border border-gray-200 rounded-lg p-4 shadow relative pb-10 h-fit`}>
                    <h2 className="text-xl font-semibold text-gray-700 mb-1">Refractive Index vs. Wavelength</h2>
                    <p className="text-sm text-gray-500 mb-4">BK7 Crown Glass (Sellmeier Equation)</p>
                    <ZoomableChartWrapper data={chartData} xKey="wavelength" yKeys={['n']} height={isSmallViewport ? 300 : 400}>
                        {({ domain, yDomain, handlers, refArea }) => (
                        <LineChart
                            {...handlers}
                            data={chartData}
                            margin={{
                                top: chartConfig.general.marginTop,
                                right: chartConfig.general.marginRight,
                                left: chartConfig.general.marginLeft,
                                bottom: chartConfig.general.marginBottom
                            }}
                        >
                            <CartesianGrid strokeDasharray={chartConfig.general.gridDashArray}/>
                            <XAxis
                                dataKey="wavelength"
                                type="number"
                                domain={domain}
                                allowDataOverflow
                                tickCount={isSmallViewport ? 5 : 9}
                                label={chartStyles.axisLabel.x('Wavelength (nm)')}
                                tickFormatter={chartStyles.tickFormat.oneDp}
                            />
                            <defs>
                                <linearGradient id="crownColorGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    {buildWavelengthGradientStops().map((s) => (
                                        <stop key={s.offset} offset={`${(s.offset * 100).toFixed(2)}%`} stopColor={s.color} />
                                    ))}
                                </linearGradient>
                            </defs>
                            <YAxis
                                dataKey="n"
                                domain={yDomain || [minN - 0.001, maxN + 0.001]}
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
                                stroke="url(#crownColorGradient)"
                                strokeWidth={chartConfig.lineChart.line.strokeWidth}
                                dot={chartConfig.lineChart.line.dot}
                                activeDot={(props) => {
                                    const { cx, cy, payload } = props;
                                    if (!payload) return null;
                                    const color = wavelengthToHex(payload.wavelength);
                                    return <circle cx={cx} cy={cy} r={chartConfig.general.activeDotRadius} fill={color} stroke="#fff" strokeWidth={1.5} />;
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
                            <h4 className="font-semibold text-base text-gray-800 mb-2">The Sellmeier Equation</h4>
                            <p className="mb-2">
                                The refractive index of BK7 crown glass varies with wavelength due to dispersion, 
                                described by the Sellmeier equation. This is an empirical relationship between refractive index and wavelength for a transparent medium:
                            </p>
                            <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
                                n²(λ) = 1 + Σ(A<sub>i</sub>λ² / (λ² - B<sub>i</sub>))
                            </div>
                             <p className="mt-2 text-xs text-gray-600">
                                 Reference: <a href="https://link.springer.com/rwe/10.1007/978-1-4419-6247-8_10447" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Sellmeier equation (Encyclopedia of Astrobiology)</a>
                             </p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Physical Origin</h4>
                            <p className="mb-2">
                                Dispersion comes from the response of electrons to electromagnetic 
                                waves. The Sellmeier equation models this through oscillator resonances:
                            </p>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>A<sub>i</sub></strong>: Oscillator strength (related to electron density)</li>
                                <li><strong>B<sub>i</sub></strong>: Resonance frequency parameter (λ<sub>0</sub>² in µm²)</li>
                            </ul>
                            <p className="mb-2">Where each term represents an electronic transition</p>
                        </div>

                        <div>
                            <h4 className="font-semibold text-base text-gray-800 mb-2">Observed Behavior</h4>
                            <ul className="list-disc pl-5 space-y-1">
                                <li><strong>Normal dispersion</strong>: n decreases with increasing λ</li>
                                <li><strong>Purple light</strong>: Higher refractive index (~1.53)</li>
                                <li><strong>Red light</strong>: Lower refractive index (~1.51)</li>
                            </ul>
                        </div>

                         <div>
                             <h4 className="font-semibold text-base text-gray-800 mb-2">Applications</h4>
                             <ul className="list-disc pl-5 space-y-1">
                                 <li>
                                     <strong>Prism spectrometers</strong>: Analyse emitted spectral lines to determine composition. 
                                     <a href="https://en.wikipedia.org/wiki/Prism_spectrometer" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">Learn more</a>
                                 </li>
                                 <li>
                                     <strong>Achromatic lenses</strong>: Designed to mitigate chromatic distortion/aberration. 
                                     <a href="https://www.vyoptics.com/what-is-achromatic-lens-and-why-use-an-achromatic-lens.html" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">Learn more</a>
                                 </li>
                             </ul>
                         </div>
                    </Accordion>
                </div>
            </div>
        </div>
    );
};
