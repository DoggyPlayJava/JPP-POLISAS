import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'react-hot-toast';
import { Lock, Eye, EyeOff, KeyRound, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function ResetPasswordPage() {
  const { t } = useTranslation(['portal', 'common']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error(t('portal:password_min_length_error', 'Kata laluan mesti sekurang-kurangnya 6 aksara.'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t('portal:passwords_do_not_match_error', 'Kata laluan dan pengesahan kata laluan tidak sepadan.'));
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast.success(t('portal:password_updated_success', 'Kata laluan berjaya dikemaskini. Sila log masuk.'));
      navigate('/portal');
    } catch (error: any) {
      toast.error(error.message || t('portal:reset_password_failed', 'Gagal menetapkan semula kata laluan.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-[#F8F6EE] dark:bg-[#151D16] text-[#2E3A2F] dark:text-[#F8F6EE] relative overflow-hidden font-sans">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[430px] relative z-10 my-auto"
      >
        {/* Institutional Card Container */}
        <div className="bg-white dark:bg-[#242E25] rounded-3xl p-6 sm:p-8 border border-[#D9C9B2]/80 dark:border-[#3A4A3B] shadow-[0_12px_40px_rgba(46,58,47,0.06)]">
          {/* Top Brand Identity */}
          <div className="flex flex-col items-center mb-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F8F6EE] dark:bg-[#151D16] border border-[#D9C9B2] dark:border-[#3A4A3B] p-2 flex items-center justify-center shadow-xs mb-3">
              <img src="/jpp-logo.png" alt="JPP POLISAS" className="w-full h-full object-contain" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#6B7F5B]/10 border border-[#6B7F5B]/25 mb-2">
              <ShieldCheck className="w-3 h-3 text-[#6B7F5B]" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#6B7F5B]">
                {t('portal:official_portal_badge', 'Portal Rasmi POLISAS')}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[#2E3A2F] dark:text-[#F8F6EE]">
              {t('portal:create_new_password_title', 'Cipta Kata Laluan Baharu')}
            </h1>
            <p className="text-xs font-medium text-[#556453] dark:text-[#A3B39F] mt-1.5 leading-relaxed max-w-xs">
              {t('portal:create_new_password_desc', 'Sila tetapkan kata laluan keselamatan baharu untuk akaun portal kampus anda.')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Medan Kata Laluan Baharu */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#D9C9B2]">
                {t('portal:password_min_length_label', 'Kata Laluan Baharu (Min. 6 Aksara)')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#556453]/60 dark:text-[#A3B39F]" />
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'}
                  required 
                  placeholder={t('portal:enter_new_password_placeholder', 'Masukkan kata laluan baharu')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-10 pr-10 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] font-bold tracking-wide text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#556453]/60 hover:text-[#2E3A2F] dark:text-[#A3B39F] dark:hover:text-[#F8F6EE] p-1 cursor-pointer"
                  aria-label={showPassword ? t('portal:hide_password_aria', 'Sembunyi kata laluan') : t('portal:show_password_aria', 'Tunjuk kata laluan')}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Medan Sahkan Kata Laluan */}
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-[#556453] dark:text-[#D9C9B2]">
                {t('portal:confirm_password_label', 'Sahkan Kata Laluan')}
              </Label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#556453]/60 dark:text-[#A3B39F]" />
                <Input 
                  id="confirmPassword" 
                  type={showConfirmPassword ? 'text' : 'password'}
                  required 
                  placeholder={t('portal:repeat_new_password_placeholder', 'Ulang kata laluan baharu')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 pl-10 pr-10 rounded-xl bg-[#F8F6EE]/60 dark:bg-[#151D16] border-[#D9C9B2] dark:border-[#3A4A3B] text-[#2E3A2F] dark:text-[#F8F6EE] font-bold tracking-wide text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#556453]/60 hover:text-[#2E3A2F] dark:text-[#A3B39F] dark:hover:text-[#F8F6EE] p-1 cursor-pointer"
                  aria-label={showConfirmPassword ? t('portal:hide_password_aria', 'Sembunyi kata laluan') : t('portal:show_password_aria', 'Tunjuk kata laluan')}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-rose-500 font-medium pt-0.5">{t('portal:password_mismatch_warning', 'Kata laluan tidak sepadan.')}</p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={isLoading} 
              className="w-full h-12 rounded-xl font-bold text-xs uppercase tracking-wider bg-[#2E3A2F] hover:bg-[#242E25] dark:bg-[#6B7F5B] dark:hover:bg-[#556453] text-[#F8F6EE] shadow-sm transition-all active:scale-[0.98] cursor-pointer mt-2"
            >
              {isLoading ? (
                t('common:updating', 'Mengemaskini...')
              ) : (
                <span className="inline-flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  {t('portal:update_password_btn', 'Kemaskini Kata Laluan')}
                </span>
              )}
            </Button>
          </form>

          {/* Navigasi Balik ke Log Masuk */}
          <div className="mt-6 pt-4 border-t border-[#D9C9B2]/60 dark:border-[#3A4A3B] text-center">
            <Link 
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#556453] dark:text-[#A3B39F] hover:text-[#2E3A2F] dark:hover:text-[#F8F6EE] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('portal:back_to_login', 'Kembali ke Log Masuk')}</span>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center">
          <p className="text-[10px] font-medium text-[#556453]/70 dark:text-[#A3B39F]/50">
            {t('portal:council_name_short', 'Jawatankuasa Perwakilan Pelajar POLISAS')}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default ResetPasswordPage;
