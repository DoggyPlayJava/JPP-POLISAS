import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calculator, Plus, Minus, FileText, Zap, Droplets, Wifi, RefreshCw, Home } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PolyRentCalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
  const [tenants, setTenants] = useState(2);
  
  const [rent, setRent] = useState<number | ''>('');
  const [electric, setElectric] = useState<number | ''>('');
  const [water, setWater] = useState<number | ''>('');
  const [wifi, setWifi] = useState<number | ''>('');
  const [others, setOthers] = useState<number | ''>('');

  const total = (Number(rent) || 0) + (Number(electric) || 0) + (Number(water) || 0) + (Number(wifi) || 0) + (Number(others) || 0);
  const perPerson = total / tenants;

  const handleReset = () => {
    setRent('');
    setElectric('');
    setWater('');
    setWifi('');
    setOthers('');
    setTenants(2);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex flex-col justify-end items-center sm:p-4"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full h-[85dvh] max-w-md bg-white dark:bg-slate-950 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden relative"
          >
            {/* Header */}
            <div className="flex flex-col border-b border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900 shrink-0 p-6 pb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <Calculator className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Kalkulator Bil</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Kira Pecahan Ahli Rumah</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Ahli Rumah */}
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 block">Jumlah Ahli Rumah</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Berapa orang yang berkongsi bayar?</span>
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-800 px-2 py-1 rounded-full shadow-sm border border-slate-200 dark:border-white/5">
                    <button 
                      onClick={() => setTenants(prev => Math.max(1, prev - 1))}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-lg font-black text-slate-900 dark:text-white w-6 text-center">{tenants}</span>
                    <button 
                      onClick={() => setTenants(prev => Math.min(20, prev + 1))}
                      className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Bil Inputs */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Masukkan Jumlah Bil (Bulan Ini)</label>
                
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/10 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <Home className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Sewa Rumah</label>
                      <div className="flex items-center text-slate-900 dark:text-white font-bold">
                        RM <input type="number" value={rent} onChange={e => setRent(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" className="w-full bg-transparent border-none p-0 ml-1 focus:ring-0 text-lg placeholder:text-slate-300 dark:placeholder:text-slate-700" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/10 focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Elektrik (TNB)</label>
                      <div className="flex items-center text-slate-900 dark:text-white font-bold">
                        RM <input type="number" value={electric} onChange={e => setElectric(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" className="w-full bg-transparent border-none p-0 ml-1 focus:ring-0 text-lg placeholder:text-slate-300 dark:placeholder:text-slate-700" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/10 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <Droplets className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Air (PAIP)</label>
                      <div className="flex items-center text-slate-900 dark:text-white font-bold">
                        RM <input type="number" value={water} onChange={e => setWater(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" className="w-full bg-transparent border-none p-0 ml-1 focus:ring-0 text-lg placeholder:text-slate-300 dark:placeholder:text-slate-700" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/10 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400">
                      <Wifi className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Internet / WiFi</label>
                      <div className="flex items-center text-slate-900 dark:text-white font-bold">
                        RM <input type="number" value={wifi} onChange={e => setWifi(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" className="w-full bg-transparent border-none p-0 ml-1 focus:ring-0 text-lg placeholder:text-slate-300 dark:placeholder:text-slate-700" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-white/10 focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Lain-lain / Utiliti</label>
                      <div className="flex items-center text-slate-900 dark:text-white font-bold">
                        RM <input type="number" value={others} onChange={e => setOthers(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" className="w-full bg-transparent border-none p-0 ml-1 focus:ring-0 text-lg placeholder:text-slate-300 dark:placeholder:text-slate-700" />
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              
              <button 
                onClick={handleReset}
                className="w-full py-3 flex items-center justify-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Reset Borang
              </button>

            </div>

            {/* Bottom Floating Result */}
            <div className="bg-indigo-600 p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(79,70,229,0.3)]">
              <div className="flex justify-between items-end mb-4 text-indigo-100">
                <div>
                  <p className="text-xs font-medium opacity-80">Jumlah Keseluruhan</p>
                  <p className="text-lg font-bold">RM {total.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">Seorang Perlu Bayar</p>
                  <p className="text-4xl font-black text-white">RM {perPerson.toFixed(2)}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  const msg = `*[ REKOD BIL RUMAH SEWA ]*\n\nSewa Rumah   : RM ${Number(rent||0).toFixed(2)}\nElektrik TNB : RM ${Number(electric||0).toFixed(2)}\nAir (PAIP)   : RM ${Number(water||0).toFixed(2)}\nInternet     : RM ${Number(wifi||0).toFixed(2)}\nLain-lain    : RM ${Number(others||0).toFixed(2)}\n-----------------------------------\nJUMLAH KESELURUHAN : RM ${total.toFixed(2)}\n-----------------------------------\n\n*SEORANG PERLU BAYAR : RM ${perPerson.toFixed(2)}*\n_(Dibahagikan kepada ${tenants} orang)_\n\nSila buat bayaran dengan segera. Terima kasih!`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                }}
                className="w-full py-3.5 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-lg"
              >
                Kongsi ke Group WhatsApp
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
