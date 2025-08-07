'use client'

import { useEffect, useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import VideoCall from './video-call'; // Import the new component

type Profile = { id: string; username: string; first_name: string; last_name: string };
type Message = { id: number; content: string; user_id: string; created_at: string; is_image: boolean };

export default function ConversationView({
  selectedUser,
  conversationId,
  currentUser,
}: {
  selectedUser: Profile;
  conversationId: number;
  currentUser: User;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [inCall, setInCall] = useState(false); // State to manage the call
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();

    const channel = supabase
      .channel(`conversation_${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((currentMessages) => [...currentMessages, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, supabase]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '') return;
    const { data } = await supabase.functions.invoke('moderate-message', { body: { content: newMessage.trim() } });
    await supabase.from('messages').insert({ content: data.moderated_content, user_id: currentUser.id, conversation_id: conversationId, is_image: false });
    setNewMessage('');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    const fileName = `${currentUser.id}/${Date.now()}_${file.name}`;
    setUploading(true);
    const { data: uploadData, error: uploadError } = await supabase.storage.from('chat-images').upload(fileName, file);
    if (uploadError) { console.error('Error uploading image:', uploadError); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(uploadData.path);
    await supabase.from('messages').insert({ content: urlData.publicUrl, user_id: currentUser.id, conversation_id: conversationId, is_image: true });
    setUploading(false);
  };

  const renderMessageContent = (message: Message) => {
    if (message.is_image) {
      return <img src={message.content} alt="Chat image" className="max-w-xs max-h-64 rounded-lg object-cover cursor-pointer" />;
    }
    return message.content;
  };

  return (
    <>
      {inCall && (
        <VideoCall
          currentUser={currentUser}
          remoteUser={{ id: selectedUser.id, username: selectedUser.username }}
          conversationId={conversationId}
          onEndCall={() => setInCall(false)}
        />
      )}
      <div className="flex flex-col h-full bg-gray-50">
        <div className="p-4 border-b bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center text-white font-bold text-xl">
              {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{selectedUser.first_name} {selectedUser.last_name}</h2>
              <p className="text-sm text-gray-500">@{selectedUser.username}</p>
            </div>
          </div>
          <button onClick={() => setInCall(true)} className="p-2 text-gray-500 hover:text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          </button>
        </div>
        <div className="flex-grow p-4 space-y-4 overflow-y-auto">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-2 ${msg.user_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-2xl max-w-md ${msg.user_id === currentUser.id ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}`}>
                {renderMessageContent(msg)}
              </div>
            </div>
          ))}
          {uploading && <div className="text-center text-gray-500">Uploading...</div>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-white flex items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-500" disabled={uploading}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
          </button>
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} className="flex-grow p-2 border-none rounded-lg bg-gray-100 focus:ring-2 focus:ring-blue-500" placeholder="Type a message..." />
          <button type="submit" className="p-2 text-blue-500 hover:text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </form>
      </div>
    </>
  );
}