'use client'

import { useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import UserList from './user-list';
import ConversationView from './conversation-view';

type Profile = { id: string; username: string; first_name: string; last_name: string };

export default function ChatPage({ profiles, session }: { profiles: Profile[]; session: Session }) {
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const supabase = createClient();
  const currentUser = session.user;

  const handleSelectUser = async (user: Profile) => {
    setSelectedUser(user);
    setConversationId(null);
    const { data, error } = await supabase.rpc('get_or_create_conversation', { user_1_id: currentUser.id, user_2_id: user.id });
    if (error) { console.error('Error getting or creating conversation:', error); return; }
    setConversationId(data);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <div className="w-80 backdrop-blur-sm bg-white/70 border-r border-white/20 shadow-xl">
        <UserList profiles={profiles} onSelectUser={handleSelectUser} session={session} />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser && conversationId ? (
          <ConversationView 
            key={conversationId} 
            selectedUser={selectedUser} 
            conversationId={conversationId} 
            currentUser={currentUser} 
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full mb-6">
                <svg className="w-12 h-12 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Start a Conversation</h3>
              <p className="text-gray-500 max-w-sm">Select a user from the sidebar to begin chatting and sharing moments together.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
