// Configuración de la API
const API_BASE_URL = 'https://patitas-backend.onrender.com/api';

// Cliente API
const api = {
    // Método GET
    async get(endpoint) {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw data;
            }
            
            return data;
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },
    
    // Método POST
    async post(endpoint, body) {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw data;
            }
            
            return data;
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    },
    
    // Método PUT
    async put(endpoint, body) {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw data;
            }
            
            return data;
        } catch (error) {
            console.error('API PUT Error:', error);
            throw error;
        }
    },
    
    // Método PATCH
    async patch(endpoint, body) {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify(body)
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw data;
            }
            
            return data;
        } catch (error) {
            console.error('API PATCH Error:', error);
            throw error;
        }
    },
    
    // Método DELETE
    async delete(endpoint) {
        try {
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'DELETE',
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw data;
            }
            
            return data;
        } catch (error) {
            console.error('API DELETE Error:', error);
            throw error;
        }
    }
};

// Utilidades
const utils = {
    // Formatear fecha
    formatDate(dateString) {
        const options = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return new Date(dateString).toLocaleDateString('es-MX', options);
    },
    
    // Formatear categoría
    formatCategory(category) {
        const categories = {
            'alimento_perros': 'Alimento para Perros',
            'alimento_gatos': 'Alimento para Gatos',
            'juguetes': 'Juguetes',
            'medicamentos': 'Medicamentos',
            'accesorios': 'Accesorios',
            'mantas': 'Mantas',
            'otros': 'Otros'
        };
        return categories[category] || category;
    },
    
    // Formatear unidad
    formatUnit(unit) {
        const units = {
            'kg': 'Kilogramos',
            'unidades': 'Unidades',
            'litros': 'Litros',
            'paquetes': 'Paquetes'
        };
        return units[unit] || unit;
    },
    
    // Obtener clase de badge según estado
    getBadgeClass(estado) {
        const classes = {
            'pendiente': 'badge-pendiente',
            'aceptada': 'badge-aceptada',
            'rechazada': 'badge-rechazada',
            'enviada': 'badge-enviada',
            'recibida': 'badge-recibida'
        };
        return classes[estado] || 'badge-pendiente';
    },
    
    // Mostrar alerta
    showAlert(message, type = 'info', containerId = 'alert-container') {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        container.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    },
    
    // Confirmar acción
    confirmAction(message) {
        return confirm(message);
    }
};