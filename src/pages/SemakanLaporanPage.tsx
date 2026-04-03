import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, CheckCircle2, XCircle, RefreshCw, Lock, Unlock, FileText,
  ExternalLink, Filter, MessageSquare, BookOpen, Users, Calendar,
  Award, UploadCloud, Zap, AlertTriangle, Clock, Check, ChevronRight, Archive
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { ALL_CLUBS } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import PemantauanTakwimTab from '@/components/takwim/PemantauanTakwimTab';

// --- Types & Constants ---
type ProgramStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'CONFIRMED' | 'PENDING_POSTMORTEM' | 'COMPLETED' | 'REQUEST_UNLOCK';

interface Program {
  id: string;
  nama_program: string;
  tarikh_mula: string;
  tarikh_tamat: string;
  status: ProgramStatus;
  url_kertas_kerja: string;
  url_post_mortem: string;
  jpp_remarks: string;
  updated_at: string;
  user_id: string;
  club_id: string;
}

const ALL_DOC_TYPES = [
  { value: 'Laporan Aktiviti', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-100' },
  { value: 'Laporan Kewangan', icon: DollarSignIcon, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  { value: 'Takwim Aktiviti', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-100' },
  { value: 'Profil Ahli Kelab', icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  { value: 'Struktur Jawatan', icon: Award, color: 'text-purple-500', bg: 'bg-purple-100' },
  { value: 'Carta Organisasi', icon: Users, color: 'text-pink-500', bg: 'bg-pink-100' },
  { value: 'Perlembagaan Kelab', icon: BookOpen, color: 'text-slate-700', bg: 'bg-slate-200' },
];

function DollarSignIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
}

export function SemakanLaporanPage() {
  const { user, isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);

  // States for Tab 1: Pengurusan Program
  const [programs, setPrograms] = useState<Program[]>([]);
  const [archivedPrograms, setArchivedPrograms] = useState<Program[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ open: boolean, type: 'APPROVE' | 'REJECT' | 'UNLOCK' | null, data: Program | null }>({
    open: false, type: null, data: null
  });
  const [remarks, setRemarks] = useState('');

  // States for Tab 2: Laporan Kelab (General)
  const [reports, setReports] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterClub, setFilterClub] = useState<string>('Semua');

  // States for Tab 3: Arkib Berpusat
  const [arkibItems, setArkibItems] = useState<any[]>([]);
  const [arkibFilter, setArkibFilter] = useState<'semua' | 'kertas_kerja' | 'post_mortem' | 'laporan'>('semua');
  const [arkibLoading, setArkibLoading] = useState(false);
  const [arkibClub, setArkibClub] = useState<string>('Semua');

  // ── Access Guard ──
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] gap-5 text-center">
        <div className="w-24 h-24 rounded-full bg-rose-500/10 flex items-center justify-center shadow-inner"><Lock className="text-rose-500 w-10 h-10" /></div>
        <h2 className="text-3xl font-black tracking-tighter">Akses Terhad</h2>
        <p className="text-muted-foreground font-medium max-w-xs">Halaman ini dikhaskan untuk Admin JPP sahaja.</p>
      </div>
    );
  }

  const loadData = async () => {
    setLoading(true);

    // Tapis keluar DRAFT (belum dihantar) dan COMPLETED (sudah selesai — diarkibkan)
    const { data: progData, error: progError } = await supabase
      .from('programs')
      .select('*')
      .not('status', 'in', '("DRAFT","COMPLETED")') // Hanya tunjuk yang perlu tindakan
      .order('updated_at', { ascending: false })
      .limit(100);

    // Tarik program yang COMPLETED secara berasingan untuk arkib
    const { data: archivedData } = await supabase
      .from('programs')
      .select('*')
      .eq('status', 'COMPLETED')
      .order('updated_at', { ascending: false })
      .limit(20);

    const { data: repData, error: repError } = await supabase
      .from('club_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    setPrograms(progData || []);
    setArchivedPrograms(archivedData || []);
    setReports(repData || []);
    setLoading(false);
  };

  // Fungsi fetch Tab 3: Arkib Berpusat
  const loadArkib = async () => {
    setArkibLoading(true);
    try {
      const [completedPrograms, approvedReports] = await Promise.all([
        supabase
          .from('programs')
          .select('id, nama_program, url_kertas_kerja, url_post_mortem, updated_at, club_id, user_id')
          .eq('status', 'COMPLETED')
          .order('updated_at', { ascending: false })
          .limit(100),
        supabase
          .from('club_reports')
          .select('id, club_id, file_url, file_name, report_type, created_at, status')
          .eq('status', 'Diluluskan')
          .order('created_at', { ascending: false })
          .limit(100)
      ]);

      // Normalisasi dan gabungkan
      const progItems = (completedPrograms.data || []).flatMap((p: any) => {
        const items = [];
        if (p.url_kertas_kerja) items.push({
          id: `kk-${p.id}`, type: 'kertas_kerja', label: 'Kertas Kerja',
          name: p.nama_program, file_url: p.url_kertas_kerja,
          club_id: p.club_id, date: p.updated_at
        });
        if (p.url_post_mortem) items.push({
          id: `pm-${p.id}`, type: 'post_mortem', label: 'Post-Mortem',
          name: p.nama_program, file_url: p.url_post_mortem,
          club_id: p.club_id, date: p.updated_at
        });
        return items;
      });

      const repItems = (approvedReports.data || []).map((r: any) => ({
        id: `rp-${r.id}`, type: 'laporan', label: r.report_type || 'Laporan',
        name: r.file_name, file_url: r.file_url,
        club_id: r.club_id, date: r.created_at
      }));

      setArkibItems([...progItems, ...repItems].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      ));
    } catch (e) {
      console.error('Arkib fetch error:', e);
    } finally {
      setArkibLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  // Load arkib bila tab pertama kali dibuka (lazy load)
  const [arkibLoaded, setArkibLoaded] = React.useState(false);
  const handleArkibTab = () => {
    if (!arkibLoaded) { loadArkib(); setArkibLoaded(true); }
  };

  // ── Tab 1: Program Action Logic (Updated with Notifications) ──
  const handleProgramAction = async () => {
    if (!actionDialog.data || !actionDialog.type) return;

    let nextStatus: ProgramStatus = actionDialog.data.status;
    let isLocked = actionDialog.data.status === 'CONFIRMED';
    let notificationTitle = '';
    let notificationContent = '';

    if (actionDialog.type === 'APPROVE') {
      nextStatus = actionDialog.data.status === 'PENDING_APPROVAL' ? 'CONFIRMED' : 'COMPLETED';
      isLocked = true;
      notificationTitle = nextStatus === 'CONFIRMED' ? '✅ Kertas Kerja Diluluskan' : '🎉 Program Selesai & Diarkib';
      notificationContent = `Program "${actionDialog.data.nama_program}" telah disahkan oleh JPP.`;
    }
    else if (actionDialog.type === 'REJECT') {
      if (actionDialog.data.status === 'PENDING_POSTMORTEM') {
        nextStatus = 'PENDING_POSTMORTEM'; 
        isLocked = false;
        notificationTitle = '❌ Post-Mortem Ditolak';
        notificationContent = `Post-Mortem "${actionDialog.data.nama_program}" memerlukan pindaan. Sila semak ulasan JPP.`;
      } else {
        nextStatus = 'DRAFT';
        isLocked = false;
        notificationTitle = '❌ Kertas Kerja Ditolak';
        notificationContent = `Program "${actionDialog.data.nama_program}" memerlukan pindaan. Sila semak ulasan JPP.`;
      }
    }
    else if (actionDialog.type === 'UNLOCK') {
      nextStatus = 'DRAFT';
      isLocked = false;
      notificationTitle = '🔓 Permohonan Unlock Diluluskan';
      notificationContent = `JPP telah meluluskan permohonan unlock untuk "${actionDialog.data.nama_program}". Anda kini boleh mengedit tarikh semula.`;
    }

    const toastId = toast.loading("Mengemaskini...");

    // 1. Update Status Program
    const { error } = await supabase
      .from('programs')
      .update({ status: nextStatus, is_locked: isLocked, jpp_remarks: remarks })
      .eq('id', actionDialog.data.id);

    if (error) {
      toast.error("Gagal kemaskini.", { id: toastId });
      return;
    }

    // 2. Suntik Notifikasi ke Database (Hanya jika ada content)
    if (notificationTitle) {
      await supabase.from('notifications').insert([{
        user_id: actionDialog.data.user_id, // ID Presiden/MT yang daftar program
        title: notificationTitle,
        content: notificationContent,
        type: actionDialog.type === 'UNLOCK' ? 'UNLOCK_APPROVED' : 'STATUS_UPDATE',
        is_read: false
      }]);
    }

    toast.success("Tindakan Berjaya!", { id: toastId });
    loadData();
    setActionDialog({ open: false, type: null, data: null });
    setRemarks('');
  };

  // ── Tab 2: General Report Logic ──
  const filteredReports = reports.filter(r => {
    const matchStatus = filterStatus === 'Semua' || r.status === filterStatus;
    const matchClub = filterClub === 'Semua' || r.club_id === filterClub;
    return matchStatus && matchClub;
  });

  const handleStatusUpdate = async (r: any, newStatus: string) => {
    const toastId = toast.loading("Memproses...");
    const { error } = await supabase.from('club_reports').update({ status: newStatus, reviewed_by: user?.id, reviewed_at: new Date().toISOString() }).eq('id', r.id);
    if (error) toast.error('Gagal memproses dokumen.', { id: toastId });
    else { toast.success(`Dokumen ${newStatus.toLowerCase()}!`, { id: toastId }); loadData(); }
  };

  return (
    <div className="page-container space-y-10 pb-24 max-w-7xl mx-auto">

      {/* ── Header Premium ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-gradient-to-r from-slate-900 to-slate-800 p-8 rounded-[3rem] text-white shadow-xl shadow-slate-900/20">
        <div className="space-y-3">
          <Badge className="bg-white/10 text-white border-none px-4 py-1.5 font-black uppercase tracking-widest text-[10px]">Super Admin Panel</Badge>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">Pusat Kawalan JPP</h1>
          <p className="text-slate-300 font-medium max-w-md">Sahkan takwim program dan pantau kelulusan dokumen rasmi persatuan pelajar.</p>
        </div>
        <Button onClick={loadData} variant="outline" className="rounded-2xl gap-2 h-14 px-8 border-none bg-white/10 hover:bg-white/20 text-white font-black tracking-widest uppercase text-[10px] backdrop-blur-sm">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Segarkan Data
        </Button>
      </div>

      <Tabs defaultValue="programs" className="w-full">
        <TabsList className="bg-muted p-1.5 rounded-[1.5rem] mb-10 w-full md:w-auto flex flex-col md:flex-row h-auto md:h-14 border border-border/50 shadow-inner">
          <TabsTrigger value="programs" className="rounded-xl font-black tracking-wide px-8 py-3 text-xs md:w-auto w-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Pengurusan Program</TabsTrigger>
          <TabsTrigger value="reports" className="rounded-xl font-black tracking-wide px-8 py-3 text-xs md:w-auto w-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Laporan Kelab (General)</TabsTrigger>
          <TabsTrigger value="takwim" className="rounded-xl font-black tracking-wide px-8 py-3 text-xs md:w-auto w-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Pemantauan Takwim</TabsTrigger>
          <TabsTrigger value="arkib" onClick={handleArkibTab} className="rounded-xl font-black tracking-wide px-8 py-3 text-xs md:w-auto w-full data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Arkib Berpusat
          </TabsTrigger>
        </TabsList>

        {/* --- TAB 1: PENGURUSAN PROGRAM --- */}
        <TabsContent value="programs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {programs.filter(p => p.status === 'PENDING_APPROVAL').map((p, i) => {
                const diffInDays = (new Date().getTime() - new Date(p.updated_at).getTime()) / (1000 * 3600 * 24);
                if (diffInDays < 3) return null;
                return (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} key={`alert-${p.id}`} className="bg-rose-500/10 border-2 border-rose-500/20 p-5 rounded-[2rem] flex items-center gap-5 shadow-sm">
                    <div className="bg-rose-500 p-4 rounded-2xl text-white animate-pulse shadow-lg shadow-rose-500/30"><AlertTriangle size={24} /></div>
                    <div><p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Kritikal ({Math.floor(diffInDays)} Hari)</p><p className="font-bold text-foreground leading-tight mt-1">{p.nama_program}</p></div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {programs.length === 0 ? (
              <div className="col-span-full py-24 text-center opacity-30 border-2 border-dashed rounded-[3rem]">
                <Calendar className="w-12 h-12 mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-sm">Tiada program untuk disemak</p>
              </div>
            ) : (
              programs.map((p) => (
                <Card key={p.id} className="border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2.5rem] overflow-hidden bg-card group">
                  <CardContent className="p-6 md:p-8 flex flex-col justify-between h-full gap-6">
                    <div className="flex items-start gap-5">

                      {/* UI YANG DIKEMASKINI DARI KOD 3 */}
                      <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shrink-0 transition-transform group-hover:scale-105",
                        p.status === 'PENDING_APPROVAL' ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                          p.status === 'CONFIRMED' ? "bg-gradient-to-br from-emerald-400 to-teal-500" :
                            p.status === 'REQUEST_UNLOCK' ? "bg-gradient-to-br from-indigo-500 to-purple-600 animate-pulse" : // Warna Ungu Berdenyut
                              "bg-slate-300")}>
                        {p.status === 'REQUEST_UNLOCK' ? <Unlock size={24} /> : <Calendar size={24} />}
                      </div>

                      <div className="space-y-2">
                        {(() => {
                          const isRejectedPostmortem = p.status === 'PENDING_POSTMORTEM' && p.jpp_remarks;
                          const club = ALL_CLUBS.find(c => c.id === p.club_id);
                          return (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={cn("rounded-md font-black text-[10px] uppercase tracking-widest border-none px-2 py-0.5",
                                p.status === 'REQUEST_UNLOCK' ? "bg-indigo-500/10 text-indigo-500" :
                                isRejectedPostmortem ? "bg-rose-500/10 text-rose-500" :
                                p.status === 'PENDING_APPROVAL' ? "bg-amber-500/10 text-amber-500" :
                                p.status === 'CONFIRMED' ? "bg-emerald-500/10 text-emerald-500" :
                                "bg-muted text-muted-foreground")}>
                                {isRejectedPostmortem ? 'POSTMORTEM (REJECTED)' : p.status.replace('_', ' ')}
                              </Badge>
                              {club && (
                                <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-200 border-none font-bold text-[10px] px-2 py-0.5 uppercase tracking-widest transition-colors">
                                  {club.shortName}
                                </Badge>
                              )}
                            </div>
                          );
                        })()}
                        <h3 className="font-black text-xl text-slate-900 leading-tight">{p.nama_program}</h3>
                        <span className="text-xs text-slate-400 flex items-center gap-1.5 font-bold"><Clock size={12} /> Dikemaskini {new Date(p.updated_at).toLocaleDateString('ms-MY')}</span>
                        
                        {p.jpp_remarks && (
                          <div className="mt-2 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 flex flex-col gap-1 max-w-[400px]">
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">Nota Semasa / Alasan</span>
                            <span className="text-xs font-semibold text-slate-700 italic break-words">{p.jpp_remarks}</span>
                          </div>
                        )}
                      </div>
                      {/* TAMAT UI DARI KOD 3 */}

                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                      {(() => {
                         const url = p.status === 'PENDING_POSTMORTEM' ? p.url_post_mortem : p.url_kertas_kerja;
                         const isValidUrl = url && url.length > 5;
                         return isValidUrl ? (
                           <a href={url} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none">
                             <Button variant="outline" className="w-full rounded-xl font-black text-xs h-12 border-border hover:bg-muted"><FileText size={16} className="mr-2 text-slate-400" /> Papar Dokumen</Button>
                           </a>
                         ) : (
                           <Button disabled variant="outline" className="flex-1 md:flex-none rounded-xl font-black text-xs h-12 border-border opacity-50 cursor-not-allowed">
                             <FileText size={16} className="mr-2 text-slate-400" /> Tiada Dokumen
                           </Button>
                         );
                      })()}

                      {p.status === 'REQUEST_UNLOCK' && <Button onClick={() => setActionDialog({ open: true, type: 'UNLOCK', data: p })} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs h-12 shadow-lg shadow-indigo-200">Buka Kunci (Unlock)</Button>}

                      {(p.status === 'PENDING_APPROVAL' || p.status === 'PENDING_POSTMORTEM') && (
                        <div className="flex gap-2 flex-1">
                          <Button variant="success" onClick={() => setActionDialog({ open: true, type: 'APPROVE', data: p })} className="flex-1 rounded-xl font-black text-xs h-12">
                            <CheckCircle2 size={16} className="mr-1.5" /> Lulus
                          </Button>
                          <Button variant="destructive" onClick={() => setActionDialog({ open: true, type: 'REJECT', data: p })} className="rounded-xl font-black text-xs h-12 px-6">
                            <XCircle size={16} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* ── ARKIB PROGRAM ── */}
          {archivedPrograms.length > 0 && (
            <div className="mt-10">
              <button
                onClick={() => setShowArchive(v => !v)}
                className="flex items-center gap-3 w-full text-left p-4 rounded-2xl bg-muted/30 hover:bg-muted transition-colors group"
              >
                <Archive className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600">
                  Arkib Program Selesai ({archivedPrograms.length})
                </span>
                <ChevronRight className={cn("w-4 h-4 text-slate-300 ml-auto transition-transform", showArchive && "rotate-90")} />
              </button>
              {showArchive && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  {archivedPrograms.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 bg-card/70 border border-border rounded-2xl">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                        <Check size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-slate-700 truncate">{p.nama_program}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mt-1">
                          Selesai · {new Date(p.updated_at).toLocaleDateString('ms-MY')}
                          {p.club_id && (
                             <>
                               <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                               <span className="text-muted-foreground truncate">{ALL_CLUBS.find(c => c.id === p.club_id)?.shortName}</span>
                             </>
                          )}
                        </p>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-none text-[10px] font-black uppercase shrink-0">Selesai</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* --- TAB 3: PEMANTAUAN TAKWIM --- */}
        <TabsContent value="takwim" className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
          <PemantauanTakwimTab />
        </TabsContent>

        {/* --- TAB 2: LAPORAN KELAB (GENERAL) --- */}
        <TabsContent value="reports" className="space-y-8">

          {/* Filter Bar Premium */}
          <div className="flex flex-col xl:flex-row gap-4 items-center justify-between bg-card p-3 rounded-[2rem] shadow-sm border border-border/50">
            <Select value={filterClub} onValueChange={setFilterClub}>
              <SelectTrigger className="w-full xl:w-72 h-14 rounded-2xl border-none bg-muted font-black text-xs px-5 shadow-inner hover:bg-muted/80 transition-colors">
                <SelectValue placeholder="Semua Kelab & Persatuan" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl font-bold">
                <SelectItem value="Semua">Semua Kelab & Persatuan</SelectItem>
                {ALL_CLUBS.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2 w-full xl:w-auto bg-muted p-1.5 rounded-2xl">
              {['Semua', 'Menunggu', 'Dalam Semakan', 'Diluluskan', 'Ditolak'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn("flex-1 xl:flex-none rounded-xl text-[10px] font-black uppercase tracking-widest px-6 h-11 transition-all",
                    filterStatus === s ? "bg-slate-900 text-white shadow-md scale-100" : "text-slate-500 hover:bg-slate-200 hover:text-slate-800 scale-95"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {filteredReports.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-24 text-center opacity-30 border-2 border-dashed rounded-[3rem]">
                  <FileText className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-black uppercase tracking-widest text-sm">Tiada dokumen dijumpai</p>
                </motion.div>
              ) : (
                filteredReports.map((r, i) => {
                  const docMeta = ALL_DOC_TYPES.find(d => d.value === r.report_type) || ALL_DOC_TYPES[0];
                  const DocIcon = docMeta.icon;
                  return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={r.id}>
                      <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden bg-card group h-full flex flex-col">
                        <CardContent className="p-6 flex flex-col justify-between h-full gap-5">

                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform", docMeta.bg, docMeta.color)}>
                                <DocIcon size={24} />
                              </div>
                              <div>
                                <h4 className="font-black text-slate-900 text-lg leading-tight line-clamp-2">{r.title || r.file_name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{r.report_type}</p>
                                  {r.club_id && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate max-w-[120px]">
                                        {ALL_CLUBS.find(c => c.id === r.club_id)?.shortName}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-border">
                            <Badge className={cn("rounded-md border-none px-3 py-1 font-black uppercase tracking-widest text-[10px]",
                              r.status === 'Diluluskan' ? 'bg-emerald-500/10 text-emerald-500' :
                                r.status === 'Ditolak' ? 'bg-rose-500/10 text-rose-500' :
                                  'bg-muted text-muted-foreground'
                            )}>
                              {r.status}
                            </Badge>

                            <div className="flex items-center gap-2">
                              {r.status === 'Menunggu' && (
                                <>
                                  <Button variant="success" onClick={() => handleStatusUpdate(r, 'Diluluskan')} size="sm" className="rounded-xl font-black text-[10px] h-9 px-4">Lulus</Button>
                                  <Button variant="destructive" onClick={() => handleStatusUpdate(r, 'Ditolak')} size="sm" className="rounded-xl font-black text-[10px] h-9 px-4">Tolak</Button>
                                </>
                              )}
                              {r.file_url && r.file_url.length > 5 ? (
                                <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-muted hover:bg-muted/80 text-slate-500 hover:text-primary transition-colors">
                                    <ChevronRight size={18} />
                                  </Button>
                                </a>
                              ) : (
                                <Button disabled variant="ghost" size="icon" className="h-9 w-9 rounded-xl bg-muted text-slate-300 opacity-50 cursor-not-allowed">
                                  <ChevronRight size={18} />
                                </Button>
                              )}
                            </div>
                          </div>

                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* --- TAB 3: ARKIB BERPUSAT --- */}
        <TabsContent value="arkib" className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-card p-3 rounded-[2rem] shadow-sm border border-border/50">
            <Select value={arkibClub} onValueChange={setArkibClub}>
              <SelectTrigger className="w-full sm:w-64 h-12 rounded-2xl border-none bg-muted font-black text-xs px-5">
                <SelectValue placeholder="Semua Kelab" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl font-bold">
                <SelectItem value="Semua">Semua Kelab</SelectItem>
                {ALL_CLUBS.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex flex-wrap gap-2 bg-muted p-1.5 rounded-2xl">
              {[
                { key: 'semua', label: 'Semua' },
                { key: 'kertas_kerja', label: 'Kertas Kerja' },
                { key: 'post_mortem', label: 'Post-Mortem' },
                { key: 'laporan', label: 'Laporan' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setArkibFilter(f.key as any)}
                  className={cn(
                    'rounded-xl text-[10px] font-black uppercase tracking-widest px-5 h-10 transition-all',
                    arkibFilter === f.key
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-200'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Button
              onClick={() => { loadArkib(); setArkibLoaded(true); }}
              variant="ghost"
              size="sm"
              className="rounded-xl h-10 px-4 font-black text-[10px] uppercase tracking-widest ml-auto"
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', arkibLoading && 'animate-spin')} />
              Muat Semula
            </Button>
          </div>

          {/* Senarai Arkib */}
          {arkibLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-muted/40 rounded-[2rem] animate-pulse" />
              ))}
            </div>
          ) : (() => {
            const filtered = arkibItems.filter(item => {
              const matchType = arkibFilter === 'semua' || item.type === arkibFilter;
              const matchClub = arkibClub === 'Semua' || item.club_id === arkibClub;
              return matchType && matchClub;
            });

            if (filtered.length === 0) return (
              <div className="py-24 text-center opacity-30 border-2 border-dashed rounded-[3rem]">
                <Archive className="w-12 h-12 mx-auto mb-4" />
                <p className="font-black uppercase tracking-widest text-sm">Tiada rekod dalam arkib</p>
              </div>
            );

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {filtered.map((item, i) => {
                    const club = ALL_CLUBS.find(c => c.id === item.club_id);
                    const typeColor = item.type === 'kertas_kerja'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                      : item.type === 'post_mortem'
                      ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20';

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 p-5 bg-card border border-border/50 rounded-[2rem] hover:shadow-lg transition-all group"
                      >
                        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border', typeColor)}>
                          <FileText size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-foreground truncate leading-tight">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn('text-[9px] font-black uppercase border-none px-1.5 py-0', typeColor)}>
                              {item.label}
                            </Badge>
                            {club && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                <span className="text-[10px] font-bold text-muted-foreground truncate">{club.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {item.file_url && item.file_url.length > 5 ? (
                          <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 rounded-xl bg-muted hover:bg-primary hover:text-white transition-colors shrink-0"
                            >
                              <ExternalLink size={16} />
                            </Button>
                          </a>
                        ) : (
                          <Button disabled variant="ghost" size="icon" className="h-10 w-10 rounded-xl bg-muted text-slate-300 opacity-50 cursor-not-allowed shrink-0">
                            <ExternalLink size={16} />
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* ── Dialog Action (Programs) ── */}
      <Dialog open={actionDialog.open} onOpenChange={(o) => setActionDialog({ ...actionDialog, open: o })}>
        <DialogContent className="rounded-[3rem] p-10 max-w-md border-none shadow-2xl bg-card">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-3xl font-black tracking-tighter">Sahkan Tindakan</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Komen Rasmi JPP (Opsyenal)</Label>
            <Textarea 
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)} 
              placeholder="Taip alasan atau ulasan di sini..." 
              className="rounded-2xl bg-muted border-none min-h-[120px] p-5 font-medium focus-visible:ring-primary/20" 
            />
          </div>
          <DialogFooter className="gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setActionDialog({ open: false, type: null, data: null })} className="rounded-xl font-bold flex-1 h-12">Batal</Button>
            <Button onClick={handleProgramAction} className="rounded-xl font-black flex-1 bg-slate-900 text-white h-12 shadow-xl shadow-slate-900/20">Sahkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}