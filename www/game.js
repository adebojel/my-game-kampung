// --- 1. INISISALISASI UTAMA THREE.JS ---
const container = document.getElementById('game-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Warna langit cerah khas pegunungan

// Kamera sudut pandang orang ketiga / belakang objek
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, -10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimal untuk performa HP
container.appendChild(renderer.domElement);

// --- 2. PENCAHAYAAN ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(15, 30, 15);
scene.add(directionalLight);

// --- 3. LINGKUNGAN (JALAN & OBJEK SEMENTARA) ---
// Jalan Raya Utama
const roadGeometry = new THREE.PlaneGeometry(12, 300);
const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
const road = new THREE.Mesh(roadGeometry, roadMaterial);
road.rotation.x = -Math.PI / 2;
road.position.z = 150;
scene.add(road);

// Objek Representasi Kendaraan / Karakter (Kotak 3D)
const playerGeometry = new THREE.BoxGeometry(1.5, 1, 3);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff3333 }); // Warna merah
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 0.5, 5);
scene.add(player);

// --- 4. VARIABEL KONTROL & GERAKAN ---
let moveForward = false;
let moveBackward = false;
let turnLeft = false;
let turnRight = false;

let playerSpeed = 0;
const maxSpeed = 0.5;
const acceleration = 0.01;
const deceleration = 0.015;
let playerAngle = 0;

// --- 5. PENGHUBUNG KONTROL SENTUH LAYAR (UI MOBILE) ---
// Joystick Kiri
const stick = document.getElementById('joystick-stick');
const base = document.getElementById('joystick-base');
let isTouching = false;
let centerX, centerY;

base.addEventListener('touchstart', (e) => {
    isTouching = true;
    const rect = base.getBoundingClientRect();
    centerX = rect.left + rect.width / 2;
    centerY = rect.top + rect.height / 2;
});

window.addEventListener('touchmove', (e) => {
    if (!isTouching) return;
    const touch = e.touches[0];
    let dx = touch.clientX - centerX;
    let dy = touch.clientY - centerY;
    
    const distance = Math.min(35, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);
    
    let x = Math.cos(angle) * distance;
    let y = Math.sin(angle) * distance;
    
    stick.style.transform = `translate(${x}px, ${y}px)`;

    // Logika arah dari joystick
    turnLeft = dx < -10;
    turnRight = dx > 10;
    moveBackward = dy > 10;
});

window.addEventListener('touchend', () => {
    if (isTouching) {
        isTouching = false;
        stick.style.transform = `translate(0px, 0px)`;
        turnLeft = false;
        turnRight = false;
        moveBackward = false;
    }
});

// Tombol Gas & Rem di Kanan
const btnGas = document.getElementById('btn-gas');
const btnBrake = document.getElementById('btn-brake');

btnGas.addEventListener('touchstart', () => { moveForward = true; });
btnGas.addEventListener('touchend', () => { moveForward = false; });

btnBrake.addEventListener('touchstart', () => { moveBackward = true; });
btnBrake.addEventListener('touchend', () => { moveBackward = false; });

// --- 6. LOOP ANIMASI UTAMA ---
function animate() {
    requestAnimationFrame(animate);

    // Logika Fisika Pergerakan Sederhana
    if (moveForward) {
        playerSpeed = Math.min(playerSpeed + acceleration, maxSpeed);
    } else if (moveBackward) {
        playerSpeed = Math.max(playerSpeed - acceleration, -maxSpeed / 2);
    } else {
        if (playerSpeed > 0) playerSpeed = Math.max(playerSpeed - deceleration, 0);
        if (playerSpeed < 0) playerSpeed = Math.min(playerSpeed + deceleration, 0);
    }

    // Belok arah
    if (turnLeft) playerAngle += 0.03;
    if (turnRight) playerAngle -= 0.03;

    // Terapkan pergerakan ke objek player
    player.rotation.y = playerAngle;
    player.translateZ(playerSpeed);

    // Posisi Kamera Mengikuti Player (Chase Camera)
    const cameraOffset = new THREE.Vector3(
        Math.sin(playerAngle) * -7,
        3.5,
        Math.cos(playerAngle) * -7
    );
    camera.position.copy(player.position).add(cameraOffset);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1, 0)));

    renderer.render(scene, camera);
}

animate();

// --- 7. PENYESUAIAN UKURAN LAYAR ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
