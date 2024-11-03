const express = require('express');
const { WebSocket, WebSocketServer } = require('ws');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

wss.on('connection', (ws) => {
  console.log('Client connected');
  let openAiWs = null;

  const connectToOpenAI = () => {
    const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
    openAiWs = new WebSocket(url, {
      headers: {
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`,
        'OpenAI-Beta': 'realtime=v1'
      }
    });

    openAiWs.on('open', () => {
      console.log('Connected to OpenAI Realtime API');
      openAiWs.send(JSON.stringify({
        type: 'session.update',
        session: {
          model: 'gpt-4o-realtime-preview-2024-10-01',
          voice: 'alloy',
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          sample_rate: 24000,
          turn_detection: null  // Disable VAD for manual mode
        }
      }));
    });

    openAiWs.on('error', (error) => {
      console.error('OpenAI WebSocket error:', error);
      ws.send(JSON.stringify({ type: 'error', error: error.message }));
    });

    openAiWs.on('message', (data) => {
      ws.send(data.toString());
    });

    openAiWs.on('close', () => {
      console.log('OpenAI connection closed');
    });
  };

  connectToOpenAI();

  ws.on('message', (message) => {
    if (openAiWs?.readyState === WebSocket.OPEN) {
      openAiWs.send(message.toString());
    }
  });

  ws.on('close', () => {
    if (openAiWs) {
      openAiWs.close();
    }
    console.log('Client disconnected');
  });
});

const PORT = 3005;
server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
