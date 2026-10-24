if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(()=>{});
}

try {
    // ==========================================
    // 1. SISTEM AUTO-GENERATE ASSETS (PROCEDURAL)
    // ==========================================
    // Ini skrip ajaib buat memuat ratusan file dari folder lu[span_3](start_span)[span_3](end_span) secara otomatis.
    // 'type: enterable' bikin bangunan bisa dimasukin. 'type: solid' bikin benda padat (pohon/tembok).
    const autoGenAssets = [
        // ASET BANGUNAN (Bisa dimasukin)
        { file: "assets/models/House.glb", type: "enterable", scale: 4, count: 8, radiusSpread: 300 },
        { file: "assets/models/Store.glb", type: "enterable", scale: 4, count: 3, radiusSpread: 150 },
        
        // ASET ALAM & KOTA (Padat)
        { file: "assets/models/Trees.glb", type: "solid", scale: 3, count: 40, radiusSpread: 400 },
        { file: "assets/models/Streetlight.glb", type: "solid", scale: 2, count: 15, radiusSpread: 300 },
        { file: "assets/models/Road.glb", type: "floor", scale: 5, count: 1, radiusSpread: 0 } // Pusat map
    ];
    
    const FILE_KARAKTER = "assets/models/Animated Woman.glb"; // Dari list lu[span_4](start_span)[span_4](end_span)
    const FILE_MOBIL = "assets/models/SUV.glb"; // Dari list lu[span_5](start_span)[span_5](end_span)
    const FILE_SENJATA = "assets/models/Assault Rifle.glb"; // Dari list lu[span_6](start_span)[span_6](end_span)
    const WORLD_SIZE = 1000; 

    // ==========================================
    // 2. LOGIKA MENU UTAMA & PENGATURAN
    // ==========================================
    const loadingScreen = document.getElementById('loading-screen');
    const mainMenu = document.getElementById('main-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const gameUI = document.getElementById('ui-container');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingManager = new THREE.LoadingManager();

    // Event Menu
    document.getElementById('btn-start-game').addEventListener('click', () => {
        mainMenu.style.display = 'none';
        gameUI.style.display = 'block';
    });

    document.getElementById('btn-open-settings').addEventListener('click', () => {
        mainMenu.style.display = 'none';
        settingsMenu.style.display = 'flex';
    });

    document.getElementById('btn-close-settings').addEventListener('click', () => {
        settingsMenu.style.display = 'none';
        mainMenu.style.display = 'flex';
    });

    // Simulasi Permintaan Izin
    document.getElementById('perm-storage').addEventListener('click', (e) => {
        e.target.innerText = "DIIZINKAN";
        e.target.classList.add("granted");
        alert("Izin Penyimpanan diberikan. (Disimulasikan untuk Web)");
    });
    document.getElementById('perm-audio').addEventListener('click', (e) => {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(() => {
            e.target.innerText = "DIIZINKAN";
            e.target.classList.add("granted");
        }).catch(() => alert("Izin Mic Ditolak"));
    });

    // Loading Selesai -> Buka Main Menu
    loadingManager.onProgress = (url, loaded, total) => { loadingProgress.innerText = `Mengatur Aset: ${loaded}/${total}`; };
    loadingManager.onLoad = () => { 
        loadingScreen.style.opacity = '0'; 
        setTimeout(() => { loadingScreen.style.display = 'none'; mainMenu.style.display = 'flex'; }, 1000); 
    };
    setTimeout(() => { 
        if(loadingScreen.style.display !== 'none') {
            loadingScreen.style.display = 'none'; mainMenu.style.display = 'flex'; 
        }
    }, 15000); // Fail-safe timer

    // ==========================================
    // 3. ENGINE 3D & FISIKA
    // ==========================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); 
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 4000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(200, 500, 200);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
    world.addBody(groundBody);
    const groundMesh = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE), new THREE.MeshStandardMaterial({color: 0x3d5e3a}));
    groundMesh.rotation.x = -Math.PI/2;
    scene.add(groundMesh);

    // ==========================================
    // 4. GENERATOR KAMPUNG OTOMATIS
    // ==========================================
    let playerMesh = new THREE.Group(); scene.add(playerMesh);
    const playerBody = new CANNON.Body({ mass: 70, shape: new CANNON.Cylinder(1,1,4,12) });
    playerBody.position.set(0, 5, 0);
    playerBody.fixedRotation = true;
    playerBody.updateMassProperties();
    world.addBody(playerBody);

    let vehicleMesh = new THREE.Group(); scene.add(vehicleMesh);
    const vehicleBody = new CANNON.Body({ mass: 1200, shape: new CANNON.Box(new CANNON.Vec3(1.5, 1, 3)) });
    vehicleBody.position.set(12, 5, 30);
    vehicleBody.fixedRotation = true;
    world.addBody(vehicleBody);

    if (typeof THREE.GLTFLoader !== 'undefined') {
        const gltfLoader = new THREE.GLTFLoader(loadingManager);
        
        // Load Player
        gltfLoader.load(FILE_KARAKTER, (gltf) => {
            const char = gltf.scene; char.position.set(0,-2,0);
            char.traverse(n => { if(n.isMesh) n.castShadow=true; });
            playerMesh.add(char);
            
            // Pasang Senjata Otomatis ke Karakter
            gltfLoader.load(FILE_SENJATA, (w_gltf) => {
                const weapon = w_gltf.scene;
                weapon.scale.set(0.5, 0.5, 0.5);
                weapon.position.set(0.5, 1, 0.5); // Posisi tangan
                playerMesh.add(weapon);
            });
        }, undefined, ()=>console.log("File Karakter belum ada"));

        // Load Mobil
        gltfLoader.load(FILE_MOBIL, (gltf) => {
            const car = gltf.scene; car.position.set(0,-1,0); car.scale.set(3,3,3);
            car.traverse(n => { if(n.isMesh) n.castShadow=true; });
            vehicleMesh.add(car);
        }, undefined, ()=>console.log("File Mobil belum ada"));

        // AUTO-SPREADER: Menyebarkan bangunan dan pohon[span_7](start_span)[span_7](end_span) secara otomatis
        autoGenAssets.forEach(asset => {
            gltfLoader.load(asset.file, (gltf) => {
                for (let i = 0; i < asset.count; i++) {
                    // Clone (Gandakan) model untuk disebar
                    const model = gltf.scene.clone();
                    model.scale.set(asset.scale, asset.scale, asset.scale);
                    
                    // Acak posisi X dan Z berdasarkan radiusSpread
                    const randX = (Math.random() - 0.5) * asset.radiusSpread;
                    const randZ = (Math.random() - 0.5) * asset.radiusSpread;
                    model.position.set(randX, (asset.type === 'floor' ? 0.1 : 0), randZ);
                    scene.add(model);

                    // Beri kotak fisika padat (Solid) JIKA bukan tipe bangunan/ruangan
                    if (asset.type === "solid") {
                        const box = new THREE.Box3().setFromObject(model);
                        const size = box.getSize(new THREE.Vector3());
                        const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2)) });
                        body.position.copy(model.position);
                        body.position.y += size.y/2;
                        world.addBody(body);
                    }
                }
            }, undefined, ()=>console.log(`Gagal memuat ${asset.file}`));
        });
    }

    // ==========================================
    // 5. INTERAKSI KENDARAAN, JOYSTICK & MINIMAP
    // ==========================================
    let currentVehicleType = 'foot'; 
    const btnAction = document.getElementById('btn-action');
    const btnJump = document.getElementById('btn-jump');

    btnAction.addEventListener('click', () => {
        if (currentVehicleType === 'foot' && playerBody.position.distanceTo(vehicleBody.position) < 8) {
            currentVehicleType = 'car';
            playerMesh.visible = false;
            playerBody.position.set(0, -100, 0); 
            btnAction.innerText = 'Turun'; btnJump.innerText = 'Klakson';
        } else if (currentVehicleType === 'car') {
            currentVehicleType = 'foot';
            playerMesh.visible = true;
            playerBody.position.copy(vehicleBody.position);
            playerBody.position.x += 4;
            btnAction.innerText = 'Naik'; btnJump.innerText = 'Loncat';
        }
    });

    let joystickVector = { x: 0, y: 0 };
    let camAngle = { x: 0, y: 0 };
    if (typeof nipplejs !== 'undefined') {
        const manager = nipplejs.create({ zone: document.getElementById('joystick-zone'), mode: 'static', position: {left:'50%', top:'50%'}, color:'white' });
        manager.on('move', (evt, data) => { if(data?.vector) joystickVector = {x: data.vector.x, y: data.vector.y}; });
        manager.on('end', () => { joystickVector = {x:0, y:0}; });
    }

    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const touchZone = document.getElementById('camera-touch-zone');
    if(touchZone) {
        touchZone.addEventListener('touchstart', e => { if(e.touches.length>0) { isDragging=true; prevMouse={x:e.touches[0].clientX, y:e.touches[0].clientY}; }});
        touchZone.addEventListener('touchmove', e => {
            if(isDragging && e.touches.length>0) {
                camAngle.x -= (e.touches[0].clientX - prevMouse.x) * 0.005;
                camAngle.y -= (e.touches[0].clientY - prevMouse.y) * 0.005;
                camAngle.y = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, camAngle.y));
                prevMouse = {x:e.touches[0].clientX, y:e.touches[0].clientY};
            }
        });
        touchZone.addEventListener('touchend', () => isDragging=false);
    }

    let targetWaypoint = null; 
    document.getElementById('minimap-container').addEventListener('click', () => document.getElementById('full-map-ui').style.display = 'flex');
    document.getElementById('close-map-btn').addEventListener('click', () => document.getElementById('full-map-ui').style.display = 'none');
    
    document.getElementById('full-map-container').addEventListener('click', (e) => {
        const rect = document.getElementById('full-map-container').getBoundingClientRect();
        const percentX = (e.clientX - rect.left) / rect.width;
        const percentY = (e.clientY - rect.top) / rect.height;

        document.getElementById('full-map-waypoint-blip').style.display = 'block';
        document.getElementById('full-map-waypoint-blip').style.left = (percentX * 100) + '%';
        document.getElementById('full-map-waypoint-blip').style.top = (percentY * 100) + '%';
        document.getElementById('minimap-waypoint-blip').style.display = 'block';

        targetWaypoint = { x: (percentX - 0.5) * WORLD_SIZE, z: (percentY - 0.5) * WORLD_SIZE };
    });

    // ==========================================
    // 6. GAME LOOP UTAMA
    // ==========================================
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        world.step(1/60, clock.getDelta(), 3);

        const activeBody = (currentVehicleType === 'foot') ? playerBody : vehicleBody;
        const activeMesh = (currentVehicleType === 'foot') ? playerMesh : vehicleMesh;
        const speed = (currentVehicleType === 'foot') ? 14 : 35; 

        if (activeBody) {
            const forward = new THREE.Vector3(Math.sin(camAngle.x), 0, Math.cos(camAngle.x)).normalize();
            const right = new THREE.Vector3(Math.sin(camAngle.x - Math.PI/2), 0, Math.cos(camAngle.x - Math.PI/2)).normalize();
            
            activeBody.velocity.x = (forward.x * joystickVector.y * speed) + (right.x * -joystickVector.x * speed);
            activeBody.velocity.z = (forward.z * joystickVector.y * speed) + (right.z * -joystickVector.x * speed);

            activeMesh.position.copy(activeBody.position);
            if (joystickVector.x !== 0 || joystickVector.y !== 0) activeMesh.rotation.y = Math.atan2(activeBody.velocity.x, activeBody.velocity.z);

            // Sync Map
            const mapPosX = (activeBody.position.x / WORLD_SIZE) + 0.5;
            const mapPosZ = (activeBody.position.z / WORLD_SIZE) + 0.5;
            document.getElementById('full-map-player-blip').style.left = (mapPosX * 100) + '%';
            document.getElementById('full-map-player-blip').style.top = (mapPosZ * 100) + '%';
            document.getElementById('minimap-texture').style.left = `calc(50% - ${mapPosX * 100}%)`;
            document.getElementById('minimap-texture').style.top = `calc(50% - ${mapPosZ * 100}%)`;
            document.getElementById('minimap-pointer').style.transform = `translate(-50%, -50%) rotate(${-camAngle.x}rad)`;

            if (targetWaypoint) {
                const diffX = targetWaypoint.x - activeBody.position.x;
                const diffZ = targetWaypoint.z - activeBody.position.z;
                document.getElementById('minimap-waypoint-blip').style.left = `calc(50% + ${diffX / 4}px)`;
                document.getElementById('minimap-waypoint-blip').style.top = `calc(50% + ${diffZ / 4}px)`;
            }
        }

        if (currentVehicleType === 'foot') vehicleMesh.position.copy(vehicleBody.position);

        const radius = currentVehicleType === 'foot' ? 12 : 18;
        camera.position.x = activeBody.position.x - radius * Math.sin(camAngle.x) * Math.cos(camAngle.y);
        camera.position.y = activeBody.position.y + (currentVehicleType === 'foot' ? 5 : 7) + radius * Math.sin(camAngle.y);
        camera.position.z = activeBody.position.z - radius * Math.cos(camAngle.x) * Math.cos(camAngle.y);
        camera.lookAt(activeBody.position.x, activeBody.position.y, activeBody.position.z);

        renderer.render(scene, camera);
    }
    animate();

} catch (error) {
    document.body.innerHTML += `<div style="position:absolute;top:10px;left:10px;color:red;background:#fff;padding:15px;z-index:999999;">ERROR: ${error.message}</div>`;
}
