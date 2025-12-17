import React, { useState, useRef, useCallback } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Mic, MicOff, Volume2, Loader2, X, Send, MessageSquare } from 'lucide-react';
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
  const [textInput, setTextInput] = useState('');
  const [mode, setMode] = useState('voice'); // 'voice' or 'text'
  
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
      setError('Accès au microphone refusé');
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
        await sendChatMessage(userText);
      };
    } catch (err) {
      setError('Erreur de transcription');
      console.error('Processing error:', err);
      setIsProcessing(false);
    }
  };

  const sendChatMessage = useCallback(async (text) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      // Get AI response
      const chatResponse = await axios.post(`${API_URL}/api/voice/chat`, {
        text: text,
        language: language
      });

      const aiResponse = chatResponse.data.response;
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

      // Speak response if in voice mode
      if (mode === 'voice') {
        await speakText(aiResponse);
      }
    } catch (err) {
      setError('Erreur de communication');
      console.error('Chat error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [language, mode]);

  const handleTextSubmit = async (e) => {
    e?.preventDefault();
    if (!textInput.trim() || isProcessing) return;
    
    const text = textInput;
    setTextInput('');
    await sendChatMessage(text);
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

  const clearChat = () => {
    setMessages([]);
    setError(null);
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
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mic className="h-5 w-5 text-primary" />
                {t('voiceAssistant')} PREMIDIS
              </span>
              <div className="flex gap-1">
                <Button
                  variant={mode === 'voice' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMode('voice')}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  variant={mode === 'text' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setMode('text')}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* Messages Area */}
          <ScrollArea className="flex-1 min-h-[300px] max-h-[400px] pr-4">
            <div className="space-y-4 py-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Mic className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">
                    {mode === 'voice' 
                      ? 'Appuyez sur le bouton et parlez' 
                      : 'Écrivez votre question ci-dessous'}
                  </p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`
                      max-w-[85%] rounded-2xl px-4 py-3
                      ${msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                      }
                    `}
                  >
                    <p className="text-xs font-medium mb-1 opacity-70">
                      {msg.role === 'user' ? 'Vous' : 'Assistant'}
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Error Display */}
          {error && (
            <p className="text-sm text-destructive text-center py-2">{error}</p>
          )}

          {/* Input Area */}
          <div className="border-t pt-4 space-y-4">
            {mode === 'voice' ? (
              <div className="flex flex-col items-center gap-4">
                {/* Recording Button */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isProcessing || isSpeaking}
                  className={`
                    h-20 w-20 rounded-full flex items-center justify-center transition-all duration-300
                    ${isRecording 
                      ? 'bg-destructive text-destructive-foreground animate-pulse scale-110' 
                      : 'bg-primary text-primary-foreground hover:scale-105'
                    }
                    ${(isProcessing || isSpeaking) ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  data-testid="voice-record-btn"
                >
                  {isProcessing ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : isSpeaking ? (
                    <Volume2 className="h-8 w-8 animate-pulse" />
                  ) : isRecording ? (
                    <MicOff className="h-8 w-8" />
                  ) : (
                    <Mic className="h-8 w-8" />
                  )}
                </button>

                {/* Status Text */}
                <p className="text-sm text-muted-foreground">
                  {isProcessing ? 'Traitement...' : 
                   isSpeaking ? 'Réponse en cours...' :
                   isRecording ? 'Écoute en cours... (cliquez pour arrêter)' : 
                   'Cliquez pour parler'}
                </p>

                {/* Stop Speaking Button */}
                {isSpeaking && (
                  <Button variant="outline" size="sm" onClick={stopSpeaking}>
                    <X className="h-4 w-4 mr-2" />
                    Arrêter
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <Textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Posez votre question..."
                  className="min-h-[60px] max-h-[100px] resize-none"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTextSubmit();
                    }
                  }}
                  disabled={isProcessing}
                  data-testid="voice-text-input"
                />
                <Button 
                  type="submit" 
                  disabled={isProcessing || !textInput.trim()}
                  className="h-auto"
                  data-testid="voice-send-btn"
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
            )}

            {/* Clear Chat */}
            {messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearChat}
                className="w-full text-muted-foreground"
              >
                Effacer la conversation
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VoiceAssistant;
