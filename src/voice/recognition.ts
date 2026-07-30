import { decide } from "../ai/decisionEngine"

export interface RecognitionCallbacks {
  onEmergency: (result: ReturnType<typeof decide>) => void
  onSafe: () => void
  onUnknown: (text: string) => void
}

export function startRecognition(callbacks: RecognitionCallbacks) {
  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition

  if (!SpeechRecognition) {
    throw new Error("Speech Recognition not supported")
  }

  const recognition = new SpeechRecognition()

  recognition.continuous = true
  recognition.interimResults = false
  recognition.lang = "en-IN"

  recognition.onresult = (event: any) => {
    const transcript =
      event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim()

    console.log("🎤 Heard:", transcript)

    const result = decide(transcript)

    switch (result.command) {
      case "EMERGENCY":
        callbacks.onEmergency(result)
        break

      case "SAFE":
        callbacks.onSafe()
        break

      default:
        callbacks.onUnknown(transcript)
    }
  }

  recognition.onerror = (e: any) => {
    console.log("Speech Error:", e.error)
  }

  recognition.onend = () => {
    try {
      recognition.start()
    } catch {}
  }

  recognition.start()

  return recognition
}