/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Plays the provided text aloud using server-side Gemini TTS,
 * with a fallback to the browser's built-in Web Speech API if offline or unavailable.
 */
export async function playTextToSpeech(text: string): Promise<void> {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!res.ok) {
      throw new Error('TTS API returned error status');
    }

    const data = await res.json();
    if (data.success && data.audioContent) {
      const binaryString = window.atob(data.audioContent);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes.buffer], { type: data.mimeType || 'audio/mp3' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
      return;
    }

    console.warn('Gemini TTS fallback:', data.message || 'Audio generation unsuccessful.');
    playBrowserTTS(text);
  } catch (err) {
    console.error('Error playing Gemini TTS, using Web Speech Synthesis fallback:', err);
    playBrowserTTS(text);
  }
}

/**
 * Standard browser TTS fallback
 */
function playBrowserTTS(text: string): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // cancel current spoken tracks
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to grab a high quality English voice if available
    const voices = window.speechSynthesis.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    if (enVoice) {
      utterance.voice = enVoice;
    }
    
    window.speechSynthesis.speak(utterance);
  } else {
    console.error('Speech synthesis is not supported in this browser environment.');
  }
}
