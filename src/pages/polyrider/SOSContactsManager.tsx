import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Plus, Trash2, UserCircle, MessageCircle, X, Save, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const MAX_CONTACTS = 3;

interface SOSContact {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

interface SOSContactsManagerProps {
  /** If true, render as a full drawer/sheet (for settings page) */
  fullPage?: boolean;
  /** If provided, render as a post-SOS notification sheet */
  postSOSMode?: boolean;
  jobLocation?: string;
  onClose?: () => void;
}

export function SOSContactsManager({ fullPage = false, postSOSMode = false, jobLocation, onClose }: SOSContactsManagerProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<SOSContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', relation: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchContacts();
  }, [user]);

  const fetchContacts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('polyrider_sos_contacts')
      .select('*')
      .eq('user_id', user!.id)
      .order('created_at');
    if (data) setContacts(data);
    setLoading(false);
  };

  const addContact = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error('Nama dan no. telefon wajib diisi.'); return;
    }
    if (contacts.length >= MAX_CONTACTS) {
      toast.error(`Maksimum ${MAX_CONTACTS} kenalan kecemasan sahaja.`); return;
    }
    // Normalize phone — strip spaces/dashes and add 60 prefix
    let phone = form.phone.replace(/[\s\-]/g, '');
    if (phone.startsWith('0')) phone = '6' + phone;
    if (!phone.startsWith('6')) phone = '60' + phone;

    setSaving(true);
    const { error } = await supabase.from('polyrider_sos_contacts').insert({
      user_id: user!.id,
      name: form.name.trim(),
      phone,
      relation: form.relation.trim() || 'Kenalan Kecemasan',
    });
    setSaving(false);
    if (!error) {
      toast.success('Kenalan ditambah!');
      setForm({ name: '', phone: '', relation: '' });
      setShowAddForm(false);
      fetchContacts();
    } else {
      toast.error('Gagal tambah kenalan.');
    }
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase.from('polyrider_sos_contacts').delete().eq('id', id);
    if (!error) { toast.success('Kenalan dipadam.'); fetchContacts(); }
  };

  const buildSOSMessage = (contact: SOSContact) => {
    const now = new Date().toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
    const loc = jobLocation ? ` Lokasi saya: ${jobLocation}` : '';
    return `🚨 SOS KECEMASAN!\nSaya memerlukan bantuan segera semasa menaiki PolyRider (${now}).${loc}\nSila hubungi saya atau beritahu pihak berkuasa. Terima kasih.`;
  };

  const openWhatsApp = (contact: SOSContact) => {
    const msg = encodeURIComponent(buildSOSMessage(contact));
    window.open(`https://wa.me/${contact.phone}?text=${msg}`, '_blank');
  };

  const openSMS = (contact: SOSContact) => {
    const msg = encodeURIComponent(buildSOSMessage(contact));
    window.open(`sms:${contact.phone}?body=${msg}`, '_blank');
  };

  const content = (
    <div className={fullPage ? 'max-w-xl mx-auto px-4 pb-32 pt-6' : 'p-4'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {postSOSMode ? 'Hantar Mesej Kecemasan' : 'Kenalan Kecemasan SOS'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
            {postSOSMode
              ? 'Tekan untuk hantar mesej kepada kenalan anda melalui WhatsApp atau SMS'
              : `Hingga ${MAX_CONTACTS} kenalan. Mereka akan dimaklumkan semasa SOS dicetuskan.`}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500 dark:text-white/60" />
          </button>
        )}
      </div>

      {/* Contact Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-20 bg-slate-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />)}
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 dark:bg-zinc-900 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 mb-4">
          <UserCircle className="w-10 h-10 text-slate-300 dark:text-white/20 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-400 dark:text-white/40">Tiada kenalan kecemasan</p>
          <p className="text-xs text-slate-400 dark:text-white/30 mt-1">Tambah kenalan supaya mereka boleh dimaklumkan semasa kecemasan.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-4">
          {contacts.map(contact => (
            <motion.div
              key={contact.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-white/5 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 dark:text-white text-sm">{contact.name}</p>
                    <p className="text-xs text-slate-500 dark:text-white/50">{contact.relation} · +{contact.phone}</p>
                  </div>
                </div>
                {!postSOSMode && (
                  <button onClick={() => deleteContact(contact.id)}
                    className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Action Buttons — always visible in post-SOS mode, hover in manage mode */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => openWhatsApp(contact)}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp SOS
                </button>
                <button
                  onClick={() => openSMS(contact)}
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  SMS SOS
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Contact Form */}
      {!postSOSMode && contacts.length < MAX_CONTACTS && (
        <AnimatePresence>
          {showAddForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-slate-50 dark:bg-zinc-900 rounded-2xl p-4 border border-slate-200 dark:border-white/10 overflow-hidden mb-3"
            >
              <p className="text-xs font-black text-slate-500 dark:text-white/50 uppercase tracking-widest mb-3">Kenalan Baharu</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Nama (Cth: Ibu, Ayah, Abang)"
                  value={form.name}
                  onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-300 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="tel"
                  placeholder="No. Telefon (Cth: 012-3456789)"
                  value={form.phone}
                  onChange={e => setForm({...form, phone: e.target.value})}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-300 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Hubungan (Cth: Ibu, Rakan, Pengawal)"
                  value={form.relation}
                  onChange={e => setForm({...form, relation: e.target.value})}
                  className="w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-300 focus:outline-none focus:border-amber-500"
                />
                <div className="flex gap-2">
                  <button onClick={addContact} disabled={saving}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                    <Save className="w-4 h-4" />
                    {saving ? 'Menyimpan...' : 'Simpan Kenalan'}
                  </button>
                  <button onClick={() => setShowAddForm(false)}
                    className="w-12 py-3 bg-slate-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-2xl text-sm font-bold text-slate-400 dark:text-white/40 flex items-center justify-center gap-2 hover:border-amber-400 hover:text-amber-500 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Tambah Kenalan Kecemasan ({contacts.length}/{MAX_CONTACTS})
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* Emergency fallback */}
      {postSOSMode && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
          <a href="tel:999"
            className="w-full py-3 bg-red-600 text-white font-black rounded-xl flex items-center justify-center gap-2 text-sm"
          >
            <Phone className="w-4 h-4" /> Hubungi Polis/Bomba: 999
          </a>
        </div>
      )}
    </div>
  );

  if (fullPage) return content;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/50 flex items-end"
        onClick={e => { if (e.target === e.currentTarget && onClose) onClose(); }}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="w-full bg-white dark:bg-zinc-950 rounded-t-[2rem] max-h-[90vh] overflow-y-auto shadow-[0_-10px_40px_rgba(0,0,0,0.2)]"
        >
          {content}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
