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
} from './utils/whatsapp'
import {
  sendTelegramAlert,
  sendTelegramLocationAlert,
} from './services/telegramService'
import GuardianSettings from './components/GuardianSettings'

export default function App() {
  const [isEmergency, setIsEmergency] = useState(false)
  const [currentEmergencyType, setCurrentEmergencyType] =
    useState<EmergencyType | null>(null)
  const [firstAid, setFirstAid] = useState<FirstAidResponse | null>(null)
  const [status, setStatus] = useState('🛡️ Rakshak 24/7 Shield Active')
  const [location, setLocation] = useState<Location | null>(null)

  const [telegramSent, setTelegramSent] = useState<boolean | null>(null)

  const [guardians, setGuardians] = useState<Guardian[]>(getGuardians())
  const [showSettings, setShowSettings] = useState(false)

  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)

  const recognitionRef = useRef<any>(null)
  const locationRef = useRef<Location | null>(null)
  const guardiansRef = useRef<Guardian[]>(guardians)
  const isListeningRef = useRef(false)
  const isEmergencyRef = useRef(false)
  const hasDispatchedRef = useRef(false)

  useEffect(() => {
    locationRef.current = location
  }, [location])

  useEffect(() => {
    guardiansRef.current = guardians
  }, [guardians])

  useEffect(() => {
    isEmergencyRef.current = isEmergency
  }, [isEmergency])

  const handleGuardiansUpdate = (updated: Guardian[]) => {
    setGuardians(updated)
    saveGuardians(updated)
  }

  // Setup: WakeLock + Location + SpeechRecognition (voice guard)
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
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setStatus('Speech recognition not supported')
      return () => {
        releaseWakeLock()
      }
    }

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
        triggerEmergency(type, 'VOICE')
        return
      }

      if (command === 'HOSPITAL') {
        hospital(locationRef.current)
        return
      }

      if (command === 'POLICE') {
        police(locationRef.current)
        return
      }
    }

    recognition.onerror = () => {
      // keep silent
    }

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start()
        } catch {}
      }
    }

    return () => {
      releaseWakeLock()
      if (countdownIntervalRef.current) {
        window.clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      try {
        recognition.stop()
      } catch {}
    }
  }, [])

  // Always-on fall/crash detection (DeviceMotion)
  useEffect(() => {
    let lastX = 0,
      lastY = 0,
      lastZ = 0
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

        const speed =
          (Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime) * 10000

        // threshold tweakable
        if (speed > 1600 && !isEmergencyRef.current) {
          triggerEmergency('ROAD_ACCIDENT', 'FALL_SENSOR')
        }

        lastX = x
        lastY = y
        lastZ = z
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [])

  const triggerEmergency = async (type: EmergencyType, source: string) => {
    if (isEmergencyRef.current) return

    hasDispatchedRef.current = false
    setTelegramSent(null)

    setIsEmergency(true)
    setCurrentEmergencyType(type)
    setStatus(`⚠️ EMERGENCY DETECTED (${source})`)

    const aid = await startEmergency(type, locationRef.current)
    setFirstAid(aid || getFirstAid(type))

    // countdown
    setCountdown(10)
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    countdownIntervalRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return prev
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            window.clearInterval(countdownIntervalRef.current)
            countdownIntervalRef.current = null
          }
          void executeAutonomousDispatch(type)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const executeAutonomousDispatch = async (type: EmergencyType) => {
    if (hasDispatchedRef.current) return
    hasDispatchedRef.current = true

    const loc = locationRef.current

    // 1) Telegram (AUTO SEND - zero click)
    try {
      let ok = false
      if (loc) ok = await sendTelegramLocationAlert(loc.lat, loc.lng, type)
      else
        ok = await sendTelegramAlert(
          `🚨 EMERGENCY ALERT - RAKSHAK AI\n\nType: ${type}\nLocation: Unavailable`
        )
      setTelegramSent(ok)
    } catch {
      setTelegramSent(false)
    }

    // 2) Cloud webhook backup (optional)
    try {
      await sendAutoCloudAlert(guardiansRef.current, loc, type)
    } catch {}

    // 3) WhatsApp/SMS intentionally OFF (feature flag in utils/whatsapp.ts)
    // (Kept for future, but not triggered now)
    // handleSendWhatsApp()
    // handleSendSMS()

    // 4) Optional: open dialer (not auto-sending call; user will tap)
    setStatus('✅ Telegram alert sent (if configured). Tap call if needed.')
  }

  // Kept for future use (WhatsApp disabled via feature flag)
  const handleSendWhatsApp = () => {
    const primary =
      guardiansRef.current.find((g) => g.isPrimary) || guardiansRef.current[0]
    const targetPhone = formatPhoneWithCountryCode(primary?.phone || '')
    const loc = locationRef.current

    const msg = `🚨 EMERGENCY ALERT FROM RAKSHAK AI!

Victim may be unresponsive.

📍 Live Location:
${loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : 'N/A'}`
    triggerDirectWhatsApp(targetPhone, msg)
  }

  // Kept for future use (SMS)
  const handleSendSMS = () => {
    const primary =
      guardiansRef.current.find((g) => g.isPrimary) || guardiansRef.current[0]
    const targetPhone = formatPhoneWithCountryCode(primary?.phone || '')
    const loc = locationRef.current

    const msg = `🚨 RAKSHAK AI EMERGENCY!
Location: ${loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : 'N/A'}`
    triggerDirectSMS(targetPhone, msg)
  }

  // Prevent TS6133 unused errors (we keep them for future)
  void handleSendWhatsApp
  void handleSendSMS

  const handleSafe = () => {
    isListeningRef.current = false
    hasDispatchedRef.current = false

    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }

    setCountdown(null)
    setTelegramSent(null)
    setIsEmergency(false)
    setCurrentEmergencyType(null)
    setFirstAid(null)
    setStatus('🛡️ Rakshak 24/7 Shield Active')
    cancelEmergency()
  }

  const activateVoiceGuard = () => {
    try {
      isListeningRef.current = true
      recognitionRef.current?.start()
      setStatus('🎤 Voice Guard Active (Speak)')
    } catch {
      setStatus('🎤 Voice Guard already active')
    }
  }

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
            Auto Fall & Crash Guard Active
          </div>
        )}

        <p className='mb-4 text-gray-600'>{status}</p>

        {isEmergency && (
          <div className='mb-4 rounded-2xl bg-red-100 p-4 text-red-900 border-2 border-red-300'>
            <p className='text-xs font-black uppercase tracking-wider text-red-700'>
              EMERGENCY PROTOCOL ({currentEmergencyType?.replace(/_/g, ' ')})
            </p>
            <p className='mt-1 text-2xl font-black'>
              {countdown !== null && countdown > 0
                ? `Auto-Dispatch in ${countdown}s`
                : 'Dispatch complete'}
            </p>

            {countdown === 0 && (
              <div
                className={`mt-2 rounded-xl px-3 py-1 text-xs font-bold ${
                  telegramSent === true
                    ? 'bg-green-200 text-green-900'
                    : telegramSent === false
                      ? 'bg-yellow-200 text-yellow-900'
                      : 'bg-gray-200 text-gray-800'
                }`}
              >
                {telegramSent === true
                  ? '✅ Telegram auto alert SENT'
                  : telegramSent === false
                    ? '⚠️ Telegram FAILED (check Token/Chat ID in settings)'
                    : '...'}
              </div>
            )}
          </div>
        )}

        {!isEmergency ? (
          <div className='space-y-2'>
            <button
              onClick={() => triggerEmergency('ROAD_ACCIDENT', 'DEMO')}
              className='w-full rounded-2xl bg-red-600 px-5 py-3.5 font-semibold text-white shadow-lg hover:bg-red-700'
            >
              🚨 Simulate Crash / Drop (Demo)
            </button>

            <button
              onClick={activateVoiceGuard}
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
              ✅ I Am Safe (Abort)
            </button>

            <button
              onClick={() => {
                window.location.href = 'tel:102'
              }}
              className='w-full rounded-2xl bg-red-700 px-5 py-3.5 font-semibold text-white hover:bg-red-800 text-center'
            >
              🚑 Call Ambulance (102)
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

            {location && (
              <div className='mt-2 rounded-2xl bg-gray-100 p-2.5 text-center text-xs text-gray-600'>
                📍 GPS: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            )}
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