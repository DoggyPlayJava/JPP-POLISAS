import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <Card className="max-w-md w-full border-none shadow-2xl rounded-[3rem] overflow-hidden bg-card/50 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500/10 to-transparent pointer-events-none" />
              <CardContent className="p-12 flex flex-col items-center text-center space-y-8">
                <div className="w-20 h-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center mb-2">
                  <AlertTriangle className="w-10 h-10 text-rose-500" />
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-3xl font-black tracking-tighter leading-tight">
                    Ops! Berlaku <span className="text-rose-500">Ralat.</span>
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium px-4">
                    Sesuatu yang tidak dijangka telah berlaku. Jangan risau, kami telah merekodkan kejadian ini.
                  </p>
                </div>

                {process.env.NODE_ENV === 'development' && (
                  <div className="w-full p-4 bg-muted/50 rounded-2xl border border-border/50 text-[10px] font-mono text-left overflow-auto max-h-32 opacity-60">
                    {this.state.error?.toString()}
                  </div>
                )}

                <div className="grid grid-cols-1 w-full gap-3">
                  <Button 
                    onClick={this.handleReset}
                    className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    <RefreshCcw size={14} /> Cuba Segarkan Halaman
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={this.handleGoHome}
                    className="h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border-border hover:bg-muted"
                  >
                    <Home size={14} className="mr-2" /> Kembali ke Laman Utama
                  </Button>
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">
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
