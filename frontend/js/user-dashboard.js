// Variables globales
let currentInventory = [];
let currentRequest = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const user = auth.getCurrentUser();
    if (user) {
        document.getElementById('user-name').textContent = user.nombre;
        document.getElementById('welcome-name').textContent = user.nombre;
    }
    
    // Cargar datos iniciales
    loadDashboardStats();
    loadDonations();
    loadRequests();
    loadProfile();
    
    // Configurar navegación
    setupNavigation();
    
    // Configurar event handlers globales
    setupGlobalEventHandlers();
    
    // Configurar logout
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            auth.logout();
        }
    });
    
    // Configurar formularios
    setupForms();
});

// Configurar event handlers globales
function setupGlobalEventHandlers() {
    // Botones con data-action
    document.addEventListener('click', (e) => {
        const target = e.target;
        
        // Manejar botones con data-action
        if (target.dataset.action) {
            e.preventDefault();
            handleAction(target.dataset.action);
        }
        
        // Manejar botones de cerrar modal
        if (target.classList.contains('modal-close')) {
            const modalType = target.dataset.modal;
            if (modalType === 'donation') closeDonationModal();
            else if (modalType === 'request') closeRequestModal();
            else if (modalType === 'edit-request') closeEditRequestModal();
        }
        
        // Manejar botones de editar/eliminar solicitud
        if (target.classList.contains('btn-edit-request')) {
            const requestId = target.dataset.id;
            editRequest(requestId);
        }
        
        if (target.classList.contains('btn-delete-request')) {
            const requestId = target.dataset.id;
            deleteRequest(requestId);
        }
    });
    
    // Filtro de inventario
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', loadInventory);
    }
}

// Manejar acciones de botones
function handleAction(action) {
    switch(action) {
        case 'show-donations':
            showSection('donations');
            break;
        case 'show-requests':
            showSection('requests');
            break;
        case 'new-donation':
            showDonationModal();
            break;
        case 'new-request':
            showRequestModal();
            break;
    }
}

// Configurar navegación entre secciones
function setupNavigation() {
    const links = document.querySelectorAll('.sidebar-menu a[data-section]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
            
            // Actualizar clase active
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

// Mostrar sección
function showSection(sectionName) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        // Cargar datos según la sección
        if (sectionName === 'donations') {
            loadDonations();
        } else if (sectionName === 'requests') {
            loadRequests();
        } else if (sectionName === 'inventory') {
            loadInventory();
        }
    }
}

// Cargar estadísticas del dashboard
async function loadDashboardStats() {
    try {
        const [donations, requests] = await Promise.all([
            api.get('/donations'),
            api.get('/requests')
        ]);
        
        document.getElementById('total-donations').textContent = donations.count || 0;
        
        const activeRequests = requests.requests.filter(r => 
            ['pendiente', 'aceptada', 'enviada'].includes(r.estado)
        );
        document.getElementById('total-requests').textContent = activeRequests.length;
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Cargar donaciones
async function loadDonations() {
    try {
        const response = await api.get('/donations');
        const tbody = document.getElementById('donations-tbody');
        
        if (response.donations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No tienes donaciones registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = response.donations.map(donation => `
            <tr>
                <td>${donation.articulo}</td>
                <td>${utils.formatCategory(donation.categoria)}</td>
                <td>${donation.cantidad} ${donation.unidad}</td>
                <td><span class="badge ${utils.getBadgeClass(donation.estado)}">${donation.estado.toUpperCase()}</span></td>
                <td>${utils.formatDate(donation.fechaDonacion)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar donaciones:', error);
        utils.showAlert('Error al cargar donaciones', 'danger');
    }
}

// Cargar solicitudes
async function loadRequests() {
    try {
        const response = await api.get('/requests');
        const tbody = document.getElementById('requests-tbody');
        
        // Verificar si hay solicitud activa
        const activeRequest = response.requests.find(r => 
            ['pendiente', 'aceptada', 'enviada'].includes(r.estado)
        );
        
        const requestAlert = document.getElementById('request-alert');
        const newRequestBtn = document.getElementById('new-request-btn');
        
        if (activeRequest) {
            requestAlert.innerHTML = `
                <div class="alert alert-info">
                    Tienes una solicitud activa (${activeRequest.estado}). 
                    Solo puedes tener una solicitud a la vez.
                </div>
            `;
            newRequestBtn.disabled = true;
            newRequestBtn.style.opacity = '0.5';
            newRequestBtn.style.cursor = 'not-allowed';
        } else {
            requestAlert.innerHTML = '';
            newRequestBtn.disabled = false;
            newRequestBtn.style.opacity = '1';
            newRequestBtn.style.cursor = 'pointer';
        }
        
        if (response.requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No tienes solicitudes registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = response.requests.map(request => {
            const canEdit = request.estado === 'pendiente';
            const canDelete = request.estado === 'pendiente';
            
            return `
                <tr>
                    <td>${request.articulo.nombre}</td>
                    <td>${request.cantidad} ${request.articulo.unidad}</td>
                    <td><span class="badge ${utils.getBadgeClass(request.estado)}">${request.estado.toUpperCase()}</span></td>
                    <td>${utils.formatDate(request.fechaSolicitud)}</td>
                    <td>
                        ${canEdit ? `<button class="btn-sm btn-info btn-edit-request" data-id="${request._id}">Modificar</button>` : ''}
                        ${canDelete ? `<button class="btn-sm btn-danger btn-delete-request" data-id="${request._id}">Eliminar</button>` : ''}
                        ${!canEdit && !canDelete ? '<span style="color: var(--gray-color);">Sin acciones</span>' : ''}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        utils.showAlert('Error al cargar solicitudes', 'danger');
    }
}

// Cargar inventario
async function loadInventory() {
    try {
        const categoria = document.getElementById('category-filter').value;
        let url = '/inventory?disponible=true';
        if (categoria) {
            url += `&categoria=${categoria}`;
        }
        
        const response = await api.get(url);
        currentInventory = response.inventory;
        const tbody = document.getElementById('inventory-tbody');
        
        if (response.inventory.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay artículos disponibles</td></tr>';
            return;
        }
        
        tbody.innerHTML = response.inventory.map(item => `
            <tr>
                <td>${item.nombre}</td>
                <td>${utils.formatCategory(item.categoria)}</td>
                <td>${item.cantidad}</td>
                <td>${utils.formatUnit(item.unidad)}</td>
                <td>
                    ${item.cantidad > 0 
                        ? '<span class="badge badge-aceptada">Disponible</span>' 
                        : '<span class="badge badge-rechazada">Agotado</span>'}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        utils.showAlert('Error al cargar inventario', 'danger');
    }
}

// Cargar perfil
async function loadProfile() {
    try {
        const response = await api.get('/auth/profile');
        const user = response.user;
        
        document.getElementById('profile-nombre').value = user.nombre;
        document.getElementById('profile-email').value = user.email;
        document.getElementById('profile-telefono').value = user.telefono || '';
        document.getElementById('profile-direccion').value = user.direccion || '';
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    }
}

// Configurar formularios
function setupForms() {
    // Formulario de donación
    document.getElementById('donation-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            articulo: document.getElementById('donation-articulo').value,
            categoria: document.getElementById('donation-categoria').value,
            cantidad: parseInt(document.getElementById('donation-cantidad').value),
            unidad: document.getElementById('donation-unidad').value,
            descripcion: document.getElementById('donation-descripcion').value
        };
        
        try {
            await api.post('/donations', formData);
            utils.showAlert('Donación enviada exitosamente', 'success');
            closeDonationModal();
            loadDonations();
            loadDashboardStats();
            document.getElementById('donation-form').reset();
        } catch (error) {
            utils.showAlert(error.message || 'Error al enviar donación', 'danger');
        }
    });
    
    // Formulario de solicitud
    document.getElementById('request-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            articulo: document.getElementById('request-articulo').value,
            cantidad: parseInt(document.getElementById('request-cantidad').value),
            descripcion: document.getElementById('request-descripcion').value
        };
        
        try {
            await api.post('/requests', formData);
            utils.showAlert('Solicitud enviada exitosamente', 'success');
            closeRequestModal();
            loadRequests();
            loadDashboardStats();
            document.getElementById('request-form').reset();
        } catch (error) {
            utils.showAlert(error.message || 'Error al enviar solicitud', 'danger');
        }
    });
    
    // Formulario de edición de solicitud
    document.getElementById('edit-request-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const requestId = document.getElementById('edit-request-id').value;
        const formData = {
            cantidad: parseInt(document.getElementById('edit-request-cantidad').value),
            descripcion: document.getElementById('edit-request-descripcion').value
        };
        
        try {
            await api.put(`/requests/${requestId}`, formData);
            utils.showAlert('Solicitud actualizada. Vuelve a estar pendiente de aprobación.', 'success');
            closeEditRequestModal();
            loadRequests();
        } catch (error) {
            utils.showAlert(error.message || 'Error al actualizar solicitud', 'danger');
        }
    });
    
    // Formulario de perfil
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            nombre: document.getElementById('profile-nombre').value,
            telefono: document.getElementById('profile-telefono').value,
            direccion: document.getElementById('profile-direccion').value
        };
        
        try {
            const response = await api.put('/auth/profile', formData);
            utils.showAlert('Perfil actualizado exitosamente', 'success');
            
            // Actualizar usuario en localStorage
            const user = auth.getCurrentUser();
            user.nombre = response.user.nombre;
            localStorage.setItem('user', JSON.stringify(user));
            
            document.getElementById('user-name').textContent = response.user.nombre;
            document.getElementById('welcome-name').textContent = response.user.nombre;
        } catch (error) {
            utils.showAlert(error.message || 'Error al actualizar perfil', 'danger');
        }
    });
}

// Modales
function showDonationModal() {
    document.getElementById('donation-modal').classList.add('active');
}

function closeDonationModal() {
    document.getElementById('donation-modal').classList.remove('active');
}

async function showRequestModal() {
    try {
        const response = await api.get('/inventory?disponible=true');
        const select = document.getElementById('request-articulo');
        
        select.innerHTML = '<option value="">Seleccionar artículo...</option>' +
            response.inventory
                .filter(item => item.cantidad > 0)
                .map(item => `
                    <option value="${item._id}" data-max="${item.cantidad}" data-unit="${item.unidad}">
                        ${item.nombre} (${item.cantidad} ${item.unidad} disponibles)
                    </option>
                `).join('');
        
        // Actualizar límite de cantidad cuando se selecciona un artículo
        select.addEventListener('change', () => {
            const selectedOption = select.options[select.selectedIndex];
            const maxCantidad = selectedOption.dataset.max;
            const unit = selectedOption.dataset.unit;
            
            const cantidadInput = document.getElementById('request-cantidad');
            cantidadInput.max = maxCantidad;
            
            document.getElementById('request-max-cantidad').textContent = 
                `Máximo disponible: ${maxCantidad} ${unit}`;
        });
        
        document.getElementById('request-modal').classList.add('active');
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        utils.showAlert('Error al cargar inventario', 'danger');
    }
}

function closeRequestModal() {
    document.getElementById('request-modal').classList.remove('active');
}

async function editRequest(requestId) {
    try {
        const response = await api.get(`/requests/${requestId}`);
        const request = response.request;
        
        document.getElementById('edit-request-id').value = request._id;
        document.getElementById('edit-request-articulo-name').value = request.articulo.nombre;
        document.getElementById('edit-request-cantidad').value = request.cantidad;
        document.getElementById('edit-request-cantidad').max = request.articulo.cantidad;
        document.getElementById('edit-request-descripcion').value = request.descripcion || '';
        
        document.getElementById('edit-request-max-cantidad').textContent = 
            `Máximo disponible: ${request.articulo.cantidad} ${request.articulo.unidad}`;
        
        document.getElementById('edit-request-modal').classList.add('active');
    } catch (error) {
        console.error('Error al cargar solicitud:', error);
        utils.showAlert('Error al cargar solicitud', 'danger');
    }
}

function closeEditRequestModal() {
    document.getElementById('edit-request-modal').classList.remove('active');
}

async function deleteRequest(requestId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta solicitud?')) {
        return;
    }
    
    try {
        await api.delete(`/requests/${requestId}`);
        utils.showAlert('Solicitud eliminada exitosamente', 'success');
        loadRequests();
        loadDashboardStats();
    } catch (error) {
        utils.showAlert(error.message || 'Error al eliminar solicitud', 'danger');
    }
}