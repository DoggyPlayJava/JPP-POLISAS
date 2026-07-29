import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import {
  QrCode,
  Sparkles,
  CheckCircle2,
  Trophy,
  User,
  Mail,
  Phone,
  CreditCard,
  Send,
  RefreshCw,
  AlertCircle,
  MapPin,
  Calendar,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { EmsEvent, EmsVisitor } from '@/types';

export function EmsAudienceScanPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [event, setEvent] = useState<EmsEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [matrixNo, setMatrixNo] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isStudent, setIsStudent] = useState(true);

  // Result State
  const [submittedVisitor, setSubmittedVisitor] = useState<EmsVisitor | null>(null);

  // Pre-fill user data if logged in
  useEffect(() => {
    if (profile || user) {
      if (profile?.full_name) setName(profile.full_name);
      if (profile?.matric_no) setMatrixNo(profile.matric_no);
      if (user?.email) setEmail(user.email);
      if (profile?.phone) setPhone(profile.phone);
    }
  }, [profile, user]);

  // Load Event Details
  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('ems_events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          toast.error('Acara tidak dijumpai');
        } else {
          setEvent(data as EmsEvent);
        }
      } catch (err: any) {
        console.error('[EMS Audience Scan] Error loading event:', err);
        toast.error('Gagal memuatkan maklumat acara');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const triggerConfettiExplosion = () => {
    const end = Date.now() + 4 * 1000;
    const colors = ['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f43f5e'];

    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors,
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    if (!name.trim()) {
      toast.error('Sila masukkan Nama Penuh.');
      return;
    }

    try {
      setSubmitting(true);

      // Fetch current count of visitors for this event
      const { count, error: countErr } = await supabase
        .from('ems_visitors')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', eventId);

      if (countErr) {
        console.warn('[EMS Scan] Error fetching visitor count:', countErr.message);
      }

      const currentVisitorCount = (count || 0) + 1;

      // Check milestone configuration (e.g., [50, 100, 250, 500])
      const milestoneConfig: number[] = Array.isArray(event?.milestone_config)
        ? event!.milestone_config
        : [50, 100, 250, 500];

      const isMilestoneWinner = milestoneConfig.includes(currentVisitorCount);

      // Insert into ems_visitors
      const { data, error } = await supabase
        .from('ems_visitors')
        .insert([
          {
            event_id: eventId,
            user_id: user?.id || null,
            name: name.trim(),
            matrix_no: matrixNo.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            is_milestone_winner: isMilestoneWinner,
            milestone_number: isMilestoneWinner ? currentVisitorCount : null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const newRecord = data as EmsVisitor;
      setSubmittedVisitor(newRecord);

      if (isMilestoneWinner) {
        triggerConfettiExplosion();
        toast.success(`🎉 TAHNIAH! Anda Pengunjung Ke-${currentVisitorCount}!`);
      } else {
        toast.success('Kehadiran anda berjaya direkodkan!');
      }
    } catch (err: any) {
      console.error('[EMS Scan] Error recording attendance:', err);
      toast.error(err.message || 'Gagal merekodkan kehadiran. Sila cuba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.3em] text-white/50 animate-pulse">
          Memuatkan Portal Kehadiran Pengunjung...
        </p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black mb-2">Acara Tidak Ditemui</h2>
        <p className="text-sm text-slate-400 mb-6 max-w-sm">
          Pautan imbasan QR kehadiran ini tidak sah atau acara telah ditamatkan.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
        >
          Kembali ke Halaman Utama
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 relative overflow-hidden select-none font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-indigo-600/20 via-purple-600/10 to-transparent blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-[11px] font-black uppercase tracking-wider">
            <QrCode className="w-3.5 h-3.5" /> Portal Imbasan Kehadiran Awam
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-200">
            {event.title}
          </h1>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" /> {event.location}
              </span>
            )}
            {event.event_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {new Date(event.event_date).toLocaleDateString('ms-MY')}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        {submittedVisitor ? (
          /* Success / Celebration View */
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 backdrop-blur-xl shadow-2xl animate-fadeIn">
            {submittedVisitor.is_milestone_winner ? (
              /* Milestone Winner Celebration Card */
              <div className="space-y-5">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-b from-amber-400/30 to-amber-500/10 border border-amber-400/40 text-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.3)] animate-bounce">
                  <Trophy className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="px-3.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black uppercase tracking-widest border border-amber-400/30 inline-block">
                    🎉 PEMENANG PENGUNJUNG BERTUAH!
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-amber-300">
                    TAHNIAH!
                  </h2>
                  <p className="text-sm text-slate-200 leading-relaxed font-semibold">
                    Anda Adalah Pengunjung Ke-
                    <span className="text-amber-400 text-xl font-black mx-1">
                      [{submittedVisitor.milestone_number || 1}]
                    </span>
                    &amp; Pemenang Bertuah!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left text-xs space-y-1.5 text-amber-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Sila Tunjukkan Skrin Ini Kepada Urus Setia Acara:
                  </p>
                  <p>• Nama: <strong>{submittedVisitor.name}</strong></p>
                  {submittedVisitor.matrix_no && <p>• No. Matrik: <strong>{submittedVisitor.matrix_no}</strong></p>}
                  <p>• Masa Imbasan: {new Date(submittedVisitor.scanned_at).toLocaleTimeString('ms-MY')}</p>
                </div>
              </div>
            ) : (
              /* Regular Visitor Recorded Card */
              <div className="space-y-5">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-white">Kehadiran Berjaya Direkodkan!</h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Terima Kasih! Kehadiran Anda Telah Direkodkan. Anda Kini Layak Untuk Cabutan Bertuah!
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left text-xs space-y-1 text-slate-400">
                  <p><strong className="text-white">Nama:</strong> {submittedVisitor.name}</p>
                  {submittedVisitor.matrix_no && <p><strong className="text-white">No. Matrik:</strong> {submittedVisitor.matrix_no}</p>}
                  {submittedVisitor.email && <p><strong className="text-white">Emel:</strong> {submittedVisitor.email}</p>}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setSubmittedVisitor(null);
                setName('');
                setMatrixNo('');
                setEmail('');
                setPhone('');
              }}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
            >
              Imbas Rekod Baharu
            </button>
          </div>
        ) : (
          /* Attendance Registration Form */
          <form
            onSubmit={handleSubmit}
            className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 backdrop-blur-xl shadow-2xl"
          >
            <div className="text-center pb-2 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Borang Kehadiran Pengunjung</h2>
              <p className="text-xs text-slate-400">Sila isi maklumat anda untuk pendaftaran kehadiran</p>
            </div>

            {/* Account Status Badge if Logged In */}
            {user && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Log masuk sebagai <strong>{profile?.full_name || user.email}</strong></span>
              </div>
            )}

            {/* Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Nama Penuh <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ahmad bin Ali"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Identity Category Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsStudent(true)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                  isStudent
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Pelajar POLISAS
              </button>
              <button
                type="button"
                onClick={() => setIsStudent(false)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${
                  !isStudent
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                Pengunjung Awam / Staf
              </button>
            </div>

            {/* Matrix No Field (if Student) */}
            {isStudent && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">No. Matrik</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={matrixNo}
                    onChange={(e) => setMatrixNo(e.target.value.toUpperCase())}
                    placeholder="e.g. 01DIT22F1001"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs uppercase font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">Alamat Emel</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. email@polisas.edu.my"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">No. Telefon (WhatsApp)</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0123456789"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Merekodkan Kehadiran...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Sahkan &amp; Rekod Kehadiran
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <footer className="relative z-10 text-[11px] text-slate-500 text-center mt-8">
        JPP POLISAS — Event Management System (EMS) Attendance Portal
      </footer>
    </div>
  );
}
