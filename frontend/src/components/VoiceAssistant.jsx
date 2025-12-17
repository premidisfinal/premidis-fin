import React, { useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Mic, MicOff, Volume2, Loader2, X } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VoiceAssistant = () => {
  const { t, language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(new Audio());

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop());
        await processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('Microphone access denied');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result.split(',')[1];
        
        // Transcribe audio
        const transcribeResponse = await axios.post(`${API_URL}/api/voice/transcribe`, {
          audio_base64: base64Audio,
          language: language
        });

        const userText = transcribeResponse.data.text;
        setMessages(prev => [...prev, { role: 'user', content: userText }]);

        // Get AI response
        const chatResponse = await axios.post(`${API_URL}/api/voice/chat`, {
          text: userText,
          language: language
        });

        const aiResponse = chatResponse.data.response;
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

        // Speak response
        await speakText(aiResponse);
      };
    } catch (err) {
      setError('Error processing audio');
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const speakText = async (text) => {
    setIsSpeaking(true);
    try {
      const response = await axios.post(`${API_URL}/api/voice/speak`, {
        text: text,
        language: language
      });

      const audioBase64 = response.data.audio_base64;
      const audioUrl = `data:audio/mp3;base64,${audioBase64}`;
      
      audioRef.current.src = audioUrl;
      audioRef.current.onended = () => setIsSpeaking(false);
      await audioRef.current.play();
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsSpeaking(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-primary to-secondary shadow-lg hover:shadow-xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 voice-pulse"
        aria-label={t('voiceAssistant')}
        data-testid="voice-assistant-fab"
      >
        <Mic className="h-6 w-6" />
      </button>

      {/* Voice Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              {t('voiceAssistant')}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-6 py-6">
            {/* Recording Button */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isProcessing || isSpeaking}
              className={`
                h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300
                ${isRecording 
                  ? 'bg-destructive text-destructive-foreground animate-pulse' 
                  : 'bg-primary text-primary-foreground hover:scale-105'
                }
                ${(isProcessing || isSpeaking) ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              data-testid="voice-record-btn"
            >
              {isProcessing ? (
                <Loader2 className="h-10 w-10 animate-spin" />
              ) : isSpeaking ? (
                <Volume2 className="h-10 w-10 animate-pulse" />
              ) : isRecording ? (
                <MicOff className="h-10 w-10" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </button>

            {/* Status Text */}
            <p className="text-sm text-muted-foreground">
              {isProcessing ? t('processing') : 
               isSpeaking ? 'Réponse en cours...' :
               isRecording ? t('listening') : t('speak')}
            </p>

            {/* Stop Speaking Button */}
            {isSpeaking && (
              <Button variant="outline" size="sm" onClick={stopSpeaking}>
                <X className="h-4 w-4 mr-2" />
                Arrêter
              </Button>
            )}

            {/* Error Display */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Messages */}
            {messages.length > 0 && (
              <div className="w-full max-h-48 overflow-y-auto space-y-3 mt-4 p-3 bg-muted rounded-lg">
                {messages.slice(-4).map((msg, idx) => (
                  <div
                    key={idx}
                    className={`
                      text-sm p-2 rounded-lg
                      ${msg.role === 'user' 
                        ? 'bg-primary/10 text-foreground ml-4' 
                        : 'bg-secondary/10 text-foreground mr-4'
                      }
                    `}
                  >
                    <p className="text-xs font-medium mb-1 text-muted-foreground">
                      {msg.role === 'user' ? 'Vous' : 'Assistant'}
                    </p>
                    {msg.content}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VoiceAssistant;
