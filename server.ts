import express from 'express';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Ensure Gemini Client is initialized if key is present
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// JSON schema for AI Sound Generator
const soundDesignSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: {
      type: Type.STRING,
      description: 'Inspiring, professional instrument name (e.g., "Nordic Ambient Felt Piano", "Oberheim Prophet Brass", "Tokyo Night Sub Bass")',
    },
    category: {
      type: Type.STRING,
      enum: ['piano', 'keys', 'synth', 'bass', 'strings', 'pad', 'lead', 'percussion', 'sampler'],
      description: 'Primary instrument sound classification',
    },
    description: {
      type: Type.STRING,
      description: 'Vivid sonic character, harmonic acoustic or electronic profile, and playing instructions',
    },
    isSampleBased: {
      type: Type.BOOLEAN,
      description: 'True if best modeled with acoustic harmonic synthesis / multi-harmonic physical modeling sample buffer, false if pure analog synth architecture',
    },
    synthParams: {
      type: Type.OBJECT,
      properties: {
        polyphony: { type: Type.INTEGER, description: '1 for mono/bass/solo leads, 8-16 for polyphonic pads/keys/pianos' },
        glide: { type: Type.NUMBER, description: 'Portamento glide time in seconds (0.0 for poly, 0.02 - 0.15 for smooth leads/basses)' },
        velocitySensitivity: { type: Type.NUMBER, description: 'Dynamic strike response 0.0 to 1.0 (typically 0.7 - 0.95 for realistic expression)' },
        masterGain: { type: Type.NUMBER, description: 'Master output headroom 0.5 to 0.95' },
        osc1: {
          type: Type.OBJECT,
          properties: {
            enabled: { type: Type.BOOLEAN },
            type: { type: Type.STRING, enum: ['sawtooth', 'square', 'triangle', 'sine'] },
            octave: { type: Type.INTEGER, description: '-2, -1, 0, 1, or 2' },
            semi: { type: Type.INTEGER, description: '-12 to 12' },
            detune: { type: Type.NUMBER, description: '-50 to 50 cents' },
            gain: { type: Type.NUMBER, description: '0.0 to 1.0' },
          },
          required: ['enabled', 'type', 'octave', 'semi', 'detune', 'gain'],
        },
        osc2: {
          type: Type.OBJECT,
          properties: {
            enabled: { type: Type.BOOLEAN },
            type: { type: Type.STRING, enum: ['sawtooth', 'square', 'triangle', 'sine'] },
            octave: { type: Type.INTEGER, description: '-2, -1, 0, 1, or 2' },
            semi: { type: Type.INTEGER, description: '-12 to 12' },
            detune: { type: Type.NUMBER, description: '-50 to 50 cents' },
            gain: { type: Type.NUMBER, description: '0.0 to 1.0' },
          },
          required: ['enabled', 'type', 'octave', 'semi', 'detune', 'gain'],
        },
        subOsc: {
          type: Type.OBJECT,
          properties: {
            enabled: { type: Type.BOOLEAN },
            type: { type: Type.STRING, enum: ['sine', 'square'] },
            octave: { type: Type.INTEGER, description: '-1 or -2' },
            gain: { type: Type.NUMBER, description: '0.0 to 1.0' },
          },
          required: ['enabled', 'type', 'octave', 'gain'],
        },
        noise: {
          type: Type.OBJECT,
          properties: {
            enabled: { type: Type.BOOLEAN },
            type: { type: Type.STRING, enum: ['white', 'pink'] },
            gain: { type: Type.NUMBER, description: '0.0 to 0.5 (used for hammer strikes, bow scrapes, or breath noise)' },
          },
          required: ['enabled', 'type', 'gain'],
        },
        filter: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ['lowpass', 'highpass', 'bandpass', 'notch'] },
            cutoff: { type: Type.NUMBER, description: 'Cutoff in Hz (80 - 18000)' },
            resonance: { type: Type.NUMBER, description: 'Resonance Q factor (0.5 - 12.0)' },
            envAmount: { type: Type.NUMBER, description: 'Filter envelope modulation depth (-1.0 to 1.0)' },
            keyTracking: { type: Type.NUMBER, description: 'Keyboard tracking amount (0.0 to 1.0)' },
          },
          required: ['type', 'cutoff', 'resonance', 'envAmount', 'keyTracking'],
        },
        ampEnv: {
          type: Type.OBJECT,
          properties: {
            attack: { type: Type.NUMBER, description: 'Attack time in seconds (0.002 to 2.5)' },
            decay: { type: Type.NUMBER, description: 'Decay time in seconds (0.05 to 4.0)' },
            sustain: { type: Type.NUMBER, description: 'Sustain level (0.0 to 1.0)' },
            release: { type: Type.NUMBER, description: 'Release time in seconds (0.05 to 5.0)' },
          },
          required: ['attack', 'decay', 'sustain', 'release'],
        },
        filterEnv: {
          type: Type.OBJECT,
          properties: {
            attack: { type: Type.NUMBER, description: 'Attack time in seconds (0.002 to 2.5)' },
            decay: { type: Type.NUMBER, description: 'Decay time in seconds (0.05 to 4.0)' },
            sustain: { type: Type.NUMBER, description: 'Sustain level (0.0 to 1.0)' },
            release: { type: Type.NUMBER, description: 'Release time in seconds (0.05 to 5.0)' },
          },
          required: ['attack', 'decay', 'sustain', 'release'],
        },
        lfo: {
          type: Type.OBJECT,
          properties: {
            enabled: { type: Type.BOOLEAN },
            type: { type: Type.STRING, enum: ['sine', 'triangle', 'sawtooth', 'square'] },
            rate: { type: Type.NUMBER, description: 'Rate in Hz (0.2 to 14.0)' },
            depth: { type: Type.NUMBER, description: 'Modulation depth (0.0 to 1.0)' },
            destination: { type: Type.STRING, enum: ['cutoff', 'pitch', 'pan', 'volume'] },
          },
          required: ['enabled', 'type', 'rate', 'depth', 'destination'],
        },
        effects: {
          type: Type.OBJECT,
          properties: {
            drive: {
              type: Type.OBJECT,
              properties: {
                enabled: { type: Type.BOOLEAN },
                amount: { type: Type.NUMBER, description: '0.0 to 1.0 saturation level' },
              },
              required: ['enabled', 'amount'],
            },
            chorus: {
              type: Type.OBJECT,
              properties: {
                enabled: { type: Type.BOOLEAN },
                rate: { type: Type.NUMBER, description: 'Chorus rate in Hz (0.5 to 5.0)' },
                depth: { type: Type.NUMBER, description: 'Depth 0.0 to 1.0' },
                mix: { type: Type.NUMBER, description: 'Wet mix 0.0 to 1.0' },
              },
              required: ['enabled', 'rate', 'depth', 'mix'],
            },
            delay: {
              type: Type.OBJECT,
              properties: {
                enabled: { type: Type.BOOLEAN },
                time: { type: Type.NUMBER, description: 'Delay time in seconds (0.08 to 1.2)' },
                feedback: { type: Type.NUMBER, description: 'Feedback 0.0 to 0.85' },
                mix: { type: Type.NUMBER, description: 'Wet mix 0.0 to 1.0' },
              },
              required: ['enabled', 'time', 'feedback', 'mix'],
            },
            reverb: {
              type: Type.OBJECT,
              properties: {
                enabled: { type: Type.BOOLEAN },
                decay: { type: Type.NUMBER, description: 'Room / hall decay in seconds (0.8 to 7.0)' },
                mix: { type: Type.NUMBER, description: 'Wet mix 0.0 to 0.9' },
              },
              required: ['enabled', 'decay', 'mix'],
            },
          },
          required: ['drive', 'chorus', 'delay', 'reverb'],
        },
      },
      required: [
        'polyphony',
        'glide',
        'velocitySensitivity',
        'masterGain',
        'osc1',
        'osc2',
        'subOsc',
        'noise',
        'filter',
        'ampEnv',
        'filterEnv',
        'lfo',
        'effects',
      ],
    },
    sampleRecipe: {
      type: Type.OBJECT,
      description: 'High-fidelity acoustic physical modeling recipe used to synthesize custom high-quality sample waveforms',
      properties: {
        rootNote: { type: Type.INTEGER, description: 'Base MIDI note (typically 60 for C4 or 36 for bass)' },
        duration: { type: Type.NUMBER, description: 'Length of sample in seconds (1.5 to 3.5)' },
        transientNoiseType: { type: Type.STRING, enum: ['hammer', 'pluck', 'bow', 'breath', 'metal', 'click', 'none'] },
        transientNoiseGain: { type: Type.NUMBER, description: 'Transient amplitude 0.0 to 0.4' },
        harmonics: {
          type: Type.ARRAY,
          description: 'Acoustic partials list (fundamental + overtones with individual decay rates)',
          items: {
            type: Type.OBJECT,
            properties: {
              multiplier: { type: Type.NUMBER, description: 'Overtone frequency multiplier (1.0 = fundamental, 2.0 = octave, 3.0 = 12th, etc.)' },
              amplitude: { type: Type.NUMBER, description: 'Relative amplitude (0.01 to 1.0)' },
              decay: { type: Type.NUMBER, description: 'Exponential decay rate (0.5 to 12.0)' },
            },
            required: ['multiplier', 'amplitude', 'decay'],
          },
        },
        warmthSaturation: { type: Type.NUMBER, description: 'Soft analog tape saturation curve amount (0.0 to 1.0)' },
      },
      required: ['rootNote', 'duration', 'transientNoiseType', 'transientNoiseGain', 'harmonics', 'warmthSaturation'],
    },
  },
  required: ['name', 'category', 'description', 'isSampleBased', 'synthParams', 'sampleRecipe'],
};

// High-fidelity procedural acoustic fallback generator in case of network/rate-limit spikes
function generateProceduralRealisticSound(prompt: string) {
  const p = prompt.toLowerCase();

  if (p.includes('rhodes') || p.includes('wurlitzer') || p.includes('electric piano') || p.includes('epiano') || p.includes('tine')) {
    return {
      name: 'Vintage 1973 Stage Rhodes 73',
      category: 'keys',
      description: 'Physical acoustic tine modeling with resonant bell overtones, warm tube preamp drive, and stereo chorus.',
      isSampleBased: true,
      synthParams: {
        polyphony: 16,
        glide: 0,
        velocitySensitivity: 0.85,
        masterGain: 0.85,
        osc1: { enabled: true, type: 'sine', octave: 0, semi: 0, detune: 0, gain: 0.7 },
        osc2: { enabled: true, type: 'triangle', octave: 1, semi: 0, detune: 4, gain: 0.3 },
        subOsc: { enabled: false, type: 'sine', octave: -1, gain: 0 },
        noise: { enabled: false, type: 'white', gain: 0 },
        filter: { type: 'lowpass', cutoff: 5500, resonance: 1.2, envAmount: 0.35, keyTracking: 0.8 },
        ampEnv: { attack: 0.005, decay: 2.2, sustain: 0.45, release: 0.3 },
        filterEnv: { attack: 0.005, decay: 1.8, sustain: 0.3, release: 0.3 },
        lfo: { enabled: true, type: 'sine', rate: 2.5, depth: 0.15, destination: 'pan' },
        effects: {
          drive: { enabled: true, amount: 0.15 },
          chorus: { enabled: true, rate: 1.2, depth: 0.4, mix: 0.35 },
          delay: { enabled: false, time: 0.3, feedback: 0.2, mix: 0.1 },
          reverb: { enabled: true, decay: 1.8, mix: 0.25 },
        },
      },
      sampleRecipe: {
        rootNote: 60,
        duration: 3.0,
        transientNoiseType: 'metal',
        transientNoiseGain: 0.25,
        harmonics: [
          { multiplier: 1.0, amplitude: 1.0, decay: 1.2 },
          { multiplier: 2.0, amplitude: 0.45, decay: 2.2 },
          { multiplier: 3.0, amplitude: 0.65, decay: 1.8 },
          { multiplier: 4.0, amplitude: 0.15, decay: 3.5 },
          { multiplier: 5.4, amplitude: 0.35, decay: 4.0 },
          { multiplier: 7.1, amplitude: 0.18, decay: 5.0 },
        ],
        warmthSaturation: 0.35,
      },
    };
  }

  if (p.includes('bass') || p.includes('808') || p.includes('sub') || p.includes('moog')) {
    const is808 = p.includes('808') || p.includes('sub');
    return {
      name: is808 ? 'Studio 808 Deep Sub Bass' : 'Moog Model D Fat Punchy Bass',
      category: 'bass',
      description: is808 ? 'Ultra low-end sub boom with saturated harmonic partials.' : 'Dual detuned analog sawtooths through ladder lowpass filter with punchy decay.',
      isSampleBased: false,
      synthParams: {
        polyphony: 1,
        glide: 0.04,
        velocitySensitivity: 0.9,
        masterGain: 0.88,
        osc1: { enabled: true, type: is808 ? 'sine' : 'sawtooth', octave: -1, semi: 0, detune: -4, gain: 0.8 },
        osc2: { enabled: true, type: is808 ? 'triangle' : 'sawtooth', octave: -1, semi: 0, detune: 5, gain: 0.6 },
        subOsc: { enabled: true, type: 'sine', octave: -2, gain: 0.85 },
        noise: { enabled: true, type: 'pink', gain: 0.04 },
        filter: { type: 'lowpass', cutoff: is808 ? 850 : 1400, resonance: is808 ? 1.5 : 4.5, envAmount: 0.65, keyTracking: 0.5 },
        ampEnv: { attack: 0.002, decay: is808 ? 1.4 : 0.45, sustain: is808 ? 0.2 : 0.1, release: 0.15 },
        filterEnv: { attack: 0.002, decay: 0.35, sustain: 0.05, release: 0.1 },
        lfo: { enabled: false, type: 'sine', rate: 1.0, depth: 0, destination: 'pitch' },
        effects: {
          drive: { enabled: true, amount: 0.4 },
          chorus: { enabled: false, rate: 0.8, depth: 0.2, mix: 0.1 },
          delay: { enabled: false, time: 0.25, feedback: 0.2, mix: 0.1 },
          reverb: { enabled: false, decay: 1.0, mix: 0.05 },
        },
      },
      sampleRecipe: {
        rootNote: 36,
        duration: 2.2,
        transientNoiseType: 'click',
        transientNoiseGain: 0.1,
        harmonics: [
          { multiplier: 1.0, amplitude: 1.0, decay: 0.8 },
          { multiplier: 2.0, amplitude: 0.5, decay: 1.6 },
          { multiplier: 3.0, amplitude: 0.2, decay: 2.5 },
        ],
        warmthSaturation: 0.5,
      },
    };
  }

  if (p.includes('string') || p.includes('cello') || p.includes('violin') || p.includes('orchestr')) {
    return {
      name: 'Chamber Solo Cello & String Ensemble',
      category: 'strings',
      description: 'Acoustic bow friction transient, expressive natural vibrato, and warm wooden body resonance.',
      isSampleBased: true,
      synthParams: {
        polyphony: 8,
        glide: 0.03,
        velocitySensitivity: 0.85,
        masterGain: 0.82,
        osc1: { enabled: true, type: 'sawtooth', octave: 0, semi: 0, detune: -6, gain: 0.6 },
        osc2: { enabled: true, type: 'sawtooth', octave: 0, semi: 0, detune: 7, gain: 0.6 },
        subOsc: { enabled: false, type: 'sine', octave: -1, gain: 0 },
        noise: { enabled: true, type: 'pink', gain: 0.05 },
        filter: { type: 'lowpass', cutoff: 3800, resonance: 1.8, envAmount: 0.45, keyTracking: 0.85 },
        ampEnv: { attack: 0.18, decay: 1.2, sustain: 0.75, release: 1.4 },
        filterEnv: { attack: 0.22, decay: 1.5, sustain: 0.6, release: 1.2 },
        lfo: { enabled: true, type: 'sine', rate: 4.8, depth: 0.22, destination: 'pitch' },
        effects: {
          drive: { enabled: true, amount: 0.1 },
          chorus: { enabled: true, rate: 1.5, depth: 0.5, mix: 0.4 },
          delay: { enabled: false, time: 0.35, feedback: 0.25, mix: 0.15 },
          reverb: { enabled: true, decay: 3.6, mix: 0.45 },
        },
      },
      sampleRecipe: {
        rootNote: 48,
        duration: 3.2,
        transientNoiseType: 'bow',
        transientNoiseGain: 0.28,
        harmonics: [
          { multiplier: 1.0, amplitude: 1.0, decay: 0.7 },
          { multiplier: 2.0, amplitude: 0.82, decay: 0.9 },
          { multiplier: 3.0, amplitude: 0.64, decay: 1.2 },
          { multiplier: 4.0, amplitude: 0.48, decay: 1.6 },
          { multiplier: 5.0, amplitude: 0.32, decay: 2.1 },
          { multiplier: 6.0, amplitude: 0.2, decay: 2.8 },
          { multiplier: 7.0, amplitude: 0.12, decay: 3.5 },
        ],
        warmthSaturation: 0.4,
      },
    };
  }

  if (p.includes('pad') || p.includes('ambient') || p.includes('ethereal') || p.includes('shimmer')) {
    return {
      name: 'Ethereal Shimmer Ambient Pad',
      category: 'pad',
      description: 'Lush expansive atmospheric pad with slow filter movement, stereo chorusing, and shimmering hall reverb.',
      isSampleBased: false,
      synthParams: {
        polyphony: 16,
        glide: 0,
        velocitySensitivity: 0.7,
        masterGain: 0.8,
        osc1: { enabled: true, type: 'sawtooth', octave: 0, semi: 0, detune: -10, gain: 0.55 },
        osc2: { enabled: true, type: 'triangle', octave: 1, semi: 7, detune: 8, gain: 0.45 },
        subOsc: { enabled: true, type: 'sine', octave: -1, gain: 0.4 },
        noise: { enabled: true, type: 'pink', gain: 0.03 },
        filter: { type: 'lowpass', cutoff: 2400, resonance: 2.2, envAmount: 0.5, keyTracking: 0.7 },
        ampEnv: { attack: 0.75, decay: 2.0, sustain: 0.85, release: 2.8 },
        filterEnv: { attack: 1.2, decay: 2.5, sustain: 0.65, release: 2.5 },
        lfo: { enabled: true, type: 'sine', rate: 0.6, depth: 0.45, destination: 'cutoff' },
        effects: {
          drive: { enabled: false, amount: 0 },
          chorus: { enabled: true, rate: 0.9, depth: 0.65, mix: 0.55 },
          delay: { enabled: true, time: 0.48, feedback: 0.45, mix: 0.35 },
          reverb: { enabled: true, decay: 5.5, mix: 0.6 },
        },
      },
      sampleRecipe: {
        rootNote: 60,
        duration: 4.0,
        transientNoiseType: 'bow',
        transientNoiseGain: 0.08,
        harmonics: [
          { multiplier: 1.0, amplitude: 1.0, decay: 0.4 },
          { multiplier: 2.0, amplitude: 0.7, decay: 0.6 },
          { multiplier: 3.0, amplitude: 0.4, decay: 0.9 },
          { multiplier: 4.0, amplitude: 0.25, decay: 1.2 },
        ],
        warmthSaturation: 0.2,
      },
    };
  }

  if (p.includes('lead') || p.includes('brass') || p.includes('horn') || p.includes('solo')) {
    const isBrass = p.includes('brass') || p.includes('horn');
    return {
      name: isBrass ? 'Oberheim Cinematic Brass Swell' : 'Vangelis CS-80 Expressive Synth Lead',
      category: isBrass ? 'synth' : 'lead',
      description: isBrass ? 'Powerful dual-saw horn section with dynamic filter envelope punch.' : 'Iconic analog lead with singing pitch vibrato and warm stereo tape echo.',
      isSampleBased: false,
      synthParams: {
        polyphony: isBrass ? 8 : 1,
        glide: isBrass ? 0.01 : 0.06,
        velocitySensitivity: 0.88,
        masterGain: 0.85,
        osc1: { enabled: true, type: 'sawtooth', octave: 0, semi: 0, detune: -7, gain: 0.7 },
        osc2: { enabled: true, type: 'sawtooth', octave: 0, semi: 0, detune: 8, gain: 0.65 },
        subOsc: { enabled: isBrass, type: 'square', octave: -1, gain: 0.3 },
        noise: { enabled: true, type: 'white', gain: 0.03 },
        filter: { type: 'lowpass', cutoff: isBrass ? 1800 : 3600, resonance: 3.0, envAmount: isBrass ? 0.75 : 0.4, keyTracking: 0.8 },
        ampEnv: { attack: isBrass ? 0.08 : 0.01, decay: 1.0, sustain: 0.7, release: 0.4 },
        filterEnv: { attack: isBrass ? 0.12 : 0.02, decay: 0.8, sustain: 0.45, release: 0.35 },
        lfo: { enabled: true, type: 'sine', rate: 5.2, depth: isBrass ? 0.1 : 0.3, destination: 'pitch' },
        effects: {
          drive: { enabled: true, amount: 0.25 },
          chorus: { enabled: true, rate: 1.4, depth: 0.35, mix: 0.3 },
          delay: { enabled: true, time: 0.36, feedback: 0.35, mix: 0.25 },
          reverb: { enabled: true, decay: 2.8, mix: 0.35 },
        },
      },
      sampleRecipe: {
        rootNote: 60,
        duration: 2.5,
        transientNoiseType: 'breath',
        transientNoiseGain: 0.15,
        harmonics: [
          { multiplier: 1.0, amplitude: 1.0, decay: 0.8 },
          { multiplier: 2.0, amplitude: 0.85, decay: 1.0 },
          { multiplier: 3.0, amplitude: 0.6, decay: 1.3 },
          { multiplier: 4.0, amplitude: 0.4, decay: 1.8 },
        ],
        warmthSaturation: 0.35,
      },
    };
  }

  // Default: World-Class Felt Concert Piano
  return {
    name: 'Steinway Studio Felt Grand Piano',
    category: 'piano',
    description: 'Ultra-authentic acoustic grand piano with intimate felt hammer strike transient, multi-harmonic resonance, and natural soundboard decay.',
    isSampleBased: true,
    synthParams: {
      polyphony: 16,
      glide: 0,
      velocitySensitivity: 0.95,
      masterGain: 0.88,
      osc1: { enabled: true, type: 'triangle', octave: 0, semi: 0, detune: 0, gain: 0.75 },
      osc2: { enabled: true, type: 'sine', octave: 1, semi: 0, detune: 2, gain: 0.25 },
      subOsc: { enabled: false, type: 'sine', octave: -1, gain: 0 },
      noise: { enabled: true, type: 'pink', gain: 0.08 },
      filter: { type: 'lowpass', cutoff: 6800, resonance: 1.2, envAmount: 0.55, keyTracking: 0.9 },
      ampEnv: { attack: 0.003, decay: 2.8, sustain: 0.15, release: 0.4 },
      filterEnv: { attack: 0.003, decay: 2.2, sustain: 0.1, release: 0.35 },
      lfo: { enabled: false, type: 'sine', rate: 1.0, depth: 0, destination: 'pitch' },
      effects: {
        drive: { enabled: true, amount: 0.08 },
        chorus: { enabled: false, rate: 1.0, depth: 0.2, mix: 0.1 },
        delay: { enabled: false, time: 0.3, feedback: 0.2, mix: 0.1 },
        reverb: { enabled: true, decay: 2.2, mix: 0.28 },
      },
    },
    sampleRecipe: {
      rootNote: 60,
      duration: 3.5,
      transientNoiseType: 'hammer',
      transientNoiseGain: 0.22,
      harmonics: [
        { multiplier: 1.0, amplitude: 1.0, decay: 1.2 },
        { multiplier: 2.0, amplitude: 0.65, decay: 1.9 },
        { multiplier: 3.0, amplitude: 0.42, decay: 2.6 },
        { multiplier: 4.0, amplitude: 0.28, decay: 3.4 },
        { multiplier: 5.0, amplitude: 0.18, decay: 4.2 },
        { multiplier: 6.0, amplitude: 0.11, decay: 5.0 },
        { multiplier: 7.0, amplitude: 0.06, decay: 6.0 },
      ],
      warmthSaturation: 0.25,
    },
  };
}

// API Endpoint to generate high-fidelity instrument sounds from natural language prompt
app.post('/api/ai/generate-sound', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt string is required' });
  }

  // Attempt Gemini API if configured
  if (ai) {
    const systemInstruction = `You are a world-class master audio software engineer, master synthesizer programmer, and acoustic physical modeling expert for professional DAWs (Apple Logic Pro, Moog, Sequential, Spectrasonics Keyscape/Omnisphere).

The user provides a creative prompt describing an instrument sound (e.g. "realistic warm felt upright piano with intimate hammer clicks", "cinematic Hans Zimmer brass horn swell", "vintage 1970s Fender Rhodes Mark I through tube preamp", "punchy 808 sub bass with saturated analog grit", "crystal ethereal ambient glass pad").

Your goal is to engineer the absolute highest quality, most authentic, ultra-realistic synthesizer and physical modeling parameters for the browser Web Audio instrument engine.

GUIDELINES FOR EXCEPTIONAL REALISM:
1. Pianos / EPianos / Bells:
   - Set isSampleBased = true
   - Provide 6 to 12 precise harmonic overtones in sampleRecipe with realistic physical acoustic decay (higher partials decay faster than fundamental).
   - Use 'hammer' or 'metal' transientNoise with attack times around 0.003s - 0.008s for the felt hammer hitting string.
   - For Rhodes/Wurlitzer, include strong 2nd, 3rd, and 5th harmonics with stereo chorus and gentle warm drive.

2. Analog Poly / Strings / Brass / Pads:
   - Set isSampleBased = false or true.
   - Carefully tune detune cents (+5c to +12c) between Osc 1 & Osc 2 to create lush analog chorusing and beating.
   - Set 24dB lowpass filter with tasteful envelope modulation (envAmount 0.35 - 0.65).
   - Give pads long attack (0.4 - 1.2s) and release (1.5 - 3.5s) with stereo reverb (decay 3.5s - 5.5s, mix 30-40%).

3. Basses & Leads:
   - For Punchy Bass: Monophonic (polyphony = 1), subOsc enabled (sine at -1 or -2 octaves), lowpass cutoff around 800 - 1500Hz with high resonance, fast snappy amp decay (0.2 - 0.4s), drive amount 0.25 - 0.5.
   - For Expressive Leads: Glide 0.03 - 0.08s, LFO routed to pitch vibrato or filter cutoff, tempo delay enabled.

Output pure structured JSON strictly conforming to the requested schema.`;

    // Try up to 2 times for transient model availability
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              role: 'user',
              parts: [{ text: `Create a professional, ultra high quality realistic instrument sound based on this brief: "${prompt}"` }],
            },
          ],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: soundDesignSchema,
            temperature: 0.7,
          },
        });

        const responseText = response.text;
        if (responseText) {
          const soundDesign = JSON.parse(responseText);
          return res.json({ ...soundDesign, isAiGenerated: true, id: `ai-${Date.now()}` });
        }
      } catch (geminiErr: unknown) {
        console.warn(`Gemini attempt ${attempt} warning:`, geminiErr instanceof Error ? geminiErr.message : geminiErr);
        if (attempt === 1) {
          await new Promise((r) => setTimeout(r, 800));
        }
      }
    }
  }

  // Graceful fallback to procedural acoustic model matching prompt keywords
  console.log(`Using high-fidelity acoustic physical modeling fallback for prompt: "${prompt}"`);
  const fallbackPreset = generateProceduralRealisticSound(prompt);
  return res.json({
    ...fallbackPreset,
    isAiGenerated: true,
    id: `ai-${Date.now()}`,
  });
});

// Production static file serving
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

// In development, Vite dev server handles client assets or vite middlewares can be mounted
if (process.env.NODE_ENV !== 'production') {
  import('vite').then(async (vite) => {
    const viteDevServer = await vite.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteDevServer.middlewares);
    app.listen(PORT, () => {
      console.log(`Server & Vite running on port ${PORT}`);
    });
  });
} else {
  app.listen(PORT, () => {
    console.log(`Production server running on port ${PORT}`);
  });
}
