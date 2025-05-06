

document.getElementById('form-login').addEventListener('submit', async function (event) {
  event.preventDefault();

  const form = event.target;
  const formData = new FormData(form);
  const data = new URLSearchParams(formData);

  try {
    const response = await fetch('/api/almoxarifado/usuarios/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json'
      },
      body: data,
      credentials: 'include' // IMPORTANTE: isso permite que o cookie seja salvo
    });

    if (response.ok) {
      // Depois de salvar o cookie com sucesso, redireciona manualmente
      window.location.href = "/";
    } else {
      const result = await response.json();
      alert(result.detail || "Erro ao fazer login");
    }
  } catch (err) {
    console.error("Erro no login:", err);
    alert("Erro de rede ao tentar fazer login.");
  }
});
