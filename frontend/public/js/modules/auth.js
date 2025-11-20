(function(window) {
    'use strict';

    let userRole = null;
    let disabledByRole = null;

    const setUserRoleFromToken = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            userRole = null;
            return;
        }
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            userRole = payload.tipo;
            if (userRole !== 'socio') {
                disabledByRole = 'disabled';
            }
        } catch (e) {
            console.error('Error decoding token:', e);
            localStorage.removeItem('token');
            userRole = null;
        }
    };

    const applyRoleRestrictions = () => {
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
    };

    const handleSignOut = async () => {
        try {
            await window.VigilanteAPI.logout();
        } catch (error) {
            console.error('Logout request failed, but proceeding with client-side cleanup.', error);
        } finally {
            localStorage.removeItem('token');
            window.location.href = '/';
        }
    };

    function urlB64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    function subscribeUser(swReg) {
        const vapidPublicKey = 'BIhyFCxbF3D-Wor-F11eezJHZZ3Z1eS9IZEQD0li9mDxV_dt3unW11eZ20EHhQvK0OKYuvaXLARIi1Yjxq8-5ZA';

        if (!vapidPublicKey || vapidPublicKey === 'your_public_vapid_key') {
            console.warn('VAPID public key not configured. Push notification subscription skipped.');
            return;
        }

        const applicationServerKey = urlB64ToUint8Array(vapidPublicKey);
        swReg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey
        })
        .then(subscription => {
            console.log('User is subscribed.');
            fetch('/api/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        })
        .catch(err => {
            console.log('Failed to subscribe the user: ', err);
        });
    }

    window.Auth = {
        setUserRoleFromToken,
        applyRoleRestrictions,
        handleSignOut,
        subscribeUser,
        getUserRole: () => userRole,
        getDisabledByRole: () => disabledByRole
    };

})(window);