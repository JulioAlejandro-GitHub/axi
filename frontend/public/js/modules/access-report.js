(function(window) {
    'use strict';

    const getTypeClasses = (userType, isDeleted) => {
        if (isDeleted) {
            return {
                border: 'border-gray-500',
                text: 'text-gray-500 dark:text-gray-400',
                bg: 'bg-gray-200 dark:bg-gray-700'
            };
        }
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

    function renderAccessReport(reportData, activeFilters = []) {
        const { results, totalRecords, currentPage, totalPages } = reportData;
        const disabledByRole = window.Auth.getDisabledByRole();

        const tiposDisponibles = { 'socio': 'Socio', 'empleado': 'Empleado', 'familia': 'Familia', 'desconocido': 'Desconocido', 'ladron': 'Ladrón' };

        const buildFilterCheckbox = (type, label) => {
            const isChecked = activeFilters.includes(type) ? 'checked' : '';
            return `
                <label class="inline-flex items-center space-x-2">
                    <input type="checkbox" value="${type}" class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 report-filter-cb" ${isChecked}>
                    <span>${label}</span>
                </label>`;
        };
        const checkboxHTML = Object.entries(tiposDisponibles).map(([value, label]) => buildFilterCheckbox(value, label)).join('');

        const filtersHTML = `
            <div class="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div class="flex flex-wrap items-center gap-4">
                    <span class="font-semibold">Filtros:</span>
                    ${checkboxHTML}
                    <button type="button" class="ml-auto px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700" onclick="window.AccessEditor.funificarImgUser()" ${disabledByRole}>
                        Unificar Seleccionados
                    </button>
                </div>
            </div>`;

        let cardsHTML = '';
        if (!results || results.length === 0) {
            cardsHTML = '<div class="col-span-full text-center py-12"><p class="text-gray-500 dark:text-gray-400">No se encontraron registros de actividad.</p></div>';
        } else {
            results.forEach(userGroup => {
                const { usuario_id, usuario_nombre, usuario_tipo, fecha_eliminacion, accesos } = userGroup;
                const typeClasses = getTypeClasses(usuario_tipo, fecha_eliminacion);

                const lastAccess = accesos.length > 0 ? new Date(accesos[0].fecha_acceso).toLocaleString() : new Date(userGroup.usuario_fecha_creacion).toLocaleString();

                cardsHTML += `
                    <div class="border-2 ${typeClasses.border} ${typeClasses.bg} rounded-lg shadow-lg overflow-hidden" id="card_${usuario_id}">
                        <div class="relative w-full h-56">
                            <img class="w-full h-full object-cover" src="${window.Utils.pathFaceImg}${accesos[0].img}" alt="Imagen de acceso">
                            <div class="absolute top-2 right-2">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white bg-opacity-70">
                                    ${accesos.length} accesos
                                </span>
                            </div>
                        </div>
                        <div class="p-4">
                            <h5 class="text-lg font-bold truncate">${usuario_nombre} #${usuario_id}</h5>
                            <h6 class="text-sm font-medium ${typeClasses.text} mb-2 capitalize">${usuario_tipo}</h6>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Último Acceso: ${lastAccess}</p>
                            <div class="flex justify-between items-center mt-4">
                                <a href="#access-editor/${usuario_id}" class="px-3 py-1 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Editar</a>
                                <div class="flex items-center">
                                    <input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ImgAcceso-filter-cb" value="${usuario_id}">
                                </div>
                            </div>
                        </div>
                    </div>`;
            });
        }

        const fullHTML = `
            <div class="space-y-6">
                <div>
                    <h1 class="text-2xl font-bold">Personas Reconocidas</h1>
                    <p class="text-gray-600 dark:text-gray-400">Mostrando ${results.length} de ${totalRecords} resultados. Clasificar adecuadamente y unificar duplicados.</p>
                </div>
                ${filtersHTML}
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    ${cardsHTML}
                </div>
                <div id="paginator-container">
                    <ul class="flex justify-center items-center -space-x-px h-10 text-base"></ul>
                </div>
            </div>`;
        document.getElementById('fullbody').innerHTML = fullHTML;

        // window.Utils.renderPaginator('paginator-container', totalPages, currentPage, (num) => {
        //     const currentTipos = Array.from(document.querySelectorAll('.report-filter-cb:checked')).map(cb => cb.value);
        //     getPersonas(num, currentTipos);
        // });
    }

    async function getPersonas(pagina = 1, tipos = []) {
        window.UI.loadingSpinner.show();
        try {
            const response = await window.VigilanteAPI.getAccessReport(pagina, tipos);
            renderAccessReport(response.report, tipos);
        } catch (error) {
            console.log('error')
            console.log(error)
            console.log('error')
            document.getElementById('fullbody').innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Error al cargar el registro de actividad: ${error.message}</div>`;
        } finally {
            window.UI.loadingSpinner.hide();
        }
    }

    document.body.addEventListener('change', function(event) {
        if (event.target.classList.contains('report-filter-cb')) {
            const selectedTipos = Array.from(document.querySelectorAll('.report-filter-cb:checked')).map(cb => cb.value);
            getPersonas(1, selectedTipos);
        }
    });

    window.AccessReport = {
        getPersonas
    };

})(window);