import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Medal, Loader2, ArrowUpRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MeritAssignerProps {
  member: any;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function MeritAssigner({ member, isOpen, onClose, onRefresh }: MeritAssignerProps) {
  const { user, profile } = useAuth();
  const [points, setPoints] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // President cannot give themselves merits directly, unless via system tasks
  const isSelf = user?.id === member.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSelf) {
      toast.error('Anda tidak boleh memberikan merit kepada diri sendiri tanpa kelulusan JPP.');
      return;
    }
    if (points <= 0) {
      toast.error('Sila masukkan jumlah merit yang sah (>0).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Instead of updating the merit directly, insert a club_tasks request for the Advisor to approve
      const { error: insertError } = await supabase
        .from('club_tasks')
        .insert({
          club_id: profile?.club_id,
          title: `[MERIT] Penambahan Kepada ${member.full_name}`,
          description: `Pemberian skor merit manual oleh Presiden. Sila sahkan kelulusan ini.`,
          merit_points: points,
          assigned_to: member.id,
          created_by: user?.id,
          due_date: new Date().toISOString(),
          status: 'COMPLETED',
          approval_status: 'WAITING'
        });

      if (insertError) throw insertError;

      toast.success(`Permohonan ${points} merit untuk ${member.full_name} dihantar kepada Penasihat untuk kelulusan!`);
      setPoints(0);
      onRefresh();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Gagal mengemaskini merit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-primary/5 p-8 border-b border-primary/10">
          <DialogHeader className="pt-2">
            <div className="w-14 h-14 bg-primary/20 text-primary rounded-[1.5rem] flex items-center justify-center mb-4 relative drop-shadow-sm">
              <Medal size={28} />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background animate-pulse" />
            </div>
            <DialogTitle className="text-3xl font-black tracking-tighter">Penganugerahan Merit</DialogTitle>
          </DialogHeader>
          <div className="mt-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Penerima
            </p>
            <p className="font-bold text-sm text-foreground truncate">{member.full_name}</p>
            <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mt-1">{member.role}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Jumlah Merit Ditambah
            </label>
            <div className="relative">
              <Input
                type="number"
                min="1"
                max="100"
                required
                value={points || ''}
                onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
                className="pl-5 h-16 rounded-[1.5rem] bg-muted/40 font-black text-2xl border-none ring-2 ring-transparent transition-all focus-visible:ring-primary/20"
                placeholder="0"
                disabled={isSelf}
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none font-black text-xs uppercase tracking-widest">
                PTS
              </div>
            </div>
          </div>

          <div className="space-y-2">
             {isSelf && (
                <p className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1 bg-rose-50 p-2 rounded-xl">
                    ⚠️ Pengecualian Sistem: Ahli Majlis tidak boleh menganugerahkan merit bersendirian.
                </p>
             )}
            <Button
              type="submit"
              disabled={isSubmitting || isSelf}
              className="w-full h-14 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all text-white bg-primary"
            >
              {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : (
                  <>Sahkan Merit <ArrowUpRight className="ml-2 w-4 h-4" /></>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
