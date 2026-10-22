// Memaksa Mode Layar Miring & Izin Storage (Web API)
if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(()=>console.log("Auto-rotate device required."));
}

// Inisialisasi Three.js (Grafik) & Cannon.js (Fisika)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Gravitasi Bumi Nyata
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 10;

// Pencahayaan GTA Style
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(100, 200, 50);
dirLight.castShadow = true;
scene.add(dirLight);

// Variabel Utama
const physicsBodies = [];
const interactableVehicles = [];
let playerMesh, playerBody;
let activeVehicle = null;
let isDriving = false;
let joystickVector = { x: 0, y: 0 };
let camAngle = { x: 0, y: 0 }; // Rotasi kamera 360 derajat
const gltfLoader = new THREE.GLTFLoader();

// 1. Pemuatan Otomatis Seluruh File .glb
async function loadAllAssets() {
    // Bangun Tanah Cidadap - Cicurug
    const groundMaterial = new CANNON.Material();
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);
    
    const groundGeo = new THREE.PlaneGeometry(10000, 10000);
    const groundMesh = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ color: 0x3d5e3a }));
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // Otomatis tarik dari models.json
    try {
        const res = await fetch('assets/models/models.json');
        const data = await res.json();
        data.models.forEach(modelPath => {
            loadGLB(modelPath);
        });
    } catch(e) {
        console.error("Gagal muat models.json. Pastikan file ada.");
        // Fallback dummy jika error
        createDummyVehicle();
    }
    
    spawnPlayer();
}

function loadGLB(path) {
    gltfLoader.load(path, (gltf) => {
        const model = gltf.scene;
        // Skala otomatis & penyebaran acak di Cidadap-Cicurug (Z: 0 sampai -8000)
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        model.scale.multiplyScalar(10 / Math.max(size.x, size.y, size.z));
        
        const randomZ = -(Math.random() * 8000);
        const randomX = (Math.random() - 0.5) * 500;
        model.position.set(randomX, 5, randomZ);
        scene.add(model);

        // Otomatis buat hitbox fisika untuk bangunan/objek
        const shape = new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.copy(model.position);
        world.addBody(body);
        physicsBodies.push({ mesh: model, body: body });
    });
}

// 2. Setup Karakter & Senjata
function spawnPlayer() {
    // Model Karakter (Capsule fisik)
    const shape = new CANNON.Cylinder(1, 1, 4, 12);
    playerBody = new CANNON.Body({ mass: 70, shape: shape });
    playerBody.position.set(0, 10, 0); // Spawn Cidadap
    playerBody.fixedRotation = true;
    playerBody.updateMassProperties();
    world.addBody(playerBody);

    const geo = new THREE.CapsuleGeometry(1, 2, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    playerMesh = new THREE.Mesh(geo, mat);
    scene.add(playerMesh);
}

function createDummyVehicle() {
    // Jika belum ada mobil .glb, bikin mobil kotak beneran yg bisa disetir
    const chassisShape = new CANNON.Box(new CANNON.Vec3(2, 1, 4));
    const chassisBody = new CANNON.Body({ mass: 1500 });
    chassisBody.addShape(chassisShape);
    chassisBody.position.set(10, 5, -20);
    world.addBody(chassisBody);

    const chassisMesh = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 8), new THREE.MeshStandardMaterial({ color: 0x3498db }));
    scene.add(chassisMesh);
    
    interactableVehicles.push({ body: chassisBody, mesh: chassisMesh, type: 'car' });
    physicsBodies.push({ mesh: chassisMesh, body: chassisBody });
}

// 3. Kontrol Mobile Nipple.js & Kamera 360
const joystickManager = nipplejs.create({ zone: document.getElementById('joystick-zone'), mode: 'static', position: { left: '50%', top: '50%' }, color: 'white' });
joystickManager.on('move', (evt, data) => { joystickVector = { x: data.vector.x, y: data.vector.y }; });
joystickManager.on('end', () => { joystickVector = { x: 0, y: 0 }; });

// Rotasi Kamera (Sentuh Kanan Layar - Bisa liat langit/bawah)
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const touchZone = document.getElementById('camera-touch-zone');

touchZone.addEventListener('touchstart', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
});
touchZone.addEventListener('touchmove', (e) => {
    if(isDragging) {
        const deltaMove = { x: e.touches[0].clientX - previousMousePosition.x, y: e.touches[0].clientY - previousMousePosition.y };
        camAngle.x -= deltaMove.x * 0.005;
        camAngle.y -= deltaMove.y * 0.005;
        camAngle.y = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, camAngle.y)); // Batas atas/bawah
        previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
});
touchZone.addEventListener('touchend', () => { isDragging = false; });

// 4. Sistem Waypoint Minimap (Klik Map, Tandai Lokasi)
const minimapUI = document.getElementById('minimap-container');
const waypointBlip = document.getElementById('waypoint-blip');
let targetWaypoint = null;

minimapUI.addEventListener('click', (e) => {
    const rect = minimapUI.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Tampilkan blip merah di UI
    waypointBlip.style.display = 'block';
    waypointBlip.style.left = x + 'px';
    waypointBlip.style.top = y + 'px';
    
    // Konversi ke koordinat dunia 3D (Z-axis Cidadap ke Cicurug)
    const mapScaleX = (x / rect.width) * 10000 - 5000;
    const mapScaleZ = (y / rect.height) * -8000; 
    targetWaypoint = new THREE.Vector3(mapScaleX, 0, mapScaleZ);
});

// 5. Interaksi Kendaraan (Berubah Tombol)
const btnEnter = document.getElementById('btn-enter-vehicle');
const btnExit = document.getElementById('btn-exit-vehicle');
const uiFoot = document.getElementById('action-buttons-foot');
const uiVehicle = document.getElementById('action-buttons-vehicle');

// Deteksi kendaraan terdekat
function checkVehicles() {
    if(isDriving) return;
    let nearCar = null;
    interactableVehicles.forEach(veh => {
        if(playerBody.position.distanceTo(veh.body.position) < 8) nearCar = veh;
    });
    
    if(nearCar) {
        btnEnter.style.display = 'block';
        btnEnter.onclick = () => enterVehicle(nearCar);
    } else {
        btnEnter.style.display = 'none';
    }
}

function enterVehicle(veh) {
    isDriving = true;
    activeVehicle = veh;
    uiFoot.classList.remove('active');
    uiVehicle.classList.add('active');
    // Sembunyikan player
    playerMesh.visible = false;
    playerBody.position.set(0, -100, 0); // Buang player sementara ke bawah tanah
}

btnExit.onclick = () => {
    isDriving = false;
    uiFoot.classList.add('active');
    uiVehicle.classList.remove('active');
    playerMesh.visible = true;
    // Spawn player di samping mobil
    playerBody.position.set(activeVehicle.body.position.x + 4, activeVehicle.body.position.y + 2, activeVehicle.body.position.z);
    playerBody.velocity.set(0,0,0);
    activeVehicle = null;
};

// 6. Game Loop Utama
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    world.step(1/60, delta, 3);

    // Update posisi semua benda fisika
    physicsBodies.forEach(obj => {
        obj.mesh.position.copy(obj.body.position);
        obj.mesh.quaternion.copy(obj.body.quaternion);
    });

    let camTargetX, camTargetY, camTargetZ;

    if (!isDriving && playerBody) {
        // Gerakan Player Jalan Kaki
        const speed = 15;
        const forward = new THREE.Vector3(Math.sin(camAngle.x), 0, Math.cos(camAngle.x)).normalize();
        const right = new THREE.Vector3(Math.sin(camAngle.x - Math.PI/2), 0, Math.cos(camAngle.x - Math.PI/2)).normalize();
        
        playerBody.velocity.x = (forward.x * joystickVector.y * speed) + (right.x * -joystickVector.x * speed);
        playerBody.velocity.z = (forward.z * joystickVector.y * speed) + (right.z * -joystickVector.x * speed);

        playerMesh.position.copy(playerBody.position);
        checkVehicles();
        
        camTargetX = playerBody.position.x;
        camTargetY = playerBody.position.y + 5;
        camTargetZ = playerBody.position.z;

        // Tembakan Senjata
        document.getElementById('btn-shoot').onclick = () => {
            // Logika raycast nembak GTA
            const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({color:0xffff00}));
            bullet.position.copy(playerMesh.position);
            scene.add(bullet);
            setTimeout(()=>scene.remove(bullet), 100);
        };
    } else if (isDriving && activeVehicle) {
        // Kontrol Kendaraan Nyata
        const force = 3000;
        let driveDir = 0;
        document.getElementById('btn-gas').ontouchstart = () => driveDir = -1;
        document.getElementById('btn-gas').ontouchend = () => driveDir = 0;
        document.getElementById('btn-brake').ontouchstart = () => driveDir = 1;
        document.getElementById('btn-brake').ontouchend = () => driveDir = 0;

        // Kemudi Mobil pakai Joystick X
        activeVehicle.body.angularVelocity.y = -joystickVector.x * 2;
        
        const vehForward = new CANNON.Vec3(0, 0, driveDir * force);
        activeVehicle.body.quaternion.vmult(vehForward, vehForward);
        activeVehicle.body.applyForce(vehForward, activeVehicle.body.position);

        camTargetX = activeVehicle.body.position.x;
        camTargetY = activeVehicle.body.position.y + 5;
        camTargetZ = activeVehicle.body.position.z;
    }

    // Rotasi Kamera 360 (Orbit sekitar target)
    const radius = isDriving ? 15 : 10;
    camera.position.x = camTargetX - radius * Math.sin(camAngle.x) * Math.cos(camAngle.y);
    camera.position.y = camTargetY + radius * Math.sin(camAngle.y);
    camera.position.z = camTargetZ - radius * Math.cos(camAngle.x) * Math.cos(camAngle.y);
    camera.lookAt(camTargetX, camTargetY, camTargetZ);

    // Update UI Teks Lokasi
    if (camTargetZ < -6000) document.getElementById('location-text').innerText = "Cicurug";
    else if (camTargetZ < -3000) document.getElementById('location-text').innerText = "Cipari / Bebera";
    else document.getElementById('location-text').innerText = "Cidadap";

    // Rotasi Minimap
    document.getElementById('minimap').style.transform = `rotate(${camAngle.x * 57.2958}deg)`;

    renderer.render(scene, camera);
}

loadAllAssets();
animate();
