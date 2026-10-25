if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(()=>{});
}

try {
    const WORLD_SIZE = 3000;

    const WORLD_LOCATIONS = {
        AIRPORT: { x: -800, y: 0, z: -800 },
        STATION_1: { x: 400, y: 0, z: -500 },
        HUNTING_FOREST: { x: 700, y: 0, z: -700 }
    };

    // INVENTARIS BERGAMBAR & ALAT DENGAN RESPON TOMBOL SPESIFIK
    const weaponInventory = [
        { id: 'fist', name: '👊 Tangan Kosong', file: '', sound: 'none', category: 'melee' },
        { id: 'knife', name: '🔪 Pisau Cukur', file: 'assets/models/Knife.glb', sound: 'none', category: 'melee' },
        { id: 'bat', name: '🏏 Tongkat Bisbol', file: 'assets/models/Bat.glb', sound: 'none', category: 'melee' },
        { id: 'pistol', name: '🔫 Pistol', file: 'assets/models/Pistol.glb', sound: 'pistol', category: 'gun', hasScope: false },
        { id: 'rifle', name: '🔫 M16 Rifle', file: 'assets/models/Assault Rifle.glb', sound: 'rifle', category: 'gun', hasScope: true },
        { id: 'sniper', name: '🎯 Sniper AWM', file: 'assets/models/Sniper.glb', sound: 'rifle', category: 'gun', hasScope: true },
        { id: 'jetpack', name: '🎒 Jetpack', file: 'assets/models/Jetpack.glb', sound: 'none', category: 'special' }
    ];

    let equippedItem = weaponInventory[3]; // Default Pistol
    let currentMode = 'foot'; // 'foot', 'car', 'motor', 'plane', 'train'
    let isScopeActive = false;

    // ==========================================
    // 1. SLIDESHOW LOADING SCREEN
    // ==========================================
    const loadingScreen = document.getElementById('loading-screen');
    const mainMenu = document.getElementById('main-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const gameUI = document.getElementById('ui-container');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingManager = new THREE.LoadingManager();

    const loadingImages = ['assets/images/loading1.jpg', 'assets/images/loading2.jpg', 'assets/images/loading3.jpg'];
    let currentSlide = 0;

    const slideInterval = setInterval(() => {
        if (loadingScreen && loadingScreen.style.display !== 'none') {
            currentSlide = (currentSlide + 1) % loadingImages.length;
            loadingScreen.style.backgroundImage = `url('${loadingImages[currentSlide]}')`;
        } else {
            clearInterval(slideInterval);
        }
    }, 1500);

    loadingManager.onProgress = (url, loaded, total) => { if (loadingProgress) loadingProgress.innerText = `Memuat Aset 3D: ${loaded}/${total}`; };
    
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
    setTimeout(() => finishLoading(), 4500);

    // ==========================================
    // 2. ENGINE 3D HALUS & MODEL LUWES (TIDAK KAKU)
    // ==========================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 5000);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Shadow Lembut
    renderer.toneMapping = THREE.LinearToneMapping;
    document.body.appendChild(renderer.domElement);

    const world = new CANNON.World();
    world.gravity.set(0, -9.81, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(500, 1000, 500);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0), -Math.PI/2);
    world.addBody(groundBody);

    // ==========================================
    // 3. PEMUATAN KARAKTER, ANIMASI MIXER & SENJATA
    // ==========================================
    let playerMesh = new THREE.Group(); scene.add(playerMesh);
    const playerBody = new CANNON.Body({ mass: 70, shape: new CANNON.Cylinder(1,1,4,12) });
    playerBody.position.set(0, 5, 0);
    playerBody.fixedRotation = true;
    world.addBody(playerBody);

    let vehicleMesh = new THREE.Group(); scene.add(vehicleMesh);
    const vehicleBody = new CANNON.Body({ mass: 1200, shape: new CANNON.Box(new CANNON.Vec3(1.5, 1, 3)) });
    vehicleBody.position.set(12, 5, 30);
    world.addBody(vehicleBody);

    let mixer = null;
    let walkAction = null;
    let weaponMesh = null;
    let gltfLoader = null;

    if (typeof THREE.GLTFLoader !== 'undefined') {
        gltfLoader = new THREE.GLTFLoader(loadingManager);

        // Memuat Model Karakter Luwes dengan Animasi
        gltfLoader.load("assets/models/Animated Woman.glb", (gltf) => {
            const char = gltf.scene;
            char.position.set(0, -2, 0);
            char.traverse(n => {
                if (n.isMesh) {
                    n.castShadow = true;
                    n.receiveShadow = true;
                }
            });
            playerMesh.add(char);

            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(char);
                walkAction = mixer.clipAction(gltf.animations[0]);
            }
            equipSelectedItem(equippedItem);
        });

        gltfLoader.load("assets/models/SUV.glb", (gltf) => {
            const car = gltf.scene; car.position.set(0,-1,0); car.scale.set(3,3,3);
            vehicleMesh.add(car);
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
    // 4. KONTROL DYNAMIK BERDASARKAN KONDISI (GTA/PUBG/FF)
    // ==========================================
    const btnPrimary = document.getElementById('btn-primary-action');
    const btnSecondary = document.getElementById('btn-secondary-action');
    const btnScope = document.getElementById('btn-scope-action');
    const btnExit = document.getElementById('btn-exit-vehicle');
    const scopeOverlay = document.getElementById('sniper-scope-overlay');

    function updateControlButtonsUI() {
        if (!btnPrimary || !btnSecondary || !btnScope || !btnExit) return;

        btnScope.style.display = 'none';
        btnExit.style.display = 'none';

        if (currentMode === 'foot') {
            if (equippedItem.category === 'gun') {
                btnPrimary.innerText = '🔥 Tembak';
                btnSecondary.innerText = '🦘 Loncat';
                if (equippedItem.hasScope) btnScope.style.display = 'flex';
            } else if (equippedItem.category === 'melee') {
                btnPrimary.innerText = (equippedItem.id === 'knife') ? '🔪 Tebas' : '🏏 Pukul';
                btnSecondary.innerText = '🦘 Loncat';
            } else if (equippedItem.id === 'jetpack') {
                btnPrimary.innerText = '🚀 Terbang';
                btnSecondary.innerText = '🦘 Loncat';
            } else {
                btnPrimary.innerText = '👊 Pukul';
                btnSecondary.innerText = '🦘 Loncat';
            }
        } else if (currentMode === 'car' || currentMode === 'motor') {
            btnPrimary.innerText = '⚡ Gas';
            btnSecondary.innerText = '📢 Klakson';
            btnExit.style.display = 'flex';
        } else if (currentMode === 'plane') {
            btnPrimary.innerText = '🛫 Naik';
            btnSecondary.innerText = '🛬 Turun';
            btnExit.style.display = 'flex';
        }
    }

    if (btnPrimary) {
        btnPrimary.addEventListener('click', () => {
            if (currentMode === 'foot') {
                if (equippedItem.category === 'gun') {
                    // Memicu Suara Tembakan
                    let sfx = audioAssets[equippedItem.sound] || audioAssets.gunshot;
                    if (sfx) { sfx.currentTime = 0; sfx.play().catch(e=>{}); }
                } else if (equippedItem.id === 'jetpack') {
                    playerBody.velocity.y = 16; // Jetpack Terbang
                }
            } else if (currentMode === 'car') {
                vehicleBody.velocity.z += 10; // Akselerasi Mobil
            }
        });
    }

    if (btnSecondary) {
        btnSecondary.addEventListener('click', () => {
            if (currentMode === 'foot') {
                playerBody.velocity.y = 8; // Loncat Normal
            } else if (currentMode === 'car') {
                audioAssets.horn.currentTime = 0;
                audioAssets.horn.play().catch(e=>{});
            }
        });
    }

    if (btnScope) {
        btnScope.addEventListener('click', () => {
            isScopeActive = !isScopeActive;
            if (scopeOverlay) scopeOverlay.style.display = isScopeActive ? 'flex' : 'none';
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

    document.getElementById('btn-start-game')?.addEventListener('click', () => {
        if (mainMenu) mainMenu.style.display = 'none';
        if (gameUI) gameUI.style.display = 'block';
        updateControlButtonsUI();
    });

    // ==========================================
    // 5. KONTROL JOYSTICK & KAMERA
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

    // GAME LOOP UTAMA (ANIMASI HALUS)
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        world.step(1/60, delta, 3);

        if (mixer) mixer.update(delta);

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

        // KAMERA TEROPONG / REGULER
        const radius = isScopeActive ? 1.5 : (currentMode === 'foot' ? 12 : 18);
        camera.position.x = activeBody.position.x - radius * Math.sin(camAngle.x) * Math.cos(camAngle.y);
        camera.position.y = activeBody.position.y + (isScopeActive ? 1.5 : 5) + radius * Math.sin(camAngle.y);
        camera.position.z = activeBody.position.z - radius * Math.cos(camAngle.x) * Math.cos(camAngle.y);
        camera.lookAt(activeBody.position.x, activeBody.position.y + (isScopeActive ? 1.5 : 0), activeBody.position.z);

        renderer.render(scene, camera);
    }
    animate();

} catch (error) {
    document.body.innerHTML += `<div style="position:absolute;top:10px;left:10px;color:red;background:#fff;padding:15px;z-index:999999;">ERROR: ${error.message}</div>`;
}
