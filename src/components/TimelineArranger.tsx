/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  Upload,
  Music,
  Piano,
  Volume2,
  Trash2,
  Sliders,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from 'lucide-react';
import {
  GuideTrackState,
  InstrumentTrackState,
  MidiNoteEvent,
  TransportState,
} from '../types/daw';

interface TimelineArrangerProps {
  transport: TransportState;
  guideTrack: GuideTrackState;
  instrumentTrack: InstrumentTrackState;
  notes: MidiNoteEvent[];
  onSeek: (seconds: number) => void;
  onSetLoopRange: (start: number, end: number) => void;
  onUploadGuide: (file: File) => void;
  onClearGuide: () => void;
  onGuideVolumeChange: (vol: number) => void;
  onGuidePanChange: (pan: number) => void;
  onGuideMuteToggle: () => void;
  onGuideSoloToggle: () => void;
  onInstrumentVolumeChange: (vol: number) => void;
  onInstrumentPanChange: (pan: number) => void;
  onInstrumentMuteToggle: () => void;
  onInstrumentSoloToggle: () => void;
  onInstrumentArmToggle: () => void;
  onOpenPianoRoll: () => void;
}

export const TimelineArranger: React.FC<TimelineArrangerProps> = ({
  transport,
  guideTrack,
  instrumentTrack,
  notes,
  onSeek,
  onSetLoopRange,
  onUploadGuide,
  onClearGuide,
  onGuideVolumeChange,
  onGuidePanChange,
  onGuideMuteToggle,
  onGuideSoloToggle,
  onInstrumentVolumeChange,
  onInstrumentPanChange,
  onInstrumentMuteToggle,
  onInstrumentSoloToggle,
  onInstrumentArmToggle,
  onOpenPianoRoll,
}) => {
  // Pixels per second (zoom factor)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(40);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rulerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Total visible length in seconds
  const totalDuration = useMemo(() => {
    let max = Math.max(30, guideTrack.duration);
    for (const n of notes) {
      if (n.startTime + n.duration > max) max = n.startTime + n.duration;
    }
    return Math.max(max + 10, transport.loopEnd + 8);
  }, [guideTrack.duration, notes, transport.loopEnd]);

  const timelineWidth = Math.max(1000, totalDuration * pixelsPerSecond);

  // Draw audio waveform on canvas
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !guideTrack.peaks || guideTrack.peaks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const peaks = guideTrack.peaks[0]; // Channel 0 peaks
    const numPoints = peaks.length / 2;
    const guidePixelWidth = guideTrack.duration * pixelsPerSecond;
    const midY = height / 2;

    // Draw background subtle grid lines
    ctx.fillStyle = '#10121a';
    ctx.fillRect(0, 0, width, height);

    // Waveform gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(0.5, '#0284c7');
    gradient.addColorStop(1, '#38bdf8');

    ctx.fillStyle = gradient;
    ctx.beginPath();

    for (let i = 0; i < numPoints; i++) {
      const min = peaks[i * 2];
      const max = peaks[i * 2 + 1];
      const x = (i / numPoints) * guidePixelWidth;
      const yMin = midY + min * midY * 0.9;
      const yMax = midY + max * midY * 0.9;

      ctx.fillRect(x, yMin, Math.max(1, guidePixelWidth / numPoints), Math.max(1, yMax - yMin));
    }

    // Center zero-crossing line
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(guidePixelWidth, midY);
    ctx.stroke();
  }, [guideTrack.peaks, guideTrack.duration, pixelsPerSecond, timelineWidth]);

  // Handle ruler click to seek
  const handleRulerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekTime = Math.max(0, clickX / pixelsPerSecond);
    onSeek(seekTime);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadGuide(file);
    }
  };

  // Generate ruler bar marks
  const secondsPerBeat = 60 / transport.bpm;
  const secondsPerBar = secondsPerBeat * transport.timeSignature[0];
  const totalBars = Math.ceil(totalDuration / secondsPerBar);

  const playheadX = transport.currentTime * pixelsPerSecond;
  const loopStartX = transport.loopStart * pixelsPerSecond;
  const loopWidth = (transport.loopEnd - transport.loopStart) * pixelsPerSecond;

  return (
    <div className="flex-1 flex flex-col bg-[#0e1017] overflow-hidden select-none border-b border-[#232736]">
      {/* Hidden file input for guide audio */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Timeline Controls & Zoom Bar */}
      <div className="h-8 bg-[#141620] border-b border-[#232736] flex items-center justify-between px-3 text-xs text-neutral-400">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-neutral-300">Arranger & Tracks</span>
          <span className="text-neutral-600">|</span>
          <span className="text-[11px]">
            {notes.length} MIDI notes recorded · Guide:{' '}
            {guideTrack.fileName ? guideTrack.fileName : 'None'}
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-neutral-500">Zoom</span>
          <button
            onClick={() => setPixelsPerSecond((prev) => Math.max(20, prev - 10))}
            className="w-6 h-6 rounded bg-[#1c1f2b] hover:bg-[#272b3b] text-neutral-300 flex items-center justify-center border border-[#272c3d]"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={() => setPixelsPerSecond((prev) => Math.min(120, prev + 10))}
            className="w-6 h-6 rounded bg-[#1c1f2b] hover:bg-[#272b3b] text-neutral-300 flex items-center justify-center border border-[#272c3d]"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Arranger Body (Split Left Track Headers + Right Scrollable Timeline) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Track Headers (Fixed width 240px) */}
        <div className="w-60 bg-[#12141c] border-r border-[#232736] flex flex-col shrink-0 z-10 shadow-md">
          {/* Ruler spacer */}
          <div className="h-7 bg-[#161824] border-b border-[#232736] px-3 flex items-center text-[10px] uppercase font-bold tracking-wider text-neutral-500">
            Tracks
          </div>

          {/* Track 1 Header: Guide Audio */}
          <div className="h-28 border-b border-[#232736] p-2.5 flex flex-col justify-between bg-[#151722]/80 hover:bg-[#181b28] transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-neutral-200 truncate">
                    Guide Audio
                  </div>
                  <div className="text-[10px] text-neutral-500 truncate">
                    {guideTrack.fileName || 'No file imported'}
                  </div>
                </div>
              </div>

              {/* Import / Clear button */}
              {guideTrack.fileName ? (
                <button
                  onClick={onClearGuide}
                  title="Remove Guide Track"
                  className="w-5 h-5 rounded hover:bg-rose-950/60 text-neutral-500 hover:text-rose-400 flex items-center justify-center transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Import Guide Track Audio"
                  className="px-2 py-1 bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 text-[10px] font-semibold rounded border border-sky-500/40 flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-2.5 h-2.5" />
                  Import
                </button>
              )}
            </div>

            {/* Mute, Solo, Volume, Pan */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={onGuideMuteToggle}
                className={`w-6 h-5 rounded text-[10px] font-bold transition-colors ${
                  guideTrack.isMuted
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[#202434] text-neutral-400 hover:text-white'
                }`}
              >
                M
              </button>
              <button
                onClick={onGuideSoloToggle}
                className={`w-6 h-5 rounded text-[10px] font-bold transition-colors ${
                  guideTrack.isSolo
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'bg-[#202434] text-neutral-400 hover:text-white'
                }`}
              >
                S
              </button>

              <div className="flex-1 flex items-center gap-1.5 ml-1">
                <Volume2 className="w-3 h-3 text-neutral-500 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.02"
                  value={guideTrack.volume}
                  onChange={(e) => onGuideVolumeChange(parseFloat(e.target.value))}
                  className="w-full"
                  title={`Guide Volume: ${(guideTrack.volume * 100).toFixed(0)}%`}
                />
              </div>
            </div>
          </div>

          {/* Track 2 Header: Instrument Track */}
          <div className="h-28 border-b border-[#232736] p-2.5 flex flex-col justify-between bg-[#171a26] hover:bg-[#1a1e2d] transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <Piano className="w-3.5 h-3.5" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-neutral-200 truncate">
                    {instrumentTrack.name}
                  </div>
                  <div className="text-[10px] text-emerald-400 truncate">
                    Software Instrument
                  </div>
                </div>
              </div>

              {/* Arm Button */}
              <button
                onClick={onInstrumentArmToggle}
                title={`Record Arm (${instrumentTrack.isArmed ? 'Armed' : 'Disarmed'})`}
                className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all ${
                  instrumentTrack.isArmed
                    ? 'bg-rose-600 text-white border-rose-400 shadow-sm shadow-rose-900/50'
                    : 'bg-[#202434] text-neutral-500 border-[#2b3145] hover:text-neutral-300'
                }`}
              >
                R
              </button>
            </div>

            {/* Mute, Solo, Volume */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={onInstrumentMuteToggle}
                className={`w-6 h-5 rounded text-[10px] font-bold transition-colors ${
                  instrumentTrack.isMuted
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[#202434] text-neutral-400 hover:text-white'
                }`}
              >
                M
              </button>
              <button
                onClick={onInstrumentSoloToggle}
                className={`w-6 h-5 rounded text-[10px] font-bold transition-colors ${
                  instrumentTrack.isSolo
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'bg-[#202434] text-neutral-400 hover:text-white'
                }`}
              >
                S
              </button>

              <div className="flex-1 flex items-center gap-1.5 ml-1">
                <Volume2 className="w-3 h-3 text-neutral-500 shrink-0" />
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.02"
                  value={instrumentTrack.volume}
                  onChange={(e) => onInstrumentVolumeChange(parseFloat(e.target.value))}
                  className="w-full"
                  title={`Instrument Volume: ${(instrumentTrack.volume * 100).toFixed(0)}%`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Scrollable Arranger Lanes */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden relative bg-[#0b0c11]">
          <div
            style={{ width: `${timelineWidth}px` }}
            className="relative h-full flex flex-col"
          >
            {/* Top Ruler Bar */}
            <div
              ref={rulerRef}
              onClick={handleRulerMouseDown}
              className="h-7 bg-[#161824] border-b border-[#232736] relative cursor-pointer select-none"
            >
              {/* Loop Region Overlay */}
              {transport.loopEnabled && (
                <div
                  style={{
                    left: `${loopStartX}px`,
                    width: `${loopWidth}px`,
                  }}
                  className="absolute top-0 bottom-0 bg-amber-500/15 border-l-2 border-r-2 border-amber-400 pointer-events-none z-10"
                />
              )}

              {/* Bar number markers */}
              {Array.from({ length: totalBars }).map((_, barIdx) => {
                const barStartSec = barIdx * secondsPerBar;
                const leftPx = barStartSec * pixelsPerSecond;
                return (
                  <div
                    key={barIdx}
                    style={{ left: `${leftPx}px` }}
                    className="absolute top-0 bottom-0 flex items-end pb-1 border-l border-[#272c3d]"
                  >
                    <span className="text-[10px] font-mono text-neutral-400 pl-1">
                      {barIdx + 1}
                    </span>
                    {/* Beat ticks */}
                    {Array.from({ length: transport.timeSignature[0] - 1 }).map((__, beatIdx) => {
                      const beatPx = (beatIdx + 1) * secondsPerBeat * pixelsPerSecond;
                      return (
                        <div
                          key={beatIdx}
                          style={{ left: `${beatPx}px` }}
                          className="absolute bottom-0 h-2 w-[1px] bg-[#272c3d]"
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Lane 1: Guide Track Audio Waveform */}
            <div className="h-28 border-b border-[#232736] relative bg-[#10121a]">
              {guideTrack.buffer ? (
                <canvas
                  ref={waveformCanvasRef}
                  style={{
                    width: `${Math.max(10, guideTrack.duration * pixelsPerSecond)}px`,
                    height: '100%',
                  }}
                  className="absolute top-0 left-0"
                />
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-full flex flex-col items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-[#141622] cursor-pointer transition-colors border-2 border-dashed border-[#232736] m-1 rounded-md"
                >
                  <Upload className="w-5 h-5 mb-1 text-sky-400" />
                  <span className="text-xs font-medium">Click or drag local audio file to import as guide track</span>
                  <span className="text-[10px] text-neutral-600">Supports WAV, MP3, AAC, AIFF, FLAC</span>
                </div>
              )}
            </div>

            {/* Lane 2: Instrument Track MIDI Clip */}
            <div
              onClick={onOpenPianoRoll}
              className="h-28 border-b border-[#232736] relative bg-[#11131c] cursor-pointer hover:bg-[#131622] transition-colors"
              title="Double click to edit in Piano Roll"
            >
              {/* Background grid lines matching ruler */}
              {Array.from({ length: totalBars }).map((_, barIdx) => {
                const leftPx = barIdx * secondsPerBar * pixelsPerSecond;
                return (
                  <div
                    key={barIdx}
                    style={{ left: `${leftPx}px` }}
                    className="absolute top-0 bottom-0 border-l border-[#1a1d29] pointer-events-none"
                  />
                );
              })}

              {/* Rendered MIDI Note blocks */}
              {notes.map((n) => {
                const left = n.startTime * pixelsPerSecond;
                const width = Math.max(3, n.duration * pixelsPerSecond);
                // Pitch normalized (C1=24 to C7=96)
                const pitchNorm = Math.max(0, Math.min(1, (n.note - 24) / 72));
                const top = (1 - pitchNorm) * (112 - 12);

                return (
                  <div
                    key={n.id}
                    style={{
                      left: `${left}px`,
                      top: `${top}px`,
                      width: `${width}px`,
                      height: '7px',
                    }}
                    className="absolute bg-emerald-400/90 rounded-[2px] shadow-xs border border-emerald-300/40 pointer-events-none"
                  />
                );
              })}

              {notes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-500 pointer-events-none">
                  <span>Press Record (R) or connect your MIDI keyboard to play and record here</span>
                </div>
              )}
            </div>

            {/* Playhead Line */}
            <div
              style={{ left: `${playheadX}px` }}
              className="absolute top-0 bottom-0 w-[2px] bg-rose-500 shadow-md shadow-rose-500/80 pointer-events-none z-20"
            >
              {/* Playhead arrow head on ruler */}
              <div className="w-3 h-3 bg-rose-500 transform -translate-x-[5px] rotate-45 rounded-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
