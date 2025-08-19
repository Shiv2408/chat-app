'use client'; // Required for Next.js 13+ App Router

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import Cursor from './Cursor';
import { RealtimeChannel } from '@supabase/supabase-js';

// Define the shape of our presence state
interface Presence {
  id: string;
  username: string;
  color: string;
  x: number | null;
  y: number | null;
}

// Helper to get a random color for the cursor
const colors = ['#EF4444', '#F97316', '#84CC16', '#10B981', '#06B6D4', '#6366F1', '#EC4899'];
const getRandomColor = (id: string): string => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};


export default function CollaborativeSpace() {
  const [user, setUser] = useState<Presence | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<{ [key: string]: Presence }>({});
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    // 1. Fetch the current user and their profile
    const setupUser = async (): Promise<Presence | null> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', session.user.id)
          .single();
        
        const currentUser: Presence = {
          id: session.user.id,
          username: profile?.username || 'Anonymous',
          color: getRandomColor(session.user.id),
          x: null,
          y: null,
        };
        setUser(currentUser);
        return currentUser;
      }
      return null;
    };

    const initializeRealtime = async () => {
      const currentUser = await setupUser();
      if (!currentUser) return;

      // 2. Initialize a Supabase Realtime channel
      const channel = supabase.channel('collaborative-space', {
        config: { presence: { key: currentUser.id } },
      });
      channelRef.current = channel;

      // 3. Subscribe to channel events
      channel.on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState<Presence>();
        const users: { [key: string]: Presence } = {};
        for (const id in newState) {
            users[id] = newState[id][0];
        }
        setOnlineUsers(users);
      });

      channel.on('broadcast', { event: 'cursor-pos' }, ({ payload }) => {
        setOnlineUsers(prevUsers => ({
          ...prevUsers,
          [payload.id]: {
            ...prevUsers[payload.id],
            ...payload,
          },
        }));
      });

      // 4. Subscribe to the channel
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // 5. Once subscribed, track the current user's presence
          await channel.track(currentUser);
        }
      });
    };

    initializeRealtime();

    // 6. Cleanup function on component unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  // 7. Handle mouse movement and broadcast cursor position
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (channelRef.current && user) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor-pos',
        payload: { id: user.id, x: e.clientX, y: e.clientY },
      });
    }
  };

  return (
    <div
      className="relative w-full h-screen overflow-hidden bg-gray-100"
      onMouseMove={handleMouseMove}
    >
      <div className="absolute top-4 left-4 p-4 bg-white rounded-lg shadow-md z-10">
        <h1 className="text-2xl font-bold">Collaborative Space</h1>
        <p>Move your cursor to see it on other screens!</p>
        <div className="mt-4">
            <h2 className="font-semibold">Users Online:</h2>
            <ul>
                {Object.values(onlineUsers).map(u => (
                    <li key={u.id} style={{ color: u.color }}>
                        {u.username} {u.id === user?.id ? '(You)' : ''}
                    </li>
                ))}
            </ul>
        </div>
      </div>

      {/* Render cursors for all online users except the current user */}
      {Object.values(onlineUsers)
        .filter(u => u.id !== user?.id)
        .map(({ id, x, y, color, username }) => (
          <Cursor key={id} point={{ x: x!, y: y! }} color={color} name={username} />
        ))}
    </div>
  );
}