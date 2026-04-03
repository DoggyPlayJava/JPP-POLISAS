import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, LogOut, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

export function RejectedPage() {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleTryAgain = async () => {
    setIsDeleting(true);
    const toastId = toast.loading("Menghapuskan rekod lama...");

    try {
      // 1. Panggil fungsi SQL untuk padam akaun dari sistem
      const { error } = await supabase.rpc('delete_own_user');
      if (error) throw error;

      // 2. Log keluar secara rasmi
      await supabase.auth.signOut();

      toast.success("Rekod dibersihkan. Sila daftar semula.", { id: toastId });
      
      // 3. Paksa refresh ke login
      window.location.href = '/login';
    } catch (error: any) {
      console.error(error);
      toast.error("Ralat: " + error.message, { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    // Gunakan 'fixed' supaya dia tutup seluruh skrin dan tak terikut layout lain
    <div className="fixed inset-0 z-[9999] bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[2.5rem] overflow-hidden bg-white">
          <div className="h-2 w-full bg-rose-500" />
          <CardContent className="p-10 flex flex-col items-center text-center">
            
            {/* ICON SECTION */}
            <div className="w-24 h-24 rounded-[2.5rem] bg-rose-50 flex items-center justify-center mb-8">
              <XCircle className="w-12 h-12 text-rose-500" />
            </div>
            
            {/* TEXT SECTION */}
            <div className="space-y-3 mb-8">
              <h1 className="text-3xl font-black tracking-tighter text-slate-900">Permohonan Ditolak</h1>
              <p className="text-slate-500 font-medium text-sm leading-relaxed px-4">
                Maaf, permohonan anda tidak diluluskan oleh pentadbir JPP Polisas buat masa ini.
              </p>
            </div>

            {/* MESSAGE BOX */}
            <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-3xl flex gap-4 text-left mb-10">
              <MessageSquare className="w-5 h-5 text-rose-500 shrink-0 mt-1" />
              <p className="text-[11px] text-rose-900 font-bold leading-relaxed">
                Anda perlu memadam akaun ini dan mendaftar semula dengan maklumat yang betul atau hubungi pihak JPP untuk rayuan.
              </p>
            </div>

            {/* ACTION BUTTON */}
            <Button 
              onClick={handleTryAgain} 
              disabled={isDeleting}
              className="w-full rounded-2xl font-black uppercase tracking-widest text-[11px] h-14 bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-600/20 transition-all active:scale-95"
            >
              {isDeleting ? 'Memproses...' : (
                <>
                  <LogOut className="w-4 h-4 mr-2" /> Log Keluar & Cuba Lagi
                </>
              )}
            </Button>
            
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}