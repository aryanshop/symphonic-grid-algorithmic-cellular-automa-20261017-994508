// Symphonic Grid - Algorithmic Cellular Automata Music Sequencer

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.analyser = null;
        this.gainNode = null;
    }

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 0.25;
        
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 256;
        
        this.gainNode.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);
    }

    playTone(frequency, timbre = 'synth', duration = 0.35) {
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const noteGain = this.ctx.createGain();

        // Timbre settings
        if (timbre === 'synth') {
            osc.type = 'sawtooth';
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(frequency * 2, now);
            filter.frequency.exponentialRampToValueAtTime(frequency * 4, now + duration);
            
            osc.connect(filter);
            filter.connect(noteGain);
        } else if (timbre === 'pluck') {
            osc.type = 'triangle';
            osc.connect(noteGain);
        } else if (timbre === 'bell') {
            osc.type = 'sine';
            osc.connect(noteGain);
        } else if (timbre === 'marimba') {
            osc.type = 'square';
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(frequency, now);
            
            osc.connect(filter);
            filter.connect(noteGain);
        }

        osc.frequency.setValueAtTime(frequency, now);

        // Envelope
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(0.2, now + 0.03);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        noteGain.connect(this.gainNode);

        osc.start(now);
        osc.stop(now + duration);
    }
}

class SequencerApp {
    constructor() {
        this.soundEngine = new SoundEngine();
        this.canvas = document.getElementById('gridCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.gridSize = 24;
        this.grid = [];
        this.trailGrid = [];
        this.isPlaying = false;
        this.tempo = 120;
        this.timer = null;
        
        this.generation = 0;
        this.totalNotes = 0;
        
        this.timbre = 'synth';
        this.scaleType = 'pentatonic';
        this.rootNote = 'G3';
        this.mutationRate = 0;
        this.brushType = 'draw';
        
        this.scales = {
            pentatonic: [0, 2, 4, 7, 9],
            minorPentatonic: [0, 3, 5, 7, 10],
            dorian: [0, 2, 3, 5, 7, 9, 10],
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        };

        this.baseFrequencies = {
            'C3': 130.81,
            'D3': 146.83,
            'E3': 164.81,
            'F3': 174.61,
            'G3': 196.00,
            'A3': 220.00
        };

        this.isMouseDown = false;
        this.lastHoverCell = { r: -1, c: -1 };

        this.initGrid();
        this.setupListeners();
        this.draw();
    }

    initGrid() {
        this.grid = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0));
        this.trailGrid = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0));
        this.generation = 0;
        this.totalNotes = 0;
        this.updateStats();
    }

    setupListeners() {
        // Audio overlay
        document.getElementById('btn-enable-audio').addEventListener('click', () => {
            this.soundEngine.init();
            document.getElementById('audioOverlay').classList.add('hidden');
            document.getElementById('btn-pause').disabled = false;
        });

        // Playback buttons
        document.getElementById('btn-play').addEventListener('click', () => {
            this.soundEngine.init();
            document.getElementById('audioOverlay').classList.add('hidden');
            this.start();
        });

        document.getElementById('btn-pause').addEventListener('click', () => this.pause());
        document.getElementById('btn-step').addEventListener('click', () => this.step());
        document.getElementById('btn-clear').addEventListener('click', () => {
            this.initGrid();
            this.draw();
        });
        document.getElementById('btn-random').addEventListener('click', () => this.randomizeGrid());
        document.getElementById('btn-preset').addEventListener('click', () => this.loadPreset());

        // Controls
        const tempoSlider = document.getElementById('tempoSlider');
        tempoSlider.addEventListener('input', (e) => {
            this.tempo = parseInt(e.target.value);
            document.getElementById('tempoVal').textContent = this.tempo;
            if (this.isPlaying) {
                this.start(); // Restart loop with new interval
            }
        });

        document.getElementById('instrumentSelect').addEventListener('change', (e) => {
            this.timbre = e.target.value;
        });

        document.getElementById('scaleSelect').addEventListener('change', (e) => {
            this.scaleType = e.target.value;
        });

        document.getElementById('rootSelect').addEventListener('change', (e) => {
            this.rootNote = e.target.value;
        });

        const mutationSlider = document.getElementById('mutationSlider');
        mutationSlider.addEventListener('input', (e) => {
            this.mutationRate = parseFloat(e.target.value);
            document.getElementById('mutationVal').textContent = this.mutationRate;
        });

        document.querySelectorAll('input[name="brush"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.brushType = e.target.value;
            });
        });

        document.getElementById('gridSizeSelect').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.initGrid();
            this.draw();
        });

        // Theme picker
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                document.documentElement.setAttribute('data-theme', e.target.dataset.theme);
            });
        });

        // Canvas interaction
        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.handleCanvasInteraction(e);
        });

        window.addEventListener('mouseup', () => {
            this.isMouseDown = false;
            this.lastHoverCell = { r: -1, c: -1 };
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isMouseDown) {
                this.handleCanvasInteraction(e);
            }
        });

        this.canvas.addEventListener('click', (e) => {
            this.handleCanvasInteraction(e);
        });
    }

    handleCanvasInteraction(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const cellWidth = this.canvas.width / this.gridSize;
        const cellHeight = this.canvas.height / this.gridSize;
        
        const c = Math.floor(x / cellWidth);
        const r = Math.floor(y / cellHeight);
        
        if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
            if (this.lastHoverCell.r === r && this.lastHoverCell.c === c) return;
            this.lastHoverCell = { r, c };

            if (this.brushType === 'draw') {
                this.grid[r][c] = this.grid[r][c] ? 0 : 1;
                if (this.grid[r][c]) {
                    this.trailGrid[r][c] = 5;
                    this.playCellSound(r, c);
                }
            } else if (this.brushType === 'glider') {
                this.stampPattern(r, c, [
                    [0, 1, 0],
                    [0, 0, 1],
                    [1, 1, 1]
                ]);
            } else if (this.brushType === 'pulsar') {
                this.stampPattern(r, c, [
                    [0,0,1,1,1,0,0,0,1,1,1,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [0,0,1,1,1,0,0,0,1,1,1,0,0],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,1,1,1,0,0,0,1,1,1,0,0],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [1,0,0,0,0,1,0,1,0,0,0,0,1],
                    [0,0,0,0,0,0,0,0,0,0,0,0,0],
                    [0,0,1,1,1,0,0,0,1,1,1,0,0]
                ]);
            }
            this.draw();
            this.updateStats();
        }
    }

    stampPattern(startR, startC, pattern) {
        const pr = pattern.length;
        const pc = pattern[0].length;
        for (let i = 0; i < pr; i++) {
            for (let j = 0; j < pc; j++) {
                const tr = (startR + i) % this.gridSize;
                const tc = (startC + j) % this.gridSize;
                this.grid[tr][tc] = pattern[i][j];
                if (pattern[i][j]) this.trailGrid[tr][tc] = 5;
            }
        }
    }

    randomizeGrid() {
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                this.grid[r][c] = Math.random() < 0.25 ? 1 : 0;
                if (this.grid[r][c]) this.trailGrid[r][c] = 5;
            }
        }
        this.draw();
        this.updateStats();
    }

    loadPreset() {
        this.initGrid();
        // Glider + lightweight oscillator pattern
        const center = Math.floor(this.gridSize / 2);
        this.stampPattern(center - 2, center - 2, [
            [0, 1, 0],
            [0, 0, 1],
            [1, 1, 1]
        ]);
        this.stampPattern(2, 2, [
            [1, 1],
            [1, 1]
        ]);
        this.draw();
        this.updateStats();
    }

    start() {
        this.pause();
        this.isPlaying = true;
        document.getElementById('btn-play').classList.add('btn-primary');
        document.getElementById('btn-pause').classList.remove('btn-primary');
        
        const interval = (60 / this.tempo) * 500; // Half beat ticks
        this.timer = setInterval(() => {
            this.step();
        }, interval);
    }

    pause() {
        this.isPlaying = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        document.getElementById('btn-play').classList.remove('btn-primary');
        document.getElementById('btn-pause').classList.add('btn-primary');
    }

    step() {
        // Conway Game of Life Step + Mutation
        const newGrid = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(0));
        let activeSoundTriggers = [];

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                let neighbors = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = (r + dr + this.gridSize) % this.gridSize;
                        const nc = (c + dc + this.gridSize) % this.gridSize;
                        neighbors += this.grid[nr][nc];
                    }
                }

                let isAlive = this.grid[r][c] === 1;
                let nextAlive = 0;

                if (isAlive && (neighbors === 2 || neighbors === 3)) {
                    nextAlive = 1;
                } else if (!isAlive && neighbors === 3) {
                    nextAlive = 1;
                }

                // Mutation check
                if (!nextAlive && this.mutationRate > 0 && Math.random() * 100 < this.mutationRate) {
                    nextAlive = 1;
                }

                newGrid[r][c] = nextAlive;

                if (nextAlive) {
                    this.trailGrid[r][c] = 5;
                    if (!isAlive || Math.random() < 0.4) {
                        activeSoundTriggers.push({ r, c });
                    }
                } else {
                    if (this.trailGrid[r][c] > 0) {
                        this.trailGrid[r][c]--;
                    }
                }
            }
        }

        this.grid = newGrid;
        this.generation++;
        this.draw();
        this.updateStats();

        // Play chords/notes based on active cells across vertical columns
        if (activeSoundTriggers.length > 0) {
            // Pick up to 3 harmonious notes to avoid audio clutter
            const sampleCount = Math.min(3, activeSoundTriggers.length);
            for (let i = 0; i < sampleCount; i++) {
                const index = Math.floor(Math.random() * activeSoundTriggers.length);
                const cell = activeSoundTriggers.splice(index, 1)[0];
                this.playCellSound(cell.r, cell.c);
            }
        }
    }

    playCellSound(r, c) {
        const scale = this.scales[this.scaleType];
        // Map row to pitch (inverted: top rows = higher pitch)
        const pitchIndex = Math.floor(((this.gridSize - 1 - r) / this.gridSize) * scale.length * 2);
        const octaveOffset = Math.floor(pitchIndex / scale.length);
        const scaleDegree = pitchIndex % scale.length;
        
        const semitoneOffset = scale[scaleDegree] + (octaveOffset * 12);
        const baseFreq = this.baseFrequencies[this.rootNote] || 196.00;
        
        const frequency = baseFreq * Math.pow(2, semitoneOffset / 12);
        this.soundEngine.playTone(frequency, this.timbre);
        this.totalNotes++;
    }

    updateStats() {
        document.getElementById('genCount').textContent = this.generation;
        
        let activeCells = 0;
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.grid[r][c]) activeCells++;
            }
        }
        document.getElementById('cellCount').textContent = activeCells;
        document.getElementById('noteCount').textContent = this.totalNotes;
    }

    draw() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const cellWidth = width / this.gridSize;
        const cellHeight = height / this.gridSize;

        this.ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-main').trim();
        this.ctx.fillRect(0, 0, width, height);

        const aliveColor = getComputedStyle(document.documentElement).getPropertyValue('--cell-alive').trim();
        const trailColor = getComputedStyle(document.documentElement).getPropertyValue('--cell-trail').trim();
        const borderColor = getComputedStyle(document.documentElement).getPropertyValue('--cell-border').trim();

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const x = c * cellWidth;
                const y = r * cellHeight;

                if (this.grid[r][c] === 1) {
                    this.ctx.fillStyle = aliveColor;
                    this.ctx.shadowColor = aliveColor;
                    this.ctx.shadowBlur = 8;
                    this.ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
                    this.ctx.shadowBlur = 0; // Reset shadow
                } else if (this.trailGrid[r][c] > 0) {
                    const alpha = this.trailGrid[r][c] / 5 * 0.35;
                    this.ctx.fillStyle = trailColor;
                    this.ctx.globalAlpha = alpha;
                    this.ctx.fillRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);
                    this.ctx.globalAlpha = 1.0;
                } else {
                    this.ctx.strokeStyle = borderColor;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.strokeRect(x, y, cellWidth, cellHeight);
                }
            }
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new SequencerApp();
});
