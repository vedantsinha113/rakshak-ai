import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'

export const saveEmergency = async (
  trigger: 'voice' | 'fall',
  location: { lat: number; lng: number } | null
) => {
  try {
    await addDoc(collection(db, 'emergencies'), {
      trigger,
      latitude: location?.lat || null,
      longitude: location?.lng || null,
      status: 'active',
      createdAt: serverTimestamp(),
    })

    console.log('Emergency saved!')
  } catch (error) {
    console.error(error)
  }
}