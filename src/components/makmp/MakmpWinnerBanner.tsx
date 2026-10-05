import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PartyPopper, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

/** Banner jemputan MAKMP untuk Portal page pelajar.
 *  Fetch winner_status user semasa (dari makmp_submissions) & render banner
 *  hijau (dijemput) atau merah (tidak terpilih) + pautan ke halaman status. */
export default function MakmpWinnerBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'DIJEMPUT' | 'TIDAK_TERPILIH' | null>(null);
  const [trackingCode, setTrackingCode] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      // Cari submission MAKMP user semasa yang dah ada keputusan (winner_status)
      const { data } = await supabase
        .from('makmp_submissions')
        .select('tracking_code, winner_status')
        .eq('user_id', user.id)
        .not('winner_status', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled || !data) return;
      setStatus(data.winner_status as 'DIJEMPUT' | 'TIDAK_TERPILIH');
      setTrackingCode(data.tracking_code);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!status || !trackingCode) return null;

  if (status === 'DIJEMPUT') {
    return (
      <Link
        to={`/makmp/status?code=${trackingCode}`}
        className="block w-full p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border-2 border-emerald-300 dark:border-emerald-500/40 shadow-lg hover:bg-emerald-100/60 dark:hover:bg-emerald-500/15 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <PartyPopper className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-emerald-800 dark:text-emerald-300">Anda Dijemput ke MAKMP 2026! 🎉</div>
            <div className="text-xs text-emerald-700 dark:text-emerald-200/80 mt-0.5">
              Tahniah! Klik untuk lengkapkan maklumat & gambar passport anda.
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/makmp/status?code=${trackingCode}`}
      className="block w-full p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/30 shadow-lg hover:bg-rose-100/60 dark:hover:bg-rose-500/15 transition"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
          <XCircle className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-rose-800 dark:text-rose-300">Maaf, Anda Tidak Terpilih</div>
          <div className="text-xs text-rose-700 dark:text-rose-200/80 mt-0.5">
            Terima kasih atas penyertaan anda dalam MAKMP 2026.
          </div>
        </div>
      </div>
    </Link>
  );
}
