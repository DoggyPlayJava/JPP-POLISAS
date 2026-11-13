import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Camera,
  Compass,
  Upload,
  Sparkles,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Download,
  Navigation,
  Layers,
  Building2,
  Wand2,
  RotateCcw,
  Eye,
  ArrowRight,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Pannellum360Viewer } from './Pannellum360Viewer';
import {
  inferRoomMetadata,
  findNearestBuildingByGps,
  formatYawToClockDirection,
  type PolyMaps360HotspotDraft,
  type MinimalBuildingWithCoords,
} from '@/lib/polyMapsSmartEntry';
import {
  stitchHorizonFramesToEquirectangular,
  convertPhonePanoramaToEquirectangular,
  validateEquirectangularDimensions,
} from '@/lib/panoStitcher';
import { sendNotificationToJppAndSuperAdmin } from '@/lib/notifications';

export interface PolyMaps360CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildings: MinimalBuildingWithCoords[];
  existingLocations?: Array<{
    id: string;
    building_id: string;
    room_code: string;
    floor_level: string;
    panorama_360_url?: string | null;
    target_yaw?: number | null;
    target_pitch?: number | null;
  }>;
  initialBuildingId?: string;
  initialLocationId?: string;
  initialPanoramaUrl?: string;
  initialFloorLevel?: string;
  initialHotspots?: PolyMaps360HotspotDraft[];
  isAdminMode: boolean;
  currentUserId?: string | null;
  currentUserName?: string | null;
  onSaved?: (result: {
    panoramaUrl: string;
    hotspots: PolyMaps360HotspotDraft[];
    buildingId: string;
    locationId?: string;
  }) => void;
}

const TARGET_YAW_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

export function PolyMaps360CaptureModal({
  isOpen,
  onClose,
  buildings,
  existingLocations = [],
  initialBuildingId = '',
  initialLocationId = '',
  initialPanoramaUrl = '',
  initialFloorLevel = '1',
  initialHotspots = [],
  isAdminMode,
  currentUserId,
  currentUserName,
  onSaved,
}: PolyMaps360CaptureModalProps) {
  const { t, i18n } = useTranslation(['services', 'common']);
  const currentLang: 'en' | 'ms' = i18n.language?.startsWith('en') ? 'en' : 'ms';
  const [step, setStep] = useState<'capture' | 'pins'>(initialPanoramaUrl ? 'pins' : 'capture');
  const [captureTab, setCaptureTab] = useState<'camera' | 'pano_convert' | 'upload'>('camera');

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    initialBuildingId || buildings[0]?.id || ''
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>(initialLocationId || '');
  const [floorLevel, setFloorLevel] = useState<string>(initialFloorLevel || '1');
  const [panoramaUrl, setPanoramaUrl] = useState<string>(initialPanoramaUrl || '');
  const [stitchedBlobUrl, setStitchedBlobUrl] = useState<string | null>(null);
  const [volunteerNotes, setVolunteerNotes] = useState<string>('');

  // State Kamera Berpandu AR
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Kunci auto-snap: elak 3-4 tangkapan pada bearing yang sama sebelum React sempat render.
  const snapLockRef = useRef<number>(0);
  // Penapis lulus-rendah bulat (circular EMA) untuk bearing kompas.
  const headingRef = useRef<{ deg: number; init: boolean }>({ deg: 0, init: false });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [capturedYaws, setCapturedYaws] = useState<number[]>([]);
  const [panoSweepDeg, setPanoSweepDeg] = useState<number>(240);
  const [isPortraitFrame, setIsPortraitFrame] = useState(false);
  const [hasGyroscope, setHasGyroscope] = useState(false);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [deviceRoll, setDeviceRoll] = useState<number>(0);
  const [devicePitch, setDevicePitch] = useState<number>(0);
  const [autoSnapEnabled, setAutoSnapEnabled] = useState<boolean>(false);
  const [isStitching, setIsStitching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // State Editor Pin 360°
  const [hotspots, setHotspots] = useState<PolyMaps360HotspotDraft[]>(initialHotspots);
  const [batchCreateRooms, setBatchCreateRooms] = useState<boolean>(true);
  const [isSavingAll, setIsSavingAll] = useState(false);

  // Borang Pin Semasa (apabila pengguna klik pada 360°)
  const [draftPin, setDraftPin] = useState<{
    index: number | null;
    pin_type: 'room' | 'scene' | 'info';
    room_code: string;
    label: string;
    floor_level: string;
    description: string;
    pitch: number;
    yaw: number;
    target_panorama_url: string;
  } | null>(null);

  const selectedBuilding = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId) || null,
    [buildings, selectedBuildingId]
  );

  const buildingLocations = useMemo(
    () => existingLocations.filter((loc) => loc.building_id === selectedBuildingId),
    [existingLocations, selectedBuildingId]
  );

  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      return;
    }
    setSelectedBuildingId(initialBuildingId || buildings[0]?.id || '');
    setSelectedLocationId(initialLocationId || '');
    setFloorLevel(initialFloorLevel || '1');
    setPanoramaUrl(initialPanoramaUrl || '');
    setHotspots(initialHotspots || []);
    setStep(initialPanoramaUrl ? 'pins' : 'capture');
    setDraftPin(null);
  }, [isOpen, initialBuildingId, initialLocationId, initialPanoramaUrl, initialFloorLevel]);

  // Bersihkan kamera apabila modal ditutup
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
      if (stitchedBlobUrl) {
        URL.revokeObjectURL(stitchedBlobUrl);
      }
    };
  }, [stitchedBlobUrl]);

  // Listener Sensor Giroskop / Kompas Telefon
  // iOS Safari: `alpha` BUKAN bearing utara (rujukan arbitrary) — wajib `webkitCompassHeading`.
  // Android Chrome: `deviceorientationabsolute` -> bearing = 360 - alpha. `deviceorientation` biasa relatif, tak dipakai.
  useEffect(() => {
    if (!isOpen || !isCameraActive) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const webkitHeading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      let rawHeading: number | null = null;
      if (typeof webkitHeading === 'number' && webkitHeading >= 0) {
        rawHeading = webkitHeading;
      } else if (!isIOS && event.absolute === true && typeof event.alpha === 'number') {
        rawHeading = (360 - event.alpha + 360) % 360;
      }

      if (rawHeading !== null) {
        const state = headingRef.current;
        if (!state.init) {
          state.deg = rawHeading;
          state.init = true;
        } else {
          const delta = ((rawHeading - state.deg + 540) % 360) - 180;
          state.deg = (state.deg + delta * 0.25 + 360) % 360;
        }
        setHasGyroscope(true);
        setCompassHeading(Math.round(headingRef.current.deg));
      }

      if (typeof event.gamma === 'number') {
        setDeviceRoll(Math.round(event.gamma));
      }
      if (typeof event.beta === 'number') {
        // Telefon dipegang menegak pada paras mata mempunyai beta ~ 90 darjah
        setDevicePitch(Math.round(event.beta - 90));
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isOpen, isCameraActive]);

  // WebKit bug 329556: deviceorientation berhenti semasa halaman di-scroll -> kunci scroll.
  useEffect(() => {
    if (!isCameraActive) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isCameraActive]);

  const startGuidedCamera = async () => {
    try {
      // Minta izin sensor pada iOS 13+ jika ada
      const DevOrient = window.DeviceOrientationEvent as any;
      if (DevOrient && typeof DevOrient.requestPermission === 'function') {
        try {
          const permission = await DevOrient.requestPermission();
          if (permission !== 'granted') throw new Error('motion-denied');
        } catch {
          // Kamera tetap jalan; panduan kompas dimatikan secara jujur.
          setHasGyroscope(false);
          toast.warning(
            t(
              'services:polymaps_studio_motion_denied',
              'Akses sensor gerakan ditolak. Panduan kompas dimatikan — anda masih boleh tangkap segmen secara manual. Benarkan di Settings › Safari › Motion & Orientation Access.'
            )
          );
        }
      }

      headingRef.current = { deg: 0, init: false };
      snapLockRef.current = 0;

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = mediaStream;
      setIsCameraActive(true);
      setCapturedFrames([]);
      setCapturedYaws([]);

      requestAnimationFrame(() => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = mediaStream;
          // Telefon potret -> FOV mendatar ~42°, tak cukup untuk 8 x 45°.
          const markOrientation = () => setIsPortraitFrame(video.videoHeight > video.videoWidth);
          video.onloadedmetadata = markOrientation;
          markOrientation();
          video.play().catch(() => {});
        }
      });
    } catch (err: any) {
      console.error('Ralat akses kamera:', err);
      toast.error(
        t('services:polymaps_studio_camera_error', 'Kamera tidak dapat diakses. Sila benarkan akses kamera atau gunakan tab Auto-Konversi Foto Pano Telefon.')
      );
    }
  };

  const captureCurrentVideoFrame = () => {
    if (!videoRef.current || capturedFrames.length >= 8) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const nextFrames = [...capturedFrames, dataUrl];
    setCapturedFrames(nextFrames);

    // Simpan bearing sebenar segmen ini; tanpa kompas, anggap taburan sekata 45°.
    const yaw = hasGyroscope
      ? headingRef.current.deg
      : TARGET_YAW_ANGLES[capturedFrames.length] ?? 0;
    const nextYaws = [...capturedYaws, yaw];
    setCapturedYaws(nextYaws);

    if (nextFrames.length === 8) {
      toast.success(t('services:polymaps_studio_8_segments_toast', 'Lengkap 8 segmen pusingan 360°! Mencantumkan panorama...'));
      void handleStitchCapturedFrames(nextFrames, nextYaws);
    } else {
      toast.info(
        t('services:polymaps_studio_segment_toast', 'Segmen {{count}}/8 dirakam. Pusing sedikit ke kanan untuk segmen seterusnya.', {
          count: nextFrames.length,
        })
      );
    }
  };

  // Auto-snap apabila kompas sejajar dengan sudut sasaran & telefon tegak
  useEffect(() => {
    if (!isCameraActive || !autoSnapEnabled || !hasGyroscope) return;
    if (capturedFrames.length >= 8) return;

    const targetAngle = TARGET_YAW_ANGLES[capturedFrames.length];
    const diff = Math.abs((((compassHeading - targetAngle) % 360) + 540) % 360 - 180);
    const isLevel = Math.abs(deviceRoll) <= 12 && Math.abs(devicePitch) <= 18;

    if (diff <= 8 && isLevel && Date.now() - snapLockRef.current > 1500) {
      snapLockRef.current = Date.now();
      captureCurrentVideoFrame();
    }
  }, [compassHeading, deviceRoll, devicePitch, autoSnapEnabled, isCameraActive, hasGyroscope, capturedFrames.length]);

  const uploadBlobToImapsAssets = async (blob: Blob, prefix = 'pano360'): Promise<string> => {
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const filePath = `polymaps/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('imaps_assets')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from('imaps_assets').getPublicUrl(filePath);

    return publicUrl;
  };

  const handleStitchCapturedFrames = async (
    framesToUse = capturedFrames,
    yawsToUse = capturedYaws
  ) => {
    if (framesToUse.length < 4) {
      toast.warning(t('services:polymaps_studio_min_4_segments', 'Sila rakam sekurang-kurangnya 4 segmen gambar sebelum cantum.'));
      return;
    }

    setIsStitching(true);
    try {
      const equirectBlob = await stitchHorizonFramesToEquirectangular(
        framesToUse,
        4096,
        2048,
        yawsToUse
      );
      if (stitchedBlobUrl) URL.revokeObjectURL(stitchedBlobUrl);
      const localUrl = URL.createObjectURL(equirectBlob);
      setStitchedBlobUrl(localUrl);

      stopCameraStream();
      setIsUploading(true);
      const uploadedUrl = await uploadBlobToImapsAssets(equirectBlob, 'studio360_ar');
      setPanoramaUrl(uploadedUrl);
      setStep('pins');
      toast.success(t('services:polymaps_studio_stitch_success', 'Panorama 360° berjaya dicantum & dimuat naik! Sila klik pintu bilik untuk letak pin.'));
    } catch (err: any) {
      console.error('Gagal mencantum/memuat naik 360:', err);
      toast.error(err.message || t('services:polymaps_studio_stitch_failed', 'Gagal mencantum panorama 360°.'));
    } finally {
      setIsStitching(false);
      setIsUploading(false);
    }
  };

  const handlePhonePanoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const convertedBlob = await convertPhonePanoramaToEquirectangular(file, 4096, panoSweepDeg);
      if (stitchedBlobUrl) URL.revokeObjectURL(stitchedBlobUrl);
      setStitchedBlobUrl(URL.createObjectURL(convertedBlob));

      const uploadedUrl = await uploadBlobToImapsAssets(convertedBlob, 'studio360_pano');
      setPanoramaUrl(uploadedUrl);
      setStep('pins');
      toast.success(t('services:polymaps_studio_pano_converted_toast', 'Foto Panorama Telefon berjaya ditukar kepada 360° Equirectangular (2:1)!'));
    } catch (err: any) {
      console.error('Ralat konversi pano:', err);
      toast.error(err.message || t('services:polymaps_studio_pano_convert_failed', 'Gagal menukar foto panorama telefon.'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleDirect360Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Semak nisbah dimensi imej terlebih dahulu
      const objectUrl = URL.createObjectURL(file);
      const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.onerror = reject;
        img.src = objectUrl;
      });
      URL.revokeObjectURL(objectUrl);

      const check = validateEquirectangularDimensions(dims.w, dims.h);
      let blobToUpload: Blob = file;

      if (check.isWidePanorama) {
        toast.info(t('services:polymaps_studio_wide_pano_detected', 'Mengesan foto Panorama memanjang telefon — menukar secara automatik ke nisbah 2:1...'));
        blobToUpload = await convertPhonePanoramaToEquirectangular(file, 4096, panoSweepDeg);
      }

      const uploadedUrl = await uploadBlobToImapsAssets(blobToUpload, 'studio360_direct');
      setPanoramaUrl(uploadedUrl);
      setStep('pins');
      toast.success(t('services:polymaps_studio_direct_upload_success', 'Imej 360° berjaya dimuat naik! Sekarang klik pada pintu bilik untuk letak pin.'));
    } catch (err: any) {
      console.error('Ralat muat naik 360:', err);
      toast.error(err.message || t('services:polymaps_studio_upload_failed', 'Gagal memuat naik imej 360°.'));
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAutoDetectGpsBuilding = () => {
    if (!navigator.geolocation) {
      toast.error(t('services:polymaps_studio_gps_unsupported', 'Pelayar anda tidak menyokong pengesanan GPS.'));
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const match = findNearestBuildingByGps(
          pos.coords.latitude,
          pos.coords.longitude,
          buildings,
          120
        );
        if (match) {
          setSelectedBuildingId(match.building.id);
          toast.success(
            t('services:polymaps_studio_gps_found', 'Dikesan berada berhampiran {{code}} - {{name}} (~{{dist}}m).', {
              code: match.building.code,
              name: match.building.name,
              dist: match.distanceMeters,
            })
          );
        } else {
          toast.warning(
            t('services:polymaps_studio_gps_not_found', 'Tiada bangunan kampus dalam radius 120m daripada GPS semasa anda. Sila pilih secara manual.')
          );
        }
      },
      (err) => {
        setIsDetectingGps(false);
        console.warn('Ralat GPS:', err);
        toast.error(t('services:polymaps_studio_gps_failed', 'Gagal mendapatkan lokasi GPS. Pastikan kebenaran lokasi diaktifkan.'));
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Apabila pengguna klik pada titik dalam 360° untuk letak pin baharu
  const handle360CanvasClick = ({ pitch, yaw }: { pitch: number; yaw: number }) => {
    const clockHint = formatYawToClockDirection(yaw, currentLang);
    setDraftPin({
      index: null,
      pin_type: 'room',
      room_code: '',
      label: '',
      floor_level: floorLevel || '1',
      description: t('services:polymaps_studio_door_direction_prefix', 'Pintu terletak {{hint}}.', { hint: clockHint }),
      pitch,
      yaw,
      target_panorama_url: '',
    });
  };

  const handleDraftRoomCodeChange = (value: string) => {
    if (!draftPin) return;
    const inferred = inferRoomMetadata(value, selectedBuilding?.code, draftPin.yaw, currentLang);
    setDraftPin({
      ...draftPin,
      room_code: value,
      label: value,
      floor_level: inferred.floor_level || draftPin.floor_level,
      description: inferred.direction_text,
    });
  };

  const handleSaveDraftPin = () => {
    if (!draftPin) return;
    const finalLabel = (draftPin.label || draftPin.room_code || '').trim();
    if (!finalLabel) {
      toast.warning(t('services:polymaps_studio_enter_pin_label', 'Sila masukkan Kod / Nama Bilik atau Label Pin.'));
      return;
    }

    const newPin: PolyMaps360HotspotDraft = {
      id: draftPin.index !== null ? hotspots[draftPin.index]?.id : `pin-${Date.now()}`,
      panorama_url: panoramaUrl,
      building_id: selectedBuildingId || null,
      location_id: selectedLocationId || null,
      pin_type: draftPin.pin_type,
      room_code: draftPin.pin_type === 'room' ? (draftPin.room_code || finalLabel).trim() : null,
      label: finalLabel,
      floor_level: draftPin.floor_level || floorLevel || '1',
      description: draftPin.description.trim() || null,
      pitch: draftPin.pitch,
      yaw: draftPin.yaw,
      target_panorama_url:
        draftPin.pin_type === 'scene' && draftPin.target_panorama_url.trim()
          ? draftPin.target_panorama_url.trim()
          : null,
    };

    if (draftPin.index !== null) {
      const updated = [...hotspots];
      updated[draftPin.index] = newPin;
      setHotspots(updated);
      toast.success(t('services:polymaps_studio_pin_updated', 'Pin "{{label}}" dikemas kini.', { label: finalLabel }));
    } else {
      setHotspots((prev) => [...prev, newPin]);
      toast.success(
        t('services:polymaps_studio_pin_added', 'Pin "{{label}}" ditambah pada sudut Yaw {{yaw}}°.', {
          label: finalLabel,
          yaw: newPin.yaw,
        })
      );
    }

    setDraftPin(null);
  };

  const handleDeletePin = (idx: number) => {
    setHotspots((prev) => prev.filter((_, i) => i !== idx));
    if (draftPin?.index === idx) setDraftPin(null);
  };

  const handlePublishOrSubmit = async () => {
    if (!panoramaUrl.trim()) {
      toast.error(t('services:polymaps_studio_need_image', 'Sila rakam atau muat naik imej 360° terlebih dahulu.'));
      return;
    }
    if (!selectedBuildingId) {
      toast.error(t('services:polymaps_studio_need_building', 'Sila pilih Bangunan sasaran.'));
      return;
    }

    setIsSavingAll(true);
    try {
      if (isAdminMode) {
        // 1. Jika lokasi spesifik dipilih, kemas kini lokasi tersebut; jika tidak, kemas kini bangunan
        if (selectedLocationId) {
          const firstRoomPin = hotspots.find((h) => h.pin_type === 'room');
          await supabase
            .from('imaps_locations')
            .update({
              panorama_360_url: panoramaUrl,
              is_360_enabled: true,
              ...(firstRoomPin
                ? { target_yaw: firstRoomPin.yaw, target_pitch: firstRoomPin.pitch }
                : {}),
            })
            .eq('id', selectedLocationId);
        } else {
          await supabase
            .from('imaps_buildings')
            .update({
              panorama_360_url: panoramaUrl,
              is_360_enabled: true,
            })
            .eq('id', selectedBuildingId);
        }

        // 2. Auto-Cipta / Kemas Kini semua Pin Bilik dalam imaps_locations (1-Koridor Multi-Pin Batch Creator)
        const roomPins = hotspots.filter((h) => h.pin_type === 'room' && (h.room_code || h.label));
        const roomCodeToLocationId = new Map<string, string>();

        if (batchCreateRooms && roomPins.length > 0) {
          const updatePromises: Promise<unknown>[] = [];
          const newLocationsPayload: Array<Record<string, unknown>> = [];

          for (const pin of roomPins) {
            const codeText = (pin.room_code || pin.label).trim();
            const inferred = inferRoomMetadata(codeText, selectedBuilding?.code, pin.yaw, currentLang);

            const existingLoc = buildingLocations.find(
              (l) => l.room_code.trim().toLowerCase() === codeText.toLowerCase()
            );

            if (existingLoc) {
              roomCodeToLocationId.set(codeText.toLowerCase(), existingLoc.id);
              updatePromises.push(
                Promise.resolve(
                  supabase
                    .from('imaps_locations')
                    .update({
                      panorama_360_url: panoramaUrl,
                      is_360_enabled: true,
                      target_yaw: pin.yaw,
                      target_pitch: pin.pitch,
                      floor_level: pin.floor_level || existingLoc.floor_level || inferred.floor_level,
                      direction_text: pin.description || inferred.direction_text,
                    })
                    .eq('id', existingLoc.id)
                )
              );
            } else {
              newLocationsPayload.push({
                building_id: selectedBuildingId,
                room_code: codeText,
                floor_level: pin.floor_level || floorLevel || inferred.floor_level,
                direction_text: pin.description || inferred.direction_text,
                search_tags: inferred.search_tags,
                panorama_360_url: panoramaUrl,
                is_360_enabled: true,
                target_yaw: pin.yaw,
                target_pitch: pin.pitch,
              });
            }
          }

          const [, insertedRes] = await Promise.all([
            Promise.all(updatePromises),
            newLocationsPayload.length > 0
              ? supabase.from('imaps_locations').insert(newLocationsPayload).select('id, room_code')
              : Promise.resolve({ data: [] as Array<{ id: string; room_code: string }> }),
          ]);

          if (insertedRes?.data) {
            for (const row of insertedRes.data) {
              if (row.id && row.room_code) {
                roomCodeToLocationId.set(row.room_code.trim().toLowerCase(), row.id);
              }
            }
          }
        }

        // 3. Simpan semua hotspot ke dalam jadual imaps_360_hotspots
        await supabase.from('imaps_360_hotspots').delete().eq('panorama_url', panoramaUrl);

        if (hotspots.length > 0) {
          const rowsToInsert = hotspots.map((h) => {
            const lookupKey = (h.room_code || h.label || '').trim().toLowerCase();
            const matchedLocId = roomCodeToLocationId.get(lookupKey) || h.location_id || selectedLocationId || null;
            return {
              panorama_url: panoramaUrl,
              building_id: selectedBuildingId,
              location_id: matchedLocId,
              pin_type: h.pin_type,
              label: h.label,
              room_code: h.room_code || null,
              floor_level: h.floor_level || floorLevel || '1',
              description: h.description || null,
              pitch: h.pitch,
              yaw: h.yaw,
              target_panorama_url: h.target_panorama_url || null,
              created_by: currentUserId || null,
            };
          });

          const { error: hsError } = await supabase.from('imaps_360_hotspots').insert(rowsToInsert);
          if (hsError) throw hsError;
        }

        toast.success(
          t('services:polymaps_studio_published_toast', 'Berjaya diterbitkan! {{pins}} pin 360° & {{rooms}} bilik telah disegerakkan.', {
            pins: hotspots.length,
            rooms: roomPins.length,
          })
        );
      } else {
        // Mod Sukarelawan / Pelajar -> Hantar ke imaps_field_submissions untuk kelulusan 1-klik JPP
        const roomCodesHint = hotspots
          .filter((h) => h.pin_type === 'room')
          .map((h) => h.room_code || h.label)
          .join(', ');

        const { error: subError } = await supabase.from('imaps_field_submissions').insert([
          {
            building_id: selectedBuildingId,
            location_id: selectedLocationId || null,
            contributor_id: currentUserId || null,
            contributor_name: currentUserName || t('services:polymaps_studio_default_volunteer', 'Sukarelawan Kampus'),
            floor_level: floorLevel || '1',
            room_code_hint: roomCodesHint || null,
            panorama_360_url: panoramaUrl,
            hotspots_json: hotspots,
            notes: volunteerNotes.trim() || null,
            status: 'pending',
          },
        ]);

        if (subError) throw subError;

        await sendNotificationToJppAndSuperAdmin({
          title: t('services:polymaps_studio_notif_title', '🎥 Sumbangan 360° & Pin PolyMaps Baharu'),
          message: t('services:polymaps_studio_notif_message', '{{name}} telah menghantar panorama 360° dengan {{count}} pin pintu bilik bagi bangunan {{code}}.', {
            name: currentUserName || t('services:polymaps_sub_default_contributor', 'Sukarelawan'),
            count: hotspots.length,
            code: selectedBuilding?.code || '',
          }),
          type: 'MAPS_MISSING_REPORT',
          module: 'JPP',
          link: '/jpp/polymaps?tab=reports',
        });

        toast.success(
          t('services:polymaps_studio_submitted_toast', 'Terima kasih! Rakaman 360° & pin bilik anda telah dihantar kepada JPP untuk pengesahan 1-klik.')
        );
      }

      if (onSaved) {
        onSaved({
          panoramaUrl,
          hotspots,
          buildingId: selectedBuildingId,
          locationId: selectedLocationId || undefined,
        });
      }
      onClose();
    } catch (err: any) {
      console.error('Gagal menyimpan Studio 360:', err);
      toast.error(err.message || t('services:polymaps_studio_save_error', 'Ralat semasa menyimpan data 360°.'));
    } finally {
      setIsSavingAll(false);
    }
  };

  if (!isOpen) return null;

  const prevCapturedFrame =
    capturedFrames.length > 0 ? capturedFrames[capturedFrames.length - 1] : null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header Studio */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {t('services:polymaps_studio_title', 'Studio Rakaman 360° & Pin Pintu Bilik')}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {isAdminMode
                    ? t('services:polymaps_studio_mode_jpp', 'Mod JPP (Terbit Terus)')
                    : t('services:polymaps_studio_mode_volunteer', 'Mod Sukarelawan Lapangan')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('services:polymaps_studio_subtitle', 'Rakam 360° terus dari pelayar atau tukar foto Pano telefon, kemudian klik pintu bilik untuk letak pin interaktif.')}
              </p>
            </div>
          </div>

          {/* Stepper Switch */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStep('capture')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  step === 'capture'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t('services:polymaps_studio_step_capture', '1. Rakam / Muat Naik 360°')}
              </button>
              <button
                type="button"
                disabled={!panoramaUrl}
                onClick={() => setStep('pins')}
                className={`px-3 py-1.5 rounded-lg transition-all disabled:opacity-40 ${
                  step === 'pins'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {t('services:polymaps_studio_step_pins', '2. Letak Pin Pintu ({{count}})', { count: hotspots.length })}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bar Konteks Bangunan & Aras (Sentiasa Kelihatan) */}
        <div className="px-5 py-3 bg-slate-100/70 dark:bg-slate-950/60 border-b border-slate-200/70 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-5 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setSelectedLocationId('');
              }}
              className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
            >
              <option value="">{t('services:polymaps_studio_select_building', '-- Pilih Bangunan / Blok --')}</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} - {b.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAutoDetectGpsBuilding}
              disabled={isDetectingGps}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
              title={t('services:polymaps_studio_gps_tooltip', 'Kesan bangunan terdekat menggunakan GPS telefon anda')}
            >
              {isDetectingGps ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span className="hidden md:inline">{t('services:polymaps_studio_gps_btn', 'Kesan GPS')}</span>
            </button>
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={floorLevel}
              onChange={(e) => setFloorLevel(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
            >
              <option value="G">{t('services:polymaps_studio_floor_g', 'Aras Bawah (G)')}</option>
              <option value="1">{t('services:polymaps_studio_floor_n', 'Aras {{level}}', { level: 1 })}</option>
              <option value="2">{t('services:polymaps_studio_floor_n', 'Aras {{level}}', { level: 2 })}</option>
              <option value="3">{t('services:polymaps_studio_floor_n', 'Aras {{level}}', { level: 3 })}</option>
              <option value="4">{t('services:polymaps_studio_floor_n', 'Aras {{level}}', { level: 4 })}</option>
              <option value="5">{t('services:polymaps_studio_floor_n', 'Aras {{level}}', { level: 5 })}</option>
            </select>
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100"
            >
              <option value="">{t('services:polymaps_studio_corridor_option', 'Koridor Umum / Pelbagai Bilik Serentak')}</option>
              {buildingLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {t('services:polymaps_studio_specific_room_option', 'Bilik Spesifik: {{code}} (Aras {{level}})', {
                    code: loc.room_code,
                    level: loc.floor_level,
                  })}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kandungan Utama */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {step === 'capture' ? (
            <div className="space-y-5">
              {/* Pilihan 3 Kaedah Input 360° */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setCaptureTab('camera')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    captureTab === 'camera'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      <Camera className="w-4 h-4" /> {t('services:polymaps_studio_method1_badge', 'Kaedah 1 (Disyorkan)')}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      {t('services:polymaps_studio_method1_tag', 'Terus Dalam Web')}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {t('services:polymaps_studio_method1_title', 'Perakam 360° Berpandu AR')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('services:polymaps_studio_method1_desc', 'Pusing 360° mengikut panduan cincin 8-titik & penimbang tegak. Sistem cantum automatik.')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setCaptureTab('pano_convert');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    captureTab === 'pano_convert'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      <Wand2 className="w-4 h-4" /> {t('services:polymaps_studio_method2_badge', 'Kaedah 2 (Paling Tajam)')}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300">
                      {t('services:polymaps_studio_method2_tag', 'Auto-Nisbah 2:1')}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {t('services:polymaps_studio_method2_title', "Tukar Foto Mod 'Pano' Telefon")}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('services:polymaps_studio_method2_desc', 'Ambil gambar guna mod Panorama asal kamera iPhone/Android & muat naik untuk ditukar ke 360°.')}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setCaptureTab('upload');
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    captureTab === 'upload'
                      ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-500/10 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      <Upload className="w-4 h-4" /> {t('services:polymaps_studio_method3_badge', 'Kaedah 3')}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {t('services:polymaps_studio_method3_title', 'Fail 360° Sedia Ada / URL')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {t('services:polymaps_studio_method3_desc', 'Muat naik fail Equirectangular (Insta360 / Street View) atau tampal pautan URL imej 360°.')}
                  </p>
                </button>
              </div>

              {/* Kandungan Mengikut Tab */}
              {captureTab === 'camera' && (
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-white overflow-hidden">
                  {!isCameraActive ? (
                    <div className="p-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                        <Camera className="w-8 h-8" />
                      </div>
                      <div className="max-w-lg mx-auto space-y-1.5">
                        <h3 className="text-base font-black">
                          {t('services:polymaps_studio_ar_heading', 'Rakaman Panorama 360° Berpandu Secara Terus')}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {t('services:polymaps_studio_ar_desc', 'Berdiri di tengah koridor atau hadapan pintu bilik. Pegang telefon MELINTANG (landscape) pada paras mata, dan pusing perlahan-lahan mengikut 8 sasaran kompas (45° setiap langkah). Telefon ditegakkan mengurangkan liputan mendatar dan meninggalkan jurang kabur.')}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={startGuidedCamera}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
                        >
                          <Camera className="w-4 h-4" />
                          {t('services:polymaps_studio_ar_start_btn', 'Aktifkan Kamera & Panduan 360°')}
                        </button>
                        {panoramaUrl && (
                          <button
                            type="button"
                            onClick={() => setStep('pins')}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all"
                          >
                            {t('services:polymaps_studio_use_existing_btn', 'Guna Imej 360° Sedia Ada')}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative w-full h-[360px] sm:h-[440px] bg-black overflow-hidden">
                        <video
                          ref={videoRef}
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Panduan Pertindihan Ghost-Edge (25% sisi kanan gambar sebelum ini di sebelah kiri skrin) */}
                        {prevCapturedFrame && (
                          <div className="absolute inset-y-0 left-0 w-1/4 overflow-hidden pointer-events-none border-r-2 border-dashed border-emerald-400/80 opacity-55">
                            <img
                              src={prevCapturedFrame}
                              alt={t('services:polymaps_studio_overlap_alt', 'Panduan pertindihan sisi')}
                              className="h-full max-w-none object-cover"
                              style={{ width: '400%', transform: 'translateX(-75%)' }}
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-black text-emerald-300">
                              {t('services:polymaps_studio_overlap_label', 'Tindihkan Sisi Ini')}
                            </div>
                          </div>
                        )}

                        {/* Garisan Ufuk & Sasaran Tengah (Spirit Level HUD) */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div
                            className="w-48 h-0.5 bg-white/40 transition-transform"
                            style={{ transform: `rotate(${deviceRoll}deg)` }}
                          />
                          <div className="w-14 h-14 rounded-full border-2 border-emerald-400/90 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                          </div>
                        </div>

                        {/* Status Bar Atas Viewfinder */}
                        <div className="absolute top-3 inset-x-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 border border-white/15 text-xs font-black">
                            <span className="text-emerald-400">
                              {t('services:polymaps_studio_segment_counter', 'Segmen {{current}} / 8', { current: capturedFrames.length })}
                            </span>
                            <span className="text-slate-400">•</span>
                            <span>
                              {t('services:polymaps_studio_target_angle', 'Sasaran: {{angle}}°', { angle: TARGET_YAW_ANGLES[capturedFrames.length] ?? 360 })}
                            </span>
                            {hasGyroscope && (
                              <>
                                <span className="text-slate-400">•</span>
                                <span className="text-amber-300">
                                  {t('services:polymaps_studio_compass_angle', 'Kompas: {{angle}}°', { angle: compassHeading })}
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {hasGyroscope && (
                              <button
                                type="button"
                                onClick={() => setAutoSnapEnabled((v) => !v)}
                                className={`px-3 py-1.5 rounded-full text-xs font-black border transition-colors ${
                                  autoSnapEnabled
                                    ? 'bg-emerald-500 text-slate-950 border-white'
                                    : 'bg-black/70 text-slate-200 border-white/20'
                                }`}
                              >
                                {autoSnapEnabled
                                  ? t('services:polymaps_studio_autosnap_on', '⚡ Auto-Snap Aktif')
                                  : t('services:polymaps_studio_autosnap_off', 'Auto-Snap: Mati')}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setCapturedFrames([]);
                                setCapturedYaws([]);
                              }}
                              className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-xs font-bold border border-white/15"
                            >
                              <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                              {t('services:polymaps_studio_restart', 'Mula Semula')}
                            </button>
                          </div>
                        </div>

                        {isPortraitFrame && (
                          <div className="absolute top-16 inset-x-3 px-3 py-2 rounded-xl bg-amber-400/95 text-slate-950 text-[11px] font-bold leading-snug shadow-lg">
                            <RotateCcw className="w-3.5 h-3.5 inline mr-1 align-[-2px]" />
                            {t('services:polymaps_studio_portrait_warning', 'Telefon ditegakkan: liputan mendatar hanya ~42°, jadi ada jurang kabur antara segmen. Pusing telefon ke MELINTANG (landscape) untuk hasil penuh.')}
                          </div>
                        )}

                        {/* Bar Kemajuan 8 Segmen di Bawah Viewfinder */}
                        <div className="absolute bottom-4 inset-x-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/75 border border-white/15 p-3 rounded-2xl">
                          <div className="flex items-center gap-1.5">
                            {TARGET_YAW_ANGLES.map((deg, idx) => {
                              const done = idx < capturedFrames.length;
                              const current = idx === capturedFrames.length;
                              return (
                                <div
                                  key={deg}
                                  className={`w-8 h-8 rounded-xl flex flex-col items-center justify-center text-[10px] font-black border transition-all ${
                                    done
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                                      : current
                                      ? 'bg-amber-400 text-slate-950 border-white scale-110'
                                      : 'bg-white/10 text-slate-400 border-white/10'
                                  }`}
                                >
                                  <span>{idx + 1}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={captureCurrentVideoFrame}
                              disabled={isStitching || isUploading || capturedFrames.length >= 8}
                              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg active:scale-95 disabled:opacity-50"
                            >
                              {t('services:polymaps_studio_capture_btn', '📸 Tangkap Segmen {{num}}/8', {
                                num: Math.min(8, capturedFrames.length + 1),
                              })}
                            </button>

                            {capturedFrames.length >= 4 && (
                              <button
                                type="button"
                                onClick={() => handleStitchCapturedFrames(capturedFrames)}
                                disabled={isStitching || isUploading}
                                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg active:scale-95 disabled:opacity-50"
                              >
                                {isStitching || isUploading ? (
                                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                                ) : null}
                                {t('services:polymaps_studio_stitch_btn', 'Cantum Sekarang ({{count}})', {
                                  count: capturedFrames.length,
                                })}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {captureTab === 'pano_convert' && (
                <div className="p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                    <Wand2 className="w-7 h-7" />
                  </div>
                  <div className="max-w-lg mx-auto space-y-1">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {t('services:polymaps_studio_pano_heading', "Auto-Konversi Foto Mod 'Panorama' Kamera Telefon")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {t('services:polymaps_studio_pano_desc', 'Buka aplikasi Kamera asal telefon anda, pilih mod Pano / Panorama, dan pusing perlahan sehingga kamera berhenti sendiri (iPhone berhenti pada ~240°). Kemudian muat naik gambar tersebut di sini — sistem akan menukarkannya kepada sfera 360° Equirectangular (2:1) secara automatik.')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {t('services:polymaps_studio_pano_sweep_label', 'Lebar sapuan pano:')}
                    </span>
                    {[180, 240, 360].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => setPanoSweepDeg(deg)}
                        className={`px-3 py-1 rounded-lg text-[11px] font-black border transition-colors ${
                          panoSweepDeg === deg
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 max-w-md mx-auto">
                    {t('services:polymaps_studio_pano_sweep_hint', 'Padankan dengan sudut sebenar sapuan anda. Jika tidak padan, lebar bilik akan nampak tersasar (terlalu lebar atau termampat).')}
                  </p>
                  <div>
                    <label className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <span>
                        {isUploading
                          ? t('services:polymaps_studio_pano_uploading', 'Menukar & Memuat Naik 360°...')
                          : t('services:polymaps_studio_pano_choose', 'Pilih Foto Panorama Telefon')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhonePanoFileSelect}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {captureTab === 'upload' && (
                <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        {t('services:polymaps_studio_upload_heading', 'Muat Naik Fail Imej 360° Sedia Ada')}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {t('services:polymaps_studio_upload_desc', 'Menyokong sebarang imej JPG/PNG/WebP daripada kamera Insta360, Ricoh Theta, Google Street View, atau foto Panorama telefon.')}
                      </p>
                      <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs cursor-pointer shadow-md transition-all">
                        {isUploading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        <span>
                          {isUploading
                            ? t('services:polymaps_studio_uploading', 'Memuat Naik...')
                            : t('services:polymaps_studio_upload_btn', 'Muat Naik Fail 360°')}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDirect360Upload}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
                        {t('services:polymaps_studio_paste_url_label', 'Atau Tampal URL Panorama 360° Sedia Ada:')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={panoramaUrl}
                          onChange={(e) => setPanoramaUrl(e.target.value)}
                          placeholder="https://.../panorama_360.jpg"
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          disabled={!panoramaUrl.trim()}
                          onClick={() => setStep('pins')}
                          className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white dark:text-slate-950 font-black text-xs disabled:opacity-40"
                        >
                          {t('services:polymaps_studio_continue_pins', 'Teruskan Ke Pin')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: INTERACTIVE 360 PIN STUDIO */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Kiri: Kanvas 360° Interaktif */}
              <div className="lg:col-span-8 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-500/10 border border-emerald-500/25 px-3.5 py-2.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span>
                      {t('services:polymaps_studio_how_to_pin', 'Cara Letak Pin: Pusing 360° ke arah pintu bilik / makmal / tangga, kemudian klik terus pada pintu tersebut.')}
                    </span>
                  </div>
                  {stitchedBlobUrl && (
                    <a
                      href={stitchedBlobUrl}
                      download={`polymaps_360_${selectedBuilding?.code || 'campus'}_level_${floorLevel}.jpg`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-700 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {t('services:polymaps_studio_save_jpg', 'Simpan .JPG')}
                    </a>
                  )}
                </div>

                <div className="rounded-3xl overflow-hidden border-2 border-emerald-500/40 shadow-xl h-[380px] sm:h-[460px]">
                  <Pannellum360Viewer
                    imageUrl={panoramaUrl}
                    title={t('services:polymaps_studio_canvas_title', '{{code}} • Aras {{level}}', {
                      code: selectedBuilding?.code || 'Kampus',
                      level: floorLevel,
                    })}
                    hotspots={hotspots}
                    editable={true}
                    autoRotate={false}
                    onMapClick={handle360CanvasClick}
                    onHotspotClick={(hs) => {
                      const idx = hotspots.findIndex(
                        (item) => item.id === hs.id || (item.yaw === hs.yaw && item.pitch === hs.pitch)
                      );
                      if (idx >= 0) {
                        const target = hotspots[idx];
                        setDraftPin({
                          index: idx,
                          pin_type: target.pin_type,
                          room_code: target.room_code || target.label,
                          label: target.label,
                          floor_level: target.floor_level || floorLevel || '1',
                          description: target.description || '',
                          pitch: target.pitch,
                          yaw: target.yaw,
                          target_panorama_url: target.target_panorama_url || '',
                        });
                      }
                    }}
                  />
                </div>
              </div>

              {/* Kanan: Panel Borang Pin & Senarai Pin Koridor */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {draftPin ? (
                  <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/40 dark:bg-slate-800/90 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        {draftPin.index !== null
                          ? t('services:polymaps_studio_edit_pin', '✏️ Kemas Kini Pin 360°')
                          : t('services:polymaps_studio_add_pin', '📍 Tambah Pin Pintu Baharu')}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        Yaw: {draftPin.yaw}° | Pitch: {draftPin.pitch}°
                      </span>
                    </div>

                    {/* Jenis Pin */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'room', label: t('services:polymaps_studio_pin_type_room', '🚪 Bilik/Makmal') },
                        { id: 'info', label: t('services:polymaps_studio_pin_type_info', '🪜 Tangga/Tandas') },
                        { id: 'scene', label: t('services:polymaps_studio_pin_type_scene', '🧭 Ke Koridor') },
                      ].map((tItem) => (
                        <button
                          key={tItem.id}
                          type="button"
                          onClick={() =>
                            setDraftPin({
                              ...draftPin,
                              pin_type: tItem.id as 'room' | 'info' | 'scene',
                            })
                          }
                          className={`py-1.5 px-2 rounded-xl text-[11px] font-black border transition-all ${
                            draftPin.pin_type === tItem.id
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {tItem.label}
                        </button>
                      ))}
                    </div>

                    {draftPin.pin_type === 'room' ? (
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                          {t('services:polymaps_studio_pin_room_label', 'Kod & Nama Bilik (Auto-Teka Aras & Arah):')}
                        </label>
                        <input
                          type="text"
                          value={draftPin.room_code}
                          onChange={(e) => handleDraftRoomCodeChange(e.target.value)}
                          placeholder={t('services:polymaps_studio_pin_room_placeholder', 'Cth: EA301 - Makmal Komputer 1')}
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                          {t('services:polymaps_studio_pin_label', 'Label Pin Kemudahan / Laluan:')}
                        </label>
                        <input
                          type="text"
                          value={draftPin.label}
                          onChange={(e) => setDraftPin({ ...draftPin, label: e.target.value })}
                          placeholder={
                            draftPin.pin_type === 'scene'
                              ? t('services:polymaps_studio_pin_scene_placeholder', 'Cth: Terus Ke Koridor Sayap B')
                              : t('services:polymaps_studio_pin_info_placeholder', 'Cth: Tangga Utama Aras 3 / Tandas')
                          }
                          className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          autoFocus
                        />
                      </div>
                    )}

                    {draftPin.pin_type === 'scene' && (
                      <div>
                        <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                          {t('services:polymaps_studio_pin_target_pano', 'Pautan Panorama Sasaran (Pilihan):')}
                        </label>
                        <input
                          type="url"
                          value={draftPin.target_panorama_url}
                          onChange={(e) =>
                            setDraftPin({ ...draftPin, target_panorama_url: e.target.value })
                          }
                          placeholder="https://.../koridor_sebelah.jpg"
                          className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-black text-slate-700 dark:text-slate-300 mb-1">
                        {t('services:polymaps_studio_pin_desc_label', 'Panduan Arah Ringkas (Dijana Automatik):')}
                      </label>
                      <textarea
                        rows={2}
                        value={draftPin.description}
                        onChange={(e) => setDraftPin({ ...draftPin, description: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveDraftPin}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                        {t('services:polymaps_studio_save_pin_btn', 'Simpan Pin Ini')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftPin(null)}
                        className="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs"
                      >
                        {t('services:polymaps_bulk_cancel', 'Batal')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-center">
                    <MapPin className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {t('services:polymaps_studio_empty_pin_title', 'Klik Mana-Mana Pintu Dalam Gambar 360°')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('services:polymaps_studio_empty_pin_desc', 'Anda boleh letak banyak pin bilik serentak (cth: A301, A302, A303) dalam satu gambar koridor yang sama!')}
                    </p>
                  </div>
                )}

                {/* Senarai Pin Dalam 360° Ini */}
                <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3.5 flex flex-col min-h-[200px]">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {t('services:polymaps_studio_pins_list_title', 'Senarai Pin Dalam 360° ({{count}})', { count: hotspots.length })}
                    </h4>
                  </div>

                  {hotspots.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-center text-xs text-slate-400 py-8">
                      {t('services:polymaps_studio_pins_empty', 'Belum ada pin diletakkan pada panorama ini.')}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {hotspots.map((hs, idx) => (
                        <div
                          key={hs.id || idx}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span>
                                {hs.pin_type === 'room' ? '🚪' : hs.pin_type === 'scene' ? '🧭' : '🪜'}
                              </span>
                              <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                                {hs.room_code || hs.label}
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">
                              {t('services:polymaps_studio_pin_meta', 'Aras {{level}} • Yaw {{yaw}}°', {
                                level: hs.floor_level || floorLevel,
                                yaw: hs.yaw,
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setDraftPin({
                                  index: idx,
                                  pin_type: hs.pin_type,
                                  room_code: hs.room_code || hs.label,
                                  label: hs.label,
                                  floor_level: hs.floor_level || floorLevel || '1',
                                  description: hs.description || '',
                                  pitch: hs.pitch,
                                  yaw: hs.yaw,
                                  target_panorama_url: hs.target_panorama_url || '',
                                })
                              }
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title={t('services:polymaps_studio_edit_pin_title', 'Sunting Pin')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePin(idx)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title={t('services:polymaps_studio_delete_pin_title', 'Padam Pin')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Opsyen 1-Koridor Multi-Pin Batch Creator */}
                  {isAdminMode && (
                    <label className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={batchCreateRooms}
                        onChange={(e) => setBatchCreateRooms(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                        <strong className="text-slate-900 dark:text-white">
                          {t('services:polymaps_studio_batch_create_title', 'Auto-Daftarkan Semua Pin Bilik Ke Direktori Carian:')}
                        </strong>{' '}
                        {t('services:polymaps_studio_batch_create_desc', 'Setiap pin pintu bilik akan terus boleh dicari oleh pelajar dan menghadap tepat ke pintu tersebut.')}
                      </span>
                    </label>
                  )}

                  {!isAdminMode && (
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                        {t('services:polymaps_studio_volunteer_notes_label', 'Nota Tambahan Untuk JPP (Pilihan):')}
                      </label>
                      <input
                        type="text"
                        value={volunteerNotes}
                        onChange={(e) => setVolunteerNotes(e.target.value)}
                        placeholder={t('services:polymaps_studio_volunteer_notes_placeholder', 'Cth: Koridor Aras 3 berhadapan Makmal Rangkaian')}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {isAdminMode
                ? t('services:polymaps_studio_footer_admin', 'Semua pin bilik akan disimpan ke pangkalan data & diaktifkan dalam 360° serta-merta.')
                : t('services:polymaps_studio_footer_volunteer', 'Sumbangan anda akan dipratonton oleh JPP dan diterbitkan dengan 1 klik.')}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t('services:polymaps_bulk_cancel', 'Batal')}
            </button>

            <button
              type="button"
              disabled={!panoramaUrl || isSavingAll || isUploading}
              onClick={handlePublishOrSubmit}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSavingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {isAdminMode
                  ? t('services:polymaps_studio_submit_admin', 'Simpan & Terbitkan 360° ({{count}} Pin)', { count: hotspots.length })
                  : t('services:polymaps_studio_submit_volunteer', 'Hantar Sumbangan 360° ({{count}} Pin)', { count: hotspots.length })}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
