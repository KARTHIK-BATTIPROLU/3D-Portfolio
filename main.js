import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import gsap from 'gsap';

// Hide loading screen
setTimeout(() => {
  const loading = document.getElementById('loading');
  if (loading) loading.classList.add('hidden');
}, 800);

// ==================== SCENE SETUP ====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e27);
scene.fog = new THREE.FogExp2(0x0a0e27, 0.015);

// ==================== CAMERA ====================
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);
camera.position.set(0, 8, 15);

// ==================== RENDERER ====================
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

document.getElementById('canvas-container').appendChild(renderer.domElement);

// ==================== POST-PROCESSING ====================
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.3, 0.4, 0.9
);
composer.addPass(bloomPass);

// ==================== LIGHTING ====================
const ambientLight = new THREE.AmbientLight(0x6b7c9e, 0.4);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
mainLight.position.set(15, 25, 15);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.left = -40;
mainLight.shadow.camera.right = 40;
mainLight.shadow.camera.top = 40;
mainLight.shadow.camera.bottom = -40;
scene.add(mainLight);

const fillLight = new THREE.DirectionalLight(0x667eea, 0.6);
fillLight.position.set(-10, 15, -10);
scene.add(fillLight);

// Accent point lights
const accentLight1 = new THREE.PointLight(0x00d4ff, 2, 25);
accentLight1.position.set(8, 3, -15);
scene.add(accentLight1);

const accentLight2 = new THREE.PointLight(0xff006e, 2, 25);
accentLight2.position.set(-8, 3, -35);
scene.add(accentLight2);

// ==================== GROUND ====================
const groundGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
const groundMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x0f1419,
  roughness: 0.95,
  metalness: 0.05
});

const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Add subtle grid pattern
const gridHelper = new THREE.GridHelper(200, 100, 0x1a2332, 0x0f1419);
gridHelper.position.y = 0.01;
scene.add(gridHelper);

// ==================== ROAD PATH ====================
const roadPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 5),
  new THREE.Vector3(6, 0, -10),
  new THREE.Vector3(-4, 0, -25),
  new THREE.Vector3(5, 0, -45),
  new THREE.Vector3(-3, 0, -65),
  new THREE.Vector3(4, 0, -85),
  new THREE.Vector3(0, 0, -105)
]);

// Create flat road surface
const roadPoints = roadPath.getPoints(200);
const roadShape = new THREE.Shape();

// Road width
const roadWidth = 6;

// Create road mesh using extrusion along path
const roadSegments = [];
for (let i = 0; i < roadPoints.length - 1; i++) {
  const point1 = roadPoints[i];
  const point2 = roadPoints[i + 1];
  
  const direction = new THREE.Vector3().subVectors(point2, point1).normalize();
  const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
  
  const roadGeometry = new THREE.PlaneGeometry(
    roadWidth,
    point1.distanceTo(point2)
  );
  
  const roadMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a2332,
    roughness: 0.8,
    metalness: 0.2
  });
  
  const roadSegment = new THREE.Mesh(roadGeometry, roadMaterial);
  
  const midPoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
  roadSegment.position.copy(midPoint);
  roadSegment.position.y = 0.02;
  
  const angle = Math.atan2(direction.x, direction.z);
  roadSegment.rotation.x = -Math.PI / 2;
  roadSegment.rotation.z = angle;
  
  roadSegment.receiveShadow = true;
  scene.add(roadSegment);
  roadSegments.push(roadSegment);
}

// Add road lane markings
for (let i = 0; i < roadPoints.length; i += 8) {
  const point = roadPoints[i];
  const lineGeometry = new THREE.BoxGeometry(0.2, 0.05, 2);
  const lineMaterial = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 0.5
  });
  const line = new THREE.Mesh(lineGeometry, lineMaterial);
  line.position.set(point.x, 0.05, point.z);
  scene.add(line);
}

// ==================== ENVIRONMENT ====================
function createModernStructure(x, z, height) {
  const group = new THREE.Group();
  
  const geometry = new THREE.BoxGeometry(1.5, height, 1.5);
  const material = new THREE.MeshStandardMaterial({
    color: 0x1a2332,
    roughness: 0.3,
    metalness: 0.7,
    emissive: 0x0a0e27,
    emissiveIntensity: 0.1
  });
  
  const structure = new THREE.Mesh(geometry, material);
  structure.position.y = height / 2;
  structure.castShadow = true;
  group.add(structure);
  
  // Add glowing top
  const topGeometry = new THREE.BoxGeometry(1.6, 0.3, 1.6);
  const topMaterial = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x00d4ff,
    emissiveIntensity: 1
  });
  const top = new THREE.Mesh(topGeometry, topMaterial);
  top.position.y = height;
  group.add(top);
  
  group.position.set(x, 0, z);
  return group;
}

// Place structures along the path
for (let i = 0; i < 25; i++) {
  const t = i / 25;
  const point = roadPath.getPoint(t);
  const side = Math.random() > 0.5 ? 1 : -1;
  const offset = (10 + Math.random() * 8) * side;
  const height = 3 + Math.random() * 8;
  const structure = createModernStructure(point.x + offset, point.z, height);
  scene.add(structure);
}

// Add floating particles
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 150;
const positions = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount * 3; i += 3) {
  positions[i] = (Math.random() - 0.5) * 80;
  positions[i + 1] = Math.random() * 15;
  positions[i + 2] = (Math.random() - 0.5) * 120 - 40;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particlesMaterial = new THREE.PointsMaterial({
  color: 0x00d4ff,
  size: 0.1,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending
});
const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

// ==================== CHARACTER (SMALLER & BETTER) ====================
const character = new THREE.Group();

// Body - compact
const bodyGeometry = new THREE.CapsuleGeometry(0.25, 0.7, 12, 24);
const bodyMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x667eea,
  roughness: 0.3,
  metalness: 0.7,
  emissive: 0x667eea,
  emissiveIntensity: 0.3
});
const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
body.position.y = 1.1;
body.castShadow = true;
character.add(body);

// Head - smaller
const headGeometry = new THREE.SphereGeometry(0.22, 24, 24);
const headMaterial = new THREE.MeshStandardMaterial({ 
  color: 0xffd1a3,
  roughness: 0.5,
  metalness: 0.1
});
const head = new THREE.Mesh(headGeometry, headMaterial);
head.position.y = 1.8;
head.castShadow = true;
character.add(head);

// Visor - glowing eyes
const visorGeometry = new THREE.BoxGeometry(0.3, 0.06, 0.1);
const visorMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x00ffff,
  emissive: 0x00ffff,
  emissiveIntensity: 2
});
const visor = new THREE.Mesh(visorGeometry, visorMaterial);
visor.position.set(0, 1.82, 0.18);
character.add(visor);

// Arms - thinner
const armGeometry = new THREE.CapsuleGeometry(0.08, 0.5, 6, 12);
const armMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x667eea,
  roughness: 0.3,
  metalness: 0.7
});

const leftArm = new THREE.Mesh(armGeometry, armMaterial);
leftArm.position.set(-0.35, 1.1, 0);
leftArm.castShadow = true;
character.add(leftArm);

const rightArm = new THREE.Mesh(armGeometry, armMaterial);
rightArm.position.set(0.35, 1.1, 0);
rightArm.castShadow = true;
character.add(rightArm);

// Legs - proportional
const legGeometry = new THREE.CapsuleGeometry(0.1, 0.6, 6, 12);
const legMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x2d3748,
  roughness: 0.4,
  metalness: 0.6
});

const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
leftLeg.position.set(-0.15, 0.4, 0);
leftLeg.castShadow = true;
character.add(leftLeg);

const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
rightLeg.position.set(0.15, 0.4, 0);
rightLeg.castShadow = true;
character.add(rightLeg);

scene.add(character);

// ==================== CHECKPOINT MARKERS ====================
const markers = [];
const checkpoints = [
  { t: 0, label: 'INTRO', color: 0x00d4ff },
  { t: 0.25, label: 'SKILLS', color: 0x667eea },
  { t: 0.5, label: 'EXPERIENCE', color: 0xff006e },
  { t: 0.75, label: 'EDUCATION', color: 0xffd60a },
  { t: 0.95, label: 'CONTACT', color: 0x06ffa5 }
];

checkpoints.forEach((checkpoint) => {
  const markerGroup = new THREE.Group();
  
  // Outer ring
  const ringGeometry = new THREE.TorusGeometry(0.6, 0.06, 16, 32);
  const ringMaterial = new THREE.MeshStandardMaterial({ 
    color: checkpoint.color,
    emissive: checkpoint.color,
    emissiveIntensity: 1,
    metalness: 1,
    roughness: 0
  });
  const ring = new THREE.Mesh(ringGeometry, ringMaterial);
  ring.rotation.x = Math.PI / 2;
  markerGroup.add(ring);
  
  // Inner core
  const coreGeometry = new THREE.SphereGeometry(0.3, 24, 24);
  const coreMaterial = new THREE.MeshStandardMaterial({ 
    color: checkpoint.color,
    emissive: checkpoint.color,
    emissiveIntensity: 1.5
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  markerGroup.add(core);
  
  const point = roadPath.getPoint(checkpoint.t);
  markerGroup.position.set(point.x + 5, 2.5, point.z);
  
  scene.add(markerGroup);
  markers.push({ group: markerGroup, ring, core, baseY: 2.5 });
});

// ==================== SCROLL LOGIC ====================
let scrollProgress = 0;
let targetScrollProgress = 0;
const totalSections = 5;
const contentSections = document.querySelectorAll('.content-section');

function updateScene() {
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  targetScrollProgress = Math.max(0, Math.min(1, window.scrollY / maxScroll));
  
  scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;
  
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = `${scrollProgress * 100}%`;
  }
  
  // Move character
  const point = roadPath.getPoint(scrollProgress);
  const tangent = roadPath.getTangent(scrollProgress);
  
  character.position.copy(point);
  character.position.y = 0;
  
  const targetAngle = Math.atan2(tangent.x, tangent.z);
  character.rotation.y += (targetAngle - character.rotation.y) * 0.15;
  
  // Walking animation
  const walkSpeed = scrollProgress * 80;
  const walkCycle = Math.sin(walkSpeed) * 0.3;
  
  gsap.to(leftLeg.rotation, { x: walkCycle, duration: 0.1 });
  gsap.to(rightLeg.rotation, { x: -walkCycle, duration: 0.1 });
  gsap.to(leftArm.rotation, { x: -walkCycle * 0.4, duration: 0.1 });
  gsap.to(rightArm.rotation, { x: walkCycle * 0.4, duration: 0.1 });
  
  // Camera follow - better angle
  const cameraDistance = 15;
  const cameraHeight = 8;
  const cameraOffset = new THREE.Vector3(
    -tangent.x * cameraDistance,
    cameraHeight,
    -tangent.z * cameraDistance
  );
  
  const targetCameraPos = new THREE.Vector3(
    character.position.x + cameraOffset.x,
    character.position.y + cameraOffset.y,
    character.position.z + cameraOffset.z
  );
  
  camera.position.lerp(targetCameraPos, 0.08);
  
  const lookAtPoint = new THREE.Vector3(
    character.position.x,
    character.position.y + 1,
    character.position.z - 5
  );
  camera.lookAt(lookAtPoint);
  
  // Content sections
  const currentSection = Math.floor(scrollProgress * totalSections);
  contentSections.forEach((section, index) => {
    if (index === currentSection) {
      section.classList.add('active');
    } else {
      section.classList.remove('active');
    }
  });
}

// ==================== EVENT LISTENERS ====================
window.addEventListener('scroll', updateScene);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// ==================== ANIMATION LOOP ====================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  
  const time = clock.getElapsedTime();
  
  // Animate markers
  markers.forEach((marker, index) => {
    const offset = index * 0.7;
    marker.group.position.y = marker.baseY + Math.sin(time * 1.5 + offset) * 0.4;
    marker.ring.rotation.z = time * 0.8;
    marker.core.rotation.y = time * 1.2;
  });
  
  // Animate particles
  particles.rotation.y = time * 0.03;
  
  // Animate accent lights
  accentLight1.intensity = 2 + Math.sin(time * 1.5) * 0.5;
  accentLight2.intensity = 2 + Math.cos(time * 1.5) * 0.5;
  
  composer.render();
}

animate();
updateScene();

document.body.style.height = `${totalSections * 100}vh`;
