// =========================================================================
// GAME OPEN WORLD CIDADAP - MASTER ENGINE 100% GLB & ASSET INTEGRATION
// Meliputi: Topografi Gunung Salak, Rute Nyata Cidadap-Cicurug, Multi-Kendaraan,
// AI Warga (NPC), Minimap Aktif, Sistem Ekonomi, Polisi, & Kontrol Sentuh Aman.
// =========================================================================

const container = document.getElementById('game-container');

// 1. Scene, Camera, & Renderer Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Langit cerah pedesaan
scene.fog = new THREE.FogExp2(0x87ceeb, 0.010); // Kabut vulkanik/pegunungan

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

// 2. Pencahayaan (Lighting & Atmosphere)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.2);
sunLight.position.set(200, 300, 200);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
scene.add(sunLight);

// 3. Topografi Gunung Salak & Rute Nyata (Cidadap - Cicurug & Jalur Pulang Cisaat/Bangbayang)
const groundGeo = new THREE.PlaneGeometry(4000, 4000);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e8b57, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Jalur Utama (Cidadap - Tenjolaya - Cipari - Beber - Cigadog - Sadamukti - Cimelati - Cicurug)
const mainRoadGeo = new THREE.PlaneGeometry(18, 2000);
const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7 });
const mainRoad = new THREE.Mesh(mainRoadGeo, roadMat);
mainRoad.rotation.x = -Math.PI / 2;
mainRoad.position.set(0, 0.05, 0);
mainRoad.receiveShadow = true;
scene.add(mainRoad);

// Jalur Pulang Lingkar Luar (Bangbayang & Cisaat)
const returnRoadGeo = new THREE.PlaneGeometry(14, 1400);
const returnRoad = new THREE.Mesh(returnRoadGeo, roadMat);
returnRoad.rotation.x = -Math.PI / 2;
returnRoad.rotation.y = Math.PI / 4;
returnRoad.position.set(-250, 0.06, 400);
returnRoad.receiveShadow = true;
scene.add(returnRoad);

// Topografi Tebing & Bukit Sawah Terasering Kaki Gunung Salak
const cliffMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.9 });
for (let i = -3; i <= 3; i++) {
  if (i === 0) continue;
  const cliffGeo = new THREE.BoxGeometry(40, 30, 400);
  const cliff = new THREE.Mesh(cliffGeo, cliffMat);
  cliff.position.set(i * 35, 15, i * 300);
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  scene.add(cliff);
}

// 4. Karakter Utama (Player Kasual Masa Kini) & NPC Warga Lokal
const playerGroup = new THREE.Group();

const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 1.1;
body.castShadow = true;
playerGroup.add(body);

const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
const headMat = new THREE.MeshStandardMaterial({ color: 0xffdbac });
const head = new THREE.Mesh(headGeo, headMat);
head.position.y = 1.9;
head.castShadow = true;
playerGroup.add(head);

playerGroup.position.set(0, 0, 0);
scene.add(playerGroup);

// Sistem NPC Warga Pedesaan, Petani, & Polisi Patroli
const npcs = [];
const npcMat = new THREE.MeshStandardMaterial({ color: 0xff6347 });
const policeMat = new THREE.MeshStandardMaterial({ color: 0x00008b });

for (let i = 0; i < 25; i++) {
  const isPolice = i > 20;
  const npcGeo = new THREE.BoxGeometry(0.7, 1.7, 0.4);
  const npc = new THREE.Mesh(npcGeo, isPolice ? policeMat : npcMat);
  const posX = (Math.random() - 0.5) * 140;
  const posZ = (Math.random() - 0.5) * 1500;
  npc.position.set(posX, 0.85, posZ);
  npc.castShadow = true;
  scene.add(npc);
  npcs.push({ mesh: npc, speed: 0.04, direction: 1, isPolice: isPolice });
}

// 5. Manajemen Multi-Kendaraan & Pembebanan Otomatis via models.json
let currentVehicleType = 'foot';
let playerCash = 500000;
let wantedStars = 0;

let worldVehicle = null;
const loader = new THREE.GLTFLoader();

// Fungsi Otomatis Membaca Model dari models.json (Cukup diatur sekali ini saja untuk selamanya)
function loadDynamicVehicle() {
  fetch('assets/models/models.json')
    .then(response => response.json())
    .then(modelFiles => {
      if (modelFiles && modelFiles.length > 0) {
        // Otomatis mengambil model pertama dari daftar models.json
        const targetModel = 'assets/models/' + modelFiles[0];
        loadModelFile(targetModel);
      } else {
        createFallbackVehicle();
      }
    })
    .catch(error => {
      console.warn('Gagal membaca models.json, menggunakan fallback:', error);
      createFallbackVehicle();
    });
}

function loadModelFile(filePath) {
  loader.load(filePath, (gltf) => {
    worldVehicle = gltf.scene;
    worldVehicle.scale.set(1.5, 1.5, 1.5);
    worldVehicle.position.set(12, 0, 30);
    worldVehicle.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    scene.add(worldVehicle);
    console.log('Berhasil memuat model:', filePath);
  }, undefined, (error) => {
    console.warn('Gagal memuat file .glb, beralih ke fallback.');
    createFallbackVehicle();
  });
}

function createFallbackVehicle() {
  const carGeo = new THREE.BoxGeometry(2.2, 1.3, 4.5);
  const carMat = new THREE.MeshStandardMaterial({ color: 0xdc143c, roughness: 0.3 });
  worldVehicle = new THREE.Mesh(carGeo, carMat);
  worldVehicle.position.set(12, 0.65, 30);
  scene.add(worldVehicle);
}

// Jalankan pemuatan model otomatis
loadDynamicVehicle();

// Objek Helikopter Khusus
const heliGeo = new THREE.ConeGeometry(2, 4, 8);
const heliMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
const worldHeli = new THREE.Mesh(heliGeo, heliMat);
worldHeli.position.set(-20, 2, -100);
scene.add(worldHeli);

// 6. Sistem Kamera Orbit 360° & Sentuhan Layar
let cameraDistance = 9;
let cameraHeight = 3.2;
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
  const targetX = currentVehicleType === 'foot' ? playerGroup.position.x : (worldVehicle ? worldVehicle.position.x : 0);
  const targetY = (currentVehicleType === 'foot' ? playerGroup.position.y : (worldVehicle ? worldVehicle.position.y : 0)) + 1;
  const targetZ = currentVehicleType === 'foot' ? playerGroup.position.z : (worldVehicle ? worldVehicle.position.z : 0);

  const offsetX = Math.sin(cameraAngle) * cameraDistance;
  const offsetZ = Math.cos(cameraAngle) * cameraDistance;

  camera.position.set(
    targetX - offsetX,
    targetY + cameraHeight,
    targetZ - offsetZ
  );
  camera.lookAt(targetX, targetY, targetZ);
}

// 7. Kontrol Dinamis UI Tombol & Interaksi
const btnAction = document.getElementById('btn-action');
const btnJump = document.getElementById('btn-jump');
const minimapPointer = document.getElementById('minimap-pointer');
const cashDisplay = document.getElementById('player-cash');
const starsDisplay = document.getElementById('wanted-stars');
const missionDisplay = document.getElementById('mission-text');

function updateDynamicUI() {
  if (currentVehicleType === 'foot') {
    btnAction.innerText = 'Naik';
    btnJump.innerText = 'Loncat';
  } else if (currentVehicleType === 'car' || currentVehicleType === 'motor') {
    btnAction.innerText = 'Gas';
    btnJump.innerText = 'Rem';
  } else if (currentVehicleType === 'heli' || currentVehicleType === 'jetpack') {
    btnAction.innerText = 'Naik';
    btnJump.innerText = 'Turun';
  } else {
    btnAction.innerText = 'Tembak';
    btnJump.innerText = 'Mundur';
  }
  if (cashDisplay) cashDisplay.innerText = `Rp ${playerCash.toLocaleString()}`;
  if (starsDisplay) starsDisplay.innerText = `⭐ ${wantedStars}`;
}
updateDynamicUI();

if (btnAction) {
  btnAction.addEventListener('click', () => {
    if (!worldVehicle) return;
    const distanceToCar = playerGroup.position.distanceTo(worldVehicle.position);
    const distanceToHeli = playerGroup.position.distanceTo(worldHeli.position);

    if (currentVehicleType === 'foot' && distanceToCar < 6) {
      currentVehicleType = 'car';
      playerGroup.visible = false;
      if (missionDisplay) missionDisplay.innerText = 'Misi: Berkendara menyusuri Cipari - Beber';
      updateDynamicUI();
    } else if (currentVehicleType === 'foot' && distanceToHeli < 6) {
      currentVehicleType = 'heli';
      playerGroup.visible = false;
      if (missionDisplay) missionDisplay.innerText = 'Misi: Terbang bebas melintasi Puncak Gunung Salak';
      updateDynamicUI();
    } else if (currentVehicleType !== 'foot') {
      currentVehicleType = 'foot';
      playerGroup.position.copy(worldVehicle.position).add(new THREE.Vector3(3, 0, 0));
      playerGroup.visible = true;
      if (missionDisplay) missionDisplay.innerText = 'Misi: Jelajahi Rute Cidadap - Cicurug';
      updateDynamicUI();
    }
  });
}

if (btnJump) {
  btnJump.addEventListener('click', () => {
    if (currentVehicleType === 'foot') {
      playerGroup.position.y += 1.2;
      setTimeout(() => { playerGroup.position.y = 0; }, 300);
    } else if (currentVehicleType === 'heli') {
      worldHeli.position.y += 3;
    }
  });
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 8. Loop Animasi & Game Engine Tick
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (currentVehicleType === 'foot') {
    playerGroup.position.z -= 0.12;
    if (playerGroup.position.z < -900) playerGroup.position.z = 900;
  } else if (currentVehicleType === 'car' && worldVehicle) {
    worldVehicle.position.z -= 0.35;
    playerGroup.position.copy(worldVehicle.position);
    if (worldVehicle.position.z < -900) worldVehicle.position.z = 900;
  } else if (currentVehicleType === 'heli') {
    worldHeli.position.z -= 0.4;
    playerGroup.position.copy(worldHeli.position);
    if (worldHeli.position.z < -900) worldHeli.position.z = 900;
  }

  npcs.forEach(npc => {
    npc.mesh.position.z += npc.speed * npc.direction;
    const activeZ = currentVehicleType === 'foot' ? playerGroup.position.z : (worldVehicle ? worldVehicle.position.z : 0);
    if (Math.abs(npc.mesh.position.z - activeZ) > 200) {
      npc.direction *= -1;
    }
  });

  if (minimapPointer) {
    minimapPointer.style.transform = `translate(-50%, -50%) rotate(${cameraAngle * (180 / Math.PI)}deg)`;
  }

  updateCamera();
  renderer.render(scene, camera);
}

animate();
