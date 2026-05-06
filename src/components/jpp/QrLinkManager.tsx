import React, { useState, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Link2, Download, Copy, Check, QrCode, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { QrUnitLink } from './QrCodeFab';

// ── Senarai halaman umum (Exco semua unit boleh guna) ──
const GENERAL_LINKS: QrUnitLink[] = [
  { label: 'Portal Utama', path: '/portal' },
  { label: 'PolyMart Marketplace', path: '/polymart' },
  { label: 'Daftar Aduan Kebajikan', path: '/kebajikan/buat-aduan' },
  { label: 'Senarai Program / Aktiviti', path: '/aktiviti' },
  { label: 'Leaderboard Merit', path: '/leaderboard' },
  { label: 'Karnival JPP', path: '/karnival' },
  { label: 'SUPSAS', path: '/supsas' },
  { label: 'e-Akademik', path: '/akademik' },
  { label: 'e-KLK (Kediaman Luar Kampus)', path: '/klk' },
];

interface QrLinkManagerProps {
  /** Link unit-spesifik — akan dipapar dahulu dalam senarai (atas) */
  unitLinks?: QrUnitLink[];
  /** Sembunyikan header title — guna bila di dalam QrCodeFab yang dah ada header sendiri */
  showHeader?: boolean;
}

export function QrLinkManager({ unitLinks, showHeader = true }: QrLinkManagerProps) {
  const [customPath, setCustomPath] = useState('');
  const [selectedQuick, setSelectedQuick] = useState('');
  const [showQuickList, setShowQuickList] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<SVGSVGElement>(null);

  // Gabungkan: unit links dahulu, kemudian general (tanpa duplikat)
  const unitPaths = new Set((unitLinks || []).map(l => l.path));
  const filteredGeneral = GENERAL_LINKS.filter(l => !unitPaths.has(l.path));
  const hasUnitLinks = (unitLinks?.length ?? 0) > 0;

  // Resolve URL penuh dari path
  const basePath = selectedQuick || customPath.trim();
  const fullUrl = basePath
    ? `${window.location.origin}${basePath.startsWith('/') ? basePath : `/${basePath}`}`
    : '';

  const handleCopy = useCallback(async () => {
    if (!fullUrl) return;
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success('URL disalin!');
    setTimeout(() => setCopied(false), 2000);
  }, [fullUrl]);

  // Download QR sebagai PNG menggunakan canvas (convert SVG → canvas → PNG)
  const handleDownload = useCallback(() => {
    if (!fullUrl || !qrRef.current) return;

    const svgEl = qrRef.current;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const canvas = document.createElement('canvas');
    const size = 600;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    img.onload = () => {
      // Background putih
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(svgUrl);

      // Draw logo manually because SVGs drawn to canvas block external image links
      const logoImg = new Image();
      logoImg.onload = () => {
        const logoSize = Math.round((48 / 220) * size);
        const xy = (size - logoSize) / 2;
        ctx.drawImage(logoImg, xy, xy, logoSize, logoSize);
        
        // Download
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `jpp-qr-${Date.now()}.png`;
        link.click();
        toast.success('QR Code berjaya dimuat turun!');
      };
      logoImg.onerror = () => {
        // Fallback without logo
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `jpp-qr-${Date.now()}.png`;
        link.click();
        toast.success('QR Code berjaya dimuat turun (tanpa logo)!');
      };
      logoImg.src = '/jpp-logo.png';
    };
    img.src = svgUrl;
  }, [fullUrl]);

  const selectQuick = (path: string) => {
    setSelectedQuick(path);
    setCustomPath('');
    setShowQuickList(false);
  };

  // Cari label dari mana-mana senarai
  const allLinks = [...(unitLinks || []), ...filteredGeneral];
  const currentLabel = allLinks.find(q => q.path === selectedQuick)?.label;

  return (
    <div className="space-y-6">
      {/* Header — sembunyikan bila dalam FAB (FAB ada header sendiri) */}
      {showHeader && (
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <QrCode className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-sm uppercase tracking-widest">Penjana QR Code</h3>
            <p className="text-[11px] text-muted-foreground font-medium">
              Jana QR dengan logo JPP untuk dikongsi kepada pelajar.
            </p>
          </div>
        </div>
      )}

      {/* Quick Links Dropdown */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">
          Pilih Halaman (Cepat)
        </Label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowQuickList(v => !v)}
            className={cn(
              'w-full h-11 px-4 rounded-xl border text-left text-sm font-medium flex items-center justify-between transition-colors',
              'bg-muted/40 border-border/60 hover:border-primary/40 focus:outline-none focus:border-primary/60'
            )}
          >
            <span className={cn('truncate', !currentLabel && 'text-muted-foreground/50')}>
              {currentLabel || 'Pilih halaman...'}
            </span>
            <ChevronDown className={cn('w-4 h-4 text-muted-foreground shrink-0 transition-transform', showQuickList && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {showQuickList && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full mt-1 w-full z-50 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto"
              >
                {/* Unit-specific links (atas) */}
                {hasUnitLinks && (
                  <>
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-primary/60">Modul Ini</p>
                    </div>
                    {(unitLinks || []).map(q => (
                      <button
                        key={q.path}
                        type="button"
                        onClick={() => selectQuick(q.path)}
                        className={cn(
                          'w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors flex items-center justify-between',
                          selectedQuick === q.path && 'bg-primary/8 text-primary font-black'
                        )}
                      >
                        <span>{q.label}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">{q.path}</span>
                      </button>
                    ))}
                    <div className="mx-4 my-2 border-t border-border/40" />
                    <div className="px-4 pb-1">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Umum</p>
                    </div>
                  </>
                )}
                {/* General links (bawah) */}
                {filteredGeneral.map(q => (
                  <button
                    key={q.path}
                    type="button"
                    onClick={() => selectQuick(q.path)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors flex items-center justify-between',
                      selectedQuick === q.path && 'bg-primary/8 text-primary font-black'
                    )}
                  >
                    <span>{q.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{q.path}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Custom Path */}
      <div className="space-y-1.5">
        <Label className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70">
          Atau Masukkan Path Sendiri
        </Label>
        <div className="relative group">
          <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <Input
            value={customPath}
            onChange={e => { setCustomPath(e.target.value); setSelectedQuick(''); }}
            placeholder="/kebajikan/buat-aduan"
            className="h-11 pl-10 rounded-xl bg-muted/40 border-border/60 focus-visible:ring-primary/40 font-mono text-sm"
          />
        </div>
        {fullUrl && (
          <p className="text-[10px] text-muted-foreground/60 font-mono px-1 truncate">
            → {fullUrl}
          </p>
        )}
      </div>

      {/* QR Preview */}
      <AnimatePresence mode="wait">
        {fullUrl ? (
          <motion.div
            key={fullUrl}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center gap-5 pt-2"
          >
            {/* QR Code dengan logo JPP di tengah */}
            <div className="relative p-5 bg-white rounded-3xl shadow-xl border border-border/10">
              <QRCodeSVG
                ref={qrRef}
                value={fullUrl}
                size={220}
                level="H" // Error correction tinggi — penting untuk logo overlay
                bgColor="#ffffff"
                fgColor="#0f172a"
                imageSettings={{
                  src: '/jpp-logo.png',
                  x: undefined,
                  y: undefined,
                  height: 48,
                  width: 48,
                  excavate: true, // Kos kawasan di tengah untuk logo
                }}
              />
            </div>

            <p className="text-[10px] text-center text-muted-foreground/60 font-mono max-w-[240px] leading-relaxed break-all">
              {fullUrl}
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full max-w-xs">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 rounded-xl text-[11px] font-black uppercase tracking-widest gap-2"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Disalin!' : 'Salin URL'}
              </Button>
              <Button
                type="button"
                className="flex-1 h-11 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-primary-foreground shadow-lg shadow-primary/20 gap-2"
                onClick={handleDownload}
              >
                <Download className="w-3.5 h-3.5" />
                Muat Turun
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/40 text-center leading-relaxed max-w-[280px]">
              💡 QR Code ini akan membawa pengguna terus ke halaman yang dipilih selepas log masuk.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-8 opacity-40"
          >
            <QrCode className="w-12 h-12 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground font-medium text-center">
              Pilih halaman atau masukkan path untuk jana QR
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
