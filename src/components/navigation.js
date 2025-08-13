import React, { useState, useEffect, useLayoutEffect } from 'react';
import * as Pages from '../pages/taskIndex'

// Custom SVG Icons
const MenuIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const XIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const ChevronDownIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
);

const EyeIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const ZapIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
);

const WavesIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 256 256">
        <path d="M24,128c104-224,104,224,208,0" strokeLinecap="round" strokeLinejoin="round" strokeWidth={12} />
    </svg>
);

const CalculatorIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 512 512">
        <rect x="112" y="48" width="288" height="416" rx="32" ry="32" strokeLinecap="round" strokeLinejoin="round" strokeWidth={32} />
        <rect x="160.01" y="112" width="191.99" height="64" strokeLinecap="round" strokeLinejoin="round" strokeWidth={32} />
        <circle cx="168" cy="248" r="24" fill="currentColor" />
        <circle cx="256" cy="248" r="24" fill="currentColor" />
        <circle cx="344" cy="248" r="24" fill="currentColor" />
        <circle cx="168" cy="328" r="24" fill="currentColor" />
        <circle cx="256" cy="328" r="24" fill="currentColor" />
        <circle cx="168" cy="408" r="24" fill="currentColor" />
        <circle cx="256" cy="408" r="24" fill="currentColor" />
        <rect x="320" y="304" width="48" height="128" rx="24" ry="24" fill="currentColor" />
    </svg>
);

const SmartphoneIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        <line x1="12" y1="18" x2="12.01" y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
);

const TriangleIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L2 20h20L12 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
    </svg>
);

const HomeIcon = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9.75L12 4l9 5.75V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.75z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 22V12h6v10" />
    </svg>
);

const Navigation = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [activeTask, setActiveTask] = useState('home');
    const [isSmallViewport, setIsSmallViewport] = useState(false);
    const [headerHeight, setHeaderHeight] = useState(0);
    const headerRef = React.useRef(null);

    useLayoutEffect(() => {
        const measure = () => {
            setIsSmallViewport(window.innerWidth < 768);

            if (headerRef.current) setHeaderHeight(headerRef.current.getBoundingClientRect().height);
        };

        measure();
        window.addEventListener("resize", measure, { passive: true });

        return () => window.removeEventListener("resize", measure);
    }, []);

    useEffect(() => {
        if (!headerRef.current) return;

        const ro = new ResizeObserver(([entry]) => {
            setHeaderHeight(entry.contentRect.height);
        });

        ro.observe(headerRef.current);
        return () => ro.disconnect();
    }, []);

    const pages = {
        'home': Pages.HomePage,
        '1a': Pages.Task1a,
        '1b': Pages.Task1b,
        '2': Pages.Task2,
        '3': Pages.Task3,
        '4': Pages.Task4,
        '5': Pages.Task5,
        '6-7': Pages.Task67,
        '8-9': Pages.Task89,
        '10': Pages.Task10,
        '11': Pages.Task11,
        '12': Pages.Task12,
        'Vision': Pages.VisionPage,
        'Problems': Pages.SolutionsPage,
        'Research': Pages.ResearchPage,
    };

    useEffect(() => {
        const syncTaskWithPath = () => {
            const rawPath = window.location.pathname.toLowerCase();
            const segments = rawPath.split('/').filter(Boolean);

            let taskKey = 'home';

            if (segments.length === 0) taskKey = 'home';
            else if (segments[0] === 'task' && segments.length >= 2) taskKey = segments[1];
            else taskKey = segments[0];

            const matchedKey = Object.keys(pages).find(
                (k) => k.toLowerCase() === taskKey
            );

            setActiveTask(matchedKey || 'home');
        };

        syncTaskWithPath();

        window.addEventListener('popstate', syncTaskWithPath);
        return () => window.removeEventListener('popstate', syncTaskWithPath);
    }, []);

    const navigationSections = [
        {
            id: 'overview',
            title: 'Overview',
            items: [
                { id: 'home', title: 'Project Hub', description: 'Introduction & quick links' }
            ]
        },
        {
            id: 'fundamentals',
            title: 'Fundamentals',
            icon: <CalculatorIcon className="w-5 h-5" />,
            items: [
                { id: '1a', title: 'Crown Glass Refractive Index', description: 'Sellmeier formula modeling' },
                { id: '1b', title: 'Water Refractive Index', description: 'Frequency-dependent modeling' },
                { id: '2', title: 'Thin Lens Verification', description: 'Experimental data analysis' }
            ]
        },
        {
            id: 'principles',
            title: 'Physical Principles',
            icon: <ZapIcon className="w-5 h-5" />,
            items: [
                { id: '3', title: 'Law of Reflection', description: 'Fermat\'s principle demonstration' },
                { id: '4', title: 'Snell\'s Law', description: 'Refraction via Snell\'s law' }
            ]
        },
        {
            id: 'imaging',
            title: 'Image Formation',
            icon: <EyeIcon className="w-5 h-5" />,
            items: [
                { id: '5', title: 'Plane Mirror', description: 'Virtual image mapping' },
                { id: '6-7', title: 'Converging Lens', description: 'Real & virtual image formation' },
                { id: '8-9', title: 'Spherical Mirrors', description: 'Concave & convex image formation' },
                { id: '10', title: 'Anamorphic Imaging', description: 'Cylindrical distortion' }
            ]
        },
        {
            id: 'phenomena',
            title: 'Optical Phenomena',
            icon: <WavesIcon className="w-5 h-5" />,
            items: [
                { id: '11', title: 'Rainbow Physics', description: 'Primary & secondary rainbows' },
                { id: '12', title: 'Prism Dispersion', description: 'White light separation' }
            ]
        },
        {
            id: 'extensions',
            title: 'Extensions',
            icon: <SmartphoneIcon className="w-5 h-5" />,
            items: [
                { id: 'Vision', title: 'Vision Simulation', description: 'Interactive eye vision simulation' },
                { id: 'Problems', title: 'Problem Solutions', description: 'Ray optics worksheet' },
                { id: 'Research', title: 'Research', description: 'Gravitational lensing' }
            ]
        }
    ];

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    const toggleDropdown = (sectionId) => {
        setActiveDropdown(activeDropdown === sectionId ? null : sectionId);
    };

    const handleItemClick = (itemId) => {
        setActiveTask(itemId);
        setIsMenuOpen(false);
        setActiveDropdown(null);
        // Update the URL so that a page refresh keeps the user on the same task.
        const newPath = itemId === 'home' ? '/' : `/${itemId}`;
        window.history.pushState(null, '', newPath);
    };

    const TaskComponent = pages[activeTask];

    return (
        <div>
            <div ref={headerRef} className="bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white sticky top-0 z-50">
                {/* Header */}
                <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <TriangleIcon className="w-8 h-8 text-cyan-400" />
                        <div>
                            <h1 className="text-xl font-bold">BPhO Optics Challenge</h1>
                            <p className="text-sm text-cyan-200 hidden sm:block">Interactive Geometric Optics Simulations</p>
                        </div>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center space-x-6">
                        {navigationSections.map((section) => (
                            section.items.length === 1 ? (
                                <button
                                    key={section.id}
                                    onClick={() => handleItemClick(section.items[0].id)}
                                    className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                                >
                                    {section.icon}
                                    <span className="font-medium">{section.title}</span>
                                </button>
                            ) : (
                                <div key={section.id} className="relative group">
                                    <button
                                        className="flex items-center space-x-1 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                                        onMouseEnter={() => setActiveDropdown(section.id)}
                                        onMouseLeave={() => setActiveDropdown(null)}
                                    >
                                        {section.icon}
                                        <span className="font-medium">{section.title}</span>
                                    <ChevronDownIcon className="w-4 h-4" />
                                </button>

                                {/* Desktop Dropdown */}
                                <div
                                    className={`absolute top-full ${section.id === 'extensions' ? 'right-0' : 'left-0'} mt-1 w-80 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 transition-all duration-200 z-50 ${
                                        activeDropdown === section.id ? 'opacity-100 visible' : 'opacity-0 invisible'
                                    }`}
                                    onMouseEnter={() => setActiveDropdown(section.id)}
                                    onMouseLeave={() => setActiveDropdown(null)}
                                >
                                    <div className="p-2">
                                        {section.items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleItemClick(item.id)}
                                                className="w-full text-left p-3 rounded-lg hover:bg-white/10 transition-colors duration-150 group"
                                            >
                                                <div className="font-medium text-white group-hover:text-cyan-300">
                                                    {item.title}
                                                </div>
                                                <div className="text-sm text-gray-400 mt-1">
                                                    {item.description}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            )
                        ))}
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={toggleMenu}
                        className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
                    >
                        {isMenuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                <div className={`lg:hidden transition-all duration-300 ease-in-out ${
                    isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
                }`}>
                    <div className="px-4 pb-4 space-y-2">
                        {navigationSections.map((section) => (
                            section.items.length === 1 ? (
                                <button
                                    key={section.id}
                                    onClick={() => handleItemClick(section.items[0].id)}
                                    className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    {section.icon}
                                    <span className="font-medium">{section.title}</span>
                                </button>
                            ) : (
                            <div key={section.id} className="border-t border-white/10 pt-2">
                                <button
                                    onClick={() => toggleDropdown(section.id)}
                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <div className="flex items-center space-x-3">
                                        {section.icon}
                                        <span className="font-medium">{section.title}</span>
                                    </div>
                                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${
                                        activeDropdown === section.id ? 'rotate-180' : ''
                                    }`} />
                                </button>

                                {/* Mobile Dropdown */}
                                <div className={`transition-all duration-200 overflow-hidden ${
                                    activeDropdown === section.id ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                }`}>
                                    <div className="ml-4 space-y-1">
                                        {section.items.map((item) => (
                                            <button
                                                key={item.id}
                                                onClick={() => handleItemClick(item.id)}
                                                className="w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors group"
                                            >
                                                <div className="font-medium text-cyan-200 group-hover:text-cyan-100 text-sm">
                                                    {item.title}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {item.description}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-6">
                {activeTask && <TaskComponent isSmallViewport={isSmallViewport} headerHeight={headerHeight} />}
            </div>
        </div>
    );
};

export default Navigation;