import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Search,
  Award,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Sparkles,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const EmsCertVerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const [serialNumber, setSerialNumber] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSerial = serialNumber.trim();
    if (!cleanSerial) {
      toast.error('Sila masukkan nombor siri sijil (cth: CERT-EMS-2026-XXXXX)');
      return;
    }
    navigate(`/ems/cert/${encodeURIComponent(cleanSerial)}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8 pb-28 md:pb-8 flex flex-col justify-between max-w-5xl mx-auto font-sans relative overflow-hidden select-none">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header Nav */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-all hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>


        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Portal Rasmi POLISAS
          </span>
        </div>
      </div>

      {/* Hero Content Box */}
      <div className="relative z-10 my-auto py-12 flex flex-col items-center text-center max-w-2xl mx-auto space-y-8">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-2xl shadow-emerald-500/20">
          <Award className="w-10 h-10" />
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Semakan Ketulenan E-Sijil EMS
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Sahkan Sijil Digital Anda
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-lg mx-auto">
            Masukkan nombor siri sijil rasmi yang tertera pada dokumen E-Sijil JPP-POLISAS anda untuk mengesahkan ketulenan rekod digital.
          </p>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="w-full space-y-4">
          <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              <FileCheck className="w-5 h-5" />
            </div>
            <input
              type="text"
              placeholder="Contoh: CERT-EMS-2026-P1-12345"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full bg-slate-900/90 border-2 border-slate-800 focus:border-emerald-500 rounded-2xl pl-12 pr-4 py-4 text-slate-100 placeholder-slate-500 font-mono text-sm sm:text-base tracking-wider focus:outline-none focus:ring-4 focus:ring-emerald-500/20 transition-all shadow-xl"
            />
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-sm tracking-wide uppercase shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Search className="w-4 h-4 stroke-[3]" />
            Semak Ketulenan Sijil
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </form>

        {/* Features / Notice */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-left w-full">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" /> Pengesahan QR
            </div>
            <p className="text-[11px] text-slate-400">
              Kod QR terimbas secara terus merentasi pengkalan data teragih JPP.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <Lock className="w-4 h-4" /> Integriti Rekod
            </div>
            <p className="text-[11px] text-slate-400">
              Sijil tidak boleh dipalsukan atau diubah selepas status acara diluluskan.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <Award className="w-4 h-4" /> Muat Turun PDF
            </div>
            <p className="text-[11px] text-slate-400">
              Pengesahan serta merta membolehkan cetakan dan muat turun semula PDF.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="relative z-10 text-center text-xs text-slate-500 pt-6 border-t border-slate-900">
        &copy; {new Date().getFullYear()} Jawatankuasa Perwakilan Pelajar (JPP) POLISAS. Hak Cipta Terpelihara.
      </div>
    </div>
  );
};
