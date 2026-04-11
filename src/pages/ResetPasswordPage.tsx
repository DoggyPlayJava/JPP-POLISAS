import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'react-hot-toast';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Kata laluan tidak sepadan');
      return;
    }

    if (password.length < 6) {
      toast.error('Kata laluan mesti sekurang-kurangnya 6 aksara');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast.success('Kata laluan berjaya dikemaskini!');
      navigate('/portal');
    } catch (error: any) {
      toast.error(error.message || 'Gagal menetapkan semula kata laluan');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -mr-80 -mt-40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] -ml-80 -mb-40 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <Card className="border border-border/60 shadow-2xl bg-card/80 backdrop-blur-2xl rounded-[2.5rem] overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
          <CardHeader className="space-y-1 px-8 pt-8 pb-4">
            <CardTitle className="text-2xl font-black text-center tracking-tight text-primary">
              Cipta Kata Laluan Baharu
            </CardTitle>
            <CardDescription className="text-center">
              Pilih kata laluan yang selamat untuk akaun anda
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                  Kata Laluan Baharu
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-bold tracking-[0.3em] px-4"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">
                  Sahkan Kata Laluan
                </Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  required 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-accent/40 font-bold tracking-[0.3em] px-4"
                />
              </div>
              <Button type="submit" disabled={isLoading} className="w-full h-12 rounded-xl font-black text-xs uppercase tracking-[0.2em] bg-primary text-primary-foreground shadow-xl shadow-primary/20 transition-all active:scale-95 glow-accent mt-4">
                {isLoading ? 'Memproses...' : 'Kemaskini Kata Laluan'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
