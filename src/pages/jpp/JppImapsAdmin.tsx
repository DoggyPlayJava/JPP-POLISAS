import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Map, MapPin, Building2, Plus, Edit2, Trash2, 
  Search, RefreshCw, AlertCircle, Save, X, Navigation
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Building {
  id: string;
  name: string;
  code: string;
  description: string;
  center_lat: number;
  center_lng: number;
  drone_image_url: string;
}

interface Location {
  id: string;
  building_id: string;
  room_code: string;
  floor_level: number;
  direction_text: string;
  search_tags: string;
}

export function JppImapsAdmin() {
  const [activeTab, setActiveTab] = useState<'buildings' | 'locations'>('buildings');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Form states
  const [currentBuilding, setCurrentBuilding] = useState<Partial<Building>>({});
  const [currentLocation, setCurrentLocation] = useState<Partial<Location>>({});
  
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { isSuperAdmin, isJppMember } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [buildingsRes, locationsRes] = await Promise.all([
        supabase.from('imaps_buildings').select('*').order('name'),
        supabase.from('imaps_locations').select('*').order('room_code')
      ]);

      if (buildingsRes.error) throw buildingsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      setBuildings(buildingsRes.data || []);
      setLocations(locationsRes.data || []);
    } catch (error: any) {
      toast.error('Gagal memuat turun data iMaps');
    } finally {
      setLoading(false);
    }
  };

  // --- Building Functions ---
  const saveBuilding = async () => {
    if (!currentBuilding.name || !currentBuilding.code) {
      toast.error('Sila isi nama dan kod bangunan');
      return;
    }
    
    setIsSaving(true);
    try {
      if (currentBuilding.id) {
        const { error } = await supabase
          .from('imaps_buildings')
          .update(currentBuilding)
          .eq('id', currentBuilding.id);
        if (error) throw error;
        toast.success('Bangunan dikemaskini');
      } else {
        const { error } = await supabase
          .from('imaps_buildings')
          .insert([currentBuilding]);
        if (error) throw error;
        toast.success('Bangunan ditambah');
      }
      setShowBuildingModal(false);
      setCurrentBuilding({});
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan bangunan');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBuilding = async (id: string) => {
    if (!window.confirm('Padam bangunan ini? Semua lokasi di dalamnya juga akan terpadam.')) return;
    try {
      const { error } = await supabase.from('imaps_buildings').delete().eq('id', id);
      if (error) throw error;
      toast.success('Bangunan dipadam');
      fetchData();
    } catch (error: any) {
      toast.error('Gagal memadam bangunan');
    }
  };

  // --- Location Functions ---
  const saveLocation = async () => {
    if (!currentLocation.building_id || !currentLocation.room_code) {
      toast.error('Sila pilih bangunan dan isi kod kelas');
      return;
    }
    
    setIsSaving(true);
    try {
      if (currentLocation.id) {
        const { error } = await supabase
          .from('imaps_locations')
          .update({
            building_id: currentLocation.building_id,
            room_code: currentLocation.room_code.trim(),
            floor_level: currentLocation.floor_level,
            direction_text: currentLocation.direction_text,
            search_tags: currentLocation.search_tags
          })
          .eq('id', currentLocation.id);
        if (error) throw error;
        toast.success('Lokasi dikemaskini');
      } else {
        // Bulk insert support! Split by comma.
        const roomCodes = currentLocation.room_code.split(',').map(c => c.trim()).filter(Boolean);
        const recordsToInsert = roomCodes.map(code => ({
          building_id: currentLocation.building_id,
          room_code: code,
          floor_level: currentLocation.floor_level,
          direction_text: currentLocation.direction_text,
          search_tags: currentLocation.search_tags
        }));

        const { error } = await supabase
          .from('imaps_locations')
          .insert(recordsToInsert);
        if (error) throw error;
        
        toast.success(roomCodes.length > 1 ? `${roomCodes.length} Lokasi ditambah serentak` : 'Lokasi ditambah');
      }
      setShowLocationModal(false);
      setCurrentLocation({});
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan lokasi');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLocation = async (id: string) => {
    if (!window.confirm('Padam lokasi ini?')) return;
    try {
      const { error } = await supabase.from('imaps_locations').delete().eq('id', id);
      if (error) throw error;
      toast.success('Lokasi dipadam');
      fetchData();
    } catch (error: any) {
      toast.error('Gagal memadam lokasi');
    }
  };

  const filteredBuildings = buildings.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLocations = locations.filter(l => 
    l.room_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.search_tags?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    buildings.find(b => b.id === l.building_id)?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isSuperAdmin && !isJppMember) return null;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <Map className="w-5 h-5 text-sky-400" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Pentadbiran iMaps</h1>
          </div>
          <p className="text-sm font-medium text-white/50">Urus koordinat bangunan dan panduan laluan dalaman kampus POLISAS</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
          >
            <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
          </button>
          
          {activeTab === 'buildings' ? (
            <button
              onClick={() => { setCurrentBuilding({}); setShowBuildingModal(true); }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold tracking-wide transition-colors shadow-lg shadow-sky-500/20"
            >
              <Plus className="w-4 h-4" /> Tambah Bangunan
            </button>
          ) : (
            <button
              onClick={() => { setCurrentLocation({}); setShowLocationModal(true); }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold tracking-wide transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> Tambah Lokasi
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/5 p-2 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1 w-full md:w-auto p-1 bg-black/20 rounded-xl">
          <button
            onClick={() => setActiveTab('buildings')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all",
              activeTab === 'buildings' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"
            )}
          >
            <Building2 className="w-4 h-4" /> Bangunan
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all",
              activeTab === 'locations' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"
            )}
          >
            <Navigation className="w-4 h-4" /> Kelas / Lokasi
          </button>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input 
            type="text"
            placeholder="Cari..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-500 rounded-full animate-spin" />
        </div>
      ) : activeTab === 'buildings' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBuildings.length === 0 ? (
            <div className="col-span-full py-12 text-center text-white/40 bg-white/5 rounded-2xl border border-white/10 border-dashed">
              Tiada rekod bangunan dijumpai.
            </div>
          ) : (
            filteredBuildings.map(b => (
              <div key={b.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{b.name}</h3>
                    <span className="inline-block px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 text-[10px] font-black uppercase tracking-wider mt-1">
                      {b.code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setCurrentBuilding(b); setShowBuildingModal(true); }} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteBuilding(b.id)} className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 mt-4 text-xs font-medium text-white/50">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    {b.center_lat ? `${b.center_lat}, ${b.center_lng}` : 'Tiada Koordinat GPS'}
                  </div>
                  {b.description && (
                    <p className="line-clamp-2 text-white/40 text-[11px] leading-relaxed">{b.description}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <th className="p-4">Kod Kelas</th>
                  <th className="p-4">Bangunan</th>
                  <th className="p-4">Aras</th>
                  <th className="p-4">Panduan Arah</th>
                  <th className="p-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-white/70">
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-white/40 italic">Tiada rekod lokasi dijumpai.</td>
                  </tr>
                ) : (
                  filteredLocations.map(l => (
                    <tr key={l.id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4">
                        <span className="font-bold text-white bg-white/10 px-2 py-1 rounded-md">{l.room_code}</span>
                      </td>
                      <td className="p-4">
                        {buildings.find(b => b.id === l.building_id)?.name || 'Unknown'}
                      </td>
                      <td className="p-4">{l.floor_level || 'G'}</td>
                      <td className="p-4 max-w-xs truncate text-white/50" title={l.direction_text}>
                        {l.direction_text || '-'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setCurrentLocation(l); setShowLocationModal(true); }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteLocation(l.id)} className="p-1.5 rounded-lg hover:bg-rose-500/20 text-white/50 hover:text-rose-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Building Modal */}
      <AnimatePresence>
        {showBuildingModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBuildingModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-[#0f1015] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                {currentBuilding.id ? 'Kemaskini Bangunan' : 'Tambah Bangunan'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Nama Bangunan</label>
                  <input type="text" value={currentBuilding.name || ''} onChange={e => setCurrentBuilding({...currentBuilding, name: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all" placeholder="Contoh: Jabatan Kejuruteraan Elektrik" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Kod (Singkatan)</label>
                  <input type="text" value={currentBuilding.code || ''} onChange={e => setCurrentBuilding({...currentBuilding, code: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all" placeholder="Contoh: JKE" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Latitude</label>
                    <input type="number" step="any" value={currentBuilding.center_lat || ''} onChange={e => setCurrentBuilding({...currentBuilding, center_lat: parseFloat(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all" placeholder="3.123456" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Longitude</label>
                    <input type="number" step="any" value={currentBuilding.center_lng || ''} onChange={e => setCurrentBuilding({...currentBuilding, center_lng: parseFloat(e.target.value)})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all" placeholder="103.123456" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">URL Gambar Dron (Supabase Storage)</label>
                  <input type="text" value={currentBuilding.drone_image_url || ''} onChange={e => setCurrentBuilding({...currentBuilding, drone_image_url: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Penerangan</label>
                  <textarea rows={2} value={currentBuilding.description || ''} onChange={e => setCurrentBuilding({...currentBuilding, description: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all resize-none" placeholder="Maklumat ringkas..." />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowBuildingModal(false)} className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors">Batal</button>
                <button onClick={saveBuilding} disabled={isSaving} className="flex-1 py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Location Modal */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLocationModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg bg-[#0f1015] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-400" />
                {currentLocation.id ? 'Kemaskini Lokasi' : 'Tambah Lokasi'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Bangunan</label>
                  <select 
                    value={currentLocation.building_id || ''} 
                    onChange={e => setCurrentLocation({...currentLocation, building_id: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all appearance-none"
                  >
                    <option value="" disabled className="bg-slate-900">Pilih Bangunan...</option>
                    {buildings.map(b => (
                      <option key={b.id} value={b.id} className="bg-slate-900">{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Kod Kelas/Bilik (Boleh masuk banyak, pisah koma)</label>
                    <input type="text" value={currentLocation.room_code || ''} onChange={e => setCurrentLocation({...currentLocation, room_code: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all font-mono" placeholder="Cth: A301, A302, A303" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Aras (Tingkat)</label>
                    <input type="number" value={currentLocation.floor_level || 0} onChange={e => setCurrentLocation({...currentLocation, floor_level: parseInt(e.target.value) || 0})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Panduan Arah Spesifik (Dalam Bangunan)</label>
                  <textarea rows={3} value={currentLocation.direction_text || ''} onChange={e => setCurrentLocation({...currentLocation, direction_text: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all resize-none" placeholder="Cth: Naik tangga utama, kelas berada di sebelah kiri hujung koridor." />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Tags Carian (Pisah dengan koma)</label>
                  <input type="text" value={currentLocation.search_tags || ''} onChange={e => setCurrentLocation({...currentLocation, search_tags: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all" placeholder="Cth: Makmal Komputer, JTM, Lab" />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setShowLocationModal(false)} className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors">Batal</button>
                <button onClick={saveLocation} disabled={isSaving} className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
