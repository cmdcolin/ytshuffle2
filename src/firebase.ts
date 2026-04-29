import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
} from 'firebase/auth'
import {
  type DocumentData,
  type QueryDocumentSnapshot,
  doc,
  getDoc,
  getFirestore,
  increment,
  setDoc,
} from 'firebase/firestore/lite'

import { parsePlaylists } from './util'

import type { PlaylistConfig } from './util'
import type { User } from 'firebase/auth'

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
})

const auth = getAuth(app)
const db = getFirestore(app)
const googleProvider = new GoogleAuthProvider()

interface UserDoc {
  playlists: Record<string, PlaylistConfig>
  channels: Record<string, string>
}

function parseStringRecord(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  return Object.fromEntries(
    Object.entries(raw).filter(
      (e): e is [string, string] => typeof e[1] === 'string',
    ),
  )
}

const userConverter = {
  toFirestore(data: UserDoc): DocumentData {
    return data
  },
  fromFirestore(snap: QueryDocumentSnapshot): UserDoc {
    const raw = snap.data()
    return {
      channels: parseStringRecord(raw.channels),
      playlists: parsePlaylists(raw.playlists),
    }
  },
}

function parseNumberRecord(raw: DocumentData): Record<string, number> {
  return Object.fromEntries(
    Object.entries(raw).filter(
      (e): e is [string, number] => typeof e[1] === 'number',
    ),
  )
}

function userDoc(uid: string) {
  return doc(db, 'users', uid).withConverter(userConverter)
}

function playCountsDoc(uid: string) {
  return doc(db, 'userPlayCounts', uid)
}

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback)
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider)
}

export async function signOut() {
  await auth.signOut()
}

export async function loadUserData(uid: string) {
  const snap = await getDoc(userDoc(uid))
  return snap.exists() ? snap.data() : null
}

export async function saveUserData(uid: string, data: UserDoc) {
  await setDoc(userDoc(uid), data)
}

export async function loadPlayCounts(
  uid: string,
): Promise<Record<string, number>> {
  const snap = await getDoc(playCountsDoc(uid))
  return snap.exists() ? parseNumberRecord(snap.data()) : {}
}

export async function incrementPlayCount(uid: string, videoId: string) {
  await setDoc(playCountsDoc(uid), { [videoId]: increment(1) }, { merge: true })
}
