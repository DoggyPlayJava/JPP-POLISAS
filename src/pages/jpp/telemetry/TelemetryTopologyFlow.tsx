import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Shield,
  User,
  Cloud,
  LayoutGrid,
  Lock,
  Database,
  Layers,
} from 'lucide-react';
import { TelemetryData } from './telemetryTypes';
import { cn } from '@/lib/utils';

interface TelemetryTopologyFlowProps {
  data: TelemetryData;
}

export const TelemetryTopologyFlow: React.FC<TelemetryTopologyFlowProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'flow' | 'traffic' | 'heatmap'>('flow');

  const { server, modules, diagnostics } = data;
  const db = diagnostics?.database;
  const keb = diagnostics?.kebajikan;
  const pm = diagnostics?.polymart;
  const pr = diagnostics?.polyrider;
  const ai = diagnostics?.ai;

  const heapPct = server?.memory?.heap_total_mb
    ? Math.round((server.memory.heap_used_mb / server.memory.heap_total_mb) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 flex flex-col justify-between">
      {/* ── Header & View Toggles (Exactly like SentinelAI Image 3) ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-base font-black text-slate-900 tracking-tight">
            Threat Overview
          </h3>
          <p className="text-[11px] font-bold text-slate-400">Live AI Network</p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-50 border border-slate-200/70">
          {(
            [
              { id: 'flow', label: 'Flow View' },
              { id: 'traffic', label: 'Traffic' },
              { id: 'heatmap', label: 'Risk Heatmap' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold transition-all',
                viewMode === tab.id
                  ? 'bg-[#FFEDE7] text-[#FF5B37] font-black shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── View 1: Flow View (Fluid Bezier Node Network) ── */}
      {viewMode === 'flow' && (
        <div className="relative py-6 my-2">
          {/* SVG Connecting Bezier Paths */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 760 210">
              <defs>
                <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#CBD5E1" />
                  <stop offset="35%" stopColor="#F97316" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#10B981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#CBD5E1" />
                </linearGradient>
              </defs>

              {/* Node 1 -> Node 2 */}
              <path
                d="M 85 105 C 130 105, 150 105, 195 105"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.5"
                strokeDasharray="4 4"
              />

              {/* Node 2 -> Node 3 */}
              <path
                d="M 235 105 C 280 105, 300 105, 345 105"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2.5"
              />

              {/* Node 3 -> Split into Node 4a (Top) & Node 4b (Bottom) */}
              <path
                d="M 385 105 C 430 105, 450 60, 500 60"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2"
              />
              <path
                d="M 385 105 C 430 105, 450 150, 500 150"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2"
              />

              {/* Node 4a (Top) & Node 4b (Bottom) -> Converge into Node 5 */}
              <path
                d="M 540 60 C 590 60, 610 105, 655 105"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2"
              />
              <path
                d="M 540 150 C 590 150, 610 105, 655 105"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Floating Pill Badges */}
          {/* Badge Above Node 2 (Firewall/Node.js) */}
          <div className="absolute left-[20%] top-2 transform -translate-x-1/2 z-20">
            <div className="px-2.5 py-1 rounded-xl bg-[#FFF5F2] border border-[#FFCCBE] text-[10px] font-black text-[#EA580C] shadow-2xs flex flex-col items-center leading-tight">
              <span>{heapPct > 80 ? 'Memory Spike' : 'Node Engine'}</span>
              <span className="text-[8px] font-medium text-slate-500">Heap {heapPct}%</span>
            </div>
          </div>

          {/* Badge Above Node 4a (Cloud Services) */}
          <div className="absolute left-[68%] top-1 transform -translate-x-1/2 z-20">
            <div className="px-2.5 py-1 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[10px] font-black text-emerald-700 shadow-2xs flex flex-col items-center leading-tight">
              <span>AI Containment</span>
              <span className="text-[8px] font-medium text-emerald-600/80">Auto-Effective</span>
            </div>
          </div>

          {/* ── 5 Nodes Row ── */}
          <div className="relative z-10 flex items-center justify-between px-2 sm:px-6">
            {/* Node 1: Internet */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-slate-600 hover:scale-105 transition-transform">
                <Globe className="w-5 h-5 text-slate-500" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">Internet</span>
              <span className="text-[10px] text-slate-400 font-medium">
                {(modules.profiles || 0).toLocaleString()} events
              </span>
            </div>

            {/* Node 2: Firewall */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-slate-600 hover:scale-105 transition-transform">
                <Shield className="w-5 h-5 text-slate-500" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">Firewall</span>
              <span className="text-[10px] text-slate-400 font-medium">API Server</span>
            </div>

            {/* Node 3: Identity */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-slate-600 hover:scale-105 transition-transform">
                <User className="w-5 h-5 text-slate-500" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">Identity</span>
              <span className="text-[10px] text-slate-400 font-medium">Auth Shield</span>
            </div>

            {/* Branching Column: Cloud Services (Top) + Applications (Bottom) */}
            <div className="flex flex-col items-center gap-7">
              {/* Node 4a: Cloud Services */}
              <div className="flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-slate-600 hover:scale-105 transition-transform">
                  <Cloud className="w-5 h-5 text-slate-500" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-1">Cloud Services</span>
                <span className="text-[9px] text-emerald-600 font-medium">Healthy</span>
              </div>

              {/* Node 4b: Applications */}
              <div className="flex flex-col items-center text-center">
                <div className="w-11 h-11 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-slate-600 hover:scale-105 transition-transform">
                  <LayoutGrid className="w-5 h-5 text-slate-500" />
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-1">Applications</span>
                <span className="text-[9px] text-emerald-600 font-medium">Healthy</span>
              </div>
            </div>

            {/* Node 5: Critical Assets (Database) */}
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-slate-600 hover:scale-105 transition-transform">
                <Lock className="w-5 h-5 text-slate-500" />
              </div>
              <span className="text-xs font-bold text-slate-800 mt-2">Critical Assets</span>
              <span className="text-[10px] text-emerald-600 font-medium">Protected</span>
            </div>
          </div>

          {/* ── Bottom Legend (Exactly like SentinelAI) ── */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-3 text-[11px] font-medium text-slate-500 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Healthy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
              Threat Flow
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Critical
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-500" />
              AI Containment
            </span>
          </div>
        </div>
      )}

      {/* ── View 2: Traffic View ── */}
      {viewMode === 'traffic' && (
        <div className="py-4 space-y-3">
          {[
            { label: 'Pesanan PolyMart', count: modules.polymart_orders || 0, max: 200, color: 'bg-pink-500' },
            { label: 'Trip PolyRider', count: modules.polyrider_jobs || 0, max: 200, color: 'bg-cyan-500' },
            { label: 'Tiket e-Kebajikan', count: modules.kebajikan_tickets || 0, max: 100, color: 'bg-rose-500' },
            { label: 'Token AI Assistant', count: modules.ai_tokens_used || 0, max: modules.ai_token_limit || 1000000, color: 'bg-purple-500' },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>{item.label}</span>
                <span className="font-mono">{item.count.toLocaleString()}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', item.color)}
                  style={{ width: `${Math.min((item.count / item.max) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── View 3: Heatmap ── */}
      {viewMode === 'heatmap' && (
        <div className="py-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { name: 'Node.js Engine', status: 'Healthy', color: 'text-emerald-600 bg-emerald-50' },
            { name: 'PostgreSQL Pool', status: 'Healthy', color: 'text-emerald-600 bg-emerald-50' },
            { name: 'WAL Watchdog', status: 'Optimal', color: 'text-emerald-600 bg-emerald-50' },
            { name: 'PolyMart Orders', status: (pm?.pending_stale || 0) > 0 ? 'Warning' : 'Healthy', color: (pm?.pending_stale || 0) > 0 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50' },
            { name: 'PolyRider SOS', status: (pr?.stuck_emergency || 0) > 0 ? 'Critical' : 'Healthy', color: (pr?.stuck_emergency || 0) > 0 ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50' },
            { name: 'e-Kebajikan SLA', status: (keb?.sla_breached || 0) > 0 ? 'Warning' : 'Healthy', color: (keb?.sla_breached || 0) > 0 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50' },
          ].map((item, idx) => (
            <div key={idx} className={cn('p-3 rounded-xl border border-slate-200/80', item.color)}>
              <span className="text-xs font-bold block">{item.name}</span>
              <span className="text-[10px] font-black uppercase mt-1 block">{item.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
