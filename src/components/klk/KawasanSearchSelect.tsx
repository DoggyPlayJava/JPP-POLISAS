// ============================================================
// KawasanSearchSelect — Searchable dropdown untuk pilih kawasan
// Gantikan <select> biasa yang panjang & susah dicari
// Boleh guna dalam: KlkResidencyModal, SettingsPage, KlkResidencyFormPage
// ============================================================
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface KawasanSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  kawasanList: string[];
  placeholder?: string;
  /** Class untuk wrapper — guna untuk sesuaikan tema */
  className?: string;
  /** Class untuk input */
  inputClass?: string;
  required?: boolean;
  disabled?: boolean;
}

export function KawasanSearchSelect({
  value,
  onChange,
  kawasanList,
  placeholder = '-- Pilih kawasan --',
  className = '',
  inputClass = '',
  required,
  disabled,
}: KawasanSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Label untuk nilai terpilih
  const selectedLabel =
    value === 'LAIN_LAIN' ? 'Lain-lain' : value || '';

  // Filter kawasan berdasarkan carian
  const filtered = kawasanList.filter(k =>
    k.toLowerCase().includes(search.toLowerCase())
  );

  // Tutup dropdown bila klik luar
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [disabled]);

  const handleSelect = useCallback((val: string) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setSearch('');
  }, [onChange]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full h-11 px-4 rounded-xl border text-sm font-medium text-left flex items-center justify-between gap-2 transition-all
          focus:outline-none focus:ring-2 focus:ring-blue-500/40
          disabled:opacity-50 disabled:cursor-not-allowed
          ${open ? 'ring-2 ring-blue-500/40' : ''}
          ${inputClass || 'bg-background border-border/50'}
        `}
      >
        <span className={selectedLabel ? 'text-foreground' : 'text-muted-foreground'}>
          {selectedLabel || placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {value && (
            <span
              onClick={handleClear}
              className="w-4 h-4 rounded-full bg-muted-foreground/20 flex items-center justify-center hover:bg-red-500/20 transition-colors cursor-pointer"
            >
              <X className="w-2.5 h-2.5 text-muted-foreground" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-xl border border-border/50 bg-popover shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/20">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kawasan..."
              className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              onKeyDown={e => {
                if (e.key === 'Escape') { setOpen(false); setSearch(''); }
                if (e.key === 'Enter' && filtered.length === 1) { handleSelect(filtered[0]); }
              }}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                Tiada kawasan sepadan
              </div>
            ) : (
              filtered.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleSelect(k)}
                  className={`w-full px-4 py-2.5 text-sm text-left transition-colors hover:bg-muted/60 flex items-center gap-2
                    ${value === k ? 'bg-blue-500/10 text-blue-400 font-bold' : 'text-foreground font-medium'}
                  `}
                >
                  {value === k && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                  {k}
                </button>
              ))
            )}
            {/* Lain-lain sentiasa di bawah */}
            <button
              type="button"
              onClick={() => handleSelect('LAIN_LAIN')}
              className={`w-full px-4 py-2.5 text-sm text-left border-t border-border/20 transition-colors hover:bg-muted/60 flex items-center gap-2
                ${value === 'LAIN_LAIN' ? 'bg-amber-500/10 text-amber-400 font-bold' : 'text-muted-foreground font-medium'}
              `}
            >
              {value === 'LAIN_LAIN' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
              Lain-lain (nyatakan sendiri)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
