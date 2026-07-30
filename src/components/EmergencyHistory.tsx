import { useEffect, useState } from 'react'
import {
  collection,
  getDocs,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

type Emergency = {
  id: string
  trigger: string
  latitude: number | null
  longitude: number | null
  status: string
  createdAt?: any
}

export default function EmergencyHistory() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEmergencies = async () => {
      try {
        const q = query(
          collection(db, 'emergencies'),
          orderBy('createdAt', 'desc')
        )

        const snapshot = await getDocs(q)

        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Emergency, 'id'>),
        }))

        setEmergencies(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    loadEmergencies()
  }, [])

  if (loading) {
    return (
      <div className='rounded-2xl bg-gray-100 p-4 text-center text-gray-600'>
        Loading emergency history...
      </div>
    )
  }

  return (
    <div className='mt-6'>
      <h2 className='mb-3 text-left text-xl font-bold text-gray-900'>
        📜 Emergency History
      </h2>

      <div className='space-y-3'>
        {emergencies.length === 0 ? (
          <div className='rounded-2xl bg-gray-100 p-4 text-center text-gray-600'>
            No emergency records found.
          </div>
        ) : (
          emergencies.map((item) => (
            <div
              key={item.id}
              className='rounded-2xl border border-gray-200 bg-white p-4 shadow-sm'
            >
              <div className='mb-2 flex items-center justify-between'>
                <span className='rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700'>
                  {item.trigger === 'voice'
                    ? '🎤 Voice Emergency'
                    : '⚠️ Fall Detection'}
                </span>

                <span className='rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'>
                  {item.status}
                </span>
              </div>

              <div className='space-y-1 text-sm text-gray-700'>
                <p>
                  📍 {item.latitude?.toFixed(4) ?? 'N/A'},{' '}
                  {item.longitude?.toFixed(4) ?? 'N/A'}
                </p>

                <p>
                  🕒{' '}
                  {item.createdAt?.toDate
                    ? item.createdAt.toDate().toLocaleString()
                    : 'Just now'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}