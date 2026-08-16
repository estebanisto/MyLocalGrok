import { useState, useEffect, useRef } from 'react';
export function useSpeechToText(onResult) {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    useEffect(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech Recognition API not supported in this browser.');
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'fr-FR'; // or dynamic based on user pref
        recognitionRef.current.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                onResult(finalTranscript.trim());
            }
        };
        recognitionRef.current.onend = () => {
            // If we are still supposed to be listening, restart it
            if (isListening) {
                recognitionRef.current.start();
            }
            else {
                setIsListening(false);
            }
        };
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, [onResult, isListening]);
    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        }
        else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };
    return { isListening, toggleListening };
}
