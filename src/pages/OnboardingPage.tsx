import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

export function OnboardingPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  // If they have a profile, go to dashboard
  React.useEffect(() => {
    if (profile) navigate('/dashboard');
  }, [profile]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-[2rem] bg-primary flex items-center justify-center shadow-2xl overflow-hidden mx-auto">
          <img src="/jpp-logo.png" alt="JPP" className="w-14 h-14 object-contain" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter text-primary">Selamat Datang ke e-KPP</h1>
        <p className="text-muted-foreground font-medium">
          Profil anda sedang dikemaskini. Sila tunggu sebentar atau hubungi pentadbir JPP.
        </p>
        <Button onClick={() => navigate('/dashboard')}
          className="rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest h-11 px-8 shadow-lg shadow-primary/20">
          Pergi ke Papan Pemuka
        </Button>
      </div>
    </div>
  );
}
