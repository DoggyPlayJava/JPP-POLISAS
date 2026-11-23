import React, { useEffect, useState, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Download,
  Loader2,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  AlertTriangle,
  FileText,
  Eye,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import jppLogoLandscape from '@/assets/Logo-JPP-Laporan.jpeg';
import { ensurePdfPolyfills } from '@/lib/polyfills';
import {
  type BusinessCertificateData,
  deriveEntityStructure,
  formatMalayDate,
  formatMalayDateTime,
  generateCertificateQrDataUrl,
  getRegistrationAuthorityMeta,
  sanitizeImageForPdf,
  sanitizePdfFilename,
} from '@/lib/businessCertificate';

const LazyPdfPreview = lazy(async () => {
  ensurePdfPolyfills();
  const [{ PDFViewer }, { BusinessRegistrationCertPDF }] = await Promise.all([
    import('@react-pdf/renderer'),
    import('./BusinessRegistrationCertPDF'),
  ]);
  return {
    default: function PdfViewerWrapper({
      data,
      qrDataUrl,
      polisasLogoSrc,
      jppLandscapeLogoSrc,
      jppCrestSrc,
      businessLogoSrc,
    }: {
      data: BusinessCertificateData;
      qrDataUrl: string | null;
      polisasLogoSrc: string | null;
      jppLandscapeLogoSrc: string | null;
      jppCrestSrc: string | null;
      businessLogoSrc: string | null;
    }) {
      return (
        <PDFViewer style={{ width: '100%', height: '100%', minHeight: 540, borderRadius: 12 }} showToolbar>
          <BusinessRegistrationCertPDF
            data={data}
            qrDataUrl={qrDataUrl}
            polisasLogoSrc={polisasLogoSrc}
            jppLandscapeLogoSrc={jppLandscapeLogoSrc}
            jppCrestSrc={jppCrestSrc}
            businessLogoSrc={businessLogoSrc}
          />
        </PDFViewer>
      );
    },
  };
});

export interface BusinessCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  certificateData: BusinessCertificateData | null;
  hasUnsavedChanges?: boolean;
  themeColor?: string;
  onDownloaded?: () => void;
}

export function BusinessCertificateModal({
  isOpen,
  onClose,
  certificateData,
  hasUnsavedChanges = false,
  themeColor = '#831010',
  onDownloaded,
}: BusinessCertificateModalProps) {
  const { t } = useTranslation(['keusahawanan', 'common']);

  const [viewMode, setViewMode] = useState<'preview' | 'pdf'>('preview');
  const [activePage, setActivePage] = useState<'page1' | 'page2'>('page1');
  const [downloading, setDownloading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [preparedAssets, setPreparedAssets] = useState<{
    qrDataUrl: string | null;
    polisasLogoSrc: string | null;
    jppLandscapeLogoSrc: string | null;
    jppCrestSrc: string | null;
    businessLogoSrc: string | null;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setViewMode('preview');
      setActivePage('page1');
      setPreparedAssets(null);
    }
  }, [isOpen]);

  // Prepare sanitized images & QR data URL whenever native PDF preview is opened on desktop
  useEffect(() => {
    if (!isOpen || !certificateData || viewMode !== 'pdf' || preparedAssets) return;
    let cancelled = false;

    const loadAssets = async () => {
      setAssetsLoading(true);
      try {
        const [qrDataUrl, polisasLogoSrc, jppLandscapeLogoSrc, jppCrestSrc, businessLogoSrc] =
          await Promise.all([
            generateCertificateQrDataUrl(certificateData.verificationUrl),
            sanitizeImageForPdf('/polisas-logo.jpg'),
            sanitizeImageForPdf(jppLogoLandscape),
            sanitizeImageForPdf('/jpp-logo.png'),
            sanitizeImageForPdf(certificateData.logoUrl),
          ]);
        if (!cancelled) {
          setPreparedAssets({
            qrDataUrl,
            polisasLogoSrc,
            jppLandscapeLogoSrc,
            jppCrestSrc,
            businessLogoSrc,
          });
        }
      } catch (err) {
        console.warn('Error preparing PDF preview assets:', err);
      } finally {
        if (!cancelled) setAssetsLoading(false);
      }
    };

    loadAssets();
    return () => {
      cancelled = true;
    };
  }, [isOpen, certificateData, viewMode, preparedAssets]);

  if (!isOpen || !certificateData) return null;

  const meta = getRegistrationAuthorityMeta(certificateData.registrationType);
  const entity = deriveEntityStructure(certificateData.members.length);
  const isOfficiallyActive = certificateData.status === 'ACTIVE' && certificateData.isActive;
  const regCodeDisplay = certificateData.hasRegistrationNumber
    ? certificateData.registrationNumber
    : t('keusahawanan:cert_reg_not_assigned', 'BELUM DINYATAKAN');

  const handleCopyVerifyLink = async () => {
    try {
      await navigator.clipboard.writeText(certificateData.verificationUrl);
      setCopiedLink(true);
      toast.success(t('keusahawanan:cert_verify_link_copied', 'Pautan pengesahan QR disalin!'));
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error(t('common:error', 'Terdapat ralat.'));
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      ensurePdfPolyfills();

      const assets =
        preparedAssets ||
        (await (async () => {
          const [qrDataUrl, polisasLogoSrc, jppLandscapeLogoSrc, jppCrestSrc, businessLogoSrc] =
            await Promise.all([
              generateCertificateQrDataUrl(certificateData.verificationUrl),
              sanitizeImageForPdf('/polisas-logo.jpg'),
              sanitizeImageForPdf(jppLogoLandscape),
              sanitizeImageForPdf('/jpp-logo.png'),
              sanitizeImageForPdf(certificateData.logoUrl),
            ]);
          return {
            qrDataUrl,
            polisasLogoSrc,
            jppLandscapeLogoSrc,
            jppCrestSrc,
            businessLogoSrc,
          };
        })());

      if (!preparedAssets) setPreparedAssets(assets);

      const [{ pdf }, { BusinessRegistrationCertPDF }] = await Promise.all([
        import('@react-pdf/renderer'),
        import('./BusinessRegistrationCertPDF'),
      ]);

      const doc = (
        <BusinessRegistrationCertPDF
          data={certificateData}
          qrDataUrl={assets.qrDataUrl}
          polisasLogoSrc={assets.polisasLogoSrc}
          jppLandscapeLogoSrc={assets.jppLandscapeLogoSrc}
          jppCrestSrc={assets.jppCrestSrc}
          businessLogoSrc={assets.businessLogoSrc}
        />
      );

      const blob = await pdf(doc).toBlob();
      const fileName = sanitizePdfFilename(
        certificateData.businessName,
        certificateData.registrationNumber || certificateData.documentRef
      );
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const nav = navigator as any;

      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: `${certificateData.businessName} — Perakuan Pendaftaran`,
          });
          onDownloaded?.();
          toast.success(t('keusahawanan:cert_download_success', 'Sijil PDF berjaya dimuat turun!'));
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      onDownloaded?.();
      toast.success(t('keusahawanan:cert_download_success', 'Sijil PDF berjaya dimuat turun!'));
    } catch (err: any) {
      console.error('Error generating business registration certificate PDF:', err);
      toast.error(
        t('keusahawanan:cert_download_error', 'Gagal menjana PDF sijil. Sila cuba lagi.')
      );
    } finally {
      setDownloading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[85dvh] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Docked Header */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                style={{ background: '#831010' }}
              >
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-black text-foreground truncate">
                  {t('keusahawanan:cert_modal_title', 'Perakuan Pendaftaran Perniagaan')}
                </h2>
                <p className="text-[11px] text-muted-foreground font-mono tabular-nums truncate">
                  {regCodeDisplay} • {certificateData.documentRef}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle (Desktop only for raw PDF iframe) */}
              <div className="hidden md:inline-flex p-0.5 rounded-xl bg-muted border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'preview'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {t('keusahawanan:cert_tab_preview', 'Paparan Sijil')}
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('pdf')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    viewMode === 'pdf'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {t('keusahawanan:cert_tab_pdf_viewer', 'Pratonton PDF')}
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                aria-label={t('common:close', 'Tutup')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5 bg-slate-100 dark:bg-slate-950/70 space-y-3">
            {/* Guardrail Alerts */}
            {hasUnsavedChanges && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p>
                  {t(
                    'keusahawanan:cert_unsaved_warning',
                    'Anda mempunyai perubahan profil/pendaftaran yang belum disimpan. Sila klik "Simpan Perubahan" terlebih dahulu supaya PDF sijil sepadan dengan rekod rasmi QR.'
                  )}
                </p>
              </div>
            )}

            {certificateData.registrationType === 'SSM' && !certificateData.hasRegistrationNumber && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <p>
                  {t(
                    'keusahawanan:cert_missing_ssm_warning',
                    'Jenis pendaftaran ditetapkan kepada SSM tetapi No. Pendaftaran SSM masih kosong. Sila masukkan kod pendaftaran SSM anda.'
                  )}
                </p>
              </div>
            )}

            {!isOfficiallyActive && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                <p>
                  {t(
                    'keusahawanan:cert_draft_warning',
                    'Perniagaan ini belum berstatus Aktif. Dokumen yang dijana akan memaparkan tera air DRAF / TIDAK AKTIF sehingga diluluskan oleh Unit Keusahawanan.'
                  )}
                </p>
              </div>
            )}

            {viewMode === 'pdf' ? (
              <div className="w-full h-[540px] rounded-2xl border border-border bg-white overflow-hidden">
                {assetsLoading ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-600">
                    <Loader2 className="w-6 h-6 animate-spin text-[#831010]" />
                    <p className="text-xs font-bold">
                      {t('keusahawanan:cert_preparing_pdf', 'Menyediakan pratonton PDF rasmi...')}
                    </p>
                  </div>
                ) : (
                  <Suspense
                    fallback={
                      <div className="h-full flex items-center justify-center text-xs text-slate-500">
                        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Memuatkan PDF...
                      </div>
                    }
                  >
                    <LazyPdfPreview
                      data={certificateData}
                      qrDataUrl={preparedAssets?.qrDataUrl || null}
                      polisasLogoSrc={preparedAssets?.polisasLogoSrc || null}
                      jppLandscapeLogoSrc={preparedAssets?.jppLandscapeLogoSrc || null}
                      jppCrestSrc={preparedAssets?.jppCrestSrc || null}
                      businessLogoSrc={preparedAssets?.businessLogoSrc || null}
                    />
                  </Suspense>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Page Switcher Pills */}
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePage('page1')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                      activePage === 'page1'
                        ? 'bg-[#831010] text-white border-[#831010] shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-border hover:bg-muted'
                    }`}
                  >
                    Halaman 1: Borang P-D (Perakuan)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePage('page2')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                      activePage === 'page2'
                        ? 'bg-[#831010] text-white border-[#831010] shadow-sm'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-border hover:bg-muted'
                    }`}
                  >
                    Halaman 2: Maklumat Pemilik & Mentor
                  </button>
                </div>

                {/* Paper Sheet Container (Always clean white for authentic print look) */}
                {activePage === 'page1' ? (
                  <div className="max-w-[740px] mx-auto bg-white text-slate-900 p-3 sm:p-5 rounded-xl shadow-lg border border-slate-300">
                    <div className="border-2 border-[#831010] p-1">
                      <div className="border border-[#B8860B] p-3 sm:p-6 relative space-y-4">
                        {/* Draft Banner Overlay if unapproved */}
                        {!isOfficiallyActive && (
                          <div className="p-2 rounded border-2 border-rose-600 bg-rose-50 text-center text-xs font-black tracking-widest text-rose-800 uppercase">
                            {certificateData.status === 'PENDING_INTERVIEW'
                              ? 'DRAF SEMAKAN — BELUM DILULUSKAN'
                              : 'TIDAK AKTIF — BUKAN SIJIL SAHIH'}
                          </div>
                        )}

                        {/* Masthead */}
                        <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-[#831010]">
                          <img
                            src="/polisas-logo.jpg"
                            alt="POLISAS"
                            className="h-9 sm:h-11 w-auto object-contain shrink-0"
                          />
                          <div className="text-center flex-1 min-w-0 px-1">
                            <p className="text-[10px] sm:text-xs font-black text-slate-900 tracking-wide">
                              POLITEKNIK SULTAN HAJI AHMAD SHAH
                            </p>
                            <p className="text-[9px] sm:text-[11px] font-black text-[#831010] tracking-wide">
                              PUSAT KEUSAHAWANAN POLITEKNIK (PUSKEP)
                            </p>
                            <p className="text-[8px] sm:text-[10px] text-slate-600">
                              Jawatankuasa Perwakilan Pelajar (JPP-POLISAS) · Semambu, Kuantan
                            </p>
                          </div>
                          <img
                            src={jppLogoLandscape}
                            alt="JPP POLISAS"
                            className="h-8 sm:h-10 w-auto object-contain shrink-0 hidden sm:block"
                          />
                        </div>

                        {/* Form Header Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px]">
                          <span className="font-bold text-slate-600 uppercase">
                            {meta.formCode}
                          </span>
                          <span className="font-mono tabular-nums font-bold text-slate-900">
                            NO. RUJUKAN: {certificateData.documentRef}
                          </span>
                        </div>

                        {/* Certificate Heading */}
                        <div className="text-center space-y-1">
                          <h3 className="text-lg sm:text-2xl font-serif font-bold tracking-wide text-slate-900">
                            PERAKUAN PENDAFTARAN PERNIAGAAN
                          </h3>
                          <p className="text-[10px] font-bold tracking-[0.22em] text-slate-500 uppercase">
                            CERTIFICATE OF BUSINESS REGISTRATION
                          </p>
                          <div className="w-20 h-0.5 bg-[#B8860B] mx-auto mt-1.5" />
                        </div>

                        {/* Proclamation + Hero Name */}
                        <div className="text-center space-y-2">
                          <p className="text-xs italic font-serif text-slate-600">
                            Dengan ini diperakui bahawa perniagaan yang dijalankan di bawah nama
                          </p>
                          <div className="flex items-center justify-center gap-2.5">
                            {certificateData.logoUrl ? (
                              <img
                                src={certificateData.logoUrl}
                                alt=""
                                className="w-8 h-8 rounded-md object-contain border border-slate-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                                <Building2 className="w-4 h-4" />
                              </div>
                            )}
                            <p className="text-base sm:text-xl font-serif font-bold text-slate-950 uppercase tracking-wide">
                              {certificateData.businessName}
                            </p>
                          </div>
                        </div>

                        {/* Registration Code Highlight Box */}
                        <div
                          className="rounded-md border p-3 sm:p-4 bg-[#FDFBF7] flex flex-wrap items-center justify-between gap-3"
                          style={{ borderColor: meta.accentColor }}
                        >
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              No. Kod Pendaftaran / Registration No.
                            </p>
                            <p className="text-lg sm:text-xl font-mono tabular-nums font-black text-slate-950 tracking-wider mt-0.5">
                              {regCodeDisplay}
                            </p>
                            {certificateData.registrationHistory.length > 0 && (
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                No. Terdahulu:{' '}
                                {
                                  certificateData.registrationHistory[
                                    certificateData.registrationHistory.length - 1
                                  ].type
                                }{' '}
                                (
                                {
                                  certificateData.registrationHistory[
                                    certificateData.registrationHistory.length - 1
                                  ].number
                                }
                                )
                              </p>
                            )}
                          </div>
                          <span
                            className="px-3 py-1 rounded text-[10px] font-black text-white uppercase tracking-wider"
                            style={{ background: meta.accentColor }}
                          >
                            {meta.badgeLabel}
                          </span>
                        </div>

                        {/* Statutory Clause */}
                        <p className="text-xs font-serif text-slate-700 text-center leading-relaxed px-2">
                          {meta.statutoryClause}
                        </p>

                        {/* Particulars Table */}
                        <div className="border border-slate-300 text-xs divide-y divide-slate-300">
                          {[
                            { k: 'JENIS PENDAFTARAN', v: meta.shortLabel.toUpperCase() },
                            { k: 'BENTUK ENTITI', v: entity.labelMs },
                            {
                              k: 'SEKTOR / KATEGORI',
                              v: certificateData.categoryName.toUpperCase(),
                            },
                            {
                              k: 'PEMILIK UTAMA',
                              v: `${certificateData.owner.fullName.toUpperCase()}${
                                certificateData.owner.matricNo
                                  ? ` | NO. MATRIK: ${certificateData.owner.matricNo.toUpperCase()}`
                                  : ''
                              }`,
                            },
                            {
                              k: 'TARIKH PENDAFTARAN',
                              v: `${formatMalayDate(certificateData.createdAt)}${
                                certificateData.approvedAt
                                  ? ` | DILULUSKAN: ${formatMalayDate(certificateData.approvedAt)}`
                                  : ''
                              }`,
                            },
                            {
                              k: 'STATUS PENDAFTARAN',
                              v: isOfficiallyActive
                                ? 'AKTIF & DISAHKAN'
                                : certificateData.status === 'PENDING_INTERVIEW'
                                ? 'MENUNGGU TEMUDUGA / KELULUSAN'
                                : 'TIDAK AKTIF / DITOLAK',
                              isStatus: true,
                            },
                            {
                              k: 'TEMPAT UTAMA PERNIAGAAN',
                              v: 'POLITEKNIK SULTAN HAJI AHMAD SHAH (POLISAS), SEMAMBU, 25350 KUANTAN, PAHANG DARUL MAKMUR',
                            },
                            {
                              k: 'SALURAN & CAWANGAN',
                              v: `TIADA CAWANGAN • OPERASI KAMPUS POLISAS${
                                certificateData.polymartIsActive ? ' & POLYMART DIGITAL' : ''
                              }`,
                            },
                          ].map((row) => (
                            <div key={row.k} className="grid sm:grid-cols-3">
                              <div className="bg-slate-50 px-3 py-2 font-bold text-[10px] text-slate-700 sm:border-r border-slate-300 flex items-center">
                                {row.k}
                              </div>
                              <div className="sm:col-span-2 px-3 py-2 text-[11px] font-semibold text-slate-900">
                                {row.isStatus ? (
                                  <span
                                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border ${
                                      isOfficiallyActive
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-500'
                                        : certificateData.status === 'PENDING_INTERVIEW'
                                        ? 'bg-amber-100 text-amber-800 border-amber-500'
                                        : 'bg-rose-100 text-rose-800 border-rose-500'
                                    }`}
                                  >
                                    {row.v}
                                  </span>
                                ) : (
                                  row.v
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Auth Footer with Live QR */}
                        <div className="pt-4 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                          <div className="text-[10px] space-y-1">
                            <p className="text-slate-500 font-bold">BERTARIKH DI</p>
                            <p className="font-bold text-slate-900">POLISAS, KUANTAN, PAHANG</p>
                            <p className="text-slate-500 font-bold pt-1">KOD INTEGRITI</p>
                            <p className="font-mono tabular-nums font-bold text-[#831010]">
                              {certificateData.integrityHash}
                            </p>
                          </div>

                          <div className="text-center space-y-1">
                            <div className="w-11 h-11 rounded-full border-2 border-[#831010] bg-[#FDFBF7] flex items-center justify-center mx-auto">
                              <ShieldCheck className="w-5 h-5 text-[#831010]" />
                            </div>
                            <div className="w-32 border-b border-slate-900 mx-auto pt-1" />
                            <p className="text-[10px] font-black text-slate-900">
                              PENDAFTAR PERNIAGAAN SISWA
                            </p>
                            <p className="text-[9px] text-slate-500">
                              Unit Keusahawanan (PUSKEP) / JPP POLISAS
                            </p>
                          </div>

                          <div className="flex flex-col items-center sm:items-end">
                            <div className="p-1.5 border border-slate-300 rounded bg-white">
                              <QRCodeSVG
                                value={certificateData.verificationUrl}
                                size={64}
                                level="H"
                                includeMargin={false}
                              />
                            </div>
                            <p className="text-[9px] font-black text-slate-900 mt-1">
                              IMBAS UNTUK PENGESAHAN
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-[740px] mx-auto bg-white text-slate-900 p-4 sm:p-6 rounded-xl shadow-lg border border-slate-300 space-y-5">
                    {/* Page 2 Header */}
                    <div className="flex items-center justify-between gap-3 border-t-2 border-[#831010] border-b border-slate-300 py-2.5">
                      <div>
                        <p className="text-xs sm:text-sm font-black text-slate-900">
                          MAKLUMAT PERNIAGAAN & PEMILIK TERKINI
                        </p>
                        <p className="text-[11px] text-slate-500">
                          LAMPIRAN BORANG P-D • {certificateData.businessName.toUpperCase()} ({regCodeDisplay})
                        </p>
                      </div>
                      <span className="font-mono tabular-nums text-xs font-bold text-[#831010]">
                        {certificateData.documentRef}
                      </span>
                    </div>

                    {/* Bahagian A */}
                    <div className="space-y-2">
                      <div className="px-3 py-1.5 bg-slate-50 border-l-4 border-[#831010] border border-slate-200 text-xs font-black text-slate-900">
                        BAHAGIAN A : BUTIRAN AM & BIDANG PERNIAGAAN
                      </div>
                      <div className="border border-slate-200 text-xs divide-y divide-slate-200">
                        <div className="grid sm:grid-cols-3">
                          <div className="bg-slate-50 px-3 py-2 font-bold text-slate-700 sm:border-r border-slate-200">
                            NO. TELEFON PERNIAGAAN
                          </div>
                          <div className="sm:col-span-2 px-3 py-2">
                            {certificateData.businessPhone || 'Tidak Dinyatakan'}
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-3">
                          <div className="bg-slate-50 px-3 py-2 font-bold text-slate-700 sm:border-r border-slate-200">
                            KETERANGAN PERNIAGAAN
                          </div>
                          <div className="sm:col-span-2 px-3 py-2 leading-relaxed">
                            {certificateData.description || 'Tiada keterangan tambahan didaftarkan.'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rekod Terdahulu */}
                    {certificateData.registrationHistory.length > 0 && (
                      <div className="space-y-2">
                        <div className="px-3 py-1.5 bg-slate-50 border-l-4 border-[#831010] border border-slate-200 text-xs font-black text-slate-900">
                          REKOD PENDAFTARAN TERDAHULU
                        </div>
                        <div className="overflow-x-auto border border-slate-200">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-900 text-white text-[10px]">
                              <tr>
                                <th className="px-3 py-2">BIL</th>
                                <th className="px-3 py-2">JENIS</th>
                                <th className="px-3 py-2">NO. PENDAFTARAN LAMA</th>
                                <th className="px-3 py-2">TARIKH PERTUKARAN</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {certificateData.registrationHistory.map((h, i) => (
                                <tr key={`${h.number}-${i}`}>
                                  <td className="px-3 py-2">{i + 1}</td>
                                  <td className="px-3 py-2 font-bold">{h.type}</td>
                                  <td className="px-3 py-2 font-mono tabular-nums font-bold">
                                    {h.number}
                                  </td>
                                  <td className="px-3 py-2">{formatMalayDate(h.changed_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Bahagian B: Pemilik & Ahli */}
                    <div className="space-y-2">
                      <div className="px-3 py-1.5 bg-slate-50 border-l-4 border-[#831010] border border-slate-200 text-xs font-black text-slate-900">
                        BAHAGIAN B : MAKLUMAT PEMILIK & AHLI PASUKAN TERKINI
                      </div>
                      <div className="overflow-x-auto border border-slate-200">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-900 text-white text-[10px]">
                            <tr>
                              <th className="px-3 py-2">BIL</th>
                              <th className="px-3 py-2">NAMA PENUH</th>
                              <th className="px-3 py-2">NO. MATRIK</th>
                              <th className="px-3 py-2">JABATAN / PROGRAM</th>
                              <th className="px-3 py-2">PERANAN</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {certificateData.members.map((m, idx) => (
                              <tr key={m.id || idx}>
                                <td className="px-3 py-2">{idx + 1}</td>
                                <td className="px-3 py-2 font-bold uppercase">{m.fullName}</td>
                                <td className="px-3 py-2 font-mono tabular-nums">
                                  {m.matricNo ? m.matricNo.toUpperCase() : '—'}
                                </td>
                                <td className="px-3 py-2 uppercase">
                                  {m.department || '—'}
                                </td>
                                <td
                                  className={`px-3 py-2 font-black ${
                                    m.role === 'OWNER' ? 'text-[#831010]' : 'text-slate-700'
                                  }`}
                                >
                                  {m.role === 'OWNER' ? 'PEMILIK' : 'AHLI AKTIF'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Bahagian C: Mentor */}
                    <div className="space-y-2">
                      <div className="px-3 py-1.5 bg-slate-50 border-l-4 border-[#831010] border border-slate-200 text-xs font-black text-slate-900">
                        BAHAGIAN C : MAKLUMAT MENTOR PENASIHAT
                      </div>
                      <div className="overflow-x-auto border border-slate-200">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-900 text-white text-[10px]">
                            <tr>
                              <th className="px-3 py-2">BIL</th>
                              <th className="px-3 py-2">NAMA MENTOR PENASIHAT</th>
                              <th className="px-3 py-2">JABATAN / UNIT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {certificateData.mentors.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="px-3 py-3 text-center text-slate-500">
                                  Tiada mentor penasihat didaftarkan buat masa ini.
                                </td>
                              </tr>
                            ) : (
                              certificateData.mentors.map((mentor, idx) => (
                                <tr key={`${mentor.name}-${idx}`}>
                                  <td className="px-3 py-2">{idx + 1}</td>
                                  <td className="px-3 py-2 font-bold uppercase">{mentor.name}</td>
                                  <td className="px-3 py-2 uppercase">
                                    {mentor.department || 'POLISAS'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Bahagian D */}
                    <div className="p-3 rounded-lg border border-[#B8860B] bg-[#FDFBF7] text-xs space-y-1">
                      <p className="font-black text-slate-900">
                        BAHAGIAN D : PENGESAHAN DIGITAL & INTEGRITI
                      </p>
                      <p className="font-mono text-[11px] break-all text-slate-700">
                        {certificateData.verificationUrl}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Dijana pada: {formatMalayDateTime(certificateData.generatedAt)} • Integriti:{' '}
                        <span className="font-mono font-bold text-[#831010]">
                          {certificateData.integrityHash}
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Docked Footer Action Bar */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3.5 border-t border-border bg-card">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyVerifyLink}
                className="h-10 px-3.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>
                  {copiedLink
                    ? t('common:copied', 'Disalin')
                    : t('keusahawanan:cert_copy_verify_link', 'Salin Pautan QR')}
                </span>
              </button>

              <a
                href={certificateData.verificationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-3.5 rounded-xl border border-border bg-muted/40 hover:bg-muted text-foreground text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {t('keusahawanan:cert_open_verify_page', 'Semak Pengesahan')}
                </span>
              </a>
            </div>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="h-10 px-5 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center gap-2 transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{ background: themeColor || '#831010' }}
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>
                {downloading
                  ? t('keusahawanan:cert_generating_pdf', 'Menjana PDF...')
                  : t('keusahawanan:cert_download_pdf_btn', 'Muat Turun Sijil (PDF)')}
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

export default BusinessCertificateModal;
