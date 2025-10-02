document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error('Formulario de login no encontrado');
        return;
    }
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const alertContainer = document.getElementById('alert-container');
        alertContainer.innerHTML = '';
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        
        console.log('Intentando login con:', email);
        
        try {
            const response = await api.post('/auth/login', { email, password });
            
            console.log('Respuesta login:', response);
            
            if (response.success) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                
                showAlert('✅ Inicio de sesión exitoso. Redirigiendo...', 'success');
                
                setTimeout(() => {
                    if (response.user.rol === 'administrador') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'user-dashboard.html';
                    }
                }, 1500);
            }
        } catch (error) {
            console.error('Error en login:', error);
            showAlert(`❌ ${error.message || 'Error al iniciar sesión'}`, 'danger');
        }
    });
});

function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    alertContainer.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    
    setTimeout(() => {
        alertContainer.innerHTML = '';
    }, 5000);
}