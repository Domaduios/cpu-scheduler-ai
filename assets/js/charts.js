/**
 * Chart.js Visualizations
 * Creates 5 charts: Bar charts for metrics + Radar for multi-metric comparison
 */
const CHART_COLORS = {
    'FCFS': '#4ade80',
    'SJF': '#60a5fa',
    'SRTF': '#a78bfa',
    'RR': '#fb923c',
    'Priority_NP': '#f472b6',
    'Priority_P': '#facc15'
};
const CHART_LABELS = {
    'FCFS': 'FCFS',
    'SJF': 'SJF',
    'SRTF': 'SRTF',
    'RR': 'Round Robin',
    'Priority_NP': 'Priority NP',
    'Priority_P': 'Priority P'
};
// Chart.js global defaults for dark theme
function setupChartDefaults() {
    Chart.defaults.color = '#a3b3ad';
    Chart.defaults.font.family = 'Inter, sans-serif';
    Chart.defaults.font.size = 11;
    Chart.defaults.borderColor = '#2a3530';
}
// Stored chart instances for cleanup
const chartInstances = {};
function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}
function makeBarChart(canvasId, results, metricKey, label, unit = '') {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const algos = Object.keys(results);
    const data = algos.map(a => results[a].metrics[metricKey]);
    const labels = algos.map(a => CHART_LABELS[a]);
    const colors = algos.map(a => CHART_COLORS[a]);
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: colors.map(c => c + '99'),
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: colors,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0a0e0c',
                    borderColor: '#2a3530',
                    borderWidth: 1,
                    padding: 10,
                    titleColor: '#f1f5f3',
                    bodyColor: '#a3b3ad',
                    callbacks: {
                        label: (ctx) => `${label}: ${ctx.parsed.y}${unit}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#1a201d' },
                    ticks: { color: '#6b7d75' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#a3b3ad', font: { weight: 600 } }
                }
            }
        }
    });
}
function makeRadarChart(canvasId, results) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const algos = Object.keys(results);
    // Normalize metrics to 0-100 (higher = better)
    const allWaiting = algos.map(a => results[a].metrics.avg_waiting);
    const allTurnaround = algos.map(a => results[a].metrics.avg_turnaround);
    const allResponse = algos.map(a => results[a].metrics.avg_response);
    const allThroughput = algos.map(a => results[a].metrics.throughput);
    const allFairness = algos.map(a => results[a].metrics.fairness);
    const minW = Math.min(...allWaiting), maxW = Math.max(...allWaiting);
    const minT = Math.min(...allTurnaround), maxT = Math.max(...allTurnaround);
    const minR = Math.min(...allResponse), maxR = Math.max(...allResponse);
    const maxThr = Math.max(...allThroughput);
    const maxF = Math.max(...allFairness);
    // Convert: lower is better → invert
    const normalize = (val, min, max, invert = true) => {
        if (max === min) return 100;
        const norm = ((val - min) / (max - min)) * 100;
        return invert ? 100 - norm : norm;
    };
    const datasets = algos.map(algo => {
        const m = results[algo].metrics;
        return {
            label: CHART_LABELS[algo],
            data: [
                normalize(m.avg_waiting, minW, maxW),
                normalize(m.avg_turnaround, minT, maxT),
                normalize(m.avg_response, minR, maxR),
                maxThr > 0 ? (m.throughput / maxThr) * 100 : 100,
                maxF > 0 ? (m.fairness / maxF) * 100 : 100
            ],
            backgroundColor: CHART_COLORS[algo] + '33',
            borderColor: CHART_COLORS[algo],
            borderWidth: 2,
            pointBackgroundColor: CHART_COLORS[algo],
            pointBorderColor: '#0a0e0c',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: CHART_COLORS[algo],
            pointRadius: 4
        };
    });
    chartInstances[canvasId] = new Chart(canvas, {
        type: 'radar',
        data: {
            labels: ['Waiting Time', 'Turnaround', 'Response Time', 'Throughput', 'Fairness'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#a3b3ad',
                        boxWidth: 14,
                        boxHeight: 14,
                        padding: 12,
                        font: { size: 12, weight: 600 }
                    }
                },
                tooltip: {
                    backgroundColor: '#0a0e0c',
                    borderColor: '#2a3530',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.r.toFixed(1)}/100`
                    }
                }
            },
            scales: {
                r: {
                    angleLines: { color: '#2a3530' },
                    grid: { color: '#2a3530' },
                    pointLabels: { color: '#f1f5f3', font: { size: 11, weight: 600 } },
                    ticks: {
                        color: '#6b7d75',
                        backdropColor: 'transparent',
                        font: { size: 9 }
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                }
            }
        }
    });
}
function renderAllCharts(results) {
    setupChartDefaults();
    makeBarChart('chartWaiting', results, 'avg_waiting', 'Avg Waiting Time', 'u');
    makeBarChart('chartTurnaround', results, 'avg_turnaround', 'Avg Turnaround', 'u');
    makeBarChart('chartThroughput', results, 'throughput', 'Throughput', ' p/u');
    makeBarChart('chartFairness', results, 'fairness', 'Fairness Score', '%');
    makeRadarChart('chartRadar', results);
}