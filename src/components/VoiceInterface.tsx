import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseVoiceCommand } from '../services/gemini';
import { Command } from '../types';

interface VoiceInterfaceProps {
  onCommand: (cmd: Command) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ onCommand }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);
  const transcriptRef = React.useRef('');

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Il tuo browser non supporta il riconoscimento vocale.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'it-IT';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        console.log("Speech recognition started");
        setIsListening(true);
        setTranscript('');
        transcriptRef.current = '';
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        console.log("Transcript update:", { finalTranscript, interimTranscript });
        if (finalTranscript) {
          transcriptRef.current = finalTranscript;
        }
        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onend = async () => {
        console.log("Speech recognition ended. Final transcript:", transcriptRef.current);
        setIsListening(false);
        const finalTranscript = transcriptRef.current;
        
        if (finalTranscript) {
          setIsProcessing(true);
          try {
            console.log("Parsing command with Gemini...");
            const cmd = await parseVoiceCommand(finalTranscript);
            console.log("Parsed command:", cmd);
            if (cmd) {
              onCommand(cmd);
              setTranscript('');
              transcriptRef.current = '';
            } else {
              setError("Comando non riconosciuto. Riprova.");
            }
          } catch (err) {
            console.error("Gemini parsing error:", err);
            setError("Errore durante l'elaborazione del comando.");
          } finally {
            setIsProcessing(false);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError("Accesso al microfono negato. Controlla i permessi.");
        } else if (event.error === 'no-speech') {
          setError("Nessun parlato rilevato.");
        } else {
          setError(`Errore: ${event.error}`);
        }
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setError("Impossibile avviare il riconoscimento vocale.");
    }
  }, [onCommand]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isListening ? stopListening : startListening}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors z-20 relative ${
            isListening ? 'bg-red-500 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isListening ? <MicOff size={28} className="text-white" /> : <Mic size={28} className="text-white" />}
        </motion.button>
        
        {isListening && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.2 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 bg-red-500 rounded-full -z-10"
          />
        )}
      </div>

      <AnimatePresence>
        {(transcript || isProcessing || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 max-w-md text-center"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2 text-indigo-300">
                <Loader2 className="animate-spin" size={16} />
                <span>Analisi comando...</span>
              </div>
            ) : error ? (
              <span className="text-red-400 text-sm">{error}</span>
            ) : (
              <span className="text-white/90 italic">"{transcript}"</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
