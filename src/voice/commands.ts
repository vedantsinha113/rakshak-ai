import type { EmergencyType } from "../types/emergency"

export const EMERGENCY_COMMANDS: Record<EmergencyType, string[]> = {
  ROAD_ACCIDENT: [
    "accident",
    "car accident",
    "bike accident",
    "road accident",
    "crash",
    "collision"
  ],

  HEART_ATTACK: [
    "heart attack",
    "chest pain",
    "heart pain"
  ],

  STROKE: [
    "stroke",
    "face numb",
    "cannot speak",
    "brain stroke"
  ],

  BLEEDING: [
    "bleeding",
    "blood",
    "heavy bleeding"
  ],

  BURN: [
    "burn",
    "fire burn",
    "hot water burn"
  ],

  FRACTURE: [
    "fracture",
    "broken bone",
    "bone broken"
  ],

  UNCONSCIOUS: [
    "unconscious",
    "not waking up",
    "passed out"
  ],

  CHOKING: [
    "choking",
    "cannot breathe",
    "can't breathe"
  ],

  SNAKE_BITE: [
    "snake bite",
    "snake"
  ],

  ELECTRIC_SHOCK: [
    "electric shock",
    "current",
    "electrocuted"
  ],

  DROWNING: [
    "drowning",
    "water",
    "help in water"
  ],

  FIRE: [
    "fire",
    "house fire"
  ],

  GAS_LEAK: [
    "gas leak",
    "gas smell"
  ],

  FLOOD: [
    "flood",
    "water everywhere"
  ],

  EARTHQUAKE: [
    "earthquake",
    "earth quake"
  ],

  CRIME: [
    "robbery",
    "crime",
    "thief"
  ],

  KIDNAPPING: [
    "kidnap",
    "kidnapping"
  ],

  WOMEN_SAFETY: [
    "help me",
    "save me",
    "molestation",
    "harassment"
  ],

  UNKNOWN: []
}

export const SAFE_COMMANDS = [
  "i am safe",
  "im safe",
  "i'm safe",
  "main safe hu",
  "mai safe hu",
  "safe hu",
  "cancel emergency",
  "stop emergency"
]