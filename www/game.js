if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(()=>{});
}

try {
    // ==========================================
    // 1. DATA PETA & ASET UTAMA
    // ==========================================
    const autoGenAssets = [
        { file: "assets/models/House.glb", type: "enterable", scale: 4, count: 8, radiusSpread: 300 },
        { file: "assets/models/Store.glb", type: "enterable", scale: 4, count: 3, radiusSpread: 150 },
        { file: "assets/models/Trees.glb", type: "solid", scale: 3, count: 30, radiusSpread: 400 },
        { file: "assets/models/Streetlight.glb", type: "solid", scale: 2, count: 12, radiusSpread: 300 }
    ];
    
    let FILE_KARAKTER = "assets/models/Animated Woman.glb";
    const FILE_MOBIL = "assets/models/SUV.glb";
    const FILE_SENJATA = "assets/models/Assault Rifle.glb";
    const WORLD_SIZE = 3000; 

    // ==========================================
    // 2. SISTEM MENU, PERIZINAN, RADIO & ANIMASI
    // ==========================================
    const loadingScreen = document.getElementById('loading-screen');
    const mainMenu = document.getElementById('main-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const gameUI = document.getElementById('ui-container');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingManager = new THREE.LoadingManager();

    let playerCash = 500000;
    let wantedStars = 0;

    // Sistem Radio Audio HTML5
    const gameAudio = document.getElementById('game-audio');
    const btnRadio = document.getElementById('btn-radio-toggle');
    let isRadioPlaying = false;

    function toggleRadio(play) {
        if (play !== undefined) isRadioPlaying = play;
        else isRadioPlaying = !isRadioPlaying;

        if (isRadioPlaying) {
            gameAudio.play().catch(e => console.log("Autoplay diblokir browser:", e));
            btnRadio.innerText = "📻 Radio: ON";
            btnRadio.style.color = "#2ecc71";
            btnRadio.style.borderColor = "#2ecc71";
        } else {
            gameAudio.pause();
            btnRadio.innerText = "📻 Radio: OFF";
            btnRadio.style.color = "#f39c12";
            btnRadio.style.borderColor = "#f39c12";
        }
    }

    btnRadio.addEventListener('click', () => toggleRadio());

    // Tombol Izin Interaktif
    document.getElementById('perm-storage').addEventListener('click', (e) => {
        e.target.innerText = 'DIZINKAN';
        e.target.classList.add('granted');
    });
    document.getElementById('perm-audio').addEventListener('click', (e) => {
        e.target.innerText = 'DIZINKAN';
        e.target.classList.add('granted');
        toggleRadio(true);
    });

    // Pilihan Karakter dari Pengaturan
    document.getElementById('char-selector').addEventListener('change', (e) => {
        FILE_KARAKTER = e.target.value;
    });

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

    loadingManager.onProgress = (url, loaded, total) => { loadingProgress.innerText = `Memuat Aset: ${loaded}/${total}`; };
    loadingManager.onLoad = () => { 
        loadingScreen.style.opacity = '0'; 
        setTimeout(() => { loadingScreen.style.display = 'none'; mainMenu.style.display = 'flex'; }, 1000); 
    };
    setTimeout(() => { 
        if(loadingScreen.style.display !== 'none') {
            loadingScreen.style.display = 'none'; mainMenu.style.display = 'flex'; 
        }
    }, 15000);

    // ==========================================
    // 3. ENGINE 3D, KAMERA & MEMUAT 12 TILE PETA .OBJ
    // ==========================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); 
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(500, 1000, 500);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
    world.addBody(groundBody);

    // MEMUAT 12 POTONGAN PETA CICURUG (.OBJ) SECARA OTOMATIS
    if (typeof THREE.OBJLoader !== 'undefined') {
        const objLoader = new THREE.OBJLoader(loadingManager);
        const GRID_COLS = 4;
        const TILE_SIZE = 1000;
        const offsetX = ((GRID_COLS - 1) * TILE_SIZE) / 2;
        const offsetZ = ((Math.ceil(12 / GRID_COLS) - 1) * TILE_SIZE) / 2;

        for (let i = 1; i <= 12; i++) {
            const filePath = `assets/models/map_tiles/tile_${i}.obj`;
            objLoader.load(filePath, (obj) => {
                const col = (i - 1) % GRID_COLS;
                const row = Math.floor((i - 1) / GRID_COLS);

                obj.position.x = (col * TILE_SIZE) - offsetX;
                obj.position.z = (row * TILE_SIZE) - offsetZ;
                obj.position.y = 0;

                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.receiveShadow = true;
                        child.castShadow = true;
                    }
                });

                scene.add(obj);
            }, undefined, (err) => console.log(`Gagal memuat ${filePath}`));
        }
    }

    // ==========================================
    // 4. PEMUATAN KARAKTER (DENGAN ANIMATION MIXER), SENJATA & MOBIL
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

    let weaponMesh = null;
    let isHoldingWeapon = false;
    let mixer = null;
    let walkAction = null;

    if (typeof THREE.GLTFLoader !== 'undefined') {
        const gltfLoader = new THREE.GLTFLoader(loadingManager);
        
        gltfLoader.load(FILE_KARAKTER, (gltf) => {
            const char = gltf.scene; char.position.set(0,-2,0);
            char.traverse(n => { if(n.isMesh) n.castShadow=true; });
            playerMesh.add(char);

            // AKTIFKAN ANIMASI WALK/RUN DARI GLTF
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(char);
                walkAction = mixer.clipAction(gltf.animations[0]);
            }
            
            gltfLoader.load(FILE_SENJATA, (w_gltf) => {
                weaponMesh = w_gltf.scene;
                weaponMesh.scale.set(0.4, 0.4, 0.4);
                weaponMesh.position.set(0.4, 0.8, 0.6);
                weaponMesh.rotation.y = Math.PI / 2;
                playerMesh.add(weaponMesh);
                isHoldingWeapon = true;
            }, undefined, ()=>console.log("Model senjata dimuat"));
        }, undefined, ()=>console.log("Karakter belum dimuat"));

        gltfLoader.load(FILE_MOBIL, (gltf) => {
            const car = gltf.scene; car.position.set(0,-1,0); car.scale.set(3,3,3);
            car.traverse(n => { if(n.isMesh) n.castShadow=true; });
            vehicleMesh.add(car);
        }, undefined, ()=>console.log("Mobil belum dimuat"));

        autoGenAssets.forEach(asset => {
            gltfLoader.load(asset.file, (gltf) => {
                for (let i = 0; i < asset.count; i++) {
                    const model = gltf.scene.clone();
                    model.scale.set(asset.scale, asset.scale, asset.scale);
                    const randX = (Math.random() - 0.5) * asset.radiusSpread;
                    const randZ = (Math.random() - 0.5) * asset.radiusSpread;
                    model.position.set(randX, 0, randZ);
                    scene.add(model);

                    if (asset.type === "solid") {
                        const box = new THREE.Box3().setFromObject(model);
                        const size = box.getSize(new THREE.Vector3());
                        const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2)) });
                        body.position.copy(model.position);
                        body.position.y += size.y/2;
                        world.addBody(body);
                    }
                }
            });
        });
    }

    // ==========================================
    // 5. SISTEM MENEMBAK & EFEK PELURU
    // ==========================================
    const bullets = [];
    function shootWeapon() {
        if (!isHoldingWeapon || currentVehicleType !== 'foot') return;
        
        const bulletGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const bulletMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeo, bulletMat);

        bullet.position.copy(playerMesh.position).add(new THREE.Vector3(0, 1.2, 0));
        
        const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), playerMesh.rotation.y);
        bullet.velocity = dir.multiplyScalar(3.5);
        
        scene.add(bullet);
        bullets.push(bullet);

        if (weaponMesh) {
            weaponMesh.position.z -= 0.2;
            setTimeout(() => { weaponMesh.position.z = 0.6; }, 100);
        }
    }

    // ==========================================
    // 6. KONTROL INTERAKSI & JOYSTICK (PERBAIKAN ARAH MAJU/MUNDUR)
    // ==========================================
    let currentVehicleType = 'foot'; 
    const btnAction = document.getElementById('btn-action');
    const btnJump = document.getElementById('btn-jump');

    btnAction.addEventListener('click', () => {
        if (currentVehicleType === 'foot' && playerBody.position.distanceTo(vehicleBody.position) < 8) {
            currentVehicleType = 'car';
            playerMesh.visible = false;
            playerBody.position.set(0, -100, 0); 
            btnAction.innerText = 'Turun'; 
            btnJump.innerText = 'Klakson';
            toggleRadio(true); // Otomatis nyalakan radio saat naik mobil
        } else if (currentVehicleType === 'car') {
            currentVehicleType = 'foot';
            playerMesh.visible = true;
            playerBody.position.copy(vehicleBody.position);
            playerBody.position.x += 4;
            btnAction.innerText = 'Naik'; 
            btnJump.innerText = 'Loncat';
        }
    });

    btnJump.addEventListener('click', () => {
        if (currentVehicleType === 'foot' && isHoldingWeapon) {
            shootWeapon();
        } else if (currentVehicleType === 'foot') {
            playerBody.velocity.y = 8;
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
                camAngle.x += (e.touches[0].clientX - prevMouse.x) * 0.005;
                camAngle.y += (e.touches[0].clientY - prevMouse.y) * 0.005;
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
    // 7. GAME LOOP UTAMA (TICK)
    // ==========================================
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        world.step(1/60, delta, 3);

        if (mixer) mixer.update(delta);

        const activeBody = (currentVehicleType === 'foot') ? playerBody : vehicleBody;
        const activeMesh = (currentVehicleType === 'foot') ? playerMesh : vehicleMesh;
        const speed = (currentVehicleType === 'foot') ? 14 : 35; 

        if (activeBody) {
            const forward = new THREE.Vector3(Math.sin(camAngle.x), 0, Math.cos(camAngle.x)).normalize();
            const right = new THREE.Vector3(Math.sin(camAngle.x - Math.PI/2), 0, Math.cos(camAngle.x - Math.PI/2)).normalize();
            
            // PERBAIKAN Arah Vektor Joystick (Ditarik ke depan = Karakter Maju)
            activeBody.velocity.x = (forward.x * -joystickVector.y * speed) + (right.x * joystickVector.x * speed);
            activeBody.velocity.z = (forward.z * -joystickVector.y * speed) + (right.z * joystickVector.x * speed);

            activeMesh.position.copy(activeBody.position);
            if (joystickVector.x !== 0 || joystickVector.y !== 0) {
                activeMesh.rotation.y = Math.atan2(activeBody.velocity.x, activeBody.velocity.z);
                if (walkAction && !walkAction.isRunning()) walkAction.play();
            } else {
                if (walkAction && walkAction.isRunning()) walkAction.stop();
            }

            for (let i = bullets.length - 1; i >= 0; i--) {
                bullets[i].position.add(bullets[i].velocity);
                if (bullets[i].position.distanceTo(activeMesh.position) > 300) {
                    scene.remove(bullets[i]);
                    bullets.splice(i, 1);
                }
            }

            const mapPosX = (activeBody.position.x / WORLD_SIZE) + 0.5;
            const mapPosZ = (activeBody.position.z / WORLD_SIZE) + 0.5;
            document.getElementById('full-map-player-blip').style.left = (mapPosX * 100) + '%';
            document.getElementById('full-map-player-blip').style.top = (mapPosZ * 100) + '%';
            document.getElementById('minimap-texture').style.left = `calc(50% - ${mapPosX * 100}%)`;
            document.getElementById('minimap-texture').style.top = `calc(50% - ${mapPosZ * 100}%)`;
            document.getElementById('minimap-pointer').style.transform = `translate(-50%, -50%) rotate(${-camAngle.x}rad)`;
            document.getElementById('player-cash').innerText = `Rp ${playerCash.toLocaleString()}`;
            document.getElementById('wanted-stars').innerText = `⭐ ${wantedStars}`;

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
