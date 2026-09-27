/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InstrumentPreset } from '../types/daw';

export interface PromptTemplate {
  title: string;
  category: string;
  prompt: string;
  tags: string[];
}

export const INSPIRING_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    title: 'Warm Felt Concert Grand',
    category: 'piano',
    prompt: 'Ultra-realistic intimate Steinway concert grand piano with soft felt hammers, authentic acoustic hammer strike transient, multi-harmonic soundboard resonance, and warm natural decay.',
    tags: ['Acoustic', 'Felt', 'Steinway', 'Realistic'],
  },
  {
    title: '1973 Stage Rhodes 73',
    category: 'keys',
    prompt: 'Vintage 1973 Fender Rhodes Stage 73 electric piano through warm tube preamp, bell-like metallic tine strike, rich 2nd & 3rd harmonic partials, and stereo chorus tremolo.',
    tags: ['Vintage', 'Rhodes', 'Keys', 'Chorus'],
  },
  {
    title: 'Moog Model D Fat Punchy Bass',
    category: 'bass',
    prompt: 'Punchy analog Moog Minimoog Model D bass with dual detuned sawtooth waves, sub-oscillator punch, fast snappy filter envelope decay, and saturated transistor ladder drive.',
    tags: ['Bass', 'Moog', 'Analog', 'Punchy'],
  },
  {
    title: 'Solo Chamber Cello & Bow Bite',
    category: 'strings',
    prompt: 'Acoustic solo chamber cello with authentic rosin bow friction transient, expressive vibrato, wooden chamber resonance, and natural string sustain.',
    tags: ['Strings', 'Cello', 'Acoustic', 'Orchestral'],
  },
  {
    title: 'Oberheim OB-Xa 80s Brass Swell',
    category: 'synth',
    prompt: 'Iconic 1980s Oberheim OB-Xa analog polysynth brass swell with detuned sawtooth oscillators, resonant 24dB lowpass envelope sweep, and lush stereo width.',
    tags: ['80s', 'Polysynth', 'Brass', 'Oberheim'],
  },
  {
    title: 'Studio 808 Saturated Sub Boom',
    category: 'bass',
    prompt: 'Deep hip-hop 808 sub bass with saturated analog warmth harmonics, snappy transient attack, sustained low-frequency rumble, and tight low-end headroom.',
    tags: ['808', 'Trap', 'Sub', 'Saturated'],
  },
  {
    title: 'Ethereal Shimmering Glass Pad',
    category: 'pad',
    prompt: 'Expansive ethereal ambient floating pad with slow filter modulation, crystalline high-end harmonics, stereo chorus, and cavernous 6-second hall reverb.',
    tags: ['Ambient', 'Ethereal', 'Shimmer', 'Pad'],
  },
  {
    title: 'Vangelis CS-80 Singing Lead',
    category: 'lead',
    prompt: 'Expressive Yamaha CS-80 style singing analog lead with subtle pitch vibrato, smooth portamento glide, warm lowpass filter, and tape delay echoes.',
    tags: ['Blade Runner', 'CS-80', 'Lead', 'Expressive'],
  },
  {
    title: 'Yamaha DX7 FM Crystal EP',
    category: 'keys',
    prompt: 'Classic 1980s Yamaha DX7 crystal electric piano with sparkling metallic chime harmonics, clear dynamic velocity response, and lush stereo chorus.',
    tags: ['DX7', 'FM', 'Chime', '80s'],
  },
  {
    title: 'Japanese Koto Acoustic Pluck',
    category: 'sampler',
    prompt: 'Authentic acoustic Japanese 13-string Koto with sharp wooden plectrum pluck transient, organic string harmonics, and fast wooden body decay.',
    tags: ['World', 'Pluck', 'Acoustic', 'Koto'],
  },
];

/**
 * Sends prompt to backend /api/ai/generate-sound to synthesize an instrument preset
 */
export async function generateInstrumentSoundFromPrompt(prompt: string): Promise<InstrumentPreset> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error('Please enter a description for the instrument sound you want to create.');
  }

  const response = await fetch('/api/ai/generate-sound', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt: cleanPrompt }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message = errorData?.error || `Generation failed with status ${response.status}`;
    throw new Error(message);
  }

  const result = await response.json();

  // Validate basic shape
  if (!result || !result.name || !result.synthParams) {
    throw new Error('Server returned an invalid sound preset structure.');
  }

  const preset: InstrumentPreset = {
    id: result.id || `ai-${Date.now()}`,
    name: result.name,
    category: result.category || 'synth',
    description: result.description || 'AI engineered high-fidelity instrument sound',
    isSampleBased: !!result.isSampleBased,
    isAiGenerated: true,
    synthParams: result.synthParams,
    sampleParams: result.sampleRecipe
      ? {
          rootNote: result.sampleRecipe.rootNote || 60,
          tune: 0,
          loop: false,
          loopStart: 0,
          loopEnd: 1,
          sampleName: `${result.name} (Physical Model)`,
          sampleRecipe: result.sampleRecipe,
        }
      : undefined,
  };

  return preset;
}
