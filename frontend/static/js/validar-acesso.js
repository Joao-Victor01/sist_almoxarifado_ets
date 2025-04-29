// frontend/static/js/validar-acesso.js
;(function () {
  // 1) lê token
  const token = localStorage.getItem('access_token')
  if (!token) {
    window.location.replace('/')
    return
  }

  // 2) decodifica payload e checa expiração
  let payload
  try {
    payload = JSON.parse(atob(token.split('.')[1]))
  } catch {
    localStorage.removeItem('access_token')
    window.location.replace('/')
    return
  }
  const now = Date.now() / 1000
  if (!payload.exp || payload.exp < now) {
    localStorage.removeItem('access_token')
    window.location.replace('/')
    return
  }

  // 3) checa role x rota
  const pageRole = {
    dashboardServidor:    1,
    dashboardAlmoxarifado: 2,
    dashboardDirecao:      3
  }
  const path = window.location.pathname.split('/').pop()
  const required = pageRole[path]
  if (required && payload.tipo_usuario !== required) {
    localStorage.removeItem('access_token')
    window.location.replace('/')
    return
  }

  // se tudo ok, segue em frente
})()
