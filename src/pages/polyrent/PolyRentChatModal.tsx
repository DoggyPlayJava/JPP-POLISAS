import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { X, Send, MessageCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ms } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface PolyRentChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
}

export function PolyRentChatModal({ isOpen, onClose, receiverId, receiverName }: PolyRentChatModalProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && profile?.id && receiverId) {
      fetchMessages();

      // Subscribe to real-time changes
      const channel = supabase
        .channel(`polyrent_chat_${profile.id}_${receiverId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'polyrent_messages'
          },
          (payload) => {
            const newMsg = payload.new;
            // Only add if it's part of this conversation
            if (
              (newMsg.sender_id === profile.id && newMsg.receiver_id === receiverId) ||
              (newMsg.sender_id === receiverId && newMsg.receiver_id === profile.id)
            ) {
              setMessages(prev => [...prev, newMsg]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, profile?.id, receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    setLoading(true);
    
    // We fetch all messages between these two users
    const { data, error } = await supabase
      .from('polyrent_messages')
      .select('*')
      .or(`and(sender_id.eq.${profile?.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${profile?.id})`)
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

    const { error } = await supabase.from('polyrent_messages').insert({
      sender_id: profile.id,
      receiver_id: receiverId,
      content: msgText
    });

    if (error) {
      toast.error('Gagal menghantar mesej');
      setNewMessage(msgText);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-lg h-[85vh] sm:h-[600px] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-white/5 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center text-lg font-bold">
                  {receiverName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{receiverName}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Mesej Langsung
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                     <MessageCircle className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium">Mulakan perbualan dengan {receiverName}</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === profile?.id;
                  return (
                    <div key={msg.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isMe 
                          ? 'bg-teal-500 text-white rounded-br-sm shadow-sm' 
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-white/5 rounded-bl-sm shadow-sm'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
                        {format(new Date(msg.created_at), 'hh:mm a', { locale: ms })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-slate-950 p-4 border-t border-slate-100 dark:border-white/5 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Taip mesej..."
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-full px-5 py-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500/50 outline-none transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal-500 text-white w-12 h-12 rounded-full transition-all flex items-center justify-center shrink-0 shadow-md shadow-teal-500/20"
                >
                  <Send className="w-5 h-5 ml-1" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
