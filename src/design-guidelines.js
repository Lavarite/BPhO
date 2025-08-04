
export const colors = {
    primary: '#2563EB',
    secondary: '#7C3AED',
    accent: '#059669',
    warning: '#D97706',
    error: '#DC2626',

    gray: {
        50: '#F9FAFB',
        100: '#F3F4F6',
        200: '#E5E7EB',
        300: '#D1D5DB',
        400: '#9CA3AF',
        500: '#6B7280',
        600: '#4B5563',
        700: '#374151',
        800: '#1F2937',
        900: '#111827'
    },

    task1: {
        rainbow: [
            '#EF4444', '#F97316', '#EAB308', 
            '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899'
        ]
    },

    media: {
        air: '#E0F2FE',
        water: '#DBEAFE', 
        glass: '#FEF3C7',
        diamond: '#F3E8FF',
        steel: '#E5E7EB'
    }
};

export const spectrum = {
    wavelength: {
        min: 405,
        max: 790,
    },
    frequency: {
        min: 380,
        max: 740,
    }
};

export const getColorName = (wavelength) => {
    if (wavelength < 405) return 'Ultraviolet';
    if (wavelength < 440) return 'Violet';
    if (wavelength < 480) return 'Blue';
    if (wavelength < 495) return 'Cyan';
    if (wavelength < 570) return 'Green';
    if (wavelength < 590) return 'Yellow';
    if (wavelength < 620) return 'Orange';
    if (wavelength <= 790) return 'Red';
    return 'Infrared';
};

export const colorBands = [
    { name: 'red', range: [620, 740], color: '#ef4444' },
    { name: 'orange', range: [590, 620], color: '#f97316' },
    { name: 'yellow', range: [570, 590], color: '#facc15' },
    { name: 'green', range: [495, 570], color: '#22c55e' },
    { name: 'cyan', range: [480, 495], color: '#06b6d4' },
    { name: 'blue', range: [440, 480], color: '#3b82f6' },
    { name: 'violet', range: [380, 440], color: '#8b5cf6' }
];

export function wavelengthToHex(lambda) {
    if (lambda < spectrum.wavelength.min || lambda > spectrum.wavelength.max) return '#000000';
    
    let R = 0, G = 0, B = 0;
    if (lambda < 440) {
        R = -(lambda - 440) / (440 - 380);
        G = 0;
        B = 1;
    } else if (lambda < 490) {
        R = 0;
        G = (lambda - 440) / (490 - 440);
        B = 1;
    } else if (lambda < 510) {
        R = 0;
        G = 1;
        B = -(lambda - 510) / (510 - 490);
    } else if (lambda < 580) {
        R = (lambda - 510) / (580 - 510);
        G = 1;
        B = 0;
    } else if (lambda < 645) {
        R = 1;
        G = -(lambda - 645) / (645 - 580);
        B = 0;
    } else {
        R = 1;
        G = 0;
        B = 0;
    }
    
    let factor = 1;
    if (lambda < 420) factor = 0.3 + 0.7 * (lambda - 380) / (420 - 380);
    if (lambda > 700) factor = 0.3 + 0.7 * (780 - lambda) / (780 - 700);
    
    const gamma = 0.8;
    const conv = (v) => {
        const c = Math.pow(Math.max(0, Math.min(1, v)) * factor, gamma);
        return Math.round(c * 255).toString(16).padStart(2, '0');
    };
    return `#${conv(R)}${conv(G)}${conv(B)}`;
}

export function frequencyToWavelength(fTHz) {
    return (3e5 / fTHz);
}

export function wavelengthToFrequency(lambdaNm) {
    return (3e5 / lambdaNm);
}

export function buildFrequencyGradientStops(num = 60) {
    return Array.from({ length: num }, (_, i) => {
        const frac = i / (num - 1);
        const fTHz = spectrum.frequency.min + frac * (spectrum.frequency.max - spectrum.frequency.min);
        const lambda = frequencyToWavelength(fTHz);
        return { offset: frac, color: wavelengthToHex(lambda) };
    });
}

export function buildWavelengthGradientStops(num = 60) {
    return Array.from({ length: num }, (_, i) => {
        const frac = i / (num - 1);
        const lambda = spectrum.wavelength.min + frac * (spectrum.wavelength.max - spectrum.wavelength.min);
        return { offset: frac, color: wavelengthToHex(lambda) };
    });
}

export const layout = {    
    pageWrapper: 'w-full max-w-7xl mx-auto p-4',
    pageWrapperResponsive: (isSmallViewport) => 
        `w-full ${isSmallViewport ? '' : 'max-w-7xl mx-auto p-4'}`
};

export const chartConfig = {
    general: {
        marginTop: 20,
        marginRight: 30,
        marginLeft: 30,
        marginBottom: 30,
        gridDashArray: "3 3",
        axisTickFontSize: 12,
        activeDotRadius: 6
    },
    
    lineChart: {
        line: {
            strokeWidth: 2,
            dot: false
        },
        referenceLineDashArray: "5 5",
        referenceLabelFontSize: 12
    }
};

export const taskConfig = {
    fermat: {
        media: {
            light: {
                air: { n: 1.0, speed: 3e8, label: 'Air', shortLabel: 'Air (n=1.00)', color: colors.media.air },
                water: { n: 1.33, speed: 3e8 / 1.33, label: 'Water', shortLabel: 'Water (n=1.33)', color: colors.media.water },
                glass: { n: 1.5, speed: 3e8 / 1.5, label: 'Glass', shortLabel: 'Glass (n=1.50)', color: colors.media.glass },
                diamond: { n: 2.42, speed: 3e8 / 2.42, label: 'Diamond', shortLabel: 'Diamond (n=2.42)', color: colors.media.diamond },
            },
            sound: {
                air: { n: 1, speed: 343, label: 'Air', shortLabel: 'Air (343 m/s)', color: colors.media.air },
                water: { n: 4.31, speed: 1480, label: 'Water', shortLabel: 'Water (1480 m/s)', color: colors.media.water },
                steel: { n: 17.37, speed: 5960, label: 'Steel', shortLabel: 'Steel (5960 m/s)', color: colors.media.steel },
            }
        },
        canvas: {
            pointRadius: {
                small: 6,
                normal: 8
            },
            lineWidth: {
                normal: 2,
                thick: 3
            },
            arrowLength: 12,
            arrowAngle: Math.PI / 6
        },
        chart: {
            plotPoints: 200,
            timeMultiplier: {
                light: 1e9,
                sound: 1e3
            }
        }
    },

    task3: {
        worldSize: {
            L_MAX: 20,
            H_MAX: 12,
            H_MIN: 0.5
        },
        defaultPoints: {
            A: { x: 0, y: 5 },
            B: { x: 10, y: 5 },
            S: { x: 5, y: 0 },
            L: { x: 10, y: 0 }
        },
        defaults: {
            medium: 'air',
            waveType: 'light'
        },
        ui: {
            padding: {
                small: 40,
                normal: 60
            }
        }
    },

    task4: {
        worldSize: {
            L: 10,
            L_MAX: 12,
            H_MAX: 10,
            H_MIN: 0.1
        },
        interface: {
            Y: 5
        },
        defaultPoints: {
            A: { x: 3, y: 7 },
            B: { x: 7, y: 3 },
            S: 5
        },
        defaults: {
            medium1: 'air',
            medium2: 'glass',
            waveType: 'light'
        }
    }
};

export const chartStyles = {
    axisLabel: {
        x: (labelText) => ({
            value: labelText,
            position: 'insideBottom',
            dy: 20,
            style: { textAnchor: 'middle' },
        }),
        y: (labelText) => ({
            value: labelText,
            angle: -90,
            position: 'insideLeft',
            style: { textAnchor: 'middle' },
            dx: -20,
        }),
    },

    tickFormat: {
        oneDp: (v) => Number(v).toFixed(1),
        threeSf: (v) => Number(v).toPrecision(3),
    },
};

export const konvaConfig = {
    defaults: {
        zoom: {
            minFactor: 0.5,
            maxFactor: 3.0,
            scaleBy: 1.1,
        },
        pan: {
            limitUnits: 50,
        },
        grid: {
            spacing: 1,
            stroke: colors.gray[400],
            strokeWidth: 0.05,
            axisStroke: colors.gray[700],
            axisStrokeWidth: 0.1,
        },
    },
    presets: {
        default: {
            worldWidth: 20,
            worldHeight: 20,
            centerOrigin: true,
        },
        wide: {
            worldWidth: 40,
            worldHeight: 20,
            centerOrigin: true,
        },
        tall: {
            worldWidth: 20,
            worldHeight: 40,
            centerOrigin: true,
        },
        task3: {
            worldWidth: taskConfig.task3.worldSize.L_MAX,
            worldHeight: taskConfig.task3.worldSize.H_MAX,
            centerOrigin: false,
        },
        task4: {
            worldWidth: taskConfig.task4.worldSize.L_MAX,
            worldHeight: taskConfig.task4.worldSize.H_MAX,
            centerOrigin: false,
        },
        task11d: {
            worldWidth: 24,
            worldHeight: 24,
            centerOrigin: true,
        },
        task12: {
            worldWidth: 16,
            worldHeight: 25,
            centerOrigin: true,
        },
    }
};