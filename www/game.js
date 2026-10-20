// =========================================================================
// GAME OPEN WORLD CIDADAP - MASTER ENGINE 100% GLB & JOYSTICK FIX
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

// Placeholder Kotak Sementara (akan disembunyikan jika .glb berhasil dimuat)
const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.4);
const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e90ff });
const placeholderBody = new THREE.Mesh(bodyGeo, bodyMat);
placeholderBody.position.y = 1.1;
placeholderBody.castShadow = true;
playerGroup.add(placeholderBody);

// Variabel Kontrol Gerak & Joystick
let moveForward = 0;
let moveTurn = 0;
let playerSpeed = 0.15;
let playerCash = 500000;
let wantedStars = 0;

// Load Model Niko Bellic (.glb) Langsung ke Karakter Utama
const loader = new THREE.GLTFLoader();
function loadPlayerModel() {
  fetch('assets/models/models.json')
    .then(response => response.json())
    .then(modelFiles => {
      if (modelFiles && modelFiles.length > 0) {
        // Mencari file nico_bellic atau mengambil file pertama
        let targetFile = modelFiles.find(f => f.includes('nico') || f.includes('Untitled')) || modelFiles[0];
        const filePath = 'assets/models/' + targetFile;
        
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
          // Hapus placeholder kotak, masukkan model glb Niko Bellic ke playerGroup
          playerGroup.remove(placeholderBody);
          playerGroup.add(model);
          console.log('Berhasil memuat karakter Niko Bellic:', filePath);
        }, undefined, (error) => {
          console.warn('Gagal memuat model glb karakter, tetap pakai kotak placeholder.');
        });
      }
    })
    .catch(error => {
      console.warn('Gagal membaca models.json:', error);
    });
}
loadPlayerModel();

// 5. Virtual Joystick Implementation (Kontrol Sentuh Sisi Kiri)
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

        // Normalisasi arah gerak pemain
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

// 6. Kamera Orbit 360° (Sentuhan Layar Sisi Kanan)
let cameraDistance = 8;
let cameraHeight = 2.5;
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
  const targetX = playerGroup.position.x;
  const targetY = playerGroup.position.y + 1;
  const targetZ = playerGroup.position.z;

  const offsetX = Math.sin(cameraAngle) * cameraDistance;
  const offsetZ = Math.cos(cameraAngle) * cameraDistance;

  camera.position.set(
    targetX - offsetX,
    targetY + cameraHeight,
    targetZ - offsetZ
  );
  camera.lookAt(targetX, targetY, targetZ);
}

// 7. Tombol Aksi & Loncat UI
const btnAction = document.getElementById('btn-action');
const btnJump = document.getElementById('btn-jump');
const cashDisplay = document.getElementById('player-cash');
const starsDisplay = document.getElementById('wanted-stars');

if (btnJump) {
  btnJump.addEventListener('click', () => {
    // Efek Loncat Sederhana
    playerGroup.position.y += 0.8;
    setTimeout(() => { playerGroup.position.y = 0; }, 250);
  });
}

// 8. Loop Animasi & Pergerakan Karakter Berdasarkan Joystick
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  if (moveForward !== 0 || moveTurn !== 0) {
    // Putar arah hadap karakter sesuai arah joystick
    playerGroup.rotation.y = cameraAngle + Math.atan2(moveTurn, moveForward);
    
    // Gerakkan karakter maju/mundur sesuai arah hadap
    const moveX = Math.sin(playerGroup.rotation.y) * playerSpeed * Math.abs(moveForward);
    const moveZ = Math.cos(playerGroup.rotation.y) * playerSpeed * Math.abs(moveForward);
    
    playerGroup.position.x += moveX;
    playerGroup.position.z += moveZ;
  }

  if (cashDisplay) cashDisplay.innerText = `Rp ${playerCash.toLocaleString()}`;
  if (starsDisplay) starsDisplay.innerText = `⭐ ${wantedStars}`;

  updateCamera();
  renderer.render(scene, camera);
}

animate();
