// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    const user = auth.getCurrentUser();
    if (user) {
        document.getElementById('admin-name').textContent = user.nombre;
    }
    
    // Cargar datos iniciales
    loadDashboardStats();
    
    // Configurar navegación
    setupNavigation();
    
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

// Configurar navegación
function setupNavigation() {
    const links = document.querySelectorAll('.sidebar-menu a[data-section]');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
            
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
        if (sectionName === 'users') {
            loadUsers();
        } else if (sectionName === 'donations') {
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
        const [users, donations, requests, inventory] = await Promise.all([
            api.get('/users'),
            api.get('/donations'),
            api.get('/requests'),
            api.get('/inventory')
        ]);
        
        // Estadísticas generales
        document.getElementById('total-users').textContent = users.count || 0;
        document.getElementById('total-donations').textContent = donations.count || 0;
        document.getElementById('total-requests').textContent = requests.count || 0;
        document.getElementById('total-inventory').textContent = inventory.count || 0;
        
        // Estadísticas específicas
        const pendingDonations = donations.donations.filter(d => d.estado === 'pendiente').length;
        document.getElementById('pending-donations').textContent = pendingDonations;
        
        const pendingRequests = requests.requests.filter(r => r.estado === 'pendiente').length;
        document.getElementById('pending-requests').textContent = pendingRequests;
        
        const activeUsers = users.users.filter(u => u.activo).length;
        document.getElementById('active-users').textContent = activeUsers;
        
        const lowStock = inventory.inventory.filter(i => i.cantidad < 5 && i.cantidad > 0).length;
        document.getElementById('low-stock').textContent = lowStock;
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// ============ USUARIOS ============

async function loadUsers() {
    try {
        const response = await api.get('/users');
        const tbody = document.getElementById('users-tbody');
        
        if (response.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay usuarios registrados</td></tr>';
            return;
        }
        
        const currentUser = auth.getCurrentUser();
        
        tbody.innerHTML = response.users.map(user => {
            const statusBtnClass = user.activo ? 'btn-warning' : 'btn-success';
            const statusBtnText = user.activo ? 'Desactivar' : 'Activar';
            return `
            <tr>
                <td>${user.nombre}</td>
                <td>${user.email}</td>
                <td><span class="badge ${user.rol === 'administrador' ? 'badge-recibida' : 'badge-pendiente'}">${user.rol.toUpperCase()}</span></td>
                <td><span class="badge ${user.activo ? 'badge-aceptada' : 'badge-rechazada'}">${user.activo ? 'ACTIVO' : 'INACTIVO'}</span></td>
                <td>${utils.formatDate(user.createdAt)}</td>
                <td>
                    ${currentUser.id !== user._id ? `
                        <button class="btn-sm btn-info" onclick="editUser('${user._id}')">Editar</button>
                        <button class="btn-sm ${statusBtnClass}" 
                                onclick="toggleUserStatus('${user._id}', ${user.activo})">
                            ${statusBtnText}
                        </button>
                        <button class="btn-sm btn-danger" onclick="deleteUser('${user._id}')">Eliminar</button>
                    ` : '<span style="color: var(--gray-color);">Tú</span>'}
                </td>
            </tr>
        `;
        }).join('');
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
        console.error('Error al cargar usuario:', error);
        utils.showAlert('Error al cargar usuario', 'danger');
    }
}

async function toggleUserStatus(userId, currentStatus) {
    const action = currentStatus ? 'desactivar' : 'activar';
    if (!confirm(`¿Estás seguro de que quieres ${action} este usuario?`)) {
        return;
    }
    
    try {
        await api.patch(`/users/${userId}/toggle-status`);
        utils.showAlert(`Usuario ${action === 'desactivar' ? 'desactivado' : 'activado'} exitosamente`, 'success');
        loadUsers();
        loadDashboardStats();
    } catch (error) {
        utils.showAlert(error.message || 'Error al cambiar estado', 'danger');
    }
}

async function deleteUser(userId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
        return;
    }
    
    try {
        await api.delete(`/users/${userId}`);
        utils.showAlert('Usuario eliminado exitosamente', 'success');
        loadUsers();
        loadDashboardStats();
    } catch (error) {
        utils.showAlert(error.message || 'Error al eliminar usuario', 'danger');
    }
}

// ============ DONACIONES ============

async function loadDonations() {
    try {
        const statusFilter = document.getElementById('donation-status-filter').value;
        const response = await api.get('/donations');
        const tbody = document.getElementById('donations-tbody');
        
        let donations = response.donations;
        if (statusFilter) {
            donations = donations.filter(d => d.estado === statusFilter);
        }
        
        if (donations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay donaciones</td></tr>';
            return;
        }
        
        tbody.innerHTML = donations.map(donation => `
            <tr>
                <td>${donation.usuario.nombre}</td>
                <td>${donation.articulo}</td>
                <td>${utils.formatCategory(donation.categoria)}</td>
                <td>${donation.cantidad} ${donation.unidad}</td>
                <td><span class="badge ${utils.getBadgeClass(donation.estado)}">${donation.estado.toUpperCase()}</span></td>
                <td>${utils.formatDate(donation.fechaDonacion)}</td>
                <td>
                    <button class="btn-sm btn-info" onclick="changeDonationStatus('${donation._id}')">Cambiar Estado</button>
                    <button class="btn-sm btn-danger" onclick="deleteDonation('${donation._id}')">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar donaciones:', error);
        utils.showAlert('Error al cargar donaciones', 'danger');
    }
}

async function changeDonationStatus(donationId) {
    try {
        const response = await api.get(`/donations/${donationId}`);
        const donation = response.donation;
        
        document.getElementById('donation-id').value = donation._id;
        document.getElementById('donation-info').value = 
            `${donation.articulo} - ${donation.cantidad} ${donation.unidad} de ${donation.usuario.nombre}`;
        document.getElementById('donation-new-status').value = donation.estado;
        document.getElementById('donation-notes').value = donation.notas || '';
        
        document.getElementById('donation-status-modal').classList.add('active');
    } catch (error) {
        console.error('Error al cargar donación:', error);
        utils.showAlert('Error al cargar donación', 'danger');
    }
}

async function deleteDonation(donationId) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta donación?')) {
        return;
    }
    
    try {
        await api.delete(`/donations/${donationId}`);
        utils.showAlert('Donación eliminada exitosamente', 'success');
        loadDonations();
        loadDashboardStats();
    } catch (error) {
        utils.showAlert(error.message || 'Error al eliminar donación', 'danger');
    }
}

// ============ SOLICITUDES ============

async function loadRequests() {
    try {
        const statusFilter = document.getElementById('request-status-filter').value;
        const response = await api.get('/requests');
        const tbody = document.getElementById('requests-tbody');
        
        let requests = response.requests;
        if (statusFilter) {
            requests = requests.filter(r => r.estado === statusFilter);
        }
        
        if (requests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay solicitudes</td></tr>';
            return;
        }
        
        tbody.innerHTML = requests.map(request => `
            <tr>
                <td>${request.usuario.nombre}</td>
                <td>${request.articulo.nombre}</td>
                <td>${request.cantidad} ${request.articulo.unidad}</td>
                <td><span class="badge ${utils.getBadgeClass(request.estado)}">${request.estado.toUpperCase()}</span></td>
                <td>${utils.formatDate(request.fechaSolicitud)}</td>
                <td>
                    <button class="btn-sm btn-info" onclick="changeRequestStatus('${request._id}')">Cambiar Estado</button>
                    <button class="btn-sm btn-danger" onclick="deleteRequest('${request._id}')">Eliminar</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error al cargar solicitudes:', error);
        utils.showAlert('Error al cargar solicitudes', 'danger');
    }
}

async function changeRequestStatus(requestId) {
    try {
        const response = await api.get(`/requests/${requestId}`);
        const request = response.request;
        
        document.getElementById('request-id').value = request._id;
        document.getElementById('request-info').value = 
            `${request.articulo.nombre} - ${request.cantidad} ${request.articulo.unidad} para ${request.usuario.nombre}`;
        document.getElementById('request-new-status').value = request.estado;
        document.getElementById('request-reject-reason').value = request.motivoRechazo || '';
        document.getElementById('request-notes').value = request.notas || '';
        
        // Mostrar/ocultar campo de motivo de rechazo
        document.getElementById('request-new-status').addEventListener('change', function() {
            const rejectGroup = document.getElementById('reject-reason-group');
            if (this.value === 'rechazada') {
                rejectGroup.style.display = 'block';
                document.getElementById('request-reject-reason').required = true;
            } else {
                rejectGroup.style.display = 'none';
                document.getElementById('request-reject-reason').required = false;
            }
        });
        
        document.getElementById('request-status-modal').classList.add('active');
    } catch (error) {
        console.error('Error al cargar solicitud:', error);
        utils.showAlert('Error al cargar solicitud', 'danger');
    }
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

// ============ INVENTARIO ============

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
                <td>${utils.formatUnit(item.unidad)}</td>
                <td>
                    <span class="badge ${item.disponible ? 'badge-aceptada' : 'badge-rechazada'}">
                        ${item.disponible ? 'DISPONIBLE' : 'NO DISPONIBLE'}
                    </span>
                </td>
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

async function editInventory(itemId) {
    try {
        const response = await api.get(`/inventory/${itemId}`);
        const item = response.item;
        
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
        console.error('Error al cargar artículo:', error);
        utils.showAlert('Error al cargar artículo', 'danger');
    }
}

async function deleteInventory(itemId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este artículo del inventario?')) {
        return;
    }
    
    try {
        await api.delete(`/inventory/${itemId}`);
        utils.showAlert('Artículo eliminado exitosamente', 'success');
        loadInventory();
        loadDashboardStats();
    } catch (error) {
        utils.showAlert(error.message || 'Error al eliminar artículo', 'danger');
    }
}

// ============ CONFIGURAR FORMULARIOS ============

function setupForms() {
    // Formulario de usuario
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
            loadDashboardStats();
        } catch (error) {
            utils.showAlert(error.message || 'Error al actualizar usuario', 'danger');
        }
    });
    
    // Formulario de estado de donación
    document.getElementById('donation-status-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const donationId = document.getElementById('donation-id').value;
        const formData = {
            estado: document.getElementById('donation-new-status').value,
            notas: document.getElementById('donation-notes').value
        };
        
        try {
            await api.patch(`/donations/${donationId}/status`, formData);
            utils.showAlert('Estado de donación actualizado', 'success');
            closeDonationStatusModal();
            loadDonations();
            loadInventory();
            loadDashboardStats();
        } catch (error) {
            utils.showAlert(error.message || 'Error al actualizar estado', 'danger');
        }
    });
    
    // Formulario de estado de solicitud
    document.getElementById('request-status-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const requestId = document.getElementById('request-id').value;
        const formData = {
            estado: document.getElementById('request-new-status').value,
            notas: document.getElementById('request-notes').value
        };
        
        if (formData.estado === 'rechazada') {
            formData.motivoRechazo = document.getElementById('request-reject-reason').value;
        }
        
        try {
            await api.patch(`/requests/${requestId}/status`, formData);
            utils.showAlert('Estado de solicitud actualizado', 'success');
            closeRequestStatusModal();
            loadRequests();
            loadInventory();
            loadDashboardStats();
        } catch (error) {
            utils.showAlert(error.message || 'Error al actualizar estado', 'danger');
        }
    });
    
    // Formulario de inventario
    document.getElementById('inventory-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const itemId = document.getElementById('inventory-id').value;
        const formData = {
            nombre: document.getElementById('inventory-nombre').value,
            categoria: document.getElementById('inventory-categoria').value,
            cantidad: parseInt(document.getElementById('inventory-cantidad').value),
            unidad: document.getElementById('inventory-unidad').value,
            descripcion: document.getElementById('inventory-descripcion').value,
            disponible: document.getElementById('inventory-disponible').value === 'true'
        };
        
        try {
            if (itemId) {
                // Editar
                await api.put(`/inventory/${itemId}`, formData);
                utils.showAlert('Artículo actualizado exitosamente', 'success');
            } else {
                // Crear
                await api.post('/inventory', formData);
                utils.showAlert('Artículo agregado al inventario', 'success');
            }
            
            closeInventoryModal();
            loadInventory();
            loadDashboardStats();
        } catch (error) {
            if (error.existingItem) {
                utils.showAlert(`Ya existe un artículo similar: ${error.existingItem.nombre} (${error.existingItem.cantidad} disponibles)`, 'warning');
            } else {
                utils.showAlert(error.message || 'Error al guardar artículo', 'danger');
            }
        }
    });
}

// ============ FUNCIONES DE MODALES ============

function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
}

function closeDonationStatusModal() {
    document.getElementById('donation-status-modal').classList.remove('active');
}

function closeRequestStatusModal() {
    document.getElementById('request-status-modal').classList.remove('active');
}

function closeInventoryModal() {
    document.getElementById('inventory-modal').classList.remove('active');
}