import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMapEvents, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Map, MapPin, Building2, Plus, Edit2, Trash2, 
  Search, RefreshCw, AlertCircle, Save, X, Navigation, UploadCloud, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { logAuditAction } from '@/lib/auditLogger';

// Fix for default marker icons in React-Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPickerMap({ lat, lng, onChange, existingBuildings }: { lat: number, lng: number, onChange: (lat: number, lng: number) => void, existingBuildings?: Building[] }) {
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        onChange(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  };

  const defaultLat = 3.8625;
  const defaultLng = 103.3153;
  const mapCenter: [number, number] = [Number(lat) || defaultLat, Number(lng) || defaultLng];

  return (
    <div className="w-full h-48 rounded-xl overflow-hidden border border-white/10 mt-3 relative z-0">
      <MapContainer center={mapCenter} zoom={17} className="w-full h-full" zoomControl={true}>
        <TileLayer
          attribution='&copy; Google'
          url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          maxZoom={20}
        />
        <MapEvents />
        {existingBuildings?.map(b => b.center_lat && b.center_lng && (
          <CircleMarker 
            key={b.id} 
            center={[b.center_lat, b.center_lng]} 
            radius={8} 
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6, weight: 2 }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.8}>
              <span className="font-bold text-[10px] uppercase tracking-widest">{b.code || b.name}</span>
            </Tooltip>
          </CircleMarker>
        ))}
        {lat && lng ? (
          <Marker position={[lat, lng]} />
        ) : null}
      </MapContainer>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/10 pointer-events-none shadow-lg whitespace-nowrap">
        Sentuh peta untuk tetapkan lokasi
      </div>
    </div>
  );
}

interface Building {
  id: string;
  name: string;
  code: string;
  description: string;
  center_lat: number;
  center_lng: number;
  zone_name?: string | null;
  drone_image_url: string;
  is_facility?: boolean;
  facility_type?: string;
  op_start?: string;
  op_end?: string;
  floorplan_image_url?: string;
  entrance_image_url?: string;
}

interface Location {
  id: string;
  building_id: string;
  room_code: string;
  floor_level: number;
  direction_text: string;
  search_tags: string;
  image_url?: string;
  op_start?: string | null;
  op_end?: string | null;
}

interface MissingReport {
  id: string;
  student_id: string;
  room_code: string;
  building_id?: string | null;
  building_name_suggestion?: string | null;
  floor_level?: number | null;
  description?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  student?: {
    id: string;
    full_name: string;
    matric_no: string;
  } | null;
}

export function JppPolyMapsAdmin() {
  const [activeTab, setActiveTab] = useState<'buildings' | 'locations' | 'reports'>('buildings');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [reports, setReports] = useState<MissingReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  
  // Form states
  const [currentBuilding, setCurrentBuilding] = useState<Partial<Building>>({});
  const [currentLocation, setCurrentLocation] = useState<Partial<Location>>({});
  const [buildingSearchText, setBuildingSearchText] = useState('');
  const [isBuildingDropdownOpen, setIsBuildingDropdownOpen] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<Record<string, boolean>>({});
  
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [isProcessingReport, setIsProcessingReport] = useState<Record<string, boolean>>({});

  const rejectReport = async (reportId: string) => {
    if (!window.confirm('Adakah anda pasti mahu menolak laporan ini?')) return;
    
    setIsProcessingReport(prev => ({ ...prev, [reportId]: true }));
    try {
      const { error } = await supabase
        .from('imaps_missing_reports')
        .update({ status: 'rejected' })
        .eq('id', reportId);

      if (error) throw error;

      toast.success('Laporan berjaya ditolak.');
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'rejected' } : r));
    } catch (err: any) {
      console.error('Error rejecting report:', err);
      toast.error('Gagal menolak laporan.');
    } finally {
      setIsProcessingReport(prev => ({ ...prev, [reportId]: false }));
    }
  };

  const approveReport = (report: MissingReport) => {
    setActiveReportId(report.id);
    setCurrentLocation({
      room_code: report.room_code,
      floor_level: report.floor_level || 0,
      building_id: report.building_id || undefined,
      direction_text: report.description || ''
    });
    
    if (report.building_id) {
      const b = buildings.find(x => x.id === report.building_id);
      if (b) setBuildingSearchText(`${b.name} (${b.code})`);
    } else {
      setBuildingSearchText(report.building_name_suggestion || '');
    }
    setShowLocationModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'drone_image_url' | 'entrance_image_url' | 'floorplan_image_url' | 'image_url', isLocation = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(prev => ({...prev, [fieldName]: true}));
    const toastId = toast.loading('Memproses imej...');

    try {
      let fileToUpload = file;

      // Handle HEIC/HEIF files dynamically
      const isHeic = file.name.toLowerCase().endsWith('.heic') || 
                     file.name.toLowerCase().endsWith('.heif') || 
                     file.type === 'image/heic' || 
                     file.type === 'image/heif';

      if (isHeic) {
        toast.loading('Menukar format HEIC ke JPEG...', { id: toastId });
        const heic2any = (await import('heic2any')).default;
        const convertedBlob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
        const blobArray = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        fileToUpload = new File([blobArray], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
      }

      // Handle compression using the shared helper
      if (fileToUpload.type.startsWith('image/')) {
        toast.loading('Mengompres imej...', { id: toastId });
        const { compressImage } = await import('@/lib/imageCompression');
        const compressedFile = await compressImage(fileToUpload);
        fileToUpload = compressedFile;
      }

      const fileExt = fileToUpload.name.split('.').pop() || 'jpg';
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `polymaps/${fileName}`;

      toast.loading('Memuat naik imej ke storage...', { id: toastId });
      const { error: uploadError } = await supabase.storage
        .from('imaps_assets')
        .upload(filePath, fileToUpload, { contentType: fileToUpload.type });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('imaps_assets')
        .getPublicUrl(filePath);

      if (isLocation) {
        setCurrentLocation(prev => ({...prev, [fieldName]: data.publicUrl}));
      } else {
        setCurrentBuilding(prev => ({...prev, [fieldName]: data.publicUrl}));
      }
      toast.success('Imej berjaya dimuat naik!', { id: toastId });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Gagal memuat naik imej.', { id: toastId });
    } finally {
      setIsUploading(prev => ({...prev, [fieldName]: false}));
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState<string>('all');
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
  const [isBuildingFilterDropdownOpen, setIsBuildingFilterDropdownOpen] = useState(false);
  const [filterDropdownSearch, setFilterDropdownSearch] = useState('');
  const [isZoneModalDropdownOpen, setIsZoneModalDropdownOpen] = useState(false);
  
  const { isSuperAdmin, isJppMember } = useAuth();

  useEffect(() => {
    fetchData();
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'reports') {
      setActiveTab('reports');
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [buildingsRes, locationsRes, reportsRes] = await Promise.all([
        supabase.from('imaps_buildings').select('*').order('name'),
        supabase.from('imaps_locations').select('*').order('room_code'),
        supabase.from('imaps_missing_reports').select(`
          id, student_id, room_code, building_id, building_name_suggestion, floor_level, description, status, created_at,
          student:student_id (
            id,
            full_name,
            matric_no
          )
        `).order('created_at', { ascending: false })
      ]);

      if (buildingsRes.error) throw buildingsRes.error;
      if (locationsRes.error) throw locationsRes.error;
      if (reportsRes.error) throw reportsRes.error;

      setBuildings(buildingsRes.data || []);
      setLocations(locationsRes.data || []);
      setReports(reportsRes.data || []);
    } catch (error: any) {
      console.error('Error fetching PolyMaps data:', error);
      toast.error('Gagal memuat turun data PolyMaps');
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
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) logAuditAction({ actionType: currentBuilding.id ? 'BUILDING_UPDATED' : 'BUILDING_ADDED', module: 'PolyMaps', entityId: currentBuilding.id || currentBuilding.code, description: `Bangunan ${currentBuilding.id ? 'dikemaskini' : 'ditambah'}: ${currentBuilding.name} (${currentBuilding.code})`, actorId: userId });
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
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) logAuditAction({ actionType: 'BUILDING_DELETED', module: 'PolyMaps', entityId: id, description: `Bangunan dipadam`, actorId: userId });
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
        const payload = {
          building_id: currentLocation.building_id,
          room_code: currentLocation.room_code.trim(),
          floor_level: currentLocation.floor_level,
          direction_text: currentLocation.direction_text,
          search_tags: currentLocation.search_tags,
          image_url: currentLocation.image_url,
          op_start: currentLocation.op_start || null,
          op_end: currentLocation.op_end || null
        };
        
        console.log("SIMPAN PAYLOAD:", payload);
        
        const { error } = await supabase
          .from('imaps_locations')
          .update(payload)
          .eq('id', currentLocation.id);
          
        if (error) {
          console.error("Supabase Update Error:", error);
          throw error;
        }
        toast.success('Lokasi dikemaskini');
      } else {
        // Bulk insert support! Split by comma.
        const roomCodes = currentLocation.room_code.split(',').map(c => c.trim()).filter(Boolean);
        const recordsToInsert = roomCodes.map(code => ({
          building_id: currentLocation.building_id,
          room_code: code,
          floor_level: currentLocation.floor_level,
          direction_text: currentLocation.direction_text,
          search_tags: currentLocation.search_tags,
          image_url: currentLocation.image_url,
          op_start: currentLocation.op_start || null,
          op_end: currentLocation.op_end || null
        }));

        const { error } = await supabase
          .from('imaps_locations')
          .insert(recordsToInsert);
        if (error) throw error;
        
        toast.success(roomCodes.length > 1 ? `${roomCodes.length} Lokasi ditambah serentak` : 'Lokasi ditambah');

        if (activeReportId) {
          const { error: reportError } = await supabase
            .from('imaps_missing_reports')
            .update({ status: 'approved' })
            .eq('id', activeReportId);
          if (reportError) console.error("Gagal kemaskini status aduan:", reportError.message);

          const reportObj = reports.find(r => r.id === activeReportId);
          if (reportObj?.student_id) {
            await supabase.from('notifications').insert({
              user_id: reportObj.student_id,
              title: 'Laporan Tempat Diluluskan',
              message: `Tempat "${reportObj.room_code}" yang anda laporkan telah dimasukkan ke dalam peta. Terima kasih!`,
              type: 'MAPS_REPORT_APPROVED',
              module: 'AKADEMIK',
              link: `/polymaps?room=${reportObj.room_code}`
            });
          }
        }
      }
      setShowLocationModal(false);
      setCurrentLocation({});
      setActiveReportId(null);
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) logAuditAction({ actionType: currentLocation.id ? 'LOCATION_UPDATED' : 'LOCATION_ADDED', module: 'PolyMaps', entityId: currentLocation.id || currentLocation.room_code, description: `Lokasi ${currentLocation.id ? 'dikemaskini' : 'ditambah'}: ${currentLocation.room_code}`, actorId: userId });
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
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) logAuditAction({ actionType: 'LOCATION_DELETED', module: 'PolyMaps', entityId: id, description: 'Lokasi dipadam', actorId: userId });
      fetchData();
    } catch (error: any) {
      toast.error('Gagal memadam lokasi');
    }
  };

  const filteredBuildings = buildings.filter(b => {
    const matchSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        b.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchZone = filterZone === 'all' || b.zone_name === filterZone;
    return matchSearch && matchZone;
  });

  const filteredLocations = locations.filter(l => {
    const matchSearch = l.room_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        l.search_tags?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        buildings.find(b => b.id === l.building_id)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchBuilding = filterBuilding === 'all' || l.building_id === filterBuilding;
    return matchSearch && matchBuilding;
  });

  const uniqueZones = Array.from(new Set(buildings.map(b => b.zone_name).filter(Boolean))) as string[];

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
            <h1 className="text-2xl font-black text-white tracking-tight">Pentadbiran PolyMaps</h1>
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
          ) : activeTab === 'locations' ? (
            <button
              onClick={() => { setCurrentLocation({}); setBuildingSearchText(''); setShowLocationModal(true); }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold tracking-wide transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" /> Tambah Lokasi
            </button>
          ) : null}
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
          <button
            onClick={() => setActiveTab('reports')}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all relative",
              activeTab === 'reports' ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"
            )}
          >
            <AlertCircle className="w-4 h-4" /> Laporan Tempat
            {reports.filter(r => r.status === 'pending').length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-md animate-pulse">
                {reports.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-2 w-full md:w-auto">
          {activeTab === 'buildings' ? (
            <div className="relative w-full md:w-48">
              <input
                type="text"
                value={isZoneDropdownOpen ? filterDropdownSearch : (filterZone === 'all' ? 'Semua Zon' : filterZone)}
                onFocus={() => {
                  setFilterDropdownSearch('');
                  setIsZoneDropdownOpen(true);
                }}
                onBlur={() => setTimeout(() => setIsZoneDropdownOpen(false), 200)}
                onChange={e => {
                  setFilterDropdownSearch(e.target.value);
                  setIsZoneDropdownOpen(true);
                }}
                placeholder="Cari Zon..."
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50"
              />
              
              <AnimatePresence>
                {isZoneDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] max-h-60 overflow-y-auto"
                  >
                    <button
                      onClick={() => setFilterZone('all')}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors",
                        filterZone === 'all' ? "bg-sky-500/20 text-sky-400 font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      Semua Zon
                    </button>
                    {uniqueZones
                      .filter(z => z.toLowerCase().includes(filterDropdownSearch.toLowerCase()))
                      .map(zone => (
                      <button
                        key={zone}
                        onClick={() => setFilterZone(zone)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 text-sm transition-colors",
                          filterZone === zone ? "bg-sky-500/20 text-sky-400 font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {zone}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="relative w-full md:w-64">
              <input
                type="text"
                value={isBuildingFilterDropdownOpen ? filterDropdownSearch : (filterBuilding === 'all' ? 'Semua Bangunan' : buildings.find(b => b.id === filterBuilding)?.code || 'Semua Bangunan')}
                onFocus={() => {
                  setFilterDropdownSearch('');
                  setIsBuildingFilterDropdownOpen(true);
                }}
                onBlur={() => setTimeout(() => setIsBuildingFilterDropdownOpen(false), 200)}
                onChange={e => {
                  setFilterDropdownSearch(e.target.value);
                  setIsBuildingFilterDropdownOpen(true);
                }}
                placeholder="Cari Bangunan..."
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50"
              />
              
              <AnimatePresence>
                {isBuildingFilterDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100] max-h-60 overflow-y-auto"
                  >
                    <button
                      onClick={() => setFilterBuilding('all')}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors",
                        filterBuilding === 'all' ? "bg-indigo-500/20 text-indigo-400 font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      Semua Bangunan
                    </button>
                    {buildings
                      .filter(b => b.name.toLowerCase().includes(filterDropdownSearch.toLowerCase()) || b.code.toLowerCase().includes(filterDropdownSearch.toLowerCase()))
                      .map(b => (
                      <button
                        key={b.id}
                        onClick={() => setFilterBuilding(b.id)}
                        className={cn(
                          "w-full text-left px-4 py-2.5 transition-colors flex flex-col",
                          filterBuilding === b.id ? "bg-indigo-500/20 text-indigo-400 border-l-2 border-indigo-500" : "hover:bg-white/5"
                        )}
                      >
                        <span className={cn("text-sm font-bold", filterBuilding === b.id ? "text-indigo-400" : "text-white")}>{b.code}</span>
                        <span className="text-xs text-white/50 truncate w-full">{b.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

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
      ) : activeTab === 'locations' ? (
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
                          <button onClick={() => {
                            setCurrentLocation(l);
                            const matchedBuilding = buildings.find(b => b.id === l.building_id);
                            setBuildingSearchText(matchedBuilding ? matchedBuilding.code : '');
                            setShowLocationModal(true);
                          }} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
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
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-black/20 text-[10px] font-black uppercase tracking-widest text-white/40">
                  <th className="p-4">Pelajar</th>
                  <th className="p-4">Kod Kelas / Ruang</th>
                  <th className="p-4">Cadangan Bangunan</th>
                  <th className="p-4">Aras</th>
                  <th className="p-4">Catatan</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-white/70">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-white/40 italic">Tiada laporan tempat hilang.</td>
                  </tr>
                ) : (
                  reports.map(r => (
                    <tr key={r.id} className="border-b border-white/[0.05] hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{r.student?.full_name || 'N/A'}</span>
                          <span className="text-xs text-white/40">{r.student?.matric_no || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md">{r.room_code}</span>
                      </td>
                      <td className="p-4">
                        {r.building_id
                          ? buildings.find(b => b.id === r.building_id)?.name || 'Unknown'
                          : r.building_name_suggestion || '-'}
                      </td>
                      <td className="p-4">{r.floor_level === 0 ? 'G' : r.floor_level}</td>
                      <td className="p-4 max-w-xs truncate text-white/50" title={r.description || ''}>
                        {r.description || '-'}
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          r.status === 'pending' && "bg-amber-500/10 text-amber-400 border-amber-500/20",
                          r.status === 'approved' && "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
                          r.status === 'rejected' && "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        )}>
                          {r.status === 'pending' ? 'Dalam Semakan' : r.status === 'approved' ? 'Diluluskan' : 'Ditolak'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {r.status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={isProcessingReport[r.id]}
                              onClick={() => approveReport(r)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              Lulus & Tambah
                            </button>
                            <button
                              disabled={isProcessingReport[r.id]}
                              onClick={() => rejectReport(r.id)}
                              className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              Tolak
                            </button>
                          </div>
                        ) : (
                          <span className="text-white/30 text-xs">-</span>
                        )}
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
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBuildingModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg max-h-[90vh] bg-[#0f1015] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-y-auto">
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
                <div className="relative">
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Nama Zon (Pilihan)</label>
                  <input 
                    type="text" 
                    value={currentBuilding.zone_name || ''} 
                    onFocus={() => setIsZoneModalDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setIsZoneModalDropdownOpen(false), 200)}
                    onChange={e => {
                      setCurrentBuilding({...currentBuilding, zone_name: e.target.value});
                      setIsZoneModalDropdownOpen(true);
                    }} 
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all" 
                    placeholder="Contoh: JKE (Untuk kumpulkan bangunan)" 
                  />
                  <AnimatePresence>
                    {isZoneModalDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute left-0 right-0 top-full mt-2 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[10001] max-h-60 overflow-y-auto"
                      >
                        {Array.from(new Set(buildings.map(b => b.zone_name).filter(Boolean)))
                          .filter(zone => !currentBuilding.zone_name || (zone as string).toLowerCase().includes(currentBuilding.zone_name.toLowerCase()))
                          .map(zone => (
                          <button
                            key={zone as string}
                            onClick={() => {
                              setCurrentBuilding({...currentBuilding, zone_name: zone as string});
                              setIsZoneModalDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors text-sm text-white font-bold"
                          >
                            {zone as string}
                          </button>
                        ))}
                        {Array.from(new Set(buildings.map(b => b.zone_name).filter(Boolean)))
                          .filter(zone => !currentBuilding.zone_name || (zone as string).toLowerCase().includes(currentBuilding.zone_name.toLowerCase())).length === 0 && (
                            <div className="px-4 py-3 text-sm text-white/40 italic text-center">Tiada zon sedia ada padan. Zon baru akan dicipta.</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Koordinat GPS</label>
                  <LocationPickerMap 
                    lat={currentBuilding.center_lat || 0} 
                    lng={currentBuilding.center_lng || 0} 
                    onChange={(lat, lng) => setCurrentBuilding({...currentBuilding, center_lat: parseFloat(lat.toFixed(6)), center_lng: parseFloat(lng.toFixed(6))})} 
                    existingBuildings={buildings}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(['drone_image_url', 'floorplan_image_url', 'entrance_image_url'] as const).map(field => {
                    const label = field === 'drone_image_url' ? 'Imej Dron' : field === 'floorplan_image_url' ? 'Pelan Lantai' : 'Pintu Masuk';
                    const value = currentBuilding[field];
                    return (
                      <div key={field} className="bg-black/20 border border-white/10 rounded-xl p-3">
                        <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-2">{label}</label>
                        {value ? (
                          <div className="relative w-full h-24 rounded-lg overflow-hidden border border-white/10 mb-2 group">
                            <img src={value} alt={label} className="w-full h-full object-cover" />
                            <button 
                              onClick={() => setCurrentBuilding({...currentBuilding, [field]: ''})}
                              className="absolute top-1 right-1 bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className={cn(
                            "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 hover:border-sky-500/50 transition-colors mb-2",
                            isUploading[field] && "opacity-50 pointer-events-none"
                          )}>
                            {isUploading[field] ? (
                              <RefreshCw className="w-5 h-5 text-sky-400 animate-spin mb-1" />
                            ) : (
                              <UploadCloud className="w-5 h-5 text-white/40 mb-1" />
                            )}
                            <span className="text-[10px] font-bold text-white/50">{isUploading[field] ? 'Memuat naik...' : 'Pilih Gambar'}</span>
                            <input 
                              type="file" 
                              accept="image/*"
                              className="hidden" 
                              onChange={(e) => handleImageUpload(e, field, false)}
                              disabled={isUploading[field]}
                            />
                          </label>
                        )}
                        <input type="url" value={value || ''} onChange={e => setCurrentBuilding({...currentBuilding, [field]: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white focus:outline-none focus:border-sky-500/50 transition-all" placeholder="Atau paste URL..." />
                      </div>
                    );
                  })}
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        checked={currentBuilding.is_facility || false}
                        onChange={e => setCurrentBuilding({...currentBuilding, is_facility: e.target.checked})}
                        className="peer sr-only"
                      />
                      <div className="w-10 h-6 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-white/10 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                    </div>
                    <span className="text-sm font-bold text-white">Bangunan ini adalah Fasiliti Utama (Ada Waktu Operasi)</span>
                  </label>

                  {currentBuilding.is_facility && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-white/10">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Kategori Fasiliti</label>
                        <input 
                          type="text"
                          list="facility-suggestions"
                          value={currentBuilding.facility_type || ''} 
                          onChange={e => setCurrentBuilding({...currentBuilding, facility_type: e.target.value})}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all"
                          placeholder="Cth: Kafe, Surau, Tandas..."
                        />
                        <datalist id="facility-suggestions">
                          {Array.from(new Set(buildings.filter(b => b.is_facility && b.facility_type).map(b => b.facility_type))).map(type => (
                            <option key={type} value={type} />
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Buka (08:00)</label>
                        <input type="time" value={currentBuilding.op_start || ''} onChange={e => setCurrentBuilding({...currentBuilding, op_start: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all" />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Tutup (17:00)</label>
                        <input type="time" value={currentBuilding.op_end || ''} onChange={e => setCurrentBuilding({...currentBuilding, op_end: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-all" />
                      </div>
                    </div>
                  )}
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
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLocationModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative w-full max-w-lg max-h-[90vh] bg-[#0f1015] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-y-auto">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-indigo-400" />
                {currentLocation.id ? 'Kemaskini Lokasi' : 'Tambah Lokasi'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Bangunan</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={buildingSearchText} 
                      onFocus={() => setIsBuildingDropdownOpen(true)}
                      onBlur={() => {
                        // Delay closing to allow onClick on dropdown item to fire
                        setTimeout(() => setIsBuildingDropdownOpen(false), 200);
                      }}
                      onChange={e => {
                        const val = e.target.value;
                        setBuildingSearchText(val);
                        setIsBuildingDropdownOpen(true);
                        // Case-insensitive match on code or name
                        const matched = buildings.find(b => 
                          b.code.toLowerCase() === val.toLowerCase() || 
                          b.name.toLowerCase() === val.toLowerCase()
                        );
                        setCurrentLocation({...currentLocation, building_id: matched ? matched.id : ''});
                      }}
                      placeholder="Pilih Bangunan (Cth: JKE, Pusat Pelajar)..."
                      className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                    
                    <AnimatePresence>
                      {isBuildingDropdownOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute left-0 right-0 top-full mt-2 bg-[#1a1b23] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[10001] max-h-60 overflow-y-auto"
                        >
                          {buildings
                            .filter(b => 
                              b.name.toLowerCase().includes(buildingSearchText.toLowerCase()) || 
                              b.code.toLowerCase().includes(buildingSearchText.toLowerCase())
                            )
                            .map(b => (
                            <button
                              key={b.id}
                              onClick={() => {
                                setBuildingSearchText(b.code);
                                setCurrentLocation({...currentLocation, building_id: b.id});
                                setIsBuildingDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors flex flex-col"
                            >
                              <span className="font-bold text-white text-sm">{b.code}</span>
                              <span className="text-xs text-white/50">{b.name}</span>
                            </button>
                          ))}
                          {buildings.filter(b => 
                              b.name.toLowerCase().includes(buildingSearchText.toLowerCase()) || 
                              b.code.toLowerCase().includes(buildingSearchText.toLowerCase())
                            ).length === 0 && (
                              <div className="px-4 py-3 text-sm text-white/40 italic text-center">Tiada bangunan ditemui</div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Waktu Buka (Pilihan)</label>
                    <input type="time" value={currentLocation.op_start || ''} onChange={e => setCurrentLocation({...currentLocation, op_start: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Waktu Tutup (Pilihan)</label>
                    <input type="time" value={currentLocation.op_end || ''} onChange={e => setCurrentLocation({...currentLocation, op_end: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Panduan Arah Spesifik (Dalam Bangunan)</label>
                  <p className="text-[10px] text-white/30 mb-2 font-medium">Tips: Tekan 'Enter' untuk baris baharu jika ingin jadikan ia panduan Langkah-Demi-Langkah (Step-by-Step).</p>
                  <textarea rows={4} value={currentLocation.direction_text || ''} onChange={e => setCurrentLocation({...currentLocation, direction_text: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all resize-none leading-relaxed" placeholder="Contoh:&#10;Naik tangga utama.&#10;Belok ke kanan lorong makmal.&#10;Bilik di hujung sekali." />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-1">Tags Carian (Pisah dengan koma)</label>
                  <input type="text" value={currentLocation.search_tags || ''} onChange={e => setCurrentLocation({...currentLocation, search_tags: e.target.value})} className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all" placeholder="Cth: Makmal Komputer, JTM, Lab" />
                </div>

                <div className="bg-black/20 border border-white/10 rounded-xl p-3">
                  <label className="block text-xs font-black uppercase tracking-wider text-white/40 mb-2">Gambar Lokasi/Pintu Bilik (Pilihan)</label>
                  {currentLocation.image_url ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-white/10 mb-2 group">
                      <img src={currentLocation.image_url} alt="Gambar Bilik" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => setCurrentLocation({...currentLocation, image_url: ''})}
                        className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className={cn(
                      "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 hover:border-indigo-500/50 transition-colors mb-2",
                      isUploading['image_url'] && "opacity-50 pointer-events-none"
                    )}>
                      {isUploading['image_url'] ? (
                        <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-white/40 mb-2" />
                      )}
                      <span className="text-xs font-bold text-white/50">{isUploading['image_url'] ? 'Memuat naik...' : 'Pilih Gambar Pintu / Dalam Bilik'}</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={(e) => handleImageUpload(e, 'image_url', true)}
                        disabled={isUploading['image_url']}
                      />
                    </label>
                  )}
                  <input type="url" value={currentLocation.image_url || ''} onChange={e => setCurrentLocation({...currentLocation, image_url: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-all" placeholder="Atau paste URL..." />
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
