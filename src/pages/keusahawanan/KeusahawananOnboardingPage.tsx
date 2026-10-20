import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Building2,
  Store,
  User,
  Tag,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function KeusahawananOnboardingPage() {
  const { t } = useTranslation(['keusahawanan', 'common']);
  const [businessName, setBusinessName] = useState('');
  const [ownerMatric, setOwnerMatric] = useState('');
  const [businessCategory, setBusinessCategory] = useState(t('keusahawanan:category_food_beverage', 'Makanan & Minuman'));
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessName && ownerMatric) {
      setSubmitted(true);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border/20 pb-4 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
          <Store className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-wider">
            {t('module_title')}
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-foreground tracking-tight">
          {t('business_onboarding')}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
          {t('module_subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Registration Form */}
        <div className="md:col-span-2 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-500" />
                {t('business_name')}
              </label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="cth: Polisas Cafe Corner"
                className="h-12 rounded-2xl bg-muted/30 border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                {t('owner_matric')}
              </label>
              <Input
                value={ownerMatric}
                onChange={(e) => setOwnerMatric(e.target.value)}
                placeholder="cth: 04DAT22F1001"
                className="h-12 rounded-2xl bg-muted/30 border-border"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-500" />
                {t('business_category')}
              </label>
              <select
                value={businessCategory}
                onChange={(e) => setBusinessCategory(e.target.value)}
                className="w-full h-12 rounded-2xl bg-muted/30 border border-border px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value={t('keusahawanan:category_food_beverage', 'Makanan & Minuman')}>{t('keusahawanan:category_food_beverage', 'Makanan & Minuman')}</option>
                <option value={t('keusahawanan:category_services_printing', 'Perkhidmatan & Percetakan')}>{t('keusahawanan:category_services_printing', 'Perkhidmatan & Percetakan')}</option>
                <option value={t('keusahawanan:category_clothing_accessories', 'Pakaian & Aksesori')}>{t('keusahawanan:category_clothing_accessories', 'Pakaian & Aksesori')}</option>
                <option value={t('keusahawanan:category_digital_it', 'Digital & Barangan IT')}>{t('keusahawanan:category_digital_it', 'Digital & Barangan IT')}</option>
              </select>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-xs rounded-2xl gap-2 mt-4 shadow-lg shadow-emerald-600/25"
            >
              <span>{t('register_business')}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </div>

        {/* Status Card & Overview */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl border border-border bg-card shadow-sm space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              {t('approval_status')}
            </h3>

            {submitted ? (
              <div className="space-y-3">
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-amber-700 dark:text-amber-300">
                  <Clock className="w-5 h-5 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-xs font-black uppercase">{t('keusahawanan:onboarding_status_under_review', 'Dalam Pertimbangan')}</p>
                    <p className="text-[10px] opacity-80">{t('keusahawanan:onboarding_status_waiting_interview', 'Menunggu temuduga Exco')}</p>
                  </div>
                </div>

                <div className="text-xs space-y-1.5 pt-2 border-t border-border/20">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('keusahawanan:onboarding_business_label', 'Bisnes:')}</span>
                    <span className="font-bold text-foreground">{businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('keusahawanan:onboarding_matric_label', 'Matrik:')}</span>
                    <span className="font-mono text-foreground">{ownerMatric}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('keusahawanan:onboarding_sector_label', 'Sektor:')}</span>
                    <span className="text-foreground">{businessCategory}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                <p className="text-xs font-bold text-muted-foreground">
                  {t('keusahawanan:onboarding_no_active_app', 'Belum ada permohonan aktif.')}
                </p>
                <p className="text-[10px] text-muted-foreground/70">
                  {t('keusahawanan:onboarding_fill_form_desc', 'Isi borang di sebelah untuk memulakan perniagaan rasmi di POLISAS.')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KeusahawananOnboardingPage;
