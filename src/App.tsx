import { useEffect, useRef, useState } from 'react'
import { parseCommand, detectEmergencyType } from './voice/parser'
import type { Location, EmergencyType } from './types/emergency'
import { getFirstAid } from './ai/firstAidAI'
import type { FirstAidResponse } from './ai/firstAidAI'
import {
  startEmergency,
  cancelEmergency,
  hospital,
  police,
  sendSOS,
} from './actions/actions'

export default function App() {
  const [isEmergency, setIsEmergency] = useState(false)
  const [emergencyType, setEmergencyType] = useState<EmergencyType | null>(null)
  const [firstAid, setFirstAid] = useState<FirstAidResponse | null>(null)
  const [status, setStatus] = useState('🎤 Click Start Listening')
  const [location, setLocation] = useState<Location | null>(null)

  const recognitionRef = useRef<any>(null)
  const locationRef = useRef<Location | null>(null)
  const isListeningRef = useRef(false)

  // sync location ref to avoid stale closure
  useEffect(() => {
    locationRef.current = location
  }, [location])

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
      setStatus('Speech not supported in this browser')
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
        isListeningRef.current = true // keep listening
        setIsEmergency(false)
        setEmergencyType(null)
        setFirstAid(null)
        setStatus('🎤 Click Start Listening')
        cancelEmergency()
        return
      }

      if (command === 'EMERGENCY') {
        const type = detectEmergencyType(transcript)
        setEmergencyType(type)
        setIsEmergency(true)
        setStatus(`🚨 ${type.replace(/_/g, ' ')} detected!`)

        const aid = await startEmergency(type, locationRef.current)
        if (aid) setFirstAid(aid)
        else setFirstAid(getFirstAid(type))
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

      if (command === 'SOS') {
        sendSOS(locationRef.current)
        return
      }

      if (command === 'FIRST_AID' && emergencyType) {
        const aid = getFirstAid(emergencyType)
        setFirstAid(aid)
      }
    }

    recognition.onerror = (e: any) => {
      console.log('Speech error', e.error)
      if (e.error !== 'no-speech') {
        setStatus('🎤 Click Start Listening')
      }
    }

    recognition.onend = () => {
      // auto restart if user was listening
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
      try {
        recognition.stop()
      } catch {}
    }
  }, [])

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
      <div className='w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-2xl'>
        <div
          className={`mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full ${
            isEmergency ? 'bg-red-100' : 'bg-green-100'
          }`}
        >
          <span className='text-4xl'>{isEmergency ? '🚨' : '🛡️'}</span>
        </div>

        <h1 className='mb-2 text-3xl font-bold text-gray-900'>Rakshak AI</h1>
        <p className='mb-6 text-gray-600'>{status}</p>

        {!isEmergency && (
          <button
            onClick={handleStartListening}
            className='mb-4 w-full rounded-2xl bg-black px-5 py-3 font-semibold text-white hover:bg-gray-800'
          >
            🎤 Start Listening
          </button>
        )}

        {isEmergency ? (
          <div className='space-y-3 text-left'>
            {emergencyType && (
              <div className='rounded-xl bg-red-50 p-3 text-center'>
                <p className='text-sm font-bold text-red-700'>
                  {emergencyType.replace(/_/g, ' ')}
                </p>
                {firstAid && (
                  <p className='text-xs text-red-600'>{firstAid.severity} • {firstAid.title}</p>
                )}
              </div>
            )}

            {firstAid && (
              <div className='rounded-2xl bg-gray-50 p-4'>
                <p className='mb-2 font-semibold text-gray-900'>🩹 {firstAid.title}</p>
                <ol className='list-decimal space-y-1 pl-5 text-sm text-gray-700'>
                  {firstAid.steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}

            <button
              onClick={handleSafe}
              className='w-full rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700'
            >
              ✅ I Am Safe
            </button>

            <button
              onClick={() => hospital(location)}
              className='w-full rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700'
            >
              🏥 Open Nearest Hospital
            </button>

            <button
              onClick={() => police(location)}
              className='w-full rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white'
            >
              🚓 Open Nearest Police
            </button>

            <button
              onClick={() => sendSOS(location)}
              className='w-full rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700'
            >
              📲 Send SOS via WhatsApp
            </button>

            {location && (
              <div className='mt-2 rounded-2xl bg-gray-100 p-3 text-center text-xs text-gray-700'>
                📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </div>
            )}
          </div>
        ) : (
          <div className='rounded-2xl bg-gray-100 p-4 text-sm text-gray-700'>
            Try saying:
            <div className='mt-2 flex flex-wrap justify-center gap-2'>
              <span className='rounded-full bg-white px-3 py-1'>Accident</span>
              <span className='rounded-full bg-white px-3 py-1'>Help</span>
              <span className='rounded-full bg-white px-3 py-1'>Chest pain</span>
              <span className='rounded-full bg-white px-3 py-1'>I am safe</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}