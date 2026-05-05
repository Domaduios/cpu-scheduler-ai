/**
 * Audio Engine for 3D Visualizations
 * 
 * Two distinct sound profiles synced with animations:
 * 
 * 1. GANTT 3D ("Mechanical / Tick Tock"):
 *    - Soft mechanical "tick" each time a bar pops up from the ground
 *    - Like a vintage CPU clock or a typewriter
 * 
 * 2. PODIUM 3D ("Cinematic / Triumphant"):
 *    - Deep ceremonial "rumble" when podiums rise
 *    - Magical chime when each sphere appears
 *    - Triumphant fanfare when the AI's Pick (winner) shows up
 *
 * No external audio files - everything synthesized via Web Audio API
 */

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.enabled = false;
        this.volume = 0.4;
    }
    
    init() {
        if (this.ctx) return;
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new Ctx();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.ctx.destination);
        } catch (err) {
            console.warn('Web Audio not supported:', err);
        }
    }
    
    async ensureRunning() {
        if (!this.ctx) this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            try { await this.ctx.resume(); } catch (e) {}
        }
    }
    
    setEnabled(enabled) {
        this.enabled = enabled;
        if (!this.ctx) this.init();
        if (!this.masterGain || !this.ctx) return;
        const target = enabled ? this.volume : 0;
        this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(target, this.ctx.currentTime + 0.2);
    }
    
    /**
     * GANTT 3D: Mechanical tick when a bar pops up from the ground
     * Synthesized to sound like a small wood/metal click
     */
    playBarTick(pitchVariation = 0) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // High-pitched click (the "tick")
        const clickOsc = this.ctx.createOscillator();
        clickOsc.type = 'square';
        clickOsc.frequency.value = 1800 + pitchVariation * 200;
        
        const clickGain = this.ctx.createGain();
        clickGain.gain.value = 0;
        clickGain.gain.linearRampToValueAtTime(0.06, now + 0.002);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
        
        // Highpass filter to make it crisp
        const clickFilter = this.ctx.createBiquadFilter();
        clickFilter.type = 'highpass';
        clickFilter.frequency.value = 800;
        
        clickOsc.connect(clickFilter);
        clickFilter.connect(clickGain);
        clickGain.connect(this.masterGain);
        
        clickOsc.start(now);
        clickOsc.stop(now + 0.05);
        
        // Low thump (the "body" of the tick)
        const thumpOsc = this.ctx.createOscillator();
        thumpOsc.type = 'sine';
        thumpOsc.frequency.value = 180 + pitchVariation * 30;
        
        const thumpGain = this.ctx.createGain();
        thumpGain.gain.value = 0;
        thumpGain.gain.linearRampToValueAtTime(0.12, now + 0.005);
        thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        
        thumpOsc.connect(thumpGain);
        thumpGain.connect(this.masterGain);
        
        thumpOsc.start(now);
        thumpOsc.stop(now + 0.12);
    }
    
    /**
     * GANTT 3D: Continuous mechanical "growth" sound while bar is rising
     * Like a small motor running
     */
    playBarRise(durationSec) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const dur = Math.min(durationSec, 2);
        
        // Low rumble that fades in/out
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = 80;
        osc.frequency.linearRampToValueAtTime(120, now + dur * 0.7);
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        filter.Q.value = 2;
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.04, now + 0.05);
        gain.gain.linearRampToValueAtTime(0.03, now + dur * 0.5);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + dur + 0.1);
    }
    
    // ============================================================
    // PODIUM 3D: Cinematic / Triumphant Sounds
    // ============================================================
    
    /**
     * Deep ceremonial rumble when podiums rise from ground
     * Like a movie reveal
     */
    playPodiumRumble() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const duration = 1.8;
        
        // Deep bass rumble
        const bassOsc = this.ctx.createOscillator();
        bassOsc.type = 'sawtooth';
        bassOsc.frequency.value = 40;
        bassOsc.frequency.linearRampToValueAtTime(60, now + duration * 0.7);
        
        const bassFilter = this.ctx.createBiquadFilter();
        bassFilter.type = 'lowpass';
        bassFilter.frequency.value = 150;
        bassFilter.Q.value = 5;
        
        const bassGain = this.ctx.createGain();
        bassGain.gain.value = 0;
        bassGain.gain.linearRampToValueAtTime(0.18, now + 0.4);
        bassGain.gain.linearRampToValueAtTime(0.12, now + duration * 0.7);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        bassOsc.connect(bassFilter);
        bassFilter.connect(bassGain);
        bassGain.connect(this.masterGain);
        
        bassOsc.start(now);
        bassOsc.stop(now + duration + 0.1);
        
        // Mid harmonic - adds the "weight"
        const midOsc = this.ctx.createOscillator();
        midOsc.type = 'sine';
        midOsc.frequency.value = 110; // A2
        
        const midGain = this.ctx.createGain();
        midGain.gain.value = 0;
        midGain.gain.linearRampToValueAtTime(0.08, now + 0.5);
        midGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        midOsc.connect(midGain);
        midGain.connect(this.masterGain);
        
        midOsc.start(now);
        midOsc.stop(now + duration + 0.1);
    }
    
    /**
     * Magical chime when a sphere appears on its podium
     * Pitch varies with rank (winner gets highest)
     */
    playSphereChime(rank = 1, totalRanks = 6) {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Higher rank = higher note (winner = highest pitch)
        const noteFrequencies = [
            1046.50,  // C6 - winner
            880.00,   // A5
            783.99,   // G5
            659.25,   // E5
            523.25,   // C5
            440.00    // A4
        ];
        
        const baseFreq = noteFrequencies[Math.min(rank - 1, noteFrequencies.length - 1)];
        
        // Bell-like sound: fundamental + harmonics
        const harmonics = [
            { mult: 1, vol: 0.18 },     // fundamental
            { mult: 2, vol: 0.10 },     // octave
            { mult: 3, vol: 0.05 },     // fifth above octave
            { mult: 4.2, vol: 0.03 }    // bell-like inharmonic
        ];
        
        harmonics.forEach(h => {
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = baseFreq * h.mult;
            
            const gain = this.ctx.createGain();
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(h.vol, now + 0.005);
            // Bell-like long decay
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now);
            osc.stop(now + 2);
        });
    }
    
    /**
     * Triumphant fanfare when the AI's WINNER sphere appears
     * Major triad ascending arpeggio
     */
    playWinnerFanfare() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // C major arpeggio: C5 → E5 → G5 → C6 (then sustained C major chord)
        const arpeggio = [523.25, 659.25, 783.99, 1046.50];
        const noteSpacing = 0.1;
        
        arpeggio.forEach((freq, i) => {
            const startTime = now + i * noteSpacing;
            const noteDuration = 0.3 + i * 0.05;
            
            // Brass-like tone (triangle + slight sawtooth)
            const tones = [
                { type: 'triangle', vol: 0.14, freqMult: 1 },
                { type: 'sine', vol: 0.10, freqMult: 2 }      // octave shimmer
            ];
            
            tones.forEach(t => {
                const osc = this.ctx.createOscillator();
                osc.type = t.type;
                osc.frequency.value = freq * t.freqMult;
                
                const gain = this.ctx.createGain();
                gain.gain.value = 0;
                gain.gain.linearRampToValueAtTime(t.vol, startTime + 0.02);
                gain.gain.linearRampToValueAtTime(t.vol * 0.6, startTime + noteDuration * 0.5);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start(startTime);
                osc.stop(startTime + noteDuration + 0.05);
            });
        });
        
        // Sustained final chord (C-E-G played together at the end)
        const chordStart = now + arpeggio.length * noteSpacing + 0.05;
        const chordDuration = 1.2;
        const chordNotes = [523.25, 659.25, 783.99, 1046.50];
        
        chordNotes.forEach(freq => {
            const osc = this.ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            
            const gain = this.ctx.createGain();
            gain.gain.value = 0;
            gain.gain.linearRampToValueAtTime(0.06, chordStart + 0.05);
            gain.gain.linearRampToValueAtTime(0.04, chordStart + chordDuration * 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, chordStart + chordDuration);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(chordStart);
            osc.stop(chordStart + chordDuration + 0.05);
        });
    }
    
    /**
     * Sparkle/shimmer for particles around winner
     */
    playSparkle() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        // Random high pentatonic note
        const notes = [1567.98, 1760, 2093.00, 2349.32, 2637.02];
        const freq = notes[Math.floor(Math.random() * notes.length)];
        
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.04, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.7);
    }
    
    /**
     * UI click for buttons
     */
    playClick() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 1400;
        
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        gain.gain.linearRampToValueAtTime(0.05, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + 0.08);
    }
}

window.audioEngine = new AudioEngine();
