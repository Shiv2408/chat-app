'use client'; 

import CollaborativeSpace from '../components/CollaborativeSpace'; 
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function Workspace() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/');
        }
    };
    checkUser();
  }, [router, supabase]);

  return (
    <div>
      <CollaborativeSpace />
    </div>
  );
}