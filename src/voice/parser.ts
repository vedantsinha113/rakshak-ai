import { EMERGENCY_COMMANDS, SAFE_COMMANDS } from "./commands"
import type { EmergencyType } from "../types/emergency"

export type VoiceCommand =
  | "EMERGENCY"
  | "SAFE"
  | "HOSPITAL"
  | "POLICE"
  | "SOS"
  | "FIRST_AID"
  | "UNKNOWN"

export function detectEmergencyType(text: string): EmergencyType {
  const input = text.toLowerCase().trim()

  for (const [type, phrases] of Object.entries(
    EMERGENCY_COMMANDS
  ) as [EmergencyType, string[]][]) {
    if (phrases.some((p) => input.includes(p))) {
      return type
    }
  }

  // generic fallback for "help / accident / bachao"
  if (
    input.includes("help") ||
    input.includes("bachao") ||
    input.includes("emergency") ||
    input.includes("accident")
  ) {
    return "ROAD_ACCIDENT"
  }

  return "UNKNOWN"
}

export function parseCommand(text: string): VoiceCommand {
  const input = text.toLowerCase().trim()

  if (SAFE_COMMANDS.some((cmd) => input.includes(cmd))) {
    return "SAFE"
  }

  for (const phrases of Object.values(EMERGENCY_COMMANDS)) {
    if (phrases.some((phrase) => input.includes(phrase))) {
      return "EMERGENCY"
    }
  }

  // generic emergency
  if (
    input.includes("help") ||
    input.includes("bachao") ||
    input.includes("emergency") ||
    input.includes("accident")
  ) {
    return "EMERGENCY"
  }

  if (input.includes("hospital")) return "HOSPITAL"
  if (input.includes("police")) return "POLICE"
  if (input.includes("sos")) return "SOS"
  if (input.includes("first aid")) return "FIRST_AID"

  return "UNKNOWN"
}