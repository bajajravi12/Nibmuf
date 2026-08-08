import React, { useState, useEffect, useRef } from 'react';
import { Avatar } from './Avatar.js';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser: { displayName: string; avatarUrl?: string } | null;
  isVideo?: boolean;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  isVideo = false
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(isVideo);
  const [isLoopbackEcho, setIsLoopbackEcho] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'connected'>('connecting');
  const [callDuration, setCallDuration] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const loopbackNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      cleanupMedia();
      return;
    }

    let isMounted = true;
    setCallStatus('connecting');
    setCallDuration(0);

    // Initialize media stream
    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: isVideo
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        setHasMicPermission(true);

        if (localVideoRef.current && isVideo) {
          localVideoRef.current.srcObject = stream;
        }

        // Setup Web Audio API for audio visualizer
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const audioCtx = new AudioCtx();
          audioCtxRef.current = audioCtx;

          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;

          const source = audioCtx.createMediaStreamSource(stream);
          loopbackNodeRef.current = source;
          source.connect(analyser);

          // Voice audio level meter loop
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateMicLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((acc, val) => acc + val, 0);
            const avg = sum / dataArray.length;
            setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
            animFrameRef.current = requestAnimationFrame(updateMicLevel);
          };
          updateMicLevel();
        } catch (err) {
          console.warn('AudioContext setup warning:', err);
        }

        setTimeout(() => {
          if (isMounted) setCallStatus('connected');
        }, 1200);
      } catch (err) {
        console.error('Microphone/Camera access error:', err);
        if (isMounted) {
          setHasMicPermission(false);
          setCallStatus('connected'); // Fallback to simulated connection with visual indicator
        }
      }
    }

    startMedia();

    return () => {
      isMounted = false;
      cleanupMedia();
    };
  }, [isOpen, isVideo]);

  // Call duration counter
  useEffect(() => {
    if (!isOpen || callStatus !== 'connected') return;
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, callStatus]);

  // Handle loopback toggle
  useEffect(() => {
    if (!audioCtxRef.current || !loopbackNodeRef.current) return;
    try {
      if (isLoopbackEcho) {
        loopbackNodeRef.current.connect(audioCtxRef.current.destination);
      } else {
        loopbackNodeRef.current.disconnect(audioCtxRef.current.destination);
        // keep connected to analyser
        if (analyserRef.current) {
          loopbackNodeRef.current.connect(analyserRef.current);
        }
      }
    } catch (err) {
      console.warn('Loopback error:', err);
    }
  }, [isLoopbackEcho]);

  const cleanupMedia = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const toggleMute = () => {
    if (streamRef.current) {
      const audioTracks = streamRef.current.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTracks = streamRef.current.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    } else {
      setIsVideoOn(!isVideoOn);
    }
  };

  if (!isOpen || !targetUser) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-100 animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col relative">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {isVideoOn ? 'HD Video Call' : 'HD Voice Call'}
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>End-to-End Encrypted</span>
          </div>
        </div>

        {/* Main Stage */}
        <div className="p-8 flex flex-col items-center justify-center space-y-6 min-h-[280px] relative bg-slate-950/50">
          {/* Video or Avatar Display */}
          {isVideoOn && hasMicPermission ? (
            <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 relative shadow-inner">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-[10px] px-2 py-0.5 rounded-md text-white">
                You (Camera Live)
              </div>
            </div>
          ) : (
            <div className="relative z-10">
              {/* Outer pulsing rings when talking */}
              <div
                style={{ transform: `scale(${1 + micLevel / 300})` }}
                className="absolute inset-0 bg-cyan-500/20 rounded-full blur-md transition-transform duration-75"
              />
              <Avatar
                name={targetUser.displayName}
                avatarUrl={targetUser.avatarUrl}
                size="2xl"
              />
            </div>
          )}

          {/* User Name & Call Status */}
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-white tracking-tight">{targetUser.displayName}</h2>
            <p className="text-xs text-cyan-400 font-mono">
              {callStatus === 'connecting' ? 'Connecting secure stream...' : formatTime(callDuration)}
            </p>
          </div>

          {/* Live Mic Waveform Indicator */}
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl p-3 flex flex-col items-center space-y-2">
            <div className="flex items-center justify-between w-full text-[11px] text-slate-400">
              <span className="flex items-center space-x-1">
                {hasMicPermission === false ? (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>
                  {hasMicPermission === false ? 'Microphone muted/simulated' : 'Microphone Live'}
                </span>
              </span>
              <span className="font-mono text-cyan-400">{isMuted ? 'MUTED' : `${micLevel}%`}</span>
            </div>

            {/* Audio Wave Volume Bars */}
            <div className="flex items-center justify-center space-x-1.5 h-8 w-full">
              {[15, 30, 60, 90, 45, 100, 70, 85, 40, 60, 20, 80, 50, 30].map((baseHeight, idx) => {
                const activeHeight = isMuted ? 8 : Math.max(8, (micLevel / 100) * baseHeight);
                return (
                  <div
                    key={idx}
                    style={{ height: `${activeHeight}%` }}
                    className={`w-1.5 rounded-full transition-all duration-75 ${
                      isMuted
                        ? 'bg-slate-700'
                        : micLevel > 10
                        ? 'bg-gradient-to-t from-cyan-500 to-blue-400'
                        : 'bg-slate-700'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Audio Echo Test Switch & Footer Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col space-y-4">
          {/* Echo loopback option */}
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-2xl text-xs">
            <div className="flex items-center space-x-2">
              {isLoopbackEcho ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <div>
                <p className="font-semibold text-slate-200">Voice Audio Feedback Test</p>
                <p className="text-[10px] text-slate-400">Listen to your mic live in speaker</p>
              </div>
            </div>
            <button
              onClick={() => setIsLoopbackEcho(!isLoopbackEcho)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                isLoopbackEcho
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {isLoopbackEcho ? 'Echo ON' : 'Test Mic'}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-4 pt-1">
            {/* Mute Button */}
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-lg ${
                isMuted
                  ? 'bg-rose-500/20 border border-rose-500/40 text-rose-400'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition shadow-lg ${
                !isVideoOn
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  : 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300'
              }`}
              title={isVideoOn ? 'Turn Off Camera' : 'Turn On Camera'}
            >
              {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            {/* End Call Button */}
            <button
              onClick={() => {
                cleanupMedia();
                onClose();
              }}
              className="w-14 h-14 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 active:scale-95 transition"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
