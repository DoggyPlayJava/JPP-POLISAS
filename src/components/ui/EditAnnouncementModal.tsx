import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Edit3, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function EditAnnouncementModal({ currentContent, onUpdate, clubId }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const [content, setContent] = useState(currentContent);
    const [loading, setLoading] = useState(false);

    const handleUpdate = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('club_announcements')
                .insert([{ club_id: clubId, content: content }]);

            if (error) throw error;

            setIsOpen(false);
            onUpdate(); // Refresh dashboard
        } catch (err) {
            toast.error("Gagal mengemaskini pesanan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/40 text-white">
                    <Edit3 size={14} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] glass p-8">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tighter">Kemaskini Pesanan</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    <Textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Tulis pesanan baru anda di sini..."
                        className="min-h-[150px] rounded-2xl border-primary/20"
                    />
                    <Button onClick={handleUpdate} disabled={loading} className="w-full h-12 rounded-xl font-black uppercase tracking-widest">
                        {loading ? <Loader2 className="animate-spin" /> : 'Simpan Pesanan Baru'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}