import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { BarChart, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { isDebatePollOptions } from '@/lib/polySuaraHelpers';

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
  const { t } = useTranslation('portal');
  const [loading, setLoading] = useState(false);

  // Optimistic UI state
  const [options, setOptions] = useState(poll?.polysuara_poll_options || []);
  
  const totalVotes = options.reduce((acc, opt) => acc + (opt.vote_count ?? (opt.polysuara_poll_votes?.length || 0)), 0);
  const isDebate = isDebatePollOptions(options);
  const agreeOpt = isDebate
    ? options.find((o) => /^(setuju|agree)$/i.test((o.option_text || '').trim()))
    : undefined;
  const disagreeOpt = isDebate
    ? options.find((o) => /^(tidak(\s+setuju)?|disagree)$/i.test((o.option_text || '').trim()))
    : undefined;
  const agreeVotes = agreeOpt ? (agreeOpt.vote_count ?? (agreeOpt.polysuara_poll_votes?.length || 0)) : 0;
  const agreePct = isDebate && totalVotes > 0 ? Math.round((agreeVotes / totalVotes) * 100) : 50;
  const disagreePct = isDebate && totalVotes > 0 ? Math.max(100 - agreePct, 0) : 50;

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
      toast.error(t('portal:vote_error', 'Ralat ketika mengundi'));
      // Revert to original state on error
      setOptions(poll?.polysuara_poll_options || []);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3.5 bg-[#F6FBF9] dark:bg-[#0E1116] rounded-2xl p-4 border border-[#B8E4DC]/80 dark:border-[#252B35] shadow-2xs">
      <div className="flex items-center gap-2 mb-3 text-[#3B635C] dark:text-[#94A0B2] text-xs font-bold uppercase tracking-wider">
        <BarChart className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF]" />
        {t('portal:poll_title', 'Undian')} {poll?.is_multiple_choice && t('portal:poll_multiple_choice', '(Pelbagai Pilihan)')}
      </div>
      {isDebate && totalVotes > 0 && agreeOpt && disagreeOpt && (
        <div data-testid="debate-split-meter" className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#0F766E] dark:text-[#2DD4BF]">
              {agreeOpt.option_text} · <span className="font-mono tabular-nums">{agreePct}%</span>
            </span>
            <span className="text-rose-600 dark:text-rose-400">
              <span className="font-mono tabular-nums">{disagreePct}%</span> · {disagreeOpt.option_text}
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden flex bg-[#EBF7F4] dark:bg-[#1B2028]">
            <div
              className="h-full bg-[#0F766E] dark:bg-[#2DD4BF] transition-all duration-500"
              style={{ width: `${agreePct}%` }}
            />
            <div
              className="h-full bg-rose-500 transition-all duration-500"
              style={{ width: `${disagreePct}%` }}
            />
          </div>
        </div>
      )}
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
                "relative w-full text-left overflow-hidden rounded-xl border transition-all duration-300 cursor-pointer",
                isVoted
                  ? "border-[#0F766E]/60 dark:border-[#2DD4BF]/50 bg-[#EBF7F4]/80 dark:bg-[#1B2028]/70 shadow-xs ring-1 ring-[#0F766E]/20 dark:ring-[#2DD4BF]/20"
                  : "border-[#B8E4DC]/80 dark:border-[#252B35] bg-white dark:bg-[#13171D] hover:border-[#0F766E]/40 dark:hover:border-[#2DD4BF]/40 shadow-2xs"
              )}
            >
              <div
                className={cn(
                  "absolute inset-y-0 left-0 transition-all duration-700",
                  isVoted ? "bg-[#0F766E]/20 dark:bg-[#2DD4BF]/25" : "bg-[#EBF7F4]/70 dark:bg-[#1B2028]/50"
                )}
                style={{ width: `${percentage}%` }}
              />
              <div className="relative p-3 flex items-start justify-between z-10 gap-2">
                <span className={cn(
                  "text-sm flex-1 break-words text-left",
                  isVoted ? "text-[#0B2420] dark:text-[#F1F5F9] font-semibold" : "text-[#0B2420] dark:text-[#F1F5F9] font-medium"
                )}>
                  {opt.option_text}
                </span>
                <div className="flex items-center gap-2 shrink-0 mt-0.5">
                  <span className={cn(
                    "text-xs whitespace-nowrap font-bold font-mono tabular-nums",
                    isVoted ? "text-[#0F766E] dark:text-[#2DD4BF]" : "text-[#3B635C] dark:text-[#94A0B2]"
                  )}>
                    {percentage}% ({votes})
                  </span>
                  {isVoted && <CheckCircle2 className="w-4 h-4 text-[#0F766E] dark:text-[#2DD4BF] shrink-0" />}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-right text-[#3B635C] dark:text-[#94A0B2] font-bold uppercase tracking-wider text-[10px]">
        {t('portal:total_votes_label', `JUMLAH UNDIAN: ${totalVotes}`, { count: totalVotes })}
      </div>
    </div>
  );
}

export default PolySuaraPoll;
