import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface PolyTaskChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  otherUserName: string;
}

export function PolyTaskChatModal({ isOpen, onClose, jobId, jobTitle, otherUserName }: PolyTaskChatModalProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && jobId) {
      fetchMessages();

      // Subscribe to real-time changes
      const channel = supabase
        .channel(`polytask_chats_${jobId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'polytask_chats',
            filter: `job_id=eq.${jobId}`
          },
          (payload) => {
            const newMsg = payload.new;
            // Fetch sender profile details to attach to message
            supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', newMsg.sender_id)
              .single()
              .then(({ data }) => {
                const completeMsg = { ...newMsg, sender: data };
                setMessages(prev => [...prev, completeMsg]);
              });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, jobId]);

  useEffect(() => {
    // Scroll to bottom whenever messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('polytask_chats')
      .select('*, sender:profiles!sender_id(full_name, avatar_url)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    const msgText = newMessage.trim();
    setNewMessage('');

    // Optimistic UI update could be done here, but since Realtime is fast, 
    // we'll just wait for the insert or rely on the realtime event to show it.
    // However, it's safer to just let the Realtime event update the UI.

    const { error } = await supabase.from('polytask_chats').insert({
      job_id: jobId,
      sender_id: profile.id,
      message: msgText
    });

    if (error) {
      toast.error('Gagal menghantar mesej');
      setNewMessage(msgText); // Revert message text on failure
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-slate-950 border-b border-white/10 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white leading-tight">{otherUserName}</h3>
                  <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-xs">{jobTitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-900/50">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                  <p>Mula bersembang dengan {otherUserName}</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === profile?.id;
                  
                  // Simple logic to group timestamps or handle consecutive messages 
                  // can be added here. For now, basic display.

                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-br-none' 
                          : 'bg-slate-800 text-slate-200 border border-white/5 rounded-bl-none'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {format(new Date(msg.created_at), 'hh:mm a', { locale: ms })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-slate-950 p-4 border-t border-white/10 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Taip mesej anda di sini..."
                  className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white p-3 rounded-xl transition-colors flex items-center justify-center shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
