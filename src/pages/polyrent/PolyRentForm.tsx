import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, ChevronRight, ChevronLeft, Save, Loader2, Info, Plus, CheckCircle, Map, MessageCircle, Navigation } from 'lucide-react';
import { MapPicker } from '@/components/MapPicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

interface PolyRentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Koordinat POLISAS
const POLISAS_LAT = 3.8519;
const POLISAS_LNG = 103.3283;

// Haversine Formula for distance
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

export function PolyRentForm({ onClose, onSuccess }: PolyRentFormProps) {
  const { profile } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    lokasi: '',
    kawasan_id: '',
    jantina_prefer: 'CAMPURAN',
    sewa_bulanan: '',
    deposit_awal: '',
    kekosongan: '',
    susunan_bilik: '',
    kemudahan: '',
    ciri_ciri_dicari: '',
    contact_info: profile?.phone || '', // Auto-pull but editable
    enable_in_app_chat: true,
    image_files: [] as File[],
    latitude: 0,
    longitude: 0,
    jarak_polisas_km: 0,
    available_from: new Date().toISOString().split('T')[0]
  });

  const [averageRentWarning, setAverageRentWarning] = useState<string | null>(null);
  const [kawasanList, setKawasanList] = useState<any[]>([]);

  useEffect(() => {
    const fetchKawasan = async () => {
      const { data } = await supabase.from('klk_kawasan').select('*').eq('is_active', true).order('name');
      if (data) setKawasanList(data);
    };
    fetchKawasan();
  }, []);

  // Smart Pricing Engine (Fasa 1)
  useEffect(() => {
    const checkAverage = async () => {
      if (!formData.lokasi || !formData.sewa_bulanan) {
        setAverageRentWarning(null);
        return;
      }
      try {
        const { data, error } = await supabase.rpc('polyrent_get_average_rent', { lokasi_query: formData.lokasi });
        if (error) throw error;
        
        const avg = Number(data);
        const myPrice = Number(formData.sewa_bulanan);
        
        if (avg > 0 && myPrice > avg * 1.15) { // If price is 15% higher than average
          setAverageRentWarning(`Harga sewa ini ${((myPrice - avg)/avg*100).toFixed(0)}% lebih tinggi dari purata pasaran di kawasan tersebut (RM${avg.toFixed(0)}). Ini mungkin melambatkan proses carian penyewa.`);
        } else {
          setAverageRentWarning(null);
        }
      } catch (err) {
        console.error("Failed to fetch average rent", err);
      }
    };
    
    // Debounce slightly by just running it
    const timeout = setTimeout(checkAverage, 1000);
    return () => clearTimeout(timeout);
  }, [formData.lokasi, formData.sewa_bulanan]);

  // Load Draft from LocalStorage
  useEffect(() => {
    if (profile) {
      const draftKey = `polyrent_draft_${profile.id}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          // Only use draft if it has actual changes to avoid overriding contact info default incorrectly
          if (parsed.title || parsed.lokasi) {
            setFormData(prev => ({ ...prev, ...parsed }));
            toast.success('Draf disimpan sebelum ini dipulihkan.', { icon: '📝' });
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      }
    }
  }, [profile]);

  // Auto-Save Draft
  useEffect(() => {
    if (profile) {
      const draftKey = `polyrent_draft_${profile.id}`;
      // Avoid saving completely empty form as draft immediately
      if (formData.title || formData.lokasi || formData.sewa_bulanan) {
        localStorage.setItem(draftKey, JSON.stringify(formData));
      }
    }
  }, [formData, profile]);

  const handleInputChange = (field: string, value: string | number | File[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Map pin handler — auto-calculate distance dari pin position
  const handleMapPin = (pos: [number, number]) => {
    const [lat, lng] = pos;
    const distance = getDistanceFromLatLonInKm(POLISAS_LAT, POLISAS_LNG, lat, lng);
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      jarak_polisas_km: parseFloat(distance.toFixed(2)),
    }));
  };

  // Auto-fill lokasi from reverse geocode (when pin dropped)
  const handleMapName = (name: string) => {
    // Only auto-fill if user hasn't manually typed an address
    setFormData(prev => ({
      ...prev,
      lokasi: prev.lokasi || name,
    }));
  };

  const handleSubmit = async () => {
    if (!profile) return;
    
    // Validations
    if (!formData.title || !formData.lokasi || !formData.sewa_bulanan || !formData.contact_info || !formData.kawasan_id) {
      toast.error('Sila lengkapkan semua medan wajib');
      return;
    }

    setIsSubmitting(true);
    try {
      let uploadedImageUrls: string[] = [];

      if (formData.image_files && formData.image_files.length > 0) {
        // Upload all images in parallel
        const uploadPromises = formData.image_files.map(async (file) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${profile.id}_${Math.random()}.${fileExt}`;
          const filePath = `${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('polyrent')
            .upload(filePath, file);

          if (uploadError) {
            throw new Error('Gagal memuat naik gambar. Sila cuba lagi.');
          }

          const { data: publicUrlData } = supabase.storage
            .from('polyrent')
            .getPublicUrl(filePath);

          return publicUrlData.publicUrl;
        });

        uploadedImageUrls = await Promise.all(uploadPromises);
      }

      const { error } = await supabase.from('polyrent_listings').insert({
        author_id: profile.id,
        title: formData.title,
        lokasi: formData.lokasi,
        kawasan_id: formData.kawasan_id,
        jantina_prefer: formData.jantina_prefer,
        sewa_bulanan: parseFloat(formData.sewa_bulanan) || 0,
        deposit_awal: parseFloat(formData.deposit_awal) || 0,
        kekosongan: parseInt(formData.kekosongan) || 1,
        susunan_bilik: formData.susunan_bilik,
        kemudahan: formData.kemudahan,
        ciri_ciri_dicari: formData.ciri_ciri_dicari,
        contact_info: formData.contact_info,
        enable_in_app_chat: formData.enable_in_app_chat,
        jarak_polisas_km: formData.jarak_polisas_km || null,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        image_url: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
        images: uploadedImageUrls,
        available_from: formData.available_from
      });

      if (error) throw error;
      
      // Clear draft on success
      localStorage.removeItem(`polyrent_draft_${profile.id}`);
      
      toast.success('Iklan berjaya diterbitkan!');
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Ralat semasa menghantar borang');
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-xl h-full bg-white dark:bg-slate-950 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5 bg-white dark:bg-slate-900">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Cipta Iklan Sewa</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Langkah {step} daripada 4</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <motion.div 
            className="h-full bg-teal-500"
            initial={{ width: '25%' }}
            animate={{ width: `${(step / 4) * 100}%` }}
            transition={{ ease: "easeInOut" }}
          />
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          
          {/* STEP 1: Asas & Kewangan */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tajuk Iklan <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Cth: Bilik Sewa Kosong Balok (Lelaki)"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Sewa Bulanan (RM) <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    placeholder="150"
                    value={formData.sewa_bulanan}
                    onChange={(e) => handleInputChange('sewa_bulanan', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Deposit (RM)</label>
                  <input
                    type="number"
                    placeholder="300"
                    value={formData.deposit_awal}
                    onChange={(e) => handleInputChange('deposit_awal', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kekosongan (Orang)</label>
                  <input
                    type="number"
                    placeholder="2"
                    value={formData.kekosongan}
                    onChange={(e) => handleInputChange('kekosongan', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Jantina</label>
                  <select
                    value={formData.jantina_prefer}
                    onChange={(e) => handleInputChange('jantina_prefer', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                  >
                    <option value="CAMPURAN">Campuran (Any)</option>
                    <option value="LELAKI">Lelaki Sahaja</option>
                    <option value="PEREMPUAN">Perempuan Sahaja</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tarikh Kekosongan (Available From)</label>
                <input
                  type="date"
                  value={formData.available_from}
                  onChange={(e) => handleInputChange('available_from', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Gambar Kediaman (Max 3)</label>
                
                {formData.image_files.length > 0 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {formData.image_files.map((file, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-white/10">
                        <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => {
                            const newFiles = [...formData.image_files];
                            newFiles.splice(idx, 1);
                            handleInputChange('image_files', newFiles);
                          }}
                          className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {formData.image_files.length < 3 && (
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []) as File[];
                        const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
                        
                        if (validFiles.length < files.length) {
                          toast.error('Beberapa gambar melebihi 5MB diabaikan');
                        }

                        const newFiles = [...formData.image_files, ...validFiles].slice(0, 3);
                        handleInputChange('image_files', newFiles);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-full px-4 py-6 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center transition-all group-hover:border-teal-500 group-hover:bg-teal-500/5">
                      <Plus className="w-6 h-6 mb-2 text-slate-400" />
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Tambah Gambar</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Fasiliti */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Susunan Bilik</label>
                <textarea
                  placeholder="Cth: Bilik Master (Sharing 2 orang), ada katil dan tilam..."
                  rows={3}
                  value={formData.susunan_bilik}
                  onChange={(e) => handleInputChange('susunan_bilik', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Kemudahan (Fasiliti)</label>
                <textarea
                  placeholder="Cth: Mesin basuh, Peti sejuk, WiFi percuma..."
                  rows={3}
                  value={formData.kemudahan}
                  onChange={(e) => handleInputChange('kemudahan', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ciri-ciri rakan rumah dicari</label>
                <textarea
                  placeholder="Cth: Pembersih, boleh bayar sewa on time, tidak merokok..."
                  rows={3}
                  value={formData.ciri_ciri_dicari}
                  onChange={(e) => handleInputChange('ciri_ciri_dicari', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white resize-none"
                />
              </div>
            </motion.div>
          )}

          {/* STEP 3: Lokasi & Hubungan */}
          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nombor Telefon / WhatsApp <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Cth: 0123456789"
                  value={formData.contact_info}
                  onChange={(e) => handleInputChange('contact_info', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                />
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3"/> Ditarik auto dari profil, tapi boleh ditukar jika nombor berlainan.</p>
                {/* Warn if not a valid phone number */}
                {formData.contact_info && !/^[0-9\s\-\+\(\)]{8,20}$/.test(formData.contact_info) && (
                  <div className="mt-2 flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium p-3 rounded-xl border border-amber-200 dark:border-amber-500/20">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>Input ini nampak bukan nombor telefon. Hanya nombor telefon sahaja yang akan buka WhatsApp. Jika anda ingin pelajar hubungi melalui cara lain, aktifkan In-App Chat di bawah.</span>
                  </div>
                )}
              </div>

              {/* In-App Chat Toggle */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-teal-500" />
                      Benarkan In-App Chat
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">Pelajar boleh menghantar mesej terus kepada anda dalam aplikasi ini tanpa perlu WhatsApp.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, enable_in_app_chat: !prev.enable_in_app_chat }))}
                    className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${
                      formData.enable_in_app_chat ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      formData.enable_in_app_chat ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                {!formData.enable_in_app_chat && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg">
                    ⚠️ Chat dimatikan. Pastikan nombor telefon/WhatsApp anda diisi dengan betul di atas.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Zon KLK (Kawasan) <span className="text-rose-500">*</span></label>
                <select
                  value={formData.kawasan_id}
                  onChange={(e) => {
                    handleInputChange('kawasan_id', e.target.value);
                    const selectedKawasan = kawasanList.find(k => k.id === e.target.value);
                    if (selectedKawasan && !formData.lokasi) {
                      handleInputChange('lokasi', selectedKawasan.name);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white mb-4"
                >
                  <option value="">Pilih Kawasan KLK...</option>
                  {kawasanList.map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1 mb-4 flex items-center gap-1"><Info className="w-3 h-3"/> Rating keselamatan akan dipautkan kepada zon ini.</p>

                {/* Alamat penuh — untuk display dalam listing */}
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Alamat Penuh <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Cth: No 12, Lorong Kempadang Makmur 23, Taman Kempadang Makmur Fasa 2"
                  value={formData.lokasi}
                  onChange={(e) => handleInputChange('lokasi', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                />
                <p className="text-xs text-slate-500 mt-1 mb-4">Alamat ini dipaparkan dalam iklan. Tidak digunakan untuk GPS.</p>
              </div>

              {/* Map Pin Picker */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pin Lokasi Rumah di Peta <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3 flex items-start gap-1.5">
                  <Navigation className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-500" />
                  Ketik pada peta untuk letakkan pin di lokasi rumah. Jarak ke POLISAS dikira automatik.
                </p>
                <div className="h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
                  <MapPicker
                    position={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                    onPositionChange={handleMapPin}
                    onNameChange={handleMapName}
                    label="Rumah Sewa"
                  />
                </div>
              </div>

              {/* Jarak auto-result */}
              {formData.jarak_polisas_km > 0 ? (
                <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                    <Map className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-teal-900 dark:text-teal-100">Jarak ke POLISAS</h4>
                    <p className="text-teal-600 dark:text-teal-400 font-medium">{formData.jarak_polisas_km} KM</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Sila pin lokasi pada peta di atas. Ini membantu pelajar melihat jarak anggaran ke POLISAS.</span>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: Preview */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-white/5">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">{formData.title || 'Tiada Tajuk'}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">Sewa Bulanan</span>
                    <span className="font-bold text-slate-900 dark:text-white">RM{formData.sewa_bulanan || '0'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">Kekosongan</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formData.kekosongan || '0'} Orang</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">Jantina</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formData.jantina_prefer}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">Jarak</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formData.jarak_polisas_km ? `${formData.jarak_polisas_km} KM` : 'Tidak disemak'}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10">
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">Lokasi</span>
                    <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{formData.lokasi}</span>
                  </div>
                  {formData.ciri_ciri_dicari && (
                    <div>
                      <span className="block text-xs text-slate-500 font-medium">Ciri-ciri dicari</span>
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{formData.ciri_ciri_dicari}</span>
                    </div>
                  )}
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">Tarikh Kekosongan</span>
                    <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{formData.available_from}</span>
                  </div>
                </div>
              </div>

              {averageRentWarning && (
                <div className="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 p-4 rounded-xl flex items-start gap-3">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{averageRentWarning}</p>
                </div>
              )}

              <div className="bg-blue-500/10 text-blue-700 dark:text-blue-400 p-4 rounded-xl flex items-start gap-3">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm font-medium">Sila pastikan maklumat adalah tepat. Anda boleh memadam iklan ini jika sudah penuh.</p>
              </div>
            </motion.div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 font-bold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Kembali
            </button>
          ) : (
             <button
              onClick={() => {
                localStorage.removeItem(`polyrent_draft_${profile?.id}`);
                setFormData({
                  title: '', lokasi: '', jantina_prefer: 'CAMPURAN', sewa_bulanan: '', deposit_awal: '', kekosongan: '', susunan_bilik: '', kemudahan: '', ciri_ciri_dicari: '', contact_info: profile?.phone || '', image_files: [], latitude: 0, longitude: 0, jarak_polisas_km: 0
                });
                toast.success('Draf dipadamkan');
              }}
              className="px-5 py-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-sm transition-colors"
            >
              Clear Draft
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:scale-105 active:scale-95 transition-transform"
            >
              Seterusnya <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-teal-500 text-white font-bold hover:bg-teal-600 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Terbitkan
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
