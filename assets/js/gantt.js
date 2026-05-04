/**
 * Animated Gantt Chart Renderer
 * Supports normal and mini variants
 */

const PROCESS_COLORS = {
    'P1': '#4ade80', 'P2': '#60a5fa', 'P3': '#a78bfa', 'P4': '#fb923c',
    'P5': '#f472b6', 'P6': '#facc15', 'P7': '#2dd4bf', 'P8': '#f87171',
    'P9': '#fb7185', 'P10': '#34d399'
};

function getProcessColor(pid) {
    if (pid === 'IDLE') return '#3a4540';
    if (PROCESS_COLORS[pid]) return PROCESS_COLORS[pid];
    
    let hash = 0;
    for (let i = 0; i < pid.length; i++) {
        hash = pid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${Math.abs(hash) % 360}, 65%, 60%)`;
}

class GanttChart {
    constructor(container, ganttData, options = {}) {
        this.container = container;
        this.gantt = ganttData;
        this.algoName = options.name || 'algorithm';
        this.mini = options.mini || false;
        this.showControls = options.controls !== false;
        this.totalTime = ganttData[ganttData.length - 1].end;
        this.animationInterval = null;
        this.unitWidth = 0;
        
        this.render();
    }
    
    render() {
        const containerWidth = this.container.clientWidth - 30;
        const minUnit = this.mini ? 20 : 30;
        const maxUnit = this.mini ? 50 : 70;
        this.unitWidth = Math.max(minUnit, Math.min(maxUnit, containerWidth / this.totalTime));
        
        const totalWidth = this.totalTime * this.unitWidth;
        const barHeight = this.mini ? 32 : 50;
        
        let controlsHtml = '';
        if (this.showControls && !this.mini) {
            controlsHtml = `
                <div class="gantt-controls">
                    <button class="gantt-btn" onclick="window.ganttCharts['${this.algoName}'].playAnimation()">
                        ▶ Play
                    </button>
                    <button class="gantt-btn" onclick="window.ganttCharts['${this.algoName}'].showInstant()">
                        Show All
                    </button>
                </div>
            `;
        }
        
        const titleHtml = this.mini ? '' : `
            <div class="gantt-title">
                <span>📊 ${this.algoName} · Execution Timeline</span>
                ${controlsHtml}
            </div>
        `;
        
        this.container.innerHTML = `
            ${titleHtml}
            <div class="gantt-chart ${this.mini ? 'mini-gantt' : ''}" style="width: ${totalWidth + 20}px;">
                <div class="gantt-bars" id="bars-${this.algoName}" style="height: ${barHeight}px; position: relative; white-space: nowrap;"></div>
                <div class="gantt-timeline" style="width: ${totalWidth}px;" id="timeline-${this.algoName}"></div>
            </div>
        `;
        
        this.barsContainer = document.getElementById(`bars-${this.algoName}`);
        this.timelineContainer = document.getElementById(`timeline-${this.algoName}`);
        
        this.renderTimeline();
        this.showInstant();
    }
    
    renderTimeline() {
        this.timelineContainer.innerHTML = '';
        const step = this.totalTime > 30 ? 5 : (this.totalTime > 15 ? 2 : 1);
        
        for (let t = 0; t <= this.totalTime; t += step) {
            const tick = document.createElement('div');
            tick.className = 'gantt-tick';
            tick.style.left = `${t * this.unitWidth}px`;
            tick.textContent = t;
            this.timelineContainer.appendChild(tick);
        }
        
        if (this.totalTime % step !== 0) {
            const tick = document.createElement('div');
            tick.className = 'gantt-tick';
            tick.style.left = `${this.totalTime * this.unitWidth}px`;
            tick.textContent = this.totalTime;
            this.timelineContainer.appendChild(tick);
        }
    }
    
    showInstant() {
        this.stopAnimation();
        this.barsContainer.innerHTML = '';
        
        this.gantt.forEach((segment, idx) => {
            const bar = this.createBar(segment);
            bar.classList.add('animating');
            bar.style.animationDelay = `${idx * 0.04}s`;
            this.barsContainer.appendChild(bar);
        });
    }
    
    playAnimation() {
        this.stopAnimation();
        this.barsContainer.innerHTML = '';
        
        const barHeight = this.mini ? 32 : 50;
        const pointer = document.createElement('div');
        pointer.className = 'gantt-pointer';
        pointer.style.left = '0px';
        pointer.style.height = `${barHeight}px`;
        this.barsContainer.appendChild(pointer);
        
        const speed = 150;
        let segIdx = 0;
        let unitInSeg = 0;
        
        const animate = () => {
            if (segIdx >= this.gantt.length) {
                pointer.style.display = 'none';
                return;
            }
            
            const segment = this.gantt[segIdx];
            const segDuration = segment.end - segment.start;
            
            let bar = document.getElementById(`bar-${this.algoName}-${segIdx}`);
            if (!bar) {
                bar = this.createBar(segment, true);
                bar.id = `bar-${this.algoName}-${segIdx}`;
                this.barsContainer.appendChild(bar);
            }
            
            unitInSeg++;
            bar.style.width = `${unitInSeg * this.unitWidth}px`;
            
            const currentTime = segment.start + unitInSeg;
            pointer.style.left = `${currentTime * this.unitWidth}px`;
            
            if (unitInSeg >= segDuration) {
                segIdx++;
                unitInSeg = 0;
            }
            
            this.animationInterval = setTimeout(animate, speed);
        };
        
        animate();
    }
    
    createBar(segment, animated = false) {
        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        if (segment.pid === 'IDLE') bar.classList.add('idle');
        
        const duration = segment.end - segment.start;
        const width = animated ? 0 : duration * this.unitWidth;
        const barHeight = this.mini ? 32 : 50;
        
        bar.style.cssText = `
            position: absolute;
            left: ${segment.start * this.unitWidth}px;
            width: ${width}px;
            height: ${barHeight}px;
            background: ${getProcessColor(segment.pid)};
        `;
        
        bar.innerHTML = `<span>${segment.pid}</span>`;
        bar.title = `${segment.pid}: ${segment.start} → ${segment.end} (${duration}u)`;
        
        return bar;
    }
    
    stopAnimation() {
        if (this.animationInterval) {
            clearTimeout(this.animationInterval);
            this.animationInterval = null;
        }
    }
}

window.ganttCharts = {};
