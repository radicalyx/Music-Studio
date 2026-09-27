/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Keyboard, ChevronLeft, ChevronRight, Sliders } from 'lucide-react';
import { isBlackKey, midiToNoteName } from '../utils/musicMath';

interface VirtualPianoKeyboardProps {
  activeNotes: number[]; // currently sounding MIDI note numbers
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  onPitchBend: (bendValue: number) => void; // -8192 to 8191
  onModWheel: (modValue: number) => void; // 0 to 127
  computerOctave: number;
}

export const VirtualPianoKeyboard: React.FC<VirtualPianoKeyboardProps> = ({
  activeNotes,
  onNoteOn,
  onNoteOff,
  onPitchBend,
  onModWheel,
  computerOctave,
}) => {
  const [octaveOffset, setOctaveOffset] = useState(2); // C2 to C6
  const [showKeyLabels, setShowKeyLabels] = useState(true);
  const [pitchBendPos, setPitchBendPos] = useState(0); // -8192 to 8191
  const [modWheelPos, setModWheelPos] = useState(0); // 0 to 127

  const currentlyPressedNotesRef = useRef<Set<number>>(new Set());
  const isMouseDownRef = useRef(false);

  // Pitch bend wheel spring return
  const isPitchDraggingRef = useRef(false);

  // 4 octaves range: C2 (36) to C6 (84) (or offset)
  const startMidi = octaveOffset * 12 + 12; // if octaveOffset 2 -> C2 is 36
  const numKeys = 49; // 4 octaves + 1 note (C to C)

  const keys = Array.from({ length: numKeys }, (_, i) => startMidi + i);

  // Computer keyboard key letters map for current computer octave
  const computerKeyLabels: Record<number, string> = {
    [(computerOctave + 1) * 12 + 0]: 'A',
    [(computerOctave + 1) * 12 + 1]: 'W',
    [(computerOctave + 1) * 12 + 2]: 'S',
    [(computerOctave + 1) * 12 + 3]: 'E',
    [(computerOctave + 1) * 12 + 4]: 'D',
    [(computerOctave + 1) * 12 + 5]: 'F',
    [(computerOctave + 1) * 12 + 6]: 'T',
    [(computerOctave + 1) * 12 + 7]: 'G',
    [(computerOctave + 1) * 12 + 8]: 'Y',
    [(computerOctave + 1) * 12 + 9]: 'H',
    [(computerOctave + 1) * 12 + 10]: 'U',
    [(computerOctave + 1) * 12 + 11]: 'J',
    [(computerOctave + 1) * 12 + 12]: 'K',
    [(computerOctave + 1) * 12 + 13]: 'O',
    [(computerOctave + 1) * 12 + 14]: 'L',
    [(computerOctave + 1) * 12 + 15]: 'P',
    [(computerOctave + 1) * 12 + 16]: ';',
    [(computerOctave + 1) * 12 + 17]: "'",
  };

  const handleKeyMouseDown = (note: number, e: React.MouseEvent<HTMLDivElement>) => {
    isMouseDownRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const heightNorm = clickY / rect.height;
    // Higher click position = softer, lower = louder
    const velocity = Math.round(50 + heightNorm * 75);

    currentlyPressedNotesRef.current.add(note);
    onNoteOn(note, velocity);
  };

  const handleKeyMouseEnter = (note: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (isMouseDownRef.current && !currentlyPressedNotesRef.current.has(note)) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const heightNorm = clickY / rect.height;
      const velocity = Math.round(50 + heightNorm * 75);

      currentlyPressedNotesRef.current.add(note);
      onNoteOn(note, velocity);
    }
  };

  const handleKeyMouseLeave = (note: number) => {
    if (currentlyPressedNotesRef.current.has(note)) {
      currentlyPressedNotesRef.current.delete(note);
      onNoteOff(note);
    }
  };

  const handleGlobalMouseUp = useCallback(() => {
    isMouseDownRef.current = false;
    for (const note of currentlyPressedNotesRef.current) {
      onNoteOff(note);
    }
    currentlyPressedNotesRef.current.clear();

    if (isPitchDraggingRef.current) {
      isPitchDraggingRef.current = false;
      setPitchBendPos(0);
      onPitchBend(0);
    }
  }, [onNoteOff, onPitchBend]);

  useEffect(() => {
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [handleGlobalMouseUp]);

  // Pitch bend wheel drag
  const handlePitchWheelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPitchDraggingRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const norm = 1 - (y / rect.height) * 2; // -1 to +1
    const clamped = Math.max(-1, Math.min(1, norm));
    const bendVal = Math.round(clamped * 8191);
    setPitchBendPos(bendVal);
    onPitchBend(bendVal);
  };

  // Mod wheel drag
  const handleModWheelMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const norm = 1 - y / rect.height; // 0 to 1
    const clamped = Math.max(0, Math.min(1, norm));
    const val = Math.round(clamped * 127);
    setModWheelPos(val);
    onModWheel(val);
  };

  // Filter white keys to compute positioning
  const whiteKeys = keys.filter((k) => !isBlackKey(k));

  return (
    <div className="h-44 bg-[#10121a] border-t border-[#232736] flex shrink-0 select-none overflow-hidden z-20">
      {/* Left Control Column: Pitch Bend, Mod Wheel, Octave Buttons */}
      <div className="w-36 bg-[#131622] border-r border-[#232736] p-2 flex flex-col justify-between shrink-0">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-semibold text-neutral-300">Keyboard</span>
          <button
            onClick={() => setShowKeyLabels((prev) => !prev)}
            title="Toggle QWERTY mapping overlay"
            className={`p-1 rounded text-[10px] border transition-colors ${
              showKeyLabels
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-[#1b1f2e] text-neutral-400 border-[#272c3d]'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pitch & Mod Wheels */}
        <div className="flex items-center justify-around gap-2 py-1">
          {/* Pitch Bend Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500 mb-0.5">Pitch</span>
            <div
              onMouseDown={(e) => {
                isPitchDraggingRef.current = true;
                handlePitchWheelMouseMove(e);
              }}
              onMouseMove={handlePitchWheelMouseMove}
              className="w-7 h-16 bg-[#0a0b0f] rounded border border-[#2b3042] relative cursor-ns-resize shadow-inner"
            >
              {/* Wheel center line */}
              <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-neutral-600" />
              {/* Indicator handle */}
              <div
                style={{
                  top: `${((1 - pitchBendPos / 8191) / 2) * 50 + 2}px`,
                }}
                className="absolute left-0.5 right-0.5 h-3 bg-gradient-to-b from-neutral-300 to-neutral-500 rounded-xs shadow-xs"
              />
            </div>
          </div>

          {/* Modulation Wheel */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500 mb-0.5">Mod</span>
            <div
              onMouseDown={handleModWheelMouseMove}
              onMouseMove={handleModWheelMouseMove}
              className="w-7 h-16 bg-[#0a0b0f] rounded border border-[#2b3042] relative cursor-ns-resize shadow-inner"
            >
              {/* Indicator handle */}
              <div
                style={{
                  bottom: `${(modWheelPos / 127) * 48 + 2}px`,
                }}
                className="absolute left-0.5 right-0.5 h-3 bg-gradient-to-b from-sky-400 to-sky-600 rounded-xs shadow-xs"
              />
            </div>
          </div>
        </div>

        {/* Octave Shift Controls */}
        <div className="flex items-center justify-between bg-[#191d2c] border border-[#272c3d] rounded p-1 text-xs">
          <button
            onClick={() => setOctaveOffset((prev) => Math.max(0, prev - 1))}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#252b3d] text-neutral-300"
            title="Octave Down (Z)"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-neutral-300">
            C{octaveOffset} - C{octaveOffset + 4}
          </span>
          <button
            onClick={() => setOctaveOffset((prev) => Math.min(4, prev + 1))}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#252b3d] text-neutral-300"
            title="Octave Up (X)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Piano Keyboard Area */}
      <div className="flex-1 relative overflow-x-auto overflow-y-hidden bg-[#0a0b0f]">
        <div className="relative h-full flex" style={{ width: `${whiteKeys.length * 32}px` }}>
          {/* 1. White Keys */}
          {whiteKeys.map((note) => {
            const isActive = activeNotes.includes(note);
            const keyLabel = showKeyLabels ? computerKeyLabels[note] : null;
            const noteName = midiToNoteName(note);

            return (
              <div
                key={note}
                onMouseDown={(e) => handleKeyMouseDown(note, e)}
                onMouseEnter={(e) => handleKeyMouseEnter(note, e)}
                onMouseLeave={() => handleKeyMouseLeave(note)}
                className={`relative w-8 h-full border-r border-[#1a1c26] rounded-b-md cursor-pointer transition-colors duration-75 flex flex-col justify-between items-center pb-2 pt-1 shadow-sm ${
                  isActive
                    ? 'bg-sky-400 text-sky-950 shadow-md shadow-sky-500/50'
                    : 'bg-[#fafafa] hover:bg-[#eceef2] text-neutral-600'
                }`}
              >
                {/* Note name marker at root C */}
                {note % 12 === 0 ? (
                  <span className="text-[9px] font-bold text-neutral-500">{noteName}</span>
                ) : (
                  <span />
                )}

                {/* Computer key label */}
                {keyLabel && (
                  <span
                    className={`w-4 h-4 rounded-xs text-[9px] font-mono font-bold flex items-center justify-center ${
                      isActive ? 'bg-sky-900 text-white' : 'bg-neutral-200 text-neutral-700'
                    }`}
                  >
                    {keyLabel}
                  </span>
                )}
              </div>
            );
          })}

          {/* 2. Black Keys (Absolute positioned overlay) */}
          {keys.map((note) => {
            if (!isBlackKey(note)) return null;

            // Find preceding white key index to position
            const precedingWhites = keys.filter((k) => k < note && !isBlackKey(k));
            const whiteIndex = precedingWhites.length;
            const leftPx = whiteIndex * 32 - 10;
            const isActive = activeNotes.includes(note);
            const keyLabel = showKeyLabels ? computerKeyLabels[note] : null;

            return (
              <div
                key={note}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  handleKeyMouseDown(note, e);
                }}
                onMouseEnter={(e) => {
                  e.stopPropagation();
                  handleKeyMouseEnter(note, e);
                }}
                onMouseLeave={() => handleKeyMouseLeave(note)}
                style={{ left: `${leftPx}px` }}
                className={`absolute top-0 w-5 h-24 rounded-b-sm cursor-pointer z-10 transition-colors duration-75 flex flex-col justify-end items-center pb-1.5 shadow-md ${
                  isActive
                    ? 'bg-sky-500 text-white border-2 border-sky-300 shadow-md shadow-sky-500/60'
                    : 'bg-[#181a24] hover:bg-[#252838] border-b-2 border-black'
                }`}
              >
                {keyLabel && (
                  <span className="text-[8px] font-mono font-bold text-neutral-300 bg-neutral-800 px-1 rounded-xs">
                    {keyLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
