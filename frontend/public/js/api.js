/**
 * @file Centralized API module for handling all frontend-backend communication.
 * @author Jules
 */

(function(window) {
    'use strict';

    const apiCache = new Map();
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    async function fetchWithRetry(url, config, retries = 3, backoff = 300) {
        try {
            return await fetch(url, config);
        } catch (error) {
            if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, backoff));
                return fetchWithRetry(url, config, retries - 1, backoff * 2);
            }
            throw error;
        }
    }

    async function fetchApi(url, method = 'GET', body = null, customHeaders = {}, options = {}) {
        const { noCache = false, retries = 3 } = options;
        const upperCaseMethod = method.toUpperCase();

        // Caching logic for GET requests
        if (upperCaseMethod === 'GET' && !noCache) {
            const cached = apiCache.get(url);
            if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
                return Promise.resolve(cached.data);
            }
        }

        const headers = { ...customHeaders };
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: upperCaseMethod,
            headers: new Headers(headers)
        };

        if (body) {
            if (body instanceof FormData) {
                config.body = body;
            } else {
                headers['Content-Type'] = 'application/json; charset=utf-8';
                config.body = JSON.stringify(body);
            }
        }
        config.headers = new Headers(headers);

        try {
            const response = await fetchWithRetry(url, config, retries);

            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/';
                throw new Error('Session expired. Please log in again.');
            }

            if (!response.ok) {
                let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.msg || errorData.message || JSON.stringify(errorData.errors) || errorMessage;
                } catch (e) {
                    // Ignore if response body is not JSON
                }
                throw new Error(errorMessage);
            }

            if (response.status === 204) {
                return null;
            }

            const contentType = response.headers.get('content-type');
            const responseData = contentType && contentType.includes('text/html') ? await response.text() : await response.json();

            // Cache successful GET responses
            if (upperCaseMethod === 'GET' && !noCache) {
                apiCache.set(url, { data: responseData, timestamp: Date.now() });
            }

            return responseData;

        } catch (error) {
            console.error(`API call to ${url} failed:`, error);
            throw error;
        }
    }

    // Expose the API functions to the global window object
    const baseUrl = 'http://localhost:8085';
    const baseUrlFrontEnd = 'http://localhost:3000';
    window.VigilanteAPI = {
        /**
         * Decodes the JWT from localStorage to extract and return the user's role ('tipo').
         * @returns {string|null} The user's role or null if not available.
         */
        getUserRole: function() {
            const token = localStorage.getItem('token');
            if (!token) {
                return null;
            }
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.tipo;
            } catch (e) {
                console.error('Error decoding token:', e);
                localStorage.removeItem('token');
                return null;
            }
        },

        /**
         * The base URL for the backend API.
         */
        baseUrl,

        /**
         * Logs the user out.
         */
        logout: () => fetchApi(`${baseUrl}/vigilante/auth/logout`, 'POST'),

        /**
         * Fetches the HTML content for the new user form.
         */
        getNewUserFormHtml: () => fetchApi(`./form_new_user.html`, 'GET'),

        /**
         * Fetches the HTML content for the webcam recognition view.
         */
        // getWebcamViewHtml: () => fetchApi(`${baseUrl}/vigilante/usuario/webcam`, 'GET'),

        /**
         * Fetches a paginated report of user access logs.
         * @param {number} [pagina=1] - The page number to retrieve.
         * @param {string[]} [tipos=[]] - An array of user types to filter by.
         */
        getAccessReport: (pagina = 1, tipos = []) => fetchApi(`${baseUrl}/vigilante/usuario/reportaccesos`, 'POST', { pagina, tipos }),

        /**
         * Fetches a paginated list of all users for the current branch.
         * @param {number} [pagina=1] - The page number to retrieve.
         */
        getUsersByBranch: (pagina = 1) => fetchApi(`${baseUrl}/vigilante/usuario/bybranch`, 'POST', { pagina }),

        /**
         * Fetches a paginated list of all camaras.
         * @param {number} [pagina=1] - The page number to retrieve.
         */
        getCamaras: (pagina = 1) => fetchApi(`${baseUrl}/vigilante/usuario/camaras`, 'POST', { pagina }),

        /**
         * Fetches the configuration options for cameras.
         */
        getCamaraOptions: () => fetchApi(`${baseUrl}/vigilante/usuario/camaraoptions`, 'POST'),

        /**
         * Updates an existing user's information.
         * @param {object} data - The data to update.
         */
        updateCamara: (data) => fetchApi(`${baseUrl}/vigilante/usuario/updcamaras`, 'PUT', data),


        /**
         * Fetches images for a specific user.
         * @param {string} usuario_id - The ID of the user.
         * @param {number} [pagina=1] - The page number of images to retrieve.
         */
        getUserImages: (usuario_id, pagina = 1) => fetchApi(`${baseUrl}/vigilante/usuario/editimg`, 'POST', { usuario_id, pagina }),

        /**
         * Creates a new user.
         * @param {FormData} formData - The form data containing user details and images.
         */
        addUser: (formData) => fetchApi(`${baseUrl}/vigilante/auth/register`, 'POST', formData),

        /**
         * Updates an existing user's information.
         * @param {object} userData - The user data to update.
         */
        updateUser: (userData) => fetchApi(`${baseUrl}/vigilante/usuario/upd`, 'PUT', userData),

        /**
         * Deletes a user by setting their state to 'inactivo'.
         * @param {string} userId - The ID of the user to delete.
         */
        deleteUser: (userId) => fetchApi(`${baseUrl}/vigilante/usuario/upd`, 'PUT', { usuario_id: userId, estado: 'inactivo' }),

        /**
         * Unifies multiple access log images for a single user.
         * @param {object} allVisitSelect - Data about the visits to unify.
         */
        unifyAccess: (allVisitSelect) => fetchApi(`${baseUrl}/vigilante/usuario/unificaacceso`, 'POST', { allVisitSelect }),

        /**
         * Sends an image to the recognition engine.
         * @param {FormData} formData - The form data containing the image and metadata.
         */
        recognizeImage: (formData) => fetchApi(`${baseUrl}/vigilante/recognition/img`, 'POST', formData),

        /**
         * Fetches monthly statistics based on provided filters.
         * @param {object} filters - An object containing startDate, endDate, and tipos.
         */
        getMonthlyStats: (filters) => fetchApi(`${baseUrl}/vigilante/statistics/monthly`, 'POST', filters),

        /**
         * Fetches the live stream sources for cameras with optional pagination and filtering.
         * @param {object} [data={}] - An object containing pagina, ubicacion, estado, and protocolo.
         */
        getLiveStreamSources: (data = {}) => fetchApi(`${baseUrl}/vigilante/usuario/livestream`, 'POST', data),



        
        editorAccesoOptions: (acceso_id, option) => fetchApi(`${baseUrl}/vigilante/usuario/editoraccesos`, 'POST', { acceso_id, option }),

        /**
         * Fetches statistics data for a given report.
         * @param {string} reportName - The name of the report (e.g., 'recognition-log').
         * @param {string} [params=''] - URL-encoded query parameters.
         */
        getStatistics: (reportName, params = '') => fetchApi(`${baseUrl}/vigilante/statistics/${reportName}?${params}`, 'GET'),
    };
})(window);
