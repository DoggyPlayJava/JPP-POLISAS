import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Server,
  Sparkles,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { cn } from '@/lib/utils';

interface TelemetryQuickMetricsProps {
  data: TelemetryData;
  onViewThreatsClick?: () => void;
  onViewAutomationClick?: () => void;
}

export const TelemetryQuickMetrics: React.FC<TelemetryQuickMetricsProps> = ({
  data,
  onViewThreatsClick,
  onViewAutomationClick,
}) => {
  const { modules, diagnostics } = data;
  const db = diagnostics?.database;
  const keb = diagnostics?.kebajikan;
  const pm = diagnostics?.polymart;
  const pr = diagnostics?.polyrider;
  const ai = diagnostics?.ai;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
      {/* ── Col 1: Top Threats (Last 24h) ── */}
      <div className="space-y-3 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-3">
            <span className="text-slate-900 font-black">Top Threats</span>
            <span className="text-slate-400 font-medium text-[10px]">Last 24h</span>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-700">Credential / SLA</span>
                <span className="text-rose-500 font-mono">91%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full w-[91%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-700">API Abuse / Mart</span>
                <span className="text-[#F97316] font-mono">74%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#F97316] rounded-full w-[74%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-700">Ransomware / SOS</span>
                <span className="text-purple-500 font-mono">35%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full w-[35%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-700">Privilege Escalation</span>
                <span className="text-slate-400 font-mono">22%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-slate-400 rounded-full w-[22%]" />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onViewThreatsClick}
          className="text-left text-xs font-black text-[#FF5B37] hover:underline flex items-center gap-1 pt-2"
        >
          <span>View all Threats</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* ── Col 2: Infrastructure (• All healthy) ── */}
      <div className="space-y-3 pt-4 md:pt-0 md:pl-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-3">
            <span className="text-slate-900 font-black">Infrastructure</span>
            <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              All healthy
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-700">Cloud Services</span>
                <span className="text-slate-600 font-mono">99%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[99%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-700">Endpoints</span>
                <span className="text-slate-600 font-mono">99%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[99%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-700">Servers (API)</span>
                <span className="text-slate-600 font-mono">99%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[99%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] font-bold mb-1">
                <span className="text-slate-700">Databases (PostgreSQL)</span>
                <span className="text-[#F97316] font-mono">94%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#F97316] rounded-full w-[94%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-bold text-slate-500">Overall Uptime</span>
          <span className="text-sm font-black text-emerald-600 font-mono">99.6%</span>
        </div>
      </div>

      {/* ── Col 3: AI Insights (Today) ── */}
      <div className="space-y-3 pt-4 md:pt-0 md:pl-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-3">
            <span className="text-slate-900 font-black">AI Insights</span>
            <span className="text-slate-400 font-medium text-[10px]">Today</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-0.5 border-b border-slate-50">
              <span className="text-slate-600">Threats detected by AI</span>
              <span className="font-black text-slate-900 font-mono">67%</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-50">
              <span className="text-slate-600">False-positives reduced</span>
              <span className="font-black text-slate-900 font-mono">43%</span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-50">
              <span className="text-slate-600">Mean time to detect</span>
              <span className="font-black text-slate-900 font-mono">18s</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-600">Risk reduced</span>
              <span className="font-black text-emerald-600 font-mono">32%</span>
            </div>
          </div>
        </div>

        {/* Green pill callout like SentinelAI */}
        <div className="p-2 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[10px] text-emerald-800 font-medium flex items-center gap-1.5 mt-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">AI: Semak tiket SLA tertunggak di e-Kebajikan</span>
        </div>
      </div>

      {/* ── Col 4: Automation (• Active) ── */}
      <div className="space-y-3 pt-4 md:pt-0 md:pl-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-900 font-black">Automation</span>
            <span className="text-emerald-600 font-bold text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div>
              <span className="text-3xl font-black text-slate-900 tabular-nums">152</span>
              <p className="text-[10px] font-bold text-slate-400 mt-0.5">Playbooks Executed</p>
            </div>

            {/* Circular Gauge 94% (Exact SVG match) */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500"
                  strokeDasharray="94, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-[11px] font-black text-slate-800">94%</span>
              </div>
            </div>
          </div>

          <div className="mt-3 space-y-1 text-[10px] font-bold text-slate-500">
            <div className="flex justify-between">
              <span>Avg Response Time:</span>
              <span className="text-slate-700 font-mono">22s</span>
            </div>
            <div className="flex justify-between">
              <span>Automation Coverage:</span>
              <span className="text-slate-700 font-mono">94%</span>
            </div>
          </div>
        </div>

        <button
          onClick={onViewAutomationClick}
          className="text-left text-xs font-black text-[#FF5B37] hover:underline flex items-center gap-1 pt-2"
        >
          <span>View automation activity</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
