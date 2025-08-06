'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'

// Define the type for a message
type Message = {
  id: number;
  content: string;
  created_at: string;
  user_id: string;
  is_image: boolean;
};

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export default function ChatRoom({
  serverMessages,
  session,
}: {
  serverMessages: Message[];
  session: Session | null;
}) {
  const [messages, setMessages] = useState(serverMessages);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const user = session?.user;
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const channel = supabase
      .channel('realtime-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((currentMessages) => [...currentMessages, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || newMessage.trim() === '') return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: functionError } = await supabase.functions.invoke('moderate-message', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
        body: { content: newMessage.trim() },
      });

      if (functionError) throw functionError;
      
      const { moderated_content } = data;
      const { error: insertError } = await supabase.from('messages').insert({
        content: moderated_content,
        user_id: user.id,
        is_image: false,
      });

      if (insertError) throw insertError;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error: ' + (error as Error).message);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0 || !user) return;

    const file = event.target.files[0];
    const fileName = `${user.id}/${Date.now()}_${file.name}`;
    setUploading(true);

    const { data: uploadData, error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file);
    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(uploadData.path);
    await supabase.from('messages').insert({
      content: urlData.publicUrl,
      user_id: user.id,
      is_image: true,
    });
    setUploading(false);
  };

  const renderMessage = (message: Message) => {
    const isSystemMessage = message.user_id === SYSTEM_USER_ID;
    const messageClasses = isSystemMessage
      ? "p-2 bg-blue-100 text-blue-800 rounded-md shadow-sm text-center italic"
      : "p-2 bg-white rounded-md shadow-sm";

    return (
      <div key={message.id} className={messageClasses}>
        {message.is_image ? (
          <img src={message.content} alt="Chat image" className="max-w-xs max-h-64 rounded-md object-cover" />
        ) : (
          <p>{message.content}</p>
        )}
        {!isSystemMessage && (
          <p className="text-xs text-gray-500 mt-1">
            User ID: {message.user_id.slice(0, 8)}...
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 border rounded-lg max-w-2xl w-full">
      <div className="space-y-4 h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-md">
        {messages.map(renderMessage)}
        {uploading && <div className="text-center text-gray-500">Uploading image...</div>}
      </div>

      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300" disabled={!user || uploading}>📎</button>
        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-grow p-2 border rounded-md" placeholder="Type your message..." />
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400" disabled={!user || newMessage.trim() === '' || uploading}>Send</button>
      </form>
    </div>
  );
}