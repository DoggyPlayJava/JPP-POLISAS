import React, { useState, useEffect, useRef } from 'react';
import { Search, User, RefreshCw, X, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface StudentSelectData {
  full_name: string;
  matrix_no: string;
  email?: string;
}

export interface StudentSearchComboboxProps {
  onSelectStudent: (student: StudentSelectData) => void;
  placeholder?: string;
  className?: string;
  value?: string;
}

interface ProfileResult {
  id: string;
  full_name: string;
  matrix_no: string;
  email?: string;
  avatar_url?: string;
}

export function StudentSearchCombobox({
  onSelectStudent,
  placeholder = 'Cari pelajar POLISAS (Nama / No. Matrik)...',
  className = '',
  value = '',
}: StudentSearchComboboxProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<ProfileResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value if provided
  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, matrix_no, matric_no, email, avatar_url')
          .or(`full_name.ilike.%${trimmed}%,matrix_no.ilike.%${trimmed}%,matric_no.ilike.%${trimmed}%`)
          .limit(8);

        if (!error && data) {
          const mapped: ProfileResult[] = data.map((p: any) => ({
            id: p.id,
            full_name: p.full_name || 'Pelajar POLISAS',
            matrix_no: p.matrix_no || p.matric_no || '',
            email: p.email || '',
            avatar_url: p.avatar_url || '',
          }));
          setResults(mapped);
          setIsOpen(true);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Error searching POLISAS student profiles:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (student: ProfileResult) => {
    onSelectStudent({
      full_name: student.full_name,
      matrix_no: student.matrix_no,
      email: student.email,
    });
    setQuery(student.full_name);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
        />
        {loading ? (
          <RefreshCw className="absolute right-3 w-4 h-4 text-indigo-400 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-800/60 animate-fadeIn">
          {results.length > 0 ? (
            results.map((student) => (
              <div
                key={student.id}
                onClick={() => handleSelect(student)}
                className="p-3 flex items-center justify-between gap-3 hover:bg-indigo-600/15 cursor-pointer transition text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {student.avatar_url ? (
                    <img
                      src={student.avatar_url}
                      alt={student.full_name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-semibold text-white group-hover:text-indigo-300 truncate">
                      {student.full_name}
                    </p>
                    {student.email && (
                      <p className="text-[11px] text-slate-400 truncate">{student.email}</p>
                    )}
                  </div>
                </div>

                {student.matrix_no && (
                  <span className="shrink-0 bg-slate-950 group-hover:bg-indigo-950/80 border border-slate-800 group-hover:border-indigo-500/40 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-indigo-300 transition">
                    {student.matrix_no}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-xs text-slate-400">
              Tiada pelajar POLISAS ditemui untuk &quot;{query}&quot;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
