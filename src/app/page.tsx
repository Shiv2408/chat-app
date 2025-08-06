import { createClient } from '@/lib/supabase/server';
import AuthForm from './auth-form';
import ChatPage from './chat-page';
import CompleteProfileForm from './complete-profile-form';

export default async function Home() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Welcome to ChatFlow
            </h1>
            <p className="text-gray-600">Connect and chat with people around the world</p>
          </div>
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
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
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
