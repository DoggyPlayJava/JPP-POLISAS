import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { KeusahawananBusiness, KeusahawananCategory, StudentBusinessMembership } from '@/types';
import toast from 'react-hot-toast';
import { sendNotificationToUser } from '@/lib/notifications';

export function useBusinessData() {
  const { user } = useAuth();
  
  const [categories, setCategories] = useState<KeusahawananCategory[]>([]);
  const [businesses, setBusinesses] = useState<KeusahawananBusiness[]>([]);
  const [myMemberships, setMyMemberships] = useState<StudentBusinessMembership[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);

  const fetchInitialData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Fetch categories
      const { data: cats, error: catError } = await supabase
        .from('keusahawanan_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (catError) throw catError;
      setCategories(cats || []);

      // Fetch active/approved businesses to join
      const { data: bus, error: busError } = await supabase
        .from('keusahawanan_businesses')
        .select(`
          *,
          category:keusahawanan_categories(*),
          owner:profiles!keusahawanan_businesses_owner_id_fkey(id, full_name, avatar_url)
        `)
        .eq('is_active', true)
        .eq('status', 'ACTIVE');
        
      if (busError) throw busError;
      setBusinesses(bus || []);

      // Fetch my memberships (which could be pending/active) + if I created a business that is pending
      const { data: mems, error: memError } = await supabase
        .from('student_business_memberships')
        .select(`
          *,
          business:keusahawanan_businesses(
            *,
            category:keusahawanan_categories(*)
          )
        `)
        .eq('user_id', user.id);
        
      if (memError) throw memError;
      setMyMemberships(mems || []);

    } catch (err: any) {
      console.error('Bror fetching business data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Method to create a business
  const createBusiness = async (name: string, description: string, categoryId: string) => {
    if (!user) return { error: 'Tiada sesi' };
    try {
      // 1. Insert business
      const { data: businessInfo, error: businessError } = await supabase
        .from('keusahawanan_businesses')
        .insert([{
          name,
          description,
          category_id: categoryId,
          owner_id: user.id,
          status: 'PENDING_INTERVIEW'
        }])
        .select()
        .single();
        
      if (businessError) throw businessError;

      // 2. Insert Membership as OWNER
      const { error: memError } = await supabase
        .from('student_business_memberships')
        .insert([{
          user_id: user.id,
          business_id: businessInfo.id,
          role: 'OWNER',
          status: 'PENDING'
        }]);
        
      if (memError) throw memError;

      // 3. Trigger Notification (In-App + Push)
      try {
        await sendNotificationToUser(user.id, {
          title: 'Permohonan Perniagaan Dihantar',
          message: 'Permohonan untuk menubuhkan perniagaan anda telah direkodkan. Sistem / pentadbir akan menetapkan tarikh temuduga.',
          type: 'SYSTEM',
          module: 'KEUSAHAWANAN',
          link: '/keusahawanan',
        });
      } catch {}

      await fetchInitialData();
      return { success: true };
    } catch (err: any) {
      console.error('Error creating business:', err);
      return { error: err.message };
    }
  };

  // Method to join an existing business or appeal
  const joinBusiness = async (businessId: string) => {
    if (!user) return;
    try {
      const existing = myMemberships.find(m => m.business_id === businessId);

      if (existing) {
        if (existing.status === 'REJECTED') {
          // Appeal / Update existing row
          const { error: updErr } = await supabase.from('student_business_memberships')
            .update({ status: 'PENDING' })
            .eq('id', existing.id);
          
          if (updErr) throw updErr;

          // Fetch student phone number & business owner
          const [profileRes, businessRes] = await Promise.all([
             supabase.from('profiles').select('full_name, phone_number').eq('id', user.id).single(),
             supabase.from('keusahawanan_businesses').select('owner_id, name').eq('id', businessId).single()
          ]);

          if (businessRes.data && profileRes.data) {
             const phoneInfo = profileRes.data.phone_number ? `No Tel: ${profileRes.data.phone_number}` : 'Tiada No Tel didaftarkan.';
             try {
               await sendNotificationToUser(businessRes.data.owner_id, {
                 title: 'Rayuan Semula (Appeal)',
                 message: `Pelajar ${profileRes.data.full_name} membuat rayuan semula untuk menyertai ${businessRes.data.name}. Sila semak di menu Urus Perniagaan. ${phoneInfo}`,
                 type: 'SYSTEM',
                 module: 'KEUSAHAWANAN',
                 link: '/keusahawanan',
               });
             } catch {}
          }

          toast.success('Rayuan telah dihantar. Pemilik perniagaan telah dimaklumkan.');
          await fetchInitialData();
          return;
        } else {
          throw new Error('Anda sudah mempunyai rekod permohonan untuk perniagaan ini.');
        }
      }

      // New insert
      const { error } = await supabase
        .from('student_business_memberships')
        .insert([{
          user_id: user.id,
          business_id: businessId,
          role: 'MEMBER',
          status: 'PENDING'
        }]);

      if (error) {
        if (error.code === '23505') {
           throw new Error('Anda sudah membuat permohonan untuk perniagaan ini.');
        }
        throw error;
      };

      // Notify Business Owner
      try {
        const [profRes, busRes] = await Promise.all([
          supabase.from('profiles').select('full_name, phone_number').eq('id', user.id).single(),
          supabase.from('keusahawanan_businesses').select('owner_id, name').eq('id', businessId).single()
        ]);
        
        if (busRes.data && profRes.data) {
           const phoneInfo = profRes.data.phone_number ? `No Tel: ${profRes.data.phone_number}` : 'Tiada No Tel didaftarkan.';
           await sendNotificationToUser(busRes.data.owner_id, {
             title: 'Permohonan Keahlian Baharu',
             message: `Pelajar ${profRes.data.full_name} memohon untuk menyertai ${busRes.data.name}. Sila semak di menu Urus Perniagaan. ${phoneInfo}`,
             type: 'INFO',
             module: 'KEUSAHAWANAN',
             link: '/keusahawanan/admin'
           });
        }
      } catch (err) {
        console.error('Failed to notify owner:', err);
      }

      toast.success('Permohonan menyertai perniagaan telah dihantar.');
      await fetchInitialData();
    } catch (err: any) {
      console.error('Error joining business:', err);
      toast.error(err.message || 'Gagal menghantar permohonan.');
    }
  };

  return {
    categories,
    businesses,
    myMemberships,
    isLoading,
    refresh: fetchInitialData,
    refreshBusinesses: fetchInitialData,
    createBusiness,
    joinBusiness,
  };
}

