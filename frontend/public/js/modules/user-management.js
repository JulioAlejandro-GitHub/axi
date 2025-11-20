(function(window) {
    'use strict';

    async function fadduser() {
        window.UI.loadingSpinner.show();
        try {
            const html = await window.VigilanteAPI.getNewUserFormHtml();
            document.getElementById('fullbody').innerHTML = html;
        } catch (error) {
            UI.showToast(error.message, 'error');
        } finally {
            window.UI.loadingSpinner.hide();
        }
    }

    async function fGetUsersByBranch(pagina = 1) {
        const contentBody = document.getElementById('fullbody');
        contentBody.innerHTML = `
            <div class="container mx-auto px-4 py-8">
                <h1 class="text-2xl font-bold mb-6">Reporte de Usuarios</h1>
                <div id="user_table_div" class="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"></div>
                <div id="paginator-container" class="mt-6">
                    <ul class="flex justify-center items-center -space-x-px h-10 text-base"></ul>
                </div>
            </div>
        `;
        window.UI.loadingSpinner.show();
        const userTableDiv = document.getElementById('user_table_div');

        try {
            const response = await window.VigilanteAPI.getUsersByBranch(pagina);
            const { results: users, totalPages } = response;

            if (!users || users.length === 0) {
                userTableDiv.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-12">No se encontraron usuarios.</p>';
                return;
            }

            const headers = Object.keys(users[0]);
            let tableHtml = '<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">';
            tableHtml += '<thead class="bg-gray-50 dark:bg-gray-700">';
            tableHtml += '<tr>';
            headers.forEach(header => {
                if (header == 'profile_image') {return};
                tableHtml += `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">${header}</th>`;
            });
            tableHtml += '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Acciones</th></tr></thead>';
            tableHtml += '<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">';

            users.forEach(user => {
                tableHtml += `<tr id="user-row-${user.ID}">`;
                headers.forEach(header => {
                    if (header == 'profile_image') {return};
                    const value = user[header] !== null && user[header] !== undefined ? user[header] : '';
                    tableHtml += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">${value}</td>`;
                });
                tableHtml += `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button class="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200" onclick='window.UserActions.editUser(${JSON.stringify(user)})' ${window.Auth.getDisabledByRole()}>Editar</button>
                        <button class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" onclick="window.UserActions.deleteUser(${user.ID}, '${user.Nombre}')" ${window.Auth.getDisabledByRole()}>Eliminar</button>
                        <button class="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200" onclick="window.UserActions.enrollUser(${user.ID})">Enrolar</button>
                    </td>`;
                tableHtml += '</tr>';
            });
            tableHtml += '</tbody></table>';
            userTableDiv.innerHTML = tableHtml;

            if (totalPages > 1) {
                window.Utils.renderPaginator('paginator-container', totalPages, pagina, fGetUsersByBranch);
            }

        } catch (error) {
            userTableDiv.innerHTML = `<div class="p-4 text-red-700 bg-red-100 rounded-lg dark:bg-red-200 dark:text-red-800">Error al cargar datos de usuario: ${error.message}</div>`;
        } finally {
            window.UI.loadingSpinner.hide();
        }
    }

    window.UserManagement = {
        fadduser,
        fGetUsersByBranch,
    };

})(window);