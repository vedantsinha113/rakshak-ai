import type { Guardian } from '../types/guardian'

const STORAGE_KEY = 'rakshak_guardians'

export function getGuardians(): Guardian[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) {
      // Default sample contact if empty
      return [
        {
          id: '1',
          name: 'Primary Contact',
          phone: '+919905740936',
          relation: 'Mom',
          isPrimary: true,
        },
      ]
    }
    return JSON.parse(data)
  } catch {
    return []
  }
}

export function saveGuardians(guardians: Guardian[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(guardians))
}