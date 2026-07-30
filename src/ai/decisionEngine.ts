import { parseCommand } from "../voice/parser"
import type { VoiceCommand } from "../voice/parser"
import { getFirstAid } from "./firstAidAI"

export interface DecisionResult {
  command: VoiceCommand
  confidence: number
  emergencyType: string
  firstAid: ReturnType<typeof getFirstAid>
}

export function decide(text: string): DecisionResult {
  const input = text.toLowerCase().trim()

  const command = parseCommand(input)

  let confidence = 0.6
  let emergencyType = "UNKNOWN"

  if (
    input.includes("accident") ||
    input.includes("car crash") ||
    input.includes("bike")
  ) {
    emergencyType = "ROAD_ACCIDENT"
    confidence = 1
  }

  else if (
    input.includes("heart") ||
    input.includes("chest pain")
  ) {
    emergencyType = "HEART_ATTACK"
    confidence = 1
  }

  else if (
    input.includes("blood") ||
    input.includes("bleeding")
  ) {
    emergencyType = "BLEEDING"
    confidence = 0.95
  }

  else if (
    input.includes("burn")
  ) {
    emergencyType = "BURN"
    confidence = 0.95
  }

  else if (
    input.includes("fracture") ||
    input.includes("broken")
  ) {
    emergencyType = "FRACTURE"
    confidence = 0.95
  }

  else if (
    input.includes("unconscious")
  ) {
    emergencyType = "UNCONSCIOUS"
    confidence = 1
  }

  else if (
    input.includes("choking")
  ) {
    emergencyType = "CHOKING"
    confidence = 1
  }

  else if (
    input.includes("snake")
  ) {
    emergencyType = "SNAKE_BITE"
    confidence = 0.95
  }

  else if (
    input.includes("electric")
  ) {
    emergencyType = "ELECTRIC_SHOCK"
    confidence = 1
  }

  else if (
    input.includes("drowning")
  ) {
    emergencyType = "DROWNING"
    confidence = 1
  }

  const firstAid = getFirstAid(
    emergencyType as Parameters<typeof getFirstAid>[0]
  )

  return {
    command,
    confidence,
    emergencyType,
    firstAid,
  }
}