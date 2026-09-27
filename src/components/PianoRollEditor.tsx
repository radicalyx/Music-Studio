/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  MousePointer,
  Pencil,
  Eraser,
  Undo2,
  Redo2,
  Sliders,
  Trash2,
  Check,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from 'lucide-react';
import { MidiNoteEvent, TransportState } from '../types/daw';
import { isBlackKey, midiToNoteName } from '../utils/musicMath';

interface PianoRollEditorProps {
  notes: MidiNoteEvent[];
  transport: TransportState;
  onNotesChange: (notes: MidiNoteEvent[]) => void;
  onQuantize: (gridDivision: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClearNotes: () => void;
  onSeek: (seconds: number) => void;
  onPlayNote: (note: number, velocity: number) => void;
  onStopNote: (note: number) => void;
}

export const PianoRollEditor: React.FC<PianoRollEditorProps> = ({
  notes,
  transport,
  onNotesChange,
  onQuantize,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onClearNotes,
  onSeek,
  onPlayNote,
  onStopNote,
}) => {
  const [activeTool, setActiveTool] = useState<'pointer' | 'pencil' | 'eraser'>('pointer');
  const [gridSnap, setGridSnap] = useState<number>(16); // 1/16 note default
  const [pixelsPerSecond, setPixelsPerSecond] = useState<number>(60);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Pitch range: C2 (36) to C6 (84) -> 49 notes
  const minNote = 36;
  const maxNote = 84;
  const rowHeight = 16; // 16px per semitone

  const gridRef = useRef<HTMLDivElement | null>(null);
  const isDraggingNoteRef = useRef<{
    noteId: string;
    action: 'move' | 'resize';
    origStart: number;
    origDur: number;
    origNote: number;
    startX: number;
    startY: number;
  } | null>(null);

  const secondsPerBeat = 60 / transport.bpm;
  const snapDuration = gridSnap > 0 ? (4 / gridSnap) * secondsPerBeat : 0.05;

  // Total duration in seconds
  const totalDuration = useMemo(() => {
    let max = 30;
    for (const n of notes) {
      if (n.startTime + n.duration > max) max = n.startTime + n.duration;
    }
    return Math.max(max + 10, transport.currentTime + 10);
  }, [notes, transport.currentTime]);

  const totalWidth = totalDuration * pixelsPerSecond;
  const totalHeight = (maxNote - minNote + 1) * rowHeight;

  // Grid background lines
  const numGridLines = Math.ceil(totalDuration / snapDuration);

  // Note click/drag handler
  const handleGridMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedTime = Math.max(0, x / pixelsPerSecond);
    const snappedTime = gridSnap > 0 ? Math.floor(clickedTime / snapDuration) * snapDuration : clickedTime;

    const noteIndex = Math.floor(y / rowHeight);
    const pitch = maxNote - noteIndex;

    if (activeTool === 'pencil') {
      // Add new note
      const newNote: MidiNoteEvent = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        note: pitch,
        velocity: 100,
        startTime: snappedTime,
        duration: snapDuration,
      };
      onNotesChange([...notes, newNote]);
      setSelectedNoteId(newNote.id);
      onPlayNote(pitch, 100);
      setTimeout(() => onStopNote(pitch), 250);
    }
  };

  const handleNoteMouseDown = (
    n: MidiNoteEvent,
    e: React.MouseEvent<HTMLDivElement>,
    action: 'move' | 'resize'
  ) => {
    e.stopPropagation();

    if (activeTool === 'eraser') {
      onNotesChange(notes.filter((item) => item.id !== n.id));
      return;
    }

    setSelectedNoteId(n.id);
    onPlayNote(n.note, n.velocity);

    isDraggingNoteRef.current = {
      noteId: n.id,
      action,
      origStart: n.startTime,
      origDur: n.duration,
      origNote: n.note,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = isDraggingNoteRef.current;
      if (!drag) return;

      const deltaX = e.clientX - drag.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      const deltaY = e.clientY - drag.startY;
      const deltaPitch = -Math.round(deltaY / rowHeight);

      onNotesChange(
        notes.map((n) => {
          if (n.id !== drag.noteId) return n;

          if (drag.action === 'move') {
            const rawStart = Math.max(0, drag.origStart + deltaTime);
            const snappedStart = gridSnap > 0 ? Math.round(rawStart / snapDuration) * snapDuration : rawStart;
            const newPitch = Math.max(minNote, Math.min(maxNote, drag.origNote + deltaPitch));

            return {
              ...n,
              startTime: Math.max(0, snappedStart),
              note: newPitch,
            };
          } else {
            // Resize duration
            const rawDur = Math.max(snapDuration * 0.5, drag.origDur + deltaTime);
            const snappedDur = gridSnap > 0 ? Math.round(rawDur / snapDuration) * snapDuration : rawDur;

            return {
              ...n,
              duration: Math.max(0.04, snappedDur),
            };
          }
        })
      );
    };

    const handleMouseUp = () => {
      if (isDraggingNoteRef.current) {
        onStopNote(isDraggingNoteRef.current.origNote);
        isDraggingNoteRef.current = null;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [notes, pixelsPerSecond, rowHeight, snapDuration, gridSnap, onNotesChange, onStopNote]);

  const playheadX = transport.currentTime * pixelsPerSecond;

  return (
    <div className="flex-1 flex flex-col bg-[#0f1118] overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="h-10 bg-[#141722] border-b border-[#232736] px-3 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2">
          {/* Tools */}
          <div className="flex items-center bg-[#181b26] p-0.5 rounded border border-[#232736]">
            <button
              onClick={() => setActiveTool('pointer')}
              title="Pointer: Select, Move & Resize Notes"
              className={`p-1.5 rounded transition-colors ${
                activeTool === 'pointer' ? 'bg-[#2b3145] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MousePointer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('pencil')}
              title="Pencil: Draw New Notes"
              className={`p-1.5 rounded transition-colors ${
                activeTool === 'pencil' ? 'bg-[#2b3145] text-white shadow-xs' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('eraser')}
              title="Eraser: Click Notes to Delete"
              className={`p-1.5 rounded transition-colors ${
                activeTool === 'eraser' ? 'bg-rose-900/60 text-rose-300' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-4 w-[1px] bg-[#232736]" />

          {/* Grid Snap Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-neutral-400">Snap:</span>
            <select
              value={gridSnap}
              onChange={(e) => setGridSnap(parseInt(e.target.value, 10))}
              className="bg-[#181b26] text-xs text-neutral-200 rounded px-2 py-0.5 border border-[#232736] focus:outline-none"
            >
              <option value={4}>1/4 Beat</option>
              <option value={8}>1/8 Note</option>
              <option value={12}>1/8 Triplet</option>
              <option value={16}>1/16 Note</option>
              <option value={24}>1/16 Triplet</option>
              <option value={32}>1/32 Note</option>
              <option value={0}>Off (Free)</option>
            </select>
          </div>

          {/* Quantize Action */}
          <button
            onClick={() => onQuantize(gridSnap || 16)}
            title={`Quantize recorded notes to current 1/${gridSnap || 16} grid`}
            className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 text-xs font-medium rounded border border-sky-500/30 flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            Quantize Take
          </button>
        </div>

        {/* Right Tools: Undo/Redo & Zoom */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#181b26] p-0.5 rounded border border-[#232736]">
            <button
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="p-1.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="p-1.5 rounded text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={onClearNotes}
            title="Clear All Recorded Notes"
            className="px-2 py-1 text-xs text-rose-400 hover:bg-rose-950/40 rounded border border-rose-900/30 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPixelsPerSecond((p) => Math.max(30, p - 15))}
              className="p-1 bg-[#181b26] rounded border border-[#232736] text-neutral-300"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <button
              onClick={() => setPixelsPerSecond((p) => Math.min(150, p + 15))}
              className="p-1 bg-[#181b26] rounded border border-[#232736] text-neutral-300"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Piano Roll Container (Split Gutter + Grid) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pitch Gutter (Piano Keys) */}
        <div className="w-16 bg-[#12141c] border-r border-[#232736] flex flex-col shrink-0 overflow-hidden shadow-md">
          {Array.from({ length: maxNote - minNote + 1 }).map((_, idx) => {
            const pitch = maxNote - idx;
            const black = isBlackKey(pitch);
            const isRootC = pitch % 12 === 0;

            return (
              <div
                key={pitch}
                style={{ height: `${rowHeight}px` }}
                onMouseDown={() => {
                  onPlayNote(pitch, 100);
                  setTimeout(() => onStopNote(pitch), 250);
                }}
                className={`flex items-center justify-between px-1 text-[10px] font-mono cursor-pointer border-b border-[#1b1e2a] transition-colors ${
                  black
                    ? 'bg-[#181a24] text-neutral-400 hover:bg-[#252838]'
                    : 'bg-[#fafafa] text-neutral-800 hover:bg-[#e2e8f0]'
                }`}
              >
                <span className={isRootC ? 'font-bold text-sky-600' : ''}>
                  {midiToNoteName(pitch)}
                </span>
                {isRootC && <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />}
              </div>
            );
          })}
        </div>

        {/* Right Scrollable Note Grid */}
        <div className="flex-1 overflow-auto relative bg-[#0b0c11]">
          <div
            ref={gridRef}
            onMouseDown={handleGridMouseDown}
            style={{ width: `${totalWidth}px`, height: `${totalHeight}px` }}
            className="relative cursor-crosshair"
          >
            {/* Horizontal Pitch Row Guides */}
            {Array.from({ length: maxNote - minNote + 1 }).map((_, idx) => {
              const pitch = maxNote - idx;
              const black = isBlackKey(pitch);
              const top = idx * rowHeight;

              return (
                <div
                  key={pitch}
                  style={{ top: `${top}px`, height: `${rowHeight}px` }}
                  className={`absolute left-0 right-0 border-b border-[#161822] pointer-events-none ${
                    black ? 'bg-[#0d0e14]' : 'bg-[#10121a]'
                  }`}
                />
              );
            })}

            {/* Vertical Time/Snap Grid Lines */}
            {Array.from({ length: numGridLines }).map((_, idx) => {
              const left = idx * snapDuration * pixelsPerSecond;
              const isBeatLine = idx % (gridSnap / 4) === 0;

              return (
                <div
                  key={idx}
                  style={{ left: `${left}px` }}
                  className={`absolute top-0 bottom-0 pointer-events-none ${
                    isBeatLine ? 'border-l border-[#272c3d]' : 'border-l border-[#161822]'
                  }`}
                />
              );
            })}

            {/* Rendered Notes */}
            {notes.map((n) => {
              const left = n.startTime * pixelsPerSecond;
              const width = Math.max(6, n.duration * pixelsPerSecond);
              const pitchIndex = maxNote - n.note;
              const top = pitchIndex * rowHeight;
              const isSelected = n.id === selectedNoteId;

              return (
                <div
                  key={n.id}
                  style={{
                    left: `${left}px`,
                    top: `${top}px`,
                    width: `${width}px`,
                    height: `${rowHeight - 1}px`,
                  }}
                  onMouseDown={(e) => handleNoteMouseDown(n, e, 'move')}
                  className={`absolute rounded-xs cursor-move flex items-center justify-between text-[9px] font-mono text-white px-1 shadow-sm transition-shadow group ${
                    isSelected
                      ? 'bg-sky-500 border border-white shadow-md shadow-sky-500/50'
                      : 'bg-emerald-500 hover:bg-emerald-400 border border-emerald-300/40'
                  }`}
                >
                  <span className="truncate select-none">{midiToNoteName(n.note)}</span>

                  {/* Resize handle on right edge */}
                  <div
                    onMouseDown={(e) => handleNoteMouseDown(n, e, 'resize')}
                    className="w-2 h-full cursor-ew-resize hover:bg-white/40 opacity-0 group-hover:opacity-100 rounded-r-xs transition-opacity"
                  />
                </div>
              );
            })}

            {/* Playhead Line */}
            <div
              style={{ left: `${playheadX}px` }}
              className="absolute top-0 bottom-0 w-[2px] bg-rose-500 shadow-md shadow-rose-500/80 pointer-events-none z-10"
            />
          </div>
        </div>
      </div>

      {/* Bottom Velocity Lane */}
      <div className="h-16 bg-[#12141c] border-t border-[#232736] flex shrink-0">
        <div className="w-16 border-r border-[#232736] p-1 flex flex-col justify-between text-[9px] text-neutral-500 font-mono">
          <span>127</span>
          <span>VEL</span>
          <span>0</span>
        </div>
        <div className="flex-1 overflow-x-hidden relative bg-[#0d0e14]">
          <div style={{ width: `${totalWidth}px` }} className="relative h-full">
            {notes.map((n) => {
              const left = n.startTime * pixelsPerSecond;
              const heightNorm = n.velocity / 127;
              const barHeight = Math.max(4, heightNorm * 54);

              return (
                <div
                  key={n.id}
                  style={{
                    left: `${left}px`,
                    bottom: 0,
                    height: `${barHeight}px`,
                  }}
                  className="absolute w-2 bg-sky-400/80 hover:bg-sky-300 rounded-t-xs cursor-ns-resize"
                  title={`${midiToNoteName(n.note)}: Velocity ${n.velocity}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
