window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    if (!container) return;

    if (typeof THREE === 'undefined') {
        container.innerHTML = "<div style='color:white; padding:20px; text-align:center;'>Gagal memuat pustaka 3D.</div>";
        return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, -10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Pencahayaan
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(15, 30, 15);
    scene.add(directionalLight);

    // --- LINGKUNGAN KAMPUNG, RUMAH WARGA & DANAU ---
    const roadGeometry = new THREE.PlaneGeometry(12, 1000);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = 500;
    scene.add(road);

    const lakeGeometry = new THREE.PlaneGeometry(40, 60);
    const lakeMaterial = new THREE.MeshStandardMaterial({ color: 0x2288cc, roughness: 0.1 });
    const mountainLake = new THREE.Mesh(lakeGeometry, lakeMaterial);
    mountainLake.rotation.x = -Math.PI / 2;
    mountainLake.position.set(25, 0.05, 200);
    scene.add(mountainLake);

    // Dekorasi Pohon & Rumah Kampung Khas Sunda di Pinggir Jalan
    for (let i = 0; i < 20; i++) {
        const treeGeo = new THREE.ConeGeometry(1.5, 4, 6);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        
        const treeLeft = new THREE.Mesh(treeGeo, treeMat);
        treeLeft.position.set(-10, 2, i * 50);
        scene.add(treeLeft);

        // Model Sederhana Rumah Kampung (Dinding Kayu / Atap Coklat)
        if (i % 2 === 0) {
            const houseGroup = new THREE.Group();
            const walls = new THREE.Mesh(
                new THREE.BoxGeometry(4, 2.5, 5),
                new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Kayu Coklat
            );
            walls.position.y = 1.25;
            houseGroup.add(walls);

            const roof = new THREE.Mesh(
                new THREE.ConeGeometry(3.5, 1.8, 4),
                new THREE.MeshStandardMaterial({ color: 0xCD853F }) // Atap
            );
            roof.position.y = 3.4;
            roof.rotation.y = Math.PI / 4;
            houseGroup.add(roof);

            houseGroup.position.set(14, 0, i * 50 + 15);
            scene.add(houseGroup);
        }
    }

    // --- KENDARAAN (Motor, Angkot, Pesawat) ---
    const motorGroup = new THREE.Group();
    const motorBody = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 2.2), new THREE.MeshStandardMaterial({ color: 0xcc2222 }));
    motorBody.position.y = 0.45;
    motorGroup.add(motorBody);

    const angkotGroup = new THREE.Group();
    const angkotBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.5, 3.8), new THREE.MeshStandardMaterial({ color: 0x2266cc }));
    angkotBody.position.y = 0.75;
    angkotGroup.add(angkotBody);

    const planeGroup = new THREE.Group();
    const planeBody = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 4.5), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    planeBody.position.y = 0.5;
    planeGroup.add(planeBody);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 1.5), new THREE.MeshStandardMaterial({ color: 0xcc3333 }));
    wing.position.set(0, 0.6, 0);
    planeGroup.add(wing);

    let currentVehicleType = 'motor';
    scene.add(motorGroup);
    scene.add(angkotGroup);
    scene.add(planeGroup);
    angkotGroup.visible = false;
    planeGroup.visible = false;
    let activeVehicle = motorGroup;

    let moveForward = false;
    let moveBackward = false;
    let turnLeft = false;
    let turnRight = false;
    let vehicleSpeed = 0;
    const maxSpeedMotor = 0.7;
    const maxSpeedAngkot = 0.45;
    const maxSpeedPlane = 1.2;
    const acceleration = 0.012;
    const deceleration = 0.015;
    let vehicleAngle = 0;

    // --- UI INFORMASI, JAM & STATUS SURVIVAL ---
    let gameHours = 16;
    let gameMinutes = 27;
    let survivalStamina = 85;
    let fishCount = 2;

    let infoPanel = document.createElement('div');
    infoPanel.style.position = 'absolute';
    infoPanel.style.top = '15px';
    infoPanel.style.right = '15px';
    infoPanel.style.background = 'rgba(0, 0, 0, 0.6)';
    infoPanel.style.color = 'white';
    infoPanel.style.padding = '8px 12px';
    infoPanel.style.borderRadius = '10px';
    infoPanel.style.fontSize = '12px';
    infoPanel.style.border = '2px solid rgba(255,255,255,0.5)';
    infoPanel.style.zIndex = '100';
    document.body.appendChild(infoPanel);

    let notifPanel = document.createElement('div');
    notifPanel.style.position = 'absolute';
    notifPanel.style.top = '25%';
    notifPanel.style.left = '50%';
    notifPanel.style.transform = 'translate(-50%, -50%)';
    notifPanel.style.background = 'rgba(0, 0, 0, 0.85)';
    notifPanel.style.color = '#FFEB3B';
    notifPanel.style.padding = '10px 20px';
    notifPanel.style.borderRadius = '10px';
    notifPanel.style.fontSize = '14px';
    notifPanel.style.fontWeight = 'bold';
    notifPanel.style.display = 'none';
    notifPanel.style.zIndex = '150';
    notifPanel.style.border = '2px solid #FFEB3B';
    document.body.appendChild(notifPanel);

    // --- SISTEM INVENTARIS SURVIVAL (Ransel) ---
    let backpackOpen = false;
    const survivalItems = [
        "🎒 Tas Ransel Besar",
        "🔪 Pisau Survival",
        "🔥 Korek Api & Kayu Bakar",
        "⛺ Kompor Portable",
        "🎣 Alat Pancing & Umpan"
    ];

    let bagBtn = document.getElementById('btn-backpack');
    if (!bagBtn) {
        bagBtn = document.createElement('button');
        bagBtn.id = 'btn-backpack';
        bagBtn.innerText = "🎒 Ransel";
        bagBtn.style.position = 'absolute';
        bagBtn.style.top = '145px';
        bagBtn.style.left = '15px';
        bagBtn.style.padding = '8px 12px';
        bagBtn.style.background = 'rgba(0,0,0,0.7)';
        bagBtn.style.color = 'white';
        bagBtn.style.border = '2px solid white';
        bagBtn.style.borderRadius = '10px';
        bagBtn.style.zIndex = '100';
        bagBtn.style.fontWeight = 'bold';
        document.body.appendChild(bagBtn);
    }

    let bagPanel = document.getElementById('bag-panel');
    if (!bagPanel) {
        bagPanel = document.createElement('div');
        bagPanel.id = 'bag-panel';
        bagPanel.style.position = 'absolute';
        bagPanel.style.top = '50%';
        bagPanel.style.left = '50%';
        bagPanel.style.transform = 'translate(-50%, -50%)';
        bagPanel.style.width = '260px';
        bagPanel.style.background = 'rgba(0, 0, 0, 0.9)';
        bagPanel.style.border = '2px solid #4CAF50';
        bagPanel.style.borderRadius = '15px';
        bagPanel.style.color = 'white';
        bagPanel.style.padding = '15px';
        bagPanel.style.display = 'none';
        bagPanel.style.zIndex = '200';
        bagPanel.innerHTML = `<h3 style="margin-top:0; text-align:center; color:#4CAF50;">🎒 Tas Ransel Survival</h3><ul style="padding-left:20px; line-height:1.6;">` + 
            survivalItems.map(item => `<li>${item}</li>`).join('') + `</ul><p style="font-size:11px; text-align:center; color:#4CAF50; margin-bottom:5px;">🔥 Klik untuk Memasak Ikan (+15 Stamina)</p><p style="font-size:11px; text-align:center; color:#aaa; margin-bottom:0;">Tutup Ransel</p>`;
        document.body.appendChild(bagPanel);
    }

    bagBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        backpackOpen = !backpackOpen;
        bagPanel.style.display = backpackOpen ? 'block' : 'none';
    });

    // Fitur Memasak Ikan menggunakan Kompor Portable saat Ransel Dibuka
    bagPanel.addEventListener('touchstart', () => {
        if (fishCount > 0) {
            fishCount--;
            survivalStamina = Math.min(100, survivalStamina + 15);
            notifPanel.innerText = `🍳 Memasak Ikan dengan Kompor Portable! Stamina Pulih (+15%)`;
            notifPanel.style.display = 'block';
            setTimeout(() => { notifPanel.style.display = 'none'; }, 2500);
        } else {
            notifPanel.innerText = `⚠️ Tidak ada ikan! Pancing dulu di Danau Gunung.`;
            notifPanel.style.display = 'block';
            setTimeout(() => { notifPanel.style.display = 'none'; }, 2500);
        }
        backpackOpen = false;
        bagPanel.style.display = 'none';
    });

    // Kontrol Joystick Kiri
    const stick = document.getElementById('joystick-stick');
    const base = document.getElementById('joystick-base');
    let isTouching = false;
    let centerX, centerY;

    if (base && stick) {
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
            turnLeft = dx < -10;
            turnRight = dx > 10;
        });

        window.addEventListener('touchend', () => {
            if (isTouching) {
                isTouching = false;
                stick.style.transform = `translate(0px, 0px)`;
                turnLeft = false;
                turnRight = false;
            }
        });
    }

    // Tombol Gas & Rem di Kanan
    const btnGas = document.getElementById('btn-gas');
    const btnBrake = document.getElementById('btn-brake');
    const btnAction = document.getElementById('btn-action');

    if (btnGas) {
        btnGas.addEventListener('touchstart', () => { moveForward = true; });
        btnGas.addEventListener('touchend', () => { moveForward = false; });
    }
    if (btnBrake) {
        btnBrake.addEventListener('touchstart', () => { moveBackward = true; });
        btnBrake.addEventListener('touchend', () => { moveBackward = false; });
    }

    // Tombol Aksi: Memancing di Danau atau Ganti Kendaraan
    if (btnAction) {
        btnAction.innerText = "Ganti";
        btnAction.addEventListener('touchstart', () => {
            const distToLake = activeVehicle.position.distanceTo(new THREE.Vector3(25, 0, 200));
            if (distToLake < 25) {
                fishCount++;
                notifPanel.innerText = `🎣 Berhasil Memancing Ikan Danau! (Total: ${fishCount})`;
                notifPanel.style.display = 'block';
                setTimeout(() => { notifPanel.style.display = 'none'; }, 2500);
                return;
            }

            if (currentVehicleType === 'motor') {
                currentVehicleType = 'angkot';
                angkotGroup.position.copy(motorGroup.position);
                angkotGroup.rotation.y = motorGroup.rotation.y;
                motorGroup.visible = false;
                angkotGroup.visible = true;
                activeVehicle = angkotGroup;
            } else if (currentVehicleType === 'angkot') {
                currentVehicleType = 'pesawat';
                planeGroup.position.copy(angkotGroup.position);
                planeGroup.position.y = 2;
                planeGroup.rotation.y = angkotGroup.rotation.y;
                angkotGroup.visible = false;
                planeGroup.visible = true;
                activeVehicle = planeGroup;
            } else {
                currentVehicleType = 'motor';
                motorGroup.position.copy(planeGroup.position);
                motorGroup.position.y = 0;
                motorGroup.rotation.y = planeGroup.rotation.y;
                planeGroup.visible = false;
                motorGroup.visible = true;
                activeVehicle = motorGroup;
            }
            vehicleSpeed = 0;
        });
    }

    // Loop Animasi Utama
    function animate() {
        requestAnimationFrame(animate);

        let currentMaxSpeed = maxSpeedMotor;
        if (currentVehicleType === 'angkot') currentMaxSpeed = maxSpeedAngkot;
        if (currentVehicleType === 'pesawat') currentMaxSpeed = maxSpeedPlane;

        if (moveForward) {
            vehicleSpeed = Math.min(vehicleSpeed + acceleration, currentMaxSpeed);
        } else if (moveBackward) {
            vehicleSpeed = Math.max(vehicleSpeed - acceleration, -currentMaxSpeed / 2);
        } else {
            if (vehicleSpeed > 0) vehicleSpeed = Math.max(vehicleSpeed - deceleration, 0);
            if (vehicleSpeed < 0) vehicleSpeed = Math.min(vehicleSpeed + deceleration, 0);
        }

        let turnSpeed = (currentVehicleType === 'pesawat') ? 0.05 : ((currentVehicleType === 'motor') ? 0.04 : 0.025);
        if (turnLeft) vehicleAngle += turnSpeed;
        if (turnRight) vehicleAngle -= turnSpeed;

        activeVehicle.rotation.y = vehicleAngle;
        activeVehicle.translateZ(vehicleSpeed);

        if (currentVehicleType === 'pesawat') {
            if (moveForward && activeVehicle.position.y < 30) {
                activeVehicle.position.y += 0.05;
            } else if (!moveForward && activeVehicle.position.y > 2) {
                activeVehicle.position.y -= 0.03;
            }
        }

        const distToLake = activeVehicle.position.distanceTo(new THREE.Vector3(25, 0, 200));
        if (distToLake < 25) {
            btnAction.innerText = "Pancing";
            btnAction.style.background = "rgba(255, 152, 0, 0.8)";
        } else {
            btnAction.innerText = "Ganti";
            btnAction.style.background = "rgba(0, 100, 255, 0.6)";
        }

        infoPanel.innerHTML = `🕒 16:27 | ⚡ Stamina: ${Math.floor(survivalStamina)}% | 🐟 Ikan: ${fishCount}`;

        const cameraOffset = new THREE.Vector3(
            Math.sin(vehicleAngle) * -9,
            4.5,
            Math.cos(vehicleAngle) * -9
        );
        camera.position.copy(activeVehicle.position).add(cameraOffset);
        camera.lookAt(activeVehicle.position.clone().add(new THREE.Vector3(0, 1, 0)));

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
