window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    if (!container) return;

    if (typeof THREE === 'undefined') {
        container.innerHTML = "<div style='color:white; padding:20px; text-align:center;'>Gagal memuat pustaka 3D.</div>";
        return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Langit cerah pegunungan

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

    // --- LINGKUNGAN KAMPUNG & DANAU SURVIVAL ---
    const roadGeometry = new THREE.PlaneGeometry(12, 1000);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = 500;
    scene.add(road);

    // Area Danau Gunung (Warna Biru Air) di sisi jalan
    const lakeGeometry = new THREE.PlaneGeometry(40, 60);
    const lakeMaterial = new THREE.MeshStandardMaterial({ color: 0x2288cc, roughness: 0.1 });
    const mountainLake = new THREE.Mesh(lakeGeometry, lakeMaterial);
    mountainLake.rotation.x = -Math.PI / 2;
    mountainLake.position.set(25, 0.05, 200);
    scene.add(mountainLake);

    // Pohon-pohon rimbun
    for (let i = 0; i < 25; i++) {
        const treeGeo = new THREE.ConeGeometry(1.5, 4, 6);
        const treeMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
        
        const treeLeft = new THREE.Mesh(treeGeo, treeMat);
        treeLeft.position.set(-10, 2, i * 40);
        scene.add(treeLeft);

        const treeRight = new THREE.Mesh(treeGeo, treeMat);
        treeRight.position.set(15, 2, i * 40 + 20);
        scene.add(treeRight);
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

    // --- SISTEM INVENTARIS SURVIVAL (Ransel) ---
    let backpackOpen = false;
    const survivalItems = [
        "🎒 Tas Ransel Besar",
        "🔪 Pisau Survival",
        "🔥 Korek Api",
        "⛺ Kompor Portable",
        "🎣 Alat Pancing & Umpan"
    ];

    // Tambahkan Tombol Tas Ransel di UI secara otomatis jika belum ada
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

    // Panel Tampilan Isi Ransel
    let bagPanel = document.getElementById('bag-panel');
    if (!bagPanel) {
        bagPanel = document.createElement('div');
        bagPanel.id = 'bag-panel';
        bagPanel.style.position = 'absolute';
        bagPanel.style.top = '50%';
        bagPanel.style.left = '50%';
        bagPanel.style.transform = 'translate(-50%, -50%)';
        bagPanel.style.width = '250px';
        bagPanel.style.background = 'rgba(0, 0, 0, 0.85)';
        bagPanel.style.border = '2px solid #4CAF50';
        bagPanel.style.borderRadius = '15px';
        bagPanel.style.color = 'white';
        bagPanel.style.padding = '15px';
        bagPanel.style.display = 'none';
        bagPanel.style.zIndex = '200';
        bagPanel.innerHTML = `<h3 style="margin-top:0; text-align:center; color:#4CAF50;">🎒 Tas Ransel Survival</h3><ul style="padding-left:20px; line-height:1.6;">` + 
            survivalItems.map(item => `<li>${item}</li>`).join('') + `</ul><p style="font-size:11px; text-align:center; color:#aaa; margin-bottom:0;">Klik Ransel untuk menutup</p>`;
        document.body.appendChild(bagPanel);
    }

    bagBtn.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        backpackOpen = !backpackOpen;
        bagPanel.style.display = backpackOpen ? 'block' : 'none';
    });

    bagPanel.addEventListener('touchstart', () => {
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

    // Tombol Ganti Kendaraan
    if (btnAction) {
        btnAction.innerText = "Ganti";
        btnAction.addEventListener('touchstart', () => {
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

    // Loop Animasi
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
