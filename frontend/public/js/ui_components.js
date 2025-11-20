(function(window) {
    'use strict';

    // --- Toast Notifications ---
    function showToast(message, type = 'info', duration = 5000) {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed top-5 right-5 z-[100] space-y-2';
            document.body.appendChild(toastContainer);
        }

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        const toast = document.createElement('div');
        toast.className = `max-w-xs w-full ${colors[type]} text-white rounded-lg shadow-lg p-4 flex items-center space-x-3 transform transition-all duration-300 ease-in-out opacity-0 translate-x-10`;

        toast.innerHTML = `<span>${message}</span>`;
        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('opacity-0', 'translate-x-10');
            toast.classList.add('opacity-100', 'translate-x-0');
        }, 10);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.remove('opacity-100', 'translate-x-0');
            toast.classList.add('opacity-0', 'translate-x-10');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // --- Modals ---
    function showModal(title, bodyHtml, confirmText = 'OK', onConfirm = null) {
        document.getElementById('staticBackdropLabel').textContent = title;
        document.getElementById('modal_id_body').innerHTML = bodyHtml;
        const confirmButton = document.getElementById('modal_bottom_ok');
        confirmButton.textContent = confirmText;

        // Clone to remove old listeners
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

        if (onConfirm) {
            newConfirmButton.onclick = () => onConfirm();
        } else {
             newConfirmButton.onclick = () => hideModal();
        }

        document.getElementById('staticBackdrop').style.display = 'flex';
    }

    function hideModal() {
        document.getElementById('staticBackdrop').style.display = 'none';
        modal_reset();
    }

    function updateModalBody(bodyHtml) {
        document.getElementById('modal_id_body').innerHTML = bodyHtml;
    }

    function modal_reset() {
                document.getElementById('staticBackdrop').style.display='none'

        document.getElementById('staticBackdropLabel').textContent = 'Modal Title';
        document.getElementById('modal_id_body').innerHTML = '...';
        const confirmButton = document.getElementById('modal_bottom_ok');
        confirmButton.textContent = 'Understood';
        const newButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newButton, confirmButton);
    }

    function showConfirmationModal(title, body, onConfirm) {
        showModal(title, body, 'Confirm', () => {
            onConfirm();
            hideModal();
        });
        // Override the close button text for confirmation dialogs
        const closeButton = document.querySelector('#staticBackdrop button[onclick="modal_reset()"]');
        if(closeButton) closeButton.textContent = 'Cancel';
    }

    // --- Loading Spinner ---
    const loadingSpinner = {
        show: () => {
            const spinner = document.getElementById('loadingDiv');
            if (spinner) spinner.style.display = 'flex';
        },
        hide: () => {
            const spinner = document.getElementById('loadingDiv');
            if (spinner) spinner.style.display = 'none';
        }
    };

    window.UI = {
        showToast,
        showModal,
        hideModal,
        updateModalBody,
        modal_reset,
        loadingSpinner,
        showConfirmationModal
    };

})(window);