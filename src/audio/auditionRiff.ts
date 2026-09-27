/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioEngine } from './AudioEngine';
import { InstrumentPreset } from '../types/daw';

let activeAuditionTimeout: ReturnType<typeof setTimeout> | null = null;
const activeAuditionNotes: number[] = [];

/**
 * Stops any currently playing audition riff.
 */
export function stopAuditionRiff(engine: AudioEngine) {
  if (activeAuditionTimeout) {
    clearTimeout(activeAuditionTimeout);
    activeAuditionTimeout = null;
  }
  while (activeAuditionNotes.length > 0) {
    const note = activeAuditionNotes.pop();
    if (note !== undefined) {
      engine.handleLiveNoteOff(note);
    }
  }
}

/**
 * Plays an authentic audition phrase tailored to the preset's musical character
 * so the user can immediately experience the realism and dynamics of the sound.
 */
export function playAuditionRiff(
  engine: AudioEngine,
  preset: InstrumentPreset,
  onComplete?: () => void
) {
  stopAuditionRiff(engine);

  const cat = preset.category;
  interface ScheduledNote {
    time: number; // in seconds from start
    duration: number; // in seconds
    note: number;
    velocity: number;
  }

  let pattern: ScheduledNote[] = [];

  if (cat === 'bass') {
    // Punchy rhythmic walking bassline
    pattern = [
      { time: 0.0, duration: 0.22, note: 36, velocity: 105 }, // C2
      { time: 0.28, duration: 0.18, note: 36, velocity: 85 },
      { time: 0.52, duration: 0.25, note: 39, velocity: 95 }, // Eb2
      { time: 0.82, duration: 0.22, note: 41, velocity: 100 }, // F2
      { time: 1.1, duration: 0.25, note: 43, velocity: 105 }, // G2
      { time: 1.4, duration: 0.28, note: 46, velocity: 90 }, // Bb2
      { time: 1.75, duration: 0.55, note: 48, velocity: 110 }, // C3
    ];
  } else if (cat === 'lead' || cat === 'synth') {
    // Expressive melodic synth line with legato feel
    pattern = [
      { time: 0.0, duration: 0.35, note: 60, velocity: 95 }, // C4
      { time: 0.38, duration: 0.28, note: 63, velocity: 90 }, // Eb4
      { time: 0.68, duration: 0.32, note: 67, velocity: 100 }, // G4
      { time: 1.05, duration: 0.45, note: 70, velocity: 105 }, // Bb4
      { time: 1.55, duration: 0.75, note: 72, velocity: 110 }, // C5
    ];
  } else if (cat === 'pad' || cat === 'strings') {
    // Lush open chord voicing with rich sustain
    pattern = [
      { time: 0.0, duration: 2.2, note: 48, velocity: 85 }, // C3
      { time: 0.08, duration: 2.1, note: 55, velocity: 80 }, // G3
      { time: 0.16, duration: 2.0, note: 60, velocity: 82 }, // C4
      { time: 0.24, duration: 1.9, note: 64, velocity: 86 }, // E4
      { time: 0.32, duration: 1.8, note: 71, velocity: 90 }, // B4
    ];
  } else {
    // Piano, Keys, E-Piano, Bells: Intimate, realistic arpeggio & resolved chord
    pattern = [
      { time: 0.0, duration: 0.8, note: 48, velocity: 90 }, // C3 root
      { time: 0.18, duration: 0.7, note: 55, velocity: 80 }, // G3
      { time: 0.36, duration: 0.65, note: 60, velocity: 85 }, // C4
      { time: 0.54, duration: 0.65, note: 64, velocity: 88 }, // E4
      { time: 0.72, duration: 0.65, note: 67, velocity: 92 }, // G4
      { time: 0.9, duration: 1.2, note: 71, velocity: 95 }, // B4
      { time: 1.2, duration: 1.4, note: 72, velocity: 98 }, // C5
    ];
  }

  const startTime = Date.now();
  const maxDuration = Math.max(...pattern.map((p) => p.time + p.duration));

  // Schedule each note
  pattern.forEach((item) => {
    setTimeout(() => {
      engine.handleLiveNoteOn(item.note, item.velocity);
      activeAuditionNotes.push(item.note);

      setTimeout(() => {
        engine.handleLiveNoteOff(item.note);
        const idx = activeAuditionNotes.indexOf(item.note);
        if (idx !== -1) activeAuditionNotes.splice(idx, 1);
      }, item.duration * 1000);
    }, item.time * 1000);
  });

  activeAuditionTimeout = setTimeout(() => {
    activeAuditionTimeout = null;
    onComplete?.();
  }, (maxDuration + 0.3) * 1000);
}
