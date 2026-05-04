<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CPU Scheduler AI · Smart Algorithm Recommender</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>

<!-- Sidebar Navigation -->
<aside class="sidebar">
    <div class="sidebar-logo">
        <div class="logo-glow">⚙️</div>
        <div class="logo-text">
            <div class="logo-title">CPU Scheduler</div>
            <div class="logo-sub">AI-Powered</div>
        </div>
    </div>
    
    <nav class="sidebar-nav">
        <button class="nav-item active" data-view="input">
            <span class="nav-icon">📥</span>
            <span>Process Input</span>
        </button>
        <button class="nav-item" data-view="ai" disabled>
            <span class="nav-icon">🤖</span>
            <span>AI Recommendation</span>
        </button>
        <button class="nav-item" data-view="comparison" disabled>
            <span class="nav-icon">⚔️</span>
            <span>Compare All</span>
        </button>
        <button class="nav-item" data-view="charts" disabled>
            <span class="nav-icon">📊</span>
            <span>Visualizations</span>
        </button>
        <button class="nav-item" data-view="details" disabled>
            <span class="nav-icon">🔬</span>
            <span>Algorithm Details</span>
        </button>
    </nav>
    
    <div class="sidebar-footer">
        <div class="footer-badge">OS + Graphics + AI</div>
    </div>
</aside>

<!-- Main Content -->
<main class="main">
    
    <!-- Top Bar -->
    <header class="topbar">
        <div class="topbar-left">
            <h1 id="viewTitle">Process Input</h1>
            <p id="viewSubtitle">Configure processes and launch the simulation</p>
        </div>
        <div class="topbar-right">
            <div class="status-indicator" id="statusIndicator">
                <span class="status-dot"></span>
                <span class="status-text">Ready</span>
            </div>
        </div>
    </header>

    <!-- ====================== VIEW: INPUT ====================== -->
    <section class="view active" id="view-input">
        
        <!-- Datasets Section -->
        <div class="card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">📦 Dataset Library</h2>
                    <p class="card-sub">Pick a predefined scenario or generate random data</p>
                </div>
            </div>
            
            <div class="dataset-grid">
                <button class="dataset-card" onclick="loadDataset('classic')">
                    <div class="ds-icon">📚</div>
                    <div class="ds-name">Classic Textbook</div>
                    <div class="ds-desc">4 processes · Mixed bursts</div>
                </button>
                <button class="dataset-card" onclick="loadDataset('convoy')">
                    <div class="ds-icon">🚂</div>
                    <div class="ds-name">Convoy Effect</div>
                    <div class="ds-desc">5 processes · Tests FCFS</div>
                </button>
                <button class="dataset-card" onclick="loadDataset('uniform')">
                    <div class="ds-icon">⚖️</div>
                    <div class="ds-name">Uniform Workload</div>
                    <div class="ds-desc">5 processes · Tests RR</div>
                </button>
                <button class="dataset-card" onclick="loadDataset('priority')">
                    <div class="ds-icon">🎯</div>
                    <div class="ds-name">Priority-driven</div>
                    <div class="ds-desc">4 processes · Mixed priority</div>
                </button>
                <button class="dataset-card random" onclick="loadDataset('random')">
                    <div class="ds-icon">🎲</div>
                    <div class="ds-name">Random Generator</div>
                    <div class="ds-desc">4-7 processes · Auto-generated</div>
                </button>
            </div>
        </div>
        
        <!-- Settings & Process Table -->
        <div class="card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">⚙️ Process Configuration</h2>
                    <p class="card-sub">Add processes manually or use a dataset above</p>
                </div>
                <div class="header-actions">
                    <div class="setting-pill">
                        <label for="quantum">RR Quantum</label>
                        <input type="number" id="quantum" value="2" min="1" max="10">
                    </div>
                    <div class="setting-pill">
                        <label class="toggle">
                            <input type="checkbox" id="usePriority" checked onchange="togglePriority()">
                            <span class="toggle-slider"></span>
                            <span>Priority</span>
                        </label>
                    </div>
                </div>
            </div>
            
            <div class="table-wrapper">
                <table class="process-table" id="processTable">
                    <thead>
                        <tr>
                            <th>PID</th>
                            <th>Arrival Time</th>
                            <th>Burst Time</th>
                            <th class="priority-col">Priority</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="processTableBody"></tbody>
                </table>
            </div>
            
            <div class="actions-row">
                <button class="btn btn-ghost" onclick="addProcess()">
                    <span>➕</span> Add Process
                </button>
                <button class="btn btn-ghost" onclick="clearAll()">
                    <span>🗑️</span> Clear All
                </button>
                <div style="flex: 1;"></div>
                <button class="btn btn-primary btn-lg" onclick="runSimulation()">
                    <span>🚀</span> Run Simulation & AI Analysis
                </button>
            </div>
        </div>
        
    </section>

    <!-- ====================== LOADING ====================== -->
    <div class="loading-overlay" id="loadingOverlay" style="display:none;">
        <div class="loading-content">
            <div class="cpu-loader">
                <div class="cpu-core"></div>
                <div class="cpu-ring"></div>
                <div class="cpu-ring cpu-ring-2"></div>
            </div>
            <p>Running 6 algorithms · AI analyzing workload...</p>
        </div>
    </div>

    <!-- ====================== VIEW: AI RECOMMENDATION ====================== -->
    <section class="view" id="view-ai">
        <div id="aiContent"></div>
    </section>

    <!-- ====================== VIEW: COMPARISON (4 ALGORITHMS GRID) ====================== -->
    <section class="view" id="view-comparison">
        <div class="comparison-toolbar card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">⚔️ Algorithm Showdown</h2>
                    <p class="card-sub">Watch all 4 main algorithms execute simultaneously</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-ghost" onclick="playAllAnimations()">
                        <span>▶️</span> Play All
                    </button>
                    <button class="btn btn-ghost" onclick="resetAllAnimations()">
                        <span>🔄</span> Reset All
                    </button>
                </div>
            </div>
        </div>
        
        <div class="comparison-grid" id="comparisonGrid"></div>
        
        <div class="card">
            <div class="card-header">
                <div>
                    <h2 class="card-title">📊 Side-by-side Metrics</h2>
                    <p class="card-sub">All algorithms compared across every metric</p>
                </div>
            </div>
            <div class="table-wrapper">
                <table class="comparison-table" id="comparisonTable"></table>
            </div>
        </div>
    </section>

    <!-- ====================== VIEW: CHARTS ====================== -->
    <section class="view" id="view-charts">
        <div class="charts-grid">
            <div class="card chart-card">
                <h3 class="chart-title">⏱️ Average Waiting Time</h3>
                <div class="chart-wrap"><canvas id="chartWaiting"></canvas></div>
            </div>
            <div class="card chart-card">
                <h3 class="chart-title">🔄 Average Turnaround</h3>
                <div class="chart-wrap"><canvas id="chartTurnaround"></canvas></div>
            </div>
            <div class="card chart-card">
                <h3 class="chart-title">🚀 Throughput</h3>
                <div class="chart-wrap"><canvas id="chartThroughput"></canvas></div>
            </div>
            <div class="card chart-card">
                <h3 class="chart-title">⚖️ Fairness Score</h3>
                <div class="chart-wrap"><canvas id="chartFairness"></canvas></div>
            </div>
            <div class="card chart-card chart-wide">
                <h3 class="chart-title">🎯 Multi-metric Radar Comparison</h3>
                <div class="chart-wrap chart-wrap-tall"><canvas id="chartRadar"></canvas></div>
            </div>
        </div>
    </section>

    <!-- ====================== VIEW: DETAILS ====================== -->
    <section class="view" id="view-details">
        <div class="card">
            <div class="tabs" id="detailsTabs"></div>
            <div id="detailsContent"></div>
        </div>
    </section>

</main>

<script src="assets/js/gantt.js"></script>
<script src="assets/js/charts.js"></script>
<script src="assets/js/app.js"></script>
</body>
</html>
