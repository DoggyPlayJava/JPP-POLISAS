import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { UnifiedTimelineEvent } from './telemetryTypes';

interface TelemetryLiveTimelineProps {
  events: UnifiedTimelineEvent[];
  loading?: boolean;
  onViewAllClick?: () => void;
}

export const TelemetryLiveTimeline: React.FC<TelemetryLiveTimelineProps> = ({
  events,
  loading = false,
  onViewAllClick,
}) => {
  // Take top 5 events like SentinelAI Image 3
  const displayEvents = events.slice(0, 5);

  const getStepDotColor = (index: number, severity: string) => {
    if (index === 0) return 'bg-[#EF4444]'; // Red (Threat Detected)
    if (index === 1) return 'bg-[#8B5CF6]'; // Purple (AI Investigation)
    if (index === 2) return 'bg-[#F97316]'; // Orange (Playbook Started)
    if (index === 3) return 'bg-[#06B6D4]'; // Teal (Threat Contained)
    return 'bg-[#10B981]'; // Green (Resolved)
  };

  const getStepTitle = (index: number, ev: UnifiedTimelineEvent) => {
    if (index === 0) return 'Threat Detected';
    if (index === 1) return 'AI Investigation';
    if (index === 2) return 'Playbook Started';
    if (index === 3) return 'Threat Contained';
    return 'Resolved';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col justify-between h-full">
      {/* ── Header (Exactly like SentinelAI Image 3) ── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
        <h3 className="text-base font-black text-slate-900 tracking-tight">
          Live Timeline
        </h3>
        <button
          onClick={onViewAllClick}
          className="text-xs font-black text-[#FF5B37] hover:underline flex items-center gap-1"
        >
          <span>View All</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* ── Step-by-Step Vertical Connected Timeline ── */}
      <div className="relative flex-1 py-1">
        {/* Continuous Thin Vertical Line */}
        <div className="absolute left-[5px] top-3 bottom-6 w-[2px] bg-slate-100" />

        <div className="space-y-6 relative z-10">
          {displayEvents.map((ev, i) => {
            const dotColor = getStepDotColor(i, ev.severity);
            const stepTitle = getStepTitle(i, ev);

            return (
              <div key={ev.id || i} className="flex items-start gap-3 pl-0 group">
                {/* Dot Node */}
                <div className="mt-1 flex items-center justify-center shrink-0">
                  <span className={`w-2.5 h-2.5 rounded-full ${dotColor} ring-4 ring-white shadow-2xs`} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black text-slate-900 leading-tight">
                    {stepTitle}
                  </p>
                  <p className="text-[11px] text-slate-600 font-medium leading-snug mt-0.5 truncate">
                    {ev.title}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {new Date(ev.timestamp).toLocaleTimeString('ms-MY', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
