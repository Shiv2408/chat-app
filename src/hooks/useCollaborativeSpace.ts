'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Define types
interface Presence {
  id: string;
  username: string;
  color: string;
  x: number | null;
  y: number | null;
}

interface NoteType {
  id: number;
  content: string | null;
  created_at: string;
}

const colors = ['#EF4444', '#F97316', '#84CC16', '#10B981', '#06B6D4', '#6366F1', '#EC4899'];
const getRandomColor = (id: string): string => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

export const useCollaborativeSpace = () => {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<Presence | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<{ [key: string]: Presence }>({});
  const [notes, setNotes] = useState<NoteType[]>([]);

  useEffect(() => {
    let presenceChannel: RealtimeChannel;
    let notesChannel: RealtimeChannel;

    const setupAsync = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
      const currentUser: Presence = {
        id: session.user.id,
        username: profile?.username || 'Anonymous',
        color: getRandomColor(session.user.id),
        x: null,
        y: null,
      };
      setUser(currentUser);
      
      const { data: initialNotes } = await supabase.from('notes').select('*');
      if (initialNotes) setNotes(initialNotes);

      // Setup channels
      presenceChannel = supabase.channel('collaborative-space', { config: { presence: { key: currentUser.id } } });
      notesChannel = supabase.channel('notes-db-changes');

      // Subscribe to presence
      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const newState = presenceChannel.presenceState<Presence>();
          const users: { [key: string]: Presence } = {};
          for (const id in newState) users[id] = newState[id][0];
          setOnlineUsers(users);
        })
        .on('broadcast', { event: 'cursor-pos' }, ({ payload }) => {
          setOnlineUsers(prev => ({ ...prev, [payload.id]: { ...prev[payload.id], ...payload } }));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') await presenceChannel.track(currentUser);
        });

      // Subscribe to notes
      notesChannel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
          setNotes(currentNotes => {
            if (payload.eventType === 'INSERT') {
              if (currentNotes.some(n => n.id === payload.new.id)) return currentNotes;
              return [...currentNotes, payload.new as NoteType];
            }
            if (payload.eventType === 'UPDATE') {
              return currentNotes.map(note => note.id === payload.new.id ? (payload.new as NoteType) : note);
            }
            return currentNotes;
          });
        })
        .subscribe();
    };

    setupAsync();

    // The definitive cleanup function
    return () => {
      supabase.removeAllChannels();
    };
  }, [supabase]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (user) {
      const channel = supabase.channel('collaborative-space');
      channel.send({
        type: 'broadcast',
        event: 'cursor-pos',
        payload: { id: user.id, x: e.clientX, y: e.clientY },
      });
    }
  }, [user, supabase]);

  const handleCreateNote = useCallback(async () => {
    await supabase.from('notes').insert({ content: 'New Note' });
  }, [supabase]);

  const handleUpdateNote = useCallback(async (id: number, content: string) => {
    await supabase.from('notes').update({ content }).eq('id', id);
  }, [supabase]);

  return { user, onlineUsers, notes, handleMouseMove, handleCreateNote, handleUpdateNote };
};