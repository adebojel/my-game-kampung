// =========================================================================
// GAME OPEN WORLD CIDADAP - MASTER ENGINE (FINAL FULL FEATURES & AUTO-LOADER)
// =========================================================================

const container = document.getElementById('game-container');

// Paksa orientasi landscape otomatis
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('landscape').catch(() => {});
}

// 1. Scene, Camera, & Renderer Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.FogExp2(0x87ceeb, 0.008); // Kabut tipis khas pegunungan / vulkanik

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  3000
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// 2. Pencahayaan & Suasana Gunung Salak
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
sunLight.position.set(300, 400, 300);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// 3. Topografi Tanah, Sawah Terasering, & Rute Nyata (Cidadap - Cicurug)
const groundGeo = new THREE.PlaneGeometry(4000, 4000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Jalur Jalan Utama (Cidadap - Tenjolaya - Cipari - Beber - Cicurug)
const mainRoadGeo = new THREE.PlaneGeometry(16, 2500);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat);
mainRoad.rotation.x = -Math.PI / 2;
mainRoad.position.set(0, 0.05, 0);
mainRoad.receiveShadow = true;
scene.add(mainRoad);

// Jalur Pulang Lingkar Luar (Cisaat & Bangbayang)
const returnRoadGeo = new THREE.PlaneGeometry(14, 1200);
const returnRoad = new THREE.Mesh(returnRoadGeo, roadMat);
returnRoad.rotation.x = -Math.PI / 2;
returnRoad.rotation.z = Math.PI / 6;
returnRoad.position.set(100, 0.06, -200);
returnRoad.receiveShadow = true;
scene.add(returnRoad);

// Blok Sawah Terasering Tradisional & Pantulan Air Kaki Gunung Salak
const terraceGeo = new THREE.BoxGeometry(60, 0.5, 40);
const terraceMat = new THREE.MeshStandardMaterial({ color: 0x4da6ff, roughness: 0.2 });
for (let i = -2; i <= 2; i++) {
  if (i === 0) continue;
  const terrace = new THREE.Mesh(terraceGeo, terraceMat);
  terrace.position.set(i * 50, 0.2, -80);
  scene.add(terrace);
}

// 4. Grup Karakter Utama & Status RPG (Uang & Wanted Level)
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

// 5. Sistem Multi-Kendaraan & Transportasi Umum (KRL Commuter Line)
let isInVehicle = false;
let vehicleSpeed = 0;

const vehicleGroup = new THREE.Group();
vehicleGroup.position.set(12, 0, 15);
scene.add(vehicleGroup);

const carBodyGeo = new THREE.BoxGeometry(2.2, 1.2, 4.5);
const carBodyMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.4 });
const placeholderCar = new THREE.Mesh(carBodyGeo, carBodyMat);
placeholderCar.position.y = 0.8;
placeholderCar.castShadow = true;
vehicleGroup.add(placeholderCar);

// Rel & KRL Commuter Line Otomatis
const railGeo = new THREE.PlaneGeometry(4, 3000);
const railMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
const railway = new THREE.Mesh(railGeo, railMat);
railway.rotation.x = -Math.PI / 2;
railway.position.set(-30, 0.04, 0);
scene.add(railway);

const trainGroup = new THREE.Group();
trainGroup.position.set(-30, 0.8, -500);
scene.add(trainGroup);
const trainGeo = new THREE.BoxGeometry(3, 2.5, 18);
const trainMat = new THREE.MeshStandardMaterial({ color: 0xffcc00 });
const trainMesh = new THREE.Mesh(trainGeo, trainMat);
trainGroup.add(trainMesh);

// 6. Sistem AI NPC Warga Lokal (Living World)
const npcs = [];
const npcGeo = new THREE.BoxGeometry(0.7, 1.1, 0.4);
const npcMat = new THREE.MeshStandardMaterial({ color: 0xff6347 });

for (let i = 0; i < 15; i++) {
  const npc = new THREE.Mesh(npcGeo, npcMat);
  const posX = (Math.random() - 0.5) * 200;
  const posZ = (Math.random() - 0.5) * 1000;
  npc.position.set(posX, 0.55, posZ);
  npc.castShadow = true;
  scene.add(npc);
  
  npcs.push({
    mesh: npc,
    dir: Math.random() > 0.5 ? 1 : -1,
    speed: 0.03 + Math.random() * 0.03,
    limit: posZ + 80
  });
}

// 7. AUTO-LOADER DINAMIS PERMANEN BERBASIS JSON (Karakter, Kendaraan, & Peta)
const loader = new THREE.GLTFLoader();

// A. Load Model dari models.json
fetch('assets/models/models.json')
  .then(response => response.json())
  .then(fileList => {
    console.log('Daftar aset terdeteksi otomatis:', fileList);
    
    fileList.forEach(fileName => {
      const filePath = `assets/models/${fileName}`;
      
      // Deteksi Karakter (Nico Bellic)
      if (fileName.toLowerCase().includes('nico') || fileName.toLowerCase().includes('bellic')) {
        loader.load(filePath, (gltf) => {
          const model = gltf.scene;
          model.scale.set(1.2, 1.2, 1.2);
          model.traverse((node) => {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
          });
          playerGroup.remove(placeholderBody);
          playerGroup.add(model);
          console.log('Otomatis muat karakter:', fileName);
        });
      }
      
      // Deteksi Kendaraan (Police Car, GTR, dll)
      if (fileName.toLowerCase().includes('police') || fileName.toLowerCase().includes('car') || fileName.toLowerCase().includes('gtr')) {
        loader.load(filePath, (gltf) => {
          const carModel = gltf.scene;
          carModel.scale.set(1.5, 1.5, 1.5);
          carModel.traverse((node) => {
            if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
          });
          vehicleGroup.remove(placeholderCar);
          vehicleGroup.add(carModel);
          console.log('Otomatis muat kendaraan:', fileName);
        });
      }
    });
  })
  .catch(err => {
    console.warn('models.json belum terbaca, menggunakan placeholder bawaan.', err);
  });

// B. Load Tata Letak Peta & Bangunan dari map.json (Opsional)
fetch('assets/map.json')
  .then(response => response.json())
  .then(mapData => {
    mapData.forEach(item => {
      const modelPath = `assets/models/${item.model}`;
      loader.load(modelPath, (gltf) => {
        const obj = gltf.scene;
        obj.position.set(item.x, 0, item.z);
        if (item.scale) obj.scale.set(item.scale, item.scale, item.scale);
        obj.traverse((node) => {
          if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
        });
        scene.add(obj);
      });
    });
  })
  .catch(() => {});

// 8. Virtual Joystick Implementation
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

// 9. Kamera Orbit 360°
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updateCamera() {
  const activeTarget = isInVehicle ? vehicleGroup : playerGroup;
  const targetX = activeTarget.position.x;
  const targetY = activeTarget.position.y + 1;
  const targetZ = activeTarget.position.z;

  const offsetX = Math.sin(cameraAngle) * (isInVehicle ? cameraDistance * 1.4 : cameraDistance);
  const offsetZ = Math.cos(cameraAngle) * (isInVehicle ? cameraDistance * 1.4 : cameraDistance);

  camera.position.set(
    targetX - offsetX,
    targetY + cameraHeight,
    targetZ - offsetZ
  );
  camera.lookAt(targetX, targetY, targetZ);
}

// 10. Tombol Aksi & Loncat UI (Masuk/Keluar Kendaraan)
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
      setTimeout(() => { playerGroup.position.y = 0; }, 250);
    }
  });
}

// Pembatas Area (Collision Bounds)
function checkPlayerBounds() {
  const maxBoundary = 1900;
  if (playerGroup.position.x > maxBoundary) playerGroup.position.x = maxBoundary;
  if (playerGroup.position.x < -maxBoundary) playerGroup.position.x = -maxBoundary;
  if (playerGroup.position.z > maxBoundary) playerGroup.position.z = maxBoundary;
  if (playerGroup.position.z < -maxBoundary) playerGroup.position.z = -maxBoundary;
}

// 11. Master Loop Animasi (Pergerakan, NPC, Kereta, & Render)
function animate() {
  requestAnimationFrame(animate);

  // Pergerakan Karakter / Kendaraan
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
      vehicleSpeed = playerSpeed * 3.0;
      
      const moveX = Math.sin(vehicleGroup.rotation.y) * vehicleSpeed * Math.abs(moveForward);
      const moveZ = Math.cos(vehicleGroup.rotation.y) * vehicleSpeed * Math.abs(moveForward);
      
      vehicleGroup.position.x += moveX;
      vehicleGroup.position.z += moveZ;
      playerGroup.position.copy(vehicleGroup.position);
    }
  }

  // Animasi Rutinitas AI NPC Warga Lokal
  npcs.forEach(npcData => {
    npcData.mesh.position.z += npcData.dir * npcData.speed;
    if (Math.abs(npcData.mesh.position.z - npcData.limit) > 60) {
      npcData.dir *= -1;
    }
  });

  // Animasi Otomatis KRL Commuter Line di atas Rel
  trainGroup.position.z += 0.8;
  if (trainGroup.position.z > 1500) trainGroup.position.z = -1500;

  if (cashDisplay) cashDisplay.innerText = `Rp ${playerCash.toLocaleString()}`;
  if (starsDisplay) starsDisplay.innerText = `⭐ ${wantedStars}`;

  updateCamera();
  renderer.render(scene, camera);
}

animate();
