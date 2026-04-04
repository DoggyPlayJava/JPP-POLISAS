import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAiAssistant } from '@/hooks/useAiAssistant';
import { useAiSettings } from '@/contexts/AiSettingsContext';
import { Plus, Loader2, Wand2, Sparkles, User, ShieldAlert } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function AddTaskModal({ onTaskAdded }: { onTaskAdded: () => void }) {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);

    // Mode toggles
    const [isAiMode, setIsAiMode] = useState(false);
    const { callAi, isLoading: aiLoading } = useAiAssistant();
    const { allowAiBudget } = useAiSettings();

    // Reset AI mode if admin disables AI
    useEffect(() => {
        if (!allowAiBudget) setIsAiMode(false);
    }, [allowAiBudget]);

    // State Manual Form
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        merit_points: 0
    });

    // State AI Form
    const [aiGoal, setAiGoal] = useState('');
    const [aiDueDate, setAiDueDate] = useState('');
    const [aiGeneratedTasks, setAiGeneratedTasks] = useState<any[]>([]);
    const [aiError, setAiError] = useState(false);

    // Fetch members when modal opens
    useEffect(() => {
        if (isOpen && profile?.club_id) {
            const fetchMembers = async () => {
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .eq('club_id', profile.club_id)
                    .eq('account_status', 'APPROVED');
                setMembers(data || []);
            };
            fetchMembers();
            setFormData({ title: '', description: '', assigned_to: '', due_date: '', merit_points: 0 });
            setAiGoal('');
            setAiDueDate('');
            setAiGeneratedTasks([]);
            setIsAiMode(false);
        }
    }, [isOpen, profile?.club_id]);

    const handleSubmitManual = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.assigned_to) return toast.error("Sila pilih ahli!");

        setLoading(true);
        try {
            const { error } = await supabase.from('club_tasks').insert([{
                club_id: profile?.club_id,
                title: formData.title,
                description: formData.description,
                assigned_to: formData.assigned_to,
                due_date: new Date(formData.due_date).toISOString(),
                created_by: user?.id,
                status: 'PENDING_APPROVAL',
                approval_status: 'WAITING',
                merit_points: formData.merit_points || 0
            }]);

            if (error) throw error;
            toast.success("Tugasan baharu ditambah!");
            setIsOpen(false);
            onTaskAdded();
        } catch (err) {
            console.error(err);
            toast.error("Gagal menambah tugasan.");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAiTasks = async () => {
        if (!aiGoal || aiGoal.trim().length < 5) return toast.error("Nyatakan matlamat / kerja projek yang jelas.");
        
        setAiGeneratedTasks([]);
        setAiError(false);
        const rawResponse = await callAi({
            task: 'pecahkan_tugasan_ai',
            query: aiGoal
        });

        if (rawResponse) {
            try {
                const cleanJsonString = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
                const parsedArray = JSON.parse(cleanJsonString);
                if (Array.isArray(parsedArray) && parsedArray.length > 0) {
                    // Injecting fields for UI manipulation
                    const formatted = parsedArray.map((t: any) => ({
                        title: t.title || "Tiada Tajuk",
                        description: t.description || "",
                        assigned_to: "", // requires explicit selection
                        merit_points: 0, // default
                    }));
                    setAiGeneratedTasks(formatted);
                    toast.success(`Berjaya menjana ${formatted.length} pecahan tugas!`);
                } else {
                    throw new Error("AI memulangkan isian kosong.");
                }
            } catch (error) {
                console.error(error);
                toast.error("AI menjana format salah. Cuba spesifikkan lagi objektif anda.");
                setAiError(true);
            }
        } else {
            setAiError(true);
        }
    };

    const updateAiTask = (index: number, field: string, value: any) => {
        const newArr = [...aiGeneratedTasks];
        newArr[index] = { ...newArr[index], [field]: value };
        setAiGeneratedTasks(newArr);
    };

    const handleSubmitAiBatch = async () => {
        if (!aiDueDate) return toast.error("Sila pilih Tarikh Akhir (Deadline) yang seragam.");
        
        // Validation check
        const unfilled = aiGeneratedTasks.find(t => !t.assigned_to);
        if (unfilled) return toast.error(`Sila agihkan AJK yang bertugas untuk tugasan: "${unfilled.title}"`);

        setLoading(true);
        try {
            const batchPayload = aiGeneratedTasks.map(t => ({
                club_id: profile?.club_id,
                title: t.title,
                description: t.description,
                assigned_to: t.assigned_to,
                due_date: new Date(aiDueDate).toISOString(),
                created_by: user?.id,
                status: 'PENDING_APPROVAL',
                approval_status: 'WAITING',
                merit_points: t.merit_points || 0
            }));

            const { error } = await supabase.from('club_tasks').insert(batchPayload);
            if (error) throw error;

            toast.success(`${batchPayload.length} tugasan telah berjaya didelegasikan!`);
            setIsOpen(false);
            onTaskAdded();
        } catch (err) {
            console.error(err);
            toast.error("Gagal mendaftar tugasan pukal.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="rounded-full text-[10px] font-black uppercase tracking-widest bg-primary hover:bg-primary/90">
                    <Plus className="w-3 h-3 mr-1" /> Tugasan Baru
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] rounded-[2rem] max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                <DialogHeader className="p-8 border-b pb-6 shrink-0 relative bg-muted/20">
                    <DialogTitle className="font-black text-2xl tracking-tighter flex items-center justify-between">
                        <span>{isAiMode ? 'Bantuan Delegasi Pintar' : 'Bina Tugasan'}</span>
                        {allowAiBudget && (
                            <Button 
                                variant="outline" size="sm" 
                                onClick={() => setIsAiMode(!isAiMode)}
                                className={`rounded-full shadow-none border-primary/20 ${isAiMode ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border-indigo-200'}`}
                            >
                                {isAiMode ? <User size={13} className="mr-1.5"/> : <Wand2 size={13} className="mr-1.5" />}
                                {isAiMode ? 'Mod Manual' : 'Pecah Tugasan AI'}
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>
                
                <div className="p-8 flex-1 overflow-y-auto">
                    {/* MOD AI PINTAR */}
                    {isAiMode ? (
                        <div className="space-y-6">
                            <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/10 rounded-3xl space-y-4">
                                <div className="flex items-start gap-3">
                                    <Sparkles className="text-violet-500 mt-1" size={20} />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-violet-700">Tugasan Besar</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">Beritahu AI matlamat projek besar (contoh: "Buat Karnival Sukaneka") dan biarkan AI mencipta pembahagian mikro tugasan tersebut secara spesifik.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                     <Input
                                        placeholder="Tuliskan matlamat kerja..."
                                        value={aiGoal}
                                        onChange={(e) => setAiGoal(e.target.value)}
                                        className="rounded-2xl border-indigo-200"
                                     />
                                     <Button disabled={aiLoading} onClick={handleGenerateAiTasks} className="rounded-2xl bg-violet-600 hover:bg-violet-700 text-white shrink-0">
                                         {aiLoading ? <Loader2 className="animate-spin" /> : 'Jana'}
                                     </Button>
                                </div>
                            </div>

                            {aiError && (
                                <div className="p-6 border border-rose-100 bg-rose-50/30 rounded-3xl flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in">
                                    <ShieldAlert className="text-rose-500" size={28} />
                                    <div className="space-y-1">
                                        <p className="text-xs font-black text-rose-600 uppercase tracking-tight">Sistem Sedang Sibuk</p>
                                        <p className="text-[10px] text-muted-foreground leading-relaxed">Maaf, kami gagal memecahkan tugasan sekarang. Sila cuba lagi atau gunakan Mod Manual.</p>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={handleGenerateAiTasks} className="text-rose-600 font-bold text-[10px] uppercase">Cuba Semula</Button>
                                </div>
                            )}

                            {aiGeneratedTasks.length > 0 && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3">
                                    <div className="flex justify-between items-center bg-card sticky top-0 bg-white z-10 p-2">
                                        <label className="text-[10px] font-black uppercase text-foreground/50 tracking-widest">
                                            Penyerahan Sub-Tugasan ({aiGeneratedTasks.length})
                                        </label>
                                        <div className="flex items-center gap-2">
                                             <label className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">Tarikh Seragam:</label>
                                             <Input type="date" className="h-8 text-xs py-0 w-36 rounded-xl" value={aiDueDate} onChange={e => setAiDueDate(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {aiGeneratedTasks.map((task, idx) => (
                                            <div key={idx} className="p-5 border border-border bg-card rounded-3xl shadow-sm hover:border-primary/30 transition-colors">
                                                <Input 
                                                    value={task.title} 
                                                    onChange={e => updateAiTask(idx, 'title', e.target.value)}
                                                    className="font-black text-sm h-10 border-transparent shadow-none px-1 bg-transparent hover:border-border mb-2"
                                                />
                                                <Textarea
                                                    value={task.description}
                                                    onChange={e => updateAiTask(idx, 'description', e.target.value)}
                                                    className="min-h-[60px] text-xs resize-none border-transparent hover:border-border bg-muted/20 px-3 py-2"
                                                />
                                                <div className="flex items-center gap-2 mt-4">
                                                    <Select value={task.assigned_to} onValueChange={(val) => updateAiTask(idx, 'assigned_to', val)}>
                                                        <SelectTrigger className="flex-1 h-9 bg-primary/5 border-primary/20 rounded-xl">
                                                            <SelectValue placeholder="Pilih Ahli Bertugas..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {members.map(m => (
                                                                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    
                                                    <div className="relative w-28 shrink-0">
                                                        <div className="absolute top-0 bottom-0 left-3 flex items-center text-[9px] font-black text-muted-foreground pointer-events-none uppercase">Pts</div>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            value={task.merit_points}
                                                            onChange={e => updateAiTask(idx, 'merit_points', parseInt(e.target.value) || 0)}
                                                            className="h-9 w-full rounded-xl pl-9 font-bold"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <Button onClick={handleSubmitAiBatch} disabled={loading} className="w-full h-14 mt-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20">
                                        {loading ? <Loader2 className="animate-spin" /> : 'Sahkan & Hantar Secara Pukal'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // MOD MANUAL LAMA
                        <form onSubmit={handleSubmitManual} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase opacity-50">Tajuk Tugasan</label>
                                <Input required placeholder="Contoh: Sediakan Kertas Kerja" className="rounded-2xl h-12" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase opacity-50">Tugaskan Kepada</label>
                                <Select onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}>
                                    <SelectTrigger className="rounded-2xl h-12 border-border/70 bg-card">
                                        <SelectValue placeholder="Pilih Ahli" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {members.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-50">Tarikh Akhir (Deadline)</label>
                                    <Input required type="date" className="rounded-2xl h-12" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase opacity-50">Kredit Merit (Ganjaran)</label>
                                    <Input type="number" min="0" max="100" placeholder="0" className="rounded-2xl h-12" value={formData.merit_points || ''} onChange={(e) => setFormData({ ...formData, merit_points: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase opacity-50">Penerangan Tugasan</label>
                                <Textarea placeholder="Terangkan detail tugasan di sini..." className="rounded-2xl resize-none min-h-[80px]" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>

                            <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-black uppercase tracking-widest shadow-xl shadow-primary/10 mt-6">
                                {loading ? <Loader2 className="animate-spin" /> : 'Hantar Untuk Diproses'}
                            </Button>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}