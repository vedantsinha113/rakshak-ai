import type { Location } from "../types/emergency"

export function sendSOS(location: Location | null) {
  if (!location) {
    alert("Location not available")
    return
  }

  const msg = `🚨 EMERGENCY ALERT!

I may be in danger.

📍 Live Location:
https://maps.google.com/?q=${location.lat},${location.lng}

Sent from Rakshak AI.`

  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank")
}