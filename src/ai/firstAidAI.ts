import type { EmergencyType } from "../types/emergency"

export interface FirstAidResponse {
  title: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  callAmbulance: boolean
  voice: string
  steps: string[]
}

const FIRST_AID: Record<EmergencyType, FirstAidResponse> = {
  ROAD_ACCIDENT: {
    title: "Road Accident",
    severity: "CRITICAL",
    callAmbulance: true,
    voice:
      "Road accident detected. Keep the victim still. Do not move the neck or spine unless there is immediate danger. Call an ambulance immediately.",
    steps: [
      "Check if the victim is breathing.",
      "Call emergency services immediately.",
      "Do not move the victim unless necessary.",
      "Control heavy bleeding using a clean cloth.",
      "Keep the victim calm until help arrives."
    ]
  },

  HEART_ATTACK: {
    title: "Heart Attack",
    severity: "CRITICAL",
    callAmbulance: true,
    voice:
      "Possible heart attack detected. Call an ambulance immediately. Keep the person sitting and calm.",
    steps: [
      "Call emergency services immediately.",
      "Keep the person seated.",
      "Loosen tight clothing.",
      "Prepare for CPR if the person becomes unconscious."
    ]
  },

  STROKE: {
    title: "Stroke",
    severity: "CRITICAL",
    callAmbulance: true,
    voice:
      "Possible stroke detected. Call emergency services immediately. Do not give food or water.",
    steps: [
      "Call emergency services.",
      "Keep the person comfortable.",
      "Note the time symptoms started.",
      "Do not give food or drink."
    ]
  },

  BLEEDING: {
    title: "Heavy Bleeding",
    severity: "HIGH",
    callAmbulance: true,
    voice:
      "Heavy bleeding detected. Apply direct pressure to the wound immediately.",
    steps: [
      "Press firmly on the wound.",
      "Use a clean cloth or bandage.",
      "Raise the injured limb if possible.",
      "Do not remove soaked bandages. Add another layer."
    ]
  },

  BURN: {
    title: "Burn Injury",
    severity: "MEDIUM",
    callAmbulance: false,
    voice:
      "Cool the burn under running water for twenty minutes. Do not apply ice or toothpaste.",
    steps: [
      "Cool with clean running water.",
      "Remove tight jewelry.",
      "Cover with sterile dressing.",
      "Do not burst blisters."
    ]
  },

  FRACTURE: {
    title: "Fracture",
    severity: "HIGH",
    callAmbulance: true,
    voice:
      "Possible fracture detected. Keep the injured area still and avoid movement.",
    steps: [
      "Immobilize the injured part.",
      "Do not straighten broken bones.",
      "Apply ice wrapped in cloth.",
      "Seek medical care immediately."
    ]
  },

  UNCONSCIOUS: {
    title: "Unconscious Person",
    severity: "CRITICAL",
    callAmbulance: true,
    voice:
      "Check breathing immediately. Call emergency services. Begin CPR if trained.",
    steps: [
      "Check breathing.",
      "Call emergency services.",
      "Place in recovery position if breathing.",
      "Start CPR if not breathing."
    ]
  },

  CHOKING: {
    title: "Choking",
    severity: "CRITICAL",
    callAmbulance: true,
    voice:
      "Encourage coughing. If unable to breathe, perform abdominal thrusts if trained.",
    steps: [
      "Ask if the person can cough.",
      "Give five back blows.",
      "Perform abdominal thrusts.",
      "Call emergency services."
    ]
  },

  SNAKE_BITE: {
    title: "Snake Bite",
    severity: "HIGH",
    callAmbulance: true,
    voice:
      "Keep the victim calm and still. Do not cut or suck the wound.",
    steps: [
      "Keep the bitten limb still.",
      "Remove rings or tight clothing.",
      "Do not suck venom.",
      "Reach the nearest hospital immediately."
    ]
  },

  ELECTRIC_SHOCK: {
    title: "Electric Shock",
    severity: "CRITICAL",
    callAmbulance: true,
    voice:
      "Turn off the electricity before touching the victim.",
    steps: [
      "Disconnect the power source.",
      "Do not touch the victim until power is off.",
      "Check breathing.",
      "Start CPR if necessary."
    ]
  },

  DROWNING: {
    title: "Drowning",
    severity: "CRITICAL",
    callAmbulance: true,
    voice:
      "Move the person to safety. Check breathing immediately.",
    steps: [
      "Remove from water safely.",
      "Check breathing.",
      "Start CPR if necessary.",
      "Keep the victim warm."
    ]
  },

  FIRE: {
    title: "Fire",
    severity: "CRITICAL",
    callAmbulance: true,
    voice:
      "Move away from the fire immediately and call emergency services.",
    steps: [
      "Evacuate immediately.",
      "Avoid smoke.",
      "Call the fire department.",
      "Do not use elevators."
    ]
  },

  GAS_LEAK: {
    title: "Gas Leak",
    severity: "CRITICAL",
    callAmbulance: true,
    voice:
      "Leave the area immediately. Do not switch electrical devices on or off.",
    steps: [
      "Open doors and windows if safe.",
      "Leave the building.",
      "Avoid flames and sparks.",
      "Call emergency services."
    ]
  },

  FLOOD: {
    title: "Flood",
    severity: "HIGH",
    callAmbulance: false,
    voice:
      "Move to higher ground immediately and avoid flood water.",
    steps: [
      "Move to higher ground.",
      "Avoid walking through flood water.",
      "Disconnect electricity if safe.",
      "Follow official instructions."
    ]
  },

  EARTHQUAKE: {
    title: "Earthquake",
    severity: "CRITICAL",
    callAmbulance: false,
    voice:
      "Drop, cover and hold on until the shaking stops.",
    steps: [
      "Drop to the ground.",
      "Take cover under sturdy furniture.",
      "Hold on.",
      "Move outside after shaking stops."
    ]
  },

  CRIME: {
    title: "Crime",
    severity: "HIGH",
    callAmbulance: false,
    voice:
      "Move to a safe place and contact the police immediately.",
    steps: [
      "Stay calm.",
      "Move to a safe location.",
      "Call the police.",
      "Avoid confronting the attacker."
    ]
  },

  KIDNAPPING: {
    title: "Kidnapping",
    severity: "CRITICAL",
    callAmbulance: false,
    voice:
      "Emergency detected. Contact the police immediately and share your live location.",
    steps: [
      "Stay calm.",
      "Share your live location.",
      "Call the police.",
      "Avoid resisting if unsafe."
    ]
  },

  WOMEN_SAFETY: {
    title: "Women Safety",
    severity: "CRITICAL",
    callAmbulance: false,
    voice:
      "Women safety alert activated. Sending emergency assistance.",
    steps: [
      "Move to a public place.",
      "Call trusted contacts.",
      "Call police.",
      "Share live location."
    ]
  },

  UNKNOWN: {
    title: "Unknown Emergency",
    severity: "MEDIUM",
    callAmbulance: false,
    voice:
      "Emergency detected. Stay calm while Rakshak AI analyzes the situation.",
    steps: [
      "Stay calm.",
      "Observe the situation.",
      "Call emergency services if needed."
    ]
  }
}

export function getFirstAid(type: EmergencyType): FirstAidResponse {
  return FIRST_AID[type] ?? FIRST_AID.UNKNOWN
}