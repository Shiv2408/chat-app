'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import UserProfileSection from './user-profile-section';

type Profile = {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
};

export default function UserList({
  profiles,
  onSelectUser,
  session,
  onCloseSidebar,
}: {
  profiles: Profile[];
  onSelectUser: (user: Profile) => void;
  session: Session;
  onCloseSidebar?: () => void;
}) {
  const supabase = createClient();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      router.refresh();
    }
  };

  useEffect(() => {
    const channel = supabase.channel('online_users', {
      config: {
        presence: {
          key: session.user.id,
        },
      },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const userIds = Object.keys(channel.presenceState()).map((key) => key);
      setOnlineUsers(userIds);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });
      }
    });

    return () => {
      channel.unsubscribe();
    };
  }, [session.user.id, supabase]);

  const handleUserSelect = (profile: Profile) => {
    setSelectedUserId(profile.id);
    onSelectUser(profile);
  };

  const filteredProfiles = profiles.filter(profile => 
  profile.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  profile.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  profile.username?.toLowerCase().includes(searchQuery.toLowerCase())
);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800">Contacts</h2>
              <p className="text-xs sm:text-sm text-gray-500">{profiles.length} people</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl transition-all duration-200 group"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
            
            {/* Close button for mobile */}
            {onCloseSidebar && (
              <button
                onClick={onCloseSidebar}
                className="lg:hidden p-2 hover:bg-white/50 rounded-xl transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-3 bg-white/50 border border-white/30 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="space-y-1 sm:space-y-2">
          {filteredProfiles.map((profile) => {
            const isOnline = onlineUsers.includes(profile.id);
            const isSelected = selectedUserId === profile.id;
            
            return (
              <div
                key={profile.id}
                onClick={() => handleUserSelect(profile)}
                className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-200 group ${
                  isSelected 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-[1.02]' 
                    : 'hover:bg-white/60 hover:shadow-md hover:transform hover:scale-[1.01]'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-bold text-sm sm:text-lg transition-all duration-200 ${
                      isSelected 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-600 group-hover:from-indigo-200 group-hover:to-purple-200'
                    }`}>
                      {profile.first_name?.[0]}{profile.last_name?.[0]}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 transition-all duration-200 ${
                        isSelected ? 'border-white' : 'border-white'
                      } ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate transition-colors duration-200 text-sm sm:text-base ${
                      isSelected ? 'text-white' : 'text-gray-800 group-hover:text-gray-900'
                    }`}>
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className={`text-xs sm:text-sm truncate transition-colors duration-200 ${
                      isSelected ? 'text-white/80' : 'text-gray-500 group-hover:text-gray-600'
                    }`}>
                      @{profile.username}
                    </p>
                  </div>
                  
                  <div className={`flex items-center gap-1 text-xs font-medium transition-colors duration-200 ${
                    isSelected ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-500'
                  }`}>
                    <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredProfiles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No contacts found</p>
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className="border-t border-white/20 p-3 sm:p-4">
        <UserProfileSection session={session} />
      </div>
    </div>
  );
}
