import type { Location } from "../types/emergency"

export function openNearestHospital(location: Location | null) {
  if (!location) {
    alert("Location not available")
    return
  }
  window.open(
    `https://www.google.com/maps/search/hospital/@${location.lat},${location.lng},15z`,
    "_blank"
  )
}

export function openNearestPolice(location: Location | null) {
  if (!location) {
    alert("Location not available")
    return
  }
  window.open(
    `https://www.google.com/maps/search/police/@${location.lat},${location.lng},15z`,
    "_blank"
  )
}