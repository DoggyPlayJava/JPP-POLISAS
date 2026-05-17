import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { BarChart, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
  polysuara_poll_votes: { user_id: string }[];
}

interface PollProps {
  poll: {
    id: string;
    is_multiple_choice: boolean;
    polysuara_poll_options: PollOption[];
  };
  currentUserId: string;
}

export function PolySuaraPoll({ poll, currentUserId }: PollProps) {
  const [loading, setLoading] = useState(false);

  // Optimistic UI state
  const [options, setOptions] = useState(poll.polysuara_poll_options);
  
  const totalVotes = options.reduce((acc, opt) => acc + (opt.vote_count ?? opt.polysuara_poll_votes.length), 0);

  const handleVote = async (optionId: string) => {
    if (!currentUserId || loading) return;
    setLoading(true);

    try {
      const option = options.find(o => o.id === optionId);
      const hasVotedThis = option?.polysuara_poll_votes.some(v => v.user_id === currentUserId);

      // Optimistic update BEFORE RPC call
      if (hasVotedThis) {
        // Toggle OFF
        setOptions(prev => prev.map(o => o.id === optionId ? {
          ...o,
          vote_count: Math.max((o.vote_count ?? o.polysuara_poll_votes.length) - 1, 0),
          polysuara_poll_votes: o.polysuara_poll_votes.filter(v => v.user_id !== currentUserId)
        } : o));
      } else {
        // Toggle ON (+ remove others if single-choice)
        setOptions(prev => prev.map(o => {
          if (o.id === optionId) {
            return {
              ...o,
              vote_count: (o.vote_count ?? o.polysuara_poll_votes.length) + 1,
              polysuara_poll_votes: [...o.polysuara_poll_votes, { user_id: currentUserId }]
            };
          }
          if (!poll.is_multiple_choice) {
            const hadVote = o.polysuara_poll_votes.some(v => v.user_id === currentUserId);
            if (hadVote) {
              return {
                ...o,
                vote_count: Math.max((o.vote_count ?? o.polysuara_poll_votes.length) - 1, 0),
                polysuara_poll_votes: o.polysuara_poll_votes.filter(v => v.user_id !== currentUserId)
              };
            }
          }
          return o;
        }));
      }

      // Single atomic RPC call — no race condition
      const { error } = await supabase.rpc('toggle_polysuara_poll_vote', {
        p_option_id: optionId
      });

      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error('Ralat ketika mengundi');
      // Revert to original state on error
      setOptions(poll.polysuara_poll_options);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
      <div className="flex items-center gap-2 mb-3 text-slate-400 text-xs font-bold uppercase tracking-wider">
        <BarChart className="w-4 h-4" />
        Undian {poll.is_multiple_choice && '(Pelbagai Pilihan)'}
      </div>
      <div className="space-y-2.5">
        {options.map((opt) => {
          const votes = opt.vote_count ?? opt.polysuara_poll_votes.length;
          const percentage = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
          const isVoted = opt.polysuara_poll_votes.some(v => v.user_id === currentUserId);
          
          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={loading}
              className={cn(
                "relative w-full text-left overflow-hidden rounded-xl border transition-all duration-300",
                isVoted 
                  ? "border-rose-500/50 bg-rose-500/10" 
                  : "border-slate-800 bg-slate-800/50 hover:bg-slate-800"
              )}
            >
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 opacity-20 transition-all duration-700",
                  isVoted ? "bg-rose-500" : "bg-slate-400"
                )} 
                style={{ width: `${percentage}%` }}
              />
              <div className="relative p-3 flex items-center justify-between z-10">
                <span className={cn(
                  "text-sm font-medium",
                  isVoted ? "text-rose-100" : "text-slate-300"
                )}>
                  {opt.option_text}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">
                    {percentage}% ({votes})
                  </span>
                  {isVoted && <CheckCircle2 className="w-4 h-4 text-rose-500" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>
      <div className="mt-3 text-right text-[10px] text-slate-600 font-bold">
        JUMLAH UNDIAN: {totalVotes}
      </div>
    </div>
  );
}
