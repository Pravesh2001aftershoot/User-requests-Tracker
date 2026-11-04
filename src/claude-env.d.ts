/**
 * The slice of the claude.ai Artifact runtime this app uses
 * (runtime contract 0.2.96). Outside claude.ai `window.claude` is absent.
 */

interface ClaudeDbError {
  code: string
  message: string
}

interface ClaudeDocSnapshot {
  id: string
  exists: boolean
  data(): Record<string, unknown> | undefined
  metadata: { fromCache: boolean; hasPendingWrites: boolean }
}

interface ClaudeQuerySnapshot {
  docs: ClaudeDocSnapshot[]
  size: number
  empty: boolean
  metadata: { fromCache: boolean; hasPendingWrites: boolean }
}

interface ClaudeDocRef {
  id: string
  path: string
  set(data: Record<string, unknown>): Promise<void>
  update(data: Record<string, unknown>): Promise<void>
  delete(): Promise<void>
}

interface ClaudeCollectionRef {
  doc(id: string): ClaudeDocRef
  onSnapshot(
    next: (snap: ClaudeQuerySnapshot) => void,
    error?: (e: ClaudeDbError) => void,
  ): () => void
}

interface ClaudeDb {
  collection(path: string): ClaudeCollectionRef
}

interface ClaudeUser {
  can(name: string): Promise<boolean | null>
  isOwner(): Promise<boolean>
}

interface ClaudeRuntime {
  use(name: "db"): Promise<ClaudeDb | null>
  use(name: "user"): Promise<ClaudeUser | null>
}

interface Window {
  claude?: ClaudeRuntime
}
