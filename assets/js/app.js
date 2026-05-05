/**
 * CPU Scheduler AI - Main Application
 */

let processIdCounter = 1;
let lastResults = null;

const ALGO_NAMES = {
    'FCFS': 'First Come First Serve',
    'SJF': 'Shortest Job First',
    'SRTF': 'Shortest Remaining Time First',
    'RR': 'Round Robin',
    'Priority_NP': 'Priority (Non-preemptive)',
    'Priority_P': 'Priority (Preemptive)'
};

const ALGO_SHORT = {
    'FCFS': 'FCFS', 'SJF': 'SJF', 'SRTF': 'SRTF',
    'RR': 'Round Robin', 'Priority_NP': 'Priority NP', 'Priority_P': 'Priority P'
};

const ALGO_COLORS = {
    'FCFS': '#4ade80', 'SJF': '#60a5fa', 'SRTF': '#a78bfa',
    'RR': '#fb923c', 'Priority_NP': '#f472b6', 'Priority_P': '#facc15'
};

const VIEW_TITLES = {
    'input': { title: 'Process Input', sub: 'Configure processes and launch the simulation' },
    'ai': { title: 'AI Recommendation', sub: 'Decision engine analysis with multi-criteria scoring' },
    'comparison': { title: 'Algorithm Showdown', sub: 'Compare all 4 main algorithms side by side' },
    'charts': { title: 'Performance Visualizations', sub: 'Interactive charts comparing all metrics' },
    '3d': { title: '3D Visualization', sub: 'Interactive WebGL Gantt Chart · Drag to rotate' },
    'step': { title: 'Step-by-Step Mode', sub: 'Walk through every CPU tick · See queues in real-time' },
    'details': { title: 'Algorithm Details', sub: 'Deep dive into each algorithm with full Gantt chart' }
};

// =================== INIT ===================
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    addProcess();
    addProcess();
    addProcess();
    togglePriority();
});

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (item.disabled) return;
            const view = item.dataset.view;
            switchView(view);
        });
    });
}

function switchView(viewName) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-view="${viewName}"]`)?.classList.add('active');
    
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewName}`)?.classList.add('active');
    
    const info = VIEW_TITLES[viewName];
    if (info) {
        document.getElementById('viewTitle').textContent = info.title;
        document.getElementById('viewSubtitle').textContent = info.sub;
    }
    
    // Render charts when entering charts view (Chart.js needs visible canvas)
    if (viewName === 'charts' && lastResults) {
        setTimeout(() => renderAllCharts(lastResults.results), 50);
    }
    
    // Initialize 3D view
    if (viewName === '3d' && lastResults) {
        setTimeout(() => init3DView(), 50);
    }
    
    // Initialize Step view
    if (viewName === 'step' && lastResults) {
        setTimeout(() => initStepView(), 50);
    }
}

function enableNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.disabled = false;
    });
}

// =================== PROCESS MANAGEMENT ===================
function addProcess(arrival = 0, burst = null, priority = null) {
    const tbody = document.getElementById('processTableBody');
    const row = document.createElement('tr');
    const pid = `P${processIdCounter}`;
    
    const burstVal = burst !== null ? burst : Math.floor(Math.random() * 8) + 2;
    const priorityVal = priority !== null ? priority : Math.floor(Math.random() * 5) + 1;
    
    row.innerHTML = `
        <td><input type="text" class="pid-input" value="${pid}" maxlength="4"></td>
        <td><input type="number" class="arrival-input" value="${arrival}" min="0" max="100"></td>
        <td><input type="number" class="burst-input" value="${burstVal}" min="1" max="50"></td>
        <td class="priority-col"><input type="number" class="priority-input" value="${priorityVal}" min="1" max="20"></td>
        <td><button class="btn-icon" onclick="this.closest('tr').remove()">🗑️</button></td>
    `;
    
    tbody.appendChild(row);
    processIdCounter++;
}

function clearAll() {
    document.getElementById('processTableBody').innerHTML = '';
    processIdCounter = 1;
    lastResults = null;
    
    // Disable nav items except input
    document.querySelectorAll('.nav-item').forEach(item => {
        if (item.dataset.view !== 'input') item.disabled = true;
    });
    
    addProcess();
}

function togglePriority() {
    const enabled = document.getElementById('usePriority').checked;
    document.getElementById('processTable').classList.toggle('no-priority', !enabled);
}

// =================== DATASET LOADING ===================
async function loadDataset(name) {
    if (name === 'random') {
        // Random generation can be done client-side instantly
        loadRandomDataset();
        return;
    }
    
    try {
        const response = await fetch('api/schedule.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'get_dataset', name })
        });
        
        const data = await response.json();
        if (data.success && data.dataset) {
            applyDataset(data.dataset);
        }
    } catch (err) {
        console.error('Failed to load dataset:', err);
        alert('Failed to load dataset: ' + err.message);
    }
}

function loadRandomDataset() {
    const count = Math.floor(Math.random() * 4) + 4; // 4-7
    document.getElementById('processTableBody').innerHTML = '';
    processIdCounter = 1;
    
    let arrival = 0;
    for (let i = 0; i < count; i++) {
        addProcess(arrival, Math.floor(Math.random() * 11) + 2, Math.floor(Math.random() * 5) + 1);
        arrival += Math.floor(Math.random() * 4);
    }
}

function applyDataset(dataset) {
    document.getElementById('processTableBody').innerHTML = '';
    processIdCounter = 1;
    
    dataset.processes.forEach(p => {
        addProcess(p.arrival, p.burst, p.priority);
    });
}

// =================== SIMULATION ===================
async function runSimulation() {
    const processes = collectProcesses();
    
    if (processes.length === 0) {
        alert('⚠️ Please add at least one process');
        return;
    }
    
    const quantum = parseInt(document.getElementById('quantum').value) || 2;
    
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    try {
        const response = await fetch('api/schedule.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ processes, quantum })
        });
        
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Unknown error');
        
        lastResults = data;
        
        // Wait briefly for visual effect
        await new Promise(r => setTimeout(r, 600));
        
        document.getElementById('loadingOverlay').style.display = 'none';
        
        enableNavigation();
        renderAIView(data.ai, data.results);
        renderComparisonView(data.results, data.ai.recommended);
        renderDetailsView(data.results, data.ai);
        
        // Switch to AI view first to show the recommendation
        switchView('ai');
        
    } catch (err) {
        document.getElementById('loadingOverlay').style.display = 'none';
        alert('❌ Error: ' + err.message);
        console.error(err);
    }
}

function collectProcesses() {
    const processes = [];
    const rows = document.querySelectorAll('#processTableBody tr');
    const usePriority = document.getElementById('usePriority').checked;
    
    rows.forEach(row => {
        const pid = row.querySelector('.pid-input').value.trim();
        const arrival = parseInt(row.querySelector('.arrival-input').value);
        const burst = parseInt(row.querySelector('.burst-input').value);
        
        if (!pid || isNaN(arrival) || isNaN(burst) || burst < 1) return;
        
        const proc = { pid, arrival, burst };
        if (usePriority) {
            const priority = parseInt(row.querySelector('.priority-input').value);
            if (!isNaN(priority)) proc.priority = priority;
        }
        processes.push(proc);
    });
    
    return processes;
}

// =================== AI VIEW ===================
function renderAIView(ai, results) {
    const container = document.getElementById('aiContent');
    const winner = ai.recommended;
    const a = ai.workload_analysis;
    
    // Build scores HTML
    const sortedScores = Object.entries(ai.scores).sort((x, y) => y[1] - x[1]);
    let scoresHtml = '';
    sortedScores.forEach(([algo, score]) => {
        const isWin = algo === winner;
        scoresHtml += `
            <div class="score-bar">
                <div class="score-header">
                    <span class="score-name ${isWin ? 'winner' : ''}">${ALGO_NAMES[algo]}</span>
                    <span class="score-value">${score.toFixed(1)} / 100</span>
                </div>
                <div class="score-track">
                    <div class="score-fill ${isWin ? 'winner' : ''}" data-target="${score}"></div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = `
        <div class="ai-hero">
            <div class="ai-hero-content">
                <div class="ai-label">
                    <span>🤖</span> AI Decision Engine · Recommendation
                </div>
                <div class="ai-winner-name">${ALGO_NAMES[winner]}</div>
                <p class="ai-summary">${ai.recommendation_summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
                
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-label">Workload Type</div>
                        <div class="stat-value"><span class="stat-badge">${a.workload_type}</span></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Process Count</div>
                        <div class="stat-value">${a.process_count}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Avg Burst Time</div>
                        <div class="stat-value">${a.avg_burst}<span style="font-size:14px;color:var(--text-muted);"> u</span></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Burst Variation</div>
                        <div class="stat-value">${a.burst_variation}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Arrival Pattern</div>
                        <div class="stat-value small">${a.same_arrival ? '⚡ Simultaneous' : '📈 Spread'}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-label">Priority Defined</div>
                        <div class="stat-value small">${a.has_priority ? '✓ Yes' : '✗ No'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="scores-section">
            <h3>📊 Multi-criteria Scoring · Performance + Rules-based + Fairness</h3>
            ${scoresHtml}
        </div>
    `;
    
    // Animate score bars
    setTimeout(() => {
        container.querySelectorAll('.score-fill').forEach(fill => {
            fill.style.width = `${fill.dataset.target}%`;
        });
    }, 200);
}

// =================== COMPARISON VIEW (4 ALGOS GRID) ===================
function renderComparisonView(results, recommended) {
    // Show only the 4 main algorithms (always present)
    const mainAlgos = ['FCFS', 'SJF', 'SRTF', 'RR'];
    const grid = document.getElementById('comparisonGrid');
    
    grid.innerHTML = '';
    
    mainAlgos.forEach(algo => {
        if (!results[algo]) return;
        const result = results[algo];
        const m = result.metrics;
        const isRec = algo === recommended;
        
        const cell = document.createElement('div');
        cell.className = `algo-cell ${isRec ? 'recommended' : ''}`;
        cell.innerHTML = `
            <div class="algo-cell-header">
                <div class="algo-name" style="color: ${ALGO_COLORS[algo]};">
                    <span class="algo-name-dot" style="background: ${ALGO_COLORS[algo]};"></span>
                    ${ALGO_SHORT[algo]}
                </div>
                ${isRec ? '<span class="recommended-badge">⭐ AI Pick</span>' : ''}
            </div>
            
            <div class="algo-mini-metrics">
                <div class="algo-mini-metric">
                    <div class="mini-label">Wait</div>
                    <div class="mini-value">${m.avg_waiting}</div>
                </div>
                <div class="algo-mini-metric">
                    <div class="mini-label">TAT</div>
                    <div class="mini-value">${m.avg_turnaround}</div>
                </div>
                <div class="algo-mini-metric">
                    <div class="mini-label">Thru</div>
                    <div class="mini-value">${m.throughput}</div>
                </div>
                <div class="algo-mini-metric">
                    <div class="mini-label">Fair</div>
                    <div class="mini-value">${m.fairness}%</div>
                </div>
            </div>
            
            <div class="mini-gantt-wrap" id="miniGantt-${algo}"></div>
        `;
        grid.appendChild(cell);
    });
    
    // Render mini gantts
    setTimeout(() => {
        mainAlgos.forEach(algo => {
            if (!results[algo]) return;
            const container = document.getElementById(`miniGantt-${algo}`);
            window.ganttCharts[`mini_${algo}`] = new GanttChart(container, results[algo].gantt, {
                name: `mini_${algo}`,
                mini: true,
                controls: false
            });
        });
    }, 100);
    
    // Render comparison table
    renderComparisonTable(results, recommended);
}

function renderComparisonTable(results, recommended) {
    const table = document.getElementById('comparisonTable');
    const algos = Object.keys(results);
    
    const minW = Math.min(...algos.map(a => results[a].metrics.avg_waiting));
    const minT = Math.min(...algos.map(a => results[a].metrics.avg_turnaround));
    const minR = Math.min(...algos.map(a => results[a].metrics.avg_response));
    const maxThr = Math.max(...algos.map(a => results[a].metrics.throughput));
    const maxF = Math.max(...algos.map(a => results[a].metrics.fairness));
    
    let html = `
        <thead>
            <tr>
                <th>Algorithm</th>
                <th>Avg Waiting</th>
                <th>Avg Turnaround</th>
                <th>Avg Response</th>
                <th>Throughput</th>
                <th>Fairness</th>
                <th>CPU Util</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    algos.forEach(algo => {
        const m = results[algo].metrics;
        const isWin = algo === recommended;
        const cell = (val, isBest) => isBest ? `<span class="metric-best">${val}</span>` : val;
        
        html += `
            <tr class="${isWin ? 'winner-row' : ''}">
                <td><strong>${ALGO_NAMES[algo]}</strong>${isWin ? ' 👑' : ''}</td>
                <td>${cell(m.avg_waiting, m.avg_waiting === minW)}</td>
                <td>${cell(m.avg_turnaround, m.avg_turnaround === minT)}</td>
                <td>${cell(m.avg_response, m.avg_response === minR)}</td>
                <td>${cell(m.throughput, m.throughput === maxThr)}</td>
                <td>${cell(m.fairness + '%', m.fairness === maxF)}</td>
                <td>${m.cpu_utilization}%</td>
            </tr>
        `;
    });
    
    html += '</tbody>';
    table.innerHTML = html;
}

function playAllAnimations() {
    const mainAlgos = ['FCFS', 'SJF', 'SRTF', 'RR'];
    mainAlgos.forEach(algo => {
        const chart = window.ganttCharts[`mini_${algo}`];
        if (chart) chart.playAnimation();
    });
}

function resetAllAnimations() {
    const mainAlgos = ['FCFS', 'SJF', 'SRTF', 'RR'];
    mainAlgos.forEach(algo => {
        const chart = window.ganttCharts[`mini_${algo}`];
        if (chart) chart.showInstant();
    });
}

// =================== DETAILS VIEW ===================
function renderDetailsView(results, ai) {
    const tabsContainer = document.getElementById('detailsTabs');
    const recommended = ai.recommended;
    
    let tabsHtml = '';
    Object.keys(results).forEach((algo, idx) => {
        const isRec = algo === recommended;
        tabsHtml += `
            <button class="tab ${idx === 0 ? 'active' : ''} ${isRec ? 'recommended' : ''}"
                    onclick="showDetailsTab('${algo}', this)">
                ${ALGO_SHORT[algo]}
            </button>
        `;
    });
    tabsContainer.innerHTML = tabsHtml;
    
    // Render first algorithm
    const firstAlgo = Object.keys(results)[0];
    showDetailsTabContent(firstAlgo);
}

function showDetailsTab(algo, btn) {
    document.querySelectorAll('#detailsTabs .tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    showDetailsTabContent(algo);
}

function showDetailsTabContent(algo) {
    const result = lastResults.results[algo];
    const m = result.metrics;
    const isRec = algo === lastResults.ai.recommended;
    const reasoning = lastResults.ai.reasoning[algo];
    const container = document.getElementById('detailsContent');
    
    const hasPriority = result.processes[0].priority !== null && result.processes[0].priority !== undefined;
    
    let processRows = '';
    result.processes.forEach(p => {
        processRows += `
            <tr>
                <td style="color: ${getProcessColor(p.pid)}; font-weight: 700;">${p.pid}</td>
                <td>${p.arrival}</td>
                <td>${p.burst}</td>
                ${hasPriority ? `<td>${p.priority}</td>` : ''}
                <td>${p.completion}</td>
                <td>${p.turnaround}</td>
                <td>${p.waiting}</td>
                <td>${p.response}</td>
            </tr>
        `;
    });
    
    let reasoningItems = '';
    reasoning.forEach(point => {
        const iconChar = point.type === 'success' ? '✓' : point.type === 'warning' ? '⚠' : point.type === 'error' ? '✗' : 'ℹ';
        reasoningItems += `
            <li class="reasoning-item">
                <span class="reasoning-icon ${point.type}">${iconChar}</span>
                <span>${point.text}</span>
            </li>
        `;
    });
    
    container.innerHTML = `
        ${isRec ? `
            <div class="recommended-banner">
                <span>⭐</span> This is the AI's top recommendation for your workload
            </div>
        ` : ''}
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">Waiting Time</div>
                <div class="metric-value">${m.avg_waiting}</div>
                <div class="metric-unit">avg units</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Turnaround</div>
                <div class="metric-value">${m.avg_turnaround}</div>
                <div class="metric-unit">avg units</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Response</div>
                <div class="metric-value">${m.avg_response}</div>
                <div class="metric-unit">avg units</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Throughput</div>
                <div class="metric-value">${m.throughput}</div>
                <div class="metric-unit">proc/unit</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Fairness</div>
                <div class="metric-value">${m.fairness}<span style="font-size:14px;">%</span></div>
                <div class="metric-unit">distribution</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">CPU Util</div>
                <div class="metric-value">${m.cpu_utilization}<span style="font-size:14px;">%</span></div>
                <div class="metric-unit">efficiency</div>
            </div>
        </div>
        
        <div class="gantt-container" id="fullGantt-${algo}"></div>
        
        <div class="table-wrapper" style="margin-top: 20px;">
            <table class="metrics-table">
                <thead>
                    <tr>
                        <th>Process</th>
                        <th>Arrival</th>
                        <th>Burst</th>
                        ${hasPriority ? '<th>Priority</th>' : ''}
                        <th>Completion</th>
                        <th>Turnaround</th>
                        <th>Waiting</th>
                        <th>Response</th>
                    </tr>
                </thead>
                <tbody>${processRows}</tbody>
            </table>
        </div>
        
        <div class="reasoning-box">
            <h4 class="reasoning-title">🧠 AI Analysis · ${ALGO_NAMES[algo]}</h4>
            <ul class="reasoning-list">${reasoningItems}</ul>
        </div>
    `;
    
    // Render full Gantt
    setTimeout(() => {
        const ganttEl = document.getElementById(`fullGantt-${algo}`);
        window.ganttCharts[`full_${algo}`] = new GanttChart(ganttEl, result.gantt, {
            name: `full_${algo}`,
            mini: false,
            controls: true
        });
    }, 50);
}

// =================== 3D VIEW ===================
let current3DAlgo = null;
let current3DInstance = null;
let current3DMode = 'gantt'; // 'gantt' or 'bars'

function init3DView() {
    if (!lastResults) return;
    
    // Reset to default mode (Gantt)
    current3DMode = 'gantt';
    updateModeButtons();
    
    // Build algorithm selector for Gantt mode
    buildAlgoSelector('threeDAlgoSelector', (algo) => {
        load3DGantt(algo);
    });
    
    // Load the AI-recommended algorithm by default
    const defaultAlgo = lastResults.ai.recommended;
    load3DGantt(defaultAlgo);
}

function updateModeButtons() {
    document.querySelectorAll('.three-d-mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === current3DMode);
    });
    
    // Show/hide algorithm selector based on mode
    const selector = document.getElementById('threeDAlgoSelector');
    if (selector) {
        selector.style.display = current3DMode === 'gantt' ? 'flex' : 'none';
    }
    
    // Update title
    const title = document.getElementById('threeDTitle');
    if (title) {
        title.textContent = current3DMode === 'gantt' 
            ? '🎯 3D Gantt Chart' 
            : '🏆 AI Tournament · Algorithm Rankings';
    }
    
    // Show/hide "Show All" button (only relevant for Gantt)
    const showAllBtn = document.getElementById('showAllBtn');
    if (showAllBtn) {
        showAllBtn.style.display = current3DMode === 'gantt' ? '' : 'none';
    }
}

window.switch3DMode = function(mode) {
    if (mode === current3DMode) return;
    current3DMode = mode;
    updateModeButtons();
    
    // Dispose current instance
    if (current3DInstance) {
        current3DInstance.dispose();
        current3DInstance = null;
    }
    if (window.barChart3DInstance) {
        window.barChart3DInstance.dispose();
        window.barChart3DInstance = null;
    }
    
    if (mode === 'gantt') {
        const algo = current3DAlgo || lastResults.ai.recommended;
        load3DGantt(algo);
    } else {
        loadBarChart3D();
    }
};

function buildAlgoSelector(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const algos = Object.keys(lastResults.results);
    container.innerHTML = '';
    
    algos.forEach(algo => {
        const pill = document.createElement('button');
        pill.className = 'algo-pill';
        pill.dataset.algo = algo;
        pill.innerHTML = `
            <span class="pill-dot" style="background: ${ALGO_COLORS[algo]};"></span>
            ${ALGO_SHORT[algo]}
        `;
        pill.onclick = () => {
            container.querySelectorAll('.algo-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            onSelect(algo);
        };
        container.appendChild(pill);
    });
    
    const recommended = lastResults.ai.recommended;
    const recPill = container.querySelector(`[data-algo="${recommended}"]`);
    if (recPill) recPill.classList.add('active');
}

function load3DGantt(algo) {
    if (current3DInstance) {
        current3DInstance.dispose();
        current3DInstance = null;
    }
    if (window.barChart3DInstance) {
        window.barChart3DInstance.dispose();
        window.barChart3DInstance = null;
    }
    
    const result = lastResults.results[algo];
    if (!result) return;
    
    current3DAlgo = algo;
    const canvas = document.getElementById('threeDCanvas');
    canvas.innerHTML = '';
    
    current3DInstance = new Gantt3D(canvas, result.gantt, ALGO_NAMES[algo]);
    window.gantt3DInstances[algo] = current3DInstance;
}

function loadBarChart3D() {
    if (window.barChart3DInstance) {
        window.barChart3DInstance.dispose();
        window.barChart3DInstance = null;
    }
    if (current3DInstance) {
        current3DInstance.dispose();
        current3DInstance = null;
    }
    
    const canvas = document.getElementById('threeDCanvas');
    canvas.innerHTML = '';
    
    window.barChart3DInstance = new Podium3D(
        canvas,
        lastResults.results,
        lastResults.ai.recommended,
        lastResults.ai.scores
    );
}

window.replay3D = function() {
    if (current3DMode === 'gantt' && current3DInstance) {
        current3DInstance.replayAnimation();
    } else if (current3DMode === 'bars' && window.barChart3DInstance) {
        window.barChart3DInstance.replayAnimation();
    }
};

window.showInstant3D = function() {
    if (current3DInstance) current3DInstance.showInstant();
};

window.resetCamera3D = function() {
    if (current3DMode === 'gantt' && current3DInstance) {
        current3DInstance.resetCamera();
    } else if (current3DMode === 'bars' && window.barChart3DInstance) {
        window.barChart3DInstance.resetCamera();
    }
};

// =================== STEP MODE ===================
let currentStepInstance = null;

function initStepView() {
    if (!lastResults) return;
    
    buildAlgoSelector('stepAlgoSelector', (algo) => {
        loadStepSim(algo);
    });
    
    const defaultAlgo = lastResults.ai.recommended;
    loadStepSim(defaultAlgo);
}

function loadStepSim(algo) {
    // Stop previous if any
    if (currentStepInstance) {
        currentStepInstance.stopPlay();
    }
    
    const result = lastResults.results[algo];
    if (!result) return;
    
    const container = document.getElementById('stepSimContainer');
    container.innerHTML = '';
    
    currentStepInstance = new StepSimulatorUI(container, ALGO_NAMES[algo], result);
}

// Helper for color access from gantt.js
function getProcessColor(pid) {
    const colors = {
        'P1': '#4ade80', 'P2': '#60a5fa', 'P3': '#a78bfa', 'P4': '#fb923c',
        'P5': '#f472b6', 'P6': '#facc15', 'P7': '#2dd4bf', 'P8': '#f87171',
        'P9': '#fb7185', 'P10': '#34d399'
    };
    return colors[pid] || '#4ade80';
}

// =================== AUDIO TOGGLE ===================
let audioEnabled = false;

window.toggleAudio = async function() {
    if (!window.audioEngine) return;
    
    audioEnabled = !audioEnabled;
    
    // Resume audio context (browsers require user gesture)
    await window.audioEngine.ensureRunning();
    window.audioEngine.setEnabled(audioEnabled);
    
    // Update button visual
    const btn = document.getElementById('audioToggleBtn');
    if (btn) {
        if (audioEnabled) {
            btn.innerHTML = '🔊 Sound: On';
            btn.classList.add('audio-on');
            // Play a confirm click
            window.audioEngine.playClick();
        } else {
            btn.innerHTML = '🔇 Sound: Off';
            btn.classList.remove('audio-on');
        }
    }
};
