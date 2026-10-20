// =========================================================================
// GAME OPEN WORLD CIDADAP - FIX BUG POSISI TANAH, SKALA, & LANDSCAPE
// =========================================================================

const container = document.getElementById('game-container');

// Paksa orientasi landscape aman untuk Android & WebView
function forceLandscape() {
  if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(() => {});
  }
}
window.addEventListener('load', forceLandscape);
window.addEventListener('resize', forceLandscape);

// 1. Scene, Camera, & Renderer Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3500);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// 2. Pencahayaan (Perbaikan posisi agar bayangan tidak raksasa di atas kepala)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.0);
sunLight.position.set(400, 600, 400); // Posisi matahari dijauhkan agar bayangan proporsional
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// 3. Topografi Tanah (FIX: Pastikan posisi Y tepat di 0 dan tidak tenggelam)
const groundGeo = new THREE.PlaneGeometry(5000, 5000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0; // Pijakan dasar persis di angka 0
ground.receiveShadow = true;
scene.add(ground);

// Jalan Raya Utama
const mainRoadGeo = new THREE.PlaneGeometry(18, 3000);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat);
mainRoad.rotation.x = -Math.PI / 2;
mainRoad.position.set(0, 0.02, 0); // Sedikit di atas tanah agar tidak berkedip (z-fighting)
mainRoad.receiveShadow = true;
scene.add(mainRoad);

// 4. Grup Karakter Utama (Posisikan Y di atas tanah: 0.5)
const playerGroup = new THREE.Group();
playerGroup.position.set(0, 0.5, 0);
scene.add(playerGroup);

const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
const placeholderBody = new THREE.Mesh(bodyGeo, bodyMat);
placeholderBody.position.y = 0.6;
placeholderBody.castShadow = true;
playerGroup.add(placeholderBody);

let moveForward = 0;
let moveTurn = 0;
let playerSpeed = 0.15;
let playerCash = 500000;
let wantedStars = 0;

// 5. Sistem Kendaraan (FIX: Posisi Y disesuaikan agar roda pas di atas tanah)
let isInVehicle = false;
let vehicleSpeed = 0;
const vehicleGroup = new THREE.Group();
vehicleGroup.position.set(12, 0.5, 15); // Ketinggian Y disesuaikan
scene.add(vehicleGroup);

const carBodyGeo = new THREE.BoxGeometry(2.2, 1.2, 4.5);
const carBodyMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.4 });
const placeholderCar = new THREE.Mesh(carBodyGeo, carBodyMat);
placeholderCar.position.y = 0.6;
placeholderCar.castShadow = true;
vehicleGroup.add(placeholderCar);

// Rel & KRL Commuter Line
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
trainGroup.add(trainMesh);

// 6. AUTO-LOADER BERBASIS JSON (Dengan pembatasan skala agar tidak raksasa)
const loader = new THREE.GLTFLoader();

fetch('assets/models/models.json')
  .then(response => response.json())
  .then(fileList => {
    fileList.forEach(fileName => {
      const filePath = `assets/models/${fileName}`;
      const lowerName = fileName.toLowerCase();
      
      loader.load(filePath, (gltf) => {
        const model = gltf.scene;
        model.traverse((node) => {
          if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });

        // Karakter
        if (lowerName.includes('nico') || lowerName.includes('bellic') || lowerName.includes('player')) {
          model.scale.set(1.0, 1.0, 1.0); // Skala dinormalisasi
          playerGroup.remove(placeholderBody);
          playerGroup.add(model);
        }
        // Kendaraan (Mobil / Polisi)
        else if (lowerName.includes('car') || lowerName.includes('police') || lowerName.includes('gtr')) {
          model.scale.set(1.0, 1.0, 1.0); // Skala dinormalisasi agar pas
          vehicleGroup.remove(placeholderCar);
          vehicleGroup.add(model);
        }
      });
    });
  })
  .catch(() => {});

// 7. Kontrol Virtual Joystick
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

// Kamera Orbit 360°
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
window.addEventListener('touchend', () => { isDragging = false; });

function updateCamera() {
  const activeTarget = isInVehicle ? vehicleGroup : playerGroup;
  const targetX = activeTarget.position.x;
  const targetY = activeTarget.position.y + 0.5;
  const targetZ = activeTarget.position.z;

  const offsetX = Math.sin(cameraAngle) * cameraDistance;
  const offsetZ = Math.cos(cameraAngle) * cameraDistance;

  camera.position.set(targetX - offsetX, targetY + cameraHeight, targetZ - offsetZ);
  camera.lookAt(targetX, targetY, targetZ);
}

// 8. Tombol UI Aksi & Loncat
const btnAction = document.getElementById('btn-action');
const btnJump = document.getElementById('btn-jump');
const cashDisplay = document.getElementById('player-cash');
const starsDisplay = document.getElementById('wanted-stars');

if (btnAction) {
  btnAction.innerText = "🚗";
  btnAction.addEventListener('click', () => {
    const distanceToCar = playerGroup.position.distanceTo(vehicleGroup.position);
    if (!isInVehicle && distanceToCar < 8) {
      isInVehicle = true;
      playerGroup.visible = false;
    } else if (isInVehicle) {
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

// 9. Master Loop Animasi
function animate() {
  requestAnimationFrame(animate);

  if (moveForward !== 0 || moveTurn !== 0) {
    if (!isInVehicle) {
      playerGroup.rotation.y = cameraAngle + Math.atan2(moveTurn, moveForward);
      const moveX = Math.sin(playerGroup.rotation.y) * playerSpeed * Math.abs(moveForward);
      const moveZ = Math.cos(playerGroup.rotation.y) * playerSpeed * Math.abs(moveForward);
      playerGroup.position.x += moveX;
      playerGroup.position.z += moveZ;
    } else {
      vehicleGroup.rotation.y = cameraAngle + Math.atan2(moveTurn, moveForward);
      vehicleSpeed = playerSpeed * 3.5;
      const moveX = Math.sin(vehicleGroup.rotation.y) * vehicleSpeed * Math.abs(moveForward);
      const moveZ = Math.cos(vehicleGroup.rotation.y) * vehicleSpeed * Math.abs(moveForward);
      vehicleGroup.position.x += moveX;
      vehicleGroup.position.z += moveZ;
      playerGroup.position.copy(vehicleGroup.position);
    }
  }

  trainGroup.position.z += 1.0;
  if (trainGroup.position.z > 2000) trainGroup.position.z = -2000;

  if (cashDisplay) cashDisplay.innerText = `Rp ${playerCash.toLocaleString()}`;
  if (starsDisplay) starsDisplay.innerText = `⭐ ${wantedStars}`;

  updateCamera();
  renderer.render(scene, camera);
}

animate();
