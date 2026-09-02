import { useEffect, useState } from 'react'
import { Preferences } from '@capacitor/preferences'
import type { EmergencyType, Location } from './types/emergency'
import { getFirstAid } from './ai/firstAidAI'
import { cancelEmergency, hospital, police } from './actions/actions'

import type { Guardian } from './types/guardian'
import { getGuardians, saveGuardians } from './utils/guardianStorage'
import GuardianSettings from './components/GuardianSettings'

const NATIVE_KEYS = {
  active: 'rakshak_emergency_active',
  type: 'rakshak_emergency_type',
  ts: 'rakshak_emergency_ts',
}

export default function App() {
  const [isEmergency, setIsEmergency] = useState(false)
  const [type, setType] = useState<EmergencyType>('ROAD_ACCIDENT')
  const [status, setStatus] = useState('🛡️ Monitoring in background (Android Service)')
  const [location, setLocation] = useState<Location | null>(null)

  const [showSettings, setShowSettings] = useState(false)
  const [guardians, setGuardians] = useState<Guardian[]>(getGuardians())
  const [nativeTs, setNativeTs] = useState<string | null>(null)

  const handleGuardiansUpdate = (updated: Guardian[]) => {
    setGuardians(updated)
    saveGuardians(updated)
  }

  // Sync React UI with native service emergency flag
  const syncNativeEmergency = async () => {
    const active = await Preferences.get({ key: NATIVE_KEYS.active })
    const t = await Preferences.get({ key: NATIVE_KEYS.type })
    const ts = await Preferences.get({ key: NATIVE_KEYS.ts })

    const isActive = active.value === '1'
    if (isActive) {
      setIsEmergency(true)
      setType(((t.value as EmergencyType) || 'ROAD_ACCIDENT') as EmergencyType)
      setNativeTs(ts.value || null)
      setStatus('🚨 Emergency detected in background. Alert is/was being processed.')
    } else {
      setIsEmergency(false)
      setNativeTs(null)
      setStatus('🛡️ Monitoring in background (Android Service)')
    }
  }

  useEffect(() => {
    // location for UI (optional)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      )
    }

    void syncNativeEmergency()

    // when app comes to foreground
    const onVis = () => {
      if (document.visibilityState === 'visible') void syncNativeEmergency()
    }
    document.addEventListener('visibilitychange', onVis)

    const onFocus = () => void syncNativeEmergency()
    window.addEventListener('focus', onFocus)

    // periodic sync (in case notification intent arrives while webview already running)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncNativeEmergency()
    }, 1200)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
      window.clearInterval(timer)
    }
  }, [])

  const onSafe = async () => {
    // clear native flag so service can trigger again
    await Preferences.set({ key: NATIVE_KEYS.active, value: '0' })
    await Preferences.remove({ key: NATIVE_KEYS.type })
    await Preferences.remove({ key: NATIVE_KEYS.ts })

    cancelEmergency()

    setIsEmergency(false)
    setNativeTs(null)
    setStatus('✅ Marked safe. Monitoring continues.')
  }

  const firstAid = getFirstAid(type)

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-6 transition-all duration-500 ${
        isEmergency ? 'bg-red-600' : 'bg-gray-950'
      }`}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl">
        {!isEmergency && (
          <button
            onClick={() => setShowSettings(true)}
            className="absolute right-6 top-6 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          >
            ⚙️ Settings
          </button>
        )}

        <div
          className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${
            isEmergency ? 'bg-red-100' : 'bg-green-100'
          }`}
        >
          <span className="text-4xl">{isEmergency ? '🚨' : '🛡️'}</span>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">Rakshak AI</h1>
        <p className="mb-4 text-gray-600">{status}</p>

        {isEmergency ? (
          <div className="space-y-3 text-left">
            <div className="rounded-xl bg-red-50 p-3 text-center">
              <p className="text-sm font-bold text-red-700">{type.replace(/_/g, ' ')}</p>
              <p className="text-xs text-red-600">
                {firstAid.severity} • {firstAid.title}
              </p>

              {nativeTs && (
                <p className="mt-1 text-[11px] text-red-500">
                  Triggered: {new Date(Number(nativeTs)).toLocaleString()}
                </p>
              )}
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <p className="mb-2 font-semibold text-gray-900">🩹 First Aid</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                {firstAid.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>

            <button
              onClick={onSafe}
              className="w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white hover:bg-blue-700"
            >
              ✅ I Am Safe (Reset Emergency)
            </button>

            <a
              href="tel:102"
              className="block w-full rounded-2xl bg-red-700 px-5 py-3.5 text-center font-semibold text-white hover:bg-red-800"
            >
              🚑 Call Ambulance (102)
            </a>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => hospital(location)}
                className="rounded-2xl bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
              >
                🏥 Hospital
              </button>

              <button
                onClick={() => police(location)}
                className="rounded-2xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                🚓 Police
              </button>
            </div>

            {location && (
              <div className="mt-2 rounded-2xl bg-gray-100 p-2.5 text-center text-xs text-gray-600">
                📍 GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-gray-100 p-4 text-sm text-gray-700">
            Background monitoring is ON (Foreground Service).
            <div className="mt-2 text-xs text-gray-500">
              Voice + Fall detection background me native service handle karega.
            </div>
          </div>
        )}

        {showSettings && (
          <GuardianSettings
            guardians={guardians}
            onUpdate={handleGuardiansUpdate}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  )
}