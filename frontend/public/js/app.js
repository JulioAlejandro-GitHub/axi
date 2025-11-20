/**
 * @file Main entry point for the Vigilante frontend application.
 * @author Jules
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize API and UI services
    const api = window.VigilanteAPI;
    const ui = window.UI;

    if (!api || !ui) {
        console.error('Core components (API or UI) are not loaded.');
        return;
    }

    // 2. Initialize Socket.IO connection
    const socket = io('http://localhost:8085', {
        auth: {
            token: localStorage.getItem('token')
        }
    });

    socket.on('connect', () => {
        console.log('Connected to WebSocket server with ID:', socket.id);
        // Initialize menu now that socket is available
        window.Menu.initialize(socket);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from WebSocket server.');
        ui.showToast('Disconnected from server. Trying to reconnect...', 'warning');
    });

    // 3. Set user role and apply UI restrictions
    const userRole = api.getUserRole();
    if (userRole === 'empleado') {
        const addUserMenu = document.querySelector('[data-section="agregar"]');
        if (addUserMenu && addUserMenu.parentElement) {
            addUserMenu.parentElement.style.display = 'none';
        }
    }
    if (userRole === 'socio') {
        const manageMenu = document.getElementById('manage-menu');
        if (manageMenu) {
            manageMenu.style.display = 'block';
        }
    }

    // 4. The router will handle the active link.

    // 5. Load Google Charts and then initialize the router
    google.charts.load('current', {'packages':['corechart', 'table', 'gauge']});
    google.charts.setOnLoadCallback(() => {
        window.Router.init();
    });

    // 6. Register service worker for push notifications
    if ('serviceWorker' in navigator && 'PushManager' in window) {
        navigator.serviceWorker.register('../public/js/service-worker.js')
            .then(swReg => {
                console.log('Service Worker registered.', swReg);
                swReg.pushManager.getSubscription().then(subscription => {
                    if (subscription === null) {
                        // Not subscribed, so let's subscribe the user
                        window.subscribeUserToPush(swReg);
                    }
                });
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    }
});