// Simple notification sound generator using Web Audio API
export function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for the "ding" sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure sound
    oscillator.frequency.value = 800; // Hz
    oscillator.type = 'sine';
    
    // Envelope (fade in and out)
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    // Play
    oscillator.start(now);
    oscillator.stop(now + 0.5);
    
    console.log('Notification sound played');
  } catch (err) {
    console.error('Failed to play notification sound:', err);
  }
}
