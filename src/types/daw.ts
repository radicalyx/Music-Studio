/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MidiNoteEvent {
  id: string;
  note: number; // 0 - 127
  velocity: number; // 0 - 127
  startTime: number; // Seconds from song start (0.000s)
  duration: number; // Seconds
  selected?: boolean;
}

export interface MidiCcEvent {
  id: string;
  type: 'pitchBend' | 'cc';
  controller?: number; // 64 = sustain, 1 = mod wheel
  value: number; // 0-127 (or -8192 to 8191 for pitch bend)
  time: number; // Seconds
}

export type SynthOscType = 'sine' | 'triangle' | 'sawtooth' | 'square';

export interface SynthOscConfig {
  enabled: boolean;
  type: SynthOscType;
  octave: number; // -2 to +2
  semi: number; // -12 to +12
  detune: number; // -50 to +50 cents
  gain: number; // 0 to 1
}

export interface AdsrEnvelope {
  attack: number; // seconds (0.001 - 5.0)
  decay: number; // seconds (0.01 - 5.0)
  sustain: number; // level (0.0 - 1.0)
  release: number; // seconds (0.01 - 8.0)
}

export interface SynthFilterConfig {
  type: 'lowpass' | 'highpass' | 'bandpass' | 'notch';
  cutoff: number; // Hz (20 - 20000)
  resonance: number; // Q (0.1 - 20)
  envAmount: number; // -1.0 to 1.0
  keyTracking: number; // 0 to 1
}

export interface SynthLfoConfig {
  enabled: boolean;
  type: 'sine' | 'triangle' | 'sawtooth' | 'square';
  rate: number; // Hz (0.1 - 20)
  depth: number; // 0.0 - 1.0
  destination: 'cutoff' | 'pitch' | 'pan' | 'volume';
}

export interface SynthEffectsConfig {
  drive: {
    enabled: boolean;
    amount: number; // 0 to 1
  };
  chorus: {
    enabled: boolean;
    rate: number; // 0.1 to 8 Hz
    depth: number; // 0 to 1
    mix: number; // 0 to 1
  };
  delay: {
    enabled: boolean;
    time: number; // 0.05 to 1.5 seconds
    feedback: number; // 0 to 0.9
    mix: number; // 0 to 1
  };
  reverb: {
    enabled: boolean;
    decay: number; // 0.5 to 10 seconds
    mix: number; // 0 to 1
  };
}

export interface SynthParams {
  polyphony: number; // 1 to 16
  glide: number; // portamento seconds (0 to 0.5)
  osc1: SynthOscConfig;
  osc2: SynthOscConfig;
  subOsc: {
    enabled: boolean;
    type: 'sine' | 'square';
    octave: number; // -1 or -2
    gain: number;
  };
  noise: {
    enabled: boolean;
    type: 'white' | 'pink';
    gain: number;
  };
  filter: SynthFilterConfig;
  ampEnv: AdsrEnvelope;
  filterEnv: AdsrEnvelope;
  lfo: SynthLfoConfig;
  effects: SynthEffectsConfig;
  velocitySensitivity: number; // 0 to 1
  masterGain: number; // 0 to 1
}

export interface SampleParams {
  rootNote: number; // Default 60 (C4)
  tune: number; // semitones (-24 to +24)
  loop: boolean;
  loopStart: number; // 0 to 1
  loopEnd: number; // 0 to 1
  sampleName: string;
  sampleDataUrl?: string; // base64 string for saving custom samples
}

export interface InstrumentPreset {
  id: string;
  name: string;
  category: 'piano' | 'keys' | 'synth' | 'bass' | 'strings' | 'pad' | 'lead' | 'percussion' | 'sampler';
  isSampleBased: boolean;
  description: string;
  synthParams: SynthParams;
  sampleParams?: SampleParams;
}

export interface GuideTrackState {
  fileName: string | null;
  duration: number; // in seconds
  sampleRate: number;
  volume: number; // 0 to 1.5
  pan: number; // -1 to 1
  isMuted: boolean;
  isSolo: boolean;
  buffer: AudioBuffer | null;
  peaks: Float32Array[] | null;
}

export interface InstrumentTrackState {
  name: string;
  volume: number; // 0 to 1.5
  pan: number; // -1 to 1
  isMuted: boolean;
  isSolo: boolean;
  isArmed: boolean;
}

export interface TransportState {
  bpm: number;
  timeSignature: [number, number]; // [4, 4]
  isPlaying: boolean;
  isRecording: boolean;
  isCountingIn: boolean;
  countInRemaining: number;
  countInBars: number; // 0, 1, 2
  currentTime: number; // Current playhead in seconds
  loopEnabled: boolean;
  loopStart: number; // In seconds
  loopEnd: number; // In seconds
  metronomeEnabled: boolean;
  metronomeVolume: number; // 0 to 1
}

export interface MidiDeviceState {
  supported: boolean;
  permissionState: 'granted' | 'denied' | 'prompt' | 'unsupported';
  inputs: Array<{ id: string; name: string; manufacturer?: string }>;
  selectedInputId: string | 'all';
  activeNotes: Map<number, number>; // note -> velocity
  sustainPedalActive: boolean;
  pitchBendValue: number; // -8192 to 8191
  modWheelValue: number; // 0 to 127
  lastActivityTimestamp: number;
}

export interface ExportSettings {
  sampleRate: 44100 | 48000;
  bitDepth: 16 | 24;
  includeGuideTrack: boolean; // default false (instrument only)
  timeRange: 'all' | 'loop' | 'content';
}

export interface ProjectData {
  version: 1;
  name: string;
  bpm: number;
  timeSignature: [number, number];
  preset: InstrumentPreset;
  notes: MidiNoteEvent[];
  guideTrack?: {
    fileName: string;
    volume: number;
    pan: number;
    isMuted: boolean;
    isSolo: boolean;
  };
  customSample?: {
    name: string;
    dataUrl: string;
    rootNote: number;
  };
}
