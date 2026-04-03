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
import { Plus, Loader2 } from 'lucide-react';

export function AddTaskModal({ onTaskAdded }: { onTaskAdded: () => void }) {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [members, setMembers] = useState<any[]>([]);

    // State Form
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assigned_to: '',
        due_date: '',
        merit_points: 0
    });

    // Ambil senarai ahli kelab sahaja
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
        }
    }, [isOpen, profile?.club_id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.assigned_to) return alert("Sila pilih ahli!");

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

            setIsOpen(false);
            setFormData({ title: '', description: '', assigned_to: '', due_date: '', merit_points: 0 });
            onTaskAdded(); // Refresh dashboard list
        } catch (err) {
            console.error(err);
            alert("Gagal menambah tugasan.");
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
            <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="font-black text-2xl tracking-tighter">Bina Tugasan</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-50">Tajuk Tugasan</label>
                        <Input
                            required
                            placeholder="Contoh: Sediakan Kertas Kerja"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-50">Tugaskan Kepada</label>
                        <Select onValueChange={(val) => setFormData({ ...formData, assigned_to: val })}>
                            <SelectTrigger>
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
                            <Input
                                required
                                type="date"
                                value={formData.due_date}
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase opacity-50">Merit Points (Ganjaran)</label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="0"
                                value={formData.merit_points || ''}
                                onChange={(e) => setFormData({ ...formData, merit_points: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase opacity-50">Penerangan Tugasan</label>
                        <Textarea
                            placeholder="Terangkan detail tugasan di sini..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full rounded-xl font-black uppercase tracking-widest">
                        {loading ? <Loader2 className="animate-spin" /> : 'Hantar untuk Kelulusan'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}