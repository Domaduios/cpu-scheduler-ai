# 🚀 CPU Scheduler AI

## Smart Scheduling Algorithm Simulator
**Operating Systems + Computer Graphics + AI Recommendation**

A professional web application that simulates 6 CPU scheduling algorithms with animated Gantt charts and an intelligent recommendation engine.

---

## ✨ Features

### 🎯 Core Features
- **6 Scheduling Algorithms:**
  - First Come First Serve (FCFS)
  - Shortest Job First (SJF) - Non-preemptive
  - Shortest Remaining Time First (SRTF) - Preemptive
  - Round Robin (RR)
  - Priority Scheduling - Non-preemptive
  - Priority Scheduling - Preemptive

### 📊 Computer Graphics Component
- **Animated Gantt Charts** with playback controls
- **4 algorithms shown simultaneously** in 2x2 grid (Comparison view)
- **Mini Gantt charts** for quick comparison
- **Color-coded processes** with smooth animations

### 🤖 AI Decision Engine
- **Multi-criteria scoring system** (100 points total):
  - Waiting Time (25 pts)
  - Turnaround (15 pts)
  - Throughput (10 pts)
  - Fairness (10 pts)
  - Rules-based bonus (40 pts)
- **Workload analysis:** Uniform / Mixed / Diverse classification
- **Detailed reasoning** for each algorithm
- **Real recommendation** based on actual metrics + expert rules

### 📦 Dataset Library
- **4 predefined datasets:**
  - Classic Textbook Example
  - Convoy Effect Demo
  - Uniform Workload
  - Priority-driven Scenario
- **Random Generator** for endless testing

### 📈 Data Visualization (Chart.js)
- Bar charts for Waiting Time, Turnaround, Throughput, Fairness
- Multi-metric Radar chart for comprehensive comparison
- Interactive tooltips and animations

---

## 🛠️ Installation (XAMPP)

1. **Copy the folder** to:
   ```
   C:\xampp\htdocs\cpu_scheduler\
   ```

2. **Start Apache** in XAMPP Control Panel
   - No MySQL needed!

3. **Open browser:**
   ```
   http://localhost/cpu_scheduler/
   ```

---

## 🎓 How to Use

### Step 1: Choose Your Data
- Click any **Dataset Card** for instant test scenarios
- Or click **🎲 Random Generator** for new random data
- Or **➕ Add Process** manually

### Step 2: Configure Settings
- Adjust **RR Quantum** (default: 2)
- Toggle **Priority** if needed

### Step 3: Run Simulation
- Click **🚀 Run Simulation & AI Analysis**

### Step 4: Explore Views
The sidebar gives you 5 different views:
1. **📥 Process Input** - Configure data
2. **🤖 AI Recommendation** - See the winner + reasoning
3. **⚔️ Compare All** - 4 algorithms in 2x2 grid with mini Gantts
4. **📊 Visualizations** - Chart.js charts
5. **🔬 Algorithm Details** - Deep dive with full Gantt + metrics

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | PHP 7.4+ |
| Frontend | Vanilla JavaScript + Chart.js |
| Styling | CSS3 (Custom Properties) |
| Server | Apache (via XAMPP) |
| Architecture | RESTful API (PHP returns JSON) |

---

## 📁 File Structure

```
cpu_scheduler/
├── index.php              Main page
├── api/
│   └── schedule.php       JSON API endpoint
├── includes/
│   ├── algorithms.php     6 scheduling algorithms
│   ├── ai_recommender.php Decision engine
│   └── datasets.php       Predefined test cases
└── assets/
    ├── css/style.css      Dark + Green professional theme
    └── js/
        ├── app.js         Main application logic
        ├── gantt.js       Animated Gantt renderer
        └── charts.js      Chart.js visualizations
```

---

## 🎨 Design

Inspired by **Data UI Mega Kit** with:
- Dark theme (#0a0e0c)
- Green accents (#4ade80)
- Sidebar navigation
- Glassmorphism effects
- Smooth animations & transitions

---

## 🧪 Sample Test Results

| Dataset | Workload Type | AI Recommends | Reason |
|---------|---------------|---------------|--------|
| Classic | Mixed | SRTF | Best balance of waiting time + adaptability |
| Convoy Effect | Diverse | SRTF | Solves convoy effect problem |
| Uniform | Uniform | Priority NP / FCFS | Simple is better for uniform loads |
| Priority-driven | Mixed | SRTF | Optimal waiting time |

---

**Built for OS + Computer Graphics Course** ⚡
