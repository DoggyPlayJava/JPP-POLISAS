import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { BarChart, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
  polysuara_poll_votes?: { user_id: string }[];
}

export interface PollProps {
  poll: {
    id: string;
    is_multiple_choice: boolean;
    polysuara_poll_options: PollOption[];
  };
  currentUserId: string;
}

export function calculateNextPollVoteState(
  options: PollOption[],
  optionId: string,
  userId: string,
  isMultipleChoice: boolean = false
): PollOption[] {
  const option = options.find(o => o.id === optionId);
  const hasVotedThis = Boolean((option?.polysuara_poll_votes || []).some(v => v.user_id === userId));

  if (hasVotedThis) {
    // Toggle OFF
    return options.map(o => o.id === optionId ? {
      ...o,
      vote_count: Math.max((o.vote_count ?? (o.polysuara_poll_votes?.length || 1)) - 1, 0),
      polysuara_poll_votes: (o.polysuara_poll_votes || []).filter(v => v.user_id !== userId)
    } : o);
  } else {
    // Toggle ON (+ remove others if single-choice)
    return options.map(o => {
      if (o.id === optionId) {
        return {
          ...o,
          vote_count: (o.vote_count ?? (o.polysuara_poll_votes?.length || 0)) + 1,
          polysuara_poll_votes: [...(o.polysuara_poll_votes || []), { user_id: userId }]
        };
      }
      if (!isMultipleChoice) {
        const hadVote = (o.polysuara_poll_votes || []).some(v => v.user_id === userId);
        if (hadVote) {
          return {
            ...o,
            vote_count: Math.max((o.vote_count ?? (o.polysuara_poll_votes?.length || 1)) - 1, 0),
            polysuara_poll_votes: (o.polysuara_poll_votes || []).filter(v => v.user_id !== userId)
          };
        }
      }
      return o;
    });
  }
}

export function PolySuaraPoll({ poll, currentUserId }: PollProps) {
  const [loading, setLoading] = useState(false);

  // Optimistic UI state
  const [options, setOptions] = useState(poll?.polysuara_poll_options || []);
  
  const totalVotes = options.reduce((acc, opt) => acc + (opt.vote_count ?? (opt.polysuara_poll_votes?.length || 0)), 0);

  const handleVote = async (optionId: string) => {
    if (!currentUserId || loading) return;
    setLoading(true);

    try {
      // Optimistic update BEFORE RPC call
      const nextOptions = calculateNextPollVoteState(
        options,
        optionId,
        currentUserId,
        poll?.is_multiple_choice ?? false
      );
      setOptions(nextOptions);

      // Single atomic RPC call — no race condition
      const { error } = await supabase.rpc('toggle_polysuara_poll_vote', {
        p_option_id: optionId
      });

      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error('Ralat ketika mengundi');
      // Revert to original state on error
      setOptions(poll?.polysuara_poll_options || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 bg-slate-50/90 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
      <div className="flex items-center gap-2 mb-3 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
        <BarChart className="w-4 h-4" />
        Undian {poll?.is_multiple_choice && '(Pelbagai Pilihan)'}
      </div>
      <div className="space-y-2.5">
        {options.map((opt) => {
          const votes = opt.vote_count ?? (opt.polysuara_poll_votes?.length || 0);
          const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
          const isVoted = Boolean((opt.polysuara_poll_votes || []).some(v => v.user_id === currentUserId));
          
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={loading}
              className={cn(
                "relative w-full text-left overflow-hidden rounded-xl border transition-all duration-300",
                isVoted 
                  ? "border-rose-400/60 dark:border-rose-500/50 bg-rose-50/60 dark:bg-rose-500/10 shadow-xs ring-1 ring-rose-400/20 dark:ring-rose-500/20" 
                  : "border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs"
              )}
            >
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 transition-all duration-700",
                  isVoted ? "bg-rose-500/20 dark:bg-rose-500/25" : "bg-slate-100 dark:bg-slate-700/40"
                )} 
                style={{ width: `${percentage}%` }}
              />
              <div className="relative p-3 flex items-start justify-between z-10 gap-2">
                <span className={cn(
                  "text-sm flex-1 break-words text-left",
                  isVoted ? "text-rose-950 dark:text-rose-100 font-semibold" : "text-slate-800 dark:text-slate-200 font-medium"
                )}>
                  {opt.option_text}
                </span>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <span className={cn(
                    "text-xs whitespace-nowrap",
                    isVoted ? "text-rose-600 dark:text-rose-400 font-bold font-mono" : "text-slate-500 dark:text-slate-400 font-bold font-mono"
                  )}>
                    {percentage}% ({votes})
                  </span>
                  {isVoted && <CheckCircle2 className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-right text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
        JUMLAH UNDIAN: {totalVotes}
      </div>
    </div>
  );
}

export default PolySuaraPoll;
