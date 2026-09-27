/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Pause,
  Square,
  Circle,
  Repeat,
  Volume2,
  Sliders,
  Download,
  Settings,
  Piano,
  RotateCcw,
  Sparkles,
  FileMusic,
} from 'lucide-react';
import { TransportState, MidiDeviceState } from '../types/daw';
import { formatBarsBeatsTicks, formatTimeMs } from '../utils/musicMath';

interface TopTransportBarProps {
  transport: TransportState;
  midiState: MidiDeviceState;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onSeek: (seconds: number) => void;
  onBpmChange: (bpm: number) => void;
  onLoopToggle: () => void;
  onMetronomeToggle: () => void;
  onCountInChange: (bars: number) => void;
  onOpenExport: () => void;
  onOpenSettings: () => void;
}

export const TopTransportBar: React.FC<TopTransportBarProps> = ({
  transport,
  midiState,
  activeTab,
  onTabChange,
  onPlay,
  onStop,
  onRecord,
  onSeek,
  onBpmChange,
  onLoopToggle,
  onMetronomeToggle,
  onCountInChange,
  onOpenExport,
  onOpenSettings,
}) => {
  const [isEditingBpm, setIsEditingBpm] = useState(false);
  const [bpmInput, setBpmInput] = useState(String(transport.bpm));
  const [lastTapTime, setLastTapTime] = useState<number | null>(null);

  const handleTapTempo = () => {
    const now = performance.now();
    if (lastTapTime && now - lastTapTime < 2500) {
      const interval = (now - lastTapTime) / 1000;
      const calculatedBpm = Math.round(60 / interval);
      if (calculatedBpm >= 40 && calculatedBpm <= 280) {
        onBpmChange(calculatedBpm);
        setBpmInput(String(calculatedBpm));
      }
    }
    setLastTapTime(now);
  };

  const handleBpmBlur = () => {
    setIsEditingBpm(false);
    const parsed = parseInt(bpmInput, 10);
    if (!isNaN(parsed) && parsed >= 30 && parsed <= 300) {
      onBpmChange(parsed);
    } else {
      setBpmInput(String(transport.bpm));
    }
  };

  const isMidiActive = Date.now() - midiState.lastActivityTimestamp < 300;

  return (
    <header className="h-14 bg-[#12141a] border-b border-[#232736] flex items-center justify-between px-4 select-none shrink-0 z-30">
      {/* Zone 1: Wordmark / Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-sky-400 flex items-center justify-center shadow-sm">
            <Piano className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            AuraStudio
          </span>
        </div>

        {/* View Switcher Tabs */}
        <nav className="hidden lg:flex items-center gap-1 ml-4 bg-[#181b24] p-1 rounded-lg border border-[#272c3d]">
          <button
            onClick={() => onTabChange('sound')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'sound'
                ? 'bg-[#2b3145] text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Sound Design
          </button>
          <button
            onClick={() => onTabChange('pianoroll')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'pianoroll'
                ? 'bg-[#2b3145] text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Piano Roll
          </button>
          <button
            onClick={() => onTabChange('mixer')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'mixer'
                ? 'bg-[#2b3145] text-white shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Mixer
          </button>
          <button
            onClick={() => onTabChange('export')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'export'
                ? 'bg-sky-600/30 text-sky-300 border border-sky-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-sky-300'
            }`}
          >
            Logic Export
          </button>
        </nav>
      </div>

      {/* Zone 2: Main Transport Center Controls */}
      <div className="flex items-center gap-3">
        {/* Rewind to Zero */}
        <button
          onClick={() => onSeek(0)}
          title="Return to Zero (Home)"
          className="w-8 h-8 rounded-md flex items-center justify-center bg-[#1b1e2a] hover:bg-[#252a3b] text-neutral-300 border border-[#272c3d] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Play Button */}
        <button
          onClick={transport.isPlaying && !transport.isRecording ? onStop : onPlay}
          title={transport.isPlaying ? 'Pause' : 'Play (Space)'}
          className={`w-9 h-8 rounded-md flex items-center justify-center transition-colors border ${
            transport.isPlaying && !transport.isRecording
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-900/40'
              : 'bg-[#1b1e2a] hover:bg-[#252a3b] text-emerald-400 border-[#272c3d]'
          }`}
        >
          {transport.isPlaying && !transport.isRecording ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Stop Button */}
        <button
          onClick={onStop}
          title="Stop (Space)"
          className="w-8 h-8 rounded-md flex items-center justify-center bg-[#1b1e2a] hover:bg-[#252a3b] text-neutral-300 border border-[#272c3d] transition-colors"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Record Button */}
        <button
          onClick={transport.isRecording ? onStop : onRecord}
          title={transport.isRecording ? 'Stop Recording (R)' : 'Record MIDI Take (R)'}
          className={`w-9 h-8 rounded-md flex items-center justify-center transition-all border ${
            transport.isRecording
              ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/60 animate-pulse'
              : transport.isCountingIn
              ? 'bg-amber-600 text-white border-amber-500 animate-pulse'
              : 'bg-[#1b1e2a] hover:bg-[#252a3b] text-rose-500 border-[#272c3d]'
          }`}
        >
          <Circle className="w-4 h-4 fill-current" />
        </button>

        {/* Loop Toggle */}
        <button
          onClick={onLoopToggle}
          title={`Cycle Loop (${transport.loopEnabled ? 'Enabled' : 'Disabled'})`}
          className={`px-2.5 h-8 rounded-md flex items-center gap-1.5 text-xs font-medium border transition-colors ${
            transport.loopEnabled
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
              : 'bg-[#1b1e2a] text-neutral-400 border-[#272c3d] hover:text-neutral-200'
          }`}
        >
          <Repeat className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Loop</span>
        </button>

        {/* LCD Counter Display (Bars:Beats:Ticks & mm:ss.ms) */}
        <div className="bg-[#0b0c10] border border-[#232736] rounded-md px-3 py-1 flex items-center gap-4 text-xs font-mono shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">Bars.Beats</span>
            <span className="text-emerald-400 font-semibold text-sm tracking-widest tabular-nums">
              {transport.isCountingIn
                ? `CNT -${transport.countInRemaining}`
                : formatBarsBeatsTicks(transport.currentTime, transport.bpm, transport.timeSignature)}
            </span>
          </div>
          <div className="w-[1px] h-6 bg-[#232736]" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase tracking-wider text-neutral-500">Time</span>
            <span className="text-sky-400 font-semibold text-sm tracking-widest tabular-nums">
              {formatTimeMs(transport.currentTime)}
            </span>
          </div>
        </div>

        {/* BPM & Tempo Tap */}
        <div className="flex items-center bg-[#1b1e2a] border border-[#272c3d] rounded-md p-0.5">
          <div className="px-2 py-0.5 flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-wider text-neutral-500">BPM</span>
            {isEditingBpm ? (
              <input
                type="number"
                value={bpmInput}
                autoFocus
                onChange={(e) => setBpmInput(e.target.value)}
                onBlur={handleBpmBlur}
                onKeyDown={(e) => e.key === 'Enter' && handleBpmBlur()}
                className="w-12 bg-transparent text-sm font-mono font-semibold text-white focus:outline-none"
              />
            ) : (
              <span
                onClick={() => setIsEditingBpm(true)}
                className="text-sm font-mono font-semibold text-white cursor-pointer hover:text-sky-300"
              >
                {transport.bpm}
              </span>
            )}
          </div>
          <button
            onClick={handleTapTempo}
            title="Tap Tempo"
            className="px-2 py-1 text-[10px] font-semibold text-neutral-400 hover:text-white bg-[#141620] rounded hover:bg-[#202534] transition-colors"
          >
            TAP
          </button>
        </div>

        {/* Metronome & Count-in */}
        <div className="flex items-center gap-1 bg-[#1b1e2a] border border-[#272c3d] rounded-md p-1">
          <button
            onClick={onMetronomeToggle}
            title={`Metronome Click (${transport.metronomeEnabled ? 'On' : 'Off'})`}
            className={`w-7 h-6 rounded flex items-center justify-center text-xs font-semibold transition-colors ${
              transport.metronomeEnabled
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>

          {/* Count-in Selector */}
          <select
            value={transport.countInBars}
            onChange={(e) => onCountInChange(Number(e.target.value))}
            title="Count-In Bars"
            className="bg-[#141620] text-neutral-300 text-[11px] rounded px-1.5 py-0.5 border border-[#272c3d] focus:outline-none cursor-pointer"
          >
            <option value={0}>0 Bar</option>
            <option value={1}>1 Bar</option>
            <option value={2}>2 Bars</option>
          </select>
        </div>
      </div>

      {/* Zone 3: MIDI Connection Status & Logic Pro Export Action */}
      <div className="flex items-center gap-3">
        {/* MIDI Hardware LED & Status */}
        <div
          onClick={onOpenSettings}
          title={
            midiState.supported
              ? `Web MIDI: ${midiState.inputs.length} device(s) connected. Click to manage.`
              : 'Web MIDI unavailable in this browser. Using computer keyboard.'
          }
          className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1b1e2a] border border-[#272c3d] rounded-md cursor-pointer hover:border-neutral-500 transition-colors"
        >
          <div className="relative flex items-center justify-center">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                midiState.inputs.length > 0
                  ? isMidiActive
                    ? 'bg-emerald-400 shadow-md shadow-emerald-400/80 scale-125'
                    : 'bg-emerald-500'
                  : 'bg-neutral-500'
              } transition-all`}
            />
          </div>
          <span className="text-xs text-neutral-300 font-medium truncate max-w-[130px]">
            {midiState.inputs.length > 0
              ? midiState.inputs[0].name?.split(' ')[0] || 'MIDI Ready'
              : 'Keyboard'}
          </span>
        </div>

        {/* Logic Pro Stem Export Action */}
        <button
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors shadow-xs shadow-sky-900/30 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Bounce for Logic</span>
        </button>

        {/* Project & Settings */}
        <button
          onClick={onOpenSettings}
          title="Project & MIDI Settings"
          className="w-8 h-8 rounded-md flex items-center justify-center bg-[#1b1e2a] hover:bg-[#252a3b] text-neutral-300 border border-[#272c3d] transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
