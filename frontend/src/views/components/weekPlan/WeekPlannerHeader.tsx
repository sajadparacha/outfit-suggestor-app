import React from 'react';

const WeekPlannerHeader: React.FC = () => (
  <header className="space-y-1">
    <h1 className="text-xl font-bold text-white min-[768px]:text-2xl min-[1200px]:text-3xl">
      <span className="min-[768px]:hidden">Week Planner</span>
      <span className="hidden min-[768px]:inline">Week Outfit Planner</span>
    </h1>
    <p className="text-sm text-slate-400">
      Plan outfits for the days you need them. Daily wake-up reminders are available on iOS; here
      you&apos;ll see Today&apos;s look in the app.
    </p>
  </header>
);

export default WeekPlannerHeader;
