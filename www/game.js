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
    // 2. SISTEM AUDIO HTML5 (RADIO & SFX SENJATA/KLAKSON)
    // ==========================================
    const audioAssets = {
        backsound: new Audio('assets/audio/backsound.mp3'),
        horn: new Audio('assets/audio/horn.mp3'),
        gunshot: new Audio('assets/audio/gunshot.mp3'),
        pistol: new Audio('assets/audio/pistol.mp3'),
        rifle: new Audio('assets/audio/rifle_m16.mp3'),
        shotgun: new Audio('assets/audio/shotgun.mp3'),
        bazooka: new Audio('assets/audio/bazooka.mp3')
    };

    // Pengaturan Backsound Loop & Volume
    audioAssets.backsound.loop = true;
    audioAssets.backsound.volume = 0.5;

    let isRadioPlaying = false;
    const btnRadio = document.getElementById('btn-radio-toggle');

    function toggleRadio(play) {
        if (play !== undefined) isRadioPlaying = play;
        else isRadioPlaying = !isRadioPlaying;

        if (isRadioPlaying) {
            audioAssets.backsound.play().catch(e => console.log("Autoplay diblokir browser:", e));
            if (btnRadio) {
                btnRadio.innerText = "📻 Radio: ON";
                btnRadio.style.color = "#2ecc71";
                btnRadio.style.borderColor = "#2ecc71";
            }
        } else {
            audioAssets.backsound.pause();
            if (btnRadio) {
                btnRadio.innerText = "📻 Radio: OFF";
                btnRadio.style.color = "#f39c12";
                btnRadio.style.borderColor = "#f39c12";
            }
        }
    }

    // Fungsi Play SFX Suara Tembakan Berdasarkan Jenis Senjata
    function playShootSound(weaponType = 'default') {
        let sound;
        switch(weaponType) {
            case 'pistol': sound = audioAssets.pistol; break;
            case 'rifle': sound = audioAssets.rifle; break;
            case 'shotgun': sound = audioAssets.shotgun; break;
            case 'bazooka': sound = audioAssets.bazooka; break;
            default: sound = audioAssets.gunshot; break;
        }
        
        if (sound) {
            sound.currentTime = 0; // Reset agar bisa diputar beruntun tanpa delay
            sound.play().catch(e => console.log("SFX Tembakan error:", e));
        }
    }

    // Fungsi Play SFX Klakson Mobil
    function playHornSound() {
        if (audioAssets.horn) {
            audioAssets.horn.currentTime = 0;
            audioAssets.horn.play().catch(e => console.log("Horn error:", e));
        }
    }

    if (btnRadio) {
        btnRadio.addEventListener('click', () => toggleRadio());
    }

    // ==========================================
    // 3. SISTEM MENU & PERIZINAN
    // ==========================================
    const loadingScreen = document.getElementById('loading-screen');
    const mainMenu = document.getElementById('main-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const gameUI = document.getElementById('ui-container');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingManager = new THREE.LoadingManager();

    let playerCash = 500000;
    let wantedStars = 0;

    // Tombol Izin Interaktif
    const permStorage = document.getElementById('perm-storage');
    const permAudio = document.getElementById('perm-audio');
    if (permStorage) {
        permStorage.addEventListener('click', (e) => {
            e.target.innerText = 'DIZINKAN';
            e.target.classList.add('granted');
        });
    }
    if (permAudio) {
        permAudio.addEventListener('click', (e) => {
            e.target.innerText = 'DIZINKAN';
            e.target.classList.add('granted');
            toggleRadio(true);
        });
    }

    // Pilihan Karakter dari Pengaturan
    const charSelector = document.getElementById('char-selector');
    if (charSelector) {
        charSelector.addEventListener('change', (e) => {
            FILE_KARAKTER = e.target.value;
        });
    }

    const btnStartGame = document.getElementById('btn-start-game');
    if (btnStartGame) {
        btnStartGame.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            gameUI.style.display = 'block';
        });
    }

    const btnOpenSettings = document.getElementById('btn-open-settings');
    if (btnOpenSettings) {
        btnOpenSettings.addEventListener('click', () => {
            mainMenu.style.display = 'none';
            settingsMenu.style.display = 'flex';
        });
    }

    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) {
        btnCloseSettings.addEventListener('click', () => {
            settingsMenu.style.display = 'none';
            mainMenu.style.display = 'flex';
        });
    }

    loadingManager.onProgress = (url, loaded, total) => { if (loadingProgress) loadingProgress.innerText = `Memuat Aset: ${loaded}/${total}`; };
    loadingManager.onLoad = () => { 
        if (loadingScreen) {
            loadingScreen.style.opacity = '0'; 
            setTimeout(() => { loadingScreen.style.display = 'none'; if (mainMenu) mainMenu.style.display = 'flex'; }, 1000); 
        }
    };
    setTimeout(() => { 
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            loadingScreen.style.display = 'none'; if (mainMenu) mainMenu.style.display = 'flex'; 
        }
    }, 15000);

    // ==========================================
    // 4. ENGINE 3D, KAMERA & MEMUAT 12 TILE PETA .OBJ
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
    // 5. PEMUATAN KARAKTER (ANIMASI), SENJATA & MOBIL
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
    let currentWeaponType = 'rifle'; // default jenis senjata
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
    // 6. SISTEM MENEMBAK & EFEK PELURU + AUDIONYA
    // ==========================================
    const bullets = [];
    function shootWeapon() {
        if (!isHoldingWeapon || currentVehicleType !== 'foot') return;
        
        // Putar Suara Tembakan
        playShootSound(currentWeaponType);

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
    // 7. KONTROL INTERAKSI & JOYSTICK
    // ==========================================
    let currentVehicleType = 'foot'; 
    const btnAction = document.getElementById('btn-action');
    const btnJump = document.getElementById('btn-jump');

    if (btnAction) {
        btnAction.addEventListener('click', () => {
            if (currentVehicleType === 'foot' && playerBody.position.distanceTo(vehicleBody.position) < 8) {
                currentVehicleType = 'car';
                playerMesh.visible = false;
                playerBody.position.set(0, -100, 0); 
                btnAction.innerText = 'Turun'; 
                if (btnJump) btnJump.innerText = 'Klakson';
                toggleRadio(true); // Auto-play radio saat naik kendaraan
            } else if (currentVehicleType === 'car') {
                currentVehicleType = 'foot';
                playerMesh.visible = true;
                playerBody.position.copy(vehicleBody.position);
                playerBody.position.x += 4;
                btnAction.innerText = 'Naik'; 
                if (btnJump) btnJump.innerText = 'Tembak / Loncat';
            }
        });
    }

    if (btnJump) {
        btnJump.addEventListener('click', () => {
            if (currentVehicleType === 'foot' && isHoldingWeapon) {
                shootWeapon();
            } else if (currentVehicleType === 'foot') {
                playerBody.velocity.y = 8;
            } else if (currentVehicleType === 'car') {
                playHornSound(); // Memicu klakson saat berada di dalam mobil
            }
        });
    }

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
    const minimapContainer = document.getElementById('minimap-container');
    const closeMapBtn = document.getElementById('close-map-btn');
    const fullMapContainer = document.getElementById('full-map-container');

    if (minimapContainer) minimapContainer.addEventListener('click', () => document.getElementById('full-map-ui').style.display = 'flex');
    if (closeMapBtn) closeMapBtn.addEventListener('click', () => document.getElementById('full-map-ui').style.display = 'none');
    
    if (fullMapContainer) {
        fullMapContainer.addEventListener('click', (e) => {
            const rect = fullMapContainer.getBoundingClientRect();
            const percentX = (e.clientX - rect.left) / rect.width;
            const percentY = (e.clientY - rect.top) / rect.height;

            document.getElementById('full-map-waypoint-blip').style.display = 'block';
            document.getElementById('full-map-waypoint-blip').style.left = (percentX * 100) + '%';
            document.getElementById('full-map-waypoint-blip').style.top = (percentY * 100) + '%';
            document.getElementById('minimap-waypoint-blip').style.display = 'block';

            targetWaypoint = { x: (percentX - 0.5) * WORLD_SIZE, z: (percentY - 0.5) * WORLD_SIZE };
        });
    }

    // ==========================================
    // 8. GAME LOOP UTAMA (TICK)
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
            
            // Perbaikan Arah Vektor Joystick (Ditarik ke depan = Karakter Maju)
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
            
            const fullMapPlayerBlip = document.getElementById('full-map-player-blip');
            const minimapTexture = document.getElementById('minimap-texture');
            const minimapPointer = document.getElementById('minimap-pointer');
            const playerCashEl = document.getElementById('player-cash');
            const wantedStarsEl = document.getElementById('wanted-stars');

            if (fu