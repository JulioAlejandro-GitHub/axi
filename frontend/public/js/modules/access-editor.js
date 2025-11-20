async function editorAccesosOptions(button) {
    const imgSrc = button.getAttribute('data-img-src');
    const option = button.getAttribute('data-option');
    const usuario_id = button.getAttribute('data-usr');
    const acceso_id = parseInt(button.getAttribute('data-id'), 10);

    switch (option) {
        case 'delete':
            window.UI.showConfirmationModal(
                'Confirmar Eliminación',
                `¿Está seguro que desea eliminar el acceso ID: <strong>${acceso_id}</strong>? Esta acción no se puede deshacer.`,
                async () => {
                    window.UI.loadingSpinner.show();
                    try {
                    const response = await window.VigilanteAPI.editorAccesoOptions(acceso_id, 'delete');
                    window.UI.showToast(response.msg, 'success');
                    window.Router.handleHashChange();
                } catch (error) {
                    window.UI.showToast(error.message, 'error');
                } finally {
                    window.UI.loadingSpinner.hide();
                }
            });
            break;
        case 'otro':
            changeFaceToUser(acceso_id, usuario_id, imgSrc);
            break;
    }
}
async function actionAcesosLote(button) {
    const option = button.getAttribute('data-option');
    const usuario_id = button.getAttribute('data-usr-id');
    const imgSrc = button.getAttribute('data-img-src');

    const checkedCheckboxes = document.querySelector('#ImgAcceso-acceso_id').querySelectorAll('input[type="checkbox"]:checked')
    const accesosIds = Array.from(checkedCheckboxes).map(cb => parseInt(cb.value, 10));

    if (accesosIds.length === 0) {
        return window.UI.showToast('Por favor, seleccione al menos una imagen para procesar.', 'warning');
    }

    let checkedImages = [];
    accesosIds.forEach(ids => {
        // Subir en el DOM hasta el div principal que contiene la imagen
        const card = document.querySelector(`#card-id-${ids}`);
        if (card) {
            // Buscar la imagen dentro de esa card
            const img = card.querySelector('img');
        if (img) {
            checkedImages.push(img.src);
        }
        }
    });

    switch (option) {
        case 'delete':
            window.UI.showConfirmationModal(
                'Confirmar Eliminación Múltiple',
                `¿Está seguro que desea eliminar los <strong>${accesosIds.length}</strong> accesos seleccionados?`,
                async () => {
                    window.UI.loadingSpinner.show();
                    try {
                        const deletePromises = accesosIds.map(acceso_id =>
                        window.VigilanteAPI.editorAccesoOptions(acceso_id, 'delete')
                    );
                    const results = await Promise.all(deletePromises);
                    window.UI.showToast(`${results.length} accesos han sido eliminados.`, 'success');
                    window.Router.handleHashChange();
                } catch (error) {
                    window.UI.showToast(`Error al eliminar accesos: ${error.message}`, 'error');
                } finally {
                    window.UI.loadingSpinner.hide();
                }
            });
            break;
        case 'changeImgPerson':
            changeFaceToUser(accesosIds, usuario_id, imgSrc);
            break;
        case 'sendImgToCompreface':
            window.UI.showToast('La funcionalidad de enviar a CompreFace en lote aún no está implementada.', 'info');
            break;
        default:
            window.UI.showToast('Opción no reconocida.', 'error');
    }
}
async function submitChangeFace(accesos, usuario_id_actual) {
    const isBatch = Array.isArray(accesos);
    const accesosToProcess = isBatch ? accesos : [accesos];
    const select = document.getElementById('change-usuario');
    const nuevo_usuario_id = select.value;

    if (!nuevo_usuario_id) {
        window.UI.showToast('Por favor, seleccione un usuario de destino.', 'warning');
        return;
    }
    if (nuevo_usuario_id == usuario_id_actual) {
        window.UI.showToast('Por favor, seleccione un usuario de destino 2.', 'warning');
        return;
    }

    window.UI.loadingSpinner.show();
    try {
        const optionString = `otro:${nuevo_usuario_id}`;
        const promises = accesosToProcess.map(id =>
            window.VigilanteAPI.editorAccesoOptions(id, optionString)
        );
        const results = await Promise.all(promises);

        window.UI.showToast(`${accesosToProcess.length} acceso(s) ha(n) sido reasignado(s).`, 'success');
        window.UI.hideModal();
        window.location.hash = `#access-editor/${usuario_id_actual}`;
        window.location.href = `#access-editor/${usuario_id_actual}`;

    } catch (error) {
        window.UI.showToast(`Error al reasignar accesos: ${error.message}`, 'error');
    } finally {
        window.location.href = `#access-editor/${usuario_id_actual}`;
        window.UI.loadingSpinner.hide();
    }
}
async function changeFaceToUser(accesos, usuario_id_actual, imgSrc) {
    window.UI.modal_reset();
    const isBatch = Array.isArray(accesos);
    const title = isBatch ? `Reasignar ${accesos.length} Imágenes` : `Reasignar Imagen`;
    const accesosToProcess = isBatch ? accesos : [accesos];
    const firstId = accesosToProcess[0];
    const previewImgSrc = `${window.Utils.pathFaceImg}${imgSrc}`;

    const originTitle = isBatch ? `Múltiples Accesos (${accesos.length})` : `Acceso ID: ${firstId}`;

    const modalBody = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Origin Card -->
            <div>
                <h5 class="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Origen</h5>
                <div class="bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner overflow-hidden">
                    <img src="${previewImgSrc}" class="w-full h-48 object-cover" alt="Imagen de muestra">
                    <div class="p-4">
                        <h6 class="font-bold text-gray-800 dark:text-white">${originTitle}</h6>
                    </div>
                </div>
            </div>
            <!-- Destination Card -->
            <div>
                <h5 class="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">Destino</h5>
                <div id="cardDestino" class="bg-gray-100 dark:bg-gray-700 rounded-lg shadow-inner overflow-hidden">
                    <img src="https://via.placeholder.com/200x250.png?text=Seleccione" class="w-full h-48 object-cover" alt="Seleccione un usuario">
                    <div class="p-4">
                        <h6 class="font-bold text-gray-800 dark:text-white">Seleccione un usuario</h6>
                        <p class="text-sm text-gray-600 dark:text-gray-400"></p>
                    </div>
                </div>
            </div>
        </div>
        <hr class="my-6 border-gray-200 dark:border-gray-600">
        <div>
            <label for="change-usuario" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"><strong>Seleccionar Persona de Destino</strong></label>
            <select id="change-usuario" class="block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">Cargando usuarios...</option>
            </select>
        </div>
    `;

    window.UI.showModal(title, modalBody, 'Reasignar Acceso(s)', () => submitChangeFace(accesos, usuario_id_actual));

    try {
        const response = await window.VigilanteAPI.getUsersByBranch();
        const { results: users } = response;
        const selectElement = document.getElementById('change-usuario');
        selectElement.innerHTML = '<option value="">-- Seleccione un usuario --</option>';
        users.forEach(user => {
            
            if (usuario_id_actual == user.ID) {return}

            const option = document.createElement('option');
            option.value = user.ID;
            option.textContent = `${user.Nombre} (${user.Tipo}) ID [${user.ID}]`;
            option.dataset.imgSrc = user.profile_image ? `${window.Utils.pathFaceImg}${user.profile_image}` : 'https://via.placeholder.com/200x250.png?text=Sin+Imagen';
            option.dataset.tipo = user.Tipo;
            option.dataset.nombre = user.Nombre;
            selectElement.appendChild(option);
        });

        selectElement.addEventListener('change', (event) => {
            const selectedOption = event.target.options[event.target.selectedIndex];
            const cardDestino = document.getElementById('cardDestino');

            if (event.target.value) {
                cardDestino.innerHTML = `
                    <img src="${selectedOption.dataset.imgSrc}" class="w-full h-48 object-cover" alt="Foto de ${selectedOption.dataset.nombre}">
                    <div class="p-4">
                        <h6 class="font-bold text-gray-800 dark:text-white">${selectedOption.dataset.nombre}</h6>
                        <p class="text-sm text-gray-600 dark:text-gray-400"><strong>Tipo:</strong> ${selectedOption.dataset.tipo}</p>
                    </div>
                `;
            } else {
                cardDestino.innerHTML = `
                    <img src="https://via.placeholder.com/200x250.png?text=Seleccione" class="w-full h-48 object-cover" alt="Seleccione un usuario">
                    <div class="p-4">
                        <h6 class="font-bold text-gray-800 dark:text-white">Seleccione un usuario</h6>
                        <p class="text-sm text-gray-600 dark:text-gray-400"></p>
                    </div>
                `;
            }
        });

    } catch (error) {
        document.getElementById('change-usuario').innerHTML = '<option value="">Error al cargar usuarios</option>';
        console.error('Error fetching users for modal:', error);
    }
}
async function changeFaceToUserXXXXXXXX(accesos, imgSrc) {
    window.UI.modal_reset();
    const isBatch = Array.isArray(accesos);
    const title = isBatch ? `Reasignar ${accesos.length} imágenes` : `Reasignar imagen`;
    const accesosToProcess = isBatch ? accesos : [accesos];
    const firstId = accesosToProcess[0];
    const previewImgSrc = imgSrc || 'https://via.placeholder.com/200x250.png?text=Multiple+Images';
    const originTitle = isBatch ? `Múltiples Accesos (${accesos.length})` : `Acceso ID: ${firstId}`;

    $('#staticBackdropLabel').text(title);

    const modalBody = `
        <div class="container-fluid">
            <div class="row">
                <div class="col-md-6 mb-3">
                    <h5 class="mt-2">Origen</h5>
                    <div class="card border-secondary border-2">
                        <img src="${previewImgSrc}" class="card-img-top" alt="Imagen de muestra">
                        <div class="card-body">
                            <h6 class="card-title">${originTitle}</h6>
                        </div>
                    </div>
                </div>
                <div class="col-md-6 mb-3">
                    <h5 class="mt-2">Destino</h5>
                    <div class="card border-secondary border-2" id="cardDestino">
                        <img src="https://via.placeholder.com/200x250.png?text=Seleccione" class="card-img-top" alt="Seleccione un usuario">
                        <div class="card-body">
                            <h6 class="card-title">Seleccione un usuario</h6>
                            <p class="card-text"></p>
                        </div>
                    </div>
                </div>
            </div>
            <hr>
            <div class="row">
                <div class="mb-3">
                    <label for="change-usuario" class="form-label"><strong>Seleccionar Persona de Destino</strong></label>
                    <select class="form-select" id="change-usuario">
                        <option value="">Cargando usuarios...</option>
                    </select>
                </div>
            </div>
        </div>
    `;
    $('#modal_id_body').html(modalBody);
    $('#staticBackdrop').modal('show');

    try {
        const response = await window.VigilanteAPI.getUsersByBranch();
        const { results: users } = response;
        const selectElement = document.getElementById('change-usuario');
        selectElement.innerHTML = '<option value="">-- Seleccione un usuario --</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.ID;
            option.textContent = `${user.Nombre} (${user.Tipo}) ID [${user.ID}]`;
            option.dataset.imgSrc = user.profile_image ? `${window.Utils.pathFaceImg}${user.profile_image}` : 'https://via.placeholder.com/200x250.png?text=Sin+Imagen';
            option.dataset.tipo = user.Tipo;
            option.dataset.nombre = user.Nombre;
            selectElement.appendChild(option);
        });

        selectElement.addEventListener('change', (event) => {
            const selectedOption = event.target.options[event.target.selectedIndex];
            const cardDestino = document.getElementById('cardDestino');

            if (event.target.value) {
                cardDestino.innerHTML = `
                    <img src="${selectedOption.dataset.imgSrc}" class="card-img-top" alt="Foto de ${selectedOption.dataset.nombre}">
                    <div class="card-body">
                        <h6 class="card-title">${selectedOption.dataset.nombre}</h6>
                        <p class="card-text"><strong>Tipo:</strong> ${selectedOption.dataset.tipo}</p>
                    </div>
                `;
            } else {
                cardDestino.innerHTML = `
                    <img src="https://via.placeholder.com/200x250.png?text=Seleccione" class="card-img-top" alt="Seleccione un usuario">
                    <div class="card-body">
                        <h6 class="card-title">Seleccione un usuario</h6>
                        <p class="card-text"></p>
                    </div>
                `;
            }
        });

    } catch (error) {
        document.getElementById('change-usuario').innerHTML = '<option value="">Error al cargar usuarios</option>';
        console.error('Error fetching users for modal:', error);
    }

    const saveButton = document.getElementById('modal_bottom_ok');
    saveButton.textContent = 'Reasignar Acceso(s)';
    saveButton.onclick = () => submitChangeFace(accesos);
}



function renderUserImageEditor(data) {
    const { user, faces, totalPages, currentPage } = data;
    const profileImg = user.profile_image ? window.Utils.pathFaceImg + user.profile_image : 'https://via.placeholder.com/200x250.png?text=No+Image';
    const disabledByRole = window.Auth.getDisabledByRole();

    const userInfoHtml = `
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- User Info Header -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
                <div class="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <img class="w-32 h-40 object-cover rounded-lg shadow-md" src="${profileImg}" alt="Profile Image">
                    <div class="flex-grow">
                        <h2 class="text-3xl font-bold text-gray-800 dark:text-white">
                            ${user.usuario_nombre}
                        </h2>
                        <span class="inline-block bg-indigo-100 text-indigo-800 text-sm font-semibold px-3 py-1 rounded-full dark:bg-indigo-900 dark:text-indigo-300">
                            ${user.usuario_tipo}
                        </span>
                        <ul class="mt-4 text-gray-600 dark:text-gray-300 space-y-2">
                            <li><strong>Empresa:</strong> ${user.empresa_nombre}</li>
                            <li><strong>Sucursal:</strong> ${user.local_nombre}</li>
                            <li><strong>Último Acceso:</strong> ${user.ultimo_acceso || 'N/A'}</li>
                            <li><strong>Total de Imágenes:</strong> ${faces.length}</li>
                        </ul>
                        <div class="mt-4 flex space-x-2">
                            <button class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"
                                    onclick='window.UserActions.editUser(${JSON.stringify(user)})'
                                    ${window.Auth.getDisabledByRole()}>Editar</button>
                            <button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"
                                    onclick="window.UserActions.deleteUser(${user.usuario_id}, '${user.usuario_nombre}')"
                                    ${window.Auth.getDisabledByRole()}>Eliminar</button>
                            <button class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200"
                                    onclick="window.UserActions.enrollUser(${user.usuario_id})">Enrolar</button>
                        </div>
                    </div>
                    <div class="flex-shrink-0" x-data="{ open: false }" @click.away="open = false">
                        <button @click="open = !open" class="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-transform transform hover:scale-105 ${disabledByRole ? 'opacity-50 cursor-not-allowed' : ''}" ${disabledByRole}>
                            <span>Editar Seleccionados</span>
                            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7"></path></svg>
                        </button>
                        <div x-show="open" x-cloak class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10">
                            <button type="button" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600" data-usr-id="${user.usuario_id}" data-img-src="${user.profile_image}" data-option="sendImgToCompreface" onclick='actionAcesosLote(this)'>Enviar a CompreFace</button>
                            <button type="button" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600" data-usr-id="${user.usuario_id}" data-img-src="${user.profile_image}" data-option="delete" onclick='actionAcesosLote(this)'>Eliminar Seleccionados</button>
                            <button type="button" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600" data-usr-id="${user.usuario_id}" data-img-src="${user.profile_image}" data-option="changeImgPerson" onclick='actionAcesosLote(this)'>Reasignar Seleccionados</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Image Gallery -->
            <div id="3d-container" class="mb-8"></div>
            
            <div id="ImgAcceso-acceso_id" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                ${faces.length === 0 ? '<p class="col-span-full text-center text-gray-500">No se encontraron imágenes para este usuario.</p>' : faces.map(face => {
                    const cardImg = window.Utils.pathFaceImg + face.img;
                    return `
                        <div id="card-id-${face.acceso_id}" class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-transform transform hover:-translate-y-1">
                            <img class="w-full h-48 object-cover" src="${cardImg}" alt="User face image">
                            <div class="p-4">
                                <p class="text-sm font-semibold text-indigo-600 dark:text-indigo-400">Similitud: ${Math.round(face.similarity * 100)}%</p>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">ID: ${face.acceso_id} | ${face.fecha_acceso}</p>
                                <p class="text-xs text-gray-600 dark:text-gray-300 mt-2">${face.camara_nombre}</p>
                                
                                <div class="mt-4 flex justify-between items-center">
                                    <label class="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" class="form-checkbox h-5 w-5 rounded bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500" value="${face.acceso_id}">
                                        <span class="text-sm">Sel.</span>
                                    </label>
                                    <div x-data="{ open: false }" @click.away="open = false" class="relative">
                                        <button @click="open = !open" class="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition" ${disabledByRole}>
                                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path></svg>
                                        </button>
                                        <div x-show="open" x-cloak class="absolute right-0 bottom-full mb-2 w-38 bg-white dark:bg-gray-700 rounded-md shadow-lg z-10">
                                            <button type="button" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600" data-option="3DModel" data-id="${face.acceso_id}" data-usr="${face.usuario_id}" data-img-src="${face.img}" onclick='render3DModel(this)' data-mesh='${face.mesh}'>Malla 3D</button>
                                            <button type="button" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600" data-option="delete" data-id="${face.acceso_id}" data-usr="${face.usuario_id}" data-img-src="${face.img}" onclick='editorAccesosOptions(this)'>Eliminar</button>
                                            <button type="button" class="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600" data-option="otro" data-id="${face.acceso_id}" data-usr="${face.usuario_id}" data-img-src="${face.img}" onclick='editorAccesosOptions(this)'>Reasignar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>`;
                }).join('')}
            </div>

            <!-- Paginator -->
            <div class="mt-8 flex justify-center">
                <ul id='btnsPaginator' class="flex items-center space-x-2"></ul>
            </div>
        </div>`;

    return userInfoHtml;
}


(function(window) {
    'use strict';

    async function feditarImgUser(usuario_id, pagina = 1) {
        window.UI.loadingSpinner.show();
        try {
            const response = await window.VigilanteAPI.getUserImages(usuario_id, pagina);
            document.getElementById('fullbody').innerHTML = renderUserImageEditor(response);
            window.Utils.renderPaginator('#btnsPaginator', response.totalPages, pagina, (num) => {
                feditarImgUser(usuario_id, num);
            });
        } catch (error) {
            document.getElementById('fullbody').innerHTML = `<div class="alert alert-danger">Error loading user images: ${error.message}</div>`;
        } finally {
            window.UI.loadingSpinner.hide();
        }
    }
    async function funificarImgUser() {
        const currentVisitasCheck = Array.from(document.querySelectorAll('.ImgAcceso-filter-cb:checked')).map(cb => cb.value);

        if (currentVisitasCheck.length < 2) {
            return window.UI.showToast('Debe seleccionar al menos 2 visitas para unificar.', 'warning');
        }

        const allVisitSelect = currentVisitasCheck.map(id => {
            // const img = document.querySelector(`#card_${id} .carousel-item.active img, #card_${id} .carousel-item img`);
            const img = document.querySelector(`#card_${id} img`);
            return { id, img: img ? img.src : '' };
        });

        const htm_unificar = allVisitSelect.map(visit => `<p>ID: ${visit.id}<img width="70" height="70" src="${visit.img}" alt=""></p>`).join('');

        window.UI.modal_reset();

        /**
         * al unificar falta la logica de CompreFace...
         */
        window.UI.showModal('Unificar Accesos', htm_unificar, 'Unificar', async () => {
            try {
                window.UI.loadingSpinner.show();
                const response = await window.VigilanteAPI.unifyAccess(allVisitSelect);
                window.UI.showToast(response.msg, 'success');
                window.UI.hideModal();
                window.AccessReport.getPersonas(1,[]);
            } catch (error) {
                window.UI.showToast(error.message, 'error');
            } finally {
                window.UI.loadingSpinner.hide();
            }
        });
    }
    
    window.AccessEditor = {
        funificarImgUser,
        feditarImgUser
    };

})(window);