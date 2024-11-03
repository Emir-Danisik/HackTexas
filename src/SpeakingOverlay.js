import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import MicRecorder from 'mic-recorder-to-mp3';
import { w3cwebsocket as W3CWebSocket } from 'websocket';

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(45, 45, 45, 0.97);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const CircleLarge = styled(motion.div)`
  width: 150px;
  height: 150px;
  border-radius: 50%;
  background: url(${props => props.image}) no-repeat center center;
  background-size: cover;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SpeakingText = styled.p`
  font-family: 'Fraunces', serif;
  color: white;
  font-size: 1.5rem;
  margin: 0;
  opacity: 0.9;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 2rem;
  right: 2rem;
  background: none;
  border: none;
  color: white;
  opacity: 0.6;
  cursor: pointer;
  padding: 8px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;

const Transcript = styled.div`
  width: 40%;
  // max-height: 80px; /* Limit to 3 lines */
  overflow: hidden;
  line-height: 1.75;
  font-size: 18px;
  font-family: 'Fraunces', serif;
  color: white;
  opacity: 0.6;
  margin-top: 1rem;
  text-align: center;
`;

const ToggleButton = styled.button`
  position: absolute;
  top: 2rem;
  left: 2rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  color: white;
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.2s;
  font-family: 'Fraunces', serif;
  font-size: 14px;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const RecordingIndicator = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.isRecording ? '#ff4444' : 'transparent'};
  position: absolute;
  top: 50%;
  right: -20px;
  transform: translateY(-50%);
  transition: background-color 0.2s;
`;

function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

const SpeakingOverlay = ({ onClose, image }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isVadMode, setIsVadMode] = useState(false);
  const [isManualRecording, setIsManualRecording] = useState(false);
  const recorder = useRef(null);
  const client = useRef(null);
  const audioContext = useRef(null);
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    audioContext.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isVadMode) {
      startVoiceConversation();
    }
    
    // Add keyboard event listeners for manual mode
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !isVadMode && !isManualRecording) {
        e.preventDefault();
        startManualRecording();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' && !isVadMode && isManualRecording) {
        e.preventDefault();
        stopManualRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopVoiceConversation();
    };
  }, [isVadMode, isManualRecording]);

  const startVoiceConversation = async () => {
    setIsListening(true);
    console.log('Starting voice conversation...');

    try {
      client.current = new W3CWebSocket('ws://localhost:3001');

      client.current.onopen = () => {
        console.log('WebSocket Client Connected');
        startRecording();
      };

      client.current.onmessage = (message) => {
        console.log('Received:', message.data);
        const data = JSON.parse(message.data);
        
        switch (data.type) {
          case 'response.audio.delta':
            console.log('Received audio delta, length:', data.delta.length);
            handleAudioDelta(data.delta);
            break;
          case 'response.audio_transcript.done':
          case 'response.text.delta':
            setTranscript(prev => data.transcript || data.delta);
            break;
          case 'input_audio_buffer.speech_stopped':
            client.current.send(JSON.stringify({
              type: 'input_audio_buffer.commit'
            }));
            break;
          case 'input_audio_buffer.committed':
            client.current.send(JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
                instructions: 'Please assist the user.'
              }
            }));
            break;
          case 'response.done':
            // Don't stop recording, allow for continuous conversation
            setIsListening(true);
            break;
          case 'error':
            console.error('Server error:', data.error);
            setIsListening(false);
            break;
          default:
            break;
        }
      };

      client.current.onerror = (error) => {
        console.error('WebSocket Error:', error);
        setIsListening(false);
      };
    } catch (error) {
      console.error('Error:', error);
      setIsListening(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 24000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(2048, 1, 1);

      source.connect(processor);
      processor.connect(audioContext.destination);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const audioData = floatTo16BitPCM(inputData);
        
        if (client.current?.readyState === WebSocket.OPEN) {
          client.current.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: btoa(String.fromCharCode.apply(null, new Uint8Array(audioData)))
          }));
        }
      };
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsListening(false);
    }
  };

  const startManualRecording = async () => {
    setIsManualRecording(true);
    try {
      if (!client.current) {
        client.current = new W3CWebSocket('ws://localhost:3001');
        await new Promise((resolve, reject) => {
          client.current.onopen = resolve;
          client.current.onerror = reject;
        });

        // Set up message handling
        client.current.onmessage = (message) => {
          console.log('Received:', message.data);
          const data = JSON.parse(message.data);
          
          switch (data.type) {
            case 'response.audio.delta':
              handleAudioDelta(data.delta);
              break;
            case 'response.audio_transcript.done':
              setTranscript(prev => prev + data.transcript + '\n');
              break;
            case 'response.text.delta':
              setTranscript(prev => prev + data.delta);
              break;
            case 'error':
              console.error('Server error:', data.error);
              setIsManualRecording(false);
              break;
            default:
              break;
          }
        };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext({ sampleRate: 24000 });
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(2048, 1, 1);

      source.connect(processor);
      processor.connect(context.destination);

      processor.onaudioprocess = (e) => {
        if (!isManualRecording) return;
        
        const inputData = e.inputBuffer.getChannelData(0);
        const audioData = floatTo16BitPCM(inputData);
        
        if (client.current?.readyState === WebSocket.OPEN) {
          // Create a message item with audio content
          client.current.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'message',
              role: 'user',
              content: [{
                type: 'input_audio',
                audio: btoa(String.fromCharCode.apply(null, new Uint8Array(audioData)))
              }]
            }
          }));
        }
      };

      streamRef.current = stream;
      processorRef.current = processor;
      sourceRef.current = source;
    } catch (error) {
      console.error('Error starting manual recording:', error);
      setIsManualRecording(false);
    }
  };

  const stopManualRecording = () => {
    setIsManualRecording(false);

    // Clean up audio resources
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    // Request response from server
    if (client.current?.readyState === WebSocket.OPEN) {
      client.current.send(JSON.stringify({
        type: 'response.create',
        response: {
          modalities: ['text', 'audio'],
          instructions: 'Please assist the user.'
        }
      }));
    }
  };

  const stopRecording = () => {
    setIsListening(false);
    // Stop audio recording logic here
  };

  const stopVoiceConversation = () => {
    setIsListening(false);
    console.log('Stopping voice conversation...');

    // Stop recording
    if (recorder.current) {
      recorder.current.stop().catch(error => {
        console.error('Error stopping recorder:', error);
      });
    }

    // Close WebSocket
    if (client.current) {
      client.current.close();
    }
  };

  const playNextAudio = async () => {
    if (isPlaying.current || audioQueue.current.length === 0) return;
    
    isPlaying.current = true;
    const audioData = audioQueue.current.shift();
    
    try {
      // Convert base64 PCM to 16-bit PCM
      const raw = atob(audioData);
      const rawLength = raw.length;
      const audioArray = new Uint8Array(new ArrayBuffer(rawLength));
      
      for (let i = 0; i < rawLength; i++) {
        audioArray[i] = raw.charCodeAt(i);
      }

      // Create WAV header
      const wavHeader = new ArrayBuffer(44);
      const view = new DataView(wavHeader);
      
      // "RIFF" chunk descriptor
      view.setUint32(0, 0x46464952, true);
      view.setUint32(4, 36 + audioArray.length, true);
      view.setUint32(8, 0x45564157, true);
      
      // "fmt " sub-chunk
      view.setUint32(12, 0x20746D66, true);
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, 24000, true);
      view.setUint32(28, 48000, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      
      // "data" sub-chunk
      view.setUint32(36, 0x61746164, true);
      view.setUint32(40, audioArray.length, true);

      // Combine header and audio data
      const audioBuffer = new Uint8Array(wavHeader.byteLength + audioArray.length);
      audioBuffer.set(new Uint8Array(wavHeader), 0);
      audioBuffer.set(audioArray, wavHeader.byteLength);

      // Decode and play
      const buffer = await audioContext.current.decodeAudioData(audioBuffer.buffer);
      const source = audioContext.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.current.destination);
      
      source.onended = () => {
        isPlaying.current = false;
        playNextAudio();
      };
      
      source.start(0);
    } catch (error) {
      console.error('Error playing audio:', error);
      isPlaying.current = false;
      playNextAudio();
    }
  };

  const handleAudioDelta = (audioBase64) => {
    audioQueue.current.push(audioBase64);
    if (!isPlaying.current) {
      playNextAudio();
    }
  };

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <ToggleButton onClick={() => setIsVadMode(!isVadMode)}>
        {isVadMode ? 'VAD Mode' : 'Manual Mode'}
        <RecordingIndicator isRecording={isVadMode || isManualRecording} />
      </ToggleButton>
      <CloseButton onClick={onClose}>
        <Icon icon="ph:x" style={{ fontSize: '24px' }} />
      </CloseButton>
      <CircleLarge
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        image={image}
      />
      <SpeakingText>
        {isVadMode 
          ? (isListening ? 'Speak now' : 'Processing...') 
          : (isManualRecording ? 'Recording... (Release space to send)' : 'Press and hold space to speak')}
      </SpeakingText>
      <Transcript>
        {transcript}
      </Transcript>
    </Overlay>
  );
};

export default SpeakingOverlay;
