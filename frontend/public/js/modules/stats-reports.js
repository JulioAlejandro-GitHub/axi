(function(window) {
    'use strict';

    function renderStatsFilters(reportName, queryParams = {}) {
        const { startDate = '', endDate = '', camera = '', type = '', user = '' } = queryParams;

        let specificFilters = '';
        if (reportName === 'recognition-log') {
            specificFilters = `
                <div>
                    <label for="camera" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Cámara</label>
                    <input type="text" name="camera" id="camera" value="${camera}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                </div>
                <div>
                    <label for="type" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Tipo</label>
                    <input type="text" name="type" id="type" value="${type}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                </div>
            `;
        } else if (reportName === 'recognition-by-user') {
            specificFilters = `
                <div class="col-span-2">
                    <label for="user" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Usuario</label>
                    <input type="text" name="user" id="user" value="${user}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                </div>
            `;
        }

        return `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <h5 class="text-lg font-semibold mb-4">Filtros</h5>
                <form id="stats-filter-form">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label for="startDate" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Fecha de Inicio</label>
                            <input type="date" name="startDate" id="startDate" value="${startDate}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        </div>
                        <div>
                            <label for="endDate" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Fecha de Fin</label>
                            <input type="date" name="endDate" id="endDate" value="${endDate}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                        </div>
                        ${specificFilters}
                        <div class="col-span-full flex justify-end items-center">
                            <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Aplicar Filtros</button>
                        </div>
                    </div>
                </form>
            </div>
        `;
    }

    function renderStatsTable(results) {
        if (!results || results.length === 0) {
            return '<p class="text-center text-gray-500 dark:text-gray-400 py-12">No hay datos disponibles para los filtros seleccionados.</p>';
        }
        const headers = Object.keys(results[0]);
        let tableHtml = '<div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">';
        tableHtml += '<thead class="bg-gray-50 dark:bg-gray-700">';
        tableHtml += '<tr>';
        headers.forEach(header => tableHtml += `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${header}</th>`);
        tableHtml += '</tr></thead>';
        tableHtml += '<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">';
        results.forEach(row => {
            tableHtml += '<tr>';
            headers.forEach(header => {
                const value = row[header] !== null && row[header] !== undefined ? row[header] : '';
                tableHtml += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">${value}</td>`;
            });
            tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div>';
        return tableHtml;
    }

    async function fGetStatsPage(reportName, params = '') {
        window.UI.loadingSpinner.show();
        const contentBody = document.getElementById('fullbody');

        try {
            const response = await window.VigilanteAPI.getStatistics(reportName, params);
            const { data, query } = response;
            const { results, totalPages, currentPage, totalRecords } = data;

            const filtersHtml = renderStatsFilters(reportName, query);
            const tableHtml = renderStatsTable(results);

            contentBody.innerHTML = `
                <div class="container mx-auto px-4 py-8">
                    <h1 class="text-2xl font-bold capitalize mb-2">${reportName.replace(/-/g, ' ')}</h1>
                    <p class="text-gray-600 dark:text-gray-400 mb-6">Mostrando ${results.length} de ${totalRecords} registros.</p>
                    ${filtersHtml}
                    <div class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
                        ${tableHtml}
                    </div>
                    <div id="paginator-container" class="mt-6">
                        <ul class="flex justify-center items-center -space-x-px h-10 text-base"></ul>
                    </div>
                </div>`;

            if (totalPages > 1) {
                window.Utils.renderPaginator('paginator-container', totalPages, currentPage, (num) => {
                    const filterForm = document.getElementById('stats-filter-form');
                    const formData = new FormData(filterForm);
                    const currentParams = new URLSearchParams(formData);
                    currentParams.set('page', num);
                    fGetStatsPage(reportName, currentParams.toString());
                });
            }

            const filterForm = document.getElementById('stats-filter-form');
            if (filterForm) {
                filterForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    const formData = new FormData(filterForm);
                    const newParams = new URLSearchParams(formData).toString();
                    fGetStatsPage(reportName, newParams);
                });
            }

        } catch (error) {
            contentBody.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Error al cargar el reporte: ${error.message}</div>`;
        } finally {
            window.UI.loadingSpinner.hide();
        }
    }

    window.StatsReports = {
        fGetStatsPage
    };

})(window);