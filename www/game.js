// =========================================================================
// CIDADAP OPEN WORLD - MASTER ENGINE FINAL FULLY OPTIMIZED & FIXED
// =========================================================================

const container = document.getElementById('game-container');

function forceLandscape() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}
window.addEventListener('load', forceLandscape);
window.addEventListener('resize', forceLandscape);

// --- 1. SIMULASI LOADING SCREEN & ASYNC SAFETY ---
function initLoadingSequence() {
  let progress = 0;
  const fill = document.getElementById('progress-fill');
  const tip = document.getElementById('loading-tip');
  const screen = document.getElementById('loading-screen');
  const slides = document.querySelectorAll('.loading-bg-slide');
  
  const tipsText = [
    "Memuat aset jalanan rute Cidadap - Cicurug...",
    "Menyiapkan topografi alam & pemandangan Gunung Salak...",
    "Menyiapkan tas inventaris & slot senjata...",
    "Mengaktifkan radar minimap & sistem navigasi GPS..."
  ];

  let currentSlide = 0;
  const slideInterval = setInterval(() => {
    if (slides.length > 0) {
      slides[currentSlide].classList.remove('active');
      currentSlide = (currentSlide + 1) % slides.length;
      slides[currentSlide].classList.add('active');
    }
  }, 2500);

  const progressInterval = setInterval(() => {
    progress += Math.floor(Math.random() * 10) + 5;
    if (progress >= 100) {
      progress = 100;
      clearInterval(progressInterval);
      clearInterval(slideInterval);
      
      setTimeout(() => {
        if (screen) {
          screen.style.opacity = '0';
          setTimeout(() => { screen.style.display = 'none'; }, 800);
        }
      }, 500);
    }
    if (fill) fill.style.width = progress + '%';
    let tipIdx = Math.floor((progress / 100) * (tipsText.length - 1));
    if (tip) tip.innerText = tipsText[tipIdx];
  }, 150);
}

window.addEventListener('DOMContentLoaded', () => {
  initLoadingSequence();
  initMinimap();
  initInventoryUI();
});

// 2. Scene, Camera, & Renderer Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// 3. Pencahayaan
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.0);
sunLight.position.set(400, 600, 400);
sunLight.castShadow = true;
scene.add(sunLight);

// 4. Topografi Tanah & Jalan Raya Utama Cidadap - Cicurug
const groundGeo = new THREE.PlaneGeometry(5000, 5000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const mainRoadGeo = new THREE.PlaneGeometry(18, 4000);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat);
mainRoad.rotation.x = -Math.PI / 2;
mainRoad.position.set(0, 0.02, 0);
mainRoad.receiveShadow = true;
scene.add(mainRoad);

// 5. Jalur Rel Kereta & KRL Commuter Line & Pesawat
const railGeo = new THREE.PlaneGeometry(4, 4000);
const railMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
const railway = new THREE.Mesh(railGeo, railMat);
railway.rotation.x = -Math.PI / 2;
railway.position.set(-35, 0.03, 0);
scene.add(railway);

const trainGroup = new THREE.Group();
trainGroup.position.set(-35, 1.0, -800);
scene.add(trainGroup);
const trainGeo = new THREE.BoxGeometry(3, 2.5, 20);
const trainMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
const trainMesh = new THREE.Mesh(trainGeo, trainMat);
trainMesh.castShadow = true;
trainGroup.add(trainMesh);

const planeGroup = new THREE.Group();
planeGroup.position.set(0, 300, -1000);
scene.add(planeGroup);
const planeGeo = new THREE.ConeGeometry(4, 15, 4);
planeGeo.rotateX(Math.PI / 2);
const planeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
const planeMesh = new THREE.Mesh(planeGeo, planeMat);
planeGroup.add(planeMesh);

// 6. Grup Karakter Utama & Sistem Animasi
const playerGroup = new THREE.Group();
playerGroup.position.set(0, 0.5, 0);
scene.add(playerGroup);

const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
const placeholderBody = new THREE.Mesh(bodyGeo, bodyMat);
placeholderBody.position.y = 0.6;
placeholderBody.castShadow = true;
playerGroup.add(placeholderBody);

let characterMixer = null;
let activeAction = null;
let moveForward = 0;
let moveTurn = 0;
let playerSpeed = 0.15;
let playerCash = 500000;
let wantedStars = 0;

// 7. Sistem Kendaraan (Terstruktur, Tidak Menumpuk)
let isInVehicle = false;
let currentVehicleType = 'car';
let vehicleSpeed = 0;
const vehicleGroup = new THREE.Group();
vehicleGroup.position.set(12, 0.5, 15);
scene.add(vehicleGroup);

const carBodyGeo = new THREE.BoxGeometry(2.2, 1.2, 4.5);
const carBodyMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.4 });
const placeholderCar = new THREE.Mesh(carBodyGeo, carBodyMat);
placeholderCar.position.y = 0.6;
placeholderCar.castShadow = true;
vehicleGroup.add(placeholderCar);

// Checkpoint Misi Rute Cidadap - Cicurug
const shopPosition = new THREE.Vector3(25, 0, 50);
const checkpointPosition = new THREE.Vector3(0, 0, -400);
const cpGeo = new THREE.CylinderGeometry(4, 4, 0.5, 16);
const cpMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6 });
const checkpointMesh = new THREE.Mesh(cpGeo, cpMat);
checkpointMesh.position.copy(checkpointPosition);
scene.add(checkpointMesh);

const clock = new THREE.Clock();

// 8. AUTO-LOADER JSON (Mencegah Path Error & Objek Stacking)
const loader = new THREE.GLTFLoader();
fetch('assets/models/models.json')
  .then(response => response.json())
  .then(fileList => {
    let bIndex = 0;
    let tIndex = 0;

    fileList.forEach(fileName => {
      const filePath = `assets/models/${fileName}`;
      const lowerName = fileName.toLowerCase();
      
      loader.load(filePath, (gltf) => {
        const model = gltf.scene;
        model.traverse((node) => {
          if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });

        if (lowerName.includes('adventurer') || lowerName.includes('nico') || lowerName.includes('bellic') || lowerName.includes('casual character')) {
          model.scale.set(1.0, 1.0, 1.0);
          playerGroup.remove(placeholderBody);
          playerGroup.add(model);

          if (gltf.animations && gltf.animations.length > 0) {
            characterMixer = new THREE.AnimationMixer(model);
            const walkClip = gltf.animations.find(c => c.name.toLowerCase().includes('walk') || c.name.toLowerCase().includes('run')) || gltf.animations[0];
            if (walkClip) activeAction = characterMixer.clipAction(walkClip);
          }
        } else if (lowerName.includes('car') || lowerName.includes('pickup') || lowerName.includes('police')) {
          model.scale.set(1.0, 1.0, 1.0);
          vehicleGroup.remove(placeholderCar);
          vehicleGroup.add(model);
          currentVehicleType = 'car';
        } else if (lowerName.includes('building') || lowerName.includes('house') || lowerName.includes('shop')) {
          model.scale.set(1.2, 1.2, 1.2);
          const side = (bIndex % 2 === 0) ? 1 : -1;
          model.position.set(side * 25, 0, -100 - (Math.floor(bIndex / 2) * 80));
          scene.add(model);
          bIndex++;
        } else if (lowerName.includes('tree') || lowerName.includes('pine')) {
          model.scale.set(1.0, 1.0, 1.0);
          const side = (tIndex % 2 === 0) ? 1 : -1;
          model.position.set(side * (38 + (tIndex % 3) * 8), 0, -50 - (Math.floor(tIndex / 2) * 45));
          scene.add(model);
          tIndex++;
        }
      }, undefined, () => {});
    });
  })
  .catch(() => {});

// 9. Kontrol Virtual Joystick Kiri
const joystickBase = document.getElementById('joystick-base');
const joystickStick = document.getElementById('joystick-stick');
let joystickTouchId = null;
let joystickCenter = { x: 0, y: 0 };
let maxJoystickRadius = 35;

if (joystickBase) {
  joystickBase.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    joystickTouchId = touch.identifier;
    const rect = joystickBase.getBoundingClientRect();
    joystickCenter.x = rect.left + rect.width / 2;
    joystickCenter.y = rect.top + rect.height / 2;
  }, { passive: false });

  joystickBase.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joystickTouchId) {
        let deltaX = touch.clientX - joystickCenter.x;
        let deltaY = touch.clientY - joystickCenter.y;
        let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (distance > maxJoystickRadius) {
          deltaX *= maxJoystickRadius / distance;
          deltaY *= maxJoystickRadius / distance;
        }
        joystickStick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
        moveTurn = -deltaX / maxJoystickRadius;
        moveForward = -deltaY / maxJoystickRadius;
      }
    }
  }, { passive: false });

  const resetJoystick = (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === joystickTouchId) {
        joystickTouchId = null;
        joystickStick.style.transform = `translate(0px, 0px)`;
        moveForward = 0;
        moveTurn = 0;
      }
    }
  };
  joystickBase.addEventListener('touchend', resetJoystick);
  joystickBase.addEventListener('touchcancel', resetJoystick);
}

// 10. Kamera Orbit 360°
let cameraDistance = 9;
let cameraHeight = 3.0;
let cameraAngleY = 0;
let cameraAngleX = 0;
let isDragging = false;
let previousTouchPos = { x: 0, y: 0 };

window.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1 && e.touches[0].clientX > window.innerWidth / 2) {
    isDragging = true;
    previousTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
});

window.addEventListener('touchmove', (e) => {
  if (isDragging && e.touches.length === 1) {
    const deltaX = e.touches[0].clientX - previousTouchPos.x;
    const deltaY = e.touches[0].clientY - previousTouchPos.y;
    cameraAngleY -= deltaX * 0.008;
    cameraAngleX -= deltaY * 0.008;
    cameraAngleX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraAngleX));
    previousTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
});
window.addEventListener('touchend', () => { isDragging = false; });

function updateCamera() {
  const activeTarget = isInVehicle ? vehicleGroup : playerGroup;
  const targetX = activeTarget.position.x;
  const targetY = activeTarget.position.y + 0.5;
  const targetZ = activeTarget.position.z;

  const offsetX = Math.sin(cameraAngleY) * Math.cos(cameraAngleX) * cameraDistance;
  const offsetY = Math.sin(cameraAngleX) * cameraDistance + cameraHeight;
  const offsetZ = Math.cos(cameraAngleY) * Math.cos(cameraAngleX) * cameraDistance;

  camera.position.set(targetX - offsetX, targetY + offsetY, targetZ - offsetZ);
  camera.lookAt(targetX, targetY, targetZ);
}

// 11. Live Minimap & Radar Sinkron Real-Time
let minimapCanvas, minimapCtx;
function initMinimap() {
  minimapCanvas = document.getElementById('minimap-canvas');
  if (!minimapCanvas) return;
  minimapCanvas.width = minimapCanvas.parentElement.clientWidth;
  minimapCanvas.height = minimapCanvas.parentElement.clientHeight;
  minimapCtx = minimapCanvas.getContext('2d');
}

function updateMinimap() {
  if (!minimapCtx) return;
  const w = minimapCanvas.width;
  const h = minimapCanvas.height;
  
  minimapCtx.clearRect(0, 0, w, h);
  minimapCtx.fillStyle = 'rgba(20, 20, 20, 0.85)';
  minimapCtx.beginPath();
  minimapCtx.arc(w/2, h/2, w/2, 0, Math.PI * 2);
  minimapCtx.fill();

  minimapCtx.fillStyle = '#444';
  minimapCtx.fillRect(w/2 - 6, 0, 12, h);

  minimapCtx.fillStyle = '#e74c3c';
  minimapCtx.beginPath();
  minimapCtx.arc(w/2, h/2, 5, 0, Math.PI * 2);
  minimapCtx.fill();

  const activeTarget = isInVehicle ? vehicleGroup : playerGroup;
  const dx = checkpointPosition.x - activeTarget.position.x;
  const dz = checkpointPosition.z - activeTarget.position.z;
  const scale = 0.15;
  const cpScreenX = w/2 + dx * scale;
  const cpScreenY = h/2 + dz * scale;

  if (cpScreenX >= 0 && cpScreenX <= w && cpScreenY >= 0 && cpScreenY <= h) {
    minimapCtx.fillStyle = '#2ecc71';
    minimapCtx.beginPath();
    minimapCtx.arc(cpScreenX, cpScreenY, 6, 0, Math.PI * 2);
    minimapCtx.fill();
  }
}

// 12. Sistem Inventory & Tas Barang
function initInventoryUI() {
  const btnInv = document.getElementById('btn-inventory');
  const modalInv = document.getElementById('inventory-modal');
  const closeInv = document.getElementById('close-inventory');

  if (btnInv && modalInv && closeInv) {
    btnInv.addEventListener('click', () => { modalInv.style.display = 'flex'; });
    closeInv.addEventListener('click', () => { modalInv.style.display = 'none'; });
  }
}

// 13. Tombol Aksi Kontekstual & Interaksi
const btnAction = document.getElementById('btn-action');
const btnJump = document.getElementById('btn-jump');
const cashDisplay = document.getElementById('player-cash');
const starsDisplay = document.getElementById('wanted-stars');

function updateContextButton() {
  const distanceToCar = playerGroup.position.distanceTo(vehicleGroup.position);
  if (isInVehicle) {
    btnAction.innerText = (currentVehicleType === 'motor') ? "WHEELIE" : "TURUN";
  } else {
    btnAction.innerText = (distanceToCar < 8) ? "NAIK" : "AKSI";
  }
}

if (btnAction) {
  btnAction.addEventListener('click', () => {
    const distanceToCar = playerGroup.position.distanceTo(vehicleGroup.position);
    if (!isInVehicle) {
      if (distanceToCar < 8) {
        isInVehicle = true;
        playerGroup.visible = false;
      }
    } else {
      isInVehicle = false;
      playerGroup.position.set(vehicleGroup.position.x + 3, vehicleGroup.position.y, vehicleGroup.position.z);
      playerGroup.visible = true;
    }
  });
}

if (btnJump) {
  btnJump.addEventListener('click', () => {
    if (!isInVehicle) {
      playerGroup.position.y += 0.8;
      setTimeout(() => { playerGroup.position.y = 0.5; }, 250);
    }
  });
}

// 14. Master Loop Animasi
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (characterMixer) characterMixer.update(delta);

  if (moveForward !== 0 || moveTurn !== 0) {
    if (!isInVehicle) {
      playerGroup.rotation.y = cameraAngleY + Math.atan2(moveTurn, moveForward);
      const moveX = Math.sin(playerGroup.rotation.y) * playerSpeed * Math.abs(moveForward);
      const moveZ = Math.cos(playerGroup.rotation.y) * playerSpeed * Math.abs(moveForward);
      
      playerGroup.position.x += moveX;
      playerGroup.position.z += moveZ;
      playerGroup.position.x = Math.max(-50, Math.min(50, playerGroup.position.x));

      if (activeAction && !activeAction.isRunning()) activeAction.play();
    } else {
      vehicleGroup.rotation.y = cameraAngleY + Math.atan2(moveTurn, moveForward);
      vehicleSpeed = playerSpeed * 3.5;
      const moveX = Math.sin(vehicleGroup.rotation.y) * vehicleSpeed * Math.abs(moveForward);
      const moveZ = Math.cos(vehicleGroup.rotation.y) * vehicleSpeed * Math.abs(moveForward);
      
      vehicleGroup.position.x += moveX;
      vehicleGroup.position.z += moveZ;
      vehicleGroup.position.x = Math.max(-50, Math.min(50, vehicleGroup.position.x));
      playerGroup.position.copy(vehicleGroup.position);
    }
  } else {
    if (activeAction && activeAction.isRunning()) activeAction.stop();
  }

  trainGroup.position.z += 1.2;
  if (trainGroup.position.z > 2000) trainGroup.position.z = -2000;

  planeGroup.position.z += 2.0;
  if (planeGroup.position.z > 2000) planeGroup.position.z = -2000;

  if (playerGroup.position.distanceTo(checkpointPosition) < 10) {
    checkpointMesh.position.set((Math.random() - 0.5) * 30, 0, playerGroup.position.z - 500);
    checkpointPosition.copy(checkpointMesh.position);
    playerCash += 100000;
  }

  if (cashDisplay) cashDisplay.innerText = `Rp ${playerCash.toLocaleString()}`;
  if (starsDisplay) starsDisplay.innerText = `⭐ ${wantedStars}`;

  updateContextButton();
  updateCamera();
  renderer.render(scene, camera);
  updateMinimap();
}

animate();
