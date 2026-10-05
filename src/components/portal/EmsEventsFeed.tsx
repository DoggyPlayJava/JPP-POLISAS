import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { filterUpcomingEvents } from '@/lib/superAppHelpers';
import { cn } from '@/lib/utils';

export interface EmsEventsFeedProps {
  events?: any[];
  className?: string;
}

export function EmsEventsFeed({ events: initialEvents, className }: EmsEventsFeedProps) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<any[]>(initialEvents || []);
  const [loading, setLoading] = useState<boolean>(!initialEvents);

  useEffect(() => {
    if (initialEvents) {
      setEvents(filterUpcomingEvents(initialEvents, 8));
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchEvents() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('ems_events')
          .select('id, title, description, category, event_type, event_mode, event_date, location, status')
          .neq('status', 'DRAFT')
          .order('event_date', { ascending: true })
          .limit(8);

        if (error) {
          console.warn('[EmsEventsFeed] Error fetching ems_events:', error.message);
          return;
        }

        if (isMounted && data) {
          const filtered = filterUpcomingEvents(data, 8);
          setEvents(filtered);
        }
      } catch (err) {
        console.warn('[EmsEventsFeed] Unexpected error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchEvents();
    return () => {
      isMounted = false;
    };
  }, [initialEvents]);

  const handleCardClick = (id: string) => {
    navigate(`/ems/register/${id}`);
  };

  const handleSeeAll = () => {
    navigate('/ems/dashboard');
  };

  if (!loading && events.length === 0) {
    return null;
  }

  return (
    <section className={cn('w-full max-w-full overflow-hidden space-y-3', className)} aria-label="Acara Kampus">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 dark:text-rose-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
                Acara Kampus
              </h2>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                EMS
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Pertandingan & program siswa terkini
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSeeAll}
          className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer group"
        >
          <span>Lihat Semua</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* Horizontal Feed */}
      {loading ? (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-[230px] sm:w-[270px] h-[190px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-3 flex flex-col justify-between animate-pulse"
            >
              <div className="w-full h-24 rounded-xl bg-slate-200 dark:bg-slate-800" />
              <div className="space-y-2 mt-2">
                <div className="w-3/4 h-3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-1/2 h-2.5 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {events.map((evt) => {
            const dateStr = evt.event_date
              ? new Date(evt.event_date).toLocaleDateString('ms-MY', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Tarikh Menyusul';

            const bannerUrl = evt.banner_url || evt.image_url;

            return (
              <div
                key={evt.id}
                onClick={() => handleCardClick(evt.id)}
                className="snap-start shrink-0 w-[230px] sm:w-[270px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-rose-500/40 dark:hover:border-rose-500/40 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer flex flex-col group"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick(evt.id);
                  }
                }}
              >
                {/* Banner / Poster Header */}
                <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-rose-500/20 via-pink-500/10 to-indigo-950/30 flex items-center justify-center">
                  {bannerUrl ? (
                    <img
                      src={bannerUrl}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-rose-500/15 via-rose-600/10 to-purple-900/20 p-2 text-center">
                      <Trophy className="w-8 h-8 text-rose-500/40 mb-1" />
                      <span className="text-[10px] font-bold text-rose-600/70 dark:text-rose-400/70 uppercase tracking-widest line-clamp-1">
                        {evt.category || 'Acara POLISAS'}
                      </span>
                    </div>
                  )}

                  {/* "TERBUKA" Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-sm">
                      TERBUKA
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      {evt.title}
                    </h3>
                  </div>

                  <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{dateStr}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                      <span className="truncate">{evt.location || 'Kampus POLISAS'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default EmsEventsFeed;
