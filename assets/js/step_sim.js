/**
 * Step-by-Step Simulator
 * Walks through scheduling decisions tick by tick
 * Shows: Ready Queue, CPU State, Waiting List, Completed
 */
class StepSimulator {
    constructor(algoName, ganttData, processes) {
        this.algoName = algoName;
        this.gantt = ganttData;
        this.processes = processes;
        this.totalTime = ganttData[ganttData.length - 1].end;
        this.currentStep = 0;
        this.steps = this.buildSteps();
        this.playing = false;
        this.playInterval = null;
    }
    /**
     * Pre-compute every step (one per time unit)
     */
    buildSteps() {
        const steps = [];
        const procStates = {};
        // Initialize process states
        this.processes.forEach(p => {
            procStates[p.pid] = {
                ...p,
                executed: 0,
                state: 'not_arrived', // not_arrived | ready | running | completed
                completedAt: null
            };
        });
        // Walk through each time unit
        for (let t = 0; t <= this.totalTime; t++) {
            // Determine which segment is running at time t
            let runningSegment = null;
            for (const seg of this.gantt) {
                if (seg.start <= t && t < seg.end) {
                    runningSegment = seg;
                    break;
                }
            }
            // Update process states based on time
            const states = {};
            const readyQueue = [];
            const waiting = []; // arrived but not yet executed in this run
            const completed = [];
            const running = runningSegment && runningSegment.pid !== 'IDLE' ? runningSegment.pid : null;
            // Calculate execution at time t for each process
            const execMap = {};
            this.processes.forEach(p => execMap[p.pid] = 0);
            for (const seg of this.gantt) {
                if (seg.pid === 'IDLE') continue;
                if (seg.end <= t) {
                    execMap[seg.pid] += seg.end - seg.start;
                } else if (seg.start < t) {
                    execMap[seg.pid] += t - seg.start;
                }
            }
            this.processes.forEach(p => {
                const executed = execMap[p.pid];
                const remaining = p.burst - executed;
                let state = 'not_arrived';
                if (p.arrival > t) {
                    state = 'not_arrived';
                } else if (remaining === 0) {
                    state = 'completed';
                    completed.push({ ...p, executed, remaining: 0 });
                } else if (running === p.pid) {
                    state = 'running';
                } else {
                    state = 'ready';
                    readyQueue.push({ ...p, executed, remaining });
                }
                states[p.pid] = { ...p, executed, remaining, state };
            });
            // Build the explanation for this step
            let explanation = '';
            if (running) {
                const proc = states[running];
                explanation = `CPU is executing <strong style="color: var(--green-400);">${running}</strong>. ` +
                              `Remaining burst: ${proc.remaining}u. ` +
                              `Time elapsed in this segment: ${t - runningSegment.start}u.`;
            } else if (runningSegment && runningSegment.pid === 'IDLE') {
                explanation = `CPU is <strong style="color: var(--warning);">IDLE</strong>. ` +
                              `Waiting for next process to arrive...`;
            } else if (t === this.totalTime) {
                explanation = `<strong style="color: var(--green-400);">All processes completed!</strong> ` +
                              `Total time: ${this.totalTime} units.`;
            } else {
                explanation = 'Initializing...';
            }
            steps.push({
                time: t,
                running: running,
                runningProcess: running ? states[running] : null,
                isIdle: runningSegment && runningSegment.pid === 'IDLE',
                readyQueue: readyQueue,
                completed: completed,
                allStates: states,
                segment: runningSegment,
                explanation: explanation
            });
        }
        return steps;
    }
    getCurrentStep() {
        return this.steps[this.currentStep];
    }
    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            return true;
        }
        return false;
    }
    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            return true;
        }
        return false;
    }
    goTo(time) {
        const idx = this.steps.findIndex(s => s.time === time);
        if (idx >= 0) this.currentStep = idx;
    }
    reset() {
        this.stop();
        this.currentStep = 0;
    }
    play(onStep, speed = 800) {
        this.stop();
        this.playing = true;
        this.playInterval = setInterval(() => {
            if (!this.next()) {
                this.stop();
                return;
            }
            if (onStep) onStep(this.getCurrentStep());
        }, speed);
    }
    stop() {
        this.playing = false;
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }
}
/**
 * Render the step simulation UI
 */
class StepSimulatorUI {
    constructor(container, algoName, results) {
        this.container = container;
        this.algoName = algoName;
        this.results = results;
        this.simulator = new StepSimulator(algoName, results.gantt, results.processes);
        this.processColors = {
            'P1': '#4ade80', 'P2': '#60a5fa', 'P3': '#a78bfa', 'P4': '#fb923c',
            'P5': '#f472b6', 'P6': '#facc15', 'P7': '#2dd4bf', 'P8': '#f87171',
            'P9': '#fb7185', 'P10': '#34d399'
        };
        this.render();
        this.update();
    }
    pidColor(pid) {
        return this.processColors[pid] || '#4ade80';
    }
    render() {
        this.container.innerHTML = `
            <div class="step-sim">
                <div class="step-sim-header">
                    <div>
                        <h3 class="step-title">🎬 Step-by-Step Execution</h3>
                        <p class="step-sub">${this.algoName} · Walk through every time unit</p>
                    </div>
                    <div class="step-time-display">
                        <span class="step-time-label">Time</span>
                        <span class="step-time-value" id="stepTime">0</span>
                        <span class="step-time-total">/ ${this.simulator.totalTime}</span>
                    </div>
                </div>
                <!-- CPU Display -->
                <div class="cpu-display">
                    <div class="cpu-label">
                        <span class="cpu-icon">⚙️</span>
                        <span>CPU</span>
                    </div>
                    <div class="cpu-running" id="cpuRunning">
                        <span class="cpu-empty">No process running</span>
                    </div>
                    <div class="cpu-progress" id="cpuProgress"></div>
                </div>
                <!-- Lanes -->
                <div class="step-lanes">
                    <div class="lane lane-ready">
                        <div class="lane-header">
                            <span class="lane-icon">📋</span>
                            <span class="lane-name">Ready Queue</span>
                            <span class="lane-count" id="readyCount">0</span>
                        </div>
                        <div class="lane-content" id="readyQueue"></div>
                    </div>
                    <div class="lane lane-completed">
                        <div class="lane-header">
                            <span class="lane-icon">✅</span>
                            <span class="lane-name">Completed</span>
                            <span class="lane-count" id="completedCount">0</span>
                        </div>
                        <div class="lane-content" id="completedList"></div>
                    </div>
                </div>
                <!-- Explanation -->
                <div class="step-explanation" id="stepExplanation"></div>
                <!-- Timeline mini Gantt -->
                <div class="step-mini-gantt-wrap">
                    <div class="step-mini-gantt" id="stepMiniGantt"></div>
                </div>
                <!-- Controls -->
                <div class="step-controls">
                    <button class="step-btn" id="btnFirst" onclick="window.stepSim.first()">
                        ⏮ First
                    </button>
                    <button class="step-btn" id="btnPrev" onclick="window.stepSim.prev()">
                        ◀ Prev
                    </button>
                    <button class="step-btn step-btn-primary" id="btnPlay" onclick="window.stepSim.togglePlay()">
                        ▶ Play
                    </button>
                    <button class="step-btn" id="btnNext" onclick="window.stepSim.next()">
                        Next ▶
                    </button>
                    <button class="step-btn" id="btnLast" onclick="window.stepSim.last()">
                        Last ⏭
                    </button>
                    <div style="flex: 1;"></div>
                    <div class="step-speed">
                        <label>Speed</label>
                        <select id="speedSelect" onchange="window.stepSim.changeSpeed()">
                            <option value="1500">0.5x</option>
                            <option value="800" selected>1x</option>
                            <option value="400">2x</option>
                            <option value="200">4x</option>
                        </select>
                    </div>
                </div>
                <!-- Step slider -->
                <div class="step-slider-wrap">
                    <input type="range" id="stepSlider" class="step-slider" 
                           min="0" max="${this.simulator.totalTime}" value="0" 
                           oninput="window.stepSim.onSlider(this.value)">
                </div>
            </div>
        `;
        this.renderMiniGantt();
        window.stepSim = this; // Expose for inline handlers
    }
    renderMiniGantt() {
        const wrap = document.getElementById('stepMiniGantt');
        const totalWidth = wrap.parentElement.clientWidth - 4;
        const unitWidth = totalWidth / this.simulator.totalTime;
        wrap.style.width = `${this.simulator.totalTime * unitWidth}px`;
        wrap.style.height = '24px';
        wrap.style.position = 'relative';
        this.results.gantt.forEach(seg => {
            const bar = document.createElement('div');
            bar.style.cssText = `
                position: absolute;
                left: ${seg.start * unitWidth}px;
                width: ${(seg.end - seg.start) * unitWidth}px;
                height: 100%;
                background: ${seg.pid === 'IDLE' ? '#3a4540' : this.pidColor(seg.pid)};
                border-right: 1px solid rgba(0,0,0,0.3);
                font-size: 10px;
                color: white;
                font-weight: 700;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'JetBrains Mono', monospace;
            `;
            bar.textContent = seg.pid === 'IDLE' ? '' : seg.pid;
            wrap.appendChild(bar);
        });
        // Add the position indicator
        const indicator = document.createElement('div');
        indicator.id = 'stepIndicator';
        indicator.style.cssText = `
            position: absolute;
            top: -4px;
            width: 2px;
            height: 32px;
            background: #facc15;
            box-shadow: 0 0 8px #facc15;
            transition: left 0.2s;
            pointer-events: none;
            z-index: 10;
        `;
        wrap.appendChild(indicator);
        this.unitWidth = unitWidth;
    }
    update() {
        const step = this.simulator.getCurrentStep();
        if (!step) return;
        // Time
        document.getElementById('stepTime').textContent = step.time;
        document.getElementById('stepSlider').value = step.time;
        // CPU
        const cpuEl = document.getElementById('cpuRunning');
        const progressEl = document.getElementById('cpuProgress');
        if (step.running) {
            const proc = step.runningProcess;
            const progressPct = (proc.executed / proc.burst) * 100;
            cpuEl.innerHTML = `
                <div class="cpu-process" style="background: ${this.pidColor(step.running)}33; border-color: ${this.pidColor(step.running)};">
                    <span class="cpu-pid" style="color: ${this.pidColor(step.running)};">${step.running}</span>
                    <span class="cpu-info">Burst: ${proc.executed}/${proc.burst}u</span>
                </div>
            `;
            progressEl.style.width = `${progressPct}%`;
            progressEl.style.background = this.pidColor(step.running);
        } else if (step.isIdle) {
            cpuEl.innerHTML = `<div class="cpu-idle">⏸️ IDLE</div>`;
            progressEl.style.width = `0%`;
        } else {
            cpuEl.innerHTML = `<span class="cpu-empty">All processes completed</span>`;
            progressEl.style.width = `100%`;
            progressEl.style.background = 'var(--green-400)';
        }
        // Ready Queue
        const readyEl = document.getElementById('readyQueue');
        readyEl.innerHTML = step.readyQueue.length === 0 
            ? '<div class="lane-empty">empty</div>'
            : step.readyQueue.map(p => `
                <div class="proc-card" style="border-color: ${this.pidColor(p.pid)};">
                    <span class="proc-card-pid" style="color: ${this.pidColor(p.pid)};">${p.pid}</span>
                    <span class="proc-card-info">${p.remaining}u left</span>
                </div>
            `).join('');
        document.getElementById('readyCount').textContent = step.readyQueue.length;
        // Completed
        const completedEl = document.getElementById('completedList');
        completedEl.innerHTML = step.completed.length === 0
            ? '<div class="lane-empty">none yet</div>'
            : step.completed.map(p => `
                <div class="proc-card completed" style="border-color: ${this.pidColor(p.pid)};">
                    <span class="proc-card-pid" style="color: ${this.pidColor(p.pid)};">${p.pid}</span>
                    <span class="proc-card-info">✓ done</span>
                </div>
            `).join('');
        document.getElementById('completedCount').textContent = step.completed.length;
        // Explanation
        document.getElementById('stepExplanation').innerHTML = `
            <div class="step-exp-icon">💡</div>
            <div class="step-exp-text">${step.explanation}</div>
        `;
        // Indicator on mini Gantt
        const indicator = document.getElementById('stepIndicator');
        if (indicator && this.unitWidth) {
            indicator.style.left = `${step.time * this.unitWidth}px`;
        }
        // Disable buttons appropriately
        document.getElementById('btnFirst').disabled = step.time === 0;
        document.getElementById('btnPrev').disabled = step.time === 0;
        document.getElementById('btnNext').disabled = step.time === this.simulator.totalTime;
        document.getElementById('btnLast').disabled = step.time === this.simulator.totalTime;
    }
    next() {
        if (this.simulator.next()) this.update();
    }
    prev() {
        if (this.simulator.prev()) this.update();
    }
    first() {
        this.simulator.reset();
        this.update();
        this.stopPlay();
    }
    last() {
        this.simulator.currentStep = this.simulator.steps.length - 1;
        this.update();
        this.stopPlay();
    }
    onSlider(value) {
        this.simulator.goTo(parseInt(value));
        this.update();
    }
    togglePlay() {
        if (this.simulator.playing) {
            this.stopPlay();
        } else {
            this.startPlay();
        }
    }
    startPlay() {
        // If at end, restart
        if (this.simulator.currentStep >= this.simulator.steps.length - 1) {
            this.simulator.reset();
        }
        const speed = parseInt(document.getElementById('speedSelect').value);
        this.simulator.play(() => this.update(), speed);
        const btn = document.getElementById('btnPlay');
        btn.innerHTML = '⏸ Pause';
        btn.classList.add('playing');
    }
    stopPlay() {
        this.simulator.stop();
        const btn = document.getElementById('btnPlay');
        if (btn) {
            btn.innerHTML = '▶ Play';
            btn.classList.remove('playing');
        }
    }
    changeSpeed() {
        if (this.simulator.playing) {
            this.stopPlay();
            this.startPlay();
        }
    }
}