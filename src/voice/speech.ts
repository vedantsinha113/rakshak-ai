export function speak(text: string) {
  window.speechSynthesis.cancel()

  const speech = new SpeechSynthesisUtterance(text)

  speech.lang = "en-IN"
  speech.rate = 1
  speech.pitch = 1
  speech.volume = 1

  window.speechSynthesis.speak(speech)
}