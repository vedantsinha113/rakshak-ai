import { saveEmergency } from "../lib/emergency"
import { getFirstAid } from "../ai/firstAidAI"

import { playSiren, stopSiren } from "../utils/siren"
import { openNearestHospital, openNearestPolice } from "../utils/maps"
import { sendSOS as whatsappSOS } from "../utils/whatsapp"

import type { EmergencyType, Location } from "../types/emergency"

export function speak(text: string) {
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)

  utterance.lang = "en-IN"
  utterance.rate = 1
  utterance.pitch = 1
  utterance.volume = 1

  window.speechSynthesis.speak(utterance)
}

export function stopSpeaking() {
  window.speechSynthesis.cancel()
}

export function vibratePhone() {
  if ("vibrate" in navigator) {
    navigator.vibrate([300, 150, 300, 150, 500])
  }
}

export function toggleFlashlight() {
  // Future implementation
  console.log("Flashlight API will be added later.")
}

export async function startEmergency(
  emergencyType: EmergencyType,
  location: Location | null
) {
  try {
    playSiren()

    vibratePhone()

    const firstAid = getFirstAid(emergencyType)

    await saveEmergency("voice", location)

    speak(firstAid.voice)

    return firstAid
  } catch (error) {
    console.error("Emergency Error:", error)

    speak(
      "Emergency detected but some services are unavailable."
    )

    return null
  }
}

export function cancelEmergency() {
  stopSiren()

  stopSpeaking()

  speak("Emergency cancelled. User is safe.")
}

export function hospital(location: Location | null) {
  openNearestHospital(location)
}

export function police(location: Location | null) {
  openNearestPolice(location)
}

export function sendSOS(location: Location | null) {
  whatsappSOS(location)
}

export function repeatFirstAid(type: EmergencyType) {
  const guide = getFirstAid(type)

  speak(guide.voice)
}

export function announceLocation(location: Location | null) {
  if (!location) {
    speak("Location not available.")
    return
  }

  speak(
    `Your current location is latitude ${location.lat.toFixed(
      4
    )} and longitude ${location.lng.toFixed(4)}`
  )
}