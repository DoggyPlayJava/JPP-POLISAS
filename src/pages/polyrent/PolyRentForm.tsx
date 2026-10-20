import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, MapPin, ChevronRight, ChevronLeft, Save, Loader2, Info, Plus, CheckCircle, Map, MessageCircle, Navigation, AlertTriangle } from 'lucide-react';
import { MapPicker } from '@/components/MapPicker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['housing', 'commerce', 'common']);
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
    contact_info: profile?.phone || '',
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
          setAverageRentWarning(
            t('housing:rent_above_average_warning', 'Harga sewa ini {{percent}}% lebih tinggi dari purata pasaran di kawasan tersebut (RM{{avg}}). Ini mungkin melambatkan proses carian penyewa.', {
              percent: ((myPrice - avg)/avg*100).toFixed(0),
              avg: avg.toFixed(0)
            })
          );
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
            const { image_files: _, ...cleanData } = parsed;
            setFormData(prev => ({ ...prev, ...cleanData, image_files: [] }));
            toast.success(t('housing:draft_restored_toast', 'Draf disimpan sebelum ini dipulihkan.'));
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
        const { image_files, ...draftData } = formData;
        localStorage.setItem(draftKey, JSON.stringify(draftData));
      }
    }
  }, [formData, profile]);

  const handleInputChange = (field: string, value: string | number | File[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-detect zon KLK terdekat dari koordinat pin — senyap tanpa notif
  const autoDetectKawasan = (lat: number, lng: number) => {
    const kawasanWithCoords = kawasanList.filter(k => k.latitude && k.longitude);
    if (kawasanWithCoords.length === 0) return;

    let nearest = kawasanWithCoords[0];
    let minDist = getDistanceFromLatLonInKm(lat, lng, parseFloat(nearest.latitude), parseFloat(nearest.longitude));

    for (const k of kawasanWithCoords) {
      const d = getDistanceFromLatLonInKm(lat, lng, parseFloat(k.latitude), parseFloat(k.longitude));
      if (d < minDist) { minDist = d; nearest = k; }
    }

    // Auto-assign jika dalam radius 5km — senyap, user tak nampak
    if (minDist <= 5) {
      setFormData(prev => ({ ...prev, kawasan_id: nearest.id }));
    } else {
      setFormData(prev => ({ ...prev, kawasan_id: '' }));
    }
  };

  // Map pin handler — auto-calculate distance + auto-detect zon
  const handleMapPin = (pos: [number, number]) => {
    const [lat, lng] = pos;
    const distance = getDistanceFromLatLonInKm(POLISAS_LAT, POLISAS_LNG, lat, lng);
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      jarak_polisas_km: parseFloat(distance.toFixed(2)),
    }));
    autoDetectKawasan(lat, lng);
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
    if (!formData.title || !formData.lokasi || !formData.sewa_bulanan || !formData.contact_info) {
      toast.error(t('housing:fill_all_required_fields_rent', 'Sila lengkapkan semua medan wajib (Tajuk, Alamat, Sewa, Hubungi)'));
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
            throw new Error(t('housing:upload_image_failed_retry', 'Gagal memuat naik gambar. Sila cuba lagi.'));
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
        kawasan_id: formData.kawasan_id || null,
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
      
      toast.success(t('housing:listing_published_success', 'Iklan berjaya diterbitkan!'));
      onSuccess();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('housing:form_submission_error', 'Ralat semasa menghantar borang'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="fixed inset-0 bg-slate-900/60  z-[200] flex justify-end">
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
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{t('commerce:rent_form_title', 'Cipta Iklan Sewa')}</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">{t('common:step', 'Langkah')} {step} / 4</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800">
          <motion.div 
            className="h-full w-full origin-left bg-teal-500"
            initial={{ scaleX: 0.25 }}
            animate={{ scaleX: (step / 4) }}
            transition={{ ease: "easeInOut" }}
          />
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          
          {/* STEP 1: Asas & Kewangan */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:ad_title_label', 'Tajuk Iklan')} <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder={t('housing:ad_title_placeholder', 'Cth: Bilik Sewa Kosong Balok (Lelaki)')}
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:monthly_rent_label', 'Sewa Bulanan (RM)')} <span className="text-rose-500">*</span></label>
                  <input
                    type="number"
                    placeholder="150"
                    value={formData.sewa_bulanan}
                    onChange={(e) => handleInputChange('sewa_bulanan', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:deposit_label', 'Deposit (RM)')}</label>
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
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:vacancies_label', 'Kekosongan (Orang)')}</label>
                  <input
                    type="number"
                    placeholder="2"
                    value={formData.kekosongan}
                    onChange={(e) => handleInputChange('kekosongan', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:gender_label', 'Jantina')}</label>
                  <select
                    value={formData.jantina_prefer}
                    onChange={(e) => handleInputChange('jantina_prefer', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                  >
                    <option value="CAMPURAN">{t('housing:gender_mixed', 'Campuran (Any)')}</option>
                    <option value="LELAKI">{t('housing:gender_male_only', 'Lelaki Sahaja')}</option>
                    <option value="PEREMPUAN">{t('housing:gender_female_only', 'Perempuan Sahaja')}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:available_from_label', 'Tarikh Kekosongan (Available From)')}</label>
                <input
                  type="date"
                  value={formData.available_from}
                  onChange={(e) => handleInputChange('available_from', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:property_images_label', 'Gambar Kediaman (Max 3)')}</label>
                
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
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{t('housing:add_photo_btn', 'Tambah Gambar')}</span>
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
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:room_layout_label', 'Susunan Bilik')}</label>
                <textarea
                  placeholder={t('housing:room_layout_placeholder', 'Cth: Bilik Master (Sharing 2 orang), ada katil dan tilam...')}
                  rows={3}
                  value={formData.susunan_bilik}
                  onChange={(e) => handleInputChange('susunan_bilik', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:facilities_heading', 'Kemudahan (Fasiliti)')}</label>
                <textarea
                  placeholder="Cth: Mesin basuh, Peti sejuk, WiFi percuma..."
                  rows={3}
                  value={formData.kemudahan}
                  onChange={(e) => handleInputChange('kemudahan', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:housemate_traits_label', 'Ciri-ciri rakan rumah dicari')}</label>
                <textarea
                  placeholder={t('housing:housemate_traits_placeholder', 'Cth: Pembersih, boleh bayar sewa on time, tidak merokok...')}
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
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:phone_whatsapp_label', 'Nombor Telefon / WhatsApp')} <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Cth: 0123456789"
                  value={formData.contact_info}
                  onChange={(e) => handleInputChange('contact_info', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                />
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Info className="w-3 h-3"/> {t('housing:auto_pulled_from_profile_note', 'Ditarik auto dari profil, tapi boleh ditukar jika nombor berlainan.')}</p>
                {/* Warn if not a valid phone number */}
                {formData.contact_info && !/^[0-9\s\-\+\(\)]{8,20}$/.test(formData.contact_info) && (
                  <div className="mt-2 flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium p-3 rounded-xl border border-amber-200 dark:border-amber-500/20">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{t('housing:phone_number_warning_note', 'Input ini nampak bukan nombor telefon. Hanya nombor telefon sahaja yang akan buka WhatsApp. Jika anda ingin pelajar hubungi melalui cara lain, aktifkan In-App Chat di bawah.')}</span>
                  </div>
                )}
              </div>

              {/* In-App Chat Toggle */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-teal-500" />
                      {t('housing:allow_in_app_chat', 'Benarkan In-App Chat')}
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">{t('housing:in_app_chat_desc', 'Pelajar boleh menghantar mesej terus kepada anda dalam aplikasi ini tanpa perlu WhatsApp.')}</p>
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
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{t('housing:chat_disabled_warning', 'Chat dimatikan. Pastikan nombor telefon/WhatsApp anda diisi dengan betul di atas.')}</span>
                  </p>
                )}
              </div>



              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{t('housing:full_address_label', 'Alamat Penuh')} <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  placeholder="Cth: No 12, Lorong Kempadang Makmur 23, Taman Kempadang Makmur Fasa 2"
                  value={formData.lokasi}
                  onChange={(e) => handleInputChange('lokasi', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:ring-2 focus:ring-teal-500/50 outline-none transition-all dark:text-white"
                />
                <p className="text-xs text-slate-500 mt-1 mb-4">{t('housing:address_ad_display_note', 'Alamat ini dipaparkan dalam iklan. Tidak digunakan untuk GPS.')}</p>
              </div>

              {/* Map Pin Picker */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('housing:pin_house_location_map', 'Pin Lokasi Rumah di Peta')} <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-3 flex items-start gap-1.5">
                  <Navigation className="w-3.5 h-3.5 mt-0.5 shrink-0 text-teal-500" />
                  {t('housing:tap_map_pin_desc', 'Ketik pada peta untuk letakkan pin di lokasi rumah. Jarak ke POLISAS dikira automatik.')}
                </p>
                <div className="h-64 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10">
                  <MapPicker
                    position={formData.latitude && formData.longitude ? [formData.latitude, formData.longitude] : null}
                    onPositionChange={handleMapPin}
                    onNameChange={handleMapName}
                    label={t('housing:rental_house_label', 'Rumah Sewa')}
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
                    <h4 className="font-bold text-teal-900 dark:text-teal-100">{t('housing:distance_to_polisas_label', 'Jarak ke POLISAS')}</h4>
                    <p className="text-teal-600 dark:text-teal-400 font-medium">{formData.jarak_polisas_km} KM</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t('housing:please_pin_location_hint', 'Sila pin lokasi pada peta di atas. Ini membantu pelajar melihat jarak anggaran ke POLISAS.')}</span>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: Preview */}
          {step === 4 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-white/5">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4">{formData.title || t('housing:no_title_preview', 'Tiada Tajuk')}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">{t('housing:monthly_rent_preview', 'Sewa Bulanan')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">RM{formData.sewa_bulanan || '0'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">{t('housing:vacancies_preview', 'Kekosongan')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formData.kekosongan || '0'} Orang</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">{t('housing:gender_preview', 'Jantina')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formData.jantina_prefer}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">{t('housing:distance_preview', 'Jarak')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formData.jarak_polisas_km ? `${formData.jarak_polisas_km} KM` : t('housing:not_checked_status', 'Tidak disemak')}</span>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/10">
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">{t('housing:location_preview', 'Lokasi')}</span>
                    <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{formData.lokasi}</span>
                  </div>
                  {formData.ciri_ciri_dicari && (
                    <div>
                      <span className="block text-xs text-slate-500 font-medium">{t('housing:sought_traits_preview', 'Ciri-ciri dicari')}</span>
                      <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{formData.ciri_ciri_dicari}</span>
                    </div>
                  )}
                  <div>
                    <span className="block text-xs text-slate-500 font-medium">{t('housing:available_date_preview', 'Tarikh Kekosongan')}</span>
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
                <p className="text-sm font-medium">{t('housing:ensure_info_accurate_notice', 'Sila pastikan maklumat adalah tepat. Anda boleh memadam iklan ini jika sudah penuh.')}</p>
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
              <ChevronLeft className="w-4 h-4" /> {t('common:back', 'Kembali')}
            </button>
          ) : (
             <button
              onClick={() => {
                localStorage.removeItem(`polyrent_draft_${profile?.id}`);
                setFormData({
                  title: '', lokasi: '', jantina_prefer: 'CAMPURAN', sewa_bulanan: '', deposit_awal: '', kekosongan: '', susunan_bilik: '', kemudahan: '', ciri_ciri_dicari: '', contact_info: profile?.phone || '', image_files: [], latitude: 0, longitude: 0, jarak_polisas_km: 0
                });
                toast.success(t('housing:draft_deleted_toast', 'Draf dipadamkan'));
              }}
              className="px-5 py-2.5 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 font-medium text-sm transition-colors"
            >
              {t('housing:clear_draft_btn', 'Padam Draf')}
            </button>
          )}

          {step < 4 ? (
            <button
              onClick={nextStep}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold hover:scale-105 active:scale-95 transition-transform"
            >
              {t('common:next', 'Seterusnya')} <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-2.5 rounded-full bg-teal-500 text-white font-bold hover:bg-teal-600 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {t('housing:publish_ad_btn', 'Terbitkan')}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
