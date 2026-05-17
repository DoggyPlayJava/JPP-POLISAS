import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';
import { Send, X, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ms } from 'date-fns/locale';

interface ChatProps {
  chatId: string;
  currentUserId: string;
  isExco: boolean;
  onClose: () => void;
}

export function PolySuaraChat({ chatId, currentUserId, isExco, onClose }: ChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatStatus, setChatStatus] = useState('OPEN');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    fetchChatStatus();

    const channel = supabase.channel(`chat_${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'polysuara_chat_messages', filter: `chat_id=eq.${chatId}` }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        scrollToBottom();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'polysuara_chats', filter: `id=eq.${chatId}` }, (payload) => {
        setChatStatus(payload.new.status);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('polysuara_chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChatStatus = async () => {
    const { data } = await supabase.from('polysuara_chats').select('status').eq('id', chatId).single();
    if (data) setChatStatus(data.status);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || chatStatus === 'CLOSED') return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { error } = await supabase.from('polysuara_chat_messages').insert({
        chat_id: chatId,
        sender_id: currentUserId,
        message: content
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghantar mesej');
    }
  };

  const handleCloseChat = async () => {
    if (!window.confirm('Tutup sesi sembang ini?')) return;
    try {
      const { error } = await supabase.from('polysuara_chats').update({ status: 'CLOSED' }).eq('id', chatId);
      if (error) throw error;
      toast.success('Sembang ditamatkan');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[80vh] max-h-[700px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", isExco ? "bg-rose-500/20 text-rose-500" : "bg-teal-500/20 text-teal-500")}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100">
                {isExco ? 'Pelajar (Anon)' : 'Wakil JPP (Exco)'}
              </h3>
              <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
                Sembang Sulit {chatStatus === 'CLOSED' && <span className="text-rose-500">(DITUTUP)</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExco && chatStatus === 'OPEN' && (
              <button onClick={handleCloseChat} className="text-[10px] font-bold bg-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg hover:bg-rose-500/30 transition-colors">
                TUTUP
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
          <div className="text-center pb-4">
            <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full uppercase tracking-wider">
              Sesi Kaunseling Tanpa Nama Bermula
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm",
                    isMe 
                      ? "bg-rose-600 text-white rounded-br-sm" 
                      : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-sm"
                  )}>
                    {msg.message}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 font-medium px-1">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ms })}
                  </span>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {chatStatus === 'OPEN' ? (
          <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950 flex gap-2 shrink-0">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Tulis mesej..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="w-10 h-10 rounded-xl bg-rose-500 hover:bg-rose-600 flex items-center justify-center text-white transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="p-4 border-t border-slate-800 bg-slate-950 text-center shrink-0">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sesi Sembang Telah Ditamatkan
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
