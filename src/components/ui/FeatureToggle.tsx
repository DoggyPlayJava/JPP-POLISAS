import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeatureToggleProps {
  moduleId: string;
  label?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function FeatureToggle({ moduleId, label, description, icon }: FeatureToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [moduleId]);

  const fetchStatus = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('portal_settings')
      .select('is_enabled')
      .eq('exco_module', moduleId)
      .maybeSingle();
      
    if (data && data.is_enabled !== null) {
      setIsEnabled(data.is_enabled);
    } else {
      // Default to true if no row or null
      setIsEnabled(true);
    }
    setLoading(false);
  };

  const toggleStatus = async () => {
    if (toggling) return;
    setToggling(true);
    const newVal = !isEnabled;
    const toastId = toast.loading('Mengemaskini status...');
    
    try {
      const { data, error } = await supabase
        .from('portal_settings')
        .update({ is_enabled: newVal })
        .eq('exco_module', moduleId)
        .select();

      if (error) throw error;
      
      // If no row exists, we should insert it.
      if (!data || data.length === 0) {
         const { error: insErr } = await supabase
           .from('portal_settings')
           .insert({ 
             exco_module: moduleId, 
             is_enabled: newVal, 
             label: label || moduleId,
             color: '#6366f1' // Default color to satisfy NOT NULL constraint
           });
         if (insErr) throw insErr;
      }
      
      setIsEnabled(newVal);
      toast.success(`${label || moduleId} kini ${newVal ? 'DIBUKA' : 'DITUTUP'}`, { id: toastId });
    } catch (e: any) {
      toast.error(e.message || 'Gagal kemaskini status', { id: toastId });
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-16 bg-white/5 rounded-xl"></div>;
  }

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 text-white/70">
            {icon}
          </div>
        )}
        <div>
          <h4 className="font-bold text-white text-sm">{label || moduleId}</h4>
          {description && <p className="text-xs text-white/50 mt-0.5 max-w-[200px] sm:max-w-xs leading-relaxed">{description}</p>}
        </div>
      </div>
      
      <button
        onClick={toggleStatus}
        disabled={toggling}
        className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
            isEnabled ? "bg-emerald-500" : "bg-white/10"
        )}
      >
        <span className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center",
            isEnabled ? "translate-x-2.5" : "-translate-x-2.5"
        )}>
          {toggling && <Loader2 className="w-3 h-3 text-slate-800 animate-spin" />}
        </span>
      </button>
    </div>
  );
}
