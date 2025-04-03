// Configuration de base Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('threejs-container').appendChild(renderer.domElement);

// Variables pour la position de la souris - améliorées pour un meilleur suivi
let mouse = new THREE.Vector2(0, 0);
let targetMouse = new THREE.Vector2(0, 0);
let prevMouse = new THREE.Vector2(0, 0);
let mouseVelocity = new THREE.Vector2(0, 0);
const smoothness = 0.1; // Réduit pour un suivi plus immédiat
const velocitySmoothness = 0.05; // Réduit pour capturer les mouvements rapides

// Variables pour les interactions
let clicks = [];
const MAX_CLICKS = 10; // Nombre maximum de clics mémorisés
const CLICK_DURATION = 3.0; // Durée de vie d'un clic en secondes

// Couleur de fond plus douce
scene.background = new THREE.Color(0x7ab421).multiplyScalar(0.85);

// Gestionnaire d'événements pour la souris - corrigé pour un meilleur suivi
document.addEventListener('mousemove', (event) => {
    // Obtenir la position du conteneur Three.js
    const container = renderer.domElement;
    const rect = container.getBoundingClientRect();
    
    // Calculer la position relative à la fenêtre
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convertir en coordonnées normalisées (-1 à 1)
    targetMouse.x = (x / rect.width) * 2 - 1;
    targetMouse.y = -(y / rect.height) * 2 + 1;
});

// Gestionnaire pour les clics
document.addEventListener('click', (event) => {
    // Obtenir la position du conteneur Three.js
    const container = renderer.domElement;
    const rect = container.getBoundingClientRect();
    
    // Calculer la position relative à la fenêtre
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Convertir en coordonnées normalisées (-1 à 1)
    const clickX = (x / rect.width) * 2 - 1;
    const clickY = -(y / rect.height) * 2 + 1;
    
    const clickPos = new THREE.Vector2(clickX, clickY);
    
    clicks.push({
        position: clickPos.clone(),
        time: performance.now() * 0.001, // Temps en secondes
        strength: 1.0
    });
    
    // Limiter le nombre de clics mémorisés
    if (clicks.length > MAX_CLICKS) {
        clicks.shift();
    }
});

// Créer un plan avec du bruit pour le fond
const planeGeometry = new THREE.PlaneGeometry(10, 10, 200, 200);

// Créer les glaçons avec une géométrie plus précise pour un aspect cubique
const iceGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15, 3, 3, 3);
const iceMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xffffff) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uMouseVelocity: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewDir;
        
        void main() {
            vPosition = position;
            vNormal = normal;
            
            // Calculer la direction de vue
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vViewDir = normalize(cameraPosition - worldPosition.xyz);
            
            // Réduire l'effet de flottement pour préserver la forme cubique
            vec3 pos = position;
            float floatEffect = sin(uTime + position.x * 1.5) * 0.005;
            pos.y += floatEffect;
            
            // Rotation plus lente et préservant mieux la forme
            float rotation = uTime * 0.05;
            float c = cos(rotation);
            float s = sin(rotation);
            mat3 rotationMatrix = mat3(
                c, 0, -s,
                0, 1, 0,
                s, 0, c
            );
            pos = rotationMatrix * pos;
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vViewDir;
        
        void main() {
            // Réduire l'effet de transparence pour que les glaçons soient plus solides
            float transparency = smoothstep(0.0, 0.5, vPosition.y) * 0.2;
            
            // Éclairage amélioré pour mettre en valeur la forme 3D
            vec3 light = normalize(vec3(1.0, 1.0, 1.0));
            float diffuse = max(0.0, dot(vNormal, light)) * 0.7;
            
            // Effet de fresnel plus prononcé pour les bords
            float fresnel = pow(1.0 - max(0.0, dot(vNormal, vViewDir)), 2.5) * 0.7;
            
            // Effet de scintillement plus subtil
            float sparkle = sin(vPosition.x * 12.0 + uTime) * sin(vPosition.y * 12.0 + uTime) * 0.1 + 0.9;
            
            // Couleur de base plus glacée avec légère teinte bleue
            vec3 baseColor = vec3(0.92, 0.95, 1.0);
            
            // Ajouter des reflets plus prononcés
            vec3 reflection = reflect(-vViewDir, vNormal);
            float reflectionIntensity = pow(max(0.0, dot(reflection, light)), 3.0) * 0.6;
            
            // Accentuer les arêtes du cube
            float edgeHighlight = pow(1.0 - abs(dot(vNormal, vViewDir)), 5.0) * 0.6;
            
            // Effet de profondeur pour renforcer l'aspect 3D
            float depth = max(0.7, dot(vNormal, vec3(0.0, 0.0, 1.0)));
            
            // Combiner tous les effets
            vec3 finalColor = mix(baseColor * depth, vec3(1.0), 
                diffuse + 
                fresnel + 
                reflectionIntensity + 
                edgeHighlight
            );
            
            // Réduire la transparence pour un aspect plus solide
            float finalAlpha = 0.8 - transparency;
            
            gl_FragColor = vec4(finalColor, finalAlpha);
        }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true  // Activer l'écriture de profondeur pour une meilleure perception 3D
});

// Créer plusieurs glaçons avec des tailles variées pour mieux percevoir la 3D
const iceCubes = [];
const numIceCubes = 25; // Augmenté de 15 à 25 glaçons
for (let i = 0; i < numIceCubes; i++) {
    const iceCube = new THREE.Mesh(iceGeometry, iceMaterial.clone());
    
    // Varier légèrement les tailles pour renforcer l'effet 3D
    const scale = 1.0 + Math.random() * 0.8; // Augmenté la taille minimale et maximale
    iceCube.scale.set(scale, scale, scale);
    
    // Positionner les glaçons dans une zone plus large
    iceCube.position.set(
        (Math.random() - 0.5) * 4.0, // Zone plus large en X
        (Math.random() - 0.5) * 1.5, // Zone plus large en Y
        (Math.random() - 0.5) * 4.0  // Zone plus large en Z
    );
    
    // Rotation aléatoire pour éviter l'alignement des faces
    iceCube.rotation.x = Math.random() * Math.PI;
    iceCube.rotation.y = Math.random() * Math.PI;
    iceCube.rotation.z = Math.random() * Math.PI;
    
    // Stocker la position d'origine pour l'effet de retour
    iceCube.userData.originalX = iceCube.position.x;
    iceCube.userData.originalY = iceCube.position.y;
    iceCube.userData.originalZ = iceCube.position.z;
    
    iceCubes.push(iceCube);
    scene.add(iceCube);
}

// Créer un plan avec du bruit pour le fond - Shaders améliorés pour meilleur suivi de souris
const planeMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x7ab421).multiplyScalar(0.9) },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uMouseVelocity: { value: new THREE.Vector2(0, 0) },
        uClicks: { value: [] },
        uClicksCount: { value: 0 },
        uClicksDuration: { value: CLICK_DURATION },
        uWaveHeight: { value: 0.003 },
        uWaveSpeed: { value: .5 },
        uWaveFrequency: { value: 4.0 }
    },
    vertexShader: `
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uMouseVelocity;
        uniform vec3 uClicks[${MAX_CLICKS}];
        uniform int uClicksCount;
        uniform float uClicksDuration;
        uniform float uWaveHeight;
        uniform float uWaveSpeed;
        uniform float uWaveFrequency;
        
        varying vec2 vUv;
        varying float vElevation;
        varying vec2 vMousePosition; // Nouvelle variable pour passer la position à utiliser dans le fragment shader
        
        // Fonction de bruit améliorée
        float noise(vec2 p) {
            return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        // Fonction de vagues multiples plus douces
        float wave(vec2 position, float time) {
            // Ajuster les coordonnées pour couvrir tout l'espace
            vec2 scaledPos = position * 1.5;
            
            // Vague principale plus étroite
            float wave1 = sin(scaledPos.x * uWaveFrequency + time * uWaveSpeed) * uWaveHeight * 1.2; // Augmenté de 20%
            
            // Vague secondaire perpendiculaire
            float wave2 = sin(scaledPos.y * uWaveFrequency * 0.9 + time * uWaveSpeed * 0.7) * uWaveHeight * 0.7; // Augmenté de 10%
            
            // Vague diagonale plus prononcée
            float wave3 = sin((scaledPos.x + scaledPos.y) * uWaveFrequency * 0.7 + time * uWaveSpeed * 0.9) * uWaveHeight * 0.5; // Augmenté de 10%
            
            // Ajouter un peu de bruit pour plus de texture
            float noiseValue = noise(vec2(scaledPos.x * 0.3 + time * 0.03, scaledPos.y * 0.3 + time * 0.03));
            float noiseWave = noiseValue * uWaveHeight * 0.2; // Augmenté de 0.15 à 0.2
            
            return wave1 + wave2 + wave3 + noiseWave;
        }
        
        void main() {
            vec3 pos = position;
            
            // Utiliser les coordonnées UV pour les vagues
            vec2 uvPos = uv * 2.0 - 1.0;
            
            // Effet de vagues de base
            float baseWave = wave(uvPos, uTime);
            
            // Effet des clics (cercles concentriques)
            float clicksElevation = 0.0;
            for(int i = 0; i < ${MAX_CLICKS}; i++) {
                if(i >= uClicksCount) break;
                
                vec2 clickPos = uClicks[i].xy;
                float clickTime = uClicks[i].z;
                float timeSinceClick = uTime - clickTime;
                
                if(timeSinceClick < uClicksDuration) {
                    float radius = timeSinceClick * 0.3;
                    float fadeOut = 1.0 - (timeSinceClick / uClicksDuration);
                    float wave = sin(10.0 * distance(uvPos, clickPos) - timeSinceClick * 5.0);
                    float mask = smoothstep(radius + 0.1, radius - 0.1, distance(uvPos, clickPos));
                    clicksElevation += wave * mask * 0.01 * fadeOut;
                }
            }
            
            // Effet de trace de souris plus subtil
            float distToMouse = distance(uvPos, uMouse);
            float mouseSpeed = length(uMouseVelocity);
            float mouseTrail = exp(-distToMouse * 20.0) * mouseSpeed * 0.1; // Réduit de 0.15 à 0.1
            
            // Effet d'ondulation autour de la souris plus précis
            float currentMouseEffect = sin(distToMouse * 8.0 - uTime * 2.0) * exp(-distToMouse * 8.0) * 0.004; // Réduit de 0.006 à 0.004
            
            // Combiner tous les effets
            float finalElevation = baseWave + clicksElevation + mouseTrail + currentMouseEffect;
            
            // Appliquer l'élévation
            pos.z += finalElevation;
            
            // Position finale
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            
            // Variables pour le fragment shader
            vUv = uv;
            vElevation = finalElevation;
            vMousePosition = uMouse; // Passer la position de la souris au fragment shader
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        uniform vec2 uMouse;
        uniform vec2 uMouseVelocity;
        varying vec2 vUv;
        varying float vElevation;
        varying vec2 vMousePosition;
        
        void main() {
            // Coordonnées normalisées pour le calcul des effets
            vec2 normalizedPos = vUv * 2.0 - 1.0;
            
            // Calculer l'intensité en fonction de l'élévation avec plus de contraste
            float intensity = vElevation * 20.0 + 0.9;
            
            // Couleur de base: vert matcha
            vec3 baseColor = uColor;
            
            // Couleur plus claire pour les hauteurs
            vec3 highlightColor = vec3(1.0);
            
            // Effet de brillance sur les vagues plus subtil
            float waveHighlight = sin(vUv.x * 10.0 + uTime) * sin(vUv.y * 10.0 + uTime) * 0.1 + 0.9;
            
            // Mélanger les couleurs en fonction de l'intensité et de la brillance avec moins de blanc
            vec3 finalColor = mix(baseColor, highlightColor, 
                smoothstep(0.9, 1.1, intensity) * 0.35 + 
                waveHighlight * 0.2
            );
            
            // Effet de vignette plus subtil
            float vignette = smoothstep(0.8, 0.2, length(vUv - 0.5));
            finalColor = mix(finalColor * 0.95, finalColor, vignette);
            
            // Ajouter un effet de profondeur plus marqué
            float depth = 1.0 - vElevation * 0.5;
            finalColor *= depth;
            
            gl_FragColor = vec4(finalColor, 1.0);
        }
    `,
    side: THREE.DoubleSide
});

// Update the plane with the new material
const plane = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);

// Variable globale pour le texte
let textMesh;

// Créer la géométrie du texte
const loader = new THREE.FontLoader();
loader.load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', function(font) {
    const textGeometry = new THREE.TextGeometry('matcha', {
        font: font,
        size: 0.8,
        height: 0.15,
        curveSegments: 12,
        bevelEnabled: true,
        bevelThickness: 0.02,
        bevelSize: 0.01,
        bevelOffset: 0,
        bevelSegments: 8
    });

    textGeometry.center();

    const textMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uMouse: { value: new THREE.Vector2(0, 0) },
            uMouseVelocity: { value: new THREE.Vector2(0, 0) }
        },
        vertexShader: `
            uniform float uTime;
            uniform vec2 uMouse;
            uniform vec2 uMouseVelocity;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec2 vPosition;
            
            // Fonction de bruit améliorée
            float noise(vec2 p) {
                return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            float circleWave(vec2 position, vec2 center, float time, float radius) {
                float dist = distance(position, center);
                float amplitude = smoothstep(radius, 0.0, dist) * 0.06;
                return sin(dist * 12.0 - time * 4.0) * amplitude;
            }
            
            // Fonction pour limiter les valeurs
            float clampValue(float value, float min, float max) {
                return clamp(value, min, max);
            }
            
            void main() {
                vec3 pos = position;
                
                // Effet de fusion de base plus doux
                float meltEffect = smoothstep(0.0, 1.0, pos.y) * 0.08;
                
                // Effet de vagues de base plus stable
                float baseWave = sin(pos.x * 1.5 + uTime * 0.3) * 0.025 +
                               sin(pos.y * 1.2 + uTime * 0.2) * 0.02 +
                               sin((pos.x + pos.y) * 1.0 + uTime * 0.15) * 0.015;
                
                // Effet de bruit plus subtil
                float noiseValue = noise(vec2(pos.x * 1.5 + uTime * 0.2, pos.y * 1.5));
                float noiseWave = noiseValue * 0.015;
                
                // Effet de vagues autour de la souris plus réactif
                float mouseWave = circleWave(pos.xy, uMouse, uTime, 0.5) * 1.5; // Augmenté
                
                // Effet de trace de souris plus intense
                float mouseSpeed = length(uMouseVelocity);
                float distToMouse = distance(pos.xy, uMouse);
                float mouseTrail = exp(-distToMouse * 3.0) * clampValue(mouseSpeed, 0.0, 1.0) * 0.8; // Plus intense
                
                // Effet de fusion secondaire plus doux
                float secondaryMelt = smoothstep(0.0, 0.25, distToMouse) * 0.03;
                
                // Facteur de stabilisation aux extrémités
                float edgeFactor = smoothstep(0.0, 0.2, abs(pos.x)) * smoothstep(0.0, 0.2, abs(pos.y));
                
                // Combiner tous les effets avec fusion et stabilisation
                float finalWave = (baseWave + noiseWave + mouseWave + mouseTrail) * (1.0 - meltEffect) * edgeFactor;
                float finalMelt = (meltEffect + secondaryMelt) * edgeFactor;
                
                // Limiter la distorsion maximale
                finalWave = clampValue(finalWave, -0.08, 0.08);
                finalMelt = clampValue(finalMelt, 0.0, 0.15);
                
                // Appliquer la distorsion et la fusion avec stabilisation
                pos.z += finalWave * 1.2;
                pos.y -= finalMelt * 0.3;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                vUv = uv;
                vNormal = normal;
                vPosition = pos.xy;
            }
        `,
        fragmentShader: `
            uniform vec2 uMouse;
            uniform float uTime;
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec2 vPosition;
            
            void main() {
                // Éclairage de base
                vec3 light = normalize(vec3(1.0, 1.0, 1.0));
                float diffuse = max(0.0, dot(vNormal, light));
                
                // Effet de fusion plus doux
                float meltEffect = smoothstep(0.0, 1.0, vPosition.y) * 0.2;
                
                // Effet de diffusion à la souris plus intense et réactif
                float dist = distance(vPosition, uMouse);
                float glow = smoothstep(0.3, 0.0, dist) * 2.0; // Plus intense et visible
                
                // Effet de brillance sur les vagues plus subtil
                float waveHighlight = smoothstep(0.0, 0.1, vNormal.z);
                
                // Effet de halo lumineux pulsant autour de la souris
                float halo = sin(uTime * 3.0 + dist * 10.0) * 0.5 + 0.5;
                float pulseGlow = smoothstep(0.5, 0.0, dist) * halo * 0.4;
                
                // Effet de transparence pour la fusion plus doux
                float alpha = 1.0 - meltEffect * 0.2;
                
                // Combiner tous les effets
                vec3 baseColor = vec3(1.0) * (diffuse * 0.4 + 0.6);
                vec3 glowColor = vec3(1.0, 1.0, 1.0) * glow; // Blanc pur pour plus d'éclat
                vec3 pulseColor = vec3(1.0, 1.0, 0.9) * pulseGlow; // Léger jaune pour le halo pulsant
                vec3 highlightColor = vec3(1.0) * waveHighlight * 0.2;
                vec3 finalColor = mix(baseColor + glowColor + highlightColor + pulseColor, vec3(0.0), meltEffect * 0.15);
                
                gl_FragColor = vec4(finalColor, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    // Créer le mesh et l'ajouter à la scène
    textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.z = 0.05;
    scene.add(textMesh);

    // Éclairage stable
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
});

// Position de la caméra
camera.position.z = 2;

// Animation
function animate() {
    requestAnimationFrame(animate);

    // Mettre à jour la position précédente
    prevMouse.x = mouse.x;
    prevMouse.y = mouse.y;

    // Appliquer l'interpolation linéaire pour un mouvement fluide mais direct
    mouse.x += (targetMouse.x - mouse.x) * smoothness;
    mouse.y += (targetMouse.y - mouse.y) * smoothness;

    // Calculer la vélocité de la souris avec un lissage approprié
    mouseVelocity.x = (mouse.x - prevMouse.x) / velocitySmoothness;
    mouseVelocity.y = (mouse.y - prevMouse.y) / velocitySmoothness;

    // Limiter la vélocité pour éviter les mouvements trop brusques
    const maxVelocity = 0.5;
    const velocityLength = Math.sqrt(mouseVelocity.x * mouseVelocity.x + mouseVelocity.y * mouseVelocity.y);
    if (velocityLength > maxVelocity) {
        mouseVelocity.x = (mouseVelocity.x / velocityLength) * maxVelocity;
        mouseVelocity.y = (mouseVelocity.y / velocityLength) * maxVelocity;
    }

    // Mettre à jour le temps actuel
    const currentTime = performance.now() * 0.001;

    // Mettre à jour les clics dans le shader
    if (plane) {
        const clicksData = [];
        let validClicksCount = 0;
        
        for (const click of clicks) {
            const timeSinceClick = currentTime - click.time;
            if (timeSinceClick < CLICK_DURATION) {
                clicksData.push(click.position.x, click.position.y, click.time);
                validClicksCount++;
            }
        }
        
        // Remplir le reste avec des valeurs par défaut
        while (clicksData.length < MAX_CLICKS * 3) {
            clicksData.push(0, 0, 0);
        }
        
        // Mettre à jour les uniforms du plan
        plane.material.uniforms.uTime.value = currentTime;
        plane.material.uniforms.uMouse.value = mouse;
        plane.material.uniforms.uMouseVelocity.value = mouseVelocity;
        plane.material.uniforms.uClicks.value = clicksData;
        plane.material.uniforms.uClicksCount.value = validClicksCount;
    }

    // Mettre à jour le temps et la position de la souris pour le texte
    if (textMesh && textMesh.material.uniforms) {
        textMesh.material.uniforms.uTime.value = currentTime;
        textMesh.material.uniforms.uMouse.value = mouse;
        textMesh.material.uniforms.uMouseVelocity.value = mouseVelocity;
    }

    // Mettre à jour les glaçons
    iceCubes.forEach(iceCube => {
        iceCube.material.uniforms.uTime.value = currentTime;
        iceCube.material.uniforms.uMouse.value = mouse;
        iceCube.material.uniforms.uMouseVelocity.value = mouseVelocity;
        
        // Calculer la distance entre la souris et le glaçon
        const cubePosition = new THREE.Vector2(iceCube.position.x, iceCube.position.y);
        const distanceToMouse = cubePosition.distanceTo(mouse);
        
        // Si la souris est suffisamment proche, appliquer une force de poussée UNIQUEMENT
        if (distanceToMouse < 0.5) {
            // Calculer la direction de poussée (de la souris vers le glaçon)
            const pushDirection = new THREE.Vector2()
                .subVectors(cubePosition, mouse)
                .normalize();
            
            // Force plus forte quand on est proche, s'atténue avec la distance
            const pushStrength = (0.5 - distanceToMouse) * 0.05;
            
            // Utiliser la vélocité de la souris UNIQUEMENT si elle va dans la même direction que la poussée
            // pour éviter l'effet de traction
            const dotProduct = mouseVelocity.x * pushDirection.x + mouseVelocity.y * pushDirection.y;
            
            // N'appliquer l'effet de vélocité que si elle pousse dans la même direction
            let velocityX = 0;
            let velocityY = 0;
            
            if (dotProduct > 0) {
                velocityX = mouseVelocity.x * 0.2;
                velocityY = mouseVelocity.y * 0.2;
            }
            
            // Appliquer la poussée
            iceCube.position.x += pushDirection.x * pushStrength + velocityX;
            iceCube.position.y += pushDirection.y * pushStrength + velocityY;
            
            // Ajouter une légère rotation en fonction de la direction de poussée
            iceCube.rotation.z += pushDirection.x * pushStrength * 0.5;
            iceCube.rotation.x += pushDirection.y * pushStrength * 0.5;
            
            // Option: Ajouter un petit rebond vers le haut quand on touche un glaçon
            iceCube.position.z += pushStrength * 2;
        }
        
        // Effet de retour à la position d'origine (gravité/flottaison)
        // Augmentons la valeur pour un retour plus rapide à la position d'origine
        iceCube.position.x += (iceCube.userData.originalX - iceCube.position.x) * 0.03;
        iceCube.position.y += (iceCube.userData.originalY - iceCube.position.y) * 0.03;
        iceCube.position.z += (iceCube.userData.originalZ - iceCube.position.z) * 0.03;
    });

    renderer.render(scene, camera);
}

animate();

// Fonction pour mettre à jour la taille du plan
function updatePlaneSize() {
    const aspect = window.innerWidth / window.innerHeight;
    const planeSize = Math.max(window.innerWidth, window.innerHeight) * 0.001; // Ajustement de la taille
    plane.scale.set(planeSize * aspect, planeSize, 1);
}

// Appeler la fonction initialement
updatePlaneSize();

// Gestionnaire de redimensionnement
window.addEventListener('resize', () => {
    // Mettre à jour la taille de la caméra
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Mettre à jour la taille du renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // Mettre à jour la taille du plan
    updatePlaneSize();
});