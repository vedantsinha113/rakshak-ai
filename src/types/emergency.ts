export type EmergencyType =
  | "ROAD_ACCIDENT"
  | "HEART_ATTACK"
  | "STROKE"
  | "BLEEDING"
  | "BURN"
  | "FRACTURE"
  | "UNCONSCIOUS"
  | "CHOKING"
  | "SNAKE_BITE"
  | "ELECTRIC_SHOCK"
  | "DROWNING"
  | "FIRE"
  | "GAS_LEAK"
  | "FLOOD"
  | "EARTHQUAKE"
  | "CRIME"
  | "KIDNAPPING"
  | "WOMEN_SAFETY"
  | "UNKNOWN"

export interface Location {
  lat: number
  lng: number
}

export interface EmergencyData {
  type: EmergencyType
  source: "voice"
  location: Location | null
  confidence: number
  timestamp: number
}