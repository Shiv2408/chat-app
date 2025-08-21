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
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    let collaborativeChannel: RealtimeChannel;

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

      // Setup a single channel for the collaborative space
      collaborativeChannel = supabase.channel('collaborative-space', {
        config: {
          presence: { key: currentUser.id },
        },
      });

      // Subscribe to presence
      collaborativeChannel.on('presence', { event: 'sync' }, () => {
        const newState = collaborativeChannel.presenceState<Presence>();
        const users: { [key: string]: Presence } = {};
        for (const id in newState) {
          users[id] = newState[id][0];
        }
        setOnlineUsers(users);
      });

      // Listen for cursor position broadcasts
      collaborativeChannel.on('broadcast', { event: 'cursor-pos' }, ({ payload }) => {
        setOnlineUsers(prev => ({ ...prev, [payload.id]: { ...prev[payload.id], ...payload } }));
      });

      // Listen for note update broadcasts
      collaborativeChannel.on('broadcast', { event: 'note-update' }, ({ payload }) => {
        setNotes(currentNotes =>
          currentNotes.map(note =>
            note.id === payload.id ? { ...note, content: payload.content } : note
          )
        );
      });

      // Subscribe to database changes for notes as a fallback and for initial state consistency
      collaborativeChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
        setNotes(currentNotes => {
          if (payload.eventType === 'INSERT') {
            if (currentNotes.some(n => n.id === payload.new.id)) return currentNotes;
            return [...currentNotes, payload.new as NoteType];
          }
          if (payload.eventType === 'UPDATE') {
            return currentNotes.map(note => (note.id === payload.new.id ? (payload.new as NoteType) : note));
          }
          if (payload.eventType === 'DELETE') {
            return currentNotes.filter(note => note.id !== (payload.old as NoteType).id);
          }
          return currentNotes;
        });
      });

      collaborativeChannel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await collaborativeChannel.track(currentUser);
        }
      });

      setChannel(collaborativeChannel);
    };

    setupAsync();

    return () => {
      if (collaborativeChannel) {
        supabase.removeChannel(collaborativeChannel);
      }
    };
  }, [supabase]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (user && channel) {
      channel.send({
        type: 'broadcast',
        event: 'cursor-pos',
        payload: { id: user.id, x: e.clientX, y: e.clientY },
      });
    }
  }, [user, channel]);

  const handleCreateNote = useCallback(async () => {
    await supabase.from('notes').insert({ content: 'New Note' });
  }, [supabase]);

  const handleNoteChange = useCallback((id: number, content: string) => {
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'note-update',
        payload: { id, content },
      });
    }
  }, [channel]);

  const handleUpdateNote = useCallback(async (id: number, content: string) => {
    await supabase.from('notes').update({ content }).eq('id', id);
  }, [supabase]);

  return { user, onlineUsers, notes, handleMouseMove, handleCreateNote, handleNoteChange, handleUpdateNote };
};