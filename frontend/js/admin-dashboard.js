// ============================================
// ADMIN DASHBOARD - PATITAS FELICES
// ============================================

// Verificar autenticación al cargar
document.addEventListener('DOMContentLoaded', () => {
    if (!auth.requireAdmin()) {
        return;
    }
    
    initDashboard();
});

// ============ INICIALIZACIÓN ============
async function initDashboard() {
    const user = auth.getCurrentUser();
    document.getElementById('admin-name').textContent = user.nombre;
    
    await loadDashboardStats();
    setupSidebarNavigation();
    setupForms();
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
            auth.logout();
        }
    });
    
    loadAdminProfile();
}

// ============ NAVEGACIÓN DEL SIDEBAR ============
function setupSidebarNavigation() {
    const menuLinks = document.querySelectorAll('.sidebar-menu a:not(#logoutBtn)');
    
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const section = link.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
}

// ============ MOSTRAR SECCIONES ============
function showSection(sectionName) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.style.display = 'block';
        
        if (sectionName === 'home') {
            loadDashboardStats();
        } else if (sectionName === 'users') {
            loadUsers();
        } else if (sectionName === 'donations') {
            loadDonations();
        } else if (sectionName === 'requests') {
            loadRequests();
        } else if (sectionName === 'inventory') {
            loadInventory();
        } else if (sectionName === 'my-donations') {
            loadMyDonations();
        } else if (sectionName === 'my-requests') {
            loadMyRequests();
        } else if (sectionName === 'profile') {
            loadAdminProfile();
        }
    }
}

// ============ CARGAR ESTADÍSTICAS DEL DASHBOARD ============
async function loadDashboardStats() {
    try {
        const [users, donations, requests, inventory] = await Promise.all([
            api.get('/users'),
            api.get('/donations'),
            api.get('/requests'),
            api.get('/inventory')
        ]);
        
        document.getElementById('total-users').textContent = users.users.length;
        document.getElementById('total-donations').textContent = donations.donations.length;
        document.getElementById('total-requests').textContent = requests.requests.length;
        document.getElementById('total-inventory').textContent = inventory.inventory.length;
        
        const pendingDonations = donations.donations.filter(d => d.estado === 'pendiente').length;
        const pendingRequests = requests.requests.filter(r => r.estado === 'pendiente').length;
        const activeUsers = users.users.filter(u => u.activo).length;
        const lowStock = inventory.inventory.filter(i => i.cantidad < 10 && i.disponible).length;
        
        document.getElementById('pending-donations').textContent = pendingDonations;
        document.getElementById('pending-requests').textContent = pendingRequests;
        document.getElementById('active-users').textContent = activeUsers;
        document.getElementById('low-stock').textContent = lowStock;
        
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        utils.showAlert('Error al cargar estadísticas del dashboard', 'danger');
    }
}

// ============ GESTIÓN DE USUARIOS ============
async function loadUsers() {
    try {
        const response = await api.get('/users');
        const tbody = document.getElementById('users-tbody');
        
        if (response.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay usuarios registrados</td></tr>';
            return;
        }
        
        tbody.innerHTML = response.users.map(user => `
            <tr>
                <td>${user.nombre}</td>
                <td>${user.email}</td>
                <td><span class="badge ${user.rol === 'administrador' ? 'badge-aceptada' : 'badge-pendiente'}">${user.rol.toUpperCase()}</span></td>
                <td><span class="badge ${user.activo ? 'badge-aceptada' : 'badge-rechazada'}">${user.activo ? 'ACTIVO' : 'INACTIVO'}</span></td>
                <td>${utils.formatDate(user.fechaRegistro)}</td>
                <td>
                    <button class="btn-sm btn-info" onclick="editUser('${user._id}')">Editar</button>
                    ${user.rol !== 'administrador' ? `<button class="btn-sm btn-danger" onclick="deleteUser('${user._id}')">Eliminar</button>` : ''}
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        utils.showAlert('Error al cargar usuarios', 'danger');
    }
}

async function editUser(userId) {
    try {
        const response = await api.get(`/users/${userId}`);
        const user = response.user;
        
        document.getElementById('user-id').value = user._id;
        document.getElementById('user-nombre').value = user.nombre;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-telefono').value = user.telefono || '';
        document.getElementById('user-rol').value = user.rol;
        document.getElementById('user-activo').value = user.activo.toString();
        
        document.getElementById('user-modal').classList.add('active');
    } catch (error) {
        utils.showAlert('Error al cargar usuario', 'danger');
    }
}

async function deleteUser(userId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
        return;
    }
    
    try {
        await api.delete(`/users/${userId}`);
        utils.showAlert('Usuario eliminado exitosamente', 'success');
        loadUsers();
    } catch (error) {
        utils.showAlert(error.message || 'Error al eliminar usuario', 'danger');
    }
}

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
}

// ============ GESTIÓN DE DONACIONES ============
async function loadDonations() {
    try {
        const statusFilter = document.getElementById('donation-status-filter').value;
        const endpoint = statusFilter ? `/donations?estado=${statusFilter}` : '/donations';
        const response = await api.get(endpoint);
        const tbody = document.getElementById('donations-tbody');
        
        if (response.donations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay donaciones registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = response.donations.map(donation => `
            <tr>
                <td>${donation.usuario.nombre}</td>
                <td>${donation.articulo}</td>
                <td>${utils.formatCategory(donation.categoria)}</td>
                <td>${donation.cantidad} ${donation.unidad}</td>
                <td><span class="badge ${utils.getBadgeClass(donation.estado)}">${donation.estado.toUpperCase()}</span></td>
                <td>${utils.formatDate(donation.fechaDonacion)}</td>
                <td>
                    <button class="btn-sm btn-warning" onclick="changeDonationStatus('${donation._id}', '${donation.articulo}', '${donation.usuario.nombre}')">Cambiar Estado</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar donaciones:', error);
        utils.showAlert('Error al cargar donaciones', 'danger');
    }
}

function changeDonationStatus(donationId, articulo, usuario) {
    document.getElementById('donation-id').value = donationId;
    document.getElementById('donation-info').value = `${articulo} - ${usuario}`;
    document.getElementById('donation-status-modal').classList.add('active');
}

function closeDonationStatusModal() {
    document.getElementById('donation-status-modal').classList.remove('active');
}

// ============ GESTIÓN DE SOLICITUDES ============
async function loadRequests() {
    try {
        const statusFilter = document.getElementById('request-status-filter').value;
        const endpoint = statusFilter ? `/requests?estado=${statusFilter}` : '/requests';
        const response = await api.get(endpoint);
        const tbody = document.getElementById('requests-tbody');
        
        if (response.requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay solicitudes registradas</td></tr>';
            return;
        }
        
        tbody.innerHTML = response.requests.map(request => `
            <tr>
                <td>${request.usuario.nombre}</td>
                <td>${request.articulo.nombre}</td>
                <td>${request.cantidad} ${request.articulo.unidad}</td>
                <td><span class="badge ${utils.getBadgeClass(request.estado)}">${request.estado.toUpperCase()}</span></td>
                <td>${utils.formatDate(request.fechaSolicitud)}</td>
                <td>
                    <button class="btn-sm btn-warning" onclick="changeRequestStatus('${request._id}', '${request.articulo.nombre}', '${request.usuario.nombre}')">Cambiar Estado</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        utils.showAlert('Error al cargar solicitudes', 'danger');
    }
}

function changeRequestStatus(requestId, articulo, usuario) {
    document.getElementById('request-id').value = requestId;
    document.getElementById('request-info').value = `${articulo} - ${usuario}`;
    
    const statusSelect = document.getElementById('request-new-status');
    statusSelect.addEventListener('change', () => {
        const rejectReasonGroup = document.getElementById('reject-reason-group');
        if (statusSelect.value === 'rechazada') {
            rejectReasonGroup.style.display = 'block';
        } else {
            rejectReasonGroup.style.display = 'none';
        }
    });
    
    document.getElementById('request-status-modal').classList.add('active');
}

function closeRequestStatusModal() {
    document.getElementById('request-status-modal').classList.remove('active');
}

// ============ GESTIÓN DE INVENTARIO ============
async function loadInventory() {
    try {
        const response = await api.get('/inventory');
        const tbody = document.getElementById('inventory-tbody');
        
        if (response.inventory.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay artículos en el inventario</td></tr>';
            return;
        }
        
        tbody.innerHTML = response.inventory.map(item => `
            <tr>
                <td>${item.nombre}</td>
                <td>${utils.formatCategory(item.categoria)}</td>
                <td>${item.cantidad}</td>
                <td>${item.unidad}</td>
                <td><span class="badge ${item.disponible ? 'badge-aceptada' : 'badge-rechazada'}">${item.disponible ? 'SÍ' : 'NO'}</span></td>
                <td>${utils.formatDate(item.ultimaActualizacion)}</td>
                <td>
                    <button class="btn-sm btn-info" onclick="editInventory('${item._id}')">Editar</button>
                    <button class="btn-sm btn-danger" onclick="deleteInventory('${item._id}')">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar inventario:', error);
        utils.showAlert('Error al cargar inventario', 'danger');
    }
}

function showAddInventoryModal() {
    document.getElementById('inventory-modal-title').textContent = 'Agregar Artículo';
    document.getElementById('inventory-id').value = '';
    document.getElementById('inventory-form').reset();
    document.getElementById('inventory-modal').classList.add('active');
}

async function editInventory(inventoryId) {
    try {
        const response = await api.get(`/inventory/${inventoryId}`);
        const item = response.inventory;
        
        document.getElementById('inventory-modal-title').textContent = 'Editar Artículo';
        document.getElementById('inventory-id').value = item._id;
        document.getElementById('inventory-nombre').value = item.nombre;
        document.getElementById('inventory-categoria').value = item.categoria;
        document.getElementById('inventory-cantidad').value = item.cantidad;
        document.getElementById('inventory-unidad').value = item.unidad;
        document.getElementById('inventory-descripcion').value = item.descripcion || '';
        document.getElementById('inventory-disponible').value = item.disponible.toString();
        
        document.getElementById('inventory-modal').classList.add('active');
    } catch (error) {
        utils.showAlert('Error al cargar artículo', 'danger');
    }
}

async function deleteInventory(inventoryId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este artículo?')) {
        return;
    }
    
    try {
        await api.delete(`/inventory/${inventoryId}`);
        utils.showAlert('Artículo eliminado exitosamente', 'success');
        loadInventory();
    } catch (error) {
        utils.showAlert(error.message || 'Error al eliminar artículo', 'danger');
    }
}

function closeInventoryModal() {
    document.getElementById('inventory-modal').classList.remove('active');
}

// ============ MIS DONACIONES PERSONALES ============
async function loadMyDonations() {
    try {
        const response = await api.get('/donations');
        const tbody = document.getElementById('my-donations-tbody');
        
        const currentUserId = auth.getCurrentUser().id;
        const myDonations = response.donations.filter(d => d.usuario._id === currentUserId);
        
        if (myDonations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No has hecho donaciones personales</td></tr>';
            return;
        }
        
        tbody.innerHTML = myDonations.map(donation => `
            <tr>
                <td>${donation.articulo}</td>
                <td>${utils.formatCategory(donation.categoria)}</td>
                <td>${donation.cantidad} ${donation.unidad}</td>
                <td><span class="badge ${utils.getBadgeClass(donation.estado)}">${donation.estado.toUpperCase()}</span></td>
                <td>${utils.formatDate(donation.fechaDonacion)}</td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar mis donaciones:', error);
        utils.showAlert('Error al cargar donaciones personales', 'danger');
    }
}

// ============ MIS SOLICITUDES PERSONALES ============
async function loadMyRequests() {
    try {
        const response = await api.get('/requests');
        const tbody = document.getElementById('my-requests-tbody');
        
        const currentUserId = auth.getCurrentUser().id;
        const myRequests = response.requests.filter(r => r.usuario._id === currentUserId);
        
        const activeRequest = myRequests.find(r => 
            ['pendiente', 'aceptada', 'enviada'].includes(r.estado)
        );
        
        const requestAlert = document.getElementById('my-request-alert');
        const newRequestBtn = document.getElementById('my-new-request-btn');
        
        if (activeRequest) {
            requestAlert.innerHTML = `
                <div class="alert alert-info">
                    Tienes una solicitud activa (${activeRequest.estado}). 
                    Solo puedes tener una solicitud a la vez.
                </div>
            `;
            newRequestBtn.disabled = true;
            newRequestBtn.style.opacity = '0.5';
        } else {
            requestAlert.innerHTML = '';
            newRequestBtn.disabled = false;
            newRequestBtn.style.opacity = '1';
        }
        
        if (myRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No has hecho solicitudes personales</td></tr>';
            return;
        }
        
        tbody.innerHTML = myRequests.map(request => {
            const canEdit = request.estado === 'pendiente';
            const canDelete = request.estado === 'pendiente';
            
            return `
                <tr>
                    <td>${request.articulo.nombre}</td>
                    <td>${request.cantidad} ${request.articulo.unidad}</td>
                    <td><span class="badge ${utils.getBadgeClass(request.estado)}">${request.estado.toUpperCase()}</span></td>
                    <td>${utils.formatDate(request.fechaSolicitud)}</td>
                    <td>
                        ${canEdit ? `<button class="btn-sm btn-info" onclick="editMyRequest('${request._id}')">Modificar</button>` : ''}
                        ${canDelete ? `<button class="btn-sm btn-danger" onclick="deleteMyRequest('${request._id}')">Eliminar</button>` : ''}
                        ${!canEdit && !canDelete ? '<span style="color: var(--gray-color);">Sin acciones</span>' : ''}
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error al cargar mis solicitudes:', error);
        utils.showAlert('Error al cargar solicitudes personales', 'danger');
    }
}

async function showMyRequestModal() {
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
        utils.showAlert('Error al cargar inventario', 'danger');
    }
}

async function editMyRequest(requestId) {
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
        utils.showAlert('Error al cargar solicitud', 'danger');
    }
}

async function deleteMyRequest(requestId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta solicitud?')) {
        return;
    }
    
    try {
        await api.delete(`/requests/${requestId}`);
        utils.showAlert('Solicitud eliminada exitosamente', 'success');
        loadMyRequests();
    } catch (error) {
        utils.showAlert(error.message || 'Error al eliminar solicitud', 'danger');
    }
}

function closeMyRequestModal() {
    document.getElementById('request-modal').classList.remove('active');
}

function closeEditRequestModal() {
    document.getElementById('edit-request-modal').classList.remove('active');
}

// ============ PERFIL DE ADMINISTRADOR ============
async function loadAdminProfile() {
    try {
        const response = await api.get('/auth/profile');
        const user = response.user;
        
        document.getElementById('admin-nombre').value = user.nombre;
        document.getElementById('admin-email').value = user.email;
        document.getElementById('admin-telefono').value = user.telefono || '';
        document.getElementById('admin-direccion').value = user.direccion || '';
        document.getElementById('admin-fecha-registro').value = utils.formatDate(user.fechaRegistro);
    } catch (error) {
        console.error('Error al cargar perfil:', error);
    }
}

function showProfileAlert(message, type) {
    const container = document.getElementById('profile-alert');
    container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    
    setTimeout(() => {
        container.innerHTML = '';
    }, 5000);
}

// ============ CONFIGURACIÓN DE FORMULARIOS ============
function setupForms() {
    document.getElementById('user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const userId = document.getElementById('user-id').value;
        const formData = {
            nombre: document.getElementById('user-nombre').value,
            email: document.getElementById('user-email').value,
            telefono: document.getElementById('user-telefono').value,
            rol: document.getElementById('user-rol').value,
            activo: document.getElementById('user-activo').value === 'true'
        };
        
        try {
            await api.put(`/users/${userId}`, formData);
            utils.showAlert('Usuario actualizado exitosamente', 'success');
            closeUserModal();
            loadUsers();
        } catch (error) {
            utils.showAlert(error.message || 'Error al actualizar usuario', 'danger');
        }
    });
    
    document.getElementById('donation-status-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const donationId = document.getElementById('donation-id').value;
        const formData = {
            estado: document.getElementById('donation-new-status').value,
            notas: document.getElementById('donation-notes').value
        };
        
        try {
            await api.patch(`/donations/${donationId}/status`, formData);
            utils.showAlert('Estado actualizado exitosamente', 'success');
            closeDonationStatusModal();
            loadDonations();
            loadDashboardStats();
        } catch (error) {
            utils.showAlert(error.message || 'Error al actualizar estado', 'danger');
        }
    });
    
    document.getElementById('request-status-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const requestId = document.getElementById('request-id').value;
        const newStatus = document.getElementById('request-new-status').value;
        
        const formData = {
            estado: newStatus,
            notas: document.getElementById('request-notes').value
        };
        
        if (newStatus === 'rechazada') {
            formData.motivoRechazo = document.getElementById('request-reject-reason').value;
            if (!formData.motivoRechazo) {
                utils.showAlert('Debes proporcionar un motivo de rechazo', 'danger');
                return;
            }
        }
        
        try {
            await api.patch(`/requests/${requestId}/status`, formData);
            utils.showAlert('Estado actualizado exitosamente', 'success');
            closeRequestStatusModal();
            loadRequests();
            loadDashboardStats();
        } catch (error) {
            utils.showAlert(error.message || 'Error al actualizar estado', 'danger');
        }
    });
    
    document.getElementById('inventory-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const inventoryId = document.getElementById('inventory-id').value;
        const formData = {
            nombre: document.getElementById('inventory-nombre').value,
            categoria: document.getElementById('inventory-categoria').value,
            cantidad: parseFloat(document.getElementById('inventory-cantidad').value),
            unidad: document.getElementById('inventory-unidad').value,
            descripcion: document.getElementById('inventory-descripcion').value,
            disponible: document.getElementById('inventory-disponible').value === 'true'
        };
        
        try {
            if (inventoryId) {
                await api.put(`/inventory/${inventoryId}`, formData);
                utils.showAlert('Artículo actualizado exitosamente', 'success');
            } else {
                await api.post('/inventory', formData);
                utils.showAlert('Artículo agregado exitosamente', 'success');
            }
            closeInventoryModal();
            loadInventory();
            loadDashboardStats();
        } catch (error) {
            utils.showAlert(error.message || 'Error al guardar artículo', 'danger');
        }
    });
    
    document.getElementById('admin-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            nombre: document.getElementById('admin-nombre').value,
            telefono: document.getElementById('admin-telefono').value,
            direccion: document.getElementById('admin-direccion').value
        };
        
        try {
            const response = await api.put('/auth/profile', formData);
            
            const user = auth.getCurrentUser();
            user.nombre = response.user.nombre;
            localStorage.setItem('user', JSON.stringify(user));
            
            document.getElementById('admin-name').textContent = response.user.nombre;
            
            showProfileAlert('Perfil actualizado exitosamente', 'success');
        } catch (error) {
            showProfileAlert(error.message || 'Error al actualizar perfil', 'danger');
        }
    });
    
    document.getElementById('change-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword !== confirmPassword) {
            showProfileAlert('Las contraseñas no coinciden', 'danger');
            return;
        }
        
        if (newPassword.length < 6) {
            showProfileAlert('La contraseña debe tener al menos 6 caracteres', 'danger');
            return;
        }
        
        try {
            await api.put('/auth/change-password', {
                currentPassword,
                newPassword
            });
            
            showProfileAlert('Contraseña actualizada exitosamente', 'success');
            document.getElementById('change-password-form').reset();
        } catch (error) {
            showProfileAlert(error.message || 'Error al cambiar contraseña', 'danger');
        }
    });
    
    document.getElementById('my-request-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            articulo: document.getElementById('request-articulo').value,
            cantidad: parseInt(document.getElementById('request-cantidad').value),
            descripcion: document.getElementById('request-descripcion').value
        };
        
        try {
            await api.post('/requests', formData);
            utils.showAlert('Solicitud creada exitosamente', 'success');
            closeMyRequestModal();
            document.getElementById('my-request-form').reset();
            loadMyRequests();
        } catch (error) {
            utils.showAlert(error.message || 'Error al crear solicitud', 'danger');
        }
    });
    
    document.getElementById('edit-my-request-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const requestId = document.getElementById('edit-request-id').value;
        const formData = {
            cantidad: parseInt(document.getElementById('edit-request-cantidad').value),
            descripcion: document.getElementById('edit-request-descripcion').value
        };
        
        try {
            await api.put(`/requests/${requestId}`, formData);
            utils.showAlert('Solicitud actualizada exitosamente', 'success');
            closeEditRequestModal();
            loadMyRequests();
        } catch (error) {
            utils.showAlert(error.message || 'Error al actualizar solicitud', 'danger');
        }
    });
}

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});