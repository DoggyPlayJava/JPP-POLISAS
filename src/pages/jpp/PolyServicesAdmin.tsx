import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Search, Loader2, Trash2, Users, Home, ShieldAlert, CheckCircle, XCircle, AlertTriangle, MessageSquare, Shield, Clock, UserCircle2, Check, Pin, Share2, BarChart } from 'lucide-react';
import { cn, hexToRgba } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { useJppConfig } from '@/contexts/JppConfigContext';
import { useAuth } from '@/contexts/AuthContext';
import { JPP_THEME_DEFAULT_COLOR, JPP_MODULE_ID } from './jppConfig';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { IGStoryExportCard } from '@/components/polysuara/IGStoryExportCard';

type Tab = 'POLYSUARA' | 'ANALITIK';

import { Settings } from 'lucide-react';
import { FeatureToggle } from '@/components/ui/FeatureToggle';

import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

export function PolyServicesAdmin({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const { profile } = useAuth();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState<Tab | 'SETTINGS'>(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'settings') return 'SETTINGS';
    return 'POLYSUARA';
  });
  
  const [themeColor, setThemeColor] = useState(JPP_THEME_DEFAULT_COLOR);
  
  // Data States
  const [suaraList, setSuaraList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Comments Moderation States
  const [reportedComments, setReportedComments] = useState<any[]>([]);
  const [activeCommentsText, setActiveCommentsText] = useState<any[]>([]);

  // Settings States
  const [modConfig, setModConfig] = useState({ report_threshold: 5, time_window_mins: 10 });
  const [savingConfig, setSavingConfig] = useState(false);
  const [notifConfig, setNotifConfig] = useState({ upvote_threshold: 10, last_notified_at: null as string | null });
  const [savingNotifConfig, setSavingNotifConfig] = useState(false);

  useEffect(() => {
    supabase.from('portal_settings')
      .select('color')
      .eq('exco_module', JPP_MODULE_ID)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.color) setThemeColor(data.color);
      });

    // Fetch moderation config
    supabase.from('polyservices_moderation_config').select('*').eq('id', 1).maybeSingle()
      .then(({ data }) => {
        if (data) setModConfig({ report_threshold: data.report_threshold, time_window_mins: data.time_window_mins });
      });

    // Fetch notification config
    supabase.from('polysuara_notif_state').select('upvote_threshold, last_notified_at').eq('id', 1).maybeSingle()
      .then(({ data }) => {
        if (data) setNotifConfig({ upvote_threshold: data.upvote_threshold ?? 10, last_notified_at: data.last_notified_at });
      });
  }, []);

  const [censoredWords, setCensoredWords] = useState<any[]>([]);
  const [newWord, setNewWord] = useState('');

  const [activeExportId, setActiveExportId] = useState<string | null>(null);
  const [shareLoadingId, setShareLoadingId] = useState<string | null>(null);

  const fetchCensoredWords = async () => {
    const { data } = await supabase.from('polysuara_censored_words').select('*').order('created_at', { ascending: false });
    if (data) setCensoredWords(data);
  };

  useEffect(() => {
    if (activeTab === 'POLYSUARA' || activeTab === 'ANALITIK') {
      fetchData();
    }
    if (activeTab === 'SETTINGS' || activeTab === 'ANALITIK') {
      fetchCensoredWords();
    }
  }, [activeTab]);

  const addCensoredWord = async () => {
    if (!newWord.trim()) return;
    try {
      const { error } = await supabase.from('polysuara_censored_words').insert({ word: newWord.trim().toLowerCase(), added_by: profile?.id });
      if (error) throw error;
      setNewWord('');
      fetchCensoredWords();
      toast.success('Perkataan ditambah');
    } catch (e) {
      toast.error('Gagal tambah atau perkataan sudah wujud');
    }
  };

  const removeCensoredWord = async (id: string) => {
    try {
      const { error } = await supabase.from('polysuara_censored_words').delete().eq('id', id);
      if (error) throw error;
      fetchCensoredWords();
      toast.success('Perkataan dibuang');
    } catch (e) {
      toast.error('Gagal buang perkataan');
    }
  };


  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const { error } = await supabase.from('polyservices_moderation_config')
        .update({ 
          report_threshold: modConfig.report_threshold, 
          time_window_mins: modConfig.time_window_mins,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);
      if (error) throw error;
      toast.success('Konfigurasi auto-hide dikemaskini');
    } catch (e: any) {
      toast.error('Gagal kemaskini tetapan');
    } finally {
      setSavingConfig(false);
    }
  };

  const saveNotifConfig = async () => {
    setSavingNotifConfig(true);
    try {
      const { error } = await supabase.from('polysuara_notif_state')
        .update({ upvote_threshold: notifConfig.upvote_threshold })
        .eq('id', 1);
      if (error) throw error;
      toast.success('Tetapan notifikasi dikemaskini');
    } catch (e: any) {
      toast.error('Gagal kemaskini tetapan notifikasi');
    } finally {
      setSavingNotifConfig(false);
    }
  };

  const resetNotifCooldown = async () => {
    try {
      const { error } = await supabase.from('polysuara_notif_state')
        .update({ last_notified_at: null, last_confession_id: null })
        .eq('id', 1);
      if (error) throw error;
      setNotifConfig(prev => ({ ...prev, last_notified_at: null }));
      toast.success('Cooldown notifikasi ditetapkan semula');
    } catch (e: any) {
      toast.error('Gagal menetapkan semula cooldown');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'POLYSUARA' || activeTab === 'ANALITIK') {
        const [suaraRes, reportsRes, reportedCommentsRes, commentReportsRes, activeCommentsRes] = await Promise.all([
          supabase.from('polysuara_confessions').select('id, content, category, upvotes, downvotes, created_at, official_reply, official_reply_at, status, codename, hashtags, author_reply, author_reply_at, image_url, is_pinned, is_approved, is_hidden_by_community, author_id, profiles:author_id(full_name, matric_no)').eq('is_archived', false).order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(500),
          supabase.from('polyservices_reports').select('target_id, reason, created_at, profiles:reporter_id(matric_no)').eq('target_type', 'SUARA'),
          supabase.from('polysuara_comments').select('id, confession_id, content, codename, is_hidden_by_community, upvotes, downvotes, reports_count, created_at, profiles:user_id(matric_no)').or('reports_count.gt.0,is_hidden_by_community.eq.true').order('created_at', { ascending: false }),
          supabase.from('polysuara_comment_reports').select('comment_id, reason, profiles:reporter_id(matric_no)'),
          supabase.from('polysuara_comments').select('content').eq('is_hidden_by_community', false).limit(1000)
        ]);
        
        if (suaraRes.error) throw suaraRes.error;
        
        const mappedData = (suaraRes.data || []).map(item => ({
          ...item,
          reports: (reportsRes.data || []).filter(r => r.target_id === item.id)
        }));
        
        setSuaraList(mappedData);

        const mappedComments = (reportedCommentsRes.data || []).map(comment => ({
          ...comment,
          reports: (commentReportsRes.data || []).filter(r => r.comment_id === comment.id)
        }));
        setReportedComments(mappedComments);
        setActiveCommentsText(activeCommentsRes.data || []);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuatkan data');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreComment = async (id: string) => {
    try {
      const { error } = await supabase.rpc('restore_hidden_comment', {
        p_comment_id: id
      });
      if (error) throw error;
      toast.success('Ulasan berjaya dipulihkan');
      setReportedComments(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memulihkan ulasan');
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!window.confirm('Padam atau sembunyikan ulasan ini secara kekal? (Jika mempunyai balasan di bawahnya, ia akan disembunyikan menggunakan amaran tombstone bagi mengekalkan struktur perbualan)')) return;
    try {
      const { data: wasSoftDeleted, error } = await supabase.rpc('soft_or_hard_delete_polysuara_comment', {
        p_comment_id: id
      });
      if (error) throw error;
      
      if (wasSoftDeleted) {
        toast.success('Ulasan disembunyikan dengan selamat (tombstoned)');
      } else {
        toast.success('Ulasan dipadamkan secara kekal');
      }
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal memproses pemadaman ulasan');
    }
  };

  const handleDeleteSuara = async (id: string) => {
    if (!window.confirm('Padam confession ini secara kekal?')) return;
    try {
      const { error } = await supabase.from('polysuara_confessions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Confession dipadam');
      setSuaraList(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      toast.error('Gagal memadam data');
    }
  };

  const handleToggleSuaraApproval = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('polysuara_confessions')
        .update({ is_approved: !currentStatus })
        .eq('id', id);
      if (error) throw error;
      toast.success(!currentStatus ? 'Confession diluluskan' : 'Confession disembunyikan');
      setSuaraList(prev => prev.map(item => item.id === id ? { ...item, is_approved: !currentStatus } : item));
    } catch (err: any) {
      toast.error('Gagal kemaskini status');
    }
  };

  const handleRestoreHidden = async (id: string) => {
    try {
      const { error } = await supabase.rpc('restore_hidden_confession', {
        p_confession_id: id
      });
      if (error) throw error;
      toast.success('Confession dikembalikan ke paparan awam');
      setSuaraList(prev => prev.map(item => item.id === id ? { ...item, is_hidden_by_community: false, is_approved: true, downvotes: 0 } : item));
    } catch (err: any) {
      toast.error('Gagal memulihkan confession');
    }
  };

  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from('polysuara_confessions')
        .update({ is_pinned: !currentPinned })
        .eq('id', id);
      if (error) throw error;
      toast.success(!currentPinned ? 'Disematkan (Pinned)' : 'Nyahsemat (Unpinned)');
      setSuaraList(prev => {
        const list = prev.map(item => item.id === id ? { ...item, is_pinned: !currentPinned } : item);
        return list.sort((a, b) => {
          if (a.is_pinned === b.is_pinned) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return a.is_pinned ? -1 : 1;
        });
      });
    } catch (err: any) {
      toast.error('Gagal menyematkan luahan');
    }
  };


  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState('RESOLVED');
  const [isReplying, setIsReplying] = useState(false);

  const submitReply = async () => {
    if (!replyTargetId || !replyText.trim() || !profile) return;
    setIsReplying(true);
    try {
      const { error } = await supabase.from('polysuara_confessions')
        .update({
          official_reply: replyText.trim(),
          official_reply_at: new Date().toISOString(),
          replied_by: profile.id,
          status: replyStatus
        })
        .eq('id', replyTargetId);
      
      if (error) throw error;
      toast.success('Maklum balas JPP telah dihantar');
      setReplyModalOpen(false);
      setReplyText('');
      setReplyTargetId(null);
      fetchData(); // Refresh to show the new reply
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal menghantar maklum balas');
    } finally {
      setIsReplying(false);
    }
  };

  const STOP_WORDS = ['yang', 'dan', 'ini', 'di', 'untuk', 'ada', 'itu', 'ke', 'dari', 'pada', 'dengan', 'saya', 'dia', 'tak', 'nak', 'ni', 'tu', 'je', 'kat', 'dalam', 'kalau', 'boleh', 'dah', 'kenapa', 'macam', 'kami'];

  const getWordCloud = () => {
    const wordCounts: Record<string, number> = {};
    const dynamicProfanity = censoredWords.map(cw => cw.word.toLowerCase());
    
    // Process confessions
    suaraList.forEach(s => {
      const words = s.content.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
      words.forEach((w: string) => {
        if (w.length > 3 && !STOP_WORDS.includes(w) && !dynamicProfanity.includes(w)) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      });
    });

    // Process comments
    activeCommentsText.forEach(c => {
      const words = c.content.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
      words.forEach((w: string) => {
        if (w.length > 3 && !STOP_WORDS.includes(w) && !dynamicProfanity.includes(w)) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      });
    });
    
    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 40)
      .map(([text, value]) => ({ text, value }));
  };

  const getCategoryData = () => {
    const counts: Record<string, number> = {};
    suaraList.forEach(s => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6'];
    return Object.entries(counts).map(([name, value], i) => ({
      name,
      value,
      color: COLORS[i % COLORS.length]
    }));
  };

  const handleShareImage = async (id: string) => {
    setActiveExportId(id);
    setTimeout(async () => {
      const el = document.getElementById(`export-card-${id}`);
      if (!el) {
        setActiveExportId(null);
        return;
      }
      try {
        setShareLoadingId(id);
        const canvas = await html2canvas(el, { 
          backgroundColor: '#020617', 
          scale: 2, 
          useCORS: true,
          logging: false
        });
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (!blob) throw new Error('Failed to create image');
        
        const file = new File([blob], `polysuara-${id}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'PolySuara Confession',
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `polysuara-${id}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error(err);
        toast.error('Gagal mengeksport luahan.');
      } finally {
        setShareLoadingId(null);
        setActiveExportId(null);
      }
    }, 100);
  };

  const filteredSuara = suaraList.filter(s => 
    s.content.toLowerCase().includes(search.toLowerCase()) || 
    s.profiles?.matric_no?.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    // Force auto-hidden items to the very top
    if (a.is_hidden_by_community && !b.is_hidden_by_community) return -1;
    if (!a.is_hidden_by_community && b.is_hidden_by_community) return 1;
    // Pinned next
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    // Finally created_at
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });


  return (
    <div className={cn(
      "flex flex-col space-y-6",
      isEmbedded ? "min-h-0 p-0" : "min-h-full p-4 sm:p-8"
    )}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-7 h-7" style={{ color: themeColor }} />
            Moderasi PolyServices
          </h1>
          <p className="text-sm text-white/50 mt-1">Pantau dan urus kandungan pengguna untuk modul PolySuara.</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/5 border border-white/10 p-2 rounded-2xl">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('POLYSUARA')}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'POLYSUARA' ? "text-white shadow-lg" : "text-white/40 hover:text-white/80 hover:bg-white/5"
            )}
            style={{ background: activeTab === 'POLYSUARA' ? hexToRgba(themeColor, 0.2) : undefined }}
          >
            PolySuara
          </button>

          <button
            onClick={() => setActiveTab('ANALITIK')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center gap-2",
              activeTab === 'ANALITIK' ? "text-white shadow-lg" : "text-white/40 hover:text-white/80 hover:bg-white/5"
            )}
            style={{ background: activeTab === 'ANALITIK' ? hexToRgba(themeColor, 0.2) : undefined }}
          >
            <BarChart className="w-4 h-4" />
            <span className="hidden sm:inline">ANALITIK</span>
          </button>
          
          <div className="w-px h-6 bg-white/10 mx-1"></div>
          
          <button
            onClick={() => setActiveTab('SETTINGS')}
            className={cn(
              "px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all flex items-center gap-2",
              activeTab === 'SETTINGS' ? "text-white shadow-lg" : "text-white/40 hover:text-white/80 hover:bg-white/5"
            )}
            style={{ background: activeTab === 'SETTINGS' ? hexToRgba(themeColor, 0.2) : undefined }}
            title="Tetapan & Kawalan Modul"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">TETAPAN</span>
          </button>
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 text-white/40 absolute left-4 top-1/2 -translate-y-1/2" />
          <input 
            type="text"
            placeholder="Cari kandungan / matrik..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex-1 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-white/40 py-20">
            <Loader2 className="w-8 h-8 animate-spin mb-4" style={{ color: themeColor }} />
            <p className="text-xs font-bold uppercase tracking-widest animate-pulse">Memuatkan Rekod...</p>
          </div>
        ) : activeTab === 'SETTINGS' ? (
          <div className="max-w-xl space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Kawalan Modul</h3>
                <p className="text-sm text-white/50">Buka atau tutup modul-modul ini kepada pelajar secara global.</p>
              </div>
              <div className="flex flex-col gap-3">
                <FeatureToggle 
                  moduleId="polysuara" 
                  label="Modul PolySuara" 
                  description="Benarkan pelajar menghantar dan melihat confession" 
                />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Tetapan Auto-Hide (Laporan Awam)</h3>
                <p className="text-sm text-white/50">Jika pengguna melaporkan post/iklan melebihi had dalam tempoh masa tertentu, ia akan disembunyikan secara automatik.</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/70">Jumlah Laporan (Threshold)</label>
                <input 
                  type="number" min="1"
                  value={modConfig.report_threshold}
                  onChange={(e) => setModConfig({ ...modConfig, report_threshold: parseInt(e.target.value) || 5 })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/70">Tempoh Masa (Minit)</label>
                <input 
                  type="number" min="1"
                  value={modConfig.time_window_mins}
                  onChange={(e) => setModConfig({ ...modConfig, time_window_mins: parseInt(e.target.value) || 10 })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                />
              </div>
              <button
                onClick={saveConfig}
                disabled={savingConfig}
                className="w-full py-3 rounded-xl text-sm font-black text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                style={{ background: themeColor }}
              >
                {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Simpan Tetapan
              </button>
              </div>
            </div>
            
            {/* Notification Settings */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  🔔 Tetapan Notifikasi PolySuara
                </h3>
                <p className="text-sm text-white/50">Kawal ambang (threshold) upvote untuk mencetuskan notifikasi push kepada pelajar. Max 1 notifikasi sejam. Jika tiada post layak dalam 3 jam, notifikasi akan dihantar untuk post terbaik walaupun di bawah threshold.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-white/70">Minimum Upvotes untuk Notifikasi</label>
                <input
                  type="number" min="1" max="100"
                  value={notifConfig.upvote_threshold}
                  onChange={(e) => setNotifConfig({ ...notifConfig, upvote_threshold: parseInt(e.target.value) || 10 })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30"
                />
                <p className="text-xs text-white/30">Sekarang: {notifConfig.upvote_threshold} upvotes. Cadangan: 5 (komuniti kecil), 10 (standard), 20 (komuniti aktif).</p>
              </div>

              {notifConfig.last_notified_at && (
                <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 text-sm text-teal-300">
                  ✅ Notifikasi terakhir: <span className="font-bold">{new Date(notifConfig.last_notified_at).toLocaleString('ms-MY')}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={saveNotifConfig}
                  disabled={savingNotifConfig}
                  className="flex-1 py-3 rounded-xl text-sm font-black text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  style={{ background: themeColor }}
                >
                  {savingNotifConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Simpan Threshold
                </button>
                <button
                  onClick={resetNotifCooldown}
                  className="px-4 py-3 rounded-xl text-sm font-black text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2 border border-white/10"
                  title="Reset cooldown supaya notifikasi boleh dihantar segera"
                >
                  <XCircle className="w-4 h-4" />
                  Reset Cooldown
                </button>
              </div>
            </div>

            {/* Sensor Words Management */}
            <div className="space-y-4 pt-6 border-t border-white/10">
              <div className="space-y-2">
                <h3 className="text-lg font-black text-white">Pengurusan Perkataan Sensor</h3>
                <p className="text-sm text-white/50">Perkataan dalam senarai ini akan digantikan secara automatik kepada *** sebelum dipaparkan di PolySuara.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  type="text" 
                  placeholder="Tambah perkataan kesat/lucah..."
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCensoredWord()}
                  className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500/50"
                />
                <button
                  onClick={addCensoredWord}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                  style={{ background: themeColor }}
                >
                  Tambah
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {censoredWords.length === 0 ? (
                  <span className="text-sm text-white/30 italic">Tiada perkataan sensor ditetapkan.</span>
                ) : (
                  censoredWords.map(w => (
                    <div key={w.id} className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg text-sm font-medium text-rose-300">
                      <span>{w.word}</span>
                      <button onClick={() => removeCensoredWord(w.id)} className="text-rose-400 hover:text-white transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
          </div>
        ) : activeTab === 'POLYSUARA' ? (
          <div className="space-y-6">
            {/* Sentiment Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="text-[10px] sm:text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 break-words">Diterima / Selesai</div>
                <div className="text-2xl font-black text-white">{suaraList.filter(s => s.status === 'ACKNOWLEDGED' || s.status === 'RESOLVED').length}</div>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-widest mb-1 break-words">Baru / Disiasat</div>
                <div className="text-2xl font-black text-white">{suaraList.filter(s => s.status === 'NEW' || s.status === 'INVESTIGATING').length}</div>
              </div>
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                <div className="text-[10px] sm:text-xs font-bold text-rose-400 uppercase tracking-widest mb-1 break-words">Dilaporkan (Flagged)</div>
                <div className="text-2xl font-black text-white">{suaraList.filter(s => s.reports && s.reports.length > 0).length}</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <div className="text-[10px] sm:text-xs font-bold text-blue-400 uppercase tracking-widest mb-1 break-words">Total Interaksi (Upvote)</div>
                <div className="text-2xl font-black text-white">{suaraList.reduce((acc, curr) => acc + (curr.upvotes || 0), 0)}</div>
              </div>
            </div>

            {/* Reported Comments Section */}
            {reportedComments.length > 0 && (
              <div className="bg-rose-500/5 border border-rose-500/20 rounded-[2rem] p-6 mb-6">
                <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  🚨 Ulasan Dilaporkan / Auto-Hide ({reportedComments.length})
                </h3>
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 no-scrollbar">
                  {reportedComments.map(comment => (
                    <div key={comment.id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-rose-300">{comment.codename}</span>
                          <span className="text-[10px] text-white/40">{format(new Date(comment.created_at), 'dd MMM, HH:mm', { locale: ms })}</span>
                          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                            Matrik: {comment.profiles?.matric_no || 'Anon'}
                          </span>
                          {comment.is_hidden_by_community && (
                            <span className="bg-red-500/20 text-red-400 text-[8px] font-black px-2 py-0.5 rounded border border-red-500/30 uppercase">Auto-Hide</span>
                          )}
                        </div>
                        <p className="text-xs text-white/90 leading-relaxed mb-2 font-medium">"{comment.content}"</p>
                        
                        {/* Reasons for comment reports */}
                        {comment.reports && comment.reports.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {comment.reports.map((rep: any, index: number) => (
                              <span key={index} className="text-[9px] text-amber-300 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded" title={`Reporter: ${rep.profiles?.reporter_id || 'Anon'}`}>
                                ⚠️ {rep.reason}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                        <button
                          onClick={() => handleRestoreComment(comment.id)}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Lepaskan
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Padam
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
            {filteredSuara.length === 0 ? (
              <div className="text-center py-20 text-white/40 font-bold uppercase tracking-widest text-xs">Tiada luahan ditemui.</div>
            ) : (
              filteredSuara.map(suara => (
                <div key={suara.id} className="bg-black/20 border border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between group hover:border-white/10 transition-colors">
                  <div className="flex-1">
                    <div className="flex flex-col mb-3">
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                         <div className="flex flex-wrap items-center gap-3">
                          {suara.is_hidden_by_community ? (
                            <span className="bg-red-500/20 text-red-400 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 border border-red-500/50 shrink-0">
                              🚨 MENUNGGU SEMAKAN (AUTO-HIDE)
                            </span>
                          ) : (
                            <span className={cn(
                              "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0",
                              suara.is_approved ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            )}>
                              {suara.is_approved ? "AKTIF" : "DISEMBUNYIKAN"}
                            </span>
                          )}
                          <span className="text-[10px] text-white/40 font-bold tracking-widest uppercase shrink-0">
                            {format(new Date(suara.created_at), 'dd MMM yyyy, HH:mm', { locale: ms })}
                          </span>
                          <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase ml-auto sm:ml-0 bg-indigo-500/10 px-2 rounded-md shrink-0">
                            {suara.profiles?.matric_no || 'UNKNOWN'}
                          </span>
                         </div>
                         <div className="flex flex-wrap gap-2">
                           {suara.is_pinned && <span className="bg-yellow-500/20 text-yellow-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0"><Pin className="w-3 h-3" /> Pinned</span>}
                           {suara.status === 'NEW' && <span className="bg-slate-800 text-slate-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">Baru</span>}
                           {suara.status === 'ACKNOWLEDGED' && <span className="bg-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0"><Check className="w-3 h-3"/> Diterima</span>}
                           {suara.status === 'INVESTIGATING' && <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0"><Clock className="w-3 h-3"/> Disiasat</span>}
                           {suara.status === 'RESOLVED' && <span className="bg-green-500/20 text-green-400 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shrink-0"><CheckCircle className="w-3 h-3"/> Selesai</span>}
                         </div>
                       </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-300">{suara.codename || 'Pelajar Anon'}</span>
                      </div>
                    </div>
                    
                    <p className="text-white/80 text-sm leading-relaxed mb-3">"{suara.content}"</p>
                    
                    {/* Hashtags */}
                    {suara.hashtags && suara.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {suara.hashtags.map((tag: string, i: number) => (
                          <span key={i} className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{tag}</span>
                        ))}
                      </div>
                    )}
                    
                    {suara.official_reply && (
                      <div className="mb-3 bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Shield className="w-3.5 h-3.5 text-teal-400" />
                          <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">Maklum Balas JPP</span>
                        </div>
                        <div className="text-teal-50/90 text-xs leading-relaxed">
                          <ReactMarkdown 
                            components={{
                              p: ({node, ...props}) => <p className="mb-1.5 last:mb-0" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-1.5" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-1.5" {...props} />,
                              li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-extrabold text-teal-300" {...props} />,
                              a: ({node, ...props}) => <a className="text-teal-300 underline hover:text-teal-200 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />
                            }}
                          >
                            {suara.official_reply}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {suara.author_reply && (
                      <div className="mb-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 ml-6">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <UserCircle2 className="w-3.5 h-3.5 text-rose-400" />
                          <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Balasan Pengarang</span>
                        </div>
                        <p className="text-rose-50/90 text-xs leading-relaxed">
                          {suara.author_reply}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4">
                      <div className="text-[10px] text-white/30 font-bold">👍 {suara.upvotes || 0} Sokong</div>
                      <div className="text-[10px] text-white/30 font-bold">👎 {suara.downvotes || 0} Bantah</div>
                      {suara.reports && suara.reports.length > 0 && (
                        <div className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {suara.reports.length} Laporan
                        </div>
                      )}
                    </div>
                    {suara.reports && suara.reports.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
                        {suara.reports.map((r: any, idx: number) => (
                          <div key={idx} className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-xs text-amber-200">
                            <span className="font-bold opacity-70">Sebab:</span> {r.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                    {suara.is_hidden_by_community ? (
                      <>
                        <button
                          onClick={() => handleRestoreHidden(suara.id)}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span className="hidden sm:inline">Lepaskan</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSuara(suara.id)}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Padam</span>
                        </button>
                      </>
                    ) : (
                      <>
                        {!suara.official_reply && (
                          <button
                            onClick={() => {
                              setReplyTargetId(suara.id);
                              setReplyModalOpen(true);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20"
                          >
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden sm:inline">Balas</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleSuaraApproval(suara.id, suara.is_approved)}
                          className={cn(
                            "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2",
                            suara.is_approved 
                              ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" 
                              : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                          )}
                        >
                          {suara.is_approved ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          <span className="hidden sm:inline">{suara.is_approved ? "Sembunyikan" : "Luluskan"}</span>
                        </button>
                        <button
                          onClick={() => handleTogglePin(suara.id, !!suara.is_pinned)}
                          className={cn(
                            "px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2",
                            suara.is_pinned ? "bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          )}
                        >
                          <Pin className="w-4 h-4" />
                          <span className="hidden sm:inline">{suara.is_pinned ? "Unpin" : "Pin"}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSuara(suara.id)}
                          className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Padam</span>
                        </button>
                        <button
                          onClick={() => handleShareImage(suara.id)}
                          disabled={shareLoadingId === suara.id}
                          className="px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-2"
                        >
                          {shareLoadingId === suara.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                          <span className="hidden sm:inline">IG Story</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
        ) : activeTab === 'ANALITIK' ? (
          <div className="space-y-8">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-black text-emerald-400 mb-6 flex items-center gap-2">
                <BarChart className="w-5 h-5" />
                Demografi Kategori Luahan
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getCategoryData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {getCategoryData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-6">
              <h3 className="text-lg font-black text-indigo-400 mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Awan Perkataan (Word Cloud) - Isu Panas
              </h3>
              <div className="flex flex-wrap gap-3 items-center justify-center min-h-[250px] p-6 bg-black/20 rounded-xl">
                {getWordCloud().map((w, i) => {
                  const scale = Math.max(0.8, Math.min(2.5, w.value / 3));
                  return (
                    <span 
                      key={i} 
                      className="font-black transition-all hover:scale-110"
                      style={{ 
                        fontSize: `${scale}rem`,
                        color: `hsl(${220 + (i * 15)}, 80%, ${60 + (i % 30)}%)`,
                        opacity: 0.7 + (scale * 0.1)
                      }}
                    >
                      {w.text}
                    </span>
                  )
                })}
                {getWordCloud().length === 0 && (
                  <div className="text-white/40 font-bold text-sm uppercase tracking-widest">Tiada Data Tersedia</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMatch.length === 0 ? (
              <div className="col-span-full text-center py-20 text-white/40 font-bold uppercase tracking-widest text-xs">Tiada iklan ditemui.</div>
            ) : (
              filteredMatch.map(match => (
                <div key={match.id} className="bg-black/20 border border-white/5 rounded-2xl p-5 flex flex-col justify-between group hover:border-white/10 transition-colors">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5",
                        "bg-teal-500/10 text-teal-400"
                      )}>
                        <Home className="w-3 h-3" />
                        SEWA
                      </span>
                      <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase bg-indigo-500/10 px-2 rounded-md">
                        {match.profiles?.matric_no || 'UNKNOWN'}
                      </span>
                    </div>
                    <h3 className="text-white font-black text-lg mb-2">{match.title}</h3>
                    <p className="text-white/60 text-sm line-clamp-2 mb-2">Lokasi: {match.lokasi}</p>
                    <p className="text-white/60 text-xs font-bold mb-4">RM{match.sewa_bulanan}/bulan • {match.jantina_prefer}</p>
                    
                    {match.reports && match.reports.length > 0 && (
                      <div className="mb-4 space-y-2 border-t border-white/5 pt-3">
                        <div className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mb-2">
                          <AlertTriangle className="w-3 h-3" />
                          {match.reports.length} Laporan
                        </div>
                        {match.reports.map((r: any, idx: number) => (
                          <div key={idx} className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-xs text-amber-200">
                            <span className="font-bold opacity-70">Sebab:</span> {r.reason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <span className="text-[10px] text-white/40 font-bold uppercase">
                      {format(new Date(match.created_at), 'dd MMM yyyy', { locale: ms })}
                    </span>
                    <button
                      onClick={() => handleDeleteMatch(match.id)}
                      className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Padam Iklan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* JPP Reply Modal */}
      <AnimatePresence>
        {replyModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReplyModalOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[200]"
            />
            <div className="fixed inset-0 flex items-center justify-center p-4 z-[201] pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-sm bg-slate-900 border border-teal-500/30 rounded-[2rem] shadow-2xl p-6 pointer-events-auto"
              >
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-400" />
                  Maklum Balas JPP
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  Berikan maklum balas rasmi dari pihak pengurusan/JPP untuk luahan ini.
                </p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Taip jawapan rasmi di sini..."
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl p-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none transition-all mb-4"
                  rows={4}
                />
                
                <div className="mb-6">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Status Laporan</label>
                  <select 
                    value={replyStatus} 
                    onChange={(e) => setReplyStatus(e.target.value)}
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-sm font-medium text-white outline-none focus:border-teal-500/50"
                  >
                    <option value="ACKNOWLEDGED">Maklumat Diterima (Acknowledged)</option>
                    <option value="INVESTIGATING">Sedang Disiasat (Investigating)</option>
                    <option value="RESOLVED">Selesai (Resolved)</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setReplyModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    disabled={!replyText.trim() || isReplying}
                    onClick={submitReply}
                    className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                  >
                    {isReplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Hantar Jawapan
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {activeExportId && suaraList.find(c => c.id === activeExportId) && (
        <IGStoryExportCard 
          confession={suaraList.find(c => c.id === activeExportId)} 
          elementId={`export-card-${activeExportId}`} 
        />
      )}
    </div>
  );
}
