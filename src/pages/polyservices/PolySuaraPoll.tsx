import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { BarChart, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PollProps {
  poll: {
    id: string;
    is_multiple_choice: boolean;
    polysuara_poll_options: {
      id: string;
      option_text: string;
      polysuara_poll_votes: { user_id: string }[];
    }[];
  };
  currentUserId: string;
}

export function PolySuaraPoll({ poll, currentUserId }: PollProps) {
  const [loading, setLoading] = useState(false);

  // Optimistic UI state
  const [options, setOptions] = useState(poll.polysuara_poll_options);
  
  const totalVotes = options.reduce((acc, opt) => acc + opt.polysuara_poll_votes.length, 0);

  const handleVote = async (optionId: string) => {
    if (!currentUserId || loading) return;
    setLoading(true);

    try {
      // Check if user already voted for THIS option
      const option = options.find(o => o.id === optionId);
      const hasVotedThis = option?.polysuara_poll_votes.some(v => v.user_id === currentUserId);

      if (hasVotedThis) {
        // Remove vote
        await supabase.from('polysuara_poll_votes')
          .delete()
          .eq('option_id', optionId)
          .eq('user_id', currentUserId);
          
        setOptions(prev => prev.map(o => o.id === optionId ? {
          ...o, 
          polysuara_poll_votes: o.polysuara_poll_votes.filter(v => v.user_id !== currentUserId)
        } : o));
      } else {
        // If not multiple choice, remove other votes first in DB and UI
        if (!poll.is_multiple_choice) {
          const promises = options.map(o => {
             if (o.id !== optionId && o.polysuara_poll_votes.some(v => v.user_id === currentUserId)) {
               return supabase.from('polysuara_poll_votes').delete().eq('option_id', o.id).eq('user_id', currentUserId);
             }
             return null;
          });
          await Promise.all(promises);
        }

        // Add vote
        await supabase.from('polysuara_poll_votes')
          .insert({ option_id: optionId, user_id: currentUserId, poll_id: poll.id });

        setOptions(prev => prev.map(o => {
          if (o.id === optionId) {
            return { ...o, polysuara_poll_votes: [...o.polysuara_poll_votes, { user_id: currentUserId }] };
          }
          if (!poll.is_multiple_choice) {
            return { ...o, polysuara_poll_votes: o.polysuara_poll_votes.filter(v => v.user_id !== currentUserId) };
          }
          return o;
        }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Ralat ketika mengundi');
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
          const votes = opt.polysuara_poll_votes.length;
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
