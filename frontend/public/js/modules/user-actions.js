(function(window) {
    'use strict';

    /**
     * Normalizes user data from different sources (PascalCase vs. snake_case)
     * into a consistent object structure for use in forms and modals.
     * @param {object} userData - The raw user object.
     * @returns {object} A normalized user object.
     */
    function normalizeUserData(userData) {
        // Create a mapping from various possible keys to a standard key.
        const keyMap = {
            ID: ['ID', 'usuario_id', 'id'],
            Nombre: ['Nombre', 'usuario_nombre', 'name'],
            Email: ['Email', 'email'],
            Tipo: ['Tipo', 'usuario_tipo', 'type'],
            Estado: ['Estado', 'estado', 'status'],
            Gender: ['Gender', 'gender']
        };

        const normalized = {};
        for (const standardKey in keyMap) {
            for (const sourceKey of keyMap[standardKey]) {
                if (userData[sourceKey] !== undefined) {
                    normalized[standardKey] = userData[sourceKey];
                    break; // Move to the next standard key once a match is found
                }
            }
        }
        return normalized;
    }

    async function saveUser() {
        const userId = document.getElementById('edit-user-id').value;
        const userData = { usuario_id: userId };
        const fields = ['nombre', 'email', 'tipo', 'estado', 'gender'];

        fields.forEach(field => {
            const element = document.getElementById(`edit-${field}`);
            if (element) {
                userData[field] = element.value;
            }
        });

        const passwordElement = document.getElementById('edit-password');
        if (passwordElement && passwordElement.value) {
            userData.password = passwordElement.value;
        }

        window.UI.loadingSpinner.show();
        try {
            await window.VigilanteAPI.updateUser(userData);
            window.UI.showToast('Usuario actualizado correctamente.', 'success');
            window.UI.hideModal();
            location.reload(); // Reload the page to reflect changes
        } catch (error) {
            window.UI.showToast(`Error al actualizar usuario: ${error.message}`, 'error');
        } finally {
            window.UI.loadingSpinner.hide();
        }
    }

    function deleteUser(userId, userName) {
        const title = 'Confirmar Eliminación de Usuario';
        const body = `<p class="text-gray-700 dark:text-gray-300">¿Está seguro de que desea eliminar al usuario: <strong>${userName}</strong>? Esta acción lo marcará como inactivo.</p>`;
        window.UI.showConfirmationModal(title, body, async () => {
            window.UI.loadingSpinner.show();
            try {
                await window.VigilanteAPI.deleteUser(userId);
                window.UI.showToast('Usuario eliminado correctamente.', 'success');
                location.reload(); // Reload the page to reflect changes
            } catch (error) {
                window.UI.showToast(`Error al eliminar usuario: ${error.message}`, 'error');
            } finally {
                window.UI.loadingSpinner.hide();
            }
        });
    }

    function editUser(rawUserData) {
        const userData = normalizeUserData(rawUserData);
        const modalTitle = `Editar Usuario: ${userData.Nombre}`;
        const modalBody = `
            <form id="editUserForm" class="space-y-4">
                <input type="hidden" id="edit-user-id" value="${userData.ID}">
                ${Object.keys(userData).map(key => {
                    if (['ID', 'Password'].includes(key)) return '';

                    if (key === 'Tipo') {
                        const options = ['socio', 'empleado', 'familia', 'desconocido', 'ladron'];
                        return `<div>
                                    <label for="edit-tipo" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Tipo</label>
                                    <select id="edit-tipo" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                        ${options.map(o => `<option value="${o}" ${userData[key] === o ? 'selected' : ''}>${o}</option>`).join('')}
                                    </select>
                                </div>`;
                    }
                     if (key === 'Estado') {
                        const options = ['activo', 'inactivo'];
                        return `<div>
                                    <label for="edit-estado" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Estado</label>
                                    <select id="edit-estado" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                        ${options.map(o => `<option value="${o}" ${userData[key] === o ? 'selected' : ''}>${o}</option>`).join('')}
                                    </select>
                                </div>`;
                    }
                     if (key === 'Gender') {
                        const options = ['male', 'female'];
                        return `<div>
                                    <label for="edit-gender" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Género</label>
                                    <select id="edit-gender" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                                        ${options.map(o => `<option value="${o}" ${userData[key] === o ? 'selected' : ''}>${o}</option>`).join('')}
                                    </select>
                                </div>`;
                    }

                    return `<div>
                                <label for="edit-${key.toLowerCase()}" class="block text-sm font-medium text-gray-700 dark:text-gray-200">${key}</label>
                                <input type="text" id="edit-${key.toLowerCase()}" value="${userData[key] || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                            </div>`;
                }).join('')}
                <div>
                    <label for="edit-password" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Nueva Contraseña (opcional)</label>
                    <input type="password" id="edit-password" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50">
                </div>
            </form>
        `;
        window.UI.showModal(modalTitle, modalBody, 'Guardar Cambios', saveUser);
    }

    function enrollUser(userId) {
        window.location.href = `../public/enroll.html?user_id=${userId}`;
    }

    // Expose only the public-facing functions. `saveUser` is now an internal detail.
    window.UserActions = {
        deleteUser,
        editUser,
        enrollUser
    };

})(window);