// Memastikan Layar Landscape
if (screen.orientation && screen.orientation.lock) {
    screen.orientation.lock('landscape').catch(()=>{});
}

try {
    // ==========================================
    // 1. SISTEM LOADING SCREEN & MANAGER
    // ==========================================
    const loadingScreen = document.getElementById('loading-screen');
    const loadingProgress = document.getElementById('loading-progress');
    const loadingManager = new THREE.LoadingManager();

    loadingManager.onProgress = function(url, itemsLoaded, itemsTotal) {
        loadingProgress.innerText = `Memuat aset: ${itemsLoaded} dari ${itemsTotal}`;
    };

    function hideLoadingScreen() {
        if (loadingScreen.style.display !== 'none') {
            loadingScreen.style.opacity = '0';
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 1500);
        }
    }

    // Jika semua aset berhasil dimuat
    loadingManager.onLoad = function() {
        loadingProgress.innerText = "Dunia Siap!";
        hideLoadingScreen();
    };

    // Timer Paksa (Fallback): Jika lebih dari 8 detik aset macet, paksa masuk game!
    setTimeout(() => {
        hideLoadingScreen();
    }, 8000);

    // ==========================================
    // 2. INISIALISASI THREE.JS & CANNON.JS
    // ==========================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Langit Cerah Nyata (Mencegah Black Screen)
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.0015);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 4000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(200, 500, 200);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const physicsBodies = [];
    const loadedModels = [];
    let playerMesh, playerBody;
    let joystickVector = { x: 0, y: 0 };
    let camAngle = { x: 0, y: 0 };

    // ==========================================
    // 3. PEMBANGUNAN DUNIA & TANAH
    // ==========================================
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(groundBody);

    const groundGeo = new THREE.PlaneGeometry(15000, 15000, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d5e3a, roughness: 0.8 });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const roadGeo = new THREE.PlaneGeometry(35, 12000);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.y = 0.2;
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // ==========================================
    // 4. PEMAIN UTAMA
    // ==========================================
    const shape = new CANNON.Cylinder(1, 1, 4, 12);
    playerBody = new CANNON.Body({ mass: 70, shape: shape });
    playerBody.position.set(0, 5, 0);
    playerBody.fixedRotation = true;
    playerBody.updateMassProperties();
    world.addBody(playerBody);

    const geo = new THREE.CapsuleGeometry(1, 2, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5 });
    playerMesh = new THREE.Mesh(geo, mat);
    playerMesh.castShadow = true;
    scene.add(playerMesh);

    // ==========================================
    // 5. MEMUAT ASET .GLB MENGGUNAKAN MANAGER
    // ==========================================
    if (typeof THREE.GLTFLoader !== 'undefined') {
        const gltfLoader = new THREE.GLTFLoader(loadingManager);
        
        // Ganti nama file di bawah sesuai dengan nama file asli di folder lu
        const realAssetPaths = [
            "assets/models/house_cidadap.glb",
            "assets/models/tree_nature.glb",
            "assets/models/krl_train.glb",
            "assets/models/weapon_m4.glb",
            "assets/models/civillian_npc.glb"
        ];

        realAssetPaths.forEach((path, index) => {
            gltfLoader.load(
                path, 
                (gltf) => {
                    const model = gltf.scene;
                    model.scale.set(5, 5, 5);
                    model.position.set((index - 2) * 30, 0, -index * 500);
                    
                    model.traverse((node) => {
                        if (node.isMesh) {
                            node.castShadow = true;
                            node.receiveShadow = true;
                        }
                    });

                    scene.add(model);
                    loadedModels.push(model);

                    const box = new THREE.Box3().setFromObject(model);
                    const size = box.getSize(new THREE.Vector3());
                    const body = new CANNON.Body({ mass: 0 });
                    body.addShape(new CANNON.Box(new CANNON.Vec3(size.x/2, size.y/2, size.z/2)));
                    body.position.copy(model.position);
                    world.addBody(body);
                    physicsBodies.push({ mesh: model, body: body });
                }, 
                undefined, 
                (error) => {
                    console.log(`Gagal memuat: ${path}, dilewati agar game tidak crash.`);
                }
            );
        });
    }

    // ==========================================
    // 6. KONTROL SENTUH & JOYSTICK
    // ==========================================
    if (typeof nipplejs !== 'undefined') {
        const joystickZone = document.getElementById('joystick-zone');
        if (joystickZone) {
            const joystickManager = nipplejs.create({ 
                zone: joystickZone, 
                mode: 'static', 
                position: { left: '50%', top: '50%' }, 
                color: 'white' 
            });
            joystickManager.on('move', (evt, data) => { 
                if(data && data.vector) joystickVector = { x: data.vector.x, y: data.vector.y }; 
            });
            joystickManager.on('end', () => { joystickVector = { x: 0, y: 0 }; });
        }
    }

    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const touchZone = document.getElementById('camera-touch-zone');

    if (touchZone) {
        touchZone.addEventListener('touchstart', (e) => {
            if(e.touches.length > 0) {
                isDragging = true;
                prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });
        touchZone.addEventListener('touchmove', (e) => {
            if(isDragging && e.touches.length > 0) {
                camAngle.x -= (e.touches[0].clientX - prevMouse.x) * 0.005;
                camAngle.y -= (e.touches[0].clientY - prevMouse.y) * 0.005;
                camAngle.y = Math.max(-Math.PI/2.1, Math.min(Math.PI/2.1, camAngle.y));
                prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });
        touchZone.addEventListener('touchend', () => { isDragging = false; });
    }

    // ==========================================
    // 7. GAME LOOP UTAMA
    // ==========================================
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        world.step(1/60, clock.getDelta(), 3);

        physicsBodies.forEach(obj => {
            obj.mesh.position.copy(obj.body.position);
            obj.mesh.quaternion.copy(obj.body.quaternion);
        });

        if (playerBody) {
            const speed = 14;
            const forward = new THREE.Vector3(Math.sin(camAngle.x), 0, Math.cos(camAngle.x)).normalize();
            const right = new THREE.Vector3(Math.sin(camAngle.x - Math.PI/2), 0, Math.cos(camAngle.x - Math.PI/2)).normalize();
            
            playerBody.velocity.x = (forward.x * joystickVector.y * speed) + (right.x * -joystickVector.x * speed);
            playerBody.velocity.z = (forward.z * joystickVector.y * speed) + (right.z * -joystickVector.x * speed);

            playerMesh.position.copy(playerBody.position);
        }

        const radius = 12;
        const targetX = playerBody ? playerBody.position.x : 0;
        const targetY = playerBody ? playerBody.position.y + 2 : 0;
        const targetZ = playerBody ? playerBody.position.z : 0;

        camera.position.x = targetX - radius * Math.sin(camAngle.x) * Math.cos(camAngle.y);
        camera.position.y = targetY + 3 + radius * Math.sin(camAngle.y);
        camera.position.z = targetZ - radius * Math.cos(camAngle.x) * Math.cos(camAngle.y);
        camera.lookAt(targetX, targetY, targetZ);

        const locText = document.getElementById('location-text');
        if(locText) {
            if (targetZ < -6000) locText.innerText = "Cicurug";
            else if (targetZ < -3000) locText.innerText = "Cipari / Bebera";
            else locText.innerText = "Cidadap";
        }

        renderer.render(scene, camera);
    }

    animate();

} catch (error) {
    document.body.innerHTML += `<div style="position:absolute;top:10px;left:10px;color:red;background:#fff;padding:15px;z-index:999999;font-weight:bold;border:2px solid red;">CRASH: ${error.message}</div>`;
}
