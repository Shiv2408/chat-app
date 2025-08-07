'use client'

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface VideoCallProps {
  currentUser: User;
  remoteUser: { id: string; username: string };
  conversationId: number;
  onEndCall: () => void;
}

export default function VideoCall({ currentUser, remoteUser, conversationId, onEndCall }: VideoCallProps) {
  const supabase = createClient();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [callStatus, setCallStatus] = useState('Calling...');

  useEffect(() => {
    const channel = supabase.channel(`video_call_${conversationId}`);

    const setupPeerConnection = async () => {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });

      peerConnectionRef.current = pc;

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
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

    channel.on('broadcast', { event: 'ice-candidate' }, ({ payload }) => {
      if (payload.to === currentUser.id && payload.candidate) {
        peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    });

    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (payload.to === currentUser.id) {
        await setupPeerConnection();
        await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await peerConnectionRef.current?.createAnswer();
        await peerConnectionRef.current?.setLocalDescription(answer);
        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: { answer, to: remoteUser.id },
        });
        setCallStatus('Call in progress...');
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
        // If this user is the initiator
        if (currentUser.id < remoteUser.id) {
            await setupPeerConnection();
            const offer = await peerConnectionRef.current?.createOffer();
            await peerConnectionRef.current?.setLocalDescription(offer);
            channel.send({
                type: 'broadcast',
                event: 'offer',
                payload: { offer, to: remoteUser.id },
            });
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
      channel.send({ type: 'broadcast', event: 'end-call', payload: {} });
      handleEndCall();
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUser.id, remoteUser.id, supabase, onEndCall]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="relative w-full h-full">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-1/4 h-1/4 object-cover border-2 border-white rounded-lg" />
      </div>
      <div className="absolute bottom-10 flex flex-col items-center">
        <p className="text-white mb-4">{callStatus}</p>
        <button
          onClick={() => {
            const channel = supabase.channel(`video_call_${conversationId}`);
            channel.send({ type: 'broadcast', event: 'end-call', payload: {} });
            onEndCall();
          }}
          className="bg-red-500 text-white rounded-full p-4"
        >
          End Call
        </button>
      </div>
    </div>
  );
}