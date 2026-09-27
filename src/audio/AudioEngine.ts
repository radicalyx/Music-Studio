/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  InstrumentPreset,
  MidiNoteEvent,
  GuideTrackState,
  InstrumentTrackState,
  TransportState,
} from '../types/daw';
import { STARTER_PRESETS } from './presets';
import { InstrumentEngine } from './InstrumentEngine';
import { GuideTrackManager } from './GuideTrackManager';
import { Metronome } from './Metronome';

export interface AudioEngineListeners {
  onTransportUpdate: (state: TransportState) => void;
  onNotesUpdate: (notes: MidiNoteEvent[]) => void;
  onGuideTrackUpdate: (guide: GuideTrackState) => void;
  onInstrumentTrackUpdate: (inst: InstrumentTrackState) => void;
  onActiveNotesChange: (activeNotes: number[]) => void;
}

export class AudioEngine {
  public ctx: AudioContext;
  public masterGain: GainNode;
  public instrumentEngine: InstrumentEngine;
  public guideTrackManager: GuideTrackManager;
  public metronome: Metronome;

  // State
  public transport: TransportState = {
    bpm: 120,
    timeSignature: [4, 4],
    isPlaying: false,
    isRecording: false,
    isCountingIn: false,
    countInRemaining: 0,
    countInBars: 1, // 1 bar count-in default
    currentTime: 0,
    loopEnabled: false,
    loopStart: 0,
    loopEnd: 16,
    metronomeEnabled: false,
    metronomeVolume: 0.6,
  };

  public guideTrackState: GuideTrackState = {
    fileName: null,
    duration: 0,
    sampleRate: 44100,
    volume: 1.0,
    pan: 0,
    isMuted: false,
    isSolo: false,
    buffer: null,
    peaks: null,
  };

  public instrumentTrackState: InstrumentTrackState = {
    name: STARTER_PRESETS[0].name,
    volume: 1.0,
    pan: 0,
    isMuted: false,
    isSolo: false,
    isArmed: true, // Armed by default for recording!
  };

  // MIDI notes recorded/arranged
  public notes: MidiNoteEvent[] = [];
  public undoStack: MidiNoteEvent[][] = [];
  public redoStack: MidiNoteEvent[][] = [];

  // Active recorded notes being held down during record
  private recordingNotesMap: Map<number, { id: string; startTime: number; velocity: number }> = new Map();

  // Playback scheduling state
  private scheduledNoteIndices: Set<string> = new Set();
  private scheduledVoices: Map<string, { stopTime: number; note: number }> = new Map();
  private lastAudioContextTime = 0;
  private animFrameId: number | null = null;
  private lastMetronomeBeat = -1;

  // Listeners
  private listeners: AudioEngineListeners;

  constructor(listeners: AudioEngineListeners) {
    this.listeners = listeners;

    // Create AudioContext
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master Bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // Instrument Engine
    const instrumentBus = this.ctx.createGain();
    instrumentBus.connect(this.masterGain);
    this.instrumentEngine = new InstrumentEngine(this.ctx, STARTER_PRESETS[0], instrumentBus);

    // Guide Track Manager
    this.guideTrackManager = new GuideTrackManager(this.ctx, this.masterGain);

    // Metronome
    this.metronome = new Metronome(this.ctx, this.masterGain);
    this.metronome.enabled = this.transport.metronomeEnabled;
    this.metronome.setVolume(this.transport.metronomeVolume);

    // Start UI update animation loop
    this.startTransportLoop();
  }

  public async resumeAudioContext() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // Preset update
  public setPreset(preset: InstrumentPreset) {
    this.instrumentEngine.updatePreset(preset);
    this.instrumentTrackState.name = preset.name;
    this.listeners.onInstrumentTrackUpdate({ ...this.instrumentTrackState });
  }

  // Guide track load
  public async loadGuideFile(file: File) {
    await this.resumeAudioContext();
    const result = await this.guideTrackManager.loadAudioFile(file);
    this.guideTrackState = {
      ...this.guideTrackState,
      fileName: file.name,
      duration: result.duration,
      sampleRate: result.buffer.sampleRate,
      buffer: result.buffer,
      peaks: result.peaks,
    };
    this.listeners.onGuideTrackUpdate({ ...this.guideTrackState });
  }

  public clearGuideTrack() {
    this.guideTrackManager.clear();
    this.guideTrackState = {
      ...this.guideTrackState,
      fileName: null,
      duration: 0,
      buffer: null,
      peaks: null,
    };
    this.listeners.onGuideTrackUpdate({ ...this.guideTrackState });
  }

  // Mix Controls
  public setMasterVolume(vol: number) {
    this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1.5, vol)), this.ctx.currentTime);
  }

  public setGuideVolume(vol: number) {
    this.guideTrackState.volume = vol;
    this.guideTrackManager.updateVolume(vol);
    this.listeners.onGuideTrackUpdate({ ...this.guideTrackState });
  }

  public setGuidePan(pan: number) {
    this.guideTrackState.pan = pan;
    this.guideTrackManager.updatePan(pan);
    this.listeners.onGuideTrackUpdate({ ...this.guideTrackState });
  }

  public setGuideMute(muted: boolean) {
    this.guideTrackState.isMuted = muted;
    this.applySoloMuteStates();
    this.listeners.onGuideTrackUpdate({ ...this.guideTrackState });
  }

  public setGuideSolo(solo: boolean) {
    this.guideTrackState.isSolo = solo;
    this.applySoloMuteStates();
    this.listeners.onGuideTrackUpdate({ ...this.guideTrackState });
  }

  public setInstrumentVolume(vol: number) {
    this.instrumentTrackState.volume = vol;
    this.instrumentEngine.setVolume(vol);
    this.listeners.onInstrumentTrackUpdate({ ...this.instrumentTrackState });
  }

  public setInstrumentPan(pan: number) {
    this.instrumentTrackState.pan = pan;
    this.instrumentEngine.setPan(pan);
    this.listeners.onInstrumentTrackUpdate({ ...this.instrumentTrackState });
  }

  public setInstrumentMute(muted: boolean) {
    this.instrumentTrackState.isMuted = muted;
    this.applySoloMuteStates();
    this.listeners.onInstrumentTrackUpdate({ ...this.instrumentTrackState });
  }

  public setInstrumentSolo(solo: boolean) {
    this.instrumentTrackState.isSolo = solo;
    this.applySoloMuteStates();
    this.listeners.onInstrumentTrackUpdate({ ...this.instrumentTrackState });
  }

  public setInstrumentArmed(armed: boolean) {
    this.instrumentTrackState.isArmed = armed;
    this.listeners.onInstrumentTrackUpdate({ ...this.instrumentTrackState });
  }

  private applySoloMuteStates() {
    const isAnySolo = this.guideTrackState.isSolo || this.instrumentTrackState.isSolo;

    // Guide track
    this.guideTrackManager.setMute(this.guideTrackState.isMuted);
    this.guideTrackManager.setSolo(this.guideTrackState.isSolo);
    this.guideTrackManager.applyGain(isAnySolo);

    // Instrument track
    const instMuted = this.instrumentTrackState.isMuted || (isAnySolo && !this.instrumentTrackState.isSolo);
    this.instrumentEngine.setVolume(instMuted ? 0 : this.instrumentTrackState.volume);
  }

  // Transport Controls
  public setBpm(bpm: number) {
    const clamped = Math.max(30, Math.min(300, Math.round(bpm)));
    this.transport.bpm = clamped;
    this.listeners.onTransportUpdate({ ...this.transport });
  }

  public setMetronomeEnabled(enabled: boolean) {
    this.transport.metronomeEnabled = enabled;
    this.metronome.enabled = enabled;
    this.listeners.onTransportUpdate({ ...this.transport });
  }

  public setMetronomeVolume(vol: number) {
    this.transport.metronomeVolume = vol;
    this.metronome.setVolume(vol);
    this.listeners.onTransportUpdate({ ...this.transport });
  }

  public setCountInBars(bars: number) {
    this.transport.countInBars = Math.max(0, Math.min(2, bars));
    this.listeners.onTransportUpdate({ ...this.transport });
  }

  public setLoopEnabled(enabled: boolean) {
    this.transport.loopEnabled = enabled;
    this.listeners.onTransportUpdate({ ...this.transport });
  }

  public setLoopRange(start: number, end: number) {
    this.transport.loopStart = Math.max(0, start);
    this.transport.loopEnd = Math.max(this.transport.loopStart + 0.5, end);
    this.listeners.onTransportUpdate({ ...this.transport });
  }

  public seek(targetSeconds: number) {
    const safeTime = Math.max(0, targetSeconds);
    this.transport.currentTime = safeTime;
    this.scheduledNoteIndices.clear();

    if (this.transport.isPlaying) {
      // Restart playback at new offset
      this.guideTrackManager.startPlayback(
        safeTime,
        this.transport.loopEnabled,
        this.transport.loopStart,
        this.transport.loopEnd
      );
      this.lastAudioContextTime = this.ctx.currentTime;
    }

    this.listeners.onTransportUpdate({ ...this.transport });
  }

  public async play() {
    await this.resumeAudioContext();

    if (this.transport.isPlaying) return;

    this.transport.isPlaying = true;
    this.transport.isRecording = false;
    this.transport.isCountingIn = false;
    this.scheduledNoteIndices.clear();
    this.lastAudioContextTime = this.ctx.currentTime;
    this.lastMetronomeBeat = -1;

    // Start guide audio playback synchronized
    this.guideTrackManager.startPlayback(
      this.transport.currentTime,
      this.transport.loopEnabled,
      this.transport.loopStart,
      this.transport.loopEnd
    );

    this.listeners.onTransportUpdate({ ...this.transport });
  }

  public async record() {
    await this.resumeAudioContext();

    if (!this.instrumentTrackState.isArmed) {
      // Auto-arm if not armed
      this.setInstrumentArmed(true);
    }

    if (this.transport.countInBars > 0 && !this.transport.isPlaying) {
      // Start Count-In
      this.startCountIn();
      return;
    }

    this.startActualRecording();
  }

  private startCountIn() {
    this.transport.isCountingIn = true;
    this.transport.isPlaying = false;
    this.transport.isRecording = false;

    const beatsPerBar = this.transport.timeSignature[0];
    const totalBeats = this.transport.countInBars * beatsPerBar;
    const secondsPerBeat = 60 / this.transport.bpm;
    let beatsCounted = 0;

    this.transport.countInRemaining = totalBeats;
    this.listeners.onTransportUpdate({ ...this.transport });

    const startTime = this.ctx.currentTime;

    const countInInterval = setInterval(() => {
      if (!this.transport.isCountingIn) {
        clearInterval(countInInterval);
        return;
      }

      const isDownbeat = (beatsCounted % beatsPerBar) === 0;
      this.metronome.triggerClick(this.ctx.currentTime, isDownbeat);

      beatsCounted++;
      this.transport.countInRemaining = Math.max(0, totalBeats - beatsCounted);
      this.listeners.onTransportUpdate({ ...this.transport });

      if (beatsCounted >= totalBeats) {
        clearInterval(countInInterval);
        this.transport.isCountingIn = false;
        this.startActualRecording();
      }
    }, secondsPerBeat * 1000);
  }

  private startActualRecording() {
    this.saveToUndo();
    this.transport.isPlaying = true;
    this.transport.isRecording = true;
    this.transport.isCountingIn = false;
    this.scheduledNoteIndices.clear();
    this.recordingNotesMap.clear();
    this.lastAudioContextTime = this.ctx.currentTime;
    this.lastMetronomeBeat = -1;

    // Start guide audio playback
    this.guideTrackManager.startPlayback(
      this.transport.currentTime,
      this.transport.loopEnabled,
      this.transport.loopStart,
      this.transport.loopEnd
    );

    this.listeners.onTransportUpdate({ ...this.transport });
  }

  public stop() {
    this.transport.isPlaying = false;
    this.transport.isRecording = false;
    this.transport.isCountingIn = false;

    // Stop guide audio
    this.guideTrackManager.stopPlayback();

    // Commit any currently held recording notes
    if (this.recordingNotesMap.size > 0) {
      for (const [note, rec] of this.recordingNotesMap.entries()) {
        const duration = Math.max(0.08, this.transport.currentTime - rec.startTime);
        this.notes.push({
          id: rec.id,
          note,
          velocity: rec.velocity,
          startTime: rec.startTime,
          duration,
        });
      }
      this.recordingNotesMap.clear();
      this.listeners.onNotesUpdate([...this.notes]);
    }

    // Stop all active instrument voices
    this.instrumentEngine.allNotesOff();
    this.scheduledNoteIndices.clear();
    this.scheduledVoices.clear();

    this.listeners.onTransportUpdate({ ...this.transport });
  }

  // Real-time Note On handler (from physical MIDI or virtual keyboard)
  public handleLiveNoteOn(note: number, velocity: number) {
    this.resumeAudioContext();
    this.instrumentEngine.noteOn(note, velocity);

    // If recording and instrument track is armed, track note start
    if (this.transport.isRecording && this.instrumentTrackState.isArmed) {
      const noteId = `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      this.recordingNotesMap.set(note, {
        id: noteId,
        startTime: this.transport.currentTime,
        velocity,
      });
    }

    this.updateActiveNotesUI();
  }

  // Real-time Note Off handler
  public handleLiveNoteOff(note: number) {
    this.instrumentEngine.noteOff(note);

    if (this.transport.isRecording && this.instrumentTrackState.isArmed) {
      const rec = this.recordingNotesMap.get(note);
      if (rec) {
        const duration = Math.max(0.08, this.transport.currentTime - rec.startTime);
        this.notes.push({
          id: rec.id,
          note,
          velocity: rec.velocity,
          startTime: rec.startTime,
          duration,
        });
        this.recordingNotesMap.delete(note);
        this.listeners.onNotesUpdate([...this.notes]);
      }
    }

    this.updateActiveNotesUI();
  }

  private updateActiveNotesUI() {
    const active = Array.from(this.instrumentEngine.activeVoices.keys());
    this.listeners.onActiveNotesChange(active);
  }

  // Notes editing & quantization
  public setNotes(newNotes: MidiNoteEvent[]) {
    this.saveToUndo();
    this.notes = newNotes;
    this.listeners.onNotesUpdate([...this.notes]);
  }

  public quantizeNotes(gridDivision: number) {
    // gridDivision: 4 = 1/4 note, 8 = 1/8 note, 16 = 1/16 note, 32 = 1/32 note, 12 = 1/8 triplet, etc.
    this.saveToUndo();
    const secondsPerBeat = 60 / this.transport.bpm;
    const gridSeconds = (4 / gridDivision) * secondsPerBeat;

    this.notes = this.notes.map((n) => {
      const quantizedStart = Math.round(n.startTime / gridSeconds) * gridSeconds;
      const quantizedDur = Math.max(gridSeconds * 0.5, Math.round(n.duration / gridSeconds) * gridSeconds);
      return {
        ...n,
        startTime: Math.max(0, quantizedStart),
        duration: quantizedDur,
      };
    });

    this.listeners.onNotesUpdate([...this.notes]);
  }

  public clearAllNotes() {
    this.saveToUndo();
    this.notes = [];
    this.listeners.onNotesUpdate([]);
  }

  private saveToUndo() {
    this.undoStack.push(JSON.parse(JSON.stringify(this.notes)));
    this.redoStack = []; // clear redo on new action
  }

  public undo() {
    if (this.undoStack.length === 0) return;
    const prev = this.undoStack.pop()!;
    this.redoStack.push(JSON.parse(JSON.stringify(this.notes)));
    this.notes = prev;
    this.listeners.onNotesUpdate([...this.notes]);
  }

  public redo() {
    if (this.redoStack.length === 0) return;
    const next = this.redoStack.pop()!;
    this.undoStack.push(JSON.parse(JSON.stringify(this.notes)));
    this.notes = next;
    this.listeners.onNotesUpdate([...this.notes]);
  }

  // Main high-precision audio transport loop
  private startTransportLoop() {
    const loop = () => {
      if (this.transport.isPlaying) {
        const now = this.ctx.currentTime;
        const delta = now - this.lastAudioContextTime;
        this.lastAudioContextTime = now;

        if (delta > 0 && delta < 0.5) {
          this.transport.currentTime += delta;
        }

        // Loop handling
        if (
          this.transport.loopEnabled &&
          this.transport.loopEnd > this.transport.loopStart &&
          this.transport.currentTime >= this.transport.loopEnd
        ) {
          const over = this.transport.currentTime - this.transport.loopEnd;
          this.transport.currentTime = this.transport.loopStart + over;
          this.scheduledNoteIndices.clear();

          // Resync guide track
          this.guideTrackManager.startPlayback(
            this.transport.currentTime,
            true,
            this.transport.loopStart,
            this.transport.loopEnd
          );
        }

        // Metronome click scheduling
        if (this.transport.metronomeEnabled) {
          const secondsPerBeat = 60 / this.transport.bpm;
          const currentBeat = Math.floor(this.transport.currentTime / secondsPerBeat);
          if (currentBeat !== this.lastMetronomeBeat && currentBeat >= 0) {
            this.lastMetronomeBeat = currentBeat;
            const isDownbeat = (currentBeat % this.transport.timeSignature[0]) === 0;
            this.metronome.triggerClick(this.ctx.currentTime, isDownbeat);
          }
        }

        // Schedule playback of recorded MIDI notes during transport playback
        // (Only if not currently recording into this track or for notes that occurred earlier)
        const lookahead = 0.08; // 80ms lookahead
        const windowStart = this.transport.currentTime;
        const windowEnd = windowStart + lookahead;

        for (const n of this.notes) {
          if (n.startTime >= windowStart && n.startTime < windowEnd) {
            if (!this.scheduledNoteIndices.has(n.id)) {
              this.scheduledNoteIndices.add(n.id);
              const delay = Math.max(0, n.startTime - windowStart);
              const playTime = this.ctx.currentTime + delay;
              const stopTime = playTime + Math.max(0.04, n.duration);

              const voice = this.instrumentEngine.noteOn(n.note, n.velocity, playTime);
              voice.stop(stopTime);
            }
          }
        }

        this.listeners.onTransportUpdate({ ...this.transport });
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  public destroy() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.stop();
    this.instrumentEngine.destroy();
    this.guideTrackManager.clear();
    try {
      this.ctx.close();
    } catch {
      // ignore
    }
  }
}
