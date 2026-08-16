import { useState, useEffect } from 'react';

export function useTextToSpeech() {
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      console.warn('Text-to-Speech not supported in this browser.');
    }
  }, []);

  const speak = (text: string) => {
    if (!isTtsEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    window.speechSynthesis.speak(utterance);
  };

  const toggleTts = () => {
    setIsTtsEnabled(!isTtsEnabled);
    if (isTtsEnabled) {
      window.speechSynthesis.cancel();
    }
  };

  return { isTtsEnabled, toggleTts, speak };
}
