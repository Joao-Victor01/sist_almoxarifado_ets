document.addEventListener('DOMContentLoaded', function () {
    const form = document.querySelector('form');

    form.addEventListener('submit', async function (event) {
        event.preventDefault(); // Impede envio tradicional

        const username = form.username.value;
        const password = form.password.value;

        const formData = new URLSearchParams();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch('/api/almoxarifado/usuarios/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error('Falha no login');
            }

            const data = await response.json();
            localStorage.setItem('access_token', data.access_token);

            alert('Login realizado com sucesso!');
            window.location.href = '/dashboard'; // ou outro endpoint

        } catch (error) {
            alert('Erro no login: ' + error.message);
        }
    });
});
