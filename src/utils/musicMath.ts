/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1; // 60 is C4
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

export function isBlackKey(midi: number): boolean {
  const noteIndex = midi % 12;
  return [1, 3, 6, 8, 10].includes(noteIndex);
}

export function formatBarsBeatsTicks(
  seconds: number,
  bpm: number,
  timeSignature: [number, number] = [4, 4]
): string {
  const beatsPerBar = timeSignature[0];
  const secondsPerBeat = 60 / bpm;
  const totalBeats = Math.max(0, seconds / secondsPerBeat);
  
  const bar = Math.floor(totalBeats / beatsPerBar) + 1;
  const beat = Math.floor(totalBeats % beatsPerBar) + 1;
  const subBeatFraction = totalBeats % 1;
  const ticks = Math.floor(subBeatFraction * 480);

  const barStr = String(bar).padStart(3, '0');
  const beatStr = String(beat).padStart(2, '0');
  const tickStr = String(ticks).padStart(3, '0');

  return `${barStr}.${beatStr}.${tickStr}`;
}

export function formatTimeMs(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const ms = Math.floor((safe % 1) * 1000);

  const minStr = String(mins).padStart(2, '0');
  const secStr = String(secs).padStart(2, '0');
  const msStr = String(ms).padStart(3, '0');

  return `${minStr}:${secStr}.${msStr}`;
}
