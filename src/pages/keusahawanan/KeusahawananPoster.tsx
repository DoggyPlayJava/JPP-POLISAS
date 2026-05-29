import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Download, Store, Calculator, 
  BarChart3, Megaphone, GraduationCap, Phone, Globe, ArrowRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function KeusahawananPoster() {
  const navigate = useNavigate();
  const posterRef = useRef<HTMLDivElement>(null);

  // Fungsi mudah untuk screenshot / makluman kepada user
  const handleCapture = () => {
    alert("Tips: Untuk kualiti terbaik pada WhatsApp Status & Instagram Story, sila buka halaman ini di telefon anda dan tangkap layar (screenshot) terus skrin ini!");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto selection:bg-amber-500/30">
      {/* Tombol Navigasi / Kawalan */}
      <div className="w-full max-w-[450px] flex items-center justify-between mb-4 text-white">
        <button
          onClick={() => navigate('/portal')}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-xs font-black uppercase tracking-wider"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali
        </button>
        <Button 
          onClick={handleCapture}
          className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-black uppercase text-[10px] tracking-widest px-4 py-2 rounded-xl h-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]"
        >
          <Download className="w-3.5 h-3.5 mr-2" /> Tips Muat Turun
        </Button>
      </div>

      {/* 9:16 POSTER CONTAINER FRAME */}
      <div 
        ref={posterRef}
        className="relative w-full max-w-[450px] aspect-[9/16] bg-slate-50 rounded-[2.5rem] shadow-2xl border-4 border-white overflow-hidden flex flex-col justify-between p-6 sm:p-7 select-none"
        style={{
          boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.6)'
        }}
      >
        {/* Hiasan Latar Belakang (Maroon & Gold Waves) */}
        <div className="absolute inset-0 pointer-events-none z-0">
          {/* Top wave */}
          <div 
            className="absolute -top-[10%] -left-[10%] w-[120%] h-[28%] bg-gradient-to-b from-[#7A1C1C] to-[#541212] rounded-[40%] transform rotate-[-6deg]"
            style={{ boxShadow: '0 10px 30px rgba(122,28,28,0.3)' }}
          />
          <div className="absolute top-[14%] -left-[5%] w-[110%] h-[1%] bg-[#D4AF37] transform rotate-[-4deg]" />
          
          {/* Bottom wave */}
          <div 
            className="absolute -bottom-[12%] -right-[10%] w-[120%] h-[22%] bg-gradient-to-t from-[#541212] to-[#7A1C1C] rounded-[40%] transform rotate-[6deg]"
            style={{ boxShadow: '0 -10px 30px rgba(122,28,28,0.3)' }}
          />
          <div className="absolute bottom-[8%] -right-[5%] w-[110%] h-[1%] bg-[#D4AF37] transform rotate-[4deg]" />
        </div>

        {/* ================= HEADER SECTION ================= */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo JPP POLISAS (Pixel Perfect!) */}
          <div className="w-[190px] h-[65px] bg-white/95 rounded-2xl p-1.5 flex items-center justify-center shadow-lg border border-slate-100 mb-3.5 transform hover:scale-102 transition-transform">
            <img 
              src="/poster-jpp-logo.jpg" 
              alt="Logo JPP POLISAS" 
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          {/* Headline Megah */}
          <div className="w-full flex items-center justify-center gap-3">
            <div className="bg-amber-400 text-amber-950 p-2 rounded-2xl shadow-md border border-amber-300 transform -rotate-12 animate-bounce">
              <Megaphone className="w-6 h-6 fill-amber-950" />
            </div>
            <div className="bg-gradient-to-r from-[#7A1C1C] to-[#992222] px-5 py-2.5 rounded-[1.25rem] shadow-xl border border-red-900/30">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider uppercase leading-none">
                Perhatian Usahawan!
              </h1>
            </div>
          </div>

          <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-[#7A1C1C]/90 mt-3 text-center w-full leading-tight">
            Pendaftaran & Kemaskini Profil Perniagaan <br />
            <span className="text-slate-800">Sistem e-Keusahawanan & PolyMart POLISAS</span>
          </h2>
        </div>

        {/* ================= MIDDLE LAYOUT (BADGES & ISOMETRIC CARD) ================= */}
        <div className="relative z-10 grid grid-cols-12 gap-3 items-center my-3">
          {/* Kapsul Pilihan Daftar vs Kemaskini */}
          <div className="col-span-7 flex flex-col gap-2.5">
            {/* Belum Daftar */}
            <div className="bg-[#7A1C1C] text-white p-3 rounded-[1.25rem] flex items-center gap-2.5 shadow-md border border-red-900/20 transform hover:-translate-y-0.5 transition-transform">
              <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-amber-400" />
              </div>
              <div className="leading-tight text-left">
                <p className="text-[7px] font-bold text-white/60 uppercase tracking-widest">Belum Daftar?</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-amber-300">Daftar Sekarang!</p>
              </div>
            </div>

            {/* Separator OR */}
            <div className="flex items-center justify-center gap-2 my-0.5">
              <div className="h-[1px] bg-slate-300 flex-1" />
              <span className="text-[9px] font-black text-slate-400 uppercase bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">ATAU</span>
              <div className="h-[1px] bg-slate-300 flex-1" />
            </div>

            {/* Sudah Daftar */}
            <div className="bg-[#D4AF37] text-[#5C0606] p-3 rounded-[1.25rem] flex items-center gap-2.5 shadow-md border border-amber-500/20 transform hover:-translate-y-0.5 transition-transform">
              <div className="w-7 h-7 rounded-xl bg-[#5C0606]/10 flex items-center justify-center shrink-0">
                <Calculator className="w-4 h-4 text-[#5C0606]" />
              </div>
              <div className="leading-tight text-left">
                <p className="text-[7px] font-black text-[#5C0606]/60 uppercase tracking-widest">Sudah Daftar?</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-[#5C0606]">Kemaskini Data!</p>
              </div>
            </div>
          </div>

          {/* Mini 3D Isometric Marketplace & Phone Preview Container */}
          <div className="col-span-5 relative flex items-center justify-center h-full">
            {/* Styled glassmorphic container holding the exact PolyMart app screenshot! */}
            <div className="relative w-[110px] aspect-[9/18.5] bg-slate-900 rounded-[1.75rem] p-1 shadow-2xl border-[3px] border-slate-700/80 transform rotate-[4deg] overflow-hidden group hover:rotate-0 transition-transform duration-500">
              {/* Speaker / Notch */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-1.5 bg-black rounded-full z-20" />
              {/* Actual PolyMart App Screenshot (Pixel Perfect!) */}
              <img 
                src="/poster-polymart-screen.png" 
                alt="PolyMart App Interface"
                className="w-full h-full object-cover rounded-[1.4rem] select-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none rounded-[1.4rem]" />
            </div>
            
            {/* Isometric Stall Small Decor */}
            <div className="absolute -bottom-2 -left-4 w-12 h-12 bg-amber-400 rounded-xl flex items-center justify-center shadow-lg border border-amber-300 transform -rotate-[15deg]">
              <Store className="w-6 h-6 text-amber-950" />
            </div>
          </div>
        </div>

        {/* ================= "KENAPA PERLU DAFTAR/KEMASKINI" SECTION (5 CARDS) ================= */}
        <div className="relative z-10 bg-white/95 rounded-[1.75rem] p-3.5 shadow-xl border border-slate-200/50 flex flex-col gap-2.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h3 className="text-[9px] font-black uppercase tracking-widest text-[#7A1C1C]">
              Kenapa Perlu Daftar / Kemaskini?
            </h3>
            <span className="text-[7px] font-black bg-[#7A1C1C]/10 text-[#7A1C1C] px-2 py-0.5 rounded-md">5 Manfaat</span>
          </div>

          {/* Grid 5 Kad Faedah Horizontal */}
          <div className="flex flex-col gap-1.5">
            {/* Card 1: Pasaran PolyMart */}
            <div className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 bg-red-100 text-red-700 rounded-lg flex items-center justify-center shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <h4 className="text-[9px] font-black text-slate-800">Pasaran Terus PolyMart</h4>
                <p className="text-[7px] font-medium text-slate-500">Jual produk anda terus kepada ribuan warga kampus POLISAS.</p>
              </div>
            </div>

            {/* Card 2: Sistem POS Pintar */}
            <div className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 bg-amber-100 text-amber-700 rounded-lg flex items-center justify-center shrink-0">
                <Calculator className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <h4 className="text-[9px] font-black text-slate-800">Sistem POS Kaunter Pintar</h4>
                <p className="text-[7px] font-medium text-slate-500">Rekod jualan tunai/atas talian dengan kaunter digital yang mudah.</p>
              </div>
            </div>

            {/* Card 3: Prestasi Real-Time */}
            <div className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <h4 className="text-[9px] font-black text-slate-800">Dashboard Prestasi Real-Time</h4>
                <p className="text-[7px] font-medium text-slate-500">Pantau prestasi hasil, tempahan, dan graf analisis jualan bulanan.</p>
              </div>
            </div>

            {/* Card 4: Promosi Meluas */}
            <div className="flex items-center gap-2.5 p-1.5 bg-[#D4AF37]/10 rounded-xl hover:bg-[#D4AF37]/20 transition-colors border border-[#D4AF37]/20">
              <div className="w-7 h-7 bg-amber-500 text-amber-950 rounded-lg flex items-center justify-center shrink-0">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <h4 className="text-[9px] font-black text-amber-900 flex items-center gap-1.5">
                  Promosi Produk Meluas <span className="text-[6px] bg-amber-500 text-amber-950 px-1 rounded-sm">BARU</span>
                </h4>
                <p className="text-[7px] font-semibold text-amber-800">Memperkenalkan dan mengiklankan produk anda ke seluruh kampus POLISAS!</p>
              </div>
            </div>

            {/* Card 5: Bimbingan Mentor */}
            <div className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="text-left leading-tight">
                <h4 className="text-[9px] font-black text-slate-800">Bimbingan Mentor & PUSKEP</h4>
                <p className="text-[7px] font-medium text-slate-500">Berdaftar rasmi di bawah Pusat Keusahawanan dengan bimbingan mentor.</p>
              </div>
            </div>
          </div>
        </div>

        {/* ================= CALL TO ACTION (CTA CARD) ================= */}
        <div className="relative z-10 bg-gradient-to-r from-[#7A1C1C] to-[#541212] p-2.5 rounded-[1.25rem] shadow-lg border border-red-950/20 text-white flex items-center justify-between">
          <div className="flex items-center gap-2 pl-1.5">
            <Globe className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
            <div className="leading-tight text-left">
              <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Imbas QR Atau Layari:</p>
              <p className="text-[10px] font-black tracking-tight text-white select-all">jpp.cipher-node.org/keusahawanan/onboarding</p>
            </div>
          </div>
          <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center animate-ping-slow">
            <ArrowRight className="w-4 h-4 text-amber-400" />
          </div>
        </div>

        {/* ================= FOOTER COMPARTMENTS (CONTACT & QR CODE) ================= */}
        <div className="relative z-10 grid grid-cols-12 gap-3 items-end">
          {/* Sebarang Pertanyaan / Hubungi */}
          <div className="col-span-7 bg-white/95 rounded-[1.5rem] p-3 shadow-lg border border-slate-200/50 flex flex-col gap-1.5">
            <p className="text-[7px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 text-left">
              Sebarang Pertanyaan, Hubungi:
            </p>
            <div className="flex items-center gap-2 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-[#7A1C1C] shrink-0" />
              <span className="text-[10px] font-black tracking-tight text-[#7A1C1C] select-all">011-39413699</span>
            </div>
            <div className="flex items-center gap-2 text-slate-700">
              <Globe className="w-3.5 h-3.5 text-[#7A1C1C] shrink-0" />
              <span className="text-[8px] font-bold text-slate-600 truncate">jpp.cipher-node.org</span>
            </div>
          </div>

          {/* QR Code (100% Correct and Scannable!) */}
          <div className="col-span-5 flex flex-col items-center">
            <div className="relative w-full aspect-square bg-white rounded-2xl p-1.5 shadow-xl border-2 border-[#D4AF37] transform hover:scale-105 transition-transform">
              <img 
                src="/poster-qr-code.png" 
                alt="Onboarding QR Code" 
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <span className="text-[7px] font-black text-amber-300 uppercase tracking-widest mt-1.5 block drop-shadow-md">
              Imbas Di Sini
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
