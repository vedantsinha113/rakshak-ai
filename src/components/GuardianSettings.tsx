import { useState } from 'react'
import type { Guardian } from '../types/guardian'
import { formatPhoneWithCountryCode } from '../utils/whatsapp'
import {
  saveTelegramConfig,
  getTelegramConfig,
  isTelegramConfigured,
} from '../utils/telegramStorage'
import { testTelegramConnection } from '../services/telegramService'

interface Props {
  guardians: Guardian[]
  onUpdate: (updated: Guardian[]) => void
  onClose: () => void
}

export default function GuardianSettings({
  guardians,
  onUpdate,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'telegram'>(
    'contacts'
  )

  // Contact form
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relation, setRelation] = useState<Guardian['relation']>('Mom')

  // Telegram form
  const savedConfig = getTelegramConfig()
  const [botToken, setBotToken] = useState(savedConfig.token)
  const [chatId, setChatId] = useState(savedConfig.chatId)
  const [testStatus, setTestStatus] = useState<
    'idle' | 'testing' | 'success' | 'failed'
  >('idle')
  const [telegramSaved, setTelegramSaved] = useState(
    isTelegramConfigured()
  )

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    const cleanPhone = formatPhoneWithCountryCode(phone)

    const newGuardian: Guardian = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: cleanPhone,
      relation,
      isPrimary: guardians.length === 0,
    }

    onUpdate([...guardians, newGuardian])
    setName('')
    setPhone('')
  }

  const handleDelete = (id: string) => {
    onUpdate(guardians.filter((g) => g.id !== id))
  }

  const setPrimary = (id: string) => {
    onUpdate(guardians.map((g) => ({ ...g, isPrimary: g.id === id })))
  }

  const handleSaveTelegram = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      alert('Please enter both Bot Token and Chat ID!')
      return
    }
    saveTelegramConfig(botToken.trim(), chatId.trim())
    setTelegramSaved(true)
    setTestStatus('idle')
  }

  const handleTestTelegram = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      alert('Save your Token and Chat ID first!')
      return
    }

    saveTelegramConfig(botToken.trim(), chatId.trim())
    setTestStatus('testing')

    const success = await testTelegramConnection()

    if (success) {
      setTestStatus('success')
      setTelegramSaved(true)
    } else {
      setTestStatus('failed')
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
      <div className='w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden'>
        {/* Header */}
        <div className='flex items-center justify-between p-5 border-b border-gray-100'>
          <h2 className='text-xl font-bold text-gray-900'>
            🛡️ Safety Settings
          </h2>
          <button
            onClick={onClose}
            className='rounded-full p-2 text-gray-400 hover:bg-gray-100'
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className='flex border-b border-gray-100'>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              activeTab === 'contacts'
                ? 'border-b-2 border-black text-black'
                : 'text-gray-400'
            }`}
          >
            📞 Emergency Contacts
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-3 text-sm font-semibold transition-all ${
              activeTab === 'telegram'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-400'
            }`}
          >
            ✈️ Telegram Alert{' '}
            {telegramSaved && (
              <span className='ml-1 text-green-500'>✓</span>
            )}
          </button>
        </div>

        <div className='p-5 max-h-[70vh] overflow-y-auto'>
          {/* CONTACTS TAB */}
          {activeTab === 'contacts' && (
            <div className='space-y-4'>
              <form
                onSubmit={handleAddContact}
                className='space-y-3 rounded-2xl bg-gray-50 p-4'
              >
                <div className='flex gap-2'>
                  <input
                    type='text'
                    placeholder='Name (e.g. Papa)'
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className='flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none'
                    required
                  />
                  <select
                    value={relation}
                    onChange={(e) =>
                      setRelation(e.target.value as Guardian['relation'])
                    }
                    className='rounded-xl border border-gray-300 px-2 py-2 text-sm focus:outline-none'
                  >
                    <option value='Mom'>Mom</option>
                    <option value='Dad'>Dad</option>
                    <option value='Friend'>Friend</option>
                    <option value='Doctor'>Doctor</option>
                    <option value='Other'>Other</option>
                  </select>
                </div>

                <div className='flex gap-2'>
                  <input
                    type='tel'
                    placeholder='Mobile Number (10 digits)'
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className='flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none'
                    required
                  />
                  <button
                    type='submit'
                    className='rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800'
                  >
                    + Add
                  </button>
                </div>
              </form>

              <div className='space-y-2'>
                {guardians.length === 0 ? (
                  <p className='py-4 text-center text-sm text-gray-500'>
                    No contacts added yet.
                  </p>
                ) : (
                  guardians.map((g) => (
                    <div
                      key={g.id}
                      className={`flex items-center justify-between rounded-xl border p-3 ${
                        g.isPrimary
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold text-gray-900'>
                            {g.name}
                          </span>
                          <span className='rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700'>
                            {g.relation}
                          </span>
                          {g.isPrimary && (
                            <span className='rounded-full bg-green-500 px-2 py-0.5 text-xs text-white'>
                              Primary
                            </span>
                          )}
                        </div>
                        <p className='text-xs text-gray-500'>
                          +{g.phone}
                        </p>
                      </div>

                      <div className='flex items-center gap-1'>
                        {!g.isPrimary && (
                          <button
                            onClick={() => setPrimary(g.id)}
                            className='rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50'
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(g.id)}
                          className='rounded-lg p-1.5 text-red-500 hover:bg-red-50'
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TELEGRAM TAB */}
          {activeTab === 'telegram' && (
            <div className='space-y-4'>
              {/* Step by Step Instructions */}
              <div className='rounded-2xl bg-blue-50 p-4 text-sm text-blue-900 space-y-3'>
                <p className='font-bold text-base'>
                  📖 How to Setup Telegram Auto-Alert
                </p>

                <div className='space-y-2'>
                  <p className='font-semibold'>
                    Step 1: Create Your Bot
                  </p>
                  <p className='text-xs'>
                    1. Open Telegram app on your phone
                  </p>
                  <p className='text-xs'>
                    2. Search:{' '}
                    <span className='font-bold bg-blue-100 px-1 rounded'>
                      @BotFather
                    </span>
                  </p>
                  <p className='text-xs'>
                    3. Send:{' '}
                    <span className='font-bold bg-blue-100 px-1 rounded'>
                      /newbot
                    </span>
                  </p>
                  <p className='text-xs'>
                    4. Give any name like:{' '}
                    <span className='font-bold'>RakshakAlert</span>
                  </p>
                  <p className='text-xs'>
                    5. Copy the{' '}
                    <span className='font-bold text-red-700'>
                      TOKEN
                    </span>{' '}
                    BotFather gives you
                  </p>
                </div>

                <div className='space-y-2'>
                  <p className='font-semibold'>Step 2: Get Chat ID</p>
                  <p className='text-xs'>
                    1. Search:{' '}
                    <span className='font-bold bg-blue-100 px-1 rounded'>
                      @userinfobot
                    </span>{' '}
                    in Telegram
                  </p>
                  <p className='text-xs'>
                    2. Send:{' '}
                    <span className='font-bold bg-blue-100 px-1 rounded'>
                      /start
                    </span>
                  </p>
                  <p className='text-xs'>
                    3. Copy your{' '}
                    <span className='font-bold text-red-700'>
                      ID number
                    </span>{' '}
                    shown
                  </p>
                  <p className='text-xs text-blue-700 font-semibold'>
                    💡 Tip: Parents ko bhi yahi steps karke apna Chat
                    ID dena hoga taaki unhe alert aaye!
                  </p>
                </div>

                <div className='space-y-2'>
                  <p className='font-semibold'>Step 3: Start Bot</p>
                  <p className='text-xs'>
                    1. Apne banaye hue bot ko Telegram me search karo
                  </p>
                  <p className='text-xs'>
                    2. Send:{' '}
                    <span className='font-bold bg-blue-100 px-1 rounded'>
                      /start
                    </span>
                  </p>
                  <p className='text-xs'>
                    3. Neeche Token aur Chat ID daalo aur Test karo!
                  </p>
                </div>
              </div>

              {/* Token Input */}
              <div className='space-y-3'>
                <div>
                  <label className='text-xs font-bold text-gray-700 mb-1 block'>
                    🤖 Bot Token (from BotFather)
                  </label>
                  <input
                    type='text'
                    placeholder='e.g. 7234567890:AAHxxxxxxxxxxxxx'
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    className='w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none font-mono'
                  />
                </div>

                <div>
                  <label className='text-xs font-bold text-gray-700 mb-1 block'>
                    💬 Your Chat ID (from @userinfobot)
                  </label>
                  <input
                    type='text'
                    placeholder='e.g. 123456789'
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    className='w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none font-mono'
                  />
                </div>

                {/* Test Status */}
                {testStatus === 'success' && (
                  <div className='rounded-xl bg-green-100 p-3 text-sm font-semibold text-green-800'>
                    ✅ Connected! Check your Telegram for a test
                    message!
                  </div>
                )}

                {testStatus === 'failed' && (
                  <div className='rounded-xl bg-red-100 p-3 text-sm font-semibold text-red-800'>
                    ❌ Failed! Check Token & Chat ID. Make sure you
                    sent /start to your bot first.
                  </div>
                )}

                {testStatus === 'testing' && (
                  <div className='rounded-xl bg-blue-100 p-3 text-sm font-semibold text-blue-800 animate-pulse'>
                    🔄 Testing connection...
                  </div>
                )}

                <button
                  onClick={handleTestTelegram}
                  disabled={testStatus === 'testing'}
                  className='w-full rounded-2xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50'
                >
                  {testStatus === 'testing'
                    ? '🔄 Testing...'
                    : '🧪 Test & Save Telegram Alert'}
                </button>

                <button
                  onClick={handleSaveTelegram}
                  className='w-full rounded-2xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-black'
                >
                  💾 Save Without Testing
                </button>

                {telegramSaved && (
                  <div className='rounded-xl bg-green-50 border border-green-300 p-3 text-center text-sm font-semibold text-green-800'>
                    ✅ Telegram Auto-Alert is Active!
                    <p className='text-xs font-normal mt-1 text-green-700'>
                      Emergency pe automatically Telegram message
                      jayega
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className='p-4 border-t border-gray-100'>
          <button
            onClick={onClose}
            className='w-full rounded-2xl bg-gray-900 py-3 font-semibold text-white hover:bg-black'
          >
            Done ✓
          </button>
        </div>
      </div>
    </div>
  )
}