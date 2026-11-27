import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, LogOut, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export function RejectedPage() {
  const { t } = useTranslation(['portal', 'common']);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleTryAgain = async () => {
    setIsDeleting(true);
    const toastId = toast.loading(t('portal:deleting_old_record', 'Menghapuskan rekod lama...'));

    try {
      // 1. Panggil fungsi SQL untuk padam akaun dari sistem
      const { error } = await supabase.rpc('delete_own_user');
      if (error) throw error;

      // 2. Log keluar secara rasmi
      await supabase.auth.signOut();

      toast.success(t('portal:record_cleared_re_register', 'Rekod dibersihkan. Sila daftar semula.'), { id: toastId });
      
      // 3. Paksa refresh ke login
      window.location.href = '/login';
    } catch (error: any) {
      console.error(error);
      toast.error(t('common:error_with_details', 'Ralat: {{message}}', { message: error.message }), { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    // Gunakan 'fixed' supaya dia tutup seluruh skrin dan tak terikut layout lain
    <div className="fixed inset-0 z-[9999] min-h-[100dvh] bg-background flex items-center justify-center px-5 pb-6 pt-[calc(1.5rem+var(--sat,env(safe-area-inset-top,0px)))]">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md"
      >
        <Card className="border border-border shadow-surface-lg rounded-[2rem] overflow-hidden bg-card">
          <div className="h-2 w-full bg-rose-500" />
          <CardContent className="p-8 sm:p-10 flex flex-col items-center text-center">
            
            {/* ICON SECTION */}
            <div className="w-20 h-20 rounded-2xl bg-rose-500/12 border border-rose-500/25 flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
            </div>
            
            {/* TEXT SECTION */}
            <div className="space-y-2.5 mb-6">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                {t('portal:application_rejected_title', 'Permohonan Ditolak')}
              </h1>
              <p className="text-muted-foreground font-medium text-sm leading-relaxed px-2">
                {t('portal:application_rejected_desc', 'Maaf, permohonan anda tidak diluluskan oleh pentadbir JPP Polisas buat masa ini.')}
              </p>
            </div>

            {/* MESSAGE BOX */}
            <div className="bg-rose-500/10 border border-rose-500/25 p-4 rounded-2xl flex gap-3.5 text-left mb-8">
              <MessageSquare className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-900 dark:text-rose-200 font-semibold leading-relaxed">
                {t('portal:rejected_action_notice', 'Anda perlu memadam akaun ini dan mendaftar semula dengan maklumat yang betul atau hubungi pihak JPP untuk rayuan.')}
              </p>
            </div>

            {/* ACTION BUTTON */}
            <Button 
              onClick={handleTryAgain} 
              disabled={isDeleting}
              className="w-full rounded-xl font-bold uppercase tracking-wider text-xs h-12 bg-rose-600 hover:bg-rose-700 text-white shadow-surface-sm"
            >
              {isDeleting ? t('common:processing', 'Memproses...') : (
                <>
                  <LogOut className="w-4 h-4 mr-2" /> {t('portal:logout_and_retry', 'Log Keluar & Cuba Lagi')}
                </>
              )}
            </Button>
            
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
export default RejectedPage;
