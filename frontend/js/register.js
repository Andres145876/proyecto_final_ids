// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    
    if (!registerForm) {
        console.error('Formulario de registro no encontrado');
        return;
    }
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const alertContainer = document.getElementById('alert-container');
        alertContainer.innerHTML = '';
        
        const formData = {
            nombre: document.getElementById('nombre').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            telefono: document.getElementById('telefono').value.trim(),
            direccion: document.getElementById('direccion').value.trim()
        };
        
        console.log('Enviando datos de registro:', { ...formData, password: '***' });
        
        try {
            const response = await api.post('/auth/register', formData);
            
            console.log('Respuesta del servidor:', response);
            
            if (response.success) {
                localStorage.setItem('token', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
                
                showAlert('✅ Registro exitoso. Redirigiendo...', 'success');
                
                setTimeout(() => {
                    window.location.href = 'user-dashboard.html';
                }, 1500);
            }
        } catch (error) {
            console.error('Error completo:', error);
            
            if (error.errors) {
                error.errors.forEach(err => {
                    showAlert(`❌ ${err.field}: ${err.message}`, 'danger');
                });
            } else {
                showAlert(`❌ ${error.message || 'Error al registrarse. Por favor intenta de nuevo.'}`, 'danger');
            }
        }
    });
});

function showAlert(message, type) {
    const alertContainer = document.getElementById('alert-container');
    if (!alertContainer) return;
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = message;
    alertContainer.appendChild(alert);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
        alert.remove();
    }, 5000);
}