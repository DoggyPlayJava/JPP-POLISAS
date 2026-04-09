import React from 'react';
import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';
import { useExcoTheme } from '@/contexts/ExcoThemeContext';
import { hexToRgba } from '@/lib/utils';


function ComingSoonPage({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  const { color } = useExcoTheme();
  return (
    <div className="min-h-full flex items-center justify-center p-8 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-sm">
        {/* Icon dalam kotak neutral, border berwarna subtle */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-4xl bg-muted"
          style={{ border: `2px solid ${hexToRgba(color, 0.2)}` }}
        >
          {icon}
        </div>
        <h2 className="text-xl font-black mb-2 text-foreground">{title}</h2>
        <p className="text-sm font-medium leading-relaxed text-muted-foreground">{description}</p>

        {/* Progress bar animasi — warna tema */}
        <div className="mt-8 mx-auto w-32 h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: color }}
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
          />
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
          <Construction className="w-3.5 h-3.5" />
          <span>Sedang dalam pembangunan</span>
        </div>
      </motion.div>
    </div>
  );
}

export function KeusahawananIdea() {
  return <ComingSoonPage icon="💡" title="Cadangan Idea" description="Modul penghantaran dan semakan cadangan idea perniagaan pelajar akan dibina tidak lama lagi." />;
}

export function KeusahawananGeran() {
  return <ComingSoonPage icon="🏆" title="Geran & Hadiah" description="Modul pengurusan permohonan geran dan hadiah untuk program keusahawanan akan tersedia tidak lama lagi." />;
}

export function KeusahawananLaporan() {
  return <ComingSoonPage icon="📊" title="Laporan" description="Sistem jana laporan program dan impak keusahawanan akan tersedia tidak lama lagi." />;
}
