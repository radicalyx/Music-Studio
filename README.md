# AuraStudio - MIDI Music & Stem Studio for Logic Pro

AuraStudio is a browser-based music instrument studio and stem generation workstation designed for songwriters, producers, and film composers. It allows you to connect a hardware MIDI keyboard, design custom synthesizer and sample-mapped instruments, record in sync with an imported audio guide track, edit takes in an interactive piano roll, and export sample-aligned WAV stems and Standard MIDI Files (.mid) for direct drag-and-drop into Apple Logic Pro.

---

## Browser Requirements & Web MIDI Compatibility

| Browser | Web MIDI Support | Latency / Audio Engine |
| :--- | :--- | :--- |
| **Google Chrome / Chromium** | **Full Native Support** (Plug & Play USB/Bluetooth) | Low Latency Web Audio (Recommended) |
| **Microsoft Edge** | **Full Native Support** | Low Latency Web Audio (Recommended) |
| **Opera / Brave / Vivaldi** | **Full Native Support** | Low Latency Web Audio |
| **Apple Safari** | Restricted / Virtual Fallback | Full Audio Engine + Computer Keyboard / Touch |
| **Mozilla Firefox** | Restricted / Virtual Fallback | Full Audio Engine + Computer Keyboard / Touch |

*Note: In browsers where the Web MIDI API is restricted or permissions are denied, AuraStudio seamlessly activates its built-in playable on-screen keyboard and computer keyboard QWERTY fallback.*

---

## MIDI Keyboard Setup & Controls

1. **Connect Hardware:** Plug your USB or Bluetooth MIDI keyboard into your computer before or after opening AuraStudio.
2. **Permission Prompt:** When prompted by your browser, click **Allow** to grant Web MIDI access.
3. **Multi-Controller Support:**
   - **Note On / Note Off with Velocity:** Dynamic strike response (0–127).
   - **Sustain Pedal (CC 64):** Full acoustic pedal emulation (holds note releases until the pedal is lifted).
   - **Pitch Bend Wheel:** High-resolution 14-bit continuous pitch bending (default ±2 semitones).
   - **Modulation Wheel (CC 1):** Routes to vibrato or filter LFO depth.
4. **Computer Keyboard Mapping (Fallback):**
   - **White Keys:** `A` (C), `S` (D), `D` (E), `F` (F), `G` (G), `H` (A), `J` (B), `K` (C+1), `L` (D+1), `;` (E+1), `'` (F+1)
   - **Black Keys:** `W` (C#), `E` (D#), `T` (F#), `Y` (G#), `U` (A#), `O` (C#+1), `P` (D#+1)
   - **Octave Transpose:** `Z` (Octave Down), `X` (Octave Up)
   - **Velocity Adjust:** `C` (-15 Velocity), `V` (+15 Velocity)
   - **Transport Shortcuts:** `Space` (Play / Pause / Stop), `R` (Record Armed Take), `Ctrl+Z` / `Ctrl+Y` (Undo / Redo)

---

## AI Sound Generation (Text-to-Realistic Instrument)

AuraStudio features an integrated **AI Sound Generator** powered by Gemini (`gemini-3.8-flash`) and acoustic physical modeling. You can describe any instrument, acoustic timbre, or synth tone in natural language to engineer ultra-realistic, playable instruments.

### Key Capabilities:
- **Acoustic Physical Modeling & Synthesis:** Analyzes your prompt to calculate physical overtone series (fundamental and harmonic decay curves), transient strike characteristics (felt hammer strikes, metal tine pings, rosin bow friction, wooden plectrum snaps, breath chuffs), dual detuned analog oscillators, 24dB resonant lowpass filters with keyboard tracking, dynamic envelopes, and stereo space effects (analog drive, chorus, delay, hall reverb).
- **Instant Audition Riff:** Features an authentic chord progression or bass groove preview so you can immediately hear the nuance and dynamics of the generated instrument without touching a key.
- **Interactive Mini Keyboard Preview:** Play notes and test velocity response directly inside the generator modal before loading into your session.
- **Direct Studio Integration:** One-click "Apply & Play in Studio" loads the instrument onto your software instrument track, synthesizes the sample buffer, and readies it for live recording and offline Logic Pro export.
- **Save to Custom Presets:** Store your favorite generated sounds locally in browser storage or export them with your project.

### Inspiring Prompt Examples:
- *"Ultra-realistic Steinway concert grand with soft felt hammer strike, intimate room resonance, and warm harmonic decay"*
- *"Vintage 1973 Fender Rhodes Stage 73 electric piano through warm tube preamp, bell-like metallic tine strike, rich 2nd & 3rd harmonic partials, and stereo chorus tremolo"*
- *"Punchy analog Moog Minimoog Model D bass with dual detuned sawtooth waves, sub-oscillator punch, snappy filter envelope, and saturated transistor drive"*
- *"Acoustic solo chamber cello with authentic rosin bow friction transient, expressive vibrato, wooden chamber resonance, and natural string sustain"*
- *"Iconic 1980s Oberheim OB-Xa analog polysynth brass swell with detuned sawtooth oscillators, resonant 24dB lowpass envelope sweep, and lush stereo width"*

---

## Sound Design & Custom Instruments

- **Starter Presets:**
  - *Concert Grand (Synthetic Approx.)* — Dual harmonic oscillators with hammer strike transient (clearly labeled approximation; for 100% natural realism, load audio samples into the Sampler).
  - *Vintage Suitcase EP* — Rhodes tine bell overtone emulation with stereo chorus and tremolo.
  - *Juno-Style Analog Poly* — Classic 80s warmth with resonant 24dB filter and chorus.
  - *Model D Punchy Sub Bass* — Monophonic bass with legato portamento glide and saturation drive.
  - *Dreamscape Ambient Strings* — Slow-attack blooming strings with algorithmic hall reverb.
  - *Outrun Synthwave Lead* — Punchy neon lead with delay and mod-wheel vibrato.
  - *808 Drum Machine Kit* — Analog percussion mapped across C1–C2 (Kick, Snare, Hi-Hats, Clap).
  - *Crystal FM Chime* — Metallic FM harmonics with stereo space delay.
- **Custom Sampler Engine:**
  - Drag and drop your own local `.wav`, `.mp3`, or `.aif` files.
  - Adjust root note (e.g. C4 = 60), fine pitch tuning, and sustain loop points to pitch the sample across your keyboard.
- **Local Storage & Project Portability:**
  - Custom presets are saved locally in browser storage.
  - Export and import `.aurastudio.json` project sessions to move work across computers without cloud dependence.

---

## Synchronized Recording & Guide Tracks

- **Audio Guide Track:** Import any audio track (MP3, WAV, AAC, etc.) as a reference guide. AuraStudio decodes the buffer locally and draws a zoomable waveform in the Arranger.
- **Shared Audio Clock:** Web Audio's high-precision `AudioContext.currentTime` clock keeps the guide track playback, metronome click, count-in, and recorded MIDI notes in sample-accurate sync.
- **Metronome & Count-In:** Configurable 0, 1, or 2 bars count-in before record punch-in.
- **Piano Roll Editor:** Click and drag notes, adjust duration, snap to grid (1/4, 1/8, 1/16, 1/32, Triplet), and use the **Quantize Take** button to align performances.

---

## Logic Pro Import Guide

AuraStudio is purpose-built to integrate into Apple Logic Pro (Logic Pro X and Logic Pro 11):

### 1. Exporting Your Files from AuraStudio
Click **Bounce for Logic** in the top bar to open the export hub:
- **Audio Stem (WAV):**
  - **Sample Rate:** Choose **48.0 kHz** (standard in Logic Pro sessions) or 44.1 kHz.
  - **Bit Depth:** Choose **24-bit PCM** (professional studio standard) or 16-bit.
  - **Bounce Audio Source:** Kept on **Instrument Only (Stem)** by default so the guide audio does not bleed into your export.
  - Click **Download Logic Pro WAV Stem**.
- **Editable Notes (MIDI):**
  - Click **Download Standard MIDI File (.mid)** to get the raw performance data (tempo track, note lengths, velocities).

### 2. Importing into Logic Pro
1. Open your Logic Pro project.
2. Ensure your Logic session sample rate matches your export (e.g. 48 kHz in *File > Project Settings > Audio*).
3. **For the WAV stem:** Drag the `.wav` file into the Tracks area onto an **Audio Track** at **Bar 1, Beat 1**.
   - *Why it lines up perfectly:* AuraStudio preserves all lead-in silence from 0.000s, guaranteeing exact alignment with your guide track without manual nudging.
4. **For the MIDI file:** Drag the `.mid` file onto a **Software Instrument Track** to assign any native Logic Pro synth or sampler (e.g. Alchemy, Studio Grand, Sampler).

---

## MCP Tools & Asset Declarations

- **MCP Tools Consulted:** The environment's available MCP connectors were inspected during build. No external audio sample MCP servers or connectors were declared.
- **Data Privacy & Asset Handling:** All guide tracks, recorded MIDI takes, and offline audio bounces remain strictly on your local computer. Audio files are processed using the browser's native Web Audio API and are never uploaded to any remote server.
