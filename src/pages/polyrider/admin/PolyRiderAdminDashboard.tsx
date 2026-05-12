import React, { useState, useEffect, useRef } from 'react';
import { Shield, CheckCircle, XCircle, FileText, MapPin, Plus, Trash2, GripVertical, Eye, EyeOff, Phone, AlertTriangle, Settings, Upload, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { notifyKLKOnSuspension } from '@/lib/polyRiderNotify';
import { uploadFileToDrive } from '@/lib/driveUpload';
export function PolyRiderAdminDashboard() {
  const [pendingRiders, setPendingRiders] = useState<any[]>([]);
  const [activeRiders, setActiveRiders] = useState<any[]>([]);
  const [systemActive, setSystemActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'riders' | 'presets' | 'sos' | 'settings' | 'appeals'>('riders');
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  const [klkPhoneSetting, setKlkPhoneSetting] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [whatsappSetting, setWhatsappSetting] = useState('');
  const [savingWhatsapp, setWhatsappSaving] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [savingQr, setSavingQr] = useState(false);

  // Location Presets State
  const [presets, setPresets] = useState<any[]>([]);
  const [newPreset, setNewPreset] = useState({ label: '', address: '', icon: '📍', lat: '', lng: '' });
  const [savingPreset, setSavingPreset] = useState(false);

  useEffect(() => {
    fetchData();
    fetchSystemSettings();
    fetchPresets();
    fetchSosAlerts();
    fetchAppeals();
    fetchKlkPhone();
    fetchWhatsappLink();
    fetchQrCode();
    
    // Lightweight 60s polling for SOS & Appeals (removed from Realtime publication
    // to reduce WAL overhead — these are admin-only, low-frequency features)
    const pollInterval = setInterval(() => {
      fetchSosAlerts();
      fetchAppeals();
    }, 60000);
      
    return () => {
      clearInterval(pollInterval);
    };
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'polyrider_active')
        .single();
      
      if (data) {
        setSystemActive(data.value === 'true');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleSystemStatus = async () => {
    const newStatus = !systemActive;
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'polyrider_active', value: String(newStatus) });

    if (!error) {
      setSystemActive(newStatus);
      toast.success(`Sistem PolyRider kini ${newStatus ? 'AKTIF' : 'DITUTUP'}`);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('polyrider_profiles')
      .select('*, profiles(full_name, avatar_url)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingRiders(data.filter(r => r.status === 'PENDING'));
      setActiveRiders(data.filter(r => r.status === 'APPROVED' || r.status === 'SUSPENDED'));
    }
    setLoading(false);
  };

  const fetchPresets = async () => {
    const { data } = await supabase.from('polyrider_location_presets')
      .select('*').order('sort_order');
    if (data) setPresets(data);
  };

  const fetchSosAlerts = async () => {
    // Step 1: Fetch SOS logs (simple — no joins to avoid silent failures)
    const { data: sosData, error: sosError } = await supabase
      .from('polyrider_sos_logs')
      .select('*')
      .or('resolved.eq.false,resolved.is.null')  // handle both false and NULL
      .order('created_at', { ascending: false });

    if (sosError) {
      console.error('[SOS Admin] fetchSosAlerts error:', sosError.message);
      return;
    }

    if (!sosData || sosData.length === 0) {
      setSosAlerts([]);
      return;
    }

    // Step 2: Enrich each SOS log with job + student + rider info
    const enriched = await Promise.all(
      sosData.map(async (sos) => {
        if (!sos.job_id) return sos;
        const { data: job } = await supabase
          .from('polyrider_jobs')
          .select('id, pickup_name, dropoff_name, proposed_price, student_id, rider_id, status')
          .eq('id', sos.job_id)
          .single();

        if (!job) return { ...sos, job: null };

        // Fetch student profile
        const { data: student } = job.student_id
          ? await supabase.from('profiles').select('full_name, matric_no').eq('id', job.student_id).single()
          : { data: null };

        // Fetch rider profile
        const { data: riderProfile } = job.rider_id
          ? await supabase.from('polyrider_profiles').select('plate_number').eq('user_id', job.rider_id).single()
          : { data: null };
        const { data: riderName } = job.rider_id
          ? await supabase.from('profiles').select('full_name').eq('id', job.rider_id).single()
          : { data: null };

        return {
          ...sos,
          job: {
            ...job,
            student,
            rider: riderProfile ? { ...riderProfile, profiles: riderName } : null,
          },
        };
      })
    );

    setSosAlerts(enriched);
  };

  const fetchAppeals = async () => {
    const { data, error } = await supabase
      .from('polyrider_appeals')
      .select('*, profiles!user_id(full_name, matric_no)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch appeals error:', error);
      toast.error('Gagal memuat turun senarai rayuan: ' + error.message);
    }
    if (data) {
      setAppeals(data);
    }
  };

  const processAppeal = async (appealId: string, approve: boolean) => {
    const notes = window.prompt(`Sila masukkan nota tindakan (pilihan) untuk ${approve ? 'kelulusan' : 'penolakan'} ini:`);
    if (notes === null) return; // Cancelled

    const { error } = await supabase.rpc('process_polyrider_appeal', {
      p_appeal_id: appealId,
      p_approve: approve,
      p_notes: notes
    });

    if (error) {
      toast.error('Gagal memproses rayuan. ' + error.message);
    } else {
      toast.success(approve ? 'Rayuan diluluskan' : 'Rayuan ditolak');
      fetchAppeals();
    }
  };

  const resolveSOS = async (sosId: string) => {
    const sos = sosAlerts.find(s => s.id === sosId);
    const { error } = await supabase.from('polyrider_sos_logs')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', sosId);
      
    if (!error) {
      if (sos && sos.job_id) {
        // Bebaskan rider/pelajar daripada status kecemasan dengan membatalkan tugasan
        await supabase.from('polyrider_jobs').update({ status: 'CANCELLED' }).eq('id', sos.job_id);
      }
      toast.success('Kes SOS diselesaikan.');
      fetchSosAlerts();
    } else {
      toast.error('Gagal menanda selesai.');
    }
  };

  const markSOSAsFake = async (sosId: string) => {
    const sos = sosAlerts.find(s => s.id === sosId);
    if (!sos) return;

    const notes = window.prompt('PENGGANTUNGAN: Sila masukkan nota untuk laporan khianat/palsu ini. Akaun pelapor akan digantung 24 jam.');
    if (notes === null) return;

    // 1. Update SOS Log
    const { error: sosError } = await supabase.from('polyrider_sos_logs')
      .update({ resolved: true, resolved_at: new Date().toISOString(), false_alarm: true, false_alarm_notes: notes })
      .eq('id', sosId);
      
    if (!sosError) {
      if (sos.job_id) {
        // Cancel the job
        await supabase.from('polyrider_jobs').update({ status: 'CANCELLED' }).eq('id', sos.job_id);
      }
      
      // 2. Suspend the user who triggered the SOS
      const suspendDate = new Date();
      suspendDate.setHours(suspendDate.getHours() + 24);
      
      const { error: profileError } = await supabase.from('profiles')
        .update({ 
          polyrider_suspended_until: suspendDate.toISOString(),
        })
        .eq('id', sos.triggered_by);
        
      if (profileError) {
         toast.error('SOS berjaya ditanda, TEPATI gagal menggantung akaun: ' + profileError.message);
      } else {
         toast.success('SOS ditanda palsu & akaun pelapor digantung 24 jam.');
         
         // Notify KLK via Email
         const { data: offenderData } = await supabase.from('profiles').select('full_name, matric_no').eq('id', sos.triggered_by).single();
         if (offenderData) {
           await notifyKLKOnSuspension(supabase, offenderData.full_name, offenderData.matric_no, `Khianat butang SOS (Nota Admin: ${notes})`);
         }
      }
      fetchSosAlerts();
    } else {
      console.error('SOS Update Error:', sosError);
      toast.error('Gagal memproses tindakan: ' + sosError.message);
    }
  };

  const fetchKlkPhone = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'klk_emergency_phone').single();
    if (data?.value) {
      try { setKlkPhoneSetting(JSON.parse(data.value)); } catch { setKlkPhoneSetting(data.value); }
    }
  };

  const saveKlkPhone = async () => {
    setSavingPhone(true);
    await supabase.from('system_settings').upsert({ key: 'klk_emergency_phone', value: JSON.stringify(klkPhoneSetting) });
    toast.success('No. telefon KLK dikemaskini!');
    setSavingPhone(false);
  };

  const fetchWhatsappLink = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'polyrider_whatsapp_link').single();
    if (data?.value) setWhatsappSetting(data.value);
  };

  const saveWhatsappLink = async () => {
    setWhatsappSaving(true);
    await supabase.from('system_settings').upsert({ key: 'polyrider_whatsapp_link', value: whatsappSetting });
    toast.success('Pautan WhatsApp dikemaskini!');
    setWhatsappSaving(false);
  };

  const fetchQrCode = async () => {
    const { data } = await supabase.from('system_settings').select('value').eq('key', 'polyrider_admin_qr').single();
    if (data?.value) {
      setQrPreview(data.value);
    }
  };

  const saveQrCode = async () => {
    if (!qrFile) return;
    setSavingQr(true);
    try {
      const url = await uploadFileToDrive(qrFile, 'polyrider-receipts');
      if (url) {
        await supabase.from('system_settings').upsert({ key: 'polyrider_admin_qr', value: url });
        setQrPreview(url);
        toast.success('QR Code berjaya dimuat naik!');
      } else {
        toast.error('Gagal memuat naik gambar.');
      }
    } catch (e: any) {
      toast.error(e.message || 'Ralat muat naik.');
    } finally {
      setSavingQr(false);
    }
  };

  const addPreset = async () => {
    if (!newPreset.label.trim() || !newPreset.address.trim()) {
      toast.error('Label dan alamat wajib diisi.'); return;
    }
    setSavingPreset(true);
    const { error } = await supabase.from('polyrider_location_presets').insert({
      label: newPreset.label.trim(),
      address: newPreset.address.trim(),
      icon: newPreset.icon || '📍',
      lat: newPreset.lat ? Number(newPreset.lat) : null,
      lng: newPreset.lng ? Number(newPreset.lng) : null,
      sort_order: presets.length + 1,
    });
    setSavingPreset(false);
    if (error) { toast.error('Gagal tambah preset.'); return; }
    toast.success('Preset ditambah!');
    setNewPreset({ label: '', address: '', icon: '📍', lat: '', lng: '' });
    fetchPresets();
  };

  const togglePreset = async (id: string, current: boolean) => {
    await supabase.from('polyrider_location_presets').update({ is_active: !current }).eq('id', id);
    fetchPresets();
  };

  const deletePreset = async (id: string) => {
    if (!window.confirm('Padam preset ini?')) return;
    await supabase.from('polyrider_location_presets').delete().eq('id', id);
    toast.success('Preset dipadam.');
    fetchPresets();
  };

  const handleApprove = async (id: string) => {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30); // 30 hari
    
    const { error } = await supabase
      .from('polyrider_profiles')
      .update({ 
        status: 'APPROVED', 
        updated_at: new Date().toISOString(),
        subscription_valid_until: validUntil.toISOString()
      })
      .eq('user_id', id);

    if (!error) {
      toast.success('Pendaftaran diluluskan & langganan diaktifkan 30 hari!');
      fetchData();
    } else {
      toast.error('Gagal meluluskan pendaftaran.');
    }
  };

  const handleReject = async (id: string) => {
    if (!window.confirm('Pasti untuk tolak pendaftaran ini?')) return;
    const { error } = await supabase
      .from('polyrider_profiles')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('user_id', id);

    if (!error) {
      toast.success('Pendaftaran ditolak.');
      fetchData();
    } else {
      toast.error('Ralat.');
    }
  };

  const handleSuspend = async (id: string) => {
    if (!window.confirm('Pasti untuk gantung rider ini? Mereka tidak akan dapat bertugas.')) return;
    const { error } = await supabase
      .from('polyrider_profiles')
      .update({ status: 'SUSPENDED', is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', id);

    if (!error) {
      toast.success('Rider telah digantung.');
      fetchData();
    } else {
      toast.error('Ralat menggantung rider.');
    }
  };

  const handleResume = async (id: string) => {
    if (!window.confirm('Pasti untuk sambung tugas rider ini?')) return;
    const { error } = await supabase
      .from('polyrider_profiles')
      .update({ status: 'APPROVED', updated_at: new Date().toISOString() })
      .eq('user_id', id);

    if (!error) {
      toast.success('Tugas rider telah disambung.');
      fetchData();
    } else {
      toast.error('Ralat menyambung rider.');
    }
  };

  const getDaysRemaining = (validUntil: string | null) => {
    if (!validUntil) return 0;
    const diffTime = new Date(validUntil).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 dark:text-white/50 animate-pulse">Memuatkan data admin...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-32 pt-4 px-4 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Kawalan KLK <Shield className="w-6 h-6 text-amber-500" />
          </h1>
          <p className="text-xs font-bold text-slate-500 dark:text-white/50 uppercase tracking-widest mt-1">
            Pengurusan PolyRider
          </p>
        </div>

        {/* Master Switch */}
        <button 
          onClick={toggleSystemStatus}
          className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2 ${
            systemActive 
              ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-rose-500 text-white shadow-rose-500/20'
          }`}
        >
          {systemActive ? 'SISTEM ON' : 'SISTEM OFF'}
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1.5 mb-8 bg-slate-100 dark:bg-zinc-900 p-1 rounded-2xl overflow-x-auto">
        <button onClick={() => setActiveTab('riders')}
          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
            activeTab === 'riders' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-white/40'
          }`}>Pengurusan Rider</button>
        <button onClick={() => setActiveTab('presets')}
          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
            activeTab === 'presets' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-white/40'
          }`}><MapPin className="w-3 h-3" /> Preset</button>
        <button onClick={() => setActiveTab('sos')}
          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap relative ${
            activeTab === 'sos' ? 'bg-red-500 text-white shadow-sm' : 'text-red-500 dark:text-red-400'
          }`}>
          <AlertTriangle className="w-3 h-3" /> SOS
          {sosAlerts.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce">
              {sosAlerts.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('appeals')}
          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 whitespace-nowrap relative ${
            activeTab === 'appeals' ? 'bg-blue-500 text-white shadow-sm' : 'text-blue-500 dark:text-blue-400'
          }`}>
          <FileText className="w-3 h-3" /> Rayuan
          {appeals.filter(a => a.status === 'PENDING').length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[8px] font-black rounded-full flex items-center justify-center animate-bounce">
              {appeals.filter(a => a.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1 whitespace-nowrap ${
            activeTab === 'settings' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 dark:text-white/40'
          }`}><Settings className="w-3 h-3" /> Tetapan</button>
      </div>

      {/* RIDERS TAB */}
      {activeTab === 'riders' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-[2rem] p-6 border border-amber-100 dark:border-amber-500/20">
          <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black text-amber-700 dark:text-amber-400 mb-1">{pendingRiders.length}</h3>
          <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest">Menunggu Kelulusan</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] p-6 border border-emerald-100 dark:border-emerald-500/20">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-black text-emerald-700 dark:text-emerald-400 mb-1">{activeRiders.length}</h3>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Rider Berdaftar</p>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          Permohonan Baharu <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px]">{pendingRiders.length}</span>
        </h2>
        
        <div className="space-y-4">
          {pendingRiders.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
              <p className="text-xs font-bold text-slate-400 dark:text-white/30 uppercase tracking-widest">Tiada Permohonan</p>
            </div>
          ) : (
            pendingRiders.map(rider => (
              <div key={rider.user_id} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-5 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={rider.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${rider.profiles?.full_name}&background=random`} alt="avatar" className="w-12 h-12 rounded-full bg-slate-100 object-cover" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{rider.profiles?.full_name}</p>
                      <p className="text-xs font-medium text-slate-500 dark:text-white/50">{rider.vehicle_type} • {rider.plate_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {(rider.receipt_url || rider.license_url) && (
                      <a 
                        href={rider.receipt_url || rider.license_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 rounded-xl"
                      >
                        Lihat Resit
                      </a>
                    )}
                    <button onClick={() => handleApprove(rider.user_id)} className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-colors">
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleReject(rider.user_id)} className="w-10 h-10 rounded-xl bg-rose-100 text-rose-500 hover:bg-rose-200 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 flex items-center justify-center transition-colors">
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Semua Rider</h2>
        <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-1 shadow-lg shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/5 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 border-b border-slate-100 dark:border-white/5">Rider</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 border-b border-slate-100 dark:border-white/5">Kenderaan</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 border-b border-slate-100 dark:border-white/5">Status</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-white/40 border-b border-slate-100 dark:border-white/5">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {activeRiders.map(rider => {
                const daysRemaining = getDaysRemaining(rider.subscription_valid_until);
                return (
                  <tr key={rider.user_id} className={`hover:bg-slate-50 dark:hover:bg-white dark:bg-zinc-900/5 transition-colors ${rider.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>
                    <td className="p-4 border-b border-slate-50 dark:border-white/5">
                      <p className="font-bold text-sm text-slate-900 dark:text-white">{rider.profiles?.full_name}</p>
                      {rider.status === 'SUSPENDED' && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-md mt-1 inline-block">Digantung</span>}
                    </td>
                    <td className="p-4 border-b border-slate-50 dark:border-white/5">
                      <p className="text-xs font-bold text-slate-500 dark:text-white/60">{rider.plate_number}</p>
                    </td>
                    <td className="p-4 border-b border-slate-50 dark:border-white/5">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md w-fit ${
                          rider.is_active ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20' : 'bg-slate-100 text-slate-500 dark:bg-white dark:bg-zinc-900/10 dark:text-white/40'
                        }`}>
                          {rider.is_active ? 'On-Duty' : 'Off-Duty'}
                        </span>
                        {rider.status === 'APPROVED' && (
                          <span className={`text-[10px] font-bold ${daysRemaining <= 3 ? 'text-rose-500' : 'text-slate-400 dark:text-white/40'}`}>
                            {daysRemaining} hari lagi
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 border-b border-slate-50 dark:border-white/5">
                      {rider.status === 'APPROVED' ? (
                        <button onClick={() => handleSuspend(rider.user_id)} className="text-[10px] font-black uppercase tracking-widest bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 px-3 py-2 rounded-xl transition-colors">
                          Gantung Tugas
                        </button>
                      ) : (
                        <button onClick={() => handleResume(rider.user_id)} className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 px-3 py-2 rounded-xl transition-colors">
                          Sambung Tugas
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* PRESETS TAB */}
      {activeTab === 'presets' && (
        <div className="space-y-6">
          {/* Add Form */}
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-5 border border-slate-100 dark:border-white/5">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-amber-500" /> Tambah Lokasi Baru
            </h2>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1 block">Label *</label>
                <input value={newPreset.label} onChange={e => setNewPreset({...newPreset, label: e.target.value})}
                  placeholder="Kamsis D" className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1 block">Icon Emoji</label>
                <input value={newPreset.icon} onChange={e => setNewPreset({...newPreset, icon: e.target.value})}
                  placeholder="📍" className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-400" />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1 block">Alamat / Huraian *</label>
              <input value={newPreset.address} onChange={e => setNewPreset({...newPreset, address: e.target.value})}
                placeholder="Kolej Kediaman D, POLISAS" className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1 block">Latitud (Opsional)</label>
                <input type="number" step="any" value={newPreset.lat} onChange={e => setNewPreset({...newPreset, lat: e.target.value})}
                  placeholder="3.8333" className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-400" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1 block">Longitud (Opsional)</label>
                <input type="number" step="any" value={newPreset.lng} onChange={e => setNewPreset({...newPreset, lng: e.target.value})}
                  placeholder="103.3167" className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-400" />
              </div>
            </div>
            <button onClick={addPreset} disabled={savingPreset}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> {savingPreset ? 'Menyimpan...' : 'Tambah Preset'}
            </button>
          </div>

          {/* Preset List */}
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-4">
              Preset Sedia Ada ({presets.length})
            </h2>
            <div className="space-y-3">
              {presets.length === 0 ? (
                <div className="text-center p-8 bg-slate-50 dark:bg-zinc-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-white/10">
                  <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">Tiada Preset</p>
                </div>
              ) : (
                presets.map(p => (
                  <div key={p.id} className={`bg-white dark:bg-zinc-900 rounded-2xl p-4 border flex items-center justify-between gap-3 ${
                    p.is_active ? 'border-slate-100 dark:border-white/5' : 'border-slate-200 dark:border-white/10 opacity-50'
                  }`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl shrink-0">{p.icon}</span>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 dark:text-white text-sm">{p.label}</p>
                        <p className="text-xs text-slate-400 dark:text-white/40 truncate">{p.address}</p>
                        {p.lat && <p className="text-[10px] text-slate-300 font-mono">{Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => togglePreset(p.id, p.is_active)}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                          p.is_active ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10' : 'bg-slate-100 text-slate-400 dark:bg-white dark:bg-zinc-900/5'
                        }`}>
                        {p.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deletePreset(p.id)}
                        className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* SOS TAB */}
      {activeTab === 'sos' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-black text-red-500 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Isyarat SOS Aktif
            </h2>
            <button onClick={fetchSosAlerts} className="text-[10px] font-black text-slate-400 dark:text-white/40 bg-slate-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg uppercase tracking-widest">
              ↻ Muat Semula
            </button>
          </div>

          {sosAlerts.length === 0 ? (
            <div className="text-center p-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="font-black text-emerald-700 dark:text-emerald-400">Tiada Kecemasan Aktif</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">Semua pelajar dan rider selamat.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sosAlerts.map(sos => {
                const student = sos.job?.student;
                const rider = sos.job?.rider;
                const mapsLink = (sos.lat && sos.lng) ? `https://maps.google.com/?q=${sos.lat},${sos.lng}` : null;
                const elapsed = Math.floor((Date.now() - new Date(sos.created_at).getTime()) / 60000);
                return (
                  <div key={sos.id} className="bg-red-50 dark:bg-red-500/10 border-2 border-red-200 dark:border-red-500/30 rounded-[2rem] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl animate-pulse">🚨</span>
                        <div>
                          <p className="font-black text-red-700 dark:text-red-400 text-sm">SOS KECEMASAN</p>
                          <p className="text-[10px] text-red-500 dark:text-red-400/70 font-bold">{elapsed} minit lepas</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black bg-red-500 text-white px-2 py-1 rounded-lg uppercase">Belum Selesai</span>
                    </div>

                    <div className="space-y-2 mb-4">
                      {student && (
                        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl p-3">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase">Pelajar</p>
                            <p className="font-black text-slate-900 dark:text-white text-sm">{student.full_name}</p>
                            {student.matric_no && <p className="text-xs text-slate-400">{student.matric_no}</p>}
                          </div>
                        </div>
                      )}
                      {rider && (
                        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl p-3">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase">Rider</p>
                            <p className="font-black text-slate-900 dark:text-white text-sm">{rider.profiles?.full_name}</p>
                            <p className="text-xs font-bold text-amber-500">{rider.plate_number}</p>
                          </div>
                        </div>
                      )}
                      {mapsLink && (
                        <a href={mapsLink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 text-blue-600 dark:text-blue-400 font-bold text-sm">
                          <MapPin className="w-4 h-4" /> Buka Lokasi GPS di Maps
                        </a>
                      )}
                      {!mapsLink && (
                        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3">
                          <p className="text-[10px] text-slate-400 dark:text-white/40 font-bold uppercase">Lokasi GPS</p>
                          <p className="text-sm font-bold text-slate-500 dark:text-white/60">Tidak tersedia</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => markSOSAsFake(sos.id)}
                        className="flex-1 py-3 bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-400 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <XCircle className="w-4 h-4" /> Khianat
                      </button>
                      <button
                        onClick={() => resolveSOS(sos.id)}
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-colors"
                      >
                        <CheckCircle className="w-5 h-5" /> Selesai
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* APPEALS TAB */}
      {activeTab === 'appeals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Pengurusan Rayuan Penggantungan</h2>
          </div>
          {appeals.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-12 text-center border border-slate-100 dark:border-white/5">
              <FileText className="w-12 h-12 text-slate-200 dark:text-white/10 mx-auto mb-4" />
              <p className="font-bold text-slate-400 dark:text-white/40">Tiada rekod rayuan setakat ini.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {appeals.map(appeal => (
                <div key={appeal.id} className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-lg">{appeal.profiles?.full_name}</p>
                      <p className="text-xs font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest">{appeal.profiles?.matric_no}</p>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                      appeal.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                      appeal.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-rose-100 text-rose-600'
                    }`}>
                      {appeal.status}
                    </span>
                  </div>
                  
                  <div className="bg-slate-50 dark:bg-zinc-800 rounded-xl p-4 mb-4">
                    <p className="text-[10px] font-bold text-slate-400 dark:text-white/40 uppercase tracking-widest mb-1">Sebab Rayuan</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{appeal.reason}</p>
                  </div>

                  {appeal.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => processAppeal(appeal.id, false)} className="flex-1 py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
                        Tolak
                      </button>
                      <button onClick={() => processAppeal(appeal.id, true)} className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20">
                        Luluskan
                      </button>
                    </div>
                  )}

                  {appeal.status !== 'PENDING' && appeal.admin_notes && (
                    <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 border-t dark:border-zinc-800 pt-2">
                      <span className="font-bold">Nota Tindakan:</span> {appeal.admin_notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Tetapan PolyRider</h2>
          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5">
            <label className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest block mb-2">No. Telefon Kecemasan KLK</label>
            <p className="text-[10px] text-slate-400 dark:text-white/30 mb-3">Nombor ini akan dipaparkan kepada pelajar dan rider selepas mereka mencetuskan SOS.</p>
            <div className="flex gap-3">
              <input
                type="tel"
                value={klkPhoneSetting}
                onChange={e => setKlkPhoneSetting(e.target.value)}
                placeholder="Cth: 09-9000000"
                className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
              <button onClick={saveKlkPhone} disabled={savingPhone}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl disabled:opacity-50 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {savingPhone ? '...' : 'Simpan'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5">
            <label className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest block mb-2">Pautan Komuniti WhatsApp</label>
            <p className="text-[10px] text-slate-400 dark:text-white/30 mb-3">Pautan ini akan dipaparkan kepada rider setelah pendaftaran mereka diluluskan.</p>
            <div className="flex gap-3">
              <input
                type="url"
                value={whatsappSetting}
                onChange={e => setWhatsappSetting(e.target.value)}
                placeholder="Cth: https://chat.whatsapp.com/..."
                className="flex-1 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
              />
              <button onClick={saveWhatsappLink} disabled={savingWhatsapp}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl disabled:opacity-50 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                {savingWhatsapp ? '...' : 'Simpan Pautan'}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5">
            <label className="text-xs font-black text-slate-400 dark:text-white/40 uppercase tracking-widest block mb-2">QR Code Bayaran Yuran PolyRider</label>
            <p className="text-[10px] text-slate-400 dark:text-white/30 mb-3">Sila muat naik QR Code (contohnya DuitNow) untuk pelajar membayar yuran langganan bulanan RM10.</p>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="border-2 border-dashed border-slate-200 dark:border-white/20 rounded-xl p-6 text-center hover:border-amber-500 transition-colors w-full md:w-1/2">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="qr-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setQrFile(file);
                      setQrPreview(URL.createObjectURL(file));
                    }
                  }}
                />
                <label htmlFor="qr-upload" className="cursor-pointer flex flex-col items-center">
                  <Upload className="w-8 h-8 text-slate-400 dark:text-white/40 mb-2" />
                  <span className="text-sm font-bold text-amber-600">{qrFile ? qrFile.name : 'Pilih Gambar QR'}</span>
                  <span className="text-xs text-slate-400 dark:text-white/40 mt-1">Sokongan JPG, PNG</span>
                </label>
              </div>
              
              <div className="w-full md:w-1/2 flex flex-col items-center">
                {qrPreview ? (
                  <img src={qrPreview} alt="QR Preview" className="w-48 h-48 object-contain rounded-xl border border-slate-200 dark:border-white/10 mb-4" />
                ) : (
                  <div className="w-48 h-48 bg-slate-50 dark:bg-zinc-800 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
                    <span className="text-xs font-bold text-slate-400">Tiada QR</span>
                  </div>
                )}
                
                <button onClick={saveQrCode} disabled={!qrFile || savingQr}
                  className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  {savingQr ? 'Memuat naik...' : 'Simpan QR Code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
