(function(window) {
    'use strict';

    let socket;

    const initialize = (ioSocket) => {
        socket = ioSocket;
        document.getElementById('vmenu').addEventListener('click', handleMenuClick);
        document.getElementById('singoutbtn').addEventListener('click', window.Auth.handleSignOut);
    };

    const handleMenuClick = (event) => {
        event.preventDefault();
        const target = event.target;
        const section = target.dataset.section;
        if (section) {
            updateActiveMenu(target);
            window.location.hash = section;
        }
    };

    const updateActiveMenu = (target) => {
        const menu = document.getElementById('vmenu');
        menu.querySelectorAll('.nav-link, .dropdown-item').forEach(link => link.classList.remove('active'));
        menu.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('text-white');
            link.classList.add('text-secondary');
        });

        target.classList.add('active');
        if (target.matches('.nav-link:not(.dropdown-toggle)')) {
            target.classList.add('text-white');
            target.classList.remove('text-secondary');
        } else if (target.matches('.dropdown-item')) {
            const parentToggle = target.closest('.dropdown').querySelector('.nav-link');
            parentToggle.classList.add('active', 'text-white');
            parentToggle.classList.remove('text-secondary');
        }
    };

    const updateActiveMenuFromHash = (hash) => {
        const section = hash.substring(1);
        const menu = document.getElementById('vmenu');
        const target = menu.querySelector(`[data-section="${section}"]`);
        if (target) {
            updateActiveMenu(target);
        }
    };

    window.Menu = {
        initialize,
        updateActiveMenuFromHash
    };

})(window);