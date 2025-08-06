import { createClient } from '@/lib/supabase/server';
import AuthForm from './auth-form';
import ChatPage from './chat-page';
import CompleteProfileForm from './complete-profile-form';

export default async function Home() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <AuthForm />
        </div>
      </main>
    );
  }

  // Check if the user has completed their profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.user.id)
    .single();

  if (!profile || !profile.username) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <CompleteProfileForm session={session} />
      </main>
    );
  }

  // If profile is complete, show the chat page
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', session.user.id);

  return <ChatPage profiles={profiles || []} session={session} />;
}
