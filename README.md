# Symphonic Grid: Algorithmic Cellular Automata Music Sequencer

Symphonic Grid is an immersive audio-visual browser mini-game and generative music tool that bridges mathematical cellular automata (Conway's Game of Life) with polyphonic ambient sound design.

## Features

- **Generative Cellular Audio**: Paint living cells on the grid that evolve autonomously and trigger musical notes based on scale degrees and grid coordinates.
- **Web Audio Synthesizer**: Custom polyphonic synth engine featuring multiple timbres (Warm Synth, Plucked String, Crystal Bell, Wood Marimba) without external audio samples or network requests.
- **Customizable Scales & Tempos**: Configure musical keys, modal pentatonic scales, tempo (BPM), and spontaneous mutation rates to steer the generative composition.
- **Interactive Drawing Tools**: Draw individual cells or stamp classic automata structures like Glider Guns and Pulsars instantly.
- **Responsive Visual Themes**: Switch between Nebula, Emerald, Sunset, and Monochrome color palettes with live glow effects.

## Local Run Instructions

1. Download or clone all files (`index.html`, `style.css`, `script.js`, `README.md`) into a single folder.
2. Open `index.html` directly in any modern web browser (Chrome, Firefox, Safari, Edge).
3. Click **"Start Experience"** to activate the Web Audio context and press **Play** to begin the generative sequence.

## Technical Note
This is a 100% static, client-side application built using vanilla HTML5 Canvas, modern CSS, and the native Web Audio API. No frameworks, build tools, or external tracking libraries are used.
