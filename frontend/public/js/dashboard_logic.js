/**
 * @file Handles all logic related to the dashboard and statistics.
 * @author Jules
 */

function loadDashboard() {
    const contentBody = document.getElementById('fullbody');
    contentBody.innerHTML = `
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-6">Dashboard de Actividad</h1>

            <div class="flex flex-col lg:flex-row gap-8">
                <!-- Filters Sidebar -->
                <aside class="w-full lg:w-1/4">
                    <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg sticky top-8">
                        <h5 class="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Filtros</h5>
                        <div class="space-y-4">
                            <div>
                                <label for="startDate" class="block text-sm font-medium text-gray-600 dark:text-gray-300">Fecha de Inicio</label>
                                <input type="date" id="startDate" class="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            </div>
                            <div>
                                <label for="endDate" class="block text-sm font-medium text-gray-600 dark:text-gray-300">Fecha de Fin</label>
                                <input type="date" id="endDate" class="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            </div>
                        </div>

                        <h5 class="text-lg font-semibold mt-6 mb-3 text-gray-700 dark:text-gray-200">Tipos de Usuario</h5>
                        <div id="user-types-filter" class="space-y-2"></div>

                        <button id="apply-filters" class="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                            Aplicar Filtros
                        </button>
                    </div>
                </aside>

                <!-- Charts and Data Grid -->
                <main class="w-full lg:w-3/4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex items-center justify-center min-h-[300px]"><div id="gauge_div" class="w-full h-full"></div></div>
                        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg flex items-center justify-center min-h-[300px]"><div id="piechart_div" class="w-full h-full"></div></div>
                    </div>
                    <div class="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg min-h-[400px]"><div id="columnchart_div" class="w-full h-full"></div></div>
                    <div class="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg min-h-[400px]"><div id="combochart_div" class="w-full h-full"></div></div>
                    <div class="mt-6 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg min-h-[400px]"><div id="table_div" class="w-full h-full"></div></div>
                </main>
            </div>
        </div>`;

    const tiposDisponibles = { 'socio': 'Socio', 'empleado': 'Empleado', 'familia': 'Familia', 'desconocido': 'Desconocido', 'ladron': 'Ladron' };
    const userTypesFilter = document.getElementById('user-types-filter');
    for (const tipo in tiposDisponibles) {
        userTypesFilter.innerHTML += `
            <label for="check-${tipo}" class="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" id="check-${tipo}" value="${tipo}" class="h-4 w-4 bg-gray-50 dark:bg-gray-600 border-gray-300 dark:border-gray-500 rounded text-indigo-600 focus:ring-indigo-500" checked>
                <span class="text-gray-700 dark:text-gray-200">${tiposDisponibles[tipo]}</span>
            </label>`;
    }

    document.getElementById('apply-filters').addEventListener('click', drawChart);
    drawChart();
}

window.Dashboard = {
    loadDashboard
};

async function drawChart() {
    const filters = {
        startDate: document.getElementById('startDate').value,
        endDate: document.getElementById('endDate').value,
        tipos: Array.from(document.querySelectorAll('#user-types-filter input:checked')).map(cb => cb.value)
    };

    window.UI.loadingSpinner.show();
    try {
        const response = await window.VigilanteAPI.getMonthlyStats(filters);

        if (response.length < 2) {
            document.getElementById('table_div').innerHTML = 'No data available for the selected filters.';
            ['gauge_div', 'piechart_div', 'columnchart_div', 'combochart_div'].forEach(id => document.getElementById(id).innerHTML = '');
            return;
        }

        const rawData = google.visualization.arrayToDataTable(response);
        const isDarkMode = document.documentElement.classList.contains('dark');
        const chartTextStyle = { color: isDarkMode ? '#E5E7EB' : '#374151' };
        const chartBackgroundColor = 'transparent';

        // 1. Table Chart
        const tableOptions = {
            showRowNumber: true,
            width: '100%',
            height: '100%',
            cssClassNames: {
                headerRow: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold',
                tableRow: 'bg-white dark:bg-gray-800',
                oddTableRow: 'bg-gray-50 dark:bg-gray-900',
                selectedTableRow: 'bg-blue-100 dark:bg-blue-900',
                hoverTableRow: 'bg-gray-200 dark:bg-gray-600'
            }
        };
        new google.visualization.Table(document.getElementById('table_div')).draw(rawData, tableOptions);

        // Data processing for other charts
        const dataRows = response.slice(1);

        // 2. Gauge Chart (Total Count)
        const totalCount = dataRows.reduce((sum, row) => sum + row[2], 0);
        const gaugeData = google.visualization.arrayToDataTable([['Label', 'Value'], ['Total', totalCount]]);
        const gaugeOptions = {
            width: 400, height: 220,
            redFrom: 90, redTo: 100, yellowFrom: 75, yellowTo: 90,
            minorTicks: 5,
            backgroundColor: chartBackgroundColor,
        };
        new google.visualization.Gauge(document.getElementById('gauge_div')).draw(gaugeData, gaugeOptions);

        // 3. Pie Chart (by Type)
        const aggregatedData = dataRows.reduce((acc, row) => {
            acc[row[1]] = (acc[row[1]] || 0) + row[2];
            return acc;
        }, {});
        const pieChartData = [['Tipo', 'Count'], ...Object.entries(aggregatedData)];
        const pieData = google.visualization.arrayToDataTable(pieChartData);
        const pieOptions = {
            title: 'Accesos por Tipo de Usuario',
            is3D: true,
            backgroundColor: chartBackgroundColor,
            legend: { textStyle: chartTextStyle },
            titleTextStyle: chartTextStyle
        };
        new google.visualization.PieChart(document.getElementById('piechart_div')).draw(pieData, pieOptions);

        // 4. & 5. Pivoted Charts (Column & Combo)
        const { pivotedData, uniqueTipos } = pivotData(response);
        const pivotedTable = google.visualization.arrayToDataTable(pivotedData);
        const commonChartOptions = {
            backgroundColor: chartBackgroundColor,
            legend: { textStyle: chartTextStyle },
            titleTextStyle: chartTextStyle,
            hAxis: { textStyle: chartTextStyle, titleTextStyle: chartTextStyle },
            vAxis: { textStyle: chartTextStyle, titleTextStyle: chartTextStyle, gridlines: { color: isDarkMode ? '#4B5563' : '#D1D5DB' } }
        };

        const columnOptions = { ...commonChartOptions, title: 'Conteo Mensual por Tipo de Usuario', vAxis: { title: 'Conteo' }, hAxis: { title: 'Mes' }, isStacked: true };
        new google.visualization.ColumnChart(document.getElementById('columnchart_div')).draw(pivotedTable, columnOptions);

        const comboOptions = { ...commonChartOptions, title: 'Conteo Mensual (Combinado)', vAxis: { title: 'Conteo' }, hAxis: { title: 'Mes' }, seriesType: 'bars', series: { [uniqueTipos.length - 1]: { type: 'line' } } };
        new google.visualization.ComboChart(document.getElementById('combochart_div')).draw(pivotedTable, comboOptions);

    } catch (error) {
        window.UI.showToast(`Failed to draw charts: ${error.message}`, 'error');
    } finally {
        window.UI.loadingSpinner.hide();
    }
}

function pivotData(data) {
    const rows = data.slice(1);
    const uniqueMonths = [...new Set(rows.map(row => row[0]))].sort();
    const uniqueTipos = [...new Set(rows.map(row => row[1]))].sort();

    const pivotedHeader = ['Month', ...uniqueTipos];
    const pivotedRows = uniqueMonths.map(month => {
        const newRow = [month];
        const counts = uniqueTipos.reduce((acc, tipo) => ({...acc, [tipo]: 0}), {});
        rows.forEach(row => {
            if (row[0] === month) {
                counts[row[1]] = (counts[row[1]] || 0) + row[2];
            }
        });
        uniqueTipos.forEach(tipo => newRow.push(counts[tipo]));
        return newRow;
    });
    return { pivotedData: [pivotedHeader, ...pivotedRows], uniqueTipos };
}

async function fGetStatsPage(reportName, params = '') {
    window.UI.loadingSpinner.show();
    const endpoint = `http://localhost:8085/vigilante//statistics/${reportName}?${params}`;
    try {
        const response = await fetch(endpoint, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error(`Failed to load report: ${response.statusText}`);
        const html = await response.text();
        document.getElementById('fullbody').innerHTML = html;

        const filterForm = document.querySelector('#fullbody form');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const formData = new FormData(filterForm);
                const newParams = new URLSearchParams(formData).toString();
                fGetStatsPage(reportName, newParams);
            });
        }
    } catch (error) {
        document.getElementById('fullbody').innerHTML = `<div class="alert alert-danger">Error loading report: ${error.message}</div>`;
    } finally {
        window.UI.loadingSpinner.hide();
    }
}