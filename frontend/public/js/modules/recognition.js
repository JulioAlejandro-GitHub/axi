(function(window) {
    'use strict';
    let pathFaceImg = 'http://localhost:8085/public/uploads/faces/';

    async function fSendImg() {
        const contentBody = document.getElementById('fullbody');
        contentBody.innerHTML = `
            <div class="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-200">Reconocimiento por Imagen</h1>
                    <p class="text-gray-600 dark:text-gray-400">Cargue una imagen para identificar personas registradas en el sistema.</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                        <h2 class="text-lg font-semibold mb-4">Cargar Archivo</h2>
                        <form id="recognition-form" class="space-y-4">
                            <div>
                                <label for="camera-select" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Seleccionar Cámara</label>
                                <select id="camera-select" class="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required></select>
                            </div>
                            <div>
                                <label for="image-input" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Archivo de Imagen</label>
                                <input type="file" id="image-input" accept="image/*" class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" required>
                            </div>
                            <button type="submit" class="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                Procesar Imagen
                            </button>
                        </form>
                    </div>

                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col items-center justify-center">
                        <h2 class="text-lg font-semibold mb-4">Previsualización</h2>
                        <div class="w-full max-w-sm h-64 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                             <img id="image-preview" src="../public/img/ico_recognition.jpeg" alt="Previsualización de imagen" class="w-full h-full object-contain">
                        </div>
                    </div>
                </div>

                <div id="results-container" class="mt-6"></div>
            </div>
        `;

        const cameraSelect = document.getElementById('camera-select');
        const imageInput = document.getElementById('image-input');
        const imagePreview = document.getElementById('image-preview');
        const recognitionForm = document.getElementById('recognition-form');
        const resultsContainer = document.getElementById('results-container');

        try {
            const {results:cameras} = await window.VigilanteAPI.getCamaras();
            cameraSelect.innerHTML = '<option value="">-- Seleccione una cámara --</option>';
            cameras.forEach(cam => {
                if (cam.Estado.toLowerCase() === 'activo') {
                    const option = document.createElement('option');
                    option.value = cam.ID;
                    option.textContent = `${cam.Nombre} (${cam.Ubicacion})`;
                    cameraSelect.appendChild(option);
                }
            });
        } catch (error) {
            cameraSelect.innerHTML = '<option value="">Error al cargar cámaras</option>';
            console.error('Error fetching cameras:', error);
        }

        imageInput.addEventListener('change', () => {
            const file = imageInput.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });

        recognitionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const file = imageInput.files[0];
            const camara_id = cameraSelect.value;
            const camara_name = cameraSelect.options[cameraSelect.selectedIndex].text;

            if (!file) {
                window.UI.showToast('Por favor, seleccione una imágen.', 'warning');
                return;
            }
            if (!camara_id) {
                window.UI.showToast('Por favor, seleccione una cámara.', 'warning');
                return;
            }

            window.UI.loadingSpinner.show();
            resultsContainer.innerHTML = '';

            console.log(window.socket)
            // console.log(window.socket.connected)
            

            // if (!window.socket || !window.socket.connected) {
            //     resultsContainer.innerHTML = `
            //         <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
            //             <p class="font-bold">Error de Conexión</p>
            //             <p>No se pudo comunicar con el servidor de notificaciones. Por favor, recargue la página e intente de nuevo.</p>
            //         </div>`;
            //     window.UI.loadingSpinner.hide();
            //     return;
            // }

            const formData = new FormData();
            formData.append('file', file);        // campo que espera /recognize de insightface
            formData.append('camera_id', camara_id);

            resultsContainer.innerHTML = `
                <div class="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md" role="alert">
                    <p class="font-bold">Procesando...</p>
                    <p>Enviando imagen al servidor para análisis.</p>
                </div>`;

            const startTime = performance.now();
            try {
                const result = await sendToInsightface(formData);
                const endTime = performance.now();
                const duration = ((endTime - startTime) / 1000).toFixed(2);

                if (result) {
                    displayRecognitionResult(result, resultsContainer, duration);
                } else {
                    resultsContainer.innerHTML = `
                        <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                            <p class="font-bold">No se recibieron resultados del servidor</p>
                        </div>`;
                }
                window.UI.loadingSpinner.hide();

            } catch (error) {
                resultsContainer.innerHTML = `
                    <div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
                        <p class="font-bold">Error de API</p>
                        <p>${error.message || 'No se pudo encolar la tarea de reconocimiento.'}</p>
                    </div>`;
                window.UI.loadingSpinner.hide();
            }
        });
    }

    const getTypeClasses = (userType) => {
        switch (userType) {
            case 'ladron':
                return {
                    border: 'border-red-500',
                    text: 'text-red-500 dark:text-red-400 font-bold',
                    bg: 'bg-red-100 dark:bg-red-900'
                };
            case 'desconocido':
                return {
                    border: 'border-yellow-500',
                    text: 'text-yellow-500 dark:text-yellow-400',
                    bg: 'bg-yellow-100 dark:bg-yellow-900'
                };
            case 'socio':
                return {
                    border: 'border-green-500',
                    text: 'text-green-600 dark:text-green-400',
                    bg: 'bg-green-100 dark:bg-green-900'
                };
            default:
                return {
                    border: 'border-gray-300 dark:border-gray-600',
                    text: 'text-gray-600 dark:text-gray-300',
                    bg: 'bg-white dark:bg-gray-800'
                };
        }
    };


    function displayRecognitionResult(result, container, duration) {
        if (!result || result.personasDetectadas === 0) {
            container.innerHTML = `
                <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-md" role="alert">
                    <p class="font-bold">Proceso Finalizado</p>
                    <p>No se detectaron rostros en la imagen. Tiempo de procesamiento: ${duration} segundos.</p>
                </div>`;
            return;
        }

        const { personasDetectadas, personasIdentificadas, personasDesconocidas } = result;

        const summaryHtml = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                <h2 class="text-xl font-bold mb-4">Resumen del Reconocimiento</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Tiempo de Procesamiento</p>
                        <p class="text-2xl font-semibold">${duration}s</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Rostros Detectados</p>
                        <p class="text-2xl font-semibold">${personasDetectadas}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Identificados</p>
                        <p class="text-2xl font-semibold text-green-600">${personasIdentificadas.length}</p>
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Desconocidos</p>
                        <p class="text-2xl font-semibold text-yellow-600">${personasDesconocidas.length}</p>
                    </div>
                </div>
            </div>`;

        let cardsHTML = '';
        if (personasIdentificadas.length > 0) {
            personasIdentificadas.forEach(person => {
                const typeClasses = getTypeClasses(person.usuario_tipo);
                const confidence = (person.similarity * 100).toFixed(2);
                cardsHTML += `
                    <div class="border-2 ${typeClasses.border} ${typeClasses.bg} rounded-lg shadow-lg overflow-hidden">
                        <div class="relative w-full h-56">
                            <img class="w-full h-full object-cover" src="${pathFaceImg}${person.img}" alt="Foto de ${person.usuario_nombre}">
                            <div class="absolute top-2 right-2">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white">
                                    ${confidence}% Confianza
                                </span>
                            </div>
                        </div>
                        <div class="p-4">
                            <h5 class="text-lg font-bold truncate">${person.usuario_nombre} #${person.usuario_id}</h5>
                            <h6 class="text-sm font-medium ${typeClasses.text} mb-2 capitalize">${person.usuario_tipo}</h6>
                            <div class="flex justify-between items-center mt-4">
                                <a href="#access-editor/${person.usuario_id}" class="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Ver Perfil</a>
                            </div>
                        </div>
                    </div>`;
            });
        }

        if (personasDesconocidas.length > 0) {
            personasDesconocidas.forEach((unknown, index) => {
                const typeClasses = getTypeClasses('desconocido');
                cardsHTML += `
                     <div class="border-2 ${typeClasses.border} ${typeClasses.bg} rounded-lg shadow-lg overflow-hidden">
                        <div class="relative w-full h-56">
                            <img class="w-full h-full object-cover" src="${pathFaceImg}${unknown.img}" alt="Rostro desconocido ${index + 1}">
                        </div>
                        <div class="p-4">
                            <h5 class="text-lg font-bold truncate">Desconocido #${index + 1}</h5>
                            <h6 class="text-sm font-medium ${typeClasses.text} mb-2 capitalize">Desconocido</h6>
                             <p class="text-xs text-gray-500 dark:text-gray-400">Este rostro no coincide con ninguna persona registrada.</p>
                        </div>
                    </div>`;
            });
        }

        const fullHTML = `
            ${summaryHtml}
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                ${cardsHTML}
            </div>
        `;

        container.innerHTML = fullHTML;
    }

    async function sendToInsightface(formData) {
        const url = window.INSIGHTFACE_URL || 'http://localhost:8010/recognize';
        const resp = await fetch(url, {
            method: 'POST',
            body: formData,
        });
        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Reconocimiento falló (${resp.status}): ${txt}`);
        }
        return resp.json();
    }

    window.Recognition = {
        fSendImg
    };

})(window);
