import { create } from 'zustand';
import type { AnalysisResult, MoodType, Parakeet, Recording, User } from '../types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;

  // Parakeets
  parakeets: Parakeet[];
  setParakeets: (parakeets: Parakeet[]) => void;
  addParakeet: (parakeet: Parakeet) => void;
  updateParakeet: (parakeet: Parakeet) => void;
  removeParakeet: (id: string) => void;

  // Recordings
  recordings: Recording[];
  setRecordings: (recordings: Recording[]) => void;
  addRecording: (recording: Recording) => void;

  // Analysis
  latestAnalysis: AnalysisResult | null;
  setLatestAnalysis: (analysis: AnalysisResult | null) => void;

  // Recording state
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  recordingDuration: number;
  setRecordingDuration: (duration: number) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  parakeets: [],
  setParakeets: (parakeets) => set({ parakeets }),
  addParakeet: (parakeet) =>
    set((state) => ({ parakeets: [parakeet, ...state.parakeets] })),
  updateParakeet: (parakeet) =>
    set((state) => ({
      parakeets: state.parakeets.map((p) => (p.id === parakeet.id ? parakeet : p)),
    })),
  removeParakeet: (id) =>
    set((state) => ({
      parakeets: state.parakeets.filter((p) => p.id !== id),
    })),

  recordings: [],
  setRecordings: (recordings) => set({ recordings }),
  addRecording: (recording) =>
    set((state) => ({ recordings: [recording, ...state.recordings] })),

  latestAnalysis: null,
  setLatestAnalysis: (analysis) => set({ latestAnalysis: analysis }),

  isRecording: false,
  setIsRecording: (isRecording) => set({ isRecording }),
  recordingDuration: 0,
  setRecordingDuration: (recordingDuration) => set({ recordingDuration }),
}));

export const MOOD_CONFIG: Record<
  MoodType,
  { color: string; icon: string }
> = {
  happy: { color: '#4CAF50', icon: 'sentiment-very-satisfied' },
  relaxed: { color: '#2196F3', icon: 'spa' },
  stressed: { color: '#FF9800', icon: 'warning' },
  scared: { color: '#F44336', icon: 'flash-on' },
  sick: { color: '#9C27B0', icon: 'local-hospital' },
  neutral: { color: '#607D8B', icon: 'remove-circle-outline' },
};
