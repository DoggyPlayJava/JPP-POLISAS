import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { FileUp, FileText, ImageIcon, Loader2, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export function TaskDetailModal({ task, isOpen, onClose, onRefresh }: any) {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [notes, setNotes] = useState('');
    const [submission, setSubmission] = useState<any>(null);

    useEffect(() => {
        if (isOpen && task) fetchSubmission();
    }, [isOpen, task]);

    const fetchSubmission = async () => {
        const { data } = await supabase
            .from('task_submissions')
            .select('*')
            .eq('task_id', task.id)
            .maybeSingle(); // Guna maybeSingle() supaya tidak throw 406 bila tiada rekod
        setSubmission(data || null);
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !task) return;
        
        if (user?.id !== task.assigned_to?.id && user?.id !== task.assigned_to) {
            toast.error("Anda tidak mempunyai kebenaran untuk menghantar tugas ini.");
            return;
        }

        setUploading(true);
        try {
            // 1. Upload Fail ke Supabase Storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${task.id}-${crypto.randomUUID()}.${fileExt}`;
            const filePath = `task-proofs/${fileName}`; // Subfolder dalam bucket 'reports'

            const { error: uploadError } = await supabase.storage
                .from('reports') // Guna bucket 'reports' yang sedia ada
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Ambil Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('reports') // Sama dengan bucket upload di atas
                .getPublicUrl(filePath);

            // 2. Simpan ke Database
            const { error: dbError } = await supabase.from('task_submissions').insert([{
                task_id: task.id,
                user_id: user?.id,
                file_url: publicUrl,
                file_type: fileExt,
                notes: notes
            }]);

            if (dbError) throw dbError;

            // 3. Update Status Tugasan
            const { error: updateError } = await supabase.from('club_tasks').update({ status: 'COMPLETED' }).eq('id', task.id);
            if (updateError) throw updateError;

            // 4. Log Aktiviti
            await supabase.from('club_logs').insert([{
                club_id: task.club_id,
                user_id: user?.id,
                type: 'TASK_SUBMISSION',
                content: `Ahli [${user?.email}] menghantar bukti tugasan: ${task.title}`
            }]);

            toast.success("Bukti berjaya dihantar!");
            onRefresh();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Gagal memuat naik bukti.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black tracking-tighter">Detail Tugasan</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pt-4">
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                        <h3 className="font-bold text-lg">{task?.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{task?.description || 'Tiada penerangan tambahan.'}</p>
                    </div>

                    {submission ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase">
                                <CheckCircle className="w-4 h-4" /> Tugasan Selesai
                            </div>
                            <div className="p-4 border rounded-2xl bg-muted/20">
                                <p className="text-[10px] font-bold uppercase opacity-50 mb-2">Bukti Dihantar:</p>
                                <a href={submission.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-primary font-bold text-sm hover:underline">
                                    {submission.file_type === 'pdf' ? <FileText /> : <ImageIcon />}
                                    Lihat Fail Bukti ({submission.file_type})
                                </a>
                                {submission.notes && <p className="text-xs mt-3 italic text-muted-foreground">"{submission.notes}"</p>}
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Muat Naik Bukti (PNG/JPG/PDF)</label>
                                <label className={cn(
                                    "relative flex flex-col items-center justify-center gap-4 p-10 rounded-[2rem] border-2 border-dashed transition-all cursor-pointer group",
                                    file ? "bg-emerald-50/50 border-emerald-500/30 shadow-inner" : "bg-muted/30 border-muted-foreground/20 hover:bg-muted/50 hover:border-primary/30"
                                )}>
                                    <Input
                                        type="file"
                                        className="sr-only"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        accept=".pdf,.png,.jpg,.jpeg"
                                    />
                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-active:scale-95",
                                        file ? "bg-emerald-500 text-white" : "bg-white text-muted-foreground"
                                    )}>
                                        <FileUp size={24} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-black text-foreground">
                                            {file ? file.name : "Pilih fail atau seret ke sini"}
                                        </p>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                                            {file ? "Klik untuk tukar fail" : "Maksimum 5MB"}
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase opacity-50">Nota Tambahan (Opsional)</label>
                                <Textarea
                                    placeholder="Berikan sedikit ulasan tentang tugasan anda..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>

                            <Button type="submit" disabled={uploading || !file} className="w-full rounded-xl font-black uppercase tracking-widest h-12">
                                {uploading ? <Loader2 className="animate-spin" /> : 'Hantar Bukti Selesai'}
                            </Button>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}