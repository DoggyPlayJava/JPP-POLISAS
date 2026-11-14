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
  RotateCcw,
  Eye,
  ArrowRight,
  ChevronDown,
  DoorOpen,
  Smartphone,
  Link2,
  SlidersHorizontal,
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
  stitchDualPhonePanoramasToEquirectangular,
  validateEquirectangularDimensions,
  estimatePhonePanoSweepDeg,
  computePhonePanoBandMetrics,
  appendPanoramaSweepHash,
  computeDeviceLevelAngles,
} from '@/lib/panoStitcher';
import { sendNotificationToJppAndSuperAdmin } from '@/lib/notifications';

function readImageDimensions(file: File): Promise<{ w: number; h: number }> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ w: img.width, h: img.height });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

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

const FOUR_CORNER_ANGLES = [0, 90, 180, 270];
const FOUR_CORNER_LABELS_MS = ['1. Depan', '2. Kanan', '3. Belakang', '4. Kiri'];
const FOUR_CORNER_LABELS_EN = ['1. Front', '2. Right', '3. Back', '4. Left'];

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
  const [captureTab, setCaptureTab] = useState<'pano_convert' | 'camera' | 'upload'>('pano_convert');
  const [panoMode, setPanoMode] = useState<'single' | 'dual'>('single');
  const [dualFrontFile, setDualFrontFile] = useState<File | null>(null);
  const [dualBackFile, setDualBackFile] = useState<File | null>(null);

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    initialBuildingId || buildings[0]?.id || ''
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>(initialLocationId || '');
  const [floorLevel, setFloorLevel] = useState<string>(initialFloorLevel || '1');
  const [panoramaUrl, setPanoramaUrl] = useState<string>(initialPanoramaUrl || '');
  const [stitchedBlobUrl, setStitchedBlobUrl] = useState<string | null>(null);
  const [volunteerNotes, setVolunteerNotes] = useState<string>('');

  // State Kamera 4-Sudut Pantas
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Kunci auto-snap: elak 3-4 tangkapan pada bearing yang sama sebelum React sempat render.
  const snapLockRef = useRef<number>(0);
  // Penapis lulus-rendah bulat (circular EMA) untuk bearing kompas.
  const headingRef = useRef<{ deg: number; init: boolean }>({ deg: 0, init: false });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [capturedYaws, setCapturedYaws] = useState<number[]>([]);
  const [panoSweepDeg, setPanoSweepDeg] = useState<number>(230);
  const [panoVerticalSweepDeg, setPanoVerticalSweepDeg] = useState<number | null>(null);
  const [isPortraitFrame, setIsPortraitFrame] = useState(false);
  const [hasGyroscope, setHasGyroscope] = useState(false);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [deviceRoll, setDeviceRoll] = useState<number>(0);
  const [devicePitch, setDevicePitch] = useState<number>(0);
  const [autoSnapEnabled, setAutoSnapEnabled] = useState<boolean>(false);
  const [isStitching, setIsStitching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showManualAngle, setShowManualAngle] = useState(false);
  const [showPinAdvanced, setShowPinAdvanced] = useState(false);

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
    setPanoVerticalSweepDeg(null);
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

  // Listener Sensor Giroskop / Penimbang Tegak Telefon (Membetulkan paksi Melintang vs Menegak)
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

      const screenAngle =
        typeof window.screen?.orientation?.angle === 'number'
          ? window.screen.orientation.angle
          : typeof (window as any).orientation === 'number'
          ? Number((window as any).orientation)
          : 0;
      const isLandscape = !isPortraitFrame || Math.abs(screenAngle) === 90 || Math.abs(screenAngle) === 270;
      const level = computeDeviceLevelAngles(event.beta, event.gamma, isLandscape);
      setDeviceRoll(level.roll);
      setDevicePitch(level.pitch);
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [isOpen, isCameraActive, isPortraitFrame]);

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
      const DevOrient = window.DeviceOrientationEvent as any;
      if (DevOrient && typeof DevOrient.requestPermission === 'function') {
        try {
          const permission = await DevOrient.requestPermission();
          if (permission !== 'granted') throw new Error('motion-denied');
        } catch {
          setHasGyroscope(false);
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
          const markOrientation = () => setIsPortraitFrame(video.videoHeight > video.videoWidth);
          video.onloadedmetadata = markOrientation;
          markOrientation();
          video.play().catch(() => {});
        }
      });
    } catch (err: any) {
      console.error('Ralat akses kamera:', err);
      toast.error(
        t('services:polymaps_studio_camera_error', 'Kamera tidak dapat diakses. Sila benarkan akses kamera atau gunakan tab Panorama Kamera Telefon.')
      );
    }
  };

  const captureCurrentVideoFrame = () => {
    if (!videoRef.current || capturedFrames.length >= 4) return;
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

    // Gunakan sudut kardinal 4-arah yang sekata (0°, 90°, 180°, 270°) supaya bebas daripada gangguan kompas magnetik bangunan
    const yaw = FOUR_CORNER_ANGLES[capturedFrames.length] ?? 0;
    const nextYaws = [...capturedYaws, yaw];
    setCapturedYaws(nextYaws);

    if (nextFrames.length === 4) {
      toast.success(
        t('services:polymaps_studio_4_corners_done_toast', 'Lengkap 4 sudut (Depan, Kanan, Belakang, Kiri)! Mencantumkan panorama 360°...')
      );
      void handleStitchCapturedFrames(nextFrames, nextYaws);
    } else {
      const nextLabel =
        currentLang === 'en'
          ? FOUR_CORNER_LABELS_EN[nextFrames.length]
          : FOUR_CORNER_LABELS_MS[nextFrames.length];
      toast.info(
        t(
          'services:polymaps_studio_4_corner_step_toast',
          'Sudut {{count}}/4 dirakam! Pusing ke kanan sehingga tepi gambar selari dengan jalur hijau di kiri ({{next}}).',
          {
            count: nextFrames.length,
            next: nextLabel,
          }
        )
      );
    }
  };

  const blobToCompactDataUrl = async (blob: Blob, maxW = 2048): Promise<string> => {
    const tempUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = tempUrl;
      });
      const w = Math.min(maxW, img.width || maxW);
      const h = Math.max(1, Math.round((img.height / Math.max(1, img.width)) * w));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(tempUrl);
    }
  };

  const uploadBlobToImapsAssets = async (blob: Blob, prefix = 'pano360'): Promise<string> => {
    const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const filePath = `polymaps/${fileName}`;

    try {
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
    } catch (storageErr) {
      console.warn('Muat naik storan terus tidak tersedia (mod sukarelawan awam), menggunakan imej terbenam:', storageErr);
      return await blobToCompactDataUrl(blob, 2048);
    }
  };

  const handleStitchCapturedFrames = async (
    framesToUse = capturedFrames,
    yawsToUse = capturedYaws
  ) => {
    if (framesToUse.length < 2) {
      toast.warning(
        t('services:polymaps_studio_min_2_segments', 'Sila rakam sekurang-kurangnya 2 sudut gambar sebelum cantum.')
      );
      return;
    }

    setIsStitching(true);
    try {
      const effectiveHfov = framesToUse.length <= 4 ? 96 : 68;
      const equirectBlob = await stitchHorizonFramesToEquirectangular(
        framesToUse,
        4096,
        2048,
        yawsToUse,
        effectiveHfov
      );
      if (stitchedBlobUrl) URL.revokeObjectURL(stitchedBlobUrl);
      const localUrl = URL.createObjectURL(equirectBlob);
      setStitchedBlobUrl(localUrl);

      stopCameraStream();
      setIsUploading(true);
      const uploadedUrl = await uploadBlobToImapsAssets(equirectBlob, 'studio360_4corner');
      const sweepTag = framesToUse.length >= 4 ? 360 : Math.min(360, framesToUse.length * 95);
      const approxVaov = framesToUse.length <= 4 ? 76 : 66;
      setPanoVerticalSweepDeg(approxVaov);
      setPanoramaUrl(appendPanoramaSweepHash(uploadedUrl, sweepTag, approxVaov));
      setStep('pins');
      toast.success(
        t('services:polymaps_studio_stitch_success', 'Panorama 360° berjaya dicantum & dimuat naik! Sila klik pintu bilik untuk letak pin.')
      );
    } catch (err: any) {
      console.error('Gagal mencantum/memuat naik 360:', err);
      toast.error(err.message || t('services:polymaps_studio_stitch_failed', 'Gagal mencantum panorama 360°.'));
    } finally {
      setIsStitching(false);
      setIsUploading(false);
    }
  };

  const processPhonePanoFile = async (file: File) => {
    setIsUploading(true);
    try {
      // Semak dimensi imej untuk menganggar sudut sapuan sebenar (cth: ~230° pada iPhone Pano)
      const dims = await readImageDimensions(file);
      let detectedSweep = panoSweepDeg;
      if (dims.w / Math.max(1, dims.h) > 2.2 && panoSweepDeg === 230) {
        detectedSweep = estimatePhonePanoSweepDeg(dims.w, dims.h);
        setPanoSweepDeg(detectedSweep);
      }
      const { verticalSweepDeg } = computePhonePanoBandMetrics(dims.w, dims.h, detectedSweep, 4096);

      const convertedBlob = await convertPhonePanoramaToEquirectangular(file, 4096, detectedSweep);
      if (stitchedBlobUrl) URL.revokeObjectURL(stitchedBlobUrl);
      setStitchedBlobUrl(URL.createObjectURL(convertedBlob));

      const uploadedUrl = await uploadBlobToImapsAssets(convertedBlob, 'studio360_pano');
      const taggedUrl = appendPanoramaSweepHash(uploadedUrl, detectedSweep, verticalSweepDeg);
      setPanoVerticalSweepDeg(verticalSweepDeg);
      setPanoramaUrl(taggedUrl);
      setDualFrontFile(file);
      setStep('pins');
      toast.success(
        detectedSweep < 350
          ? t(
              'services:polymaps_studio_partial_pano_toast',
              'Panorama {{deg}}° siap! Sudut pusingan dikunci pada {{deg}}° supaya tiada dinding kabur di belakang.',
              { deg: detectedSweep }
            )
          : t('services:polymaps_studio_pano_converted_toast', 'Foto Panorama Telefon berjaya ditukar kepada 360° Equirectangular (2:1)!')
      );
    } catch (err: any) {
      console.error('Ralat konversi pano:', err);
      toast.error(err.message || t('services:polymaps_studio_pano_convert_failed', 'Gagal menukar foto panorama telefon.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhonePanoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processPhonePanoFile(file);
  };

  const handleDualPhonePanoStitch = async (frontOverride?: File | null, backOverride?: File | null) => {
    const fFile = frontOverride ?? dualFrontFile;
    const bFile = backOverride ?? dualBackFile;
    if (!fFile || !bFile) {
      toast.warning(
        t('services:polymaps_studio_dual_need_both', 'Sila pilih kedua-dua gambar: Pano 1 (Menghadap Depan) dan Pano 2 (Menghadap Belakang).')
      );
      return;
    }

    setIsUploading(true);
    try {
      const effectiveSweep = panoSweepDeg || 230;
      const frontDims = await readImageDimensions(fFile);
      const { verticalSweepDeg } = computePhonePanoBandMetrics(
        frontDims.w,
        frontDims.h,
        effectiveSweep,
        4096
      );
      const mergedBlob = await stitchDualPhonePanoramasToEquirectangular(
        fFile,
        bFile,
        4096,
        effectiveSweep
      );
      if (stitchedBlobUrl) URL.revokeObjectURL(stitchedBlobUrl);
      setStitchedBlobUrl(URL.createObjectURL(mergedBlob));

      const uploadedUrl = await uploadBlobToImapsAssets(mergedBlob, 'studio360_dualpano');
      setPanoVerticalSweepDeg(verticalSweepDeg);
      setPanoramaUrl(appendPanoramaSweepHash(uploadedUrl, 360, verticalSweepDeg));
      setStep('pins');
      toast.success(
        t(
          'services:polymaps_studio_dual_stitched_toast',
          '2 Panorama (Depan + Belakang) berjaya digabung menjadi 360° Penuh Tanpa Kabur!'
        )
      );
    } catch (err: any) {
      console.error('Ralat cantuman 2 pano:', err);
      toast.error(err.message || t('services:polymaps_studio_pano_convert_failed', 'Gagal mencantumkan 2 panorama telefon.'));
    } finally {
      setIsUploading(false);
    }
  };

  const processDirect360File = async (file: File) => {
    setIsUploading(true);
    try {
      const dims = await readImageDimensions(file);
      const check = validateEquirectangularDimensions(dims.w, dims.h);
      let blobToUpload: Blob = file;
      let verticalVaov = 180;

      if (check.isWidePanorama) {
        toast.info(t('services:polymaps_studio_wide_pano_detected', 'Mengesan foto Panorama memanjang telefon — menukar secara automatik ke nisbah 2:1...'));
        verticalVaov = computePhonePanoBandMetrics(dims.w, dims.h, panoSweepDeg, 4096).verticalSweepDeg;
        blobToUpload = await convertPhonePanoramaToEquirectangular(file, 4096, panoSweepDeg);
      }

      const uploadedUrl = await uploadBlobToImapsAssets(blobToUpload, 'studio360_direct');
      setPanoVerticalSweepDeg(verticalVaov);
      setPanoramaUrl(
        check.isWidePanorama
          ? appendPanoramaSweepHash(uploadedUrl, panoSweepDeg, verticalVaov)
          : uploadedUrl
      );
      setStep('pins');
      toast.success(t('services:polymaps_studio_direct_upload_success', 'Imej 360° berjaya dimuat naik! Sekarang klik pada pintu bilik untuk letak pin.'));
    } catch (err: any) {
      console.error('Ralat muat naik 360:', err);
      toast.error(err.message || t('services:polymaps_studio_upload_failed', 'Gagal memuat naik imej 360°.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDirect360Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processDirect360File(file);
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
    setShowPinAdvanced(false);
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
            corridor_label: roomCodesHint || `Aras ${floorLevel || '1'}`,
            room_code_hint: roomCodesHint || null,
            panorama_360_url: panoramaUrl,
            hotspots_json: hotspots,
            hotspots_payload: hotspots,
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
  const cornerLabels = currentLang === 'en' ? FOUR_CORNER_LABELS_EN : FOUR_CORNER_LABELS_MS;
  const unmappedRoomsInBuilding = buildingLocations.filter((l) => !l.panorama_360_url);
  const selectedLocation = buildingLocations.find((l) => l.id === selectedLocationId) || null;
  const floorLevels = ['G', '1', '2', '3', '4', '5'];

  const handleCloseModal = () => {
    stopCameraStream();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-5xl max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header Studio Ringkas */}
        <div className="px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                {t('services:polymaps_studio_v3_title', 'Studio 360°')}
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shrink-0">
                {isAdminMode
                  ? t('services:polymaps_studio_v3_badge_admin', 'Admin JPP')
                  : t('services:polymaps_studio_v3_badge_volunteer', 'Sukarelawan')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Stepper Ringkas */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setStep('capture')}
                className={`px-2.5 sm:px-3 py-1 rounded-[10px] transition-colors duration-150 ${
                  step === 'capture'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {t('services:polymaps_studio_v3_step1', '1. Foto 360°')}
              </button>
              <button
                type="button"
                disabled={!panoramaUrl}
                onClick={() => setStep('pins')}
                className={`px-2.5 sm:px-3 py-1 rounded-[10px] transition-colors duration-150 disabled:opacity-40 ${
                  step === 'pins'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {hotspots.length > 0
                  ? t('services:polymaps_studio_v3_step2_count', '2. Pin Pintu ({{count}})', { count: hotspots.length })
                  : t('services:polymaps_studio_v3_step2', '2. Pin Pintu')}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCloseModal}
              aria-label={t('services:polymaps_bulk_cancel', 'Batal')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bar Konteks Lokasi 1-Baris (Bangunan + GPS + Cip Aras Terus) */}
        <div className="px-4 sm:px-5 py-2 bg-slate-50/70 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <select
              value={selectedBuildingId}
              onChange={(e) => {
                setSelectedBuildingId(e.target.value);
                setSelectedLocationId('');
              }}
              aria-label={t('services:polymaps_studio_select_building', '-- Pilih Bangunan / Blok --')}
              className="flex-1 min-w-[140px] sm:max-w-[260px] px-2.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
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
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:border-emerald-500 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors duration-150 active:scale-[0.97] disabled:opacity-50"
              title={t('services:polymaps_studio_gps_tooltip', 'Kesan bangunan terdekat menggunakan GPS telefon anda')}
            >
              {isDetectingGps ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              ) : (
                <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{t('services:polymaps_studio_v3_gps_short', 'GPS')}</span>
            </button>

            {selectedLocation && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold">
                <MapPin className="w-3 h-3" />
                <span>{selectedLocation.room_code}</span>
                <button
                  type="button"
                  onClick={() => setSelectedLocationId('')}
                  className="hover:text-emerald-900 dark:hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-0.5">
              {t('services:polymaps_studio_v3_level_prefix', 'Aras')}:
            </span>
            <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg">
              {floorLevels.map((lvl) => {
                const active = (floorLevel || '1') === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setFloorLevel(lvl)}
                    className={`min-w-[26px] px-1.5 py-0.5 rounded-md text-[11px] font-bold transition-colors duration-150 ${
                      active
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kandungan Utama */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {step === 'capture' ? (
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Bar Tab Kaedah Ringkas (3 Pilihan Padat) */}
              <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setCaptureTab('pano_convert');
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 ${
                    captureTab === 'pano_convert'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate">{t('services:polymaps_studio_v3_tab_pano', 'Panorama Telefon')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCaptureTab('camera')}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 ${
                    captureTab === 'camera'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span className="truncate">{t('services:polymaps_studio_v3_tab_camera', 'Kamera 4-Sudut')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setCaptureTab('upload');
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 ${
                    captureTab === 'upload'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span className="truncate">{t('services:polymaps_studio_v3_tab_file', 'Fail / URL')}</span>
                </button>
              </div>

              {/* TAB 1 (DEFAULT): PANORAMA KAMERA TELEFON */}
              {captureTab === 'pano_convert' && (
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t('services:polymaps_studio_v3_pano_hint', 'Rakam guna mod Pano kamera telefon.')}
                    </p>
                    <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setPanoMode('single')}
                        className={`px-2.5 py-1 rounded-[10px] transition-colors duration-150 ${
                          panoMode === 'single'
                            ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {t('services:polymaps_studio_v3_mode_1pano', '1 Pano (~230°)')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPanoMode('dual')}
                        className={`px-2.5 py-1 rounded-[10px] transition-colors duration-150 ${
                          panoMode === 'dual'
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {t('services:polymaps_studio_v3_mode_2pano', '2 Pano (360° Penuh)')}
                      </button>
                    </div>
                  </div>

                  {panoMode === 'single' ? (
                    <div className="space-y-3">
                      <label
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingOver(true);
                        }}
                        onDragLeave={() => setIsDraggingOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingOver(false);
                          const dropped = e.dataTransfer.files?.[0];
                          if (dropped) void processPhonePanoFile(dropped);
                        }}
                        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-8 sm:py-10 text-center cursor-pointer transition-colors duration-150 ${
                          isDraggingOver
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/15'
                            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/70 bg-slate-50/50 dark:bg-slate-950/30 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5'
                        }`}
                      >
                        {/* Ilustrasi Ringkas Sapuan Panorama 230° */}
                        <div className="mb-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
                          <svg width="72" height="34" viewBox="0 0 72 34" fill="none">
                            <path
                              d="M6 26C16 10 56 10 66 26"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeDasharray="4 4"
                              opacity="0.45"
                            />
                            <path
                              d="M12 23C22 11 50 11 60 23"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            <rect
                              x="30"
                              y="16"
                              width="12"
                              height="16"
                              rx="2.5"
                              fill="currentColor"
                              fillOpacity="0.14"
                              stroke="currentColor"
                              strokeWidth="1.75"
                            />
                          </svg>
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                          {t('services:polymaps_studio_v3_drop_title', 'Pilih atau seret gambar Panorama')}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md text-balance leading-relaxed">
                          {t(
                            'services:polymaps_studio_v3_drop_sub',
                            'Sudut ~230° iPhone & Android dikunci kemas tanpa dinding belakang kabur.'
                          )}
                        </p>

                        <span className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-transform duration-150 active:scale-[0.97]">
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span>
                            {isUploading
                              ? t('services:polymaps_studio_pano_uploading', 'Memproses & Memuat Naik Panorama...')
                              : t('services:polymaps_studio_v3_pick_photo_btn', 'Pilih Foto Panorama')}
                          </span>
                        </span>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhonePanoFileSelect}
                          disabled={isUploading}
                          className="hidden"
                        />
                      </label>

                      {/* Pendedahan Progresif: Kalibrasi Sudut Manual */}
                      <div className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => setShowManualAngle((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 py-1 px-2 rounded-lg transition-colors duration-150"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>
                            {t('services:polymaps_studio_v3_advanced_angle', 'Tetapan sudut manual')} · {t('services:polymaps_studio_v3_auto_tag', 'Auto')} ({panoSweepDeg}°)
                          </span>
                          <ChevronDown
                            className={`w-3 h-3 transition-transform duration-150 ${
                              showManualAngle ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {showManualAngle && (
                          <div className="mt-2 inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                            {[
                              { deg: 180, label: '180°' },
                              { deg: 230, label: '230° (iPhone)' },
                              { deg: 360, label: '360°' },
                            ].map((item) => (
                              <button
                                key={item.deg}
                                type="button"
                                onClick={() => setPanoSweepDeg(item.deg)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                                  panoSweepDeg === item.deg
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-700'
                                }`}
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Sub-Mod 2 Pano: Depan + Belakang = 360° Penuh */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label
                          className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-150 ${
                            dualFrontFile
                              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-500/10'
                              : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/70 bg-slate-50/50 dark:bg-slate-950/30'
                          }`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            {t('services:polymaps_studio_v3_dual_front_short', 'Pano 1: Depan')}
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 font-medium truncate max-w-full">
                            {dualFrontFile
                              ? `✓ ${dualFrontFile.name}`
                              : t('services:polymaps_studio_dual_front_title', 'Separuh Pertama Koridor (~230°)')}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm">
                            <Upload className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t('services:polymaps_studio_v3_dual_front_pick', 'Pilih Pano Depan')}</span>
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              if (f) setDualFrontFile(f);
                            }}
                            className="hidden"
                          />
                        </label>

                        <label
                          className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition-colors duration-150 ${
                            dualBackFile
                              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-500/10'
                              : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500/70 bg-slate-50/50 dark:bg-slate-950/30'
                          }`}
                        >
                          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                            {t('services:polymaps_studio_v3_dual_back_short', 'Pano 2: Belakang')}
                          </span>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 font-medium truncate max-w-full">
                            {dualBackFile
                              ? `✓ ${dualBackFile.name}`
                              : t('services:polymaps_studio_dual_back_title', 'Pusing Badan Menghadap Belakang (~230°)')}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm">
                            <Upload className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t('services:polymaps_studio_v3_dual_back_pick', 'Pilih Pano Belakang')}</span>
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              if (f) {
                                setDualBackFile(f);
                                if (dualFrontFile) {
                                  void handleDualPhonePanoStitch(dualFrontFile, f);
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="flex justify-center">
                        <button
                          type="button"
                          disabled={!dualFrontFile || !dualBackFile || isUploading}
                          onClick={() => handleDualPhonePanoStitch()}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm disabled:opacity-40 transition-transform duration-150 active:scale-[0.97]"
                        >
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          <span>{t('services:polymaps_studio_v3_dual_stitch_short', 'Gabung Jadi 360° Penuh')}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: KAMERA 4-SUDUT PANTAS + BAYANG SEMPADAN VISUAL */}
              {captureTab === 'camera' && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-white overflow-hidden">
                  {!isCameraActive ? (
                    <div className="py-10 px-6 text-center space-y-4">
                      <div className="flex items-center justify-center gap-3 text-[11px] font-semibold text-slate-400">
                        {cornerLabels.map((lbl) => (
                          <span key={lbl} className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                            {lbl}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                        {t('services:polymaps_studio_v3_camera_short', 'Tangkap 4 sudut (Depan, Kanan, Belakang, Kiri) berpandukan bayang tepi.')}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={startGuidedCamera}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-sm transition-transform duration-150 active:scale-[0.97]"
                        >
                          <Camera className="w-4 h-4" />
                          {t('services:polymaps_studio_v3_open_camera', 'Buka Kamera')}
                        </button>
                        {panoramaUrl && (
                          <button
                            type="button"
                            onClick={() => setStep('pins')}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors duration-150"
                          >
                            {t('services:polymaps_studio_use_existing_btn', 'Guna Imej 360° Sedia Ada')}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="relative w-full h-[360px] sm:h-[420px] bg-black overflow-hidden">
                        <video
                          ref={videoRef}
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />

                        {/* Panduan Pertindihan Ghost-Edge */}
                        {prevCapturedFrame && (
                          <div className="absolute inset-y-0 left-0 w-1/4 overflow-hidden pointer-events-none border-r-2 border-dashed border-emerald-400/90 opacity-65">
                            <img
                              src={prevCapturedFrame}
                              alt={t('services:polymaps_studio_overlap_alt', 'Panduan pertindihan sisi')}
                              className="h-full max-w-none object-cover"
                              style={{ width: '400%', transform: 'translateX(-75%)' }}
                            />
                            <div className="absolute top-14 left-2 px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 text-[10px] font-bold shadow-md">
                              {t('services:polymaps_studio_overlap_label', '👈 Selarikan Dengan Sisi Ini')}
                            </div>
                          </div>
                        )}

                        {/* Garisan Ufuk & Sasaran Tengah */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                          <div
                            className="w-44 h-0.5 bg-white/50 transition-transform"
                            style={{ transform: `rotate(${deviceRoll}deg)` }}
                          />
                          <div className="w-12 h-12 rounded-full border-2 border-emerald-400/90 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          </div>
                        </div>

                        {/* Status Bar Atas Viewfinder */}
                        <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 border border-white/15 text-xs font-semibold">
                            <span className="text-emerald-400">
                              {t('services:polymaps_studio_4corner_counter', 'Sudut {{current}} / 4', {
                                current: Math.min(4, capturedFrames.length + 1),
                              })}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-amber-300">
                              {cornerLabels[capturedFrames.length] || 'Siap'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setCapturedFrames([]);
                              setCapturedYaws([]);
                            }}
                            className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 text-xs font-semibold border border-white/15"
                          >
                            <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                            {t('services:polymaps_studio_restart', 'Mula Semula')}
                          </button>
                        </div>

                        {/* Bar Kemajuan 4 Sudut di Bawah Viewfinder */}
                        <div className="absolute bottom-3 inset-x-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-black/80 border border-white/15 p-2.5 rounded-2xl">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {FOUR_CORNER_ANGLES.map((deg, idx) => {
                              const done = idx < capturedFrames.length;
                              const current = idx === capturedFrames.length;
                              return (
                                <span
                                  key={deg}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                                    done
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                                      : current
                                      ? 'bg-amber-400 text-slate-950 border-white'
                                      : 'bg-white/10 text-slate-400 border-white/10'
                                  }`}
                                >
                                  {cornerLabels[idx]}
                                </span>
                              );
                            })}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={captureCurrentVideoFrame}
                              disabled={isStitching || isUploading || capturedFrames.length >= 4}
                              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm active:scale-[0.97] disabled:opacity-50"
                            >
                              {t('services:polymaps_studio_capture_4corner_btn', '📸 Tangkap {{label}}', {
                                label: cornerLabels[capturedFrames.length] || '4/4',
                              })}
                            </button>

                            {capturedFrames.length >= 2 && (
                              <button
                                type="button"
                                onClick={() => handleStitchCapturedFrames(capturedFrames, capturedYaws)}
                                disabled={isStitching || isUploading}
                                className="px-3.5 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs shadow-sm active:scale-[0.97] disabled:opacity-50"
                              >
                                {isStitching || isUploading ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-1" />
                                ) : null}
                                {t('services:polymaps_studio_stitch_btn', 'Cantum ({{count}})', {
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

              {/* TAB 3: FAIL 360° SEDIA ADA / URL */}
              {captureTab === 'upload' && (
                <div className="space-y-4">
                  <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500/70 bg-slate-50/50 dark:bg-slate-950/30 px-6 py-8 text-center cursor-pointer transition-colors duration-150">
                    <Upload className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {t('services:polymaps_studio_upload_heading', 'Muat Naik Fail Imej 360° Sedia Ada')}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                      {t('services:polymaps_studio_upload_desc', 'Menyokong sebarang imej JPG/PNG/WebP daripada kamera Insta360, Ricoh Theta, Google Street View, atau foto Panorama telefon.')}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-transform duration-150 active:scale-[0.97]">
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>
                        {isUploading
                          ? t('services:polymaps_studio_uploading', 'Memuat Naik...')
                          : t('services:polymaps_studio_upload_btn', 'Muat Naik Fail 360°')}
                      </span>
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleDirect360Upload}
                      disabled={isUploading}
                      className="hidden"
                    />
                  </label>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {t('services:polymaps_studio_v3_url_or', 'Atau tampal pautan imej 360°')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={panoramaUrl}
                        onChange={(e) => setPanoramaUrl(e.target.value)}
                        placeholder="https://.../panorama_360.jpg"
                        className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        disabled={!panoramaUrl.trim()}
                        onClick={() => setStep('pins')}
                        className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-semibold text-xs disabled:opacity-40 transition-transform duration-150 active:scale-[0.97]"
                      >
                        {t('services:polymaps_studio_continue_pins', 'Teruskan Ke Pin')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* STEP 2: INTERACTIVE 360 PIN STUDIO */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Kiri: Kanvas 360° Interaktif */}
              <div className="lg:col-span-8 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    {t('services:polymaps_studio_v3_pin_guide', 'Pusing & klik terus di atas pintu bilik.')}
                  </span>
                  <div className="flex items-center gap-2">
                    {dualFrontFile && !dualBackFile && (
                      <button
                        type="button"
                        onClick={() => {
                          setPanoMode('dual');
                          setCaptureTab('pano_convert');
                          setStep('capture');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors duration-150"
                      >
                        <Plus className="w-3 h-3 text-emerald-600" />
                        {t('services:polymaps_studio_add_back_pano_btn', 'Tambah Pano Belakang (Jadikan 360°)')}
                      </button>
                    )}
                    {stitchedBlobUrl && (
                      <a
                        href={stitchedBlobUrl}
                        download={`polymaps_360_${selectedBuilding?.code || 'campus'}_level_${floorLevel}.jpg`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold transition-colors duration-150"
                      >
                        <Download className="w-3 h-3" />
                        {t('services:polymaps_studio_save_jpg', 'Simpan .JPG')}
                      </a>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm h-[360px] sm:h-[460px]">
                  <Pannellum360Viewer
                    imageUrl={panoramaUrl}
                    verticalSweepDeg={panoVerticalSweepDeg}
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
                        setShowPinAdvanced(false);
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

              {/* Kanan: Panel Pin Ringkas (Satu Permukaan Bersih) */}
              <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4 flex flex-col gap-3.5">
                {draftPin ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {draftPin.index !== null
                          ? t('services:polymaps_studio_edit_pin', 'Kemas Kini Pin')
                          : t('services:polymaps_studio_add_pin', 'Tanda Pin Baharu')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDraftPin(null)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Jenis Pin */}
                    <div className="grid grid-cols-3 gap-1 p-0.5 rounded-xl bg-slate-200/70 dark:bg-slate-800">
                      {[
                        {
                          id: 'room',
                          icon: DoorOpen,
                          label: t('services:polymaps_studio_pin_type_room_short', 'Bilik'),
                        },
                        {
                          id: 'info',
                          icon: Info,
                          label: t('services:polymaps_studio_pin_type_info_short', 'Kemudahan'),
                        },
                        {
                          id: 'scene',
                          icon: Compass,
                          label: t('services:polymaps_studio_pin_type_scene_short', 'Laluan'),
                        },
                      ].map((tItem) => {
                        const IconComp = tItem.icon;
                        const active = draftPin.pin_type === tItem.id;
                        return (
                          <button
                            key={tItem.id}
                            type="button"
                            onClick={() =>
                              setDraftPin({
                                ...draftPin,
                                pin_type: tItem.id as 'room' | 'info' | 'scene',
                              })
                            }
                            className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-[10px] text-[11px] font-semibold transition-colors duration-150 ${
                              active
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <IconComp className="w-3 h-3 shrink-0" />
                            <span>{tItem.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {draftPin.pin_type === 'room' ? (
                      <div className="space-y-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            {t('services:polymaps_studio_pin_room_short', 'Kod / Nama Bilik')}
                          </label>
                          <input
                            type="text"
                            value={draftPin.room_code}
                            onChange={(e) => handleDraftRoomCodeChange(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleSaveDraftPin();
                              }
                            }}
                            placeholder={t('services:polymaps_studio_pin_room_placeholder', 'Cth: JKE101 - Makmal Elektronik 1')}
                            className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                            autoFocus
                          />
                          {draftPin.room_code.trim() && (
                            <p className="text-[11px] font-medium mt-1">
                              {buildingLocations.some(
                                (l) => l.room_code.trim().toLowerCase() === draftPin.room_code.trim().toLowerCase()
                              ) ? (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  ✓ {t('services:polymaps_studio_existing_room_match', 'Bilik sedia ada — dipautkan automatik.')}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400">
                                  ✨ {t('services:polymaps_studio_new_room_auto_create', 'Bilik baharu — akan dicipta automatik.')}
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        {buildingLocations.length > 0 && (
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                            {buildingLocations.slice(0, 12).map((loc) => {
                              const needs360 = !loc.panorama_360_url;
                              const isSelected =
                                draftPin.room_code.trim().toLowerCase() === loc.room_code.trim().toLowerCase();
                              return (
                                <button
                                  key={loc.id}
                                  type="button"
                                  onClick={() => handleDraftRoomCodeChange(loc.room_code)}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors duration-150 ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-500'
                                  }`}
                                >
                                  {needs360 && !isSelected && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                  )}
                                  <span>{loc.room_code}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {t('services:polymaps_studio_pin_label', 'Label Pin Kemudahan / Laluan')}
                        </label>
                        <input
                          type="text"
                          value={draftPin.label}
                          onChange={(e) => setDraftPin({ ...draftPin, label: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveDraftPin();
                            }
                          }}
                          placeholder={
                            draftPin.pin_type === 'scene'
                              ? t('services:polymaps_studio_pin_scene_placeholder', 'Cth: Terus Ke Koridor Sayap B')
                              : t('services:polymaps_studio_pin_info_placeholder', 'Cth: Tangga Utama Aras 3 / Tandas')
                          }
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                      </div>
                    )}

                    {/* Butiran Pilihan (Pendedahan Progresif) */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowPinAdvanced((prev) => !prev)}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        {t('services:polymaps_studio_pin_optional_more', '+ Tambah nota arah / pautan (pilihan)')}
                      </button>

                      {showPinAdvanced && (
                        <div className="mt-2 space-y-2">
                          <textarea
                            rows={2}
                            value={draftPin.description}
                            onChange={(e) => setDraftPin({ ...draftPin, description: e.target.value })}
                            placeholder={t('services:polymaps_studio_pin_desc_label', 'Panduan Arah Ringkas')}
                            className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                          />
                          {draftPin.pin_type === 'scene' && (
                            <input
                              type="url"
                              value={draftPin.target_panorama_url}
                              onChange={(e) =>
                                setDraftPin({ ...draftPin, target_panorama_url: e.target.value })
                              }
                              placeholder="https://.../koridor_sebelah.jpg"
                              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveDraftPin}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-transform duration-150 active:scale-[0.97]"
                      >
                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                        {t('services:polymaps_studio_save_pin_btn', 'Simpan Pin')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftPin(null)}
                        className="py-2 px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 font-semibold text-xs transition-colors duration-150"
                      >
                        {t('services:polymaps_bulk_cancel', 'Batal')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 px-2 text-center space-y-1.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {t('services:polymaps_studio_v3_pin_panel_empty', 'Klik atas pintu dalam foto 360°')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('services:polymaps_studio_v3_pin_panel_empty_sub', 'Anda boleh tanda banyak bilik dalam satu foto koridor.')}
                    </p>
                    {unmappedRoomsInBuilding.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-1">
                        {unmappedRoomsInBuilding.slice(0, 6).map((loc) => (
                          <span
                            key={loc.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {loc.room_code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Senarai Pin Dalam 360° Ini */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {t('services:polymaps_studio_v3_pins_saved_count', 'Pin Ditanda ({{count}})', {
                      count: hotspots.length,
                    })}
                  </h4>

                  {hotspots.length > 0 && (
                    <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1">
                      {hotspots.map((hs, idx) => (
                        <div
                          key={hs.id || idx}
                          className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-2">
                            <span className="text-emerald-600 dark:text-emerald-400 shrink-0">
                              {hs.pin_type === 'room' ? (
                                <DoorOpen className="w-3.5 h-3.5" />
                              ) : hs.pin_type === 'scene' ? (
                                <Compass className="w-3.5 h-3.5" />
                              ) : (
                                <Info className="w-3.5 h-3.5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {hs.room_code || hs.label}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setShowPinAdvanced(false);
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
                                });
                              }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                              title={t('services:polymaps_studio_edit_pin_title', 'Sunting Pin')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePin(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title={t('services:polymaps_studio_delete_pin_title', 'Padam Pin')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {isAdminMode ? (
                    <label className="pt-1 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={batchCreateRooms}
                        onChange={(e) => setBatchCreateRooms(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                        {t('services:polymaps_studio_batch_create_title', 'Auto-daftarkan pin bilik baharu ke direktori carian')}
                      </span>
                    </label>
                  ) : (
                    <input
                      type="text"
                      value={volunteerNotes}
                      onChange={(e) => setVolunteerNotes(e.target.value)}
                      placeholder={t('services:polymaps_studio_volunteer_notes_placeholder', 'Nota tambahan untuk JPP (pilihan)...')}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Kontekstual */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
          {step === 'capture' ? (
            <>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {t('services:polymaps_studio_v3_footer_step1', 'Muat naik foto panorama untuk mula menanda pintu bilik.')}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
                >
                  {t('services:polymaps_bulk_cancel', 'Batal')}
                </button>
                {panoramaUrl && (
                  <button
                    type="button"
                    onClick={() => setStep('pins')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-transform duration-150 active:scale-[0.97]"
                  >
                    <span>{t('services:polymaps_studio_v3_next_pins', 'Seterusnya: Letak Pin →')}</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('capture')}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
              >
                {t('services:polymaps_studio_v3_back_photo', '← Tukar Foto')}
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-150"
                >
                  {t('services:polymaps_bulk_cancel', 'Batal')}
                </button>

                <button
                  type="button"
                  disabled={!panoramaUrl || isSavingAll || isUploading}
                  onClick={handlePublishOrSubmit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-transform duration-150 active:scale-[0.97] disabled:opacity-50"
                >
                  {isSavingAll ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isAdminMode
                      ? t('services:polymaps_studio_submit_admin', 'Simpan & Terbitkan 360° ({{count}} Pin)', { count: hotspots.length })
                      : t('services:polymaps_studio_submit_volunteer', 'Hantar Sumbangan 360° ({{count}} Pin)', { count: hotspots.length })}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
