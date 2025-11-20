(function(window) {
    'use strict';

    const video = document.getElementById('video-feed');
    const overlayCanvas = document.getElementById('overlay-canvas');

    let human;
    let userId;
    let currentPose = 'center';
    const requiredPoses = ['center', 'left', 'right', 'up', 'down'];
    let capturedPoses = new Set();

    const humanConfig = {
        backend: 'webgl',
        modelBasePath: 'https://vladmandic.github.io/human-models/models/',
        face: {
            detector: { enabled: true },
            mesh: { enabled: true },
            iris: { enabled: true },
            emotion: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
    };

    function redirectToUserManagement() {
        // Add a delay to allow the user to see the success message
        setTimeout(() => {
            window.location.href = '/public/app.html#user-management';
        }, 2000);
    }

    async function init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            userId = 1353; // Hardcoded for now: urlParams.get('user_id');

            // This logic is simplified as we are not using the phone enrollment anymore
            await startWebcamEnrollment();

        } catch (error) {
            console.error('Initialization failed:', error);
            // Use the new UI to display the error
            window.enrollmentUI.updateUIForPose('Error: Could not initialize.');
        }
    }

    async function startWebcamEnrollment() {
        human = new Human.Human(humanConfig);
        await human.load();

        // Wait for the camera to be ready (initialized in enrollment.js)
        await new Promise(resolve => {
            if (video.readyState >= 3) {
                resolve();
            } else {
                video.onloadeddata = resolve;
            }
        });

        overlayCanvas.width = video.videoWidth;
        overlayCanvas.height = video.videoHeight;

        await runDetection();
    }

    async function runDetection() {
        if (capturedPoses.size === requiredPoses.length) {
            window.enrollmentUI.completeEnrollment();
            redirectToUserManagement();
            return;
        }

        currentPose = requiredPoses.find(pose => !capturedPoses.has(pose));
        window.enrollmentUI.updateUIForPose(currentPose);
        window.enrollmentUI.updateProgressRing(capturedPoses.size);

        const detection = await human.detect(video);
        const face = detection.face[0];

        if (face) {
            drawFaceFeedback(face);
            checkPoseAndCapture(face);
        } else {
            clearCanvas();
        }

        requestAnimationFrame(runDetection);
    }

    function checkPoseAndCapture(face) {
        const yaw = face.rotation.angle.yaw;
        const pitch = face.rotation.angle.pitch;
        let poseDetected = false;

        switch (currentPose) {
            case 'center':
                if (Math.abs(yaw) < 0.15 && Math.abs(pitch) < 0.15) poseDetected = true;
                break;
            case 'left':
                if (yaw < -0.4) poseDetected = true;
                break;
            case 'right':
                if (yaw > 0.4) poseDetected = true;
                break;
            case 'up':
                if (pitch > 0.3) poseDetected = true;
                break;
            case 'down':
                if (pitch < -0.3) poseDetected = true;
                break;
        }

        if (poseDetected) {
            capturePose();
        }
    }

    function drawFaceFeedback(face) {
        const ctx = overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        // Draw a simple bounding box instead of the full mesh to avoid performance issues.
        ctx.strokeStyle = '#22c55e'; // Green color for the box
        ctx.lineWidth = 4;
        const [x, y, width, height] = face.box;
        ctx.strokeRect(x, y, width, height);
    }

    function clearCanvas() {
        const ctx = overlayCanvas.getContext('2d');
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }

    async function capturePose() {
        if (capturedPoses.has(currentPose)) return;

        capturedPoses.add(currentPose);
        window.enrollmentUI.updateProgressRing(capturedPoses.size);

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        canvas.toBlob(blob => sendToServer(blob, currentPose), 'image/jpeg');

        if (capturedPoses.size === requiredPoses.length) {
            window.enrollmentUI.completeEnrollment();
            redirectToUserManagement();
        }
    }

    async function sendToServer(blob, pose) {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found in localStorage.');
            return;
        }
        const formData = new FormData();
        formData.append('archivo', blob, `${userId}_${pose}.jpg`);
        formData.append('user_id', userId);
        formData.append('pose', pose);

        try {
            // This fetch is kept for functionality but won't be tested here.
            // http://localhost:8085/vigilante/auth/login
            const response = await fetch(`http://localhost:8085/vigilante/recognition/enroll`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            if (!response.ok) {
                console.error(`Failed to enroll pose "${pose}":`, await response.text());
                capturedPoses.delete(pose); // Re-try this pose
            } else {
                console.log(`Pose "${pose}" enrolled successfully.`);
            }
        } catch (error) {
            console.error(`Error sending pose "${pose}" to server:`, error);
        }
    }

    window.addEventListener('DOMContentLoaded', init);

})(window);