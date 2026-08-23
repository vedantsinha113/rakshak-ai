import { useEffect, useRef, useState } from 'react'
import { parseCommand, detectEmergencyType } from './voice/parser'
import type { Location, EmergencyType } from './types/emergency'
import type { Guardian } from './types/guardian'
import { getFirstAid } from './ai/firstAidAI'
import type { FirstAidResponse } from './ai/firstAidAI'
import {
  startEmergency,
  cancelEmergency,
  hospital,
  police,
} from './actions/actions'
import { getGuardians, saveGuardians } from './utils/guardianStorage'
import { sendAutoCloudAlert } from './services/smsService'
import { requestWakeLock, releaseWakeLock } from './utils/wakeLock'
import {
  triggerDirectWhatsApp,
  triggerDirectSMS,
  formatPhoneWithCountryCode,
  getWhatsAppDeepLink,
  getSMSDeepLink,
} from './utils/whatsapp'
import GuardianSettings from './components/GuardianSettings'

export default function App() {
  const [isEmergency, setIsEmergency] = useState(false)
  const [currentEmergencyType, setCurrentEmergencyType] = useState<EmergencyType | null>(null)
  const [firstAid, setFirstAid] = useState<FirstAidResponse | null>(null)
  const [status, setStatus] = useState('🛡️ Rakshak 24/7 Shield Active')
  const [location, setLocation] = useState<Location | null>(null)

  const [guardians, setGuardians] = useState<Guardian[]>(getGuardians())
  const [showSettings, setShowSettings] = useState(false)

  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownIntervalRef = useRef<any>(null)

  const recognitionRef = useRef<any>(null)
  const locationRef = useRef<Location | null>(null)
  const isListeningRef = useRef(false)
  const isEmergencyRef = useRef(false)
  const guardiansRef = useRef<Guardian[]>(guardians)

  useEffect(() => {
    locationRef.current = location
  }, [location])

  useEffect(() => {
    isEmergencyRef.current = isEmergency
  }, [isEmergency])

  useEffect(() => {
    guardiansRef.current = guardians
  }, [guardians])

  const handleGuardiansUpdate = (updated: Guardian[]) => {
    setGuardians(updated)
    saveGuardians(updated)
  }

  useEffect(() => {
    requestWakeLock()

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        },
        () => console.log('Location denied')
      )
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = false
      recognition.lang = 'en-IN'

      recognition.onresult = async (event: any) => {
        const transcript =
          event.results[event.results.length - 1][0].transcript
            .toLowerCase()
            .trim()

        console.log('Heard:', transcript)
        const command = parseCommand(transcript)

        if (command === 'SAFE') {
          handleSafe()
          return
        }

        if (command === 'EMERGENCY') {
          const type = detectEmergencyType(transcript)
          triggerAutonomousEmergency(type)
          return
        }
      }

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') setStatus('🛡️ Shield Active')
      }

      recognition.onend = () => {
        if (isListeningRef.current) {
          try {
            recognition.start()
          } catch {}
        }
      }
    }

    return () => {
      releaseWakeLock()
      clearInterval(countdownIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    let lastX = 0, lastY = 0, lastZ = 0
    let lastUpdate = 0

    const handleMotion = (event: DeviceMotionEvent) => {
      if (isEmergencyRef.current) return

      const acc = event.accelerationIncludingGravity
      if (!acc) return

      const curTime = Date.now()
      if (curTime - lastUpdate > 100) {
        const diffTime = curTime - lastUpdate
        lastUpdate = curTime

        const x = acc.x || 0
        const y = acc.y || 0
        const z = acc.z || 0

        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000

        if (speed > 1600 && !isEmergencyRef.current) {
          triggerAutonomousEmergency('ROAD_ACCIDENT')
        }

        lastX = x
        lastY = y
        lastZ = z
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => {
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [])

  const triggerAutonomousEmergency = async (type: EmergencyType) => {
    setIsEmergency(true)
    setCurrentEmergencyType(type)
    setStatus(`⚠️ CRITICAL EMERGENCY DETECTED`)

    const aid = await startEmergency(type, locationRef.current)
    setFirstAid(aid || getFirstAid(type))

    setCountdown(10)
    clearInterval(countdownIntervalRef.current)

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          executeAutonomousDispatch(type)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const sendGuardianWhatsApp = () => {
    const primary = guardiansRef.current.find((g) => g.isPrimary) || guardiansRef.current[0]
    const targetPhone = formatPhoneWithCountryCode(primary?.phone || '919876543210')
    const loc = locationRef.current

    const msg = `🚨 EMERGENCY ALERT FROM RAKSHAK AI!\n\nI fell down / met with an accident and I am UNRESPONSIVE!\n\n📍 My Live Location:\n${loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : 'Location Unavailable'}\n\nSent automatically via Rakshak AI Safety App.`

    triggerDirectWhatsApp(targetPhone, msg)
  }

  const sendGuardianSMS = () => {
    const primary = guardiansRef.current.find((g) => g.isPrimary) || guardiansRef.current[0]
    const targetPhone = formatPhoneWithCountryCode(primary?.phone || '919876543210')
    const loc = locationRef.current

    const msg = `🚨 EMERGENCY ALERT FROM RAKSHAK AI!\nVictim UNRESPONSIVE.\nLocation: ${loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : 'N/A'}`

    triggerDirectSMS(targetPhone, msg)
  }

  const executeAutonomousDispatch = async (type: EmergencyType) => {
    await sendAutoCloudAlert(guardiansRef.current, locationRef.current, type)
    sendGuardianWhatsApp()
    sendGuardianSMS()

    setTimeout(() => {
      window.location.href = 'tel:102'
    }, 2000)
  }

  const handleSafe = () => {
    clearInterval(countdownIntervalRef.current)
    setCountdown(null)
    setIsEmergency(false)
    setCurrentEmergencyType(null)
    setFirstAid(null)
    setStatus('🛡️ Rakshak 24/7 Shield Active')
    cancelEmergency()
  }

  const primaryContact = guardians.find((g) => g.isPrimary) || guardians[0]
  const emergencyMsg = `🚨 EMERGENCY ALERT FROM RAKSHAK AI!\nVictim UNRESPONSIVE!\nLocation: ${
    location ? `https://maps.google.com/?q=${location.lat},${location.lng}` : 'Unavailable'
  }`

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-6 transition-all duration-500 ${
        isEmergency ? 'bg-red-600' : 'bg-gray-950'
      }`}
    >
      <div className='relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl'>
        {!isEmergency && (
          <button
            onClick={() => setShowSettings(true)}
            className='absolute right-6 top-6 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200'
          >
            ⚙️ Contacts
          </button>
        )}

        <div
          className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${
            isEmergency ? 'bg-red-100' : 'bg-green-100'
          }`}
        >
          <span className='text-4xl'>{isEmergency ? '🚨' : '🛡️'}</span>
        </div>

        <h1 className='mb-2 text-3xl font-bold text-gray-900'>Rakshak AI</h1>

        {!isEmergency && (
          <div className='inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 mb-4'>
            <span className='h-2 w-2 rounded-full bg-green-500 animate-ping'></span>
            24/7 Auto Fall & Crash Guard Active
          </div>
        )}

        <p className='mb-4 text-gray-600'>{status}</p>

        {isEmergency && (
          <div className='mb-4 rounded-2xl bg-red-100 p-4 text-red-900 animate-pulse border-2 border-red-400'>
            <p className='text-xs font-black uppercase tracking-wider text-red-600'>
              AUTOMATIC EMERGENCY PROTOCOL ({currentEmergencyType?.replace(/_/g, ' ') || 'TRAUMA'})
            </p>
            <p className='text-2xl font-black my-1'>
              {countdown !== null && countdown > 0
                ? `Auto-Dispatch in ${countdown}s`
                : '✅ Emergency Dispatched'}
            </p>
          </div>
        )}

        {!isEmergency ? (
          <div className='space-y-2'>
            <button
              onClick={() => triggerAutonomousEmergency('ROAD_ACCIDENT')}
              className='w-full rounded-2xl bg-red-600 px-5 py-3.5 font-semibold text-white shadow-lg hover:bg-red-700'
            >
              🚨 Simulate Crash / Drop (Auto Demo)
            </button>

            <button
              onClick={() => {
                isListeningRef.current = true
                recognitionRef.current?.start()
                setStatus('🎤 Voice Shield Active')
              }}
              className='w-full rounded-2xl bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800'
            >
              🎤 Activate Voice Guard
            </button>
          </div>
        ) : (
          <div className='space-y-3 text-left'>
            {firstAid && (
              <div className='rounded-2xl bg-gray-50 p-4'>
                <p className='mb-2 font-semibold text-gray-900'>
                  🩹 Emergency First Aid AI
                </p>
                <ol className='list-decimal space-y-1 pl-5 text-sm text-gray-700'>
                  {firstAid.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}

            <button
              onClick={handleSafe}
              className='w-full rounded-2xl bg-blue-600 px-5 py-3.5 font-semibold text-white hover:bg-blue-700 shadow-md'
            >
              ✅ I Am Safe (Abort Emergency)
            </button>

            <button
              onClick={sendGuardianWhatsApp}
              className='w-full rounded-2xl bg-green-600 px-5 py-3.5 font-semibold text-white hover:bg-green-700 shadow-md text-center'
            >
              📲 Open Direct WhatsApp ({getWhatsAppDeepLink(primaryContact?.phone || '', emergencyMsg) ? 'App' : ''})
            </button>

            <button
              onClick={sendGuardianSMS}
              className='w-full rounded-2xl bg-purple-600 px-5 py-3.5 font-semibold text-white hover:bg-purple-700 shadow-md text-center'
            >
              💬 Send Phone SMS ({getSMSDeepLink(primaryContact?.phone || '', emergencyMsg) ? 'Offline' : ''})
            </button>

            <button
              onClick={() => {
                window.location.href = 'tel:102'
              }}
              className='w-full rounded-2xl bg-red-700 px-5 py-3.5 font-semibold text-white hover:bg-red-800 text-center'
            >
              🚑 Direct Call Ambulance (102)
            </button>

            <div className='grid grid-cols-2 gap-2'>
              <button
                onClick={() => hospital(location)}
                className='rounded-2xl bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-700'
              >
                🏥 Find Hospital
              </button>

              <button
                onClick={() => police(location)}
                className='rounded-2xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700'
              >
                🚓 Find Police
              </button>
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