/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Play,
  Square,
  Wand2,
  Check,
  Save,
  Volume2,
  Sliders,
  Layers,
  Activity,
  Music,
  RefreshCw,
  Flame,
  ArrowRight,
  Info,
} from 'lucide-react';
import { InstrumentPreset } from '../types/daw';
import {
  generateInstrumentSoundFromPrompt,
  INSPIRING_PROMPT_TEMPLATES,
  PromptTemplate,
} from '../services/aiSoundService';
import { AudioEngine } from '../audio/AudioEngine';
import { playAuditionRiff, stopAuditionRiff } from '../audio/auditionRiff';

interface AiSoundGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset: (preset: InstrumentPreset) => void;
  onSaveCustomPreset: (preset: InstrumentPreset) => void;
  engine: AudioEngine | null;
}

export const AiSoundGeneratorModal: React.FC<AiSoundGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApplyPreset,
  onSaveCustomPreset,
  engine,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedPreset, setGeneratedPreset] = useState<InstrumentPreset | null>(null);
  const [isAuditioning, setIsAuditioning] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [activePreviewNotes, setActivePreviewNotes] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) {
      if (engine) stopAuditionRiff(engine);
      setIsAuditioning(false);
    }
  }, [isOpen, engine]);

  if (!isOpen) return null;

  const filteredTemplates = selectedCategory === 'all'
    ? INSPIRING_PROMPT_TEMPLATES
    : INSPIRING_PROMPT_TEMPLATES.filter((t) => t.category === selectedCategory);

  const handleSelectTemplate = (template: PromptTemplate) => {
    setPrompt(template.prompt);
    setError(null);
  };

  const handleSurpriseMe = () => {
    const randomIdx = Math.floor(Math.random() * INSPIRING_PROMPT_TEMPLATES.length);
    setPrompt(INSPIRING_PROMPT_TEMPLATES[randomIdx].prompt);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description or pick an inspiring instrument style below.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedPreset(null);
    setIsSaved(false);

    // Dynamic progress indicators
    setGenerationStep('Analyzing acoustic timbre and overtone physics...');
    const stepTimer1 = setTimeout(() => {
      setGenerationStep('Synthesizing physical acoustic partials & transient strike...');
    }, 900);
    const stepTimer2 = setTimeout(() => {
      setGenerationStep('Engineering dual oscillators, 24dB filter matrix & stereo FX...');
    }, 1800);

    try {
      const preset = await generateInstrumentSoundFromPrompt(prompt);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setGenerationStep('Finalizing high-resolution audio buffer...');

      // Pre-apply to audio engine for instant preview
      if (engine) {
        engine.setPreset(preset);
      }

      setGeneratedPreset(preset);
      setIsGenerating(false);

      // Auto-play audition riff so user immediately hears the realistic instrument!
      if (engine) {
        setIsAuditioning(true);
        playAuditionRiff(engine, preset, () => {
          setIsAuditioning(false);
        });
      }
    } catch (err: unknown) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsGenerating(false);
      setError(err instanceof Error ? err.message : 'Failed to generate sound preset');
    }
  };

  const handleToggleAudition = () => {
    if (!engine || !generatedPreset) return;
    if (isAuditioning) {
      stopAuditionRiff(engine);
      setIsAuditioning(false);
    } else {
      setIsAuditioning(true);
      playAuditionRiff(engine, generatedPreset, () => {
        setIsAuditioning(false);
      });
    }
  };

  const handleApply = () => {
    if (!generatedPreset) return;
    if (engine) stopAuditionRiff(engine);
    onApplyPreset(generatedPreset);
    onClose();
  };

  const handleSaveToPresets = () => {
    if (!generatedPreset) return;
    onSaveCustomPreset(generatedPreset);
    setIsSaved(true);
  };

  // Mini preview keyboard note handlers
  const handlePreviewNoteOn = (note: number) => {
    if (!engine) return;
    engine.handleLiveNoteOn(note, 95);
    setActivePreviewNotes((prev) => [...prev, note]);
  };

  const handlePreviewNoteOff = (note: number) => {
    if (!engine) return;
    engine.handleLiveNoteOff(note);
    setActivePreviewNotes((prev) => prev.filter((n) => n !== note));
  };

  const previewKeys = [
    { note: 60, name: 'C4', isBlack: false },
    { note: 61, name: 'C#4', isBlack: true },
    { note: 62, name: 'D4', isBlack: false },
    { note: 63, name: 'D#4', isBlack: true },
    { note: 64, name: 'E4', isBlack: false },
    { note: 65, name: 'F4', isBlack: false },
    { note: 66, name: 'F#4', isBlack: true },
    { note: 67, name: 'G4', isBlack: false },
    { note: 68, name: 'G#4', isBlack: true },
    { note: 69, name: 'A4', isBlack: false },
    { note: 70, name: 'A#4', isBlack: true },
    { note: 71, name: 'B4', isBlack: false },
    { note: 72, name: 'C5', isBlack: false },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#12141d] border border-[#2a3045] w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#161a26] border-b border-[#262c3e] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-sky-500 to-emerald-400 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                AI Sound Generator
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-sky-500/20 text-sky-300 border border-sky-500/30">
                  Ultra-Realistic Physics
                </span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Describe any instrument, acoustic timbre, or synth tone to engineer high-fidelity MIDI sounds
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (engine) stopAuditionRiff(engine);
              onClose();
            }}
            className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-[#232736] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Prompt Input Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-sky-400" />
                Prompt / Sonic Description
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSurpriseMe}
                  className="text-[11px] font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1 bg-[#1a1e2d] hover:bg-[#22283b] px-2.5 py-0.5 rounded border border-[#2b334a] transition-colors"
                >
                  <Flame className="w-3 h-3 text-amber-400" />
                  Inspire Me / Randomize
                </button>
                {prompt && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    className="text-[11px] text-neutral-500 hover:text-neutral-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="E.g., Ultra-realistic Steinway concert grand with soft felt hammer strike, intimate room resonance, and warm harmonic decay..."
                rows={3}
                className="w-full bg-[#181c28] border border-[#2a3045] rounded-lg p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500 resize-none font-sans leading-relaxed"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
              <div className="absolute right-2.5 bottom-2.5 text-[10px] text-neutral-500">
                Ctrl+Enter to generate
              </div>
            </div>
          </div>

          {/* Quick Style / Template Pills */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-neutral-400">
                Or Pick an Authentic Instrument Archetype:
              </span>
              <div className="flex items-center gap-1 text-[10px]">
                {['all', 'piano', 'keys', 'bass', 'strings', 'synth', 'pad'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`capitalize px-2 py-0.5 rounded transition-colors ${
                      selectedCategory === cat
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 font-semibold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {filteredTemplates.map((template) => (
                <button
                  key={template.title}
                  onClick={() => handleSelectTemplate(template)}
                  className="text-left bg-[#161a25] hover:bg-[#1f2537] border border-[#242b3d] hover:border-sky-500/50 p-2 rounded-lg transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-semibold text-neutral-200 group-hover:text-white flex items-center gap-1.5">
                      <Music className="w-3 h-3 text-sky-400" />
                      {template.title}
                    </span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 bg-[#202638] text-neutral-400 rounded">
                      {template.category}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 line-clamp-1 leading-snug">
                    {template.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-950/40 border border-red-800/60 rounded-lg p-3 text-xs text-red-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generation Progress Banner */}
          {isGenerating && (
            <div className="bg-gradient-to-r from-indigo-950/60 via-sky-950/60 to-purple-950/60 border border-sky-500/40 rounded-lg p-4 flex items-center gap-3.5 animate-pulse">
              <RefreshCw className="w-5 h-5 text-sky-400 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-semibold text-sky-200">
                  Engineering Realistic Sound...
                </p>
                <p className="text-[11px] text-sky-400/80">{generationStep}</p>
              </div>
            </div>
          )}

          {/* Generated Result Card */}
          {generatedPreset && (
            <div className="bg-[#151924] border border-[#2f374e] rounded-xl p-4 space-y-3 shadow-lg">
              {/* Sound Header & Audition Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#242b3d] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      {generatedPreset.name}
                    </h3>
                    <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {generatedPreset.category}
                    </span>
                    {generatedPreset.isSampleBased && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Physical Acoustic Model
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                    {generatedPreset.description}
                  </p>
                </div>

                {/* Audition Button */}
                <button
                  onClick={handleToggleAudition}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all shadow-sm ${
                    isAuditioning
                      ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isAuditioning ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      Stop Audition
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Audition Riff
                    </>
                  )}
                </button>
              </div>

              {/* Acoustic & Synthesis Specs Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="bg-[#1a1f2e] p-2 rounded border border-[#272e42]">
                  <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Oscillators</span>
                  <span className="text-white font-medium">
                    {generatedPreset.synthParams.osc1.type} + {generatedPreset.synthParams.osc2.type}
                  </span>
                </div>
                <div className="bg-[#1a1f2e] p-2 rounded border border-[#272e42]">
                  <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Filter Cutoff</span>
                  <span className="text-white font-medium">
                    {Math.round(generatedPreset.synthParams.filter.cutoff)} Hz ({generatedPreset.synthParams.filter.type})
                  </span>
                </div>
                <div className="bg-[#1a1f2e] p-2 rounded border border-[#272e42]">
                  <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Transient Strike</span>
                  <span className="text-white font-medium capitalize">
                    {generatedPreset.sampleParams?.sampleRecipe?.transientNoiseType || 'Analog Strike'}
                  </span>
                </div>
                <div className="bg-[#1a1f2e] p-2 rounded border border-[#272e42]">
                  <span className="text-neutral-400 block text-[10px] uppercase font-semibold">Harmonic Partials</span>
                  <span className="text-white font-medium">
                    {generatedPreset.sampleParams?.sampleRecipe?.harmonics?.length || 4} Overtones
                  </span>
                </div>
              </div>

              {/* Interactive Mini Preview Keyboard */}
              <div className="bg-[#10121a] p-2.5 rounded-lg border border-[#222737] flex flex-col items-center">
                <span className="text-[10px] text-neutral-400 mb-1.5 font-medium">
                  Test Notes / Velocity on Mini Keyboard:
                </span>
                <div className="flex h-16 select-none relative">
                  {previewKeys.map((k) => {
                    const isDown = activePreviewNotes.includes(k.note);
                    if (k.isBlack) {
                      return (
                        <div
                          key={k.note}
                          onMouseDown={() => handlePreviewNoteOn(k.note)}
                          onMouseUp={() => handlePreviewNoteOff(k.note)}
                          onMouseLeave={() => handlePreviewNoteOff(k.note)}
                          className={`w-6 h-10 -mx-3 z-10 rounded-b cursor-pointer transition-colors ${
                            isDown ? 'bg-sky-500 shadow-md shadow-sky-500/50' : 'bg-neutral-900 hover:bg-neutral-800'
                          } border border-neutral-700`}
                          title={k.name}
                        />
                      );
                    }
                    return (
                      <div
                        key={k.note}
                        onMouseDown={() => handlePreviewNoteOn(k.note)}
                        onMouseUp={() => handlePreviewNoteOff(k.note)}
                        onMouseLeave={() => handlePreviewNoteOff(k.note)}
                        className={`w-8 h-16 rounded-b cursor-pointer flex items-end justify-center pb-1 text-[9px] font-semibold transition-colors ${
                          isDown ? 'bg-sky-300 text-sky-950' : 'bg-neutral-200 hover:bg-white text-neutral-600'
                        } border-r border-neutral-400 last:border-r-0`}
                      >
                        {k.name}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#141722] border-t border-[#242b3d] flex items-center justify-between shrink-0">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 via-sky-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-sky-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGenerating ? 'Generating...' : generatedPreset ? 'Regenerate Sound' : 'Generate Realistic Sound'}
          </button>

          <div className="flex items-center gap-2">
            {generatedPreset && (
              <button
                onClick={handleSaveToPresets}
                disabled={isSaved}
                className="px-3 py-2 text-xs font-medium bg-[#1e2333] hover:bg-[#282f45] text-neutral-200 rounded-lg border border-[#2b334a] flex items-center gap-1.5 transition-colors disabled:opacity-70"
              >
                {isSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5 text-sky-400" />}
                {isSaved ? 'Saved to Presets' : 'Save to Presets'}
              </button>
            )}

            {generatedPreset ? (
              <button
                onClick={handleApply}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Apply & Play in Studio
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs text-neutral-400 hover:text-white rounded-lg"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
