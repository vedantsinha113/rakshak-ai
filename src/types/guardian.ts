export interface Guardian {
  id: string
  name: string
  phone: string
  relation: 'Mom' | 'Dad' | 'Friend' | 'Doctor' | 'Other'
  isPrimary: boolean
}