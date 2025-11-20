(function(window) {
    'use strict';

    // Expose functions to the global scope to be called by enrollment-logic.js
    const enrollmentUI = {
        updateUIForPose: () => {},
        updateProgressRing: () => {},
        completeEnrollment: () => {}
    };
    window.enrollmentUI = enrollmentUI;


    // DOM Elements
    const videoFeed = document.getElementById('video-feed');
    const progressRing = document.getElementById('progress-ring');
    const statusMessage = document.getElementById('status-message');
    const successMessage = document.getElementById('success-message');

    const circumference = 2 * Math.PI * 45; // 2 * pi * r
    progressRing.style.strokeDasharray = circumference;
    progressRing.style.strokeDashoffset = circumference;


    // Enrollment states and instructions
    const poses = {
        'center': 'Look straight ahead &#128064;',
        'left': 'Turn your head to the left &larr;',
        'right': 'Turn your head to the right &rarr;',
        'up': 'Tilt your head up &uarr;',
        'down': 'Tilt your head down &darr;',
    };
    const poseOrder = ['center', 'left', 'right', 'up', 'down'];

    // Function to update the UI for the current pose
    enrollmentUI.updateUIForPose = function(pose) {
        statusMessage.innerHTML = poses[pose]; // Use innerHTML to render entities
        statusMessage.classList.remove('opacity-0');
        statusMessage.classList.add('opacity-100', 'transition-opacity', 'duration-500');
    }

    // Function to update the progress ring
    enrollmentUI.updateProgressRing = function(progress) {
        const offset = circumference - (progress / poseOrder.length) * circumference;
        progressRing.style.strokeDashoffset = offset;
    }

    // Function to handle enrollment completion
    enrollmentUI.completeEnrollment = function() {
        progressRing.style.stroke = '#22c55e'; // Green color for success
        statusMessage.classList.add('hidden');
        successMessage.classList.remove('hidden');
    }

    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 } } });
            videoFeed.srcObject = stream;
            return new Promise(resolve => videoFeed.onloadedmetadata = resolve);
        } catch (err) {
            console.error("Error accessing camera:", err);
            statusMessage.textContent = 'Camera access denied. Please grant permission.';
        }
    }

    // Initialize when the DOM is loaded
    window.addEventListener('DOMContentLoaded', () => {
        initCamera();
    });

})(window);