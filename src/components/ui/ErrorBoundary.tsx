import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import i18n from '@/lib/i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    // Auto-recovery untuk isu Vite Chunk Load Error (selepas kemas kini sistem)
    const isChunkLoadError = 
      error.name === 'ChunkLoadError' || 
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed');

    if (isChunkLoadError && navigator.onLine) {
      // Elakkan infinite loop jika server down (Cloudflare 502/504 memulangkan HTML berbanding JS)
      const lastReload = sessionStorage.getItem('jpp_chunk_reload');
      const now = Date.now();
      
      if (!lastReload || (now - parseInt(lastReload)) > 10000) { // Hanya benarkan auto-reload setiap 10 saat
        sessionStorage.setItem('jpp_chunk_reload', now.toString());
        window.location.reload();
      }
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Jika offline, jangan buang masa reload page sbb akan gagal lagi
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const t = (key: string, fallback: string) => i18n.t(key, fallback);

      return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background px-5 pb-8 pt-[calc(1.5rem+var(--sat,env(safe-area-inset-top,0px)))]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-md"
          >
            <Card className="relative w-full border border-border shadow-surface-lg rounded-[2rem] overflow-hidden bg-card">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.06] to-transparent pointer-events-none" />
              <CardContent className="relative z-10 p-8 sm:p-10 flex flex-col items-center text-center space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
                </div>
                
                <div className="space-y-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-foreground">
                    {navigator.onLine ? (
                      <>{t('common:ops_error_prefix', 'Ops! Berlaku')} <span className="text-rose-600 dark:text-rose-400">{t('common:ops_error_highlight', 'Ralat.')}</span></>
                    ) : (
                      <>{t('common:no_internet_prefix', 'Tiada')} <span className="text-rose-600 dark:text-rose-400">{t('common:no_internet_highlight', 'Internet.')}</span></>
                    )}
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium px-2">
                    {navigator.onLine 
                      ? t('common:error_boundary_desc', 'Sesuatu yang tidak dijangka telah berlaku. Jangan risau, kami telah merekodkan kejadian ini.')
                      : t('common:error_boundary_offline', 'Aplikasi gagal dimuatkan kerana anda sedang berada di luar talian (offline). Sila sambung ke internet semula.')}
                  </p>
                </div>

                {process.env.NODE_ENV === 'development' && (
                  <div className="w-full p-3.5 bg-muted/60 rounded-xl border border-border text-[11px] font-mono text-foreground/80 text-left overflow-auto max-h-32">
                    {this.state.error?.toString()}
                  </div>
                )}

                <div className="grid grid-cols-1 w-full gap-2.5">
                  <Button 
                    onClick={this.handleReset}
                    className="h-11 rounded-xl font-bold text-xs uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground shadow-surface-sm flex items-center gap-2"
                  >
                    <RefreshCcw size={14} /> {t('common:try_refresh_page', 'Cuba Segarkan Halaman')}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={this.handleGoHome}
                    className="h-11 rounded-xl font-bold text-xs uppercase tracking-wider border-border hover:bg-muted"
                  >
                    <Home size={14} className="mr-2" /> {t('common:back_to_home', 'Kembali ke Laman Utama')}
                  </Button>
                </div>

                {/* Helpline JPP — supaya pengguna boleh hubungi bila hadapi masalah */}
                <div className="w-full p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    {t('common:recurring_issue_contact', 'Masalah berulang? Hubungi kami untuk bantuan:')}
                  </p>
                  <a
                    href="https://wa.me/601139413699?text=Salam%20JPP%2C%20saya%20mengalami%20ralat%20pada%20sistem%20(Error%20Boundary).%20Mohon%20bantuan."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0F766E] hover:bg-[#0D9488] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-surface-sm"
                  >
                    <Phone size={14} />
                    {t('common:contact_jpp_helpline', 'Hubungi Helpline JPP')}
                  </a>
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  JPP POLISAS • System Recovery
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
