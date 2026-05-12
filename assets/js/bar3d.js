/**
 * 3D Podium + Floating Spheres Visualization
 * 
 * Shows algorithm rankings with:
 * - 3D Podium platforms (gold/silver/bronze... etc)
 * - Glowing spheres floating above each platform (size = score)
 * - Light rays + particles around the AI-recommended winner
 * - Connecting energy beams between spheres
 */
class Podium3D {
    constructor(container, results, recommended, aiScores) {
        this.container = container;
        this.results = results;
        this.recommended = recommended;
        this.aiScores = aiScores; // {algo: score}
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.spheres = [];
        this.particles = [];
        this.rays = [];
        this.podiums = [];
        this.animFrameId = null;
        this.algoColors = {
            'FCFS': 0x4ade80, 'SJF': 0x60a5fa, 'SRTF': 0xa78bfa,
            'RR': 0xfb923c, 'Priority_NP': 0xf472b6, 'Priority_P': 0xfacc15
        };
        this.algoShortNames = {
            'FCFS': 'FCFS', 'SJF': 'SJF', 'SRTF': 'SRTF',
            'RR': 'RR', 'Priority_NP': 'Pri-NP', 'Priority_P': 'Pri-P'
        };
        // Sort algorithms by score (descending) for ranking
        this.ranked = Object.entries(this.aiScores)
            .sort((a, b) => b[1] - a[1])
            .map(([algo, score], idx) => ({ algo, score, rank: idx + 1 }));
        this.init();
    }
    init() {
        const width = this.container.clientWidth;
        const height = 500;
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x040706);
        this.scene.fog = new THREE.Fog(0x040706, 35, 90);
        // Camera - cinematic angle
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 14, 28);
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);
        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.minDistance = 12;
        this.controls.maxDistance = 60;
        this.controls.target.set(0, 4, 0);
        this.controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below floor
        this.setupLighting();
        this.buildFloor();
        this.buildPodiums();
        this.buildSpheres();
        this.buildConnectingBeams();
        this.buildBackgroundStars();
        this.buildLightRays();
        this.buildLabels();
        this.animationStartTime = performance.now();
        this.animating = true;
        this.animate();
        this.resizeHandler = () => this.onResize();
        window.addEventListener('resize', this.resizeHandler);
    }
    setupLighting() {
        // Ambient
        this.scene.add(new THREE.AmbientLight(0x303040, 1.0));
        // Main top spotlight on the winner
        const spotlight = new THREE.SpotLight(0xfff8d0, 3.0, 40, Math.PI / 6, 0.4);
        spotlight.position.set(0, 25, 0);
        spotlight.target.position.set(0, 0, 0);
        spotlight.castShadow = true;
        spotlight.shadow.mapSize.width = 1024;
        spotlight.shadow.mapSize.height = 1024;
        this.scene.add(spotlight);
        this.scene.add(spotlight.target);
        // Side accent lights
        const greenLight = new THREE.PointLight(0x4ade80, 1.2, 35);
        greenLight.position.set(-12, 8, 5);
        this.scene.add(greenLight);
        const purpleLight = new THREE.PointLight(0xa78bfa, 1.0, 35);
        purpleLight.position.set(12, 8, 5);
        this.scene.add(purpleLight);
        const blueLight = new THREE.PointLight(0x60a5fa, 0.8, 30);
        blueLight.position.set(0, 5, -10);
        this.scene.add(blueLight);
        // Hemisphere for soft top/bottom fill
        const hemi = new THREE.HemisphereLight(0x6080a0, 0x080808, 0.4);
        this.scene.add(hemi);
    }
    buildFloor() {
        // Reflective dark floor
        const floorGeo = new THREE.CircleGeometry(20, 64);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0a0e0c,
            metalness: 0.8,
            roughness: 0.3,
            envMapIntensity: 0.5
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = 0;
        floor.receiveShadow = true;
        this.scene.add(floor);
        // Glowing rings on the floor (for atmosphere)
        for (let i = 0; i < 3; i++) {
            const radius = 6 + i * 4;
            const ringGeo = new THREE.RingGeometry(radius, radius + 0.05, 64);
            const ringMat = new THREE.MeshBasicMaterial({
                color: i === 0 ? 0x4ade80 : (i === 1 ? 0x60a5fa : 0xa78bfa),
                transparent: true,
                opacity: 0.3 - i * 0.08,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.01;
            this.scene.add(ring);
        }
    }
    /**
     * Build podium platforms in a curved arrangement
     * Winner in the center back, others spread on sides
     */
    getPodiumPosition(rank, total) {
        // Winner (rank 1) sits in front center
        // Others fan out behind in a semi-circle
        if (rank === 1) {
            return { x: 0, z: 0, height: 4 };
        }
        // Arrange 2nd, 3rd, etc in a semicircle behind/sides of winner
        const otherRanks = total - 1;
        const indexAmongOthers = rank - 2; // 0-indexed among non-winners
        // Spread them in arc
        const angleSpread = Math.PI * 0.9; // ~160 degrees
        const startAngle = (Math.PI - angleSpread) / 2 + Math.PI;
        const angle = startAngle + (indexAmongOthers / Math.max(otherRanks - 1, 1)) * angleSpread;
        const radius = 7;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius + 1;
        // Heights decrease with rank
        const baseHeight = 4;
        const heightDrop = Math.min(rank - 1, 4) * 0.7;
        const height = Math.max(baseHeight - heightDrop, 1.2);
        return { x, z, height };
    }
    buildPodiums() {
        this.ranked.forEach((entry) => {
            const pos = this.getPodiumPosition(entry.rank, this.ranked.length);
            const isWinner = entry.algo === this.recommended;
            // Cylindrical pedestal
            const podiumRadius = isWinner ? 1.4 : 1.0;
            const podiumGeo = new THREE.CylinderGeometry(podiumRadius, podiumRadius * 1.1, pos.height, 32);
            // Material varies by rank
            let podiumColor, emissiveColor, metalness, roughness;
            if (isWinner) {
                // Gold for winner
                podiumColor = 0xffd700;
                emissiveColor = 0xff9500;
                metalness = 0.9;
                roughness = 0.15;
            } else if (entry.rank === 2) {
                // Silver
                podiumColor = 0xc0c8d0;
                emissiveColor = 0x404060;
                metalness = 0.85;
                roughness = 0.25;
            } else if (entry.rank === 3) {
                // Bronze
                podiumColor = 0xcd7f32;
                emissiveColor = 0x4a2810;
                metalness = 0.8;
                roughness = 0.3;
            } else {
                // Dark - other ranks
                podiumColor = 0x2a3530;
                emissiveColor = 0x0a0e0c;
                metalness = 0.6;
                roughness = 0.5;
            }
            const podiumMat = new THREE.MeshStandardMaterial({
                color: podiumColor,
                emissive: emissiveColor,
                emissiveIntensity: isWinner ? 0.4 : 0.15,
                metalness: metalness,
                roughness: roughness
            });
            const podium = new THREE.Mesh(podiumGeo, podiumMat);
            podium.position.set(pos.x, pos.height / 2, pos.z);
            podium.castShadow = true;
            podium.receiveShadow = true;
            podium.userData = { entry, pos, isWinner, originalY: pos.height / 2 };
            // Initial scale 0 for animation
            podium.scale.set(0.01, 0.01, 0.01);
            this.scene.add(podium);
            this.podiums.push(podium);
            // Top cap (decorative ring)
            if (isWinner || entry.rank <= 3) {
                const capGeo = new THREE.TorusGeometry(podiumRadius * 0.95, 0.12, 16, 32);
                const capMat = new THREE.MeshStandardMaterial({
                    color: podiumColor,
                    emissive: emissiveColor,
                    emissiveIntensity: 0.6,
                    metalness: 1,
                    roughness: 0.1
                });
                const cap = new THREE.Mesh(capGeo, capMat);
                cap.position.set(pos.x, pos.height + 0.05, pos.z);
                cap.rotation.x = Math.PI / 2;
                cap.scale.set(0.01, 0.01, 0.01);
                this.scene.add(cap);
                podium.userData.cap = cap;
            }
            // Rank number sprite on the podium face
            const rankSprite = this.makeTextSprite(`#${entry.rank}`, '#ffffff', 80);
            rankSprite.position.set(pos.x, pos.height / 2, pos.z + podiumRadius + 0.01);
            this.scaleSpriteWithText(rankSprite, 0.8);
            this.scene.add(rankSprite);
            podium.userData.rankSprite = rankSprite;
        });
    }
    buildSpheres() {
        // Get min/max scores for sphere sizing
        const scores = this.ranked.map(r => r.score);
        const minScore = Math.min(...scores);
        const maxScore = Math.max(...scores);
        this.ranked.forEach((entry) => {
            const pos = this.getPodiumPosition(entry.rank, this.ranked.length);
            const isWinner = entry.algo === this.recommended;
            const color = this.algoColors[entry.algo];
            // Sphere size based on score
            const normScore = (entry.score - minScore) / Math.max(maxScore - minScore, 1);
            const sphereRadius = 0.7 + normScore * 0.6;
            // Glowing sphere
            const sphereGeo = new THREE.SphereGeometry(sphereRadius, 32, 32);
            const sphereMat = new THREE.MeshStandardMaterial({
                color: color,
                emissive: color,
                emissiveIntensity: isWinner ? 1.2 : 0.6,
                metalness: 0.3,
                roughness: 0.2,
                transparent: true,
                opacity: 0.95
            });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            const floatY = pos.height + sphereRadius + 1.2;
            sphere.position.set(pos.x, floatY, pos.z);
            sphere.castShadow = true;
            sphere.userData = {
                entry,
                baseY: floatY,
                phase: Math.random() * Math.PI * 2, // For independent floating
                isWinner,
                radius: sphereRadius
            };
            // Initial scale 0 for entrance animation
            sphere.scale.set(0.01, 0.01, 0.01);
            this.scene.add(sphere);
            this.spheres.push(sphere);
            // Outer glow halo
            const haloGeo = new THREE.SphereGeometry(sphereRadius * 1.5, 32, 32);
            const haloMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: isWinner ? 0.18 : 0.08,
                side: THREE.BackSide
            });
            const halo = new THREE.Mesh(haloGeo, haloMat);
            sphere.add(halo);
            sphere.userData.halo = halo;
            // Add a point light for the winner sphere
            if (isWinner) {
                const sphereLight = new THREE.PointLight(color, 1.5, 12);
                sphereLight.position.set(0, 0, 0);
                sphere.add(sphereLight);
            }
        });
    }
    /**
     * Connecting energy beams between the winner sphere and others
     */
    buildConnectingBeams() {
        const winnerSphere = this.spheres.find(s => s.userData.isWinner);
        if (!winnerSphere) return;
        this.spheres.forEach(sphere => {
            if (sphere === winnerSphere) return;
            const points = [
                winnerSphere.position.clone(),
                sphere.position.clone()
            ];
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0x4ade80,
                transparent: true,
                opacity: 0.15,
                linewidth: 1
            });
            const line = new THREE.Line(geometry, material);
            line.userData = { from: winnerSphere, to: sphere };
            this.scene.add(line);
            this.rays.push(line);
        });
    }
    /**
     * Particles around the winner (golden sparkles)
     */
    buildLightRays() {
        const winnerEntry = this.ranked.find(r => r.algo === this.recommended);
        if (!winnerEntry) return;
        const pos = this.getPodiumPosition(winnerEntry.rank, this.ranked.length);
        const color = this.algoColors[winnerEntry.algo];
        // Create particle system around winner
        const particleCount = 80;
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 1.5 + Math.random() * 2;
            const height = Math.random() * 6;
            positions[i * 3] = pos.x + Math.cos(angle) * radius;
            positions[i * 3 + 1] = pos.height + 1 + height;
            positions[i * 3 + 2] = pos.z + Math.sin(angle) * radius;
            velocities.push({
                speed: 0.005 + Math.random() * 0.015,
                angle: angle,
                radius: radius,
                yPhase: Math.random() * Math.PI * 2,
                ySpeed: 0.5 + Math.random() * 1.5
            });
        }
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        // Build a glowing dot texture for particles
        const particleTex = this.createParticleTexture();
        const particleMat = new THREE.PointsMaterial({
            color: 0xffd700,
            size: 0.35,
            map: particleTex,
            transparent: true,
            opacity: 0.85,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        particles.userData = { velocities, basePos: pos };
        this.scene.add(particles);
        this.particles.push(particles);
    }
    createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 220, 100, 0.8)');
        gradient.addColorStop(0.7, 'rgba(255, 160, 50, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
        const texture = new THREE.CanvasTexture(canvas);
        return texture;
    }
    /**
     * Background stars for atmosphere
     */
    buildBackgroundStars() {
        const starCount = 250;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
            const r = 35 + Math.random() * 20;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 5; // Above floor
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }
        const starGeo = new THREE.BufferGeometry();
        starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.08,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const stars = new THREE.Points(starGeo, starMat);
        this.scene.add(stars);
    }
    buildLabels() {
        this.ranked.forEach((entry) => {
            const pos = this.getPodiumPosition(entry.rank, this.ranked.length);
            const colorHex = '#' + this.algoColors[entry.algo].toString(16).padStart(6, '0');
            // Algorithm name above sphere
            const sphereY = pos.height + 1.2 + 1.0; // base sphere position
            const nameSprite = this.makeTextSprite(this.algoShortNames[entry.algo], colorHex, 56);
            nameSprite.position.set(pos.x, sphereY + 1.8, pos.z);
            this.scaleSpriteWithText(nameSprite, 1.0);
            this.scene.add(nameSprite);
            // Score below name
            const scoreSprite = this.makeTextSprite(`${entry.score.toFixed(1)} pts`, '#a3b3ad', 36);
            scoreSprite.position.set(pos.x, sphereY + 1.0, pos.z);
            this.scaleSpriteWithText(scoreSprite, 0.55);
            this.scene.add(scoreSprite);
        });
        // "AI's Pick" crown text above winner
        const winnerEntry = this.ranked.find(r => r.algo === this.recommended);
        if (winnerEntry) {
            const pos = this.getPodiumPosition(winnerEntry.rank, this.ranked.length);
            const sphereY = pos.height + 2.2;
            const crownSprite = this.makeTextSprite("👑 AI's Pick", '#ffd700', 56);
            crownSprite.position.set(pos.x, sphereY + 3.5, pos.z);
            this.scaleSpriteWithText(crownSprite, 1.1);
            this.scene.add(crownSprite);
            this.crownSprite = crownSprite;
        }
        // Title at the top-back
        const titleSprite = this.makeTextSprite('Algorithm Rankings · AI Tournament', '#4ade80', 60);
        titleSprite.position.set(0, 13, -8);
        this.scaleSpriteWithText(titleSprite, 1.6);
        this.scene.add(titleSprite);
    }
    makeTextSprite(text, color, fontSize = 32) {
        const measureCanvas = document.createElement('canvas');
        const measureCtx = measureCanvas.getContext('2d');
        measureCtx.font = `bold ${fontSize}px Inter, sans-serif`;
        const metrics = measureCtx.measureText(text);
        const padding = fontSize * 0.5;
        const canvasWidth = Math.ceil(metrics.width + padding * 2);
        const canvasHeight = Math.ceil(fontSize * 1.6);
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');
        // Subtle glow
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = color;
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        const sprite = new THREE.Sprite(material);
        sprite.userData.aspectRatio = canvasWidth / canvasHeight;
        return sprite;
    }
    scaleSpriteWithText(sprite, height) {
        const aspect = sprite.userData.aspectRatio || 2;
        sprite.scale.set(height * aspect, height, 1);
    }
    updateAnimations() {
        const elapsed = performance.now() - this.animationStartTime;
        // Entrance animation - podiums rise up first, then spheres
        if (this.animating) {
            const progress = Math.min(elapsed / 2000, 1);
            // 🔊 Play deep ceremonial rumble RIGHT when animation starts
            if (!this.rumblePlayed && window.audioEngine) {
                this.rumblePlayed = true;
                window.audioEngine.playPodiumRumble();
            }
            // Podiums rise up (first 60% of animation)
            this.podiums.forEach((podium, i) => {
                const delay = i * 0.08;
                const localProg = Math.max(0, Math.min(1, (progress - delay) / 0.5));
                const eased = 1 - Math.pow(1 - localProg, 3);
                podium.scale.set(1, eased, 1);
                podium.position.y = podium.userData.originalY * eased;
                if (podium.userData.cap) {
                    podium.userData.cap.scale.set(eased, eased, eased);
                }
            });
            // Spheres appear after podiums (last 40%)
            this.spheres.forEach((sphere, i) => {
                const delay = 0.5 + i * 0.06;
                const localProg = Math.max(0, Math.min(1, (progress - delay) / 0.4));
                const eased = 1 - Math.pow(1 - localProg, 3);
                sphere.scale.set(eased, eased, eased);
                // 🔊 Play chime when each sphere first becomes visible
                if (!sphere.userData.chimePlayed && eased > 0.15 && window.audioEngine) {
                    sphere.userData.chimePlayed = true;
                    if (sphere.userData.isWinner) {
                        // Winner gets the triumphant fanfare!
                        window.audioEngine.playWinnerFanfare();
                    } else {
                        // Other ranks get a chime, pitch based on rank
                        const rank = sphere.userData.entry.rank;
                        window.audioEngine.playSphereChime(rank, this.ranked.length);
                    }
                }
            });
            if (progress >= 1) {
                this.animating = false;
            }
        }
        // Continuous floating animation for spheres
        this.spheres.forEach(sphere => {
            const time = elapsed * 0.001;
            const floatOffset = Math.sin(time * 1.5 + sphere.userData.phase) * 0.25;
            sphere.position.y = sphere.userData.baseY + floatOffset;
            sphere.rotation.y = time * 0.4;
            // Pulsing glow
            const pulseFactor = 0.85 + Math.sin(time * 2.5 + sphere.userData.phase) * 0.15;
            if (sphere.material) {
                const baseIntensity = sphere.userData.isWinner ? 1.2 : 0.6;
                sphere.material.emissiveIntensity = baseIntensity * pulseFactor;
            }
            if (sphere.userData.halo && sphere.userData.halo.material) {
                const baseOpacity = sphere.userData.isWinner ? 0.18 : 0.08;
                sphere.userData.halo.material.opacity = baseOpacity * pulseFactor;
            }
        });
        // 🔊 Random sparkle sounds during winner's particle animation
        if (!this.animating && window.audioEngine && this.recommended) {
            // Play a subtle sparkle every ~3-5 seconds
            const now = performance.now();
            if (!this.lastSparkle) this.lastSparkle = now;
            const sparkleDelay = 2500 + Math.random() * 2500;
            if (now - this.lastSparkle > sparkleDelay) {
                window.audioEngine.playSparkle();
                this.lastSparkle = now;
            }
        }
        // Animate connecting beams (pulsing energy)
        this.rays.forEach((line, i) => {
            const time = elapsed * 0.001;
            line.material.opacity = 0.10 + Math.sin(time * 2 + i) * 0.06;
        });
        // Animate particles - swirling around winner
        this.particles.forEach(particles => {
            const positions = particles.geometry.attributes.position.array;
            const velocities = particles.userData.velocities;
            const basePos = particles.userData.basePos;
            const time = elapsed * 0.001;
            for (let i = 0; i < velocities.length; i++) {
                const v = velocities[i];
                v.angle += v.speed;
                positions[i * 3] = basePos.x + Math.cos(v.angle) * v.radius;
                positions[i * 3 + 1] = basePos.height + 1.5 + 
                    (Math.sin(time * v.ySpeed + v.yPhase) + 1) * 2;
                positions[i * 3 + 2] = basePos.z + Math.sin(v.angle) * v.radius;
            }
            particles.geometry.attributes.position.needsUpdate = true;
        });
        // Crown sprite gentle bobbing
        if (this.crownSprite) {
            const time = elapsed * 0.001;
            this.crownSprite.position.y = this.crownSprite.position.y + 
                Math.sin(time * 2) * 0.003;
        }
    }
    replayAnimation() {
        this.podiums.forEach(p => {
            p.scale.set(0.01, 0.01, 0.01);
            if (p.userData.cap) p.userData.cap.scale.set(0.01, 0.01, 0.01);
        });
        this.spheres.forEach(s => {
            s.scale.set(0.01, 0.01, 0.01);
            s.userData.chimePlayed = false; // Reset to allow chime to play again
        });
        this.rumblePlayed = false; // Reset rumble flag
        this.animationStartTime = performance.now();
        this.animating = true;
    }
    resetCamera() {
        this.camera.position.set(0, 14, 28);
        this.controls.target.set(0, 4, 0);
        this.controls.update();
    }
    animate() {
        this.animFrameId = requestAnimationFrame(() => this.animate());
        this.updateAnimations();
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
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
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
window.barChart3DInstance = null;