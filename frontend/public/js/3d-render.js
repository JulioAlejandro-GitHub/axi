function render3DModel(button) {
    const modal = document.getElementById('3d-modal');
    const container = document.getElementById('3d-modal-container');

    if (!container || !modal) {
        console.error('3D modal components not found');
        return;
    }

    // Clear previous renders
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    const meshDataString = button.getAttribute('data-mesh');
    const imgSrc = button.getAttribute('data-img-src');

    if (!meshDataString || meshDataString === 'null' || !imgSrc) {
        container.innerHTML = '<p class="text-center p-5">3D mesh data is not available for this image.</p>';
        console.error('Mesh data or image source not found');
        modal.style.display = 'flex';
        return;
    }

    let meshData = '';

    try {
        meshData = JSON.parse(meshDataString);
    } catch (error) {
        container.innerHTML = '<p class="text-center p-5">3D mesh data error JSON.</p>';
        console.error('Mesh data or image source not found');
        modal.style.display = 'flex';
        return;
    }

    if (typeof meshData === 'string') {
        meshData = JSON.parse(meshData);
    }

    // 1. Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // 3. Geometry from mesh data
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(meshData.flat());
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // Center the geometry
    geometry.center();
    geometry.computeVertexNormals();

    // 4. Keypoints
    const pointsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: true });
    const points = new THREE.Points(geometry, pointsMaterial);
    scene.add(points);

    // 5. Initial object rotation and camera position
    // points.rotation.y = Math.PI; // Mirror effect (180 degrees)
    // points.rotation.x = Math.PI / 12; // Chin down effect (15 degrees)
    // camera.position.z = 150;

    points.rotation.y = 0; // Mirror effect (180 degrees)
    points.rotation.x = 15.5; // Chin down effect (15 degrees)
    camera.position.z = 300;

    // 6. Animation and Controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;

    // Handle window resize for the renderer
    const onWindowResize = () => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        }
    };

    // Use a ResizeObserver to handle resize events, as the modal might change size.
    const resizeObserver = new ResizeObserver(onWindowResize);
    resizeObserver.observe(container);

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
    modal.style.display = 'flex';

    // Clean up when the modal is hidden
    const closeModal = () => {
        resizeObserver.disconnect();
        renderer.dispose();
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        modal.style.display = 'none';
        // Remove the event listener to prevent multiple triggers
        modal.querySelector('[onclick*="document.getElementById(\'3d-modal\').style.display=\'none\'"]').removeEventListener('click', closeModal);
    };

    modal.querySelector('[onclick*="document.getElementById(\'3d-modal\').style.display=\'none\'"]').addEventListener('click', closeModal, { once: true });
}
