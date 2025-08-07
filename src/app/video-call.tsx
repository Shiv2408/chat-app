'use client'

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface VideoCallProps {
  currentUser: User;
  remoteUser: { id: string; username: string; first_name?: string; last_name?: string };
  conversationId: number;
  onEndCall: () => void;
  isCaller: boolean;
  initialOffer?: RTCSessionDescriptionInit | null;
  callType: 'video' | 'audio';
}

export default function VideoCall({ currentUser, remoteUser, conversationId, onEndCall, isCaller, initialOffer, callType }: VideoCallProps) {
  const supabase = createClient();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState('Initializing...');
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const channel = supabase.channel(`signaling_${conversationId}`);

    const setupPeerConnection = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          channel.send({
            type: 'broadcast',
            event: 'ice-candidate',
            payload: { candidate: event.candidate, to: remoteUser.id },
          });
        }
      };
    };

    const startCallAsCaller = async () => {
      setCallStatus(callType === 'video' ? 'Video Calling...' : 'Audio Calling...');
      await setupPeerConnection();
      const pc = peerConnectionRef.current;
      if (!pc) return;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channel.send({
        type: 'broadcast',
        event: 'offer',
        payload: { offer, to: remoteUser.id, callType },
      });
    };

    const startCallAsReceiver = async (offer: RTCSessionDescriptionInit) => {
      setCallStatus('Connecting...');
      await setupPeerConnection();
      const pc = peerConnectionRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      channel.send({
        type: 'broadcast',
        event: 'answer',
        payload: { answer, to: remoteUser.id },
      });
      setCallStatus('Call in progress...');
    };

    channel.on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
      if (payload.to === currentUser.id && payload.candidate) {
        peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    channel.on('broadcast', { event: 'answer' }, ({ payload }) => {
      if (payload.to === currentUser.id) {
        peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(payload.answer));
        setCallStatus('Call in progress...');
      }
    });

    channel.on('broadcast', { event: 'end-call' }, () => {
      handleEndCall();
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        if (isCaller) {
          startCallAsCaller();
        } else if (initialOffer) {
          startCallAsReceiver(initialOffer);
        }
      }
    });

    const handleEndCall = () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      onEndCall();
    };

    return () => {
      channel.send({ type: 'broadcast', event: 'end-call', payload: { to: remoteUser.id } });
      handleEndCall();
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUser.id, remoteUser.id, supabase, onEndCall, isCaller, initialOffer, callType]);

  const toggleMute = () => {
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
            setIsMuted(!track.enabled);
        });
    }
  };

  const handleEndCallClick = () => {
    const channel = supabase.channel(`signaling_${conversationId}`);
    channel.send({ type: 'broadcast', event: 'end-call', payload: { to: remoteUser.id } });
    onEndCall();
  };

  if (callType === 'audio') {
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-95 flex flex-col items-center justify-center z-50 text-white">
          <div className="flex flex-col items-center justify-center flex-grow">
              <div className="w-40 h-40 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-6xl mb-6">
                  {remoteUser.first_name?.[0]}{remoteUser.last_name?.[0]}
              </div>
              <h2 className="text-3xl font-bold">{remoteUser.first_name} {remoteUser.last_name}</h2>
              <p className="text-lg text-gray-300 mt-2">{callStatus}</p>
              <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
          </div>
          <div className="absolute bottom-10 flex items-center gap-6">
              <button onClick={toggleMute} className="bg-white/20 rounded-full p-4">
                  {isMuted ? 'Unmute' : 'Mute'}
              </button>
              <button onClick={handleEndCallClick} className="bg-red-500 rounded-full p-4">
                  End Call
              </button>
          </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="relative w-full h-full">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-1/4 h-1/4 object-cover border-2 border-white rounded-lg" />
      </div>
      <div className="absolute bottom-10 flex items-center gap-6">
          <button onClick={toggleMute} className="bg-white/20 text-white rounded-full p-4">
              {isMuted ? 'Unmute' : 'Mute'}
          </button>
          <button onClick={handleEndCallClick} className="bg-red-500 text-white rounded-full p-4">
              End Call
          </button>
      </div>
    </div>
  );
}