import React from 'react';
import { motion } from 'framer-motion';
import { Hourglass, LogOut, ShieldAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

export function PendingPage() {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[2rem] overflow-hidden bg-background/60 backdrop-blur-xl">
          <div className="h-2 w-full bg-gradient-to-r from-amber-400 to-orange-500" />
          <CardContent className="p-10 flex flex-col items-center text-center space-y-6">
            <div className="w-24 h-24 rounded-[2rem] bg-amber-100 flex items-center justify-center shadow-inner">
              <Hourglass className="w-12 h-12 text-amber-600 animate-pulse" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-black tracking-tight">Menunggu Kelulusan</h1>
              <p className="text-muted-foreground font-medium text-sm leading-relaxed">
                Akaun anda telah berjaya didaftarkan, tetapi ia <strong>memerlukan pengesahan</strong> daripada pihak pentadbir sebelum anda boleh mengakses portal JPP POLISAS.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 text-left">
              <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
                Sila maklumkan kepada Presiden Kelab atau pihak JPP untuk meluluskan permohonan pendaftaran anda.
              </p>
            </div>

            <Button onClick={handleLogout} variant="outline" className="w-full rounded-xl font-black uppercase tracking-widest text-[10px] h-12">
              <LogOut className="w-4 h-4 mr-2" /> Log Keluar
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}