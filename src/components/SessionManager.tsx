import { useState, useEffect } from 'react'
import { listSessions, deleteSession, type SavedSession } from '../lib/sessions'

interface Props {
  onLoad: (session: SavedSession) => void
}

export function SessionManager({ onLoad }: Props) {
  const [sessions, setSessions] = useState<SavedSession[]>([])

  useEffect(() => {
    setSessions(listSessions())
  }, [])

  if (sessions.length === 0) return null

  const handleDelete = (id: string) => {
    deleteSession(id)
    setSessions(listSessions())
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Saved Sessions</h3>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-800">{s.siteName}</p>
              <p className="text-xs text-gray-400">{fmt(s.savedAt)}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => onLoad(s)}
                className="text-sm px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Load
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="text-sm px-3 py-1 border border-gray-300 text-gray-500 rounded-md hover:bg-gray-50 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
