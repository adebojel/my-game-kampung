// =========================================================================
// GAME OPEN WORLD CIDADAP - MASTER ENGINE (FASE 1, 2, & 3 LENGKAP)
// =========================================================================

const container = document.getElementById('game-container');

// 1. Scene, Camera, & Renderer Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.010);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  2500
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// 2. Pencahayaan
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
sunLight.position.set(200, 300, 200);
sunLight.castShadow = true;
scene.add(sunLight);

// 3. Topografi Tanah & Jalan Raya
const groundGeo = new THREE.PlaneGeometry(4000, 4000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const mainRoadGeo = new THREE.PlaneGeometry(18, 2000);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat);
mainRoad.rotation.x = -Math.PI / 2;
mainRoad.position.set(0, 0.05, 0);
mainRoad.receiveShadow = true;
scene.add(mainRoad);

// 4. Grup Karakter Utama (Player & Model GLB Niko Bellic)
const playerGroup = new THREE.Group();
playerGroup.position.set(0, 0, 0);
scene.add(playerGroup);

const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
const placeholderBody = new THREE.Mesh(bodyGeo, bodyMat);
placeholderBody.position.y = 1.1;
placeholderBody.castShadow = true;
playerGroup.add(placeholderBody);

let moveForward = 0;
let moveTurn = 0;
let playerSpeed = 0.15;
let playerCash = 500000;
let wantedStars = 0;

// Load Model Niko Bellic
const loader = new THREE.GLTFLoader();
function loadPlayerModel() {
  const filePath = 'assets/models/nicoBellic_GTA_IV-v1.glb';
  
  loader.load(filePath, (gltf) => {
    const model = gltf.scene;
    model.scale.set(1.2, 1.2, 1.2);
    model.position.set(0, 0, 0);
    model.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    playerGroup.remove(placeholderBody);
    playerGroup.add(model);
    console.log('Berhasil memuat karakter Niko Bellic:', filePath);
  }, undefined, (error) => {
    console.warn('Gagal memuat model glb utama, mencoba alternatif...', error);
    loader.load('./assets/models/nicoBellic_GTA_IV-v1.glb', (gltf) => {
      const model = gltf.scene;
      model.scale.set(1.2, 1.2, 1.2);
      playerGroup.remove(placeholderBody);
      playerGroup.add(model);
    });
  });
}
loadPlayerModel();

// FASE 3: Sistem Kendaraan & Variabel Mobil
let isInVehicle = false;
let vehicleSpeed = 0;

const vehicleGroup = new THREE.Group();
vehicleGroup.position.set(12, 0, 0);
const carBodyGeo = new THREE.BoxGeometry(2.2, 1.2, 4.5);
const carBodyMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.4 });
const carMesh = new THREE.Mesh(carBodyGeo, carBodyMat);
carMesh.position.y = 0.8;
carMesh.castShadow = true;
vehicleGroup.add(carMesh);
scene.add(vehicleGroup);

// 5. Virtual Joystick Implementation
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

// 6. Kamera Orbit 360°
let cameraDistance = 9;
let cameraHeight = 3.0;
let cameraAngle = 0;
let isDragging = false;
let previousTouchX = 0;

window.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1 && e.touches[0].clientX > window.innerWidth / 2) {
    isDragging = true;
    previousTouchX = e.touches[0].clientX;
  }
});

window.addEventListener('touchmove', (e) => {
  if (isDragging && e.touches.length === 1) {
    const deltaX = e.touches[0].clientX - previousTouchX;
    cameraAngle -= deltaX * 0.008;
    previousTouchX = e.touches[0].clientX;
  }
});

window.addEventListener('touchend', () => {
  isDragging = false;
});

function updateCamera() {
  // Kamera mengikuti target yang sedang aktif (Player atau Kendaraan)
  const activeTarget = isInVehicle ? vehicleGroup : playerGroup;
  const targetX = activeTarget.position.x;
  const targetY = activeTarget.position.y + 1;
  const targetZ = activeTarget.position.z;

  const offsetX = Math.sin(cameraAngle) * (isInVehicle ? cameraDistance * 1.3 : cameraDistance);
  const offsetZ = Math.cos(cameraAngle) * (isInVehicle ? cameraDistance * 1.3 : cameraDistance);

  camera.position.set(
    targetX - offsetX,
    targetY + cameraHeight,
    targetZ - offsetZ
  );
  camera.lookAt(targetX, targetY, targetZ);
}

// 7. Tombol Aksi & Loncat UI (Integrasi Masuk/Keluar Mobil)
const btnAction = document.getElementById('btn-action');
const btnJump = document.getElementById('btn-jump');
const cashDisplay = document.getElementById('player-cash');
const starsDisplay = document.getElementById('wanted-stars');

if (btnAction) {
  btnAction.innerText = "🚗";
  btnAction.addEventListener('click', () => {
    const distanceToCar = playerGroup.position.distanceTo(vehicleGroup.position);
    if (!isInVehicle && distanceToCar < 7) {
      isInVehicle = true;
      playerGroup.visible = false;
      console.log('Masuk kendaraan.');
    } else if (isInVehicle) {
      isInVehicle = false;
      playerGroup.position.set(vehicleGroup.position.x + 3, vehicleGroup.position.y, vehicleGroup.position.z);
      playerGroup.visible = true;
      console.log('Keluar kendaraan.');
    }
  });
}

if (btnJump) {
  btnJump.addEventListener('click', () => {
    if (!isInVehicle) {
      playerGroup.position.y += 0.8;
      setTimeout(() => { playerGroup.position.y = 0; }, 250);
    }
  });
}

// FASE 2: Pembatas Area (Collision)
function checkPlayerBounds() {
  const maxBoundary = 1900;
  if (playerGroup.position.x > maxBoundary) playerGroup.position.x = maxBoundary;
  if (playerGroup.position.x < -maxBoundary) playerGroup.position.x = -maxBoundary;
  if (playerGroup.position.z > maxBoundary) playerGroup.position.z = maxBoundary;
  if (playerGroup.position.z < -maxBoundary) playerGroup.position.z = -maxBoundary;
}

// 8. Loop Animasi & Pergerakan (Karakter & Kendaraan)
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  if (moveForward !== 0 || moveTurn !== 0) {
    if (!isInVehicle) {
      playerGroup.rotation.y = cameraAngle + Math.atan2(moveTurn, moveForward);
      const moveX = Math.sin(playerGroup.rotation.y) * playerSpeed * Math.abs(moveForward);
      const moveZ = Math.cos(playerGroup.rotation.y) * playerSpeed * Math.abs(moveForward);
      
      playerGroup.position.x += moveX;
      playerGroup.position.z += moveZ;
      checkPlayerBounds();
    } else {
      vehicleGroup.rotation.y = cameraAngle + Math.atan2(moveTurn, moveForward);
      vehicleSpeed = playerSpeed * 2.8;
      
      const moveX = Math.sin(vehicleGroup.rotation.y) * vehicleSpeed * Math.abs(moveForward);
      const moveZ = Math.cos(vehicleGroup.rotation.y) * vehicleSpeed * Math.abs(moveForward);
      
      vehicleGroup.position.x += moveX;
      vehicleGroup.position.z += moveZ;
      playerGroup.position.copy(vehicleGroup.position);
    }
  }

  if (cashDisplay) cashDisplay.innerText = `Rp ${playerCash.toLocaleString()}`;
  if (starsDisplay) starsDisplay.innerText = `⭐ ${wantedStars}`;

  updateCamera();
  renderer.render(scene, camera);
}

animate();
