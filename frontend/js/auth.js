// Utilidades de autenticación
const auth = {
    // Verificar si el usuario está autenticado
    isAuthenticated() {
        const token = localStorage.getItem('token');
        return !!token;
    },
    
    // Obtener usuario actual
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
    
    // Obtener token
    getToken() {
        return localStorage.getItem('token');
    },
    
    // Cerrar sesión
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '../index.html';
    },
    
    // Verificar si es administrador
    isAdmin() {
        const user = this.getCurrentUser();
        return user && user.rol === 'administrador';
    },
    
    // Proteger página (requiere autenticación)
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },
    
    // Proteger página de admin
    requireAdmin() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        
        if (!this.isAdmin()) {
            window.location.href = 'user-dashboard.html';
            return false;
        }
        
        return true;
    },
    
    // Redirigir si ya está autenticado
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            const user = this.getCurrentUser();
            if (user.rol === 'administrador') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'user-dashboard.html';
            }
        }
    }
};

// Verificar autenticación al cargar la página (solo en páginas protegidas)
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    
    // Páginas que requieren autenticación
    const protectedPages = ['user-dashboard.html', 'admin-dashboard.html'];
    const adminPages = ['admin-dashboard.html'];
    
    // Verificar si estamos en una página protegida
    const isProtectedPage = protectedPages.some(page => currentPage.includes(page));
    const isAdminPage = adminPages.some(page => currentPage.includes(page));
    
    if (isProtectedPage) {
        if (isAdminPage) {
            auth.requireAdmin();
        } else {
            auth.requireAuth();
        }
    }
    
    // Si estamos en login o register y ya está autenticado, redirigir
    if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
        auth.redirectIfAuthenticated();
    }
});