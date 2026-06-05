import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DriveSession } from "./types";

const SESSIONS_KEY = "safedrive_sessions";
const INTERRUPTED_KEY = "safedrive_interrupted";

export async function saveSession(session: DriveSession): Promise<void> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  const sessions: DriveSession[] = raw ? JSON.parse(raw) : [];
  sessions.push(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function getSessions(): Promise<DriveSession[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getSessionById(id: string): Promise<DriveSession | null> {
  const sessions = await getSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export async function saveInterruptedSession(
  session: DriveSession,
): Promise<void> {
  await AsyncStorage.setItem(INTERRUPTED_KEY, JSON.stringify(session));
}

export async function getInterruptedSession(): Promise<DriveSession | null> {
  const raw = await AsyncStorage.getItem(INTERRUPTED_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearInterruptedSession(): Promise<void> {
  await AsyncStorage.removeItem(INTERRUPTED_KEY);
}

export async function deleteAllSessions(): Promise<void> {
  await AsyncStorage.removeItem(SESSIONS_KEY);
}
