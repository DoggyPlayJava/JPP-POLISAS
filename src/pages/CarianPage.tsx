import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Flag, FileText, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { ALL_CLUBS } from '@/types';

import { useAuth } from '@/contexts/AuthContext';

export function CarianPage() {
  const { selectedClubId, isSuperAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  // Tapis kelab dari data statik
  const foundClubs = ALL_CLUBS.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) || 
    c.shortName.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      
      // Escape wildcard characters to prevent injection
      const safeQuery = query.replace(/[%_]/g, '\\$&');
      
      // Cari Aktiviti (Guna 'ilike' supaya tak kisah huruf besar/kecil)
      let actsQuery = supabase
        .from('club_activities')
        .select('id, title, status')
        .ilike('title', `%${safeQuery}%`)
        .limit(10);

      // Cari Laporan/Dokumen
      let docsQuery = supabase
        .from('club_reports')
        .select('id, file_name, report_type')
        .ilike('file_name', `%${safeQuery}%`)
        .limit(10);

      // Skop kelab sekiranya bukan Admin JPP
      if (!isSuperAdmin && selectedClubId) {
        actsQuery = actsQuery.eq('club_id', selectedClubId);
        docsQuery = docsQuery.eq('club_id', selectedClubId);
      }

      const [{ data: acts }, { data: docs }] = await Promise.all([actsQuery, docsQuery]);

      setActivities(acts || []);
      setReports(docs || []);
      setLoading(false);
    };

    performSearch();
  }, [query]);

  const totalResults = foundClubs.length + activities.length + reports.length;

  return (
    <div className="page-container space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tighter">Hasil Carian</h1>
        <p className="text-muted-foreground font-medium">
          Menjumpai <span className="text-primary font-black">{totalResults}</span> padanan untuk "<span className="text-accent font-bold">{query}</span>"
        </p>
      </div>

      {loading ? (
        <div className="p-20 text-center font-black animate-pulse opacity-50 uppercase tracking-widest">Sedang Mencari...</div>
      ) : totalResults === 0 ? (
        <div className="p-20 text-center flex flex-col items-center opacity-50">
          <Search className="w-16 h-16 mb-4" />
          <h2 className="text-2xl font-black">Tiada Rekod Dijumpai</h2>
          <p>Cuba gunakan kata kunci yang lebih ringkas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* KOLUM 1: KELAB */}
          <div className="space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2 border-b pb-2"><Flag className="w-5 h-5 text-primary"/> Kelab ({foundClubs.length})</h2>
            {foundClubs.map(c => (
              <Card key={c.id} className="cursor-pointer hover:border-primary transition-all" onClick={() => navigate(`/kelab/${c.id}`)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg text-white flex items-center justify-center font-black" style={{backgroundColor: c.color}}>{c.shortName.slice(0,2)}</div>
                  <div>
                    <p className="font-bold text-sm">{c.name}</p>
                    <Badge className="text-[8px] border-none mt-1">{c.category}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* KOLUM 2: AKTIVITI */}
          <div className="space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2 border-b pb-2"><Activity className="w-5 h-5 text-emerald-500"/> Aktiviti ({activities.length})</h2>
            {activities.map(a => (
              <Card key={a.id} className="cursor-pointer hover:border-emerald-500 transition-all" onClick={() => navigate('/aktiviti')}>
                <CardContent className="p-4">
                  <p className="font-bold text-sm truncate">{a.title}</p>
                  <Badge className="text-[8px] border-none bg-emerald-100 text-emerald-700 mt-2">{a.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* KOLUM 3: DOKUMEN */}
          <div className="space-y-4">
            <h2 className="text-lg font-black flex items-center gap-2 border-b pb-2"><FileText className="w-5 h-5 text-blue-500"/> Dokumen ({reports.length})</h2>
            {reports.map(r => (
              <Card key={r.id} className="cursor-pointer hover:border-blue-500 transition-all" onClick={() => navigate('/semakan-laporan')}>
                <CardContent className="p-4">
                  <p className="font-bold text-sm truncate">{r.file_name}</p>
                  <Badge className="text-[8px] border-none bg-blue-100 text-blue-700 mt-2">{r.report_type}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>

        </div>
      )}
    </div>
  );
}