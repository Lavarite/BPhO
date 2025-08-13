import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  LineChart,
  Line
} from "recharts";
import { layout, chartConfig,  spectrum, wavelengthToHex, colorBands, buildFrequencyGradientStops, chartStyles } from "../design-guidelines";
import { PI, pow, sqrt, asin, sin, min, max } from "../math_functions";
import { ZoomableChartWrapper } from "../components/ZoomableChartWrapper";
import { ParameterSlider } from "../components/parameterSlider";
import { OpticsGrid } from "../components/opticsGrid";
import { Circle, Group, Rect } from "react-konva";
import Accordion from "../components/Accordion";

const A_WATER = [0.75831, 0.08495, 0.00746];
const B_WATER = [0.01007, 8.91377, 0.10396];

function nWater(lambdaNm) {
  const lambda_um_sq = pow(lambdaNm / 1000, 2);
  const sum = A_WATER.reduce(
    (acc, a, i) => acc + (a * lambda_um_sq) / (lambda_um_sq - B_WATER[i]),
    0
  );
  return sqrt(1 + sum);
}

export const Task11 = ({ isSmallViewport, headerHeight }) => {
  const { combinedData, critPoints, ranges, freqData } = useMemo(() => {
    const tSamplesDeg = Array.from({ length: 181 }, (_, i) => i * 0.5);

    const fSamples = Array.from({ length: spectrum.frequency.max - spectrum.frequency.min + 1 }, (_, i) => spectrum.frequency.min + i);

    const cData = tSamplesDeg.map((tDeg) => {
      const row = { t: tDeg };
      const tRad = (tDeg * PI) / 180;

      colorBands.forEach(({ name, range }) => {
        const n_min = nWater(range[0]);
        const n_max = nWater(range[1]);

        const e1_min = (elevationPrimary(tRad, n_min) * 180) / PI;
        const e1_max = (elevationPrimary(tRad, n_max) * 180) / PI;
        row[`primary_${name}`] = [min(e1_min, e1_max), max(e1_min, e1_max)];
        
        const e2_min = (elevationSecondary(tRad, n_min) * 180) / PI;
        const e2_max = (elevationSecondary(tRad, n_max) * 180) / PI;
        row[`secondary_${name}`] = [min(e2_min, e2_max), max(e2_min, e2_max)];
      });
      return row;
    });

    // Critical points array
    const crit = [];
    colorBands.forEach(({ name, range, color }) => {
        const lambda = (range[0] + range[1]) / 2;
        const n = nWater(lambda);

        const tCritP = asin(sqrt((4 - n * n) / 3));
        const eCritP = elevationPrimary(tCritP, n);
        crit.push({
            t: (tCritP * 180) / PI,
            e: (eCritP * 180) / PI,
            color: color,
            id: `primary_${name}`,
            type: 'primary'
        });

        const tCritS = asin(sqrt((9 - n * n) / 8));
        const eCritS = elevationSecondary(tCritS, n);
        crit.push({
            t: (tCritS * 180) / PI,
            e: (eCritS * 180) / PI,
            color: color,
            id: `secondary_${name}`,
            type: 'secondary'
        });
    });

    const hasElevationP = (row) => colorBands.some(({name}) => row[`primary_${name}`][1] > 0);
    const hasElevationS = (row) => colorBands.some(({name}) => row[`secondary_${name}`][1] > 0);

    const startPrimaryInc = cData.find(hasElevationP)?.t ?? null;
    const endPrimaryInc = [...cData].reverse().find(hasElevationP)?.t ?? null;
    const startSecondaryInc = cData.find(hasElevationS)?.t ?? null;
    const endSecondaryInc = [...cData].reverse().find(hasElevationS)?.t ?? null;

    const fData = fSamples.map((f) => {
      const lambda_nm = (3e8 / (f * 1e12)) * 1e9;
      const n = nWater(lambda_nm);
      const tCritP = asin(sqrt((4 - n * n) / 3));
      const eCritP = (elevationPrimary(tCritP, n) * 180) / PI;
      const rCritP = asin(sin(tCritP) / n);
      const tCritS = asin(sqrt((9 - n * n) / 8));
      const eCritS = (elevationSecondary(tCritS, n) * 180) / PI;
      const rCritS = asin(sin(tCritS) / n);
      const phiCrit = asin(1 / n); // critical internal reflection angle
      return { f, primary: eCritP, secondary: eCritS, phiP: (rCritP * 180) / PI, phiS: (rCritS * 180) / PI, phiCrit: (phiCrit * 180) / PI };
    });

    return { combinedData: cData, critPoints: crit, ranges: { startPrimaryInc, endPrimaryInc, startSecondaryInc, endSecondaryInc }, freqData: fData };
  }, []);

  const [showPrimary, setShowPrimary] = useState(true);
  const [showSecondary, setShowSecondary] = useState(true);

  const [selectorVisible, setSelectorVisible] = useState(true);
  const rainbowSimRef = useRef(null);

  useEffect(() => {
      const obsTarget = rainbowSimRef.current;
      if (!obsTarget) return;
      const bottomMargin = -(window.innerHeight - headerHeight - 1);
      const rootMargin = `-${headerHeight}px 0px ${bottomMargin}px 0px`;
      const observer = new IntersectionObserver((entries) => {
          const entry = entries[0];
          setSelectorVisible(!entry.isIntersecting);
      }, {
          threshold: 0,
          rootMargin: rootMargin
      });

      observer.observe(obsTarget);
      return () => observer.disconnect();
  }, [headerHeight]);

  return (
    <div className={layout.pageWrapperResponsive(isSmallViewport)}>
      <h1 className="text-2xl font-bold mb-6">Task 11: Rainbow Physics</h1>

      <div
        style={{ top: headerHeight }}
        className={`sticky z-30 bg-white/80 backdrop-blur rounded-b-lg shadow px-4 py-2 transition-transform duration-300 ease-in-out ${
        selectorVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <h3 className="text-sm font-semibold text-gray-600 mb-2">Toggle Rainbow Visibility</h3>
        <RainbowSelector
          showPrimary={showPrimary}
          showSecondary={showSecondary}
          togglePrimary={() => setShowPrimary(!showPrimary)}
          toggleSecondary={() => setShowSecondary(!showSecondary)}
        />
      </div>

      {/* Task 11a – incidence vs elevation */}
      <IncidenceElevationChart
          combinedData={combinedData}
          critPoints={critPoints}
          showPrimary={showPrimary}
          showSecondary={showSecondary}
          isSmallViewport={isSmallViewport}
      />

      {/* Focusing angles section */}
      <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg text-sm leading-relaxed">
        <h3 className="font-semibold text-indigo-800 mb-2">Focusing (caustic) incidence angles</h3>
        <p className="mb-2 text-gray-700">At specific incidence angles, the derivative dε/dθ becomes zero. This means the change in the elevation angle is minimal, so deflected rays tend to accumulate, forming a caustic and intensifying brightness at the corresponding wavelengths. The angles below mark these extrema and are plotted as coloured dots:</p>
        <ul className="grid grid-cols-2 gap-1 list-disc list-inside">
          {critPoints.map((pt) => (
            <li key={`focus_${pt.id}`} className="text-gray-800">
              {pt.id.replace(/^(primary_|secondary_)/, '')} - {pt.type === 'primary' ? 'Primary' : 'Secondary'}: θ ≈ {pt.t.toFixed(2)}° (ε ≈ {pt.e.toFixed(2)}°)
            </li>
          ))}
        </ul>
        <p className="mt-2 text-gray-700">Higher frequency (blue/violet) light generally focuses at different angles than lower frequency (red) light due to dispersion.</p>
      </div>

      <ElevationFrequencyChart
          freqData={freqData}
          showPrimary={showPrimary}
          showSecondary={showSecondary}
          isSmallViewport={isSmallViewport}
      />

      <RefractionAngleChart
          freqData={freqData}
          showPrimary={showPrimary}
          showSecondary={showSecondary}
          isSmallViewport={isSmallViewport}
      />

      <div ref={rainbowSimRef}>
        <Task11dRainbowSim isSmallViewport={isSmallViewport} />
      </div>
    </div>
  );
};

const RainbowSelector = ({ showPrimary, showSecondary, togglePrimary, toggleSecondary }) => (
  <div className="flex gap-3 flex-wrap items-center">
    <button
      type="button"
      onClick={togglePrimary}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm focus:outline-none ${
        showPrimary ? 'bg-rose-500/90 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {showPrimary ? '✓ ' : ''}Primary
    </button>
    <button
      type="button"
      onClick={toggleSecondary}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors shadow-sm focus:outline-none ${
        showSecondary ? 'bg-cyan-600/90 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {showSecondary ? '✓ ' : ''}Secondary
    </button>
  </div>
);

// -- Incidence vs Elevation chart (Task 11a) ----
const IncidenceElevationChart = ({combinedData, critPoints, showPrimary, showSecondary, isSmallViewport}) => {
  const yKeys = React.useMemo(() => {
    const keys = [];
    if (showPrimary) keys.push(...colorBands.map((b) => `primary_${b.name}`));
    if (showSecondary) keys.push(...colorBands.map((b) => `secondary_${b.name}`));
    return keys;
  }, [showPrimary, showSecondary]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const row = combinedData.find((r) => r.t === label);
    if (!row) return null;
    let pMin = Infinity, pMax = -Infinity, sMin = Infinity, sMax = -Infinity;
    colorBands.forEach(({ name }) => {
      if (showPrimary) {
        const arr = row[`primary_${name}`];
        if (arr) { pMin = min(pMin, arr[0]); pMax = max(pMax, arr[1]); }
      }
      if (showSecondary) {
        const arr2 = row[`secondary_${name}`];
        if (arr2) { sMin = min(sMin, arr2[0]); sMax = max(sMax, arr2[1]); }
      }
    });
    return (
      <div className="bg-white/95 px-2 py-1 rounded shadow-md border border-gray-200 text-xs">
        <div className="font-semibold">θ = {label.toFixed(1)}°</div>
        {showPrimary && pMin !== Infinity && (
          <div className="text-rose-600">Primary: {pMin.toFixed(1)}°-{pMax.toFixed(1)}°</div>
        )}
        {showSecondary && sMin !== Infinity && (
          <div className="text-cyan-600">Secondary: {sMin.toFixed(1)}°-{sMax.toFixed(1)}°</div>
        )}
      </div>
    );
  };

  const primaryAreas = colorBands.map(({ name, color }) => (
    <Area key={`primary_${name}`} type="monotone" dataKey={`primary_${name}`} stroke="none" fill={color} fillOpacity={0.7} isAnimationActive={false} />
  ));
  const secondaryAreas = colorBands.map(({ name, color }) => (
    <Area key={`secondary_${name}`} type="monotone" dataKey={`secondary_${name}`} stroke="none" fill={color} fillOpacity={0.7} isAnimationActive={false} />
  ));

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Task 11a: Rainbow Elevation vs Incidence Angle</h2>
      <ZoomableChartWrapper data={combinedData} xKey="t" yKeys={yKeys} height={isSmallViewport ? 400 : 600} initialYDomain={[0, 180]}>
        {({ domain, yDomain, handlers, refArea }) => (
          <AreaChart
            {...handlers}
            data={combinedData}
            margin={{
              top: chartConfig.general.marginTop,
              right: chartConfig.general.marginRight,
              left: chartConfig.general.marginLeft,
              bottom: chartConfig.general.marginBottom,
            }}
          >
            <CartesianGrid strokeDasharray={chartConfig.general.gridDashArray}/>
            <XAxis
              dataKey="t"
              type="number"
              domain={domain || [0, 90]}
              allowDataOverflow
              tickCount={10}
              label={chartStyles.axisLabel.x('Incidence angle θ (°)')}
              tickFormatter={chartStyles.tickFormat.oneDp}
            />
            <YAxis
              domain={yDomain || [0, 180]}
              allowDataOverflow
              tickCount={10}
              label={chartStyles.axisLabel.y('Elevation ε (°)')}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip content={<CustomTooltip />} />
            {showPrimary && primaryAreas}
            {showSecondary && secondaryAreas}
            {critPoints.map((pt) => ( (pt.type === 'primary' && showPrimary) || (pt.type === 'secondary' && showSecondary) ) ? (
              <ReferenceDot key={pt.id} x={pt.t} y={pt.e} r={4} fill={pt.color} stroke="#111827" strokeWidth={1} />
            ) : null )}
            {refArea}
          </AreaChart>
        )}
      </ZoomableChartWrapper>
      
      <Accordion title="Physics Behind the Rainbow Formation">
        <div>
          <h4 className="font-semibold text-base text-gray-800 mb-2">Rainbow Theory</h4>
          <p className="mb-2">
            Rainbows form when sunlight enters water droplets in the atmosphere. The process involves refraction, internal reflection, and dispersion of white light into its component colors.
          </p>
          <strong>Primary Rainbow:</strong> Formed by one internal reflection inside the droplet. The elevation formula is:
          <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
            ε = 4 * arcsin(sin(θ)/n) - 2θ
          </div>
          <strong>Secondary Rainbow:</strong> Formed by two internal reflections, appearing fainter and with reversed color order:
          <div className="bg-gray-100 p-2 mt-1 rounded text-xs font-mono">
            ε = π - 6 * arcsin(sin(θ)/n) + 2θ
          </div>
        </div>
      </Accordion>
    </div>
  );
};

// -- Elevation vs Frequency chart (Task 11b) ----
const ElevationFrequencyChart = ({ freqData, showPrimary, showSecondary, isSmallViewport}) => {
  const renderActiveDotFreq = ({ cx, cy, payload }) => {
    if (!payload) return null;
    const lambda = (3e8 / (payload.f * 1e12)) * 1e9;
    const col = wavelengthToHex(lambda);
    return <circle cx={cx} cy={cy} r={4} fill={col} stroke="#fff" strokeWidth={1} />;
  };

  const yKeys = [showPrimary ? 'primary' : null, showSecondary ? 'secondary' : null].filter(Boolean);
  const vals = [];
  freqData.forEach((d) => {
    if (showPrimary) vals.push(d.primary);
    if (showSecondary) vals.push(d.secondary);
  });
  const minY = min(...vals);
  const maxY = max(...vals);

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">Task 11b: Rainbow Elevation vs Frequency</h2>
      <ZoomableChartWrapper data={freqData} xKey="f" yKeys={yKeys} height={isSmallViewport ? 400 : 600} initialYDomain={[minY - 0.5, maxY + 0.5]}>
        {({ domain, yDomain, handlers, refArea }) => (
          <LineChart {...handlers} data={freqData} margin={{ top: chartConfig.general.marginTop, right: chartConfig.general.marginRight, left: chartConfig.general.marginLeft, bottom: chartConfig.general.marginBottom }}>
            <defs>
              <linearGradient id="freqRainbow" x1="0" y1="0" x2="1" y2="0">
                {buildFrequencyGradientStops().map((s) => <stop key={s.offset} offset={`${(s.offset * 100).toFixed(2)}%`} stopColor={s.color} />)}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray={chartConfig.general.gridDashArray}/>
            <XAxis dataKey="f" type="number" domain={domain || [405, 790]} allowDataOverflow tickCount={10} label={chartStyles.axisLabel.x('Frequency (THz)')} tickFormatter={chartStyles.tickFormat.oneDp} />
            <YAxis domain={yDomain || [minY - 0.5, maxY + 0.5]} allowDataOverflow tickCount={10} tickFormatter={(v) => v.toFixed(1)} label={chartStyles.axisLabel.y('Elevation ε (°)')} />
            <Tooltip content={({ active, payload, label }) => { if (!active || !payload) return null; const p = payload[0]?.payload; if (!p) return null; return (<div className="bg-white/95 px-2 py-1 rounded shadow-md border border-gray-200 text-xs"><div className="font-semibold">f = {label.toFixed(0)} THz</div>{showPrimary && <div className="text-rose-600">Primary: {p.primary.toFixed(1)}°</div>}{showSecondary && <div className="text-cyan-600">Secondary: {p.secondary.toFixed(1)}°</div>}</div>); }} />
            {showPrimary && <Line type="monotone" dataKey="primary" stroke="url(#freqRainbow)" strokeWidth={2} dot={false} activeDot={renderActiveDotFreq} name="Primary" isAnimationActive={false} />}
            {showSecondary && <Line type="monotone" dataKey="secondary" stroke="url(#freqRainbow)" strokeWidth={1.5} dot={false} activeDot={renderActiveDotFreq} name="Secondary" isAnimationActive={false} />}
            {refArea}
          </LineChart>
        )}
      </ZoomableChartWrapper>
      
      <Accordion title="Why Different Colors Appear at Different Angles">
        <div>
          <h4 className="font-semibold text-base text-gray-800 mb-2">Dispersion and Color Separation</h4>
          <p className="mb-2">
            Different frequencies of light have different refractive indices in water, causing them to bend by different amounts and exit the droplet at different angles.
          </p>
          <div className="space-y-2">
            <p>Higher frequency (blue/violet) light</p>
            <p>Lower frequency (red) light</p>
          </div>
        </div>
      </Accordion>
    </div>
  );
};

// -- Refraction angle vs Frequency chart (Task 11c) ----
const RefractionAngleChart = ({ freqData, showPrimary, showSecondary, isSmallViewport}) => {
  const renderActiveDotFreq = ({ cx, cy, payload }) => {
    if (!payload) return null;
    const lambda = (3e8 / (payload.f * 1e12)) * 1e9;
    const col = wavelengthToHex(lambda);
    return <circle cx={cx} cy={cy} r={4} fill={col} stroke="#fff" strokeWidth={1} />;
  };

  const yKeys = [showPrimary ? 'phiP' : null, showSecondary ? 'phiS' : null, 'phiCrit'].filter(Boolean);
  const vals = [];
  freqData.forEach((d) => { if (showPrimary) vals.push(d.phiP); if (showSecondary) vals.push(d.phiS); vals.push(d.phiCrit); });
  const minY = min(...vals);
  const maxY = max(...vals);

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4">Task 11c: Refraction angle inside droplet vs Frequency</h2>
      <ZoomableChartWrapper data={freqData} xKey="f" yKeys={yKeys} height={isSmallViewport ? 400 : 600} initialYDomain={[39,50]}>
        {({ domain, yDomain, handlers, refArea }) => (
          <LineChart {...handlers} data={freqData} margin={{ top: chartConfig.general.marginTop, right: chartConfig.general.marginRight, left: chartConfig.general.marginLeft, bottom: chartConfig.general.marginBottom }}>
            <defs>
              <linearGradient id="phiRainbow" x1="0" y1="0" x2="1" y2="0">
                {buildFrequencyGradientStops().map((s) => <stop key={s.offset} offset={`${(s.offset * 100).toFixed(2)}%`} stopColor={s.color} />)}
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray={chartConfig.general.gridDashArray}/>
            <XAxis dataKey="f" type="number" domain={domain || [405, 790]} allowDataOverflow tickCount={10} label={chartStyles.axisLabel.x('Frequency (THz)')} tickFormatter={chartStyles.tickFormat.oneDp} />
            <YAxis domain={yDomain || [minY - 0.5, maxY + 0.5]} allowDataOverflow tickCount={10} tickFormatter={(v) => v.toFixed(1)} label={chartStyles.axisLabel.y('Refraction angle φ (°)')} />
            <Tooltip content={({ active, payload, label }) => { if (!active || !payload) return null; const p = payload[0]?.payload; if (!p) return null; return (<div className="bg-white/95 px-2 py-1 rounded shadow-md border border-gray-200 text-xs"><div className="font-semibold">f = {label.toFixed(0)} THz</div>{showPrimary && <div className="text-rose-600">φ<sub>P</sub> = {p.phiP.toFixed(1)}°</div>}{showSecondary && <div className="text-cyan-600">φ<sub>S</sub> = {p.phiS.toFixed(1)}°</div>}<div className="text-gray-700">φ<sub>crit</sub> = {p.phiCrit.toFixed(1)}°</div></div>); }} />
            {showPrimary && <Line type="monotone" dataKey="phiP" stroke="url(#phiRainbow)" strokeWidth={2} dot={false} activeDot={renderActiveDotFreq} name="φ Primary" isAnimationActive={false} />}
            {showSecondary && <Line type="monotone" dataKey="phiS" stroke="url(#phiRainbow)" strokeWidth={1.5} dot={false} activeDot={renderActiveDotFreq} name="φ Secondary" isAnimationActive={false} />}
            <Line type="monotone" dataKey="phiCrit" stroke="#000" strokeWidth={1.5} dot={false} name="Critical" isAnimationActive={false} />
            {refArea}
          </LineChart>
        )}
      </ZoomableChartWrapper>
      
      <Accordion title="Internal Refraction and Critical Angles">
        <div>
          <h4 className="font-semibold text-base text-gray-800 mb-2">Light Behavior Inside the Droplet</h4>
          <p className="mb-2">
            This chart shows the refraction angle φ inside the water droplet at the critical incidence angles that produce the brightest rainbow colors.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Primary refraction angle (φ<sub>p</sub>):</strong> The angle at which light refracts into the droplet before undergoing one internal reflection.
            </li>
            <li>
              <strong>Secondary refraction angle (φ<sub>s</sub>):</strong> The angle for light that undergoes two internal reflections to form the secondary rainbow.
            </li>
            <li>
              <strong>Critical angle (φ<sub>crit</sub>):</strong> The minimum angle for total internal reflection to occur. Calculated as φ<sub>crit</sub> = arcsin(1/n).
            </li>
            <li>
              <strong>Correlation:</strong> Higher frequency light has larger refractive indices, leading to smaller refraction angles inside the droplet.
            </li>
          </ul>
        </div>
      </Accordion>
    </div>
  );
}; 

// Primary/secondary elevation formulae (rad)
const elevationPrimary = (tRad, n) => 4 * asin(sin(tRad) / n) - 2 * tRad;
const elevationSecondary = (tRad, n) => PI - 6 * asin(sin(tRad) / n) + 2 * tRad;

const Task11dRainbowSim = ({ isSmallViewport }) => {
  const [alphaDeg, setAlphaDeg] = useState(30);

  const bowData = useMemo(() => {
    const primary = [];
    const secondary = [];

    for (let lambda = spectrum.wavelength.min; lambda <= spectrum.wavelength.max; lambda += 2) {
      const n = nWater(lambda);
      const col = wavelengthToHex(lambda);

      const tCritP = asin(sqrt((4 - n * n) / 3));
      const eP = (elevationPrimary(tCritP, n) * 180) / PI;
      primary.push({ eDeg: eP, color: col });

      const tCritS = asin(sqrt((9 - n * n) / 8));
      const eS = (elevationSecondary(tCritS, n) * 180) / PI;
      secondary.push({ eDeg: eS, color: col });
    }

    return { primary, secondary };
  }, []);

  const DEG2UNITS = 1 / 5;

  const renderBow = (data) => {
    return data.map(({ eDeg, color }, idx) => {
      const r = eDeg * DEG2UNITS;
      const dy = alphaDeg * DEG2UNITS;

      return (
        <Circle
          key={idx}
          x={0}
          y={dy}
          radius={r}
          stroke={color}
          strokeWidth={0.02}
          listening={false}
        />
      );
    });
  };

  const gridHeight = isSmallViewport ? "320px" : "70vh";

  return (
    <div className="mt-12">
      <h3 className="text-xl font-semibold text-gray-800 mb-2">Task 11d: Rainbow Appearance</h3>

      <div className="p-4 bg-gray-50 rounded-lg border max-w-[800px] mx-auto">
        <ParameterSlider
          label="Solar Angle α"
          value={alphaDeg}
          onChange={setAlphaDeg}
          min={0}
          max={45}
          step={0.1}
          unit="°"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mt-4" style={{ height: gridHeight }}>
        <OpticsGrid presetName="task11d" initialShowGrid={false}>
          <Group>{renderBow(bowData.primary)}</Group>
          <Group>{renderBow(bowData.secondary)}</Group>
          <Rect x={-100} y={0} width={200} height={100} fill="#22aa44" listening={false} />
        </OpticsGrid>
      </div>
      
      <Accordion title="How Rainbow Appearance Changes with Solar Angle">
        <div>
          <h4 className="font-semibold text-base text-gray-800 mb-2">Rainbow Geometry</h4>
          <p className="mb-2">
            The appearance and visibility of rainbows depends on the position of the sun relative to the observer and the rain droplets.
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Anti-solar point:</strong> The rainbow center is always directly opposite the sun from your viewpoint. As the sun rises, the rainbow center moves down.
            </li>
            <li>
              <strong>Solar angle (α):</strong> The angle of the sun above the horizon. When α increases, the rainbow center moves below the horizon, making less of the rainbow visible.
            </li>
            <li>
              <strong>Maximum visibility:</strong> The full primary rainbow (42° radius) is only visible when the sun is at or below 42° elevation.
            </li>
          </ul>
        </div>
      </Accordion>
    </div>
  );
};