import { useState } from 'react'
import type { Guardian } from '../types/guardian'

interface Props {
  guardians: Guardian[]
  onUpdate: (updated: Guardian[]) => void
  onClose: () => void
}

export default function GuardianSettings({ guardians, onUpdate, onClose }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [relation, setRelation] = useState<Guardian['relation']>('Mom')

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    // Clean phone number (remove spaces/dashes)
    let cleanPhone = phone.replace(/[^0-9]/g, '')
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone // Default India prefix
    }

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
    onUpdate(
      guardians.map((g) => ({
        ...g,
        isPrimary: g.id === id,
      }))
    )
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'>
      <div className='w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl'>
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-xl font-bold text-gray-900'>🛡️ Emergency Guardians</h2>
          <button
            onClick={onClose}
            className='rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          >
            ✕
          </button>
        </div>

        {/* Add Form */}
        <form onSubmit={handleAdd} className='mb-5 space-y-3 rounded-2xl bg-gray-50 p-4'>
          <div className='flex gap-2'>
            <input
              type='text'
              placeholder='Contact Name (e.g. Papa)'
              value={name}
              onChange={(e) => setName(e.target.value)}
              className='flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none'
              required
            />
            <select
              value={relation}
              onChange={(e) => setRelation(e.target.value as any)}
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
              placeholder='Phone Number (10 digits)'
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

        {/* Contact List */}
        <div className='max-h-56 space-y-2 overflow-y-auto pr-1'>
          {guardians.length === 0 ? (
            <p className='py-4 text-center text-sm text-gray-500'>
              No emergency contacts added yet.
            </p>
          ) : (
            guardians.map((g) => (
              <div
                key={g.id}
                className={`flex items-center justify-between rounded-xl border p-3 ${
                  g.isPrimary
                    ? 'border-green-500 bg-green-50/50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div>
                  <div className='flex items-center gap-2'>
                    <span className='font-semibold text-gray-900'>{g.name}</span>
                    <span className='rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700'>
                      {g.relation}
                    </span>
                    {g.isPrimary && (
                      <span className='rounded-full bg-green-500 px-2 py-0.5 text-xs text-white'>
                        Primary
                      </span>
                    )}
                  </div>
                  <p className='text-xs text-gray-500'>+{g.phone}</p>
                </div>

                <div className='flex items-center gap-1'>
                  {!g.isPrimary && (
                    <button
                      onClick={() => setPrimary(g.id)}
                      className='rounded-lg px-2 py-1 text-xs text-blue-600 hover:bg-blue-50'
                    >
                      Make Primary
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

        <button
          onClick={onClose}
          className='mt-5 w-full rounded-2xl bg-gray-900 py-3 font-semibold text-white hover:bg-black'
        >
          Save & Done
        </button>
      </div>
    </div>
  )
}