// --- LOGIKA UTAMA & RENDERER THREE.JS AMAN MOBILE ---
window.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('game-container');
    if (!container) return;

    // Pastikan THREE sudah dimuat
    if (typeof THREE === 'undefined') {
        container.innerHTML = "<div style='color:white; padding:20px; text-align:center;'>Gagal memuat pustaka 3D. Periksa koneksi internet saat pertama kali buka.</div>";
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

    // Jalan Raya
    const roadGeometry = new THREE.PlaneGeometry(12, 500);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = 250;
    scene.add(road);

    // Objek Kendaraan Pemain
    const playerGeometry = new THREE.BoxGeometry(1.6, 1.2, 3.2);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xcc2222 });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(0, 0.6, 5);
    scene.add(player);

    let moveForward = false;
    let moveBackward = false;
    let turnLeft = false;
    let turnRight = false;
    let playerSpeed = 0;
    const maxSpeed = 0.6;
    const acceleration = 0.012;
    const deceleration = 0.015;
    let playerAngle = 0;

    // Kontrol Joystick
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

    // Tombol Gas & Rem
    const btnGas = document.getElementById('btn-gas');
    const btnBrake = document.getElementById('btn-brake');

    if (btnGas) {
        btnGas.addEventListener('touchstart', () => { moveForward = true; });
        btnGas.addEventListener('touchend', () => { moveForward = false; });
    }
    if (btnBrake) {
        btnBrake.addEventListener('touchstart', () => { moveBackward = true; });
        btnBrake.addEventListener('touchend', () => { moveBackward = false; });
    }

    // Loop Animasi
    function animate() {
        requestAnimationFrame(animate);

        if (moveForward) {
            playerSpeed = Math.min(playerSpeed + acceleration, maxSpeed);
        } else if (moveBackward) {
            playerSpeed = Math.max(playerSpeed - acceleration, -maxSpeed / 2);
        } else {
            if (playerSpeed > 0) playerSpeed = Math.max(playerSpeed - deceleration, 0);
            if (playerSpeed < 0) playerSpeed = Math.min(playerSpeed + deceleration, 0);
        }

        if (turnLeft) playerAngle += 0.035;
        if (turnRight) playerAngle -= 0.035;

        player.rotation.y = playerAngle;
        player.translateZ(playerSpeed);

        const cameraOffset = new THREE.Vector3(
            Math.sin(playerAngle) * -8,
            4,
            Math.cos(playerAngle) * -8
        );
        camera.position.copy(player.position).add(cameraOffset);
        camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1, 0)));

        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
});
