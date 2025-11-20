// Self-executing function to avoid polluting the global scope
(function() {
    'use strict';

    // We must use event delegation on a static parent element because the form is loaded dynamically.
    document.body.addEventListener('click', async (event) => {
        const alertPlaceholder = document.getElementById('form-alert-placeholder');
        
        const showAlert = (message, type) => {
            if (!alertPlaceholder) return;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert"><div>${message}</div><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
            alertPlaceholder.innerHTML = '';
            alertPlaceholder.append(wrapper);
        };

        if (event.target.id === 'startWebcamButton') {
            const startWebcamButton = event.target;
            const webcamContainer = document.getElementById('webcam-container');
            const videoElement = document.getElementById('webcam-video');
            
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    videoElement.srcObject = stream;
                    webcamContainer.style.display = 'block';
                    startWebcamButton.textContent = 'Cámara Iniciada';
                    startWebcamButton.disabled = true;
                } catch (error) {
                    console.error("Error accessing webcam:", error);
                    showAlert('No se pudo acceder a la cámara web. Asegúrese de tener una conectada y haber otorgado los permisos.', 'warning');
                }
            } else {
                showAlert('La funcionalidad de cámara web no es soportada por su navegador.', 'danger');
            }
        }

        if (event.target.id === 'capturePhotoButton') {
            const videoElement = document.getElementById('webcam-video');
            const canvasElement = document.getElementById('webcam-canvas');
            const webcamContainer = document.getElementById('webcam-container');
            
            const context = canvasElement.getContext('2d');
            context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            canvasElement.toBlob(blob => {
                // Store blob in a way the submit listener can find it. Using window is a simple way for this self-contained script.
                window.capturedImageBlob = blob;
                showAlert('Foto capturada. Ahora puede enviar el formulario.', 'info');
                if (videoElement.srcObject) {
                    videoElement.srcObject.getTracks().forEach(track => track.stop());
                }
                webcamContainer.style.display = 'none';
            }, 'image/jpeg');
        }
    });

    document.body.addEventListener('submit', async function(event) {
        if (event.target.id !== 'addUserForm') {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        
        const form = event.target;
        const alertPlaceholder = document.getElementById('form-alert-placeholder');

        const showAlert = (message, type) => {
            if (!alertPlaceholder) return;
            const wrapper = document.createElement('div');
            wrapper.innerHTML = `<div class="alert alert-${type} alert-dismissible" role="alert"><div>${message}</div><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
            alertPlaceholder.innerHTML = '';
            alertPlaceholder.append(wrapper);
        };

        form.classList.add('was-validated');
        if (!form.checkValidity()) {
            return;
        }

        const formData = new FormData(form);

        const nombre = document.getElementById('u-nombre').value;
        const email = document.getElementById('u-email').value;
        const password = document.getElementById('u-password').value;
        const tipo = document.getElementById('u-tipo').value;
        const estado = document.getElementById('u-estado').value;
        const gender = document.getElementById('u-gender').value;

        formData.append('nombre', nombre);
        formData.append('email', email);
        formData.append('password', password);
        formData.append('tipo', tipo);
        formData.append('estado', estado);
        formData.append('gender', gender);


        // Append file inputs separately, as they might not be included if no file is selected.
        const pIzquierdo = document.getElementById('PerfilIzquierdo').files[0];
        if (pIzquierdo) {
            formData.append('PerfilIzquierdo', pIzquierdo);
        }

        const pDerecho = document.getElementById('PerfilDerecho').files[0];
        if (pDerecho) {
            formData.append('PerfilDerecho', pDerecho);
        }

        if (window.capturedImageBlob) {
            formData.append('PerfilFrontal', window.capturedImageBlob, 'webcam-frontal.jpg');
            window.capturedImageBlob = null; // Clear after use
        } else {
            const pFrontal = document.getElementById('PerfilFrontal').files[0];
            if (pFrontal) {
                formData.append('PerfilFrontal', pFrontal);
            }
        }
        
        try {
            const result = await window.VigilanteAPI.addUser(formData);
            showAlert(`Usuario creado con éxito! ID: ${result.id}`, 'success');
            form.reset();
            form.classList.remove('was-validated');
            // Clear the captured image blob after successful submission
            if (window.capturedImageBlob) {
                window.capturedImageBlob = null;
            }
        } catch (error) {
            // The API module now standardizes error messages.
            showAlert(error.message, 'danger');
        }
    });
})();
