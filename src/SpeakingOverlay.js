import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Icon } from '@iconify/react';
import MicRecorder from 'mic-recorder-to-mp3';
import { w3cwebsocket as W3CWebSocket } from 'websocket';
import OpenAI from 'openai';
import fetchWebImage from './fetchWebImage';
import { desc } from 'framer-motion/client';
import Markdown from 'markdown-to-jsx';

const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Update tools definition to include description
const tools = [
  {
    type: "function",
    function: {
      name: "visualize_data",
      description: "Visualize data when the user asks to show or visualize something",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "A short 2-5 word description of what needs to be visualized"
          }
        },
        required: ["description"]
      }
    }
  }
];

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
  min-height: 150px;
  border-radius: 50%;
  background: url(${props => props.image}) no-repeat center center;
  background-size: cover;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Add new styled components for sound waves
const SoundWaveContainer = styled.div`
  position: absolute;
  width: 200px;
  height: 200px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: -1;
`;

const SoundWave = styled.div`
  position: absolute;
  border: 3px solid rgba(255, 255, 255, 0.1);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  animation: ${props => props.isActive ? 'soundWave 2s infinite' : 'none'};
  opacity: ${props => props.isActive ? 1 : 0};

  @keyframes soundWave {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.4);
      opacity: 0;
    }
  }

  &:nth-child(2) {
    animation-delay: 0.3s;
  }
  &:nth-child(3) {
    animation-delay: 0.6s;
  }
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

const CollapseButton = styled(CloseButton)`
  right: 5rem;
  opacity: 0.4;

  &:hover {
    opacity: 0.8;
  }
`;

const Transcript = styled.div`
  width: ${props => props.isVisualPaneOpen ? '65%' : '40%'};
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

const SplitLayout = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  transition: all 0.5s ease;
`;

const MainPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

// Update VisualPane to remove transition
const VisualPane = styled.div`
  flex: 1;
  background: rgba(255, 255, 255, 0.00);
  border-left: 0px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  padding: 2rem;
  overflow-y: auto;
  max-height: 100vh;
  color: white;
  
  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
  }
`;

const VisualImage = styled.img`
  width: 100%;
  height: auto;
  border-radius: 8px;
  margin-bottom: 1rem;
`;

const VisualHeader = styled.h1`
  font-family: 'Fraunces', serif;
  font-size: 2rem;
  margin-bottom: 1.5rem;
  font-weight: 400;
`;

const ExplanationBox = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 1.5rem;
  color: white;
  font-weight: 200;
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  min-height: min-content;
`;

const RichTextExplanationBox = styled(ExplanationBox)`
  font-size: 16px;
  line-height: 1.6;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  
  h1, h2, h3 {
    font-family: 'Fraunces', serif;
    color: #fff;
    margin-top: 1em;
    margin-bottom: 0.5em;
  }
  
  p {
    margin-bottom: 1em;
    font-weight: 300;
  }
  
  ul, ol {
    margin-left: 1.5em;
    margin-bottom: 1em;
  }
  
  blockquote {
    border-left: 3px solid rgba(255, 255, 255, 0.2);
    padding-left: 1em;
    margin-left: 0;
    font-style: italic;
  }
  
  code {
    background: rgba(255, 255, 255, 0.1);
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }

  .markdown-body {
    height: 100%;
    width: 100%;
  }
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
  const [isVisualPaneOpen, setIsVisualPaneOpen] = useState(false);
  const [visualizedImage, setVisualizedImage] = useState("https://images.rawpixel.com/image_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvdjU0NmJhdGNoMy1teW50LTM0LWJhZGdld2F0ZXJjb2xvcl8xLmpwZw.jpg");
  const [visualizedDescription, setVisualizedDescription] = useState('');
  const [visualizedHeader, setVisualizedHeader] = useState('');
  const [messages, setMessages] = useState([]);  // Add this state for chat history
  const [isResponding, setIsResponding] = useState(false);
  const [isDescriptionStreaming, setIsDescriptionStreaming] = useState(false);
  const recorder = useRef(null);
  const client = useRef(null);
  const audioContext = useRef(null);
  const audioQueue = useRef([]);
  const isPlaying = useRef(false);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const descriptionRef = useRef(''); // Add this ref to maintain description between renders


  // Update visualize_data function
  const visualize_data = async (description) => {
    const retrievedImage = await fetchWebImage(description);
    setVisualizedImage(retrievedImage);
    setVisualizedHeader(description);
    setIsVisualPaneOpen(true);
    console.log('Visualized:', description);
    const descriptionResponse = await describeVisualizedImage(retrievedImage);
    setVisualizedDescription(descriptionResponse);
    return `You, the LLM agent, have created a visualization and a description for: ${description}. JUST tell the user that you've done so on the right hand side, just describe what the user asked to visualize in one short line and nothing more.`;
  };

  // Update encodeImageToBase64 in SpeakingOverlay.js
  const encodeImageToBase64 = async (imageUrl) => {
    try {
      // Use proxy endpoint
      const proxyUrl = `http://localhost:3010/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error encoding image:', error);
      throw error;
    }
  };
  
  // Update description function to stream
  const describeVisualizedImage = async (imageUrl) => {
    try {
      setIsDescriptionStreaming(true);
      const base64Image = await encodeImageToBase64(imageUrl);
      descriptionRef.current = ''; // Reset the ref
      
      const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system", 
            content: "Create a rich, detailed markdown description of the image in the context on the previous visualization prompt right before. Use subheadings (but no headings), lists, and other markdown formatting to make the description engaging and well-structured. Include sections like:\n\n# Visual Analysis\n## Composition\n## Colors and Lighting\n## Key Elements\n\n# Interpretation\n## Mood and Atmosphere\n## Overall Impression"
          },
          ...messages,
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { 
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        descriptionRef.current += content;
        setVisualizedDescription(descriptionRef.current);
      }

      // After stream ends, ensure we set the final description
      setVisualizedDescription(descriptionRef.current);
      setIsDescriptionStreaming(false);
      return descriptionRef.current; // Return the full description
      
    } catch (error) {
      console.error('Error describing image:', error);
      setIsDescriptionStreaming(false);
      return descriptionRef.current; // Return whatever we got before the error
    }
  };

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
      client.current = new W3CWebSocket('ws://localhost:3005');

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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.start();
      setIsManualRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopManualRecording = async () => {
    if (!mediaRecorder.current) return;

    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
      const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });

      try {
        setIsResponding(true);

        // Get transcription
        const transcription = await openai.audio.transcriptions.create({
          file: file,
          model: "whisper-1",
        });

        const userMessage = { role: "user", content: transcription.text };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);

        // Get chat completion
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: updatedMessages,
          tools: tools,
        });

        const assistantMessage = completion.choices[0].message;

        // Handle potential tool calls (function calls)
        if (assistantMessage.tool_calls) {
          const toolCall = assistantMessage.tool_calls[0];
          
          if (toolCall.function.name === 'visualize_data') {
            const args = JSON.parse(toolCall.function.arguments);
            const functionResult = await visualize_data(args.description);

            // Add function result to messages
            const toolMessage = {
              role: "tool",
              content: functionResult,
              tool_call_id: toolCall.id,
            };

            // Get final response with function result
            const finalCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: [
                ...updatedMessages,
                assistantMessage,
                toolMessage
              ],
            });

            const finalResponse = finalCompletion.choices[0].message.content;
            setTranscript(finalResponse);
            setMessages(prev => [...prev, assistantMessage, toolMessage, finalCompletion.choices[0].message]);
            await streamTextToSpeech(finalResponse);
          }
        } else {
          // No function call, just regular response
          const response = assistantMessage.content;
          setTranscript(response);
          setMessages(prev => [...prev, assistantMessage]);
          await streamTextToSpeech(response);
        }

        setIsResponding(false);

      } catch (error) {
        console.error('Error:', error);
        setIsResponding(false);
      }
    };

    mediaRecorder.current.stop();
    setIsManualRecording(false);
    mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
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

  // Add this function to handle text-to-speech streaming
  const streamTextToSpeech = async (text) => {
    try {
      const response = await openai.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: text,
      });

      // Convert the response to an audio buffer
      const audioData = await response.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      
      // Play the audio
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Error streaming TTS:', error);
    }
  };

  const toggleVisualPane = () => {
    setIsVisualPaneOpen(!isVisualPaneOpen);
  };

  return (
    <Overlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <SplitLayout>
        <MainPane>
          <ToggleButton onClick={() => setIsVadMode(!isVadMode)}>
            {isVadMode ? 'VAD Mode' : 'Manual Mode'}
            <RecordingIndicator isRecording={isVadMode || isManualRecording} />
          </ToggleButton>
          {isVisualPaneOpen && (
            <CollapseButton onClick={toggleVisualPane}>
              <Icon icon="ph:arrow-right" style={{ fontSize: '24px' }} />
            </CollapseButton>
          )}
          <CloseButton onClick={onClose}>
            <Icon icon="ph:x" style={{ fontSize: '24px' }} />
          </CloseButton>
          <>
            {/* <SoundWaveContainer>
              <SoundWave isActive={isManualRecording || isResponding} />
              <SoundWave isActive={isManualRecording || isResponding} />
              <SoundWave isActive={isManualRecording || isResponding} />
            </SoundWaveContainer> */}
            <CircleLarge
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              image={image}
            />
          </>
          <SpeakingText>
            {isVadMode 
              ? (isListening ? 'Speak now' : 'Processing...') 
              : isResponding 
                ? 'Responding...'
                : (isManualRecording ? 'Recording... (Release space to send)' : 'Press and hold space to speak')}
          </SpeakingText>
          <Transcript isVisualPaneOpen={isVisualPaneOpen}>
            {transcript}
          </Transcript>
        </MainPane>
        {isVisualPaneOpen && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: '50%' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <VisualPane>
              <VisualHeader>{visualizedHeader}</VisualHeader>
              <VisualImage 
                src={visualizedImage}
                alt="Visualization"
              />
              <RichTextExplanationBox>
                <div className="markdown-body">
                  <Markdown>
                    {visualizedDescription}
                  </Markdown>
                </div>
                {isDescriptionStreaming && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ▋
                  </motion.span>
                )}
              </RichTextExplanationBox>
            </VisualPane>
          </motion.div>
        )}
      </SplitLayout>
    </Overlay>
  );
};

export default SpeakingOverlay;
