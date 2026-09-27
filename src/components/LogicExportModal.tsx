/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Download,
  FileAudio,
  FileMusic,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { ExportSettings, InstrumentPreset, MidiNoteEvent } from '../types/daw';
import { renderAndExportWav, downloadBlob } from '../export/WavEncoder';
import { exportAndDownloadMidi } from '../export/MidiFileEncoder';

interface LogicExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: InstrumentPreset;
  notes: MidiNoteEvent[];
  guideBuffer: AudioBuffer | null;
  guideVolume: number;
  guidePan: number;
  bpm: number;
  customSampleBuffer: AudioBuffer | null;
}

export const LogicExportModal: React.FC<LogicExportModalProps> = ({
  isOpen,
  onClose,
  preset,
  notes,
  guideBuffer,
  guideVolume,
  guidePan,
  bpm,
  customSampleBuffer,
}) => {
  const [sampleRate, setSampleRate] = useState<44100 | 48000>(48000); // 48kHz standard in Logic Pro
  const [bitDepth, setBitDepth] = useState<16 | 24>(24); // 24-bit PCM standard
  const [includeGuideTrack, setIncludeGuideTrack] = useState<boolean>(false); // DEFAULT FALSE (instrument only!)
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [exportComplete, setExportComplete] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate duration
  let maxNoteEnd = 0;
  for (const n of notes) {
    if (n.startTime + n.duration > maxNoteEnd) maxNoteEnd = n.startTime + n.duration;
  }
  const estimatedDuration = Math.max(4.0, maxNoteEnd + (preset.synthParams.ampEnv.release || 1.0));

  const handleExportWav = async () => {
    setIsRendering(true);
    setRenderProgress(10);
    setExportComplete(null);

    try {
      const settings: ExportSettings = {
        sampleRate,
        bitDepth,
        includeGuideTrack,
        timeRange: 'all',
      };

      const result = await renderAndExportWav(
        preset,
        notes,
        guideBuffer,
        guideVolume,
        guidePan,
        bpm,
        settings,
        customSampleBuffer,
        (progress) => setRenderProgress(progress)
      );

      const filename = `AuraStudio_${preset.name.replace(/\s+/g, '_')}_${sampleRate / 1000}kHz_${bitDepth}bit.wav`;
      downloadBlob(result.blob, filename);

      setExportComplete(`Exported ${filename} (${result.duration.toFixed(1)}s, ${sampleRate}Hz, ${bitDepth}-bit uncompressed PCM).`);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsRendering(false);
    }
  };

  const handleExportMidi = () => {
    try {
      const filename = `AuraStudio_${preset.name.replace(/\s+/g, '_')}_Take.mid`;
      exportAndDownloadMidi(notes, bpm, preset.name, filename);
      setExportComplete(`Exported Standard MIDI File: ${filename} with ${notes.length} notes and tempo track.`);
    } catch (err) {
      console.error('MIDI export error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-[#131622] border border-[#272c3d] rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="h-14 bg-[#181c2b] border-b border-[#272c3d] px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Logic Pro Stem & MIDI Exporter</h2>
              <p className="text-[11px] text-neutral-400">Offline sample-accurate rendering with exact bar-1 zero-latency sync</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#252a3d] text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 text-neutral-300 text-xs overflow-y-auto max-h-[80vh]">
          {/* Workflow Explanation Banner */}
          <div className="bg-[#181d2c] border border-sky-900/40 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sky-300 font-semibold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>Logic Pro Import Guidelines</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              • <strong className="text-white">WAV Audio Bounce:</strong> High-resolution uncompressed PCM stem rendered with all synthesis, envelopes, and studio effects. It preserves any intentional lead-in silence before bar 1 so you can drag it straight into an audio track in Logic Pro and it aligns automatically.
            </p>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              • <strong className="text-white">Standard MIDI File (.mid):</strong> Contains editable note events, velocities, and tempo. Drag this onto a Logic Pro Software Instrument track (e.g. Alchemy, Studio Grand, Retro Synth) to edit individual notes and velocities.
            </p>
          </div>

          {/* Export Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Sample Rate */}
            <div className="bg-[#171a27] border border-[#272c3d] rounded-xl p-3.5 space-y-2">
              <span className="font-semibold text-neutral-200">Sample Rate</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSampleRate(48000)}
                  className={`py-2 px-3 rounded-lg border font-mono font-medium transition-colors text-center ${
                    sampleRate === 48000
                      ? 'bg-sky-600/30 text-sky-200 border-sky-500'
                      : 'bg-[#1b1f30] text-neutral-400 border-[#272c3d] hover:text-white'
                  }`}
                >
                  <div className="text-xs">48.0 kHz</div>
                  <div className="text-[10px] text-neutral-400 font-sans">Logic Pro Default</div>
                </button>
                <button
                  onClick={() => setSampleRate(44100)}
                  className={`py-2 px-3 rounded-lg border font-mono font-medium transition-colors text-center ${
                    sampleRate === 44100
                      ? 'bg-sky-600/30 text-sky-200 border-sky-500'
                      : 'bg-[#1b1f30] text-neutral-400 border-[#272c3d] hover:text-white'
                  }`}
                >
                  <div className="text-xs">44.1 kHz</div>
                  <div className="text-[10px] text-neutral-400 font-sans">CD / Streaming</div>
                </button>
              </div>
            </div>

            {/* Bit Depth */}
            <div className="bg-[#171a27] border border-[#272c3d] rounded-xl p-3.5 space-y-2">
              <span className="font-semibold text-neutral-200">Bit Depth</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setBitDepth(24)}
                  className={`py-2 px-3 rounded-lg border font-mono font-medium transition-colors text-center ${
                    bitDepth === 24
                      ? 'bg-sky-600/30 text-sky-200 border-sky-500'
                      : 'bg-[#1b1f30] text-neutral-400 border-[#272c3d] hover:text-white'
                  }`}
                >
                  <div className="text-xs">24-Bit PCM</div>
                  <div className="text-[10px] text-neutral-400 font-sans">Studio Standard</div>
                </button>
                <button
                  onClick={() => setBitDepth(16)}
                  className={`py-2 px-3 rounded-lg border font-mono font-medium transition-colors text-center ${
                    bitDepth === 16
                      ? 'bg-sky-600/30 text-sky-200 border-sky-500'
                      : 'bg-[#1b1f30] text-neutral-400 border-[#272c3d] hover:text-white'
                  }`}
                >
                  <div className="text-xs">16-Bit PCM</div>
                  <div className="text-[10px] text-neutral-400 font-sans">CD Audio</div>
                </button>
              </div>
            </div>
          </div>

          {/* Stem Source Selection (Instrument Only vs Mix) */}
          <div className="bg-[#171a27] border border-[#272c3d] rounded-xl p-4 space-y-3">
            <span className="font-semibold text-neutral-200">Bounce Audio Source</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setIncludeGuideTrack(false)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  !includeGuideTrack
                    ? 'bg-sky-950/40 border-sky-500 text-white shadow-xs'
                    : 'bg-[#1b1f30] border-[#272c3d] text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-sky-300">Instrument Only (Stem)</span>
                  {!includeGuideTrack && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Recommended for Logic Pro. Renders only your recorded instrument so the guide audio does not bleed into your stem.
                </p>
              </div>

              <div
                onClick={() => setIncludeGuideTrack(true)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  includeGuideTrack
                    ? 'bg-amber-950/40 border-amber-500 text-white shadow-xs'
                    : 'bg-[#1b1f30] border-[#272c3d] text-neutral-400 hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-amber-300">Master Mix (Instrument + Guide)</span>
                  {includeGuideTrack && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-[11px] text-neutral-400">
                  Combines instrument take with imported guide audio into a stereo reference bounce.
                </p>
              </div>
            </div>
          </div>

          {/* Summary Details */}
          <div className="flex items-center justify-between bg-[#11131c] px-4 py-2.5 rounded-lg border border-[#232736] font-mono text-[11px]">
            <span className="text-neutral-400">Estimated Duration:</span>
            <span className="text-emerald-400 font-semibold">{estimatedDuration.toFixed(1)} seconds</span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-400">Start Time:</span>
            <span className="text-sky-400 font-semibold">0.000s (Sample Aligned)</span>
            <span className="text-neutral-500">·</span>
            <span className="text-neutral-400">Notes:</span>
            <span className="text-white font-semibold">{notes.length} events</span>
          </div>

          {/* Rendering Progress Bar */}
          {isRendering && (
            <div className="space-y-1.5 bg-[#171a27] p-3 rounded-lg border border-sky-800">
              <div className="flex justify-between text-xs text-sky-300">
                <span>Offline Rendering Audio Buffer...</span>
                <span className="font-mono">{renderProgress}%</span>
              </div>
              <div className="w-full h-2 bg-[#10121b] rounded-full overflow-hidden">
                <div
                  style={{ width: `${renderProgress}%` }}
                  className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-150"
                />
              </div>
            </div>
          )}

          {/* Export Complete Notification */}
          {exportComplete && (
            <div className="bg-emerald-950/60 border border-emerald-600/40 rounded-lg p-3 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{exportComplete}</span>
            </div>
          )}

          {/* Download Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleExportWav}
              disabled={isRendering || notes.length === 0}
              className="py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-900/40 flex items-center justify-center gap-2 transition-colors"
            >
              <FileAudio className="w-4 h-4" />
              <span>Download Logic Pro WAV Stem</span>
            </button>

            <button
              onClick={handleExportMidi}
              disabled={notes.length === 0}
              className="py-3 px-4 bg-[#1f2436] hover:bg-[#282f47] disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 font-semibold text-xs rounded-xl border border-[#2b334d] flex items-center justify-center gap-2 transition-colors"
            >
              <FileMusic className="w-4 h-4 text-emerald-400" />
              <span>Download Standard MIDI File (.mid)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
