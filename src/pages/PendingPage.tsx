import React from 'react';
import { motion } from 'framer-motion';
import { Hourglass, LogOut, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export function PendingPage() {
  const { t } = useTranslation(['portal', 'common']);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4 pb-8 pt-[calc(1rem+var(--sat,env(safe-area-inset-top,0px)))]">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }} className="w-full max-w-md">
        <Card className="w-full border border-border shadow-surface-lg rounded-[2rem] overflow-hidden bg-card">
          <div className="h-2 w-full bg-gradient-to-r from-amber-500 to-orange-500" />
          <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Hourglass className="w-10 h-10 text-amber-600 dark:text-amber-400" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                {t('portal:pending_approval_title', 'Menunggu Kelulusan')}
              </h1>
              <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                {t('portal:pending_approval_desc_p1', 'Akaun anda telah berjaya didaftarkan, tetapi ia')}{' '}
                <strong className="text-foreground">{t('portal:requires_verification', 'memerlukan pengesahan')}</strong>{' '}
                {t('portal:pending_approval_desc_p2', 'daripada pihak pentadbir sebelum anda boleh mengakses portal JPP POLISAS.')}
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-2xl flex gap-3 text-left">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold leading-relaxed">
                {t('portal:pending_approval_alert', 'Sila maklumkan kepada Presiden Kelab atau pihak JPP untuk meluluskan permohonan pendaftaran anda.')}
              </p>
            </div>

            <Button onClick={handleLogout} variant="outline" className="w-full rounded-xl font-bold uppercase tracking-wider text-xs h-11">
              <LogOut className="w-4 h-4 mr-2" /> {t('portal:logout_btn', 'Log Keluar')}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
export default PendingPage;
