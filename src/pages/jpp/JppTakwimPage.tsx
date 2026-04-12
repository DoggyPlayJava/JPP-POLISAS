import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { CalendarDays } from 'lucide-react';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { hexToRgba } from '@/lib/utils';

export function JppTakwimPage() {
    const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);

    useEffect(() => {
        supabase.from('portal_settings').select('color').eq('exco_module', JPP_MODULE_ID).maybeSingle()
            .then(({ data }) => { if (data?.color) setThemeColor(data.color); });
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white py-10 px-6 overflow-x-hidden flex flex-col justify-center items-center">
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] rounded-full blur-[120px] opacity-10"
                    style={{ background: themeColor }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="relative z-10 w-full max-w-2xl"
            >
                <div className="p-16 rounded-[3rem] bg-white/[0.02] border border-white/5 backdrop-blur-sm text-center flex flex-col items-center group hover:bg-white/[0.03] transition-all">
                    
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-orange-500/20 blur-2xl rounded-full" />
                        <div className="w-24 h-24 rounded-[2rem] bg-orange-500/10 border border-orange-500/20 flex flex-col items-center justify-center relative z-10 text-orange-400 group-hover:scale-110 transition-transform duration-500">
                            <CalendarDays className="w-12 h-12" />
                        </div>
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">Takwim Pusat JPP</h1>
                    
                    <p className="text-sm text-white/50 max-w-md leading-relaxed mx-auto mb-10">
                        Modul kalendar global untuk memantau semua program dan aktiviti merentas pelbagai bahagian dan kelab akan dibangunkan sepenuhnya dalam kemas kini sistem fasa seterusnya.
                    </p>

                    <div className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Dalam Pembinaan Aktif</span>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
