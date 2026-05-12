/**
 * 3D Interactive Gantt Chart
 * Built with Three.js - WebGL rendering
 * 
 * Features:
 * - Rotate: Left mouse drag
 * - Zoom: Mouse wheel
 * - Pan: Right mouse drag
 * - Animated bar growth
 * - Hover info on bars
 */
class Gantt3D {
    constructor(container, ganttData, algoName) {
        this.container = container;
        this.gantt = ganttData;
        this.algoName = algoName;
        this.totalTime = ganttData[ganttData.length - 1].end;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.bars = [];
        this.animating = false;
        this.animationStartTime = 0;
        this.animationDuration = 4000; // 4 seconds
        this.processColors = {
            'P1': 0x4ade80, 'P2': 0x60a5fa, 'P3': 0xa78bfa, 'P4': 0xfb923c,
            'P5': 0xf472b6, 'P6': 0xfacc15, 'P7': 0x2dd4bf, 'P8': 0xf87171,
            'P9': 0xfb7185, 'P10': 0x34d399
        };
        this.init();
    }
    init() {
        // Get processes by ID for row positioning
        this.processes = [...new Set(this.gantt
            .filter(s => s.pid !== 'IDLE')
            .map(s => s.pid))];
        const width = this.container.clientWidth;
        const height = 500;
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050908);
        this.scene.fog = new THREE.Fog(0x050908, 30, 100);
        // Camera
        this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        const cameraDistance = Math.max(this.totalTime, 15) * 1.2;
        this.camera.position.set(cameraDistance * 0.7, cameraDistance * 0.6, cameraDistance);
        this.camera.lookAt(this.totalTime / 2, 0, this.processes.length / 2);
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);
        // Controls (OrbitControls)
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 200;
        this.controls.target.set(this.totalTime / 2, 1, this.processes.length / 2);
        // Lighting
        this.setupLighting();
        // Build the 3D scene
        this.buildGround();
        this.buildAxes();
        this.buildBars();
        this.buildLabels();
        // Start render loop
        this.animate();
        // Resize listener
        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);
    }
    setupLighting() {
        // Ambient light - soft fill
        const ambient = new THREE.AmbientLight(0x404040, 1.5);
        this.scene.add(ambient);
        // Main directional light (sun)
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(this.totalTime, 30, this.processes.length + 10);
        dirLight.castShadow = true;
        dirLight.shadow.camera.left = -50;
        dirLight.shadow.camera.right = 50;
        dirLight.shadow.camera.top = 50;
        dirLight.shadow.camera.bottom = -50;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);
        // Green accent light (matching theme)
        const greenLight = new THREE.PointLight(0x4ade80, 1.2, 50);
        greenLight.position.set(0, 8, this.processes.length / 2);
        this.scene.add(greenLight);
        // Purple back accent
        const purpleLight = new THREE.PointLight(0xa78bfa, 0.8, 40);
        purpleLight.position.set(this.totalTime, 8, -2);
        this.scene.add(purpleLight);
    }
    buildGround() {
        const groundGeo = new THREE.PlaneGeometry(this.totalTime + 8, this.processes.length + 6);
        const groundMat = new THREE.MeshStandardMaterial({
            color: 0x0a0e0c,
            metalness: 0.3,
            roughness: 0.7
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.set(this.totalTime / 2, 0, this.processes.length / 2);
        ground.receiveShadow = true;
        this.scene.add(ground);
        // Grid lines for that "OS dashboard" look
        const grid = new THREE.GridHelper(
            Math.max(this.totalTime, this.processes.length) + 8,
            Math.max(this.totalTime, this.processes.length) + 8,
            0x2a3530,
            0x1a201d
        );
        grid.position.set(this.totalTime / 2, 0.01, this.processes.length / 2);
        this.scene.add(grid);
    }
    buildAxes() {
        // Create axis lines
        const axisMaterial = new THREE.LineBasicMaterial({ color: 0x4a5650, linewidth: 2 });
        // Time axis (X)
        const timePoints = [
            new THREE.Vector3(0, 0.02, -0.5),
            new THREE.Vector3(this.totalTime, 0.02, -0.5)
        ];
        const timeGeo = new THREE.BufferGeometry().setFromPoints(timePoints);
        this.scene.add(new THREE.Line(timeGeo, axisMaterial));
        // Process axis (Z)
        const procPoints = [
            new THREE.Vector3(-0.5, 0.02, 0),
            new THREE.Vector3(-0.5, 0.02, this.processes.length)
        ];
        const procGeo = new THREE.BufferGeometry().setFromPoints(procPoints);
        this.scene.add(new THREE.Line(procGeo, axisMaterial));
    }
    buildBars() {
        // Each segment becomes a 3D bar
        this.gantt.forEach((segment, idx) => {
            if (segment.pid === 'IDLE') return;
            const duration = segment.end - segment.start;
            const rowIndex = this.processes.indexOf(segment.pid);
            const color = this.processColors[segment.pid] || 0x4ade80;
            // Bar geometry - height starts at 0 for animation
            const barWidth = duration - 0.05;
            const barHeight = 1.5;
            const barDepth = 0.7;
            const geometry = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
            // Glowing material
            const material = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: 0.3,
                metalness: 0.4,
                roughness: 0.4
            });
            const bar = new THREE.Mesh(geometry, material);
            bar.position.set(
                segment.start + duration / 2,
                barHeight / 2,
                rowIndex + 0.5
            );
            bar.castShadow = true;
            bar.receiveShadow = true;
            bar.userData = {
                pid: segment.pid,
                start: segment.start,
                end: segment.end,
                duration: duration,
                originalY: barHeight / 2,
                segmentIdx: idx
            };
            // Initially hidden - will animate in
            bar.scale.y = 0.01;
            bar.position.y = 0.01;
            this.scene.add(bar);
            this.bars.push(bar);
            // Add a glowing edge outline
            const edges = new THREE.EdgesGeometry(geometry);
            const lineMat = new THREE.LineBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.6
            });
            const wireframe = new THREE.LineSegments(edges, lineMat);
            bar.add(wireframe);
        });
        // Trigger initial animation
        this.startAnimation();
    }
    buildLabels() {
        // Time markers on the floor (text using sprites)
        const step = this.totalTime > 30 ? 5 : (this.totalTime > 15 ? 2 : 1);
        for (let t = 0; t <= this.totalTime; t += step) {
            const sprite = this.makeTextSprite(t.toString(), '#a3b3ad', 32);
            sprite.position.set(t, 0.1, -1.5);
            this.scaleSpriteWithText(sprite, 0.6);
            this.scene.add(sprite);
        }
        // Process labels on the side
        this.processes.forEach((pid, i) => {
            const color = '#' + (this.processColors[pid] || 0x4ade80).toString(16).padStart(6, '0');
            const sprite = this.makeTextSprite(pid, color, 48);
            sprite.position.set(-1.8, 0.5, i + 0.5);
            this.scaleSpriteWithText(sprite, 0.9);
            this.scene.add(sprite);
        });
        // Title - taller so the algorithm name shows fully
        const titleSprite = this.makeTextSprite(this.algoName, '#4ade80', 64);
        titleSprite.position.set(this.totalTime / 2, 6, this.processes.length + 1);
        this.scaleSpriteWithText(titleSprite, 1.8);
        this.scene.add(titleSprite);
    }
    makeTextSprite(text, color, fontSize = 32) {
        // Measure text first to size canvas properly
        const measureCanvas = document.createElement('canvas');
        const measureCtx = measureCanvas.getContext('2d');
        measureCtx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
        const metrics = measureCtx.measureText(text);
        // Add padding so text doesn't touch edges
        const padding = fontSize * 0.5;
        const canvasWidth = Math.ceil(metrics.width + padding * 2);
        const canvasHeight = Math.ceil(fontSize * 1.6);
        // Make canvas big enough for the text
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px JetBrains Mono, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        // Store the aspect ratio for proper scaling
        sprite.userData.aspectRatio = canvasWidth / canvasHeight;
        return sprite;
    }
    // Helper: scale sprite while preserving its text aspect ratio
    scaleSpriteWithText(sprite, height) {
        const aspect = sprite.userData.aspectRatio || 2;
        sprite.scale.set(height * aspect, height, 1);
    }
    startAnimation() {
        this.animating = true;
        this.animationStartTime = performance.now();
    }
    updateBarAnimations() {
        if (!this.animating) return;
        const elapsed = performance.now() - this.animationStartTime;
        const progress = Math.min(elapsed / this.animationDuration, 1);
        // Animate bars one by one based on their start time
        this.bars.forEach((bar, idx) => {
            const segStart = bar.userData.start;
            const segEnd = bar.userData.end;
            const segDuration = bar.userData.duration;
            // Each segment gets a window of animation time based on when it executes
            const segStartProgress = segStart / this.totalTime;
            const segEndProgress = segEnd / this.totalTime;
            if (progress < segStartProgress) {
                // Not yet
                bar.scale.y = 0.01;
                bar.position.y = 0.01;
                bar.material.emissiveIntensity = 0.3;
            } else if (progress < segEndProgress) {
                // Currently growing
                const localProgress = (progress - segStartProgress) / (segEndProgress - segStartProgress);
                const eased = 1 - Math.pow(1 - localProgress, 3); // ease-out cubic
                bar.scale.y = Math.max(eased, 0.01);
                bar.position.y = bar.userData.originalY * eased;
                // Glow pulse while growing
                bar.material.emissiveIntensity = 0.3 + Math.sin(elapsed * 0.01) * 0.2;
                // 🔊 Play sound when bar JUST started rising (only fire once per bar)
                if (!bar.userData.soundPlayed && window.audioEngine) {
                    bar.userData.soundPlayed = true;
                    // Vary pitch by bar index so it sounds musical, not monotonous
                    const pitchVar = (idx % 5) - 2; // -2 to +2
                    window.audioEngine.playBarTick(pitchVar);
                }
            } else {
                // Finished
                bar.scale.y = 1;
                bar.position.y = bar.userData.originalY;
                bar.material.emissiveIntensity = 0.3;
            }
        });
        if (progress >= 1) {
            this.animating = false;
        }
    }
    showInstant() {
        this.animating = false;
        this.bars.forEach(bar => {
            bar.scale.y = 1;
            bar.position.y = bar.userData.originalY;
            bar.material.emissiveIntensity = 0.3;
            bar.userData.soundPlayed = true; // Don't play sound on instant show
        });
    }
    replayAnimation() {
        // Reset all bars
        this.bars.forEach(bar => {
            bar.scale.y = 0.01;
            bar.position.y = 0.01;
            bar.userData.soundPlayed = false; // Allow sound to play again
        });
        this.startAnimation();
    }
    resetCamera() {
        const cameraDistance = Math.max(this.totalTime, 15) * 1.2;
        this.camera.position.set(cameraDistance * 0.7, cameraDistance * 0.6, cameraDistance);
        this.controls.target.set(this.totalTime / 2, 1, this.processes.length / 2);
        this.controls.update();
    }
    animate() {
        this.animFrameId = requestAnimationFrame(() => this.animate());
        this.updateBarAnimations();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    onResize() {
        if (!this.container || !this.renderer) return;
        const width = this.container.clientWidth;
        const height = 500;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    dispose() {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        if (this.resizeHandler) window.removeEventListener('resize', this.resizeHandler);
        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }
        if (this.scene) {
            this.scene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
        }
    }
}
window.gantt3DInstances = {};