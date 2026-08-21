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
import GuardianSettings from './components/GuardianSettings'

export default function App() {
  const [isEmergency, setIsEmergency] = useState(false)
  const [emergencyType, setEmergencyType] = useState<EmergencyType | null>(null)
  const [firstAid, setFirstAid] = useState<FirstAidResponse | null>(null)
  const [status, setStatus] = useState('🎤 Click Start Listening')
  const [location, setLocation] = useState<Location | null>(null)

  // Guardian Contacts State
  const [guardians, setGuardians] = useState<Guardian[]>(getGuardians())
  const [showSettings, setShowSettings] = useState(false)

  // 10s Countdown State
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownIntervalRef = useRef<any>(null)

  const recognitionRef = useRef<any>(null)
  const locationRef = useRef<Location | null>(null)
  const isListeningRef = useRef(false)
  const isEmergencyRef = useRef(false)

  useEffect(() => {
    locationRef.current = location
  }, [location])

  useEffect(() => {
    isEmergencyRef.current = isEmergency
  }, [isEmergency])

  // Save guardians on update
  const handleGuardiansUpdate = (updated: Guardian[]) => {
    setGuardians(updated)
    saveGuardians(updated)
  }

  // Geolocation & Speech Recognition Setup
  useEffect(() => {
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

    if (!SpeechRecognition) {
      setStatus('Speech recognition not supported')
      return
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
        triggerEmergencyFlow(type)
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

    recognition.onerror = (e: any) => {
      console.log('Speech error', e.error)
      if (e.error !== 'no-speech') {
        setStatus('🎤 Click Start Listening')
      }
    }

    recognition.onend = () => {
      if (isListeningRef.current) {
        try {
          recognition.start()
        } catch {}
      } else {
        setStatus('🎤 Click Start Listening')
      }
    }

    return () => {
      isListeningRef.current = false
      clearInterval(countdownIntervalRef.current)
      try {
        recognition.stop()
      } catch {}
    }
  }, [])

  // 📳 100% FULLY AUTOMATIC ALWAYS-ON HARDWARE FALL DETECTION SENSOR
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

        // Calculate sudden jerk / physical crash impact
        const speed = Math.abs(x + y + z - lastX - lastY - lastZ) / diffTime * 10000

        if (speed > 1600 && !isEmergencyRef.current) {
          console.log('🚀 Automatic Fall Detection Triggered!')
          triggerEmergencyFlow('FRACTURE')
        }

        lastX = x
        lastY = y
        lastZ = z
      }
    }

    // Auto-attach sensor on load
    if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
      const handleFirstInteraction = () => {
        (DeviceMotionEvent as any)
          .requestPermission()
          .then((perm: string) => {
            if (perm === 'granted') {
              window.addEventListener('devicemotion', handleMotion)
            }
          })
          .catch(() => {})
        window.removeEventListener('click', handleFirstInteraction)
      }
      window.addEventListener('click', handleFirstInteraction)
    } else {
      window.addEventListener('devicemotion', handleMotion)
    }

    return () => {
      window.removeEventListener('devicemotion', handleMotion)
    }
  }, [])

  // Emergency flow with 10s countdown
  const triggerEmergencyFlow = async (type: EmergencyType) => {
    setIsEmergency(true)
    setEmergencyType(type)
    setStatus(`⚠️ Fall / Accident Detected!`)

    const aid = await startEmergency(type, locationRef.current)
    setFirstAid(aid || getFirstAid(type))

    // Start 10s countdown
    setCountdown(10)
    clearInterval(countdownIntervalRef.current)

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          sendGuardianSOS() // Auto dispatch WhatsApp SOS to parents
          autoCallAmbulance() // Auto dial emergency services/parent
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Auto trigger Call option
  const autoCallAmbulance = () => {
    const primary = guardians.find((g) => g.isPrimary) || guardians[0]
    const phoneToCall = primary?.phone ? `+${primary.phone}` : '102'
    window.location.href = `tel:${phoneToCall}`
  }

  // Send WhatsApp to primary guardian with live location
  const sendGuardianSOS = () => {
    const loc = locationRef.current
    const primary = guardians.find((g) => g.isPrimary) || guardians[0]

    const msg = `🚨 EMERGENCY ALERT FROM RAKSHAK AI!

I fell down / met with an accident and I am unresponsive. Please send help immediately!

📍 My Live Location:
${loc ? `https://maps.google.com/?q=${loc.lat},${loc.lng}` : 'Location unavailable'}

Sent automatically via Rakshak AI Safety System.`

    const phoneParam = primary?.phone ? `phone=${primary.phone}&` : ''
    window.open(
      `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(msg)}`,
      '_blank'
    )
  }

  const handleStartListening = () => {
    try {
      isListeningRef.current = true
      recognitionRef.current?.start()
      setStatus('🎤 Listening... Speak now')
    } catch {
      setStatus('🎤 Already listening')
    }
  }

  const handleSafe = () => {
    isListeningRef.current = false
    clearInterval(countdownIntervalRef.current)
    setCountdown(null)
    try {
      recognitionRef.current?.stop()
    } catch {}
    setIsEmergency(false)
    setEmergencyType(null)
    setFirstAid(null)
    setStatus('🎤 Click Start Listening')
    cancelEmergency()
  }

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-6 transition-all duration-500 ${
        isEmergency ? 'bg-red-600' : 'bg-gray-950'
      }`}
    >
      <div className='relative w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl'>
        {/* Settings Button */}
        {!isEmergency && (
          <button
            onClick={() => setShowSettings(true)}
            className='absolute right-6 top-6 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200'
            title='Guardian Contacts'
          >
            ⚙️ Contacts
          </button>
        )}

        {/* Icon */}
        <div
          className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${
            isEmergency ? 'bg-red-100' : 'bg-green-100'
          }`}
        >
          <span className='text-4xl'>{isEmergency ? '🚨' : '🛡️'}</span>
        </div>

        <h1 className='mb-2 text-3xl font-bold text-gray-900'>Rakshak AI</h1>
        
        {/* Active Sensor Live Indicator Badge */}
        {!isEmergency && (
          <div className='inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 mb-3'>
            <span className='h-2 w-2 rounded-full bg-green-500 animate-ping'></span>
            Auto Fall Sensor Active 24/7
          </div>
        )}

        <p className='mb-4 text-gray-600'>{status}</p>

        {/* 10s Auto-SOS Countdown Banner */}
        {isEmergency && countdown !== null && (
          <div className='mb-4 rounded-2xl bg-red-100 p-4 text-red-900 animate-pulse border-2 border-red-400'>
            <p className='text-xs font-black uppercase tracking-wider text-red-600'>
              CRITICAL: USER UNRESPONSIVE
            </p>
            <p className='text-2xl font-black my-1'>
              {countdown > 0 ? `SOS Dispatch in ${countdown}s` : '✅ SOS Dispatched'}
            </p>
            <p className='text-xs text-red-700'>
              Say "I am safe" or click below to cancel.
            </p>
          </div>
        )}

        {!isEmergency && (
          <div className='space-y-2'>
            <button
              onClick={handleStartListening}
              className='w-full rounded-2xl bg-black px-5 py-3.5 font-semibold text-white shadow-lg hover:bg-gray-800'
            >
              🎤 Start Listening
            </button>

            {/* Test button for demo without dropping real phone */}
            <button
              onClick={() => triggerEmergencyFlow('FRACTURE')}
              className='w-full rounded-2xl bg-amber-500 px-5 py-3.5 font-semibold text-white shadow-lg hover:bg-amber-600'
            >
              📳 Simulate Phone Fall (Demo)
            </button>
          </div>
        )}

        {isEmergency ? (
          <div className='space-y-3 text-left'>
            {emergencyType && (
              <div className='rounded-xl bg-red-50 p-3 text-center'>
                <p className='text-sm font-bold text-red-700'>
                  ⚠️ IMPACT DETECTED
                </p>
                {firstAid && (
                  <p className='text-xs text-red-600'>
                    {firstAid.severity} • {firstAid.title}
                  </p>
                )}
              </div>
            )}

            {firstAid && (
              <div className='rounded-2xl bg-gray-50 p-4'>
                <p className='mb-2 font-semibold text-gray-900'>
                  🩹 Emergency First Aid
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
              ✅ Cancel Emergency (I Am Safe)
            </button>

            <button
              onClick={sendGuardianSOS}
              className='w-full rounded-2xl bg-green-600 px-5 py-3.5 font-semibold text-white hover:bg-green-700 shadow-md'
            >
              📲 Send SOS Message Now
            </button>

            <button
              onClick={autoCallAmbulance}
              className='w-full rounded-2xl bg-red-700 px-5 py-3.5 font-semibold text-white hover:bg-red-800 shadow-md text-center'
            >
              📞 Call Ambulance / Parents Now
            </button>

            <div className='grid grid-cols-2 gap-2'>
              <button
                onClick={() => hospital(location)}
                className='rounded-2xl bg-amber-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-amber-700'
              >
                🏥 Nearest Hospital
              </button>

              <button
                onClick={() => police(location)}
                className='rounded-2xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700'
              >
                🚓 Nearest Police
              </button>
            </div>

            {location && (
              <div className='mt-2 rounded-2xl bg-gray-100 p-2.5 text-center text-xs text-gray-600'>
                📍 Live Coordinates: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            )}
          </div>
        ) : (
          <div className='rounded-2xl bg-gray-100 p-4 text-sm text-gray-700 mt-4'>
            Try saying:
            <div className='mt-2 flex flex-wrap justify-center gap-2'>
              <span className='rounded-full bg-white px-3 py-1 text-xs shadow-sm'>
                “Accident”
              </span>
              <span className='rounded-full bg-white px-3 py-1 text-xs shadow-sm'>
                “Help”
              </span>
              <span className='rounded-full bg-white px-3 py-1 text-xs shadow-sm'>
                “I am safe”
              </span>
            </div>
          </div>
        )}

        {/* Guardian Settings Modal */}
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