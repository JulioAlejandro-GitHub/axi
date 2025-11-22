(function(window) {
    'use strict';

    async function fGetCamaras(pagina = 1) {
        const contentBody = document.getElementById('fullbody');
        contentBody.innerHTML = `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-2xl font-bold mb-6">Configuración de Cámaras</h1>
                <div id="camara_table_div" class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"></div>
                <div id="paginator-container" class="mt-6">
                    <ul class="flex justify-center items-center -space-x-px h-10 text-base"></ul>
                </div>
            </div>
        `;
        window.UI.loadingSpinner.show();
        const camaraTableDiv = document.getElementById('camara_table_div');

        try {
            const response = await window.VigilanteAPI.getCamaras(pagina);
            const { results: camaras, totalPages } = response;

            if (!camaras || camaras.length === 0) {
                camaraTableDiv.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-12">No se encontraron cámaras.</p>';
                return;
            }

            const headers = Object.keys(camaras[0]);
            let tableHtml = '<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">';
            tableHtml += '<thead class="bg-gray-50 dark:bg-gray-700">';
            tableHtml += '<tr>';
            headers.forEach(header => {
                tableHtml += `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${header}</th>`;
            });
            tableHtml += '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th></tr></thead>';
            tableHtml += '<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">';

            camaras.forEach(cam => {
                tableHtml += `<tr id="camara-row-${cam.ID}">`;
                headers.forEach(header => {
                    const value = cam[header] !== null && cam[header] !== undefined ? cam[header] : '';
                    tableHtml += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">${value}</td>`;
                });
                tableHtml += `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200" onclick='window.CameraManagement.editCamara(${JSON.stringify(cam)})'>Editar</button>
                        <button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" onclick="window.CameraManagement.deleteCamara(${cam.ID}, '${cam.Nombre}')">Eliminar</button>
                    </td>`;
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            camaraTableDiv.innerHTML = tableHtml;

            if (totalPages > 1) {
                window.Utils.renderPaginator('paginator-container', totalPages, pagina, fGetCamaras);
            }

        } catch (error) {
            camaraTableDiv.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Error al cargar datos de cámara: ${error.message}</div>`;
        } finally {
            window.UI.loadingSpinner.hide();
        }
    }

    async function editCamara(data) {
        const createOptions = (options, selectedValue) => options.map(option => `<option value="${option}" ${option === selectedValue ? 'selected' : ''}>${option}</option>`).join('');

        try {
            window.UI.showModal(`Editar Cámara: ${data.Nombre}`, '<p>Cargando configuración...</p>', 'Guardar Cambios', () => saveCamara(data.ID));

            const options = await window.VigilanteAPI.getCamaraOptions();
            const bodyHtml = `
                <form id="editCamaraForm" class="space-y-4">
                    ${Object.keys(data).map(key => {
                        if (key === 'ID') return `<input type="hidden" id="edit-camara-id" value="${data.ID}">`;
                        if (key === 'Ubicacion') {
                            return `<div>
                                        <label for="edit-ubicacion" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Ubicación</label>
                                        <select id="edit-ubicacion" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                            ${createOptions(options.ubicacion || [], data.Ubicacion)}
                                        </select>
                                    </div>`;
                        }
                         if (key === 'Protocolo') {
                             return `<div>
                                        <label for="edit-protocolo" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Protocolo</label>
                                        <select id="edit-protocolo" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                            ${createOptions(options.protocolo || [], data.Protocolo)}
                                        </select>
                                    </div>`;
                        }
                         if (key === 'Estado') {
                             return `<div>
                                        <label for="edit-estado" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Estado</label>
                                        <select id="edit-estado" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                            <option value="activo" ${data.Estado === 'activo' ? 'selected' : ''}>Activo</option>
                                            <option value="inactivo" ${data.Estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                                        </select>
                                    </div>`;
                        }
                        return `<div>
                                    <label for="edit-${key.toLowerCase()}" class="block text-sm font-medium text-gray-700 dark:text-gray-200">${key}</label>
                                    <input type="text" id="edit-${key.toLowerCase()}" value="${data[key]}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                </div>`;
                    }).join('')}
                </form>
            `;
            window.UI.updateModalBody(bodyHtml);

        } catch (error) {
            window.UI.showToast(`Error al cargar la configuración de la cámara: ${error.message}`, 'error');
        }
    }

    async function saveCamara(camaraId) {
        const form = document.getElementById('editCamaraForm');
        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = value;
        });

        try {
            await window.VigilanteAPI.updateCamara(camaraId, data);
            window.UI.showToast('Cámara actualizada correctamente', 'success');
            window.UI.closeModal();
            fGetCamaras();
        } catch (error) {
            window.UI.showToast(`Error al actualizar la cámara: ${error.message}`, 'error');
        }
    }

    async function fGetLiveStream(pagina = 1, filters = {}) {
        const contentBody = document.getElementById('fullbody');
        const filterHtml = `
            <div class="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h2 class="text-lg font-semibold mb-4">Filtros</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label for="livestream-filter-ubicacion" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Ubicación</label>
                        <select id="livestream-filter-ubicacion" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 livestream-filter">
                            <option value="">Todas</option>
                        </select>
                    </div>
                    <div>
                        <label for="livestream-filter-estado" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Estado</label>
                        <select id="livestream-filter-estado" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 livestream-filter">
                            <option value="">Todos</option>
                            <option value="activo" ${filters.estado === 'activo' ? 'selected' : ''}>Activo</option>
                            <option value="inactivo" ${filters.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option>
                        </select>
                    </div>
                    <div>
                        <label for="livestream-filter-protocolo" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Protocolo</label>
                        <select id="livestream-filter-protocolo" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 livestream-filter">
                            <option value="">Todos</option>
                        </select>
                    </div>
                </div>
            </div>`;

        contentBody.innerHTML = `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-2xl font-bold">Cámaras en Vivo</h1>
                <p class="text-gray-600 dark:text-gray-400 mb-6">Las transmisiones se proporcionan a través de HLS y pueden tener un breve retraso.</p>
                ${filterHtml}
                <div id="live-stream-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                 <div id="paginator-container" class="mt-6">
                    <ul class="flex justify-center items-center -space-x-px h-10 text-base"></ul>
                </div>
            </div>`;

        window.VigilanteAPI.getCamaraOptions().then(options => {
            ['ubicacion', 'protocolo'].forEach(key => {
                const select = document.getElementById(`livestream-filter-${key}`);
                if (options[key]) {
                    options[key].forEach(opt => {
                        const selected = filters[key] === opt ? 'selected' : '';
                        select.innerHTML += `<option value="${opt}" ${selected}>${opt}</option>`;
                    });
                }
            });
        }).catch(err => console.error("Fallo al cargar las opciones de filtro de cámara:", err));

        window.UI.loadingSpinner.show();
        try {
            const response = await window.VigilanteAPI.getLiveStreamSources({ pagina, ...filters });
            const container = document.getElementById('live-stream-container');
            const { cameras, totalPages, currentPage } = response;

            if (!cameras || cameras.length === 0) {
                container.innerHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-500 dark:text-gray-400">No se encontraron cámaras con los filtros seleccionados.</p></div>';
                window.Utils.renderPaginator('paginator-container', 0, 1, () => {});
                return;
            }

            container.innerHTML = cameras.map(camera => {
                const statusClass = camera.isCompatible ? 'text-green-500' : 'text-red-500';
                const streamId = `video-stream-${camera.camara_id}`;
                const btnId = `start-stream-${camera.camara_id}`;
                const cardBodyContent = `<div class="bg-black rounded-md h-48 flex items-center justify-center"><video id="${streamId}" class="w-full h-full" controls muted playsinline></video></div>`;

                return `
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                        <div class="p-4 flex justify-between items-start">
                            <div>
                                <h5 class="text-lg font-semibold truncate">${camera.nombre}</h5>
                                <p class="text-sm">Estado: <span class="${statusClass}">${camera.statusMessage}</span></p>
                            </div>
                            <button id="${btnId}" data-camara-id="${camera.camara_id}" class="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Ver stream</button>
                        </div>
                        ${cardBodyContent}
                    </div>`;
            }).join('');

            cameras.forEach(camera => {
                const btn = document.getElementById(`start-stream-${camera.camara_id}`);
                if (!btn) return;
                btn.addEventListener('click', () => startOnDemandStream(camera.camara_id));
            });

            window.Utils.renderPaginator('paginator-container', totalPages, currentPage, (num) => {
                 const currentFilters = {
                    ubicacion: document.getElementById('livestream-filter-ubicacion').value,
                    estado: document.getElementById('livestream-filter-estado').value,
                    protocolo: document.getElementById('livestream-filter-protocolo').value
                };
                fGetLiveStream(num, currentFilters);
            });

        } catch (error) {
            document.getElementById('live-stream-container').innerHTML = `<div class="col-span-full p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Error al cargar las transmisiones en vivo: ${error.message}</div>`;
        } finally {
            window.UI.loadingSpinner.hide();
        }
    }

    document.body.addEventListener('change', function(event) {
        if (event.target.classList.contains('livestream-filter')) {
            const filters = {
                ubicacion: document.getElementById('livestream-filter-ubicacion').value,
                estado: document.getElementById('livestream-filter-estado').value,
                protocolo: document.getElementById('livestream-filter-protocolo').value
            };
            fGetLiveStream(1, filters);
        }
    });

    window.CameraManagement = {
        fGetCamaras,
        editCamara,
        saveCamara,
        deleteCamara: (id, name) => { /* Implement if needed */ },
        fGetLiveStream
    };

    async function startOnDemandStream(camara_id) {
        const videoEl = document.getElementById(`video-stream-${camara_id}`);
        if (!videoEl) return;
        window.UI.loadingSpinner.show();
        let hlsUrl;
        try {
            const resp = await window.VigilanteAPI.startStream(camara_id);
            hlsUrl = resp?.hlsUrl;
        } catch (err) {
            console.warn(`Fallo al solicitar inicio de stream para la cámara ${camara_id}:`, err);
        } finally {
            window.UI.loadingSpinner.hide();
        }

        // fallback: construir URL si el backend no la envía o si la llamada falló
        const finalHlsUrl = hlsUrl || `/public/streams/cam_${camara_id}/stream.m3u8`;
        const fullUrl = finalHlsUrl.startsWith('http') ? finalHlsUrl : (window.VigilanteAPI.baseUrl + finalHlsUrl);

        try {
            if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(fullUrl);
                hls.attachMedia(videoEl);
            } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
                videoEl.src = fullUrl;
            } else {
                throw new Error('HLS no soportado en este navegador');
            }
        } catch (err) {
            window.UI.showToast(`No se pudo iniciar el stream: ${err.message}`, 'error');
        }
    }

})(window);
