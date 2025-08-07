'use client'

import { useEffect, useState, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import VideoCall from './video-call';

type Profile = { id: string; username: string; first_name: string; last_name: string };
type Message = { id: number; content: string; user_id: string; created_at: string; is_image: boolean };

export default function ConversationView({
  selectedUser,
  conversationId,
  currentUser,
  onOpenSidebar,
}: {
  selectedUser: Profile;
  conversationId: number;
  currentUser: User;
  onOpenSidebar?: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inCall, setInCall] = useState(false);
  const [isCaller, setIsCaller] = useState(false);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  const [incomingOffer, setIncomingOffer] = useState<{ sdp: RTCSessionDescriptionInit; type: 'video' | 'audio' } | null>(null);
  const router = useRouter();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      router.refresh();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const signalingChannel = supabase.channel(`signaling_${conversationId}`);

    signalingChannel.on('broadcast', { event: 'offer' }, ({ payload }) => {
      if (payload.to === currentUser.id) {
        setIncomingOffer({ sdp: payload.offer, type: payload.callType || 'video' });
      }
    });

    signalingChannel.subscribe();

    return () => {
      supabase.removeChannel(signalingChannel);
    };
  }, [conversationId, currentUser.id, supabase]);

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
      return (
        <img
          src={message.content || "/placeholder.svg"}
          alt="Chat image"
          className="max-w-xs max-h-48 sm:max-h-64 rounded-xl sm:rounded-2xl object-cover cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-200"
        />
      );
    }
    return message.content;
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const startCall = (type: 'video' | 'audio') => {
    setCallType(type);
    setIsCaller(true);
    setInCall(true);
  };

  const acceptCall = () => {
    if (incomingOffer) {
      setCallType(incomingOffer.type);
      setIsCaller(false);
      setInCall(true);
    }
  };

  const declineCall = () => {
    setIncomingOffer(null);
  };

  return (
    <>
      {inCall && (
        <VideoCall
          currentUser={currentUser}
          remoteUser={{ id: selectedUser.id, username: selectedUser.username, first_name: selectedUser.first_name, last_name: selectedUser.last_name }}
          conversationId={conversationId}
          onEndCall={() => {
            setInCall(false);
            setIncomingOffer(null);
          }}
          isCaller={isCaller}
          initialOffer={incomingOffer?.sdp || null}
          callType={callType}
        />
      )}

      {incomingOffer && !inCall && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl text-center">
            <h3 className="text-xl font-bold mb-4">Incoming {incomingOffer.type} call from {selectedUser.first_name}</h3>
            <div className="flex gap-4 justify-center">
              <button onClick={acceptCall} className="bg-green-500 text-white px-6 py-2 rounded-lg">Accept</button>
              <button onClick={declineCall} className="bg-red-500 text-white px-6 py-2 rounded-lg">Decline</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="backdrop-blur-sm bg-white/70 border-b border-white/20 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile Menu Button */}
            {onOpenSidebar && (
              <button
                onClick={onOpenSidebar}
                className="lg:hidden p-2 hover:bg-white/50 rounded-xl transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-sm sm:text-lg">
                {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 bg-green-500 rounded-full border-2 border-white" />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-800 truncate">{selectedUser.first_name} {selectedUser.last_name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">@{selectedUser.username} • Online</p>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => startCall('audio')}
                title="Start Audio Call"
                className="p-2 hover:bg-white/50 rounded-xl transition-all duration-200 text-gray-500 hover:text-blue-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
              </button>
              <button
                onClick={() => startCall('video')}
                title="Start Video Call"
                className="p-2 hover:bg-white/50 rounded-xl transition-all duration-200 text-gray-500 hover:text-blue-500"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
              </button>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-50 text-gray-500 hover:text-red-600 rounded-xl transition-all duration-200"
                title="Sign out"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          {messages.map((msg, index) => {
            const isCurrentUser = msg.user_id === currentUser.id;
            const showAvatar = index === 0 || messages[index - 1].user_id !== msg.user_id;

            return (
              <div key={msg.id} className={`flex items-end gap-2 sm:gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                {!isCurrentUser && (
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-semibold text-xs sm:text-sm flex-shrink-0 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                    {selectedUser.first_name?.[0]}
                  </div>
                )}

                <div className={`group max-w-xs sm:max-w-md ${isCurrentUser ? 'order-1' : ''}`}>
                  <div className={`px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-sm transition-all duration-200 group-hover:shadow-md ${isCurrentUser
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
                    }`}>
                    <div className="text-sm sm:text-base">
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                  <div className={`text-xs text-gray-400 mt-1 px-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                    {formatTime(msg.created_at)}
                  </div>
                </div>
              </div>
            );
          })}

          {uploading && (
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 py-2 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl rounded-br-md shadow-sm">
                <div className="flex items-center gap-2 text-sm sm:text-base">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading image...
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="backdrop-blur-sm bg-white/70 border-t border-white/20 p-3 sm:p-6">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2 sm:gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 sm:p-3 text-gray-500 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all duration-200 disabled:opacity-50 flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>

            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-white/80 border border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 pr-10 sm:pr-12 text-sm sm:text-base"
                placeholder="Type your message..."
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 p-1.5 sm:p-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}