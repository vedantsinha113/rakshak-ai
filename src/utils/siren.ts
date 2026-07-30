let sirenAudio: HTMLAudioElement | null = null

export function playSiren() {
  try {
    // Web Audio API se beep sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = "sine"

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 1)
  } catch (e) {
    console.log("Siren not available")
  }
}

export function stopSiren() {
  if (sirenAudio) {
    sirenAudio.pause()
  }
}