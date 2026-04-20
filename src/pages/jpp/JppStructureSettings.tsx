import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { Network, Plus, Trash2, Save, Undo } from 'lucide-react';
import { JPP_POSITION_LABELS, JPP_UNIT_LABELS } from '@/types';
import { UNIT_CFG, UNIT_ORDER } from './jppConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function JppStructureSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State for visual overrides
    const [positionLabels, setPositionLabels] = useState<Record<string, string>>({});
    const [unitConfig, setUnitConfig] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data } = await supabase.from('system_settings').select('*').in('key', ['jpp_position_labels', 'jpp_unit_cfg']);
            
            // Extract from DB, or fallback to static constants
            const rawPosLabels = data?.find(d => d.key === 'jpp_position_labels')?.value;
            const parsedPosLabels = rawPosLabels ? (typeof rawPosLabels === 'string' ? JSON.parse(rawPosLabels) : rawPosLabels) : null;
            setPositionLabels(parsedPosLabels || { ...JPP_POSITION_LABELS });

            const rawUnitCfg = data?.find(d => d.key === 'jpp_unit_cfg')?.value;
            const parsedUnitCfg = rawUnitCfg ? (typeof rawUnitCfg === 'string' ? JSON.parse(rawUnitCfg) : rawUnitCfg) : null;
            setUnitConfig(parsedUnitCfg || { ...UNIT_CFG });

        } catch (error) {
            console.error("Error fetching JPP structure config", error);
            toast.error("Gagal memuatkan konfigurasi struktur JPP");
        } finally {
            setLoading(false);
        }
    };

    const handlePosChange = (key: string, newValue: string) => {
        setPositionLabels(prev => ({ ...prev, [key]: newValue }));
    };

    const handleUnitChange = (key: string, field: string, newValue: string) => {
        setUnitConfig(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: newValue
            }
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        const toastId = toast.loading('Menyimpan perubahan struktur...');
        try {
            // Update position labels
            await supabase.from('system_settings').upsert({
                key: 'jpp_position_labels',
                value: positionLabels
            });

            // Clean up unitConfig to ONLY save text-based overrides, NOT React Component functions (like icon)
            const cleanUnitConfig = Object.entries(unitConfig).reduce((acc, [key, val]) => {
                acc[key] = { shortLabel: val.shortLabel, fullLabel: val.fullLabel };
                return acc;
            }, {} as Record<string, any>);

            await supabase.from('system_settings').upsert({
                key: 'jpp_unit_cfg',
                value: cleanUnitConfig
            });

            toast.success('Struktur JPP berjaya dikemaskini. Sila refresh halaman bagi melihat perubahan pada visual.', { id: toastId });
        } catch (error: any) {
            toast.error(error.message || 'Gagal menyimpan perubahan.', { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (confirm("Adakah anda pasti mahu set semula (reset) nama Exco dan Jawatan kepada asal?")) {
            setPositionLabels({ ...JPP_POSITION_LABELS });
            setUnitConfig({ ...UNIT_CFG });
        }
    };

    if (loading) return null;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="space-y-6">
            <div className="flex justify-between items-end px-2">
                <div className="flex items-center gap-3">
                    <Network className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-white/40">Urus Struktur JPP/Exco</h3>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleReset} variant="outline" size="sm" className="h-8 text-[10px] uppercase tracking-widest border-white/10 text-white/50 hover:bg-white/5 disabled:opacity-50">
                        <Undo className="w-3 h-3 mr-1.5" />
                        Reset
                    </Button>
                    <Button onClick={handleSave} disabled={saving} size="sm" className="h-8 text-[10px] uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg disabled:opacity-50">
                        {saving ? 'Menyimpan...' : (
                            <><Save className="w-3 h-3 mr-1.5" /> Simpan</>
                        )}
                    </Button>
                </div>
            </div>

            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-900/10 to-indigo-900/5 border border-indigo-500/20 space-y-8 group hover:from-indigo-900/15 transition-all">
                
                {/* Bahagian Jawatan (Majlis Tertinggi & Umum) */}
                <div className="space-y-3">
                    <h4 className="text-sm font-black text-white">Label Jawatan Majlis Tertinggi</h4>
                    <p className="text-[11px] text-indigo-400/60 font-medium leading-relaxed mb-4">
                        Ubah suai nama jawatan. Nilai ini hanya mengubah paparan (visual override) di dalam sistem, manakala kod pangkalan data tidak diganggu.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(positionLabels).map(([key, label]) => (
                            <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400/70 block w-full truncate">
                                    {key}
                                </label>
                                <Input
                                    value={label}
                                    onChange={(e) => handlePosChange(key, e.target.value)}
                                    className="h-9 bg-black/30 border-white/5 text-xs text-white"
                                    placeholder="Nama Jawatan..."
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="h-px bg-indigo-500/10 w-full" />

                {/* Bahagian Unit Exco */}
                <div className="space-y-3">
                    <h4 className="text-sm font-black text-white">Nama Exco/Unit</h4>
                    <p className="text-[11px] text-indigo-400/60 font-medium leading-relaxed mb-4">
                        Ubah suai nama kepimpinan Exco. Nilai pendek (Short Label) digunakan pada menu dan butang, manakala nilai penuh (Full Label) dipaparkan di Kad dan Laporan.
                    </p>
                    
                    <div className="space-y-3">
                        {UNIT_ORDER.map((code) => {
                            const currentCfg = unitConfig[code] || {};
                            return (
                                <div key={code} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-end">
                                    <div className="w-full md:w-32 shrink-0">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-indigo-400/70 block mb-1">Kod Unit DB</label>
                                        <div className="h-9 flex items-center px-3 bg-black/40 border border-white/5 rounded-xl text-xs font-mono text-white/50 truncate">
                                            {code}
                                        </div>
                                    </div>
                                    <div className="w-full">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/50 block mb-1">Nama Pendek (Singkatan)</label>
                                        <Input
                                            value={currentCfg.shortLabel || ''}
                                            onChange={(e) => handleUnitChange(code, 'shortLabel', e.target.value)}
                                            className="h-9 bg-black/30 border-white/5 text-xs text-white"
                                            placeholder="Nama Pendek..."
                                        />
                                    </div>
                                    <div className="w-full md:w-[40%]">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-white/50 block mb-1">Nama Penuh (Rasmi)</label>
                                        <Input
                                            value={currentCfg.fullLabel || ''}
                                            onChange={(e) => handleUnitChange(code, 'fullLabel', e.target.value)}
                                            className="h-9 bg-black/30 border-white/5 text-xs text-white"
                                            placeholder="Nama Penuh Exco..."
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </motion.div>
    );
}
