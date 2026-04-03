import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Clock, FileText, Activity, AlertCircle,
  TrendingUp, LayoutDashboard, Trophy, Medal,
  ArrowUpRight, CheckCircle2, Archive, Star,
  FileCheck, Send, Unlock, ChevronRight, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { queryCache } from '@/lib/cache';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { AddTaskModal } from '@/components/tasks/AddTaskModal';
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal';
import { EditAnnouncementModal } from '@/components/ui/EditAnnouncementModal';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ClubSwitcher } from '@/components/ui/ClubSwitcher';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from '@/components/ui/empty';

// --- 1. KOMPONEN KECIL: ITEM TUGASAN ---
function TaskItem({ task, isNormalMember, canApprove, onOpen, onApprove, onReject, onVerify }: any) {
  const isOverdue = new Date(task.due_date) < new Date() && task.status !== 'COMPLETED';

  return (
    <div className="group p-5 bg-card border border-border/40 rounded-[1.5rem] flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-lg transition-all gap-4">
      <div className="space-y-1.5 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-bold text-base text-foreground">{task.title}</h4>
          {isOverdue && <Badge className="bg-rose-600 text-white border-none text-[10px] font-black uppercase animate-pulse">Lewat</Badge>}
          {task.approval_status === 'WAITING' && <Badge className="bg-amber-500/10 text-amber-600 border-none text-[10px] font-black uppercase">Menunggu Kelulusan Penasihat</Badge>}
          {task.status === 'COMPLETED' && <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] font-black uppercase">Selesai</Badge>}
        </div>
        <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-bold">
          <span className="flex items-center gap-1"><Clock size={12} /> {format(parseISO(task.due_date), 'dd MMM yyyy')}</span>
          {!isNormalMember && (
            <span className="flex items-center gap-1 text-primary uppercase">
              <Users size={12} /> {task.assigned_to?.full_name || 'Tiada Nama'}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        {canApprove && task.approval_status === 'WAITING' && (
          <>
            <Button onClick={() => onApprove(task)} size="sm" className="h-9 px-4 text-[10px] font-black bg-emerald-600 rounded-xl flex-1 sm:flex-none">Luluskan</Button>
            <Button onClick={() => onReject(task)} size="sm" variant="destructive" className="h-9 px-4 text-[10px] font-black rounded-xl flex-1 sm:flex-none">Tolak</Button>
          </>
        )}
        {canApprove && task.status === 'COMPLETED' && task.approval_status === 'APPROVED' && !task.is_archived && (
          <Button onClick={() => onVerify(task)} size="sm" className="h-9 px-4 text-[10px] font-black bg-indigo-600 rounded-xl flex-1 sm:flex-none">Sahkan & Beri Merit</Button>
        )}
        <Button onClick={onOpen} variant="secondary" size="sm" className="h-9 px-4 text-[10px] font-black rounded-xl flex-1 sm:flex-none">Buka</Button>
      </div>
    </div>
  );
}

// --- 2. KOMPONEN KECIL: JEJAK PROGRAM (KERTAS KERJA) ---
function ProgramStatusCard({ program, onUnlock }: { program: any, onUnlock: (p: any) => void }) {
  const isPending = program.status === 'PENDING_APPROVAL' || program.status === 'PENDING_POSTMORTEM';
  const isConfirmed = program.status === 'CONFIRMED';
  const isRejected = program.status === 'DRAFT' && program.jpp_remarks;

  return (
    <div className="p-5 bg-muted/30 border border-border/50 rounded-[1.5rem] flex items-center justify-between group hover:bg-card hover:shadow-xl transition-all border-l-4"
      style={{ borderLeftColor: isConfirmed ? '#10b981' : isPending ? '#f59e0b' : '#e2e8f0' }}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center",
          isConfirmed ? "bg-emerald-500/10 text-emerald-600" : isPending ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"
        )}>
          {isConfirmed ? <CheckCircle2 size={20} /> : <FileText size={20} />}
        </div>
        <div className="space-y-1">
          <h4 className="font-black text-sm text-foreground truncate w-32 sm:w-48 leading-none">{program.nama_program}</h4>
          <div className="flex items-center gap-2">
            <Badge className={cn(
              "text-[10px] font-black uppercase px-2 py-0 border-none",
              isConfirmed ? "bg-emerald-500/10 text-emerald-600" : isPending ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"
            )}>
              {program.status.replace('_', ' ')}
            </Badge>
            {isRejected && <span className="text-[10px] text-rose-500 font-bold animate-pulse">Perlu Pindaan</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isConfirmed && (
          <Button onClick={() => onUnlock(program)} variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-black uppercase text-indigo-500 hover:bg-indigo-500/10 rounded-lg gap-1">
            <Unlock size={12} /> Unlock
          </Button>
        )}
        <ChevronRight size={18} className="text-muted-foreground/30 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}

// --- 3. KOMPONEN UTAMA DASHBOARD ---
export function DashboardPage() {
  const { user, profile, isAdvisor, isPresident, isMT, isMember, effectiveRole, selectedClubId, userClubIds } = useAuth();
  const navigate = useNavigate();

  // ── OPTIMISED: Guna hook yang consolidate 8 queries → 1 RPC + cache ──
  const { data: dashData, isLoading, fetchData: fetchDashboard, refresh } = useDashboardData();

  // State tempatan (bukan dari DB)
  const [taskView, setTaskView] = useState<'active' | 'archive'>('active');
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Derive state dari dashData
  const tasks     = dashData.tasks     || [];
  const activities= dashData.activities|| [];
  const members   = dashData.members   || [];
  const programs  = dashData.programs  || [];
  const announcement = dashData.announcement?.content || 'Tiada pengumuman terkini.';

  const clubStats = {
    taskProgress: [
      { name: 'Aktif',   value: dashData.task_stats?.active    || 0, color: '#3b82f6' },
      { name: 'Selesai', value: dashData.task_stats?.completed || 0, color: '#10b981' },
    ].filter(d => d.value > 0),
    activityTrends: [
      { name: 'Perancangan', count: dashData.act_stats?.perancangan || 0 },
      { name: 'Aktif',       count: dashData.act_stats?.aktif       || 0 },
      { name: 'Selesai',     count: dashData.act_stats?.selesai     || 0 },
    ],
  };

  // Role kini dari AuthContext (berubah mengikut kelab yang dipilih)
  const isNormalMember = isMember && !isMT;
  const userRole = effectiveRole;

  const fetchData = useCallback(() => { refresh(); }, [refresh]);

  // Redirect untuk pengguna baru
  useEffect(() => {
    if (profile && userClubIds.length === 1 && !localStorage.getItem('has_seen_kelab_offer')) {
      localStorage.setItem('has_seen_kelab_offer', 'true');
      toast('Sila pilih kelab/persatuan tambahan anda!', { icon: '👋' });
      navigate('/sertai-kelab');
    }
  }, [profile, userClubIds, navigate]);



  // Guna RPC atomic untuk elak race condition (CRIT-4 fix)
  const awardMerit = async (task: any, customPoints?: number) => {
    const pointsToAward = customPoints !== undefined ? customPoints : (task.merit_points || 0);
    if (pointsToAward === 0) return;

    const assignedId = typeof task.assigned_to === 'object' 
      ? task.assigned_to?.id 
      : task.assigned_to;
      
    if (assignedId) {
      const { error } = await supabase.rpc('increment_merit', {
        target_user_id: assignedId,
        delta: pointsToAward,
      });
      if (error) {
        console.error('increment_merit error:', error);
        toast.error('Gagal kemaskini merit: ' + error.message);
      }
    }
  };

  const handleApproveTask = async (task: any) => {
    try {
      if (task.title.startsWith('[MERIT]') && task.approval_status === 'WAITING') {
        const { error } = await supabase.from('club_tasks').update({
          approval_status: 'APPROVED', is_archived: true, approved_by: user?.id
        }).eq('id', task.id);
        if (error) throw error;
        await awardMerit(task);
        toast.success("Anugerah merit selesai!");
      } else if (task.approval_status === 'WAITING') {
        const { error } = await supabase.from('club_tasks').update({
          approval_status: 'APPROVED', status: 'ACTIVE', approved_by: user?.id
        }).eq('id', task.id);
        if (error) throw error;
        toast.success("Tugasan diluluskan, sedia untuk dijalankan.");
      }
      fetchData();
    } catch (error) { toast.error("Ralat semasa meluluskan"); }
  };

  const handleVerifyTask = async (task: any) => {
    const isLate = new Date(task.due_date) < new Date();
    let meritToGive = task.merit_points || 0;

    if (isLate) {
      const confirmPenalty = window.confirm(`Tugasan ini LEWAT. Adakah anda ingin mengenakan PENALTI de-merit?`);
      if (confirmPenalty) {
        const penaltyStr = window.prompt("Masukkan jumlah merit untuk DIPOTONG (cth: 5):", "5");
        if (penaltyStr !== null) {
          let penalty = parseInt(penaltyStr);
          if (isNaN(penalty)) penalty = 0;
          penalty = Math.max(0, Math.min(100, penalty));
          meritToGive = -penalty; 
        }
      }
    }

    try {
      const { error } = await supabase.from('club_tasks').update({
        is_archived: true,
        status: 'COMPLETED'
      }).eq('id', task.id);
      if (error) throw error;

      await awardMerit(task, meritToGive);
      fetchData();
      
      if (meritToGive < 0) {
        toast.success(`Tugasan diarkibkan & penalti merit (${Math.abs(meritToGive)} pts) dikenakan.`);
      } else {
        toast.success(`Tugasan disahkan & merit (${meritToGive} pts) diberikan!`);
      }
    } catch (e) {
      toast.error("Ralat semasa pengesahan tugasan");
    }
  };

  const handleRejectTask = async (task: any) => {
    const reason = window.prompt("Berikan alasan penolakan:");
    if (!reason) return;
    try {
      const { error } = await supabase.from('club_tasks').update({
        approval_status: 'REJECTED', status: 'DRAFT', rejection_reason: reason,
        rejected_at: new Date().toISOString(), approved_by: user?.id
      }).eq('id', task.id);
      if (error) throw error;
      fetchData();
    } catch (error) { toast.error("Gagal menolak tugasan"); }
  };

  const handleRequestUnlock = async (program: any) => {
    const reason = window.prompt("Sila nyatakan alasan mengapa anda perlu 'Unlock' program ini (cth: Salah tarikh):");
    if (!reason) return;

    try {
      const { error } = await supabase.from('programs').update({
        status: 'REQUEST_UNLOCK',
        jpp_remarks: `Pelajar memohon unlock: ${reason}`
      }).eq('id', program.id);

      if (error) throw error;
      
      // 4. Log Aktiviti
      await supabase.from('club_logs').insert([{
        club_id: profile?.club_id,
        user_id: user?.id,
        type: 'UNLOCK_REQUEST',
        content: `MT [${user?.email}] memohon UNLOCK bagi program: ${program.nama_program}. Sebab: ${reason}`
      }]);

      toast.success("Permohonan Unlock dihantar ke JPP");
      fetchData();
    } catch (e) {
      toast.error("Gagal menghantar permohonan");
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="page-container space-y-10 pb-20">

      {/* ── HEADER ── */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-card/40 p-6 rounded-[2.5rem] border border-border/60 backdrop-blur-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-xl text-white"><LayoutDashboard size={20} /></div>
            <Badge className="bg-primary/10 text-primary border-none px-3 uppercase text-[10px] font-black">{effectiveRole}</Badge>
          </div>
          <h1 className="text-5xl font-black tracking-tighter leading-none">Papan <span className="gradient-text">Pemuka</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          {isAdvisor && (
            <Button onClick={() => navigate('/logs')} variant="outline" className="rounded-xl font-black text-[10px] uppercase h-10">
              <Activity className="w-4 h-4 mr-2" /> Log Sistem
            </Button>
          )}
          {isMT && <AddTaskModal onTaskAdded={fetchData} />}
        </div>
      </header>

      {/* ── CLUB SWITCHER (multi-kelab) ── */}
      <ClubSwitcher />

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(isAdvisor || isPresident) && <StatCard label="Perlu Kelulusan" val={tasks.filter((t: any) => t.approval_status === 'WAITING').length} color="text-rose-600" icon={Clock} bg="bg-rose-500/10" />}
        <StatCard label="Ahli Aktif" val={members.length} color="text-primary" icon={Users} bg="bg-primary/10" />
        <StatCard label="Tugasan" val={tasks.length} color="text-amber-600" icon={Activity} bg="bg-amber-500/10" />
        <StatCard label="Aktiviti" val={activities.length} color="text-emerald-600" icon={TrendingUp} bg="bg-emerald-500/10" />
      </div>

      {/* ── CLUB ANALYTICS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-premium rounded-[2.5rem] bg-card p-8 border border-border/50 backdrop-blur-md">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black italic">Prestasi Tugasan</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Taburan Tugasan Dibekalkan</p>
            </div>
            <Activity className="text-primary" size={24} />
          </div>
          <div className="h-[250px] w-full flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={clubStats.taskProgress} 
                  innerRadius={60} 
                  outerRadius={85} 
                  paddingAngle={8} 
                  dataKey="value"
                  stroke="none"
                >
                  {clubStats.taskProgress.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Legend 
                  verticalAlign="middle" 
                  align="right" 
                  layout="vertical"
                  iconType="circle"
                  formatter={(value) => <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-none shadow-premium rounded-[2.5rem] bg-card p-8 border border-border/50 backdrop-blur-md">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black italic">Status Aktiviti</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Kitaran Hidup Program</p>
            </div>
            <TrendingUp className="text-emerald-500" size={24} />
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={clubStats.activityTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 900, fill: 'hsl(var(--muted-foreground))' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 800, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ borderRadius: '1.2rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#10b981" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── KIRI: SENARAI TUGASAN + JEJAK PROGRAM ── */}
        <div className="lg:col-span-2 space-y-8">

          {/* SEKSYEN: JEJAK PROGRAM (MT & PRESIDENT SAHAJA) */}
          {(isPresident || isMT) && (
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <FileCheck className="text-primary" size={24} /> Jejak Program
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wider">Status Kertas Kerja di JPP</p>
                </div>
                <Button onClick={() => navigate('/aktiviti')} size="sm" className="rounded-xl font-black text-[10px] uppercase h-10 bg-slate-900 px-6">
                  <Send className="w-3 h-3 mr-2" /> Daftar Program
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {programs.length === 0 ? (
                  <div className="col-span-2 py-8">
                    <Empty className="rounded-[2.5rem] border-dashed border-2 bg-muted/20 border-border/40">
                      <EmptyMedia variant="icon">
                        <FileText className="w-6 h-6" />
                      </EmptyMedia>
                      <EmptyHeader>
                        <EmptyTitle className="text-sm font-black uppercase tracking-widest">Tiada Program Ditemui</EmptyTitle>
                        <EmptyDescription className="text-xs">
                          Anda belum mendaftarkan sebarang program rasmi untuk kitaran ini.
                        </EmptyDescription>
                      </EmptyHeader>
                      <Button onClick={() => navigate('/aktiviti')} variant="outline" size="sm" className="rounded-xl font-black text-[10px] uppercase h-10 px-6">
                        Daftar Program Sekarang
                      </Button>
                    </Empty>
                  </div>
                ) : (
                  programs.map(p => <ProgramStatusCard key={p.id} program={p} onUnlock={handleRequestUnlock} />)
                )}
              </div>
            </Card>
          )}

          <Card className="border-none shadow-xl rounded-[2.5rem] bg-card/70 backdrop-blur-md overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-card/30 flex flex-row items-center justify-between px-8 py-6">
              <CardTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
                {taskView === 'active' ? (isNormalMember ? 'Tugasan Saya' : 'Senarai Tugasan') : 'Arkib Tugasan'}
                {taskView === 'archive' && <Archive size={20} className="text-muted-foreground" />}
              </CardTitle>
              <div className="flex bg-muted/30 p-1 rounded-xl border border-border/50">
                <button onClick={() => setTaskView('active')} className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", taskView === 'active' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Aktif</button>
                <button onClick={() => setTaskView('archive')} className={cn("px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all", taskView === 'archive' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>Arkib</button>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              {tasks.length === 0 ? (
                <Empty className="py-12 border-none">
                  <EmptyMedia variant="icon">
                    <CheckCircle2 className="w-6 h-6" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle className="text-sm font-black uppercase tracking-widest">Semua Selesai!</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      Tiada tugasan {taskView === 'active' ? 'aktif' : 'dalam arkib'} buat masa ini.
                    </EmptyDescription>
                  </EmptyHeader>
                  {isMT && taskView === 'active' && <AddTaskModal onTaskAdded={fetchData} />}
                </Empty>
              ) : (
                tasks.map((task) => (
                  <TaskItem key={task.id} task={task} isNormalMember={isNormalMember} canApprove={isAdvisor} onOpen={() => { setSelectedTask(task); setIsDetailOpen(true); }} onApprove={handleApproveTask} onReject={handleRejectTask} onVerify={handleVerifyTask} />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── KANAN: SIDEBAR ── */}
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-950 p-8 text-white shadow-2xl">
            <div className="absolute -right-8 -top-8 text-white/5 opacity-20">
              <Activity size={200} />
            </div>
            <div className="relative space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                    <Medal size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-white/60">Amanat Penasihat</h4>
                    <p className="text-[10px] font-bold text-white/40 uppercase">Terkini</p>
                  </div>
                </div>
                {isAdvisor && (
                  <EditAnnouncementModal currentContent={announcement} onUpdate={fetchData} clubId={profile?.club_id} />
                )}
              </div>
              <div className="relative">
                <span className="absolute -left-4 -top-4 text-4xl font-serif text-white/20">"</span>
                <p className="pl-2 text-base font-medium italic text-slate-200 leading-relaxed">
                  {announcement}
                </p>
                <span className="absolute -bottom-4 right-0 text-4xl font-serif text-white/20">"</span>
              </div>
            </div>
          </div>

          <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-6 border border-border/40">
            <CardTitle className="text-xl font-black mb-6 flex items-center gap-2">
              <Trophy className="text-amber-500" size={20} /> Ahli Cemerlang
            </CardTitle>
            <div className="space-y-4">
              {members.sort((a, b) => (b.merit || 0) - (a.merit || 0)).slice(0, 3).map((m, i) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 group hover:bg-primary/5 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-xs", i === 0 ? "bg-amber-500/10 text-amber-600" : i === 1 ? "bg-muted/50 text-muted-foreground" : "bg-orange-500/10 text-orange-600")}>
                      {i === 0 ? <Star size={16} /> : i + 1}
                    </div>
                    <span className="text-xs font-bold truncate max-w-[100px]">{m.full_name}</span>
                  </div>
                  <Badge variant="outline" className="font-black text-primary border-primary/20 bg-background">{m.merit || 0} pts</Badge>
                </div>
              ))}
              <Button onClick={() => navigate('/leaderboard')} variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2 group">Lihat Semua Ranking <ArrowUpRight size={14} className="ml-2" /></Button>
            </div>
          </Card>
        </div>
      </div>

      <TaskDetailModal task={selectedTask} isOpen={isDetailOpen} onClose={() => setIsDetailOpen(false)} onRefresh={fetchData} userRole={userRole} currentUserId={user?.id} />
    </motion.div>
  );
}

function StatCard({ label, val, color, icon: Icon, bg }: any) {
  return (
    <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden relative group bg-card">
      <div className={cn("absolute -right-4 -top-4 opacity-[0.03] transition-opacity", color)}><Icon size={120} /></div>
      <CardContent className="p-6">
        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4", bg)}><Icon className={cn("w-5 h-5", color)} /></div>
        <p className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-widest">{label}</p>
        <p className={cn("text-4xl font-black mt-1 tracking-tighter", color)}>{val}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page-container space-y-10 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-card/40 p-8 rounded-[2.5rem] border border-border/60">
        <div className="space-y-4 w-full max-w-md">
          <div className="flex gap-2">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-24 h-6 rounded-lg" />
          </div>
          <Skeleton className="w-full h-12 rounded-2xl" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <Skeleton className="w-32 h-10 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="border-none shadow-sm rounded-[2rem] p-6 h-32 bg-card">
            <Skeleton className="w-10 h-10 rounded-2xl mb-4" />
            <Skeleton className="w-20 h-4 rounded-md mb-2" />
            <Skeleton className="w-12 h-8 rounded-lg" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[1, 2].map(i => (
          <Card key={i} className="border-none shadow-premium rounded-[2.5rem] bg-card p-8 h-[350px]">
             <div className="flex justify-between mb-8">
                <div className="space-y-2">
                  <Skeleton className="w-32 h-6 rounded-lg" />
                  <Skeleton className="w-48 h-3 rounded-md" />
                </div>
                <Skeleton className="w-8 h-8 rounded-lg" />
             </div>
             <Skeleton className="w-full h-48 rounded-3xl" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-card p-8 h-[400px]">
            <div className="flex justify-between mb-8">
              <Skeleton className="w-40 h-8 rounded-xl" />
              <Skeleton className="w-32 h-10 rounded-xl" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="w-full h-20 rounded-[1.5rem]" />)}
            </div>
          </Card>
        </div>
        <div className="space-y-8">
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-primary/10 p-8 h-48">
            <Skeleton className="w-32 h-6 rounded-lg mb-4" />
            <Skeleton className="w-full h-20 rounded-2xl" />
          </Card>
          <Card className="border-none shadow-xl rounded-[2.5rem] bg-white p-8 h-64">
            <Skeleton className="w-40 h-8 rounded-xl mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="w-full h-12 rounded-2xl" />)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}