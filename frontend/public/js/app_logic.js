/**
 * @file Handles the main application logic, including navigation, content loading, and user interactions.
 * @author Jules
 */

let socket;
// let pathFaceImg = '../uploads/faces/';
let pathFaceImg = 'http://localhost:8085/public/uploads/faces/';

// function renderPaginator(elementId, totalPages, currentPage, onPageClick) {
//     const paginator = $(elementId);
//     if (paginator.data('bootpag')) {
//         paginator.bootpag('destroy');
//     }
//     paginator.bootpag({
//         total: totalPages,
//         page: currentPage,
//         maxVisible: 5,
//         leaps: true,
//         firstLastUse: true,
//         first: '<span aria-hidden="true">&larr;</span>',
//         last: '<span aria-hidden="true">&rarr;</span>',
//         wrapClass: 'pagination',
//         activeClass: 'active',
//         disabledClass: 'disabled',
//         nextClass: 'next',
//         prevClass: 'prev',
//         lastClass: 'last',
//         firstClass: 'first'
//     }).on("page", (event, num) => onPageClick(num));
// }
// function renderStatsFilters(reportName, queryParams = {}) {
//     const { startDate = '', endDate = '', camera = '', type = '', user = '' } = queryParams;

//     let specificFilters = '';
//     if (reportName === 'recognition-log') {
//         specificFilters = `
//             <div class="col-md-3">
//                 <label for="camera" class="form-label">Camera</label>
//                 <input type="text" class="form-control" name="camera" id="camera" value="${camera}">
//             </div>
//             <div class="col-md-3">
//                 <label for="type" class="form-label">Type</label>
//                 <input type="text" class="form-control" name="type" id="type" value="${type}">
//             </div>
//         `;
//     } else if (reportName === 'recognition-by-user') {
//         specificFilters = `
//             <div class="col-md-6">
//                 <label for="user" class="form-label">User</label>
//                 <input type="text" class="form-control" name="user" id="user" value="${user}">
//             </div>
//         `;
//     }

//     return `
//         <div class="card mb-4">
//             <div class="card-body">
//                 <h5 class="card-title">Filters</h5>
//                 <form id="stats-filter-form">
//                     <div class="row g-3">
//                         <div class="col-md-3">
//                             <label for="startDate" class="form-label">Start Date</label>
//                             <input type="date" class="form-control" name="startDate" id="startDate" value="${startDate}">
//                         </div>
//                         <div class="col-md-3">
//                             <label for="endDate" class="form-label">End Date</label>
//                             <input type="date" class="form-control" name="endDate" id="endDate" value="${endDate}">
//                         </div>
//                         ${specificFilters}
//                         <div class="col-md-12 d-flex justify-content-end align-items-center">
//                             <button type="submit" class="btn btn-primary">Apply Filters 2</button>
//                         </div>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     `;
// }
// function renderStatsTable(results) {
//     if (!results || results.length === 0) {
//         return '<p class="text-center text-muted">No data available for the selected filters.</p>';
//     }
//     const headers = Object.keys(results[0]);
//     let tableHtml = '<div class="table-responsive"><table class="table table-striped table-bordered">';

//     // Create table headers
//     tableHtml += '<thead><tr>';
//     headers.forEach(header => tableHtml += `<th>${header}</th>`);
//     tableHtml += '</tr></thead>';

//     // Create table body
//     tableHtml += '<tbody>';
//     results.forEach(row => {
//         tableHtml += '<tr>';
//         headers.forEach(header => {
//             const value = row[header] !== null && row[header] !== undefined ? row[header] : '';
//             tableHtml += `<td>${value}</td>`;
//         });
//         tableHtml += '</tr>';
//     });
//     tableHtml += '</tbody></table></div>';

//     return tableHtml;
// }
// async function fGetStatsPage(reportName, params = '') {
//     window.UI.loadingSpinner.show();
//     const contentBody = document.getElementById('fullbody');

//     try {
//         const response = await window.VigilanteAPI.getStatistics(reportName, params);
//         const { data, query } = response;
//         const { results, totalPages, currentPage, totalRecords } = data;

//         // Build the page structure
//         const filtersHtml = renderStatsFilters(reportName, query);
//         const tableHtml = renderStatsTable(results);

//         contentBody.innerHTML = `
//             <div class="container-fluid">
//                 <h1>Report: ${reportName.replace(/-/g, ' ')}</h1>
//                 <p>Showing ${results.length} of ${totalRecords} records.</p>
//                 ${filtersHtml}
//                 ${tableHtml}
//                 <div class="d-flex justify-content-center">
//                     <ul id="stats-paginator"></ul>
//                 </div>
//             </div>
//         `;

//         // Render paginator
//         if (totalPages > 1) {
//             renderPaginator('#stats-paginator', totalPages, currentPage, (num) => {
//                 const filterForm = document.getElementById('stats-filter-form');
//                 const formData = new FormData(filterForm);
//                 const currentParams = new URLSearchParams(formData);
//                 currentParams.set('page', num);
//                 fGetStatsPage(reportName, currentParams.toString());
//             });
//         }

//         // Add form submission listener
//         const filterForm = document.getElementById('stats-filter-form');
//         if (filterForm) {
//             filterForm.addEventListener('submit', (e) => {
//                 e.preventDefault();
//                 const formData = new FormData(filterForm);
//                 const newParams = new URLSearchParams(formData).toString();
//                 fGetStatsPage(reportName, newParams);
//             });
//         }

//     } catch (error) {
//         contentBody.innerHTML = `<div class="alert alert-danger">Error loading report: ${error.message}</div>`;
//     } finally {
//         window.UI.loadingSpinner.hide();
//     }
// }

// --- EVENT LISTENERS ---

// Event Delegation for Report Filters
// document.body.addEventListener('change', function(event) {
//     if (event.target.classList.contains('report-filter-cb')) {
//         const selectedTipos = Array.from(document.querySelectorAll('.report-filter-cb:checked')).map(cb => cb.value);
//         window.AccessReport.getPersonas(1, selectedTipos); // Reset to page 1 with new filters
//     }

//     // Event Delegation for Live Stream Filters is now handled in camera-management.js
// });


// async function fSendImg() {
//     const contentBody = document.getElementById('fullbody');
//     contentBody.innerHTML = `
//         <div class="container mt-4">
//             <h1>Enviar Imagen para Reconocimiento 1</h1>
//             <div class="row">
//                 <div class="col-md-6">
//                     <div class="card">
//                         <div class="card-header">Cargar Imagen</div>
//                         <div class="card-body">
//                             <form id="recognition-form">
//                                 <div class="mb-3">
//                                     <label for="camera-select" class="form-label">Seleccionar Cámara</label>
//                                     <select id="camera-select" class="form-select" required></select>
//                                 </div>
//                                 <div class="mb-3">
//                                     <label for="image-input" class="form-label">Seleccionar archivo de imágen</label>
//                                     <input type="file" class="form-control" id="image-input" accept="image/*" required>
//                                 </div>
//                                 <button type="submit" class="btn btn-primary">Procesar Imagen 1</button>
//                             </form>
//                         </div>
//                     </div>
//                 </div>
//                 <div class="col-md-6">
//                     <div class="card">
//                         <div class="card-header">Previsualizar</div>
//                         <div class="card-body text-center">
//                             <img id="image-preview" src="https://via.placeholder.com/300" alt="Image preview" class="img-fluid rounded">
//                         </div>
//                     </div>
//                 </div>
//             </div>
//             <div id="results-container" class="mt-4"></div>
//         </div>
//     `;

//     const cameraSelect = document.getElementById('camera-select');
//     const imageInput = document.getElementById('image-input');
//     const imagePreview = document.getElementById('image-preview');
//     const recognitionForm = document.getElementById('recognition-form');
//     const resultsContainer = document.getElementById('results-container');

//     // Fetch and populate cameras
//     try {
//         // const cameras = await window.VigilanteAPI.getCamaras();
//         const {results:cameras} = await window.VigilanteAPI.getCamaras();
//         cameraSelect.innerHTML = '<option value="">-- Seleccione una cámara --</option>';
//         cameras.forEach(cam => {
//             if (cam.Estado.toLowerCase() === 'activo') {
//                 const option = document.createElement('option');
//                 option.value = cam.ID;
//                 option.textContent = `${cam.Nombre} (${cam.Ubicacion})`;
//                 cameraSelect.appendChild(option);
//             }
//         });
//     } catch (error) {
//         cameraSelect.innerHTML = '<option value="">Error al cargar cámaras</option>';
//         console.error('Error fetching cameras:', error);
//     }

//     imageInput.addEventListener('change', () => {
//         const file = imageInput.files[0];
//         if (file) {
//             const reader = new FileReader();
//             reader.onload = (e) => {
//                 imagePreview.src = e.target.result;
//             };
//             reader.readAsDataURL(file);
//         }
//     });

//     recognitionForm.addEventListener('submit', async (event) => {
//         event.preventDefault();
//         const file = imageInput.files[0];
//         if (!file) {
//             UI.showToast('Por favor, seleccione una imágen.', 'warning');
//             return;
//         }

//         const camara_id = cameraSelect.value;
//         const camara_name = cameraSelect.text;
//         if (!camara_id) {
//             UI.showToast('Por favor, seleccione una cámara.', 'warning');
//             return;
//         }

//         const formData = new FormData();
//         formData.append('archivo', file);
//         formData.append('camara_id', camara_id);
//         formData.append('camara_name', camara_name);

//         window.UI.loadingSpinner.show();
//         resultsContainer.innerHTML = `<div class="alert alert-info">Enviando imagen para procesamiento...</div>`;
//         const startTime = performance.now();

//         try {
//             // 1. Make the API call to queue the image for recognition.
//             const response = await window.VigilanteAPI.recognizeImage(formData);
//             const { jobId } = response;

//             // 2. Update the UI to show the task is queued.
//             resultsContainer.innerHTML = `<div class="alert alert-info">Tarea [${jobId}] encolada. Esperando resultados...</div>`;

//             // 3. Ensure the socket is connected before emitting.
//             if (!socket || !socket.connected) {
//                 // Attempt to reconnect or inform the user.
//                 resultsContainer.innerHTML = `<div class="alert alert-danger"><strong>Error de Conexión:</strong> No se pudo comunicar con el servidor de notificaciones. Por favor, recargue la página.</div>`;
//                 window.UI.loadingSpinner.hide();
//                 // Optionally, try to reconnect: socket.connect();
//                 return;
//             }

//             // 4. Join the WebSocket room for this specific job.
//             socket.emit('joinRoom', jobId);

//             // 5. Set up a one-time listener for the completion event.
//             socket.once('recognitionComplete', (result) => {
//                 const endTime = performance.now();
//                 const duration = ((endTime - startTime) / 1000).toFixed(2);
//                 if (result) {
//                     displayRecognitionResult(result, resultsContainer, duration);
//                 } else {
//                     resultsContainer.innerHTML = `<div class="alert alert-danger"><strong>Error:</strong> No se recibieron resultados del servidor.2</div>`;
//                 }
//                 window.UI.loadingSpinner.hide();
//             });

//             // 6. Set up a one-time listener for any recognition errors.
//             socket.once('recognitionError', (error) => {
//                 resultsContainer.innerHTML = `<div class="alert alert-danger"><strong>Error en el procesamiento:</strong> ${error.message || 'Ocurrió un error desconocido.'}</div>`;
//                 window.UI.loadingSpinner.hide();
//             });

//         } catch (error) {
//             // This catch block handles errors from the initial API call (e.g., HTTP 500).
//             resultsContainer.innerHTML = `<div class="alert alert-danger"><strong>Error al encolar la tarea:</strong> ${error.message}</div>`;
//             window.UI.loadingSpinner.hide();
//         }
//     });
// }
// function displayRecognitionResult(result, container, duration) {
//     if (!result || result.personasDetectadas === 0) {
//         container.innerHTML = `
//             <div class="alert alert-warning">
//                 <h4>Process Finished</h4>
//                 <p>No faces were detected in the image.</p>
//                 <small class="text-muted">Processing time: ${duration} seconds.</small>
//             </div>`;
//         return;
//     }

//     const { personasDetectadas, personasIdentificadas, personasDesconocidas } = result;

//     const summaryHtml = `
//         <div class="card bg-light mb-4 shadow-sm">
//             <div class="card-body">
//                 <h4 class="card-title">Recognition Summary 2</h4>
//                 <ul class="list-group list-group-flush">
//                     <li class="list-group-item d-flex justify-content-between align-items-center">
//                         Processing Time: <span class="badge bg-secondary rounded-pill">${duration}s</span>
//                     </li>
//                     <li class="list-group-item d-flex justify-content-between align-items-center">
//                         Faces Detected: <span class="badge bg-primary rounded-pill">${personasDetectadas}</span>
//                     </li>
//                     <li class="list-group-item d-flex justify-content-between align-items-center">
//                         Identified: <span class="badge bg-success rounded-pill">${personasIdentificadas.length}</span>
//                     </li>
//                     <li class="list-group-item d-flex justify-content-between align-items-center">
//                         Unknown: <span class="badge bg-danger rounded-pill">${personasDesconocidas.length}</span>
//                     </li>
//                 </ul>
//             </div>
//         </div>`;

//     const identifiedHtml = personasIdentificadas.length > 0 ? `
//         <h3 class="mt-4">Identified People</h3>
//         <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-6 g-4">
//             ${personasIdentificadas.map(person => {
//                 const confidence = (person.similarity * 100).toFixed(2);
//                 const imagePath = `${pathFaceImg}${person.img}`;
//                 const borderClass = person.usuario_tipo === 'ladron' ? 'border-danger' : (person.usuario_tipo === 'socio' ? 'border-success' : 'border-secondary');
//                 return `
//                     <div class="col">
//                         <div class="card h-100 shadow-sm ${borderClass} border-3">
//                             <img src="${imagePath}" class="card-img-top" alt="Photo of ${person.usuario_nombre}">
//                             <div class="card-body">
//                                 <h5 class="card-title">${person.usuario_nombre}</h5>
//                                 <p class="card-text mb-1"><strong>Type:</strong> ${person.usuario_tipo}</p>
//                                 <p class="card-text"><strong>Confidence:</strong> ${confidence}%</p>
//                                 <a href="#" class="btn btn-sm btn-outline-primary" onclick="window.AccessEditor.feditarImgUser(${person.usuario_id})">View Profile</a>
//                             </div>
//                         </div>
//                     </div>`;
//             }).join('')}
//         </div>` : '';

//     const unknownHtml = personasDesconocidas.length > 0 ? `
//         <h3 class="mt-4">Unknown Faces</h3>
//         <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
//             ${personasDesconocidas.map((unknown, index) => `
//                 <div class="col">
//                     <div class="card h-100 shadow-sm">
//                         <div class="card-header">Unknown #${index + 1}</div>
//                         <img src="${pathFaceImg}${unknown.img}" class="card-img-top" alt="Unknown face #${index + 1}">
//                         <div class="card-body">
//                             <p class="card-text">This face does not match any registered person.</p>
//                         </div>
//                     </div>
//                 </div>`
//             ).join('')}
//         </div>` : '';

//     container.innerHTML = summaryHtml + identifiedHtml + unknownHtml;
// }

// Sign Out Button
// document.getElementById('singoutbtn').addEventListener('click', async () => {
//     try {
//         await window.VigilanteAPI.logout();
//     } catch (error) {
//         console.error('Logout request failed, but proceeding with client-side cleanup.', error);
//     } finally {
//         localStorage.removeItem('token');
//         window.location.href = '/';
//     }
// });


// --- INITIALIZATION ---
let disabledByRole = null;

(function(window) {
    // This immediately-invoked function expression (IIFE) will run once
    // and set the disabledByRole variable based on the user's role.
    const userRole = window.VigilanteAPI.getUserRole();
    if (userRole !== 'socio') {
        disabledByRole = 'disabled';
    }
})(window);


// function subscribeUser(swReg) {
//     const vapidPublicKey = 'BIhyFCxbF3D-Wor-F11eezJHZZ3Z1eS9IZEQD0li9mDxV_dt3unW11eZ20EHhQvK0OKYuvaXLARIi1Yjxq8-5ZA';

//     // Guard against placeholder key to prevent crashing
//     if (!vapidPublicKey || vapidPublicKey === 'your_public_vapid_key') {
//         console.warn('VAPID public key not configured. Push notification subscription skipped.');
//         return;
//     }

//     const applicationServerKey = urlB64ToUint8Array(vapidPublicKey);
//     swReg.pushManager.subscribe({
//         userVisibleOnly: true,
//         applicationServerKey: applicationServerKey
//     })
//     .then(subscription => {
//         console.log('User is subscribed.');
//         // Send subscription to the server
//         fetch('/api/subscribe', {
//             method: 'POST',
//             body: JSON.stringify(subscription),
//             headers: {
//                 'Content-Type': 'application/json'
//             }
//         });
//     })
//     .catch(err => {
//         console.log('Failed to subscribe the user: ', err);
//     });
// }

// function urlB64ToUint8Array(base64String) {
//     const padding = '='.repeat((4 - base64String.length % 4) % 4);
//     const base64 = (base64String + padding)
//         .replace(/\-/g, '+')
//         .replace(/_/g, '/');

//     const rawData = window.atob(base64);
//     const outputArray = new Uint8Array(rawData.length);

//     for (let i = 0; i < rawData.length; ++i) {
//         outputArray[i] = rawData.charCodeAt(i);
//     }
//     return outputArray;
// }
// function renderAccessReport(reportData, activeFilters = []) {
//     const { results, totalRecords } = reportData;
//     const tiposDisponibles = { 'socio': 'Socio', 'empleado': 'Empleado', 'familia': 'Familia', 'desconocido': 'Desconocido', 'ladron': 'Ladron' };
//     const filtersToUse = activeFilters.length > 0 ? activeFilters : Object.keys(tiposDisponibles);

//     const filterCheckboxes = Object.entries(tiposDisponibles).map(([value, label]) => `
//         <label class="list-group-item">
//             <input type="checkbox" value="${value}" class="form-check-input me-1 report-filter-cb" ${filtersToUse.includes(value) ? 'checked' : ''}>
//             ${label}
//         </label>
//     `).join('');

//     const filterSection = `
//         <div class="col-12">
//             <ul class="list-group list-group-horizontal flex-wrap">
//                 <li class="list-group-item fw-bold">Filter by:</li>
//                 ${filterCheckboxes}
//             </ul>
//         </div>
//         <div class="col-12 mt-2">
//             <button type="button" class="btn btn-warning" onclick="window.AccessEditor.funificarImgUser()" ${disabledByRole}>Unify Selected</button>
//         </div>`;

//     const userCards = results && results.length > 0
//         ? results.map(userGroup => {
//             const { usuario_id, usuario_nombre, usuario_tipo, fecha_eliminacion, accesos } = userGroup;
//             const carouselId = `card-carousel-${usuario_id}`;

//             const carouselItems = accesos.map((acceso, index) => `
//                 <div class="carousel-item ${index === 0 ? 'active' : ''}">
//                     <img class="img-fluid d-block w-100" src="${pathFaceImg}${acceso.img}" alt="Access image for ${usuario_nombre}">
//                     <div class="carousel-caption d-none d-md-block bg-dark bg-opacity-50 rounded p-1">
//                         <h5 class="mb-0">${acceso.camara_nombre} [${Math.round(acceso.similarity * 100)}%]</h5>
//                         <p class="mb-0">${acceso.fecha_acceso}</p>
//                     </div>
//                 </div>
//             `).join('');

//             const carouselIndicators = accesos.map((_, index) => `
//                 <button type="button" class="${index === 0 ? 'active' : ''}" data-bs-target="#${carouselId}" data-bs-slide-to="${index}" aria-label="Slide ${index + 1}"></button>
//             `).join('');

//             const borderClasses = {
//                 'ladron': 'border-danger border-3',
//                 'socio': 'border-success border-3',
//                 'desconocido': 'border-info border-3'
//             };
//             let cardBorder = borderClasses[usuario_tipo] || 'border-light';
//             if (fecha_eliminacion) cardBorder = 'border-dark border-3 opacity-50';

//             const lastAccess = accesos.length > 0 ? accesos[0].fecha_acceso : userGroup.usuario_fecha_creacion;

//             return `
//                 <div class="col" id="card_${usuario_id}">
//                     <div class="card ${cardBorder} h-100 shadow-sm">
//                         <div id="${carouselId}" class="carousel slide" data-bs-ride="carousel">
//                             <div class="carousel-indicators">${carouselIndicators}</div>
//                             <div class="carousel-inner">${carouselItems}</div>
//                             <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev"><span class="carousel-control-prev-icon" aria-hidden="true"></span><span class="visually-hidden">Previous</span></button>
//                             <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next"><span class="carousel-control-next-icon" aria-hidden="true"></span><span class="visually-hidden">Next</span></button>
//                         </div>
//                         <div class="card-body">
//                             <h5 class="card-title">${usuario_nombre} #${usuario_id}</h5>
//                             <h6 class="card-subtitle mb-2 text-muted">${usuario_tipo}</h6>
//                             <p class="card-text"><small>Last Access: ${lastAccess}</small></p>
//                             <div class="d-flex justify-content-between align-items-center">
//                                 <a href="#" class="btn btn-sm btn-outline-primary" onclick="window.AccessEditor.feditarImgUser(${usuario_id})">Edit Profile</a>
//                                 <div class="form-check form-switch">
//                                     <input class="form-check-input ImgAcceso-filter-cb" type="checkbox" value="${usuario_id}" title="Select for bulk action">
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>`;
//         }).join('')
//         : '<div class="col-12 mt-3"><p class="text-center text-muted">No activity records found.</p></div>';

//     return `
//         <div class="container-fluid mt-3">
//             <div class="card-body">
//                 <h1 class="h3">Recognized People: Showing ${results.length} of ${totalRecords}</h1>
//                 <p class="text-muted">Please classify correctly. Unify if duplicates exist.</p>
//             </div>
//             <div class="row mb-3">${filterSection}</div>
//             <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">${userCards}</div>
//             <div class="d-flex justify-content-center mt-4">
//                 <ul id='btnsPaginator'></ul>
//             </div>
//         </div>`;
// }