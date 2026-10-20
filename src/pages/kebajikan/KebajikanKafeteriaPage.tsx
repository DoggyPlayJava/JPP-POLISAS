import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  UtensilsCrossed,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CafeteriaAudit {
  id: string;
  name: string;
  location: string;
  hygieneGrade: 'A' | 'B' | 'C';
  priceCheckStatus: 'COMPLIANT' | 'WARNING';
  lastInspection: string;
}

export function KebajikanKafeteriaPage() {
  const { t } = useTranslation(['kebajikan', 'common']);
  const [searchTerm, setSearchTerm] = useState('');

  const audits: CafeteriaAudit[] = [
    {
      id: '1',
      name: t('kebajikan:cafe_kamsis_a', 'Kafeteria Utama Kamsis A'),
      location: t('kebajikan:block_siswa_a', 'Blok Siswa A'),
      hygieneGrade: 'A',
      priceCheckStatus: 'COMPLIANT',
      lastInspection: '12 Okt 2026',
    },
    {
      id: '2',
      name: t('kebajikan:cafe_kamsis_b', 'Kafeteria Siswi Kamsis B'),
      location: t('kebajikan:block_siswi_b', 'Blok Siswi B'),
      hygieneGrade: 'A',
      priceCheckStatus: 'COMPLIANT',
      lastInspection: '14 Okt 2026',
    },
    {
      id: '3',
      name: t('kebajikan:cafe_jke_kiosk', 'Kiosk Kafeteria Fakulti Kejuruteraan'),
      location: t('kebajikan:complex_jke', 'Kompleks JKE'),
      hygieneGrade: 'B',
      priceCheckStatus: 'WARNING',
      lastInspection: '08 Okt 2026',
    },
  ];

  const filtered = audits.filter(
    (a) =>
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-1">
            <UtensilsCrossed className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">
              {t('module_title')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {t('cafeteria_audits')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('module_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-500/10 px-3 py-1.5 rounded-full border border-teal-500/20">
            {t('ticket_category_cafeteria')}
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('kebajikan:search_cafe_placeholder', 'Cari kafeteria atau lokasi...')}
          className="pl-10 h-11 rounded-2xl bg-muted/30 border-border"
        />
      </div>

      {/* Audit Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((audit) => (
          <div
            key={audit.id}
            className="p-5 rounded-3xl border border-border bg-card hover:border-teal-500/40 hover:shadow-lg transition-all space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-foreground">{audit.name}</h3>
                <p className="text-xs text-muted-foreground">{audit.location}</p>
              </div>
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${
                  audit.hygieneGrade === 'A'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}
              >
                {t('kebajikan:grade_prefix', 'Gred')} {audit.hygieneGrade}
              </span>
            </div>

            <div className="text-xs space-y-1 pt-2 border-t border-border/20">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('kebajikan:menu_price_control_label', 'Kawalan Harga Menu:')}</span>
                <span
                  className={`font-bold ${
                    audit.priceCheckStatus === 'COMPLIANT'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {audit.priceCheckStatus === 'COMPLIANT' ? t('kebajikan:price_compliant', 'Mematuhi Had Siling') : t('kebajikan:price_warning', 'Amaran Semakan')}
                </span>
              </div>
              <div className="flex justify-between items-center text-muted-foreground">
                <span>{t('kebajikan:last_inspection_label', 'Pemeriksaan Terakhir:')}</span>
                <span className="font-medium">{audit.lastInspection}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default KebajikanKafeteriaPage;
