import type { ParsedFile } from './parser'
import type { ReviewState } from '../components/SampleReview'

export interface SavedSession {
  id: string // site name used as stable key
  siteName: string
  savedAt: string // ISO timestamp
  files: ParsedFile[]
  reviewState: ReviewState
}

const STORAGE_KEY = 'oslab_sessions'

function readStore(): Record<string, SavedSession> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, SavedSession>) : {}
  } catch {
    return {}
  }
}

function writeStore(store: Record<string, SavedSession>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

export function listSessions(): SavedSession[] {
  const store = readStore()
  return Object.values(store).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
  )
}

export function saveSession(files: ParsedFile[], reviewState: ReviewState): SavedSession {
  const store = readStore()
  const session: SavedSession = {
    id: reviewState.siteName,
    siteName: reviewState.siteName,
    savedAt: new Date().toISOString(),
    files,
    reviewState,
  }
  store[session.id] = session
  writeStore(store)
  return session
}

export function deleteSession(id: string): void {
  const store = readStore()
  delete store[id]
  writeStore(store)
}
