import React from 'react';
import { layout } from '../design-guidelines';

export const HomePage = ({ isSmallViewport }) => {
  return (
    <div className={layout.pageWrapperResponsive(isSmallViewport)}>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Optics Challenge Hub</h1>
      <p className="text-gray-700 max-w-prose mb-6">
        Welcome to the interactive companion for the <span className="font-semibold">British Physics Olympiad – Computational Physics Challenge&nbsp;2025</span>.
        Each section in the menu above opens a focused simulation or data-visualisation that supports one task in the optics worksheet.
        Use this hub as a quick reference to see what is available and to jump straight to a topic.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SectionCard title="Fundamentals" colour="bg-blue-100" tasks={[
          'Task 1a — Crown-glass n(λ)',
          'Task 1b — Water n(λ)',
          'Task 2 — Thin-lens formula'
        ]}/>
        <SectionCard title="Physical Principles" colour="bg-purple-100" tasks={[
          'Task 3 — Reflection',
          'Task 4 — Refraction'
        ]}/>
        <SectionCard title="Image Formation" colour="bg-teal-100" tasks={[
          'Task 5 — Plane mirror',
          'Task 6-7 — Converging lens',
          'Task 8-9 — Spherical mirrors',
          'Task 10 — Anamorphic imaging'
        ]}/>
        <SectionCard title="Optical Phenomena" colour="bg-indigo-100" tasks={[
          'Task 11 — Rainbow physics',
          'Task 12 — Prism dispersion'
        ]}/>
        <SectionCard title="Extensions" colour="bg-yellow-100" tasks={[
          'Vision simulator',
          'Problem solutions'
        ]}/>
      </div>

      <p className="text-sm text-gray-500 mt-8 max-w-prose">
        The simulations are designed with a <span className="font-semibold">mobile-first</span> layout and support pinch-zoom or drag-to-zoom on the plots.
        Source code is written in&nbsp;React, Recharts and&nbsp;Konva; feel free to explore and adapt it for your own projects.
      </p>
    </div>
  );
};

const SectionCard = ({ title, tasks, colour }) => (
  <div className={`border border-gray-200 rounded-lg p-4 shadow-sm ${colour}`}> 
    <h2 className="text-lg font-semibold text-gray-800 mb-2">{title}</h2>
    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
      {tasks.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  </div>
); 