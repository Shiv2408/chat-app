'use client';

import CollaborativeSpace from '../components/CollaborativeSpace';
import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/navigation';

// This page should be protected, only for logged-in users.
export default function Workspace() {
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login'); // Redirect to login if not authenticated
        }
    };
    checkUser();
  }, [router]);

  return (
    <div>
      <CollaborativeSpace />
    </div>
  );
}
