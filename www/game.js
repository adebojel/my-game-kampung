if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(()=>{});
}

try {
    // POSISI RUMAH UTAMA CJ / KARAKTER
    const MAIN_HOUSE_POS = { x: 0, y: 1.5, z: 15 };

    let selectedCharacterModel = "assets/models/Animated Man.glb"; // Default Laki-laki

    const weaponInventory = [
        { id: 'fist', name: '👊 Tangan Kosong', file: '', sound: 'none', category: 'melee' },
        { id: 'knife', name: '🔪 Pisau Cukur', file: 'assets/models/Knife.glb', sound: 'none', category: 'melee' },
        { id: 'bat', name: '🏏 Tongkat Bisbol', file: 'assets/models/Bat.glb', sound: 'none', category: 'melee' },
        { id: 'pistol', name: '🔫 Pistol', file: 'assets/models/Pistol.glb', sound: 'pistol', category: 'gun', hasScope: false },
        { id: 'rifle', name: '🔫 M16 Rifle', file: 'assets/models/Assault Rifle.glb', sound: 'rifle', category: 'gun', hasScope: true },
        { id: 'sniper', name: '🎯 Sniper AWM', file: 'assets/models/Sniper.glb', sound: 'rifle', category: 'gun', hasScope: true },
        { id: 'jetpack', name: '🎒 Jetpack', file: 'assets/models/Jetpack.glb', sound: 'none', category: 'special' }
    ];

    let equippedItem = weaponInventory[3]; 
    let currentMode = 'foot'; 
    let isScopeActive = false;

    // ==========================================
    // 1. SLIDESHOW LOADING SCREEN (4 GAMBAR BERURUTAN)
    // ==========================================
    const loadingScreen = document.getElementById('loading-screen');
    const mainMenu = document.getElementById('main-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const gameUI = document.getElementById('ui-container');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingManager = new THREE.LoadingManager();

    const loadingImages = [
        'assets/images/loading1.jpg',
        'assets/images/loading2.jpg',
        'assets/images/loading3.jpg',
        'assets/images/loading4.jpg'
    ];
    let currentSlide = 0;

    if (loadingScreen) {
        loadingScreen.style.backgroundImage = `url('${loadingImages[0]}')`;
    }

    const slideInterval = setInterval(() => {
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            currentSlide = (currentSlide + 1) % loadingImages.length;
            loadingScreen.style.backgroundImage = `url('${loadingImages[currentSlide]}')`;
        } else {
            clearInterval(slideInterval);
        }
    }, 1200);

    loadingManager.onProgress = (url, loaded, total) => { 
        if (loadingProgress) loadingProgress.innerText = `Memuat Aset: ${loaded}/${total}`; 
    };
    
    function finishLoading() {
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            loadingScreen.style.opacity = '0';
            setTimeout(() => { 
                loadingScreen.style.display = 'none'; 
                if (mainMenu) mainMenu.style.display = 'flex'; 
            }, 600);
        }
    }
    loadingManager.onLoad = () => finishLoading();
    setTimeout(() => finishLoading(), 5000);

    // ==========================================
    // 2. AUDIO & PENGATURAN KARAKTER
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

    audioAssets.backsound.loop = true;
    audioAssets.backsound.volume = 0.5;

    let isRadioPlaying = false;
    document.getElementById('btn-radio-toggle')?.addEventListener('click', () => {
        isRadioPlaying = !isRadioPlaying;
        if (isRadioPlaying) {
            audioAssets.backsound.play().catch(e=>{});
            document.getElementById('btn-radio-toggle').innerText = "📻 Radio: ON";
        } else {
            audioAssets.backsound.pause();
            document.getElementById('btn-radio-toggle').innerText = "📻 Radio: OFF";
        }
    });

    // PENGATURAN BISA DIBUKA & KARAKTER BISA DIGANTI
    document.getElementById('char-selector')?.addEventListener('change', (e) => {
        selectedCharacterModel = e.target.value;
        loadMainCharacterModel(selectedCharacterModel);
    });

    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
        if (mainMenu) mainMenu.style.display = 'none';
        if (settingsMenu) settingsMenu.style.display = 'flex';
    });

    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
        if (settingsMenu) settingsMenu.style.display = 'none';
        if (mainMenu) mainMenu.style.display = 'flex';
    });

    document.getElementById('btn-start-game')?.addEventListener('click', () => {
        if (mainMenu) mainMenu.style.display = 'none';
        if (gameUI) gameUI.style.display = 'block';
        updateControlButtonsUI();
    });

    // TOMBOL RESPRAWN PULANG KE RUMAH UTAMA
    document.getElementById('btn-respawn')?.addEventListener('click', () => {
        if (playerBody) {
            playerBody.position.set(MAIN_HOUSE_POS.x, MAIN_HOUSE_POS.y, MAIN_HOUSE_POS.z);
            playerBody.velocity.set(0, 0, 0);
        }
    });

    // ==========================================
    // 3. ENGINE 3D, FISIKA DENGAN PENGUNCI ROTASI (TIDAK JATUH/JADUL)
    // ==========================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const world = new CANNON.World();
    world.gravity.set(0, -9.81, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(500, 1000, 500);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
    world.addBody(groundBody);

    // ==========================================
    // 4. MEMUAT RUMAH UTAMA & MAP TILE .OBJ
    // ==========================================
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
                scene.add(obj);
            }, undefined, (e)=>console.log(`Tile OBJ error: ${filePath}`));
        }
    }

    // ==========================================
    // 5. PEMUATAN KARAKTER UTAMA, MOBIL & NPC WARGA
    // ==========================================
    let playerMesh = new THREE.Group(); scene.add(playerMesh);
    
    // TABUNG CANNON UNTUK KARAKTER (DIKUNCI AGAR TIDAK BISA GULING / JATUH)
    const playerBody = new CANNON.Body({ mass: 70, shape: new CANNON.Cylinder(0.8, 0.8, 3.2, 12) });
    playerBody.position.set(MAIN_HOUSE_POS.x, MAIN_HOUSE_POS.y, MAIN_HOUSE_POS.z);
    playerBody.fixedRotation = true; // KUNCI ROTASI SANGAT IMPORTANT
    playerBody.updateMassProperties();
    world.addBody(playerBody);

    let vehicleMesh = new THREE.Group(); scene.add(vehicleMesh);
    const vehicleBody = new CANNON.Body({ mass: 1200, shape: new CANNON.Box(new CANNON.Vec3(1.5, 1, 3)) });
    vehicleBody.position.set(10, 3, 20);
    world.addBody(vehicleBody);

    let mixer = null;
    let walkAction = null;
    let weaponMesh = null;
    let gltfLoader = null;
    const npcs = []; // DAFTAR WARGA (NPC)

    if (typeof THREE.GLTFLoader !== 'undefined') {
        gltfLoader = new THREE.GLTFLoader(loadingManager);

        loadMainCharacterModel(selectedCharacterModel);

        // MEMUAT RUMAH UTAMA PADA KOORDINAT KHUSUS
        gltfLoader.load("assets/models/House.glb", (gltf) => {
            const mainHouse = gltf.scene;
            mainHouse.scale.set(4, 4, 4);
            mainHouse.position.set(0, 0, 0); // Kunci Rumah Utama
            scene.add(mainHouse);
        });

        gltfLoader.load("assets/models/SUV.glb", (gltf) => {
            const car = gltf.scene; car.position.set(0,-1,0); car.scale.set(3,3,3);
            vehicleMesh.add(car);
        });

        // MEMUAT NPC WARGA LALU LALANG (AI sederhana)
        for (let i = 0; i < 5; i++) {
            gltfLoader.load("assets/models/Animated Woman.glb", (gltf) => {
                const npcMesh = gltf.scene;
                npcMesh.scale.set(1, 1, 1);
                const randX = (Math.random() - 0.5) * 100;
                const randZ = (Math.random() - 0.5) * 100;
                npcMesh.position.set(randX, 0, randZ);
                scene.add(npcMesh);

                npcs.push({
                    mesh: npcMesh,
                    dir: new THREE.Vector3((Math.random()-0.5), 0, (Math.random()-0.5)).normalize(),
                    speed: 2 + Math.random() * 2
                });
            });
        }
    }

    function loadMainCharacterModel(modelPath) {
        if (!gltfLoader) return;
        
        // Hapus model karakter lama jika ada
        while (playerMesh.children.length > 0) {
            playerMesh.remove(playerMesh.children[0]);
        }

        gltfLoader.load(modelPath, (gltf) => {
            const char = gltf.scene;
            char.position.set(0, -1.6, 0); // Paskan posisi ke alas tabung collider
            playerMesh.add(char);

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(char);
                walkAction = mixer.clipAction(gltf.animations[0]);
            }
            equipSelectedItem(equippedItem);
        });
    }

    function equipSelectedItem(item) {
        equippedItem = item;
        if (weaponMesh) playerMesh.remove(weaponMesh);

        if (item.file && gltfLoader) {
            gltfLoader.load(item.file, (w_gltf) => {
                weaponMesh = w_gltf.scene;
                weaponMesh.scale.set(0.4, 0.4, 0.4);
                weaponMesh.position.set(0.4, 0.8, 0.6);
                weaponMesh.rotation.y = Math.PI / 2;
                playerMesh.add(weaponMesh);
            });
        }
        updateControlButtonsUI();
    }

    // ==========================================
    // 6. SCOPE TEROPONG & UI BUTTONS
    // ==========================================
    const btnPrimary = document.getElementById('btn-primary-action');
    const btnSecondary = document.getElementById('btn-secondary-action');
    const btnScope = document.getElementById('btn-scope-action');
    const btnExit = document.getElementById('btn-exit-vehicle');
    const scopeOverlay = document.getElementById('sniper-scope-overlay');
    const labelPrimary = document.getElementById('label-primary');

    function updateControlButtonsUI() {
        if (!btnScope || !btnExit || !labelPrimary) return;

        btnScope.style.display = 'none';
        btnExit.style.display = 'none';

        if (currentMode === 'foot') {
            if (equippedItem.category === 'gun') {
                labelPrimary.innerText = 'TEMBAK';
                if (equippedItem.hasScope) btnScope.style.display = 'flex';
            } else if (equippedItem.category === 'melee') {
                labelPrimary.innerText = (equippedItem.id === 'knife') ? 'TEBAS' : 'PUKUL';
            } else if (equippedItem.id === 'jetpack') {
                labelPrimary.innerText = 'TERBANG';
            } else {
                labelPrimary.innerText = 'PUKUL';
            }
        } else if (currentMode === 'car') {
            labelPrimary.innerText = 'GAS';
            btnExit.style.display = 'flex';
        }
    }

    if (scopeOverlay) {
        scopeOverlay.addEventListener('click', () => {
            isScopeActive = false;
            scopeOverlay.style.display = 'none';
            if (playerMesh) playerMesh.visible = true;
        });
    }

    if (btnScope) {
        btnScope.addEventListener('click', (e) => {
            e.stopPropagation();
            isScopeActive = !isScopeActive;
            if (scopeOverlay) scopeOverlay.style.display = isScopeActive ? 'flex' : 'none';
            if (playerMesh) playerMesh.visible = !isScopeActive;
        });
    }

    if (btnPrimary) {
        btnPrimary.addEventListener('click', () => {
            if (currentMode === 'foot') {
                if (equippedItem.category === 'gun') {
                    let sfx = audioAssets[equippedItem.sound] || audioAssets.gunshot;
                    if (sfx) { sfx.currentTime = 0; sfx.play().catch(e=>{}); }
                } else if (equippedItem.id === 'jetpack') {
                    playerBody.velocity.y = 16;
                }
            } else if (currentMode === 'car') {
                vehicleBody.velocity.z += 10;
            }
        });
    }

    if (btnSecondary) {
        btnSecondary.addEventListener('click', () => {
            if (currentMode === 'foot') {
                playerBody.velocity.y = 8;
            } else if (currentMode === 'car') {
                audioAssets.horn.currentTime = 0;
                audioAssets.horn.play().catch(e=>{});
            }
        });
    }

    if (btnExit) {
        btnExit.addEventListener('click', () => {
            currentMode = 'foot';
            playerMesh.visible = true;
            playerBody.position.copy(vehicleBody.position);
            playerBody.position.x += 4;
            if (scopeOverlay) scopeOverlay.style.display = 'none';
            isScopeActive = false;
            updateControlButtonsUI();
        });
    }

    // TAS INVENTARIS
    const inventoryUI = document.getElementById('inventory-ui');
    const inventoryGrid = document.getElementById('inventory-grid');
    
    document.getElementById('btn-open-inventory')?.addEventListener('click', () => {
        if (!inventoryGrid) return;
        inventoryGrid.innerHTML = '';
        weaponInventory.forEach(item => {
            const div = document.createElement('div');
            div.className = `inv-item ${equippedItem.id === item.id ? 'active' : ''}`;
            div.innerText = item.name;
            div.onclick = () => {
                equipSelectedItem(item);
                if (inventoryUI) inventoryUI.style.display = 'none';
            };
            inventoryGrid.appendChild(div);
        });
        if (inventoryUI) inventoryUI.style.display = 'flex';
    });

    document.getElementById('btn-close-inventory')?.addEventListener('click', () => {
        if (inventoryUI) inventoryUI.style.display = 'none';
    });

    // ==========================================
    // 7. KONTROL JOYSTICK & KAMERA
    // ==========================================
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

    // GAME LOOP UTAMA
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        world.step(1/60, delta, 3);

        if (mixer) mixer.update(delta);

        // UPDATE PERGERAKAN NPC WARGA (AI WARGA)
        npcs.forEach(npc => {
            npc.mesh.position.addScaledVector(npc.dir, npc.speed * delta);
            npc.mesh.rotation.y = Math.atan2(npc.dir.x, npc.dir.z);
            if (npc.mesh.position.length() > 150) {
                npc.dir.negate();
            }
        });

        let activeBody = (currentMode === 'foot') ? playerBody : vehicleBody;
        let activeMesh = (currentMode === 'foot') ? playerMesh : vehicleMesh;
        let speed = (currentMode === 'foot') ? 14 : 35;

        if (activeBody) {
            const forward = new THREE.Vector3(Math.sin(camAngle.x), 0, Math.cos(camAngle.x)).normalize();
            const right = new THREE.Vector3(Math.sin(camAngle.x - Math.PI/2), 0, Math.cos(camAngle.x - Math.PI/2)).normalize();

            activeBody.velocity.x = (forward.x * -joystickVector.y * speed) + (right.x * joystickVector.x * speed);
            activeBody.velocity.z = (forward.z * -joystickVector.y * speed) + (right.z * joystickVector.x * speed);

            activeMesh.position.copy(activeBody.position);
            if (joystickVector.x !== 0 || joystickVector.y !== 0) {
                activeMesh.rotation.y = Math.atan2(activeBody.velocity.x, activeBody.velocity.z);
                if (walkAction && !walkAction.isRunning()) walkAction.play();
            } else {
                if (walkAction && walkAction.isRunning()) walkAction.stop();
            }
        }

        // KAMERA SCOPE TEROPONG
        if (isScopeActive) {
            camera.position.x = playerBody.position.x + 0.2 * Math.cos(camAngle.x);
            camera.position.y = playerBody.position.y + 1.2;
            camera.position.z = playerBody.position.z + 0.2 * Math.sin(camAngle.x);
            
            const targetX = camera.position.x + 100 * Math.sin(camAngle.x) * Math.cos(camAngle.y);
            const targetY = camera.position.y + 100 * Math.sin(camAngle.y);
            const targetZ = camera.position.z + 100 * Math.cos(camAngle.x) * Math.cos(camAngle.y);
            camera.lookAt(targetX, targetY, targetZ);
        } else {
            const radius = (currentMode === 'foot' ? 10 : 16);
            camera.position.x = activeBody.position.x - radius * Math.sin(camAngle.x) * Math.cos(camAngle.y);
            camera.position.y = activeBody.position.y + (currentMode === 'foot' ? 4 : 7) + radius * Math.sin(camAngle.y);
            camera.position.z = activeBody.position.z - radius * Math.cos(camAngle.x) * Math.cos(camAngle.y);
            camera.lookAt(activeBody.position.x, activeBody.position.y + 1, activeBody.position.z);
        }

        renderer.render(scene, camera);
    }
    animate();

} catch (error) {
    document.body.innerHTML += `<div style="position:absolute;top:10px;left:10px;color:red;background:#fff;padding:15px;z-index:999999;">ERROR: ${error.message}</div>`;
}