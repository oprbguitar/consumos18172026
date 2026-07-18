/* ============================================================
   Casa Servicios — Puerta de acceso (cifrado AES-256-GCM)
   Descifra payload.js con la contraseña y arranca la app.
   ============================================================ */
(function () {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const fromB64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const toB64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));
  const SS_KEY = 'casa_pass';
  let _password = null;

  async function deriveKey(password, salt, usages) {
    const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, usages
    );
  }

  async function decryptPayload(password) {
    const [s, i, c] = PAYLOAD_CIFRADO.split('.');
    const key = await deriveKey(password, fromB64(s), ['decrypt']);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(i) }, key, fromB64(c));
    return JSON.parse(dec.decode(pt)); // lanza error si la contraseña es incorrecta
  }

  async function encryptData(password, obj) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt, ['encrypt']);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)));
    return `${toB64(salt)}.${toB64(iv)}.${toB64(ct)}`;
  }

  // API para la app (publicar datos, cambiar contraseña)
  window.CasaCrypto = { getPassword: () => _password, encryptData };

  async function tryLogin(password, remember) {
    const datos = await decryptPayload(password);
    _password = password;
    if (remember) sessionStorage.setItem(SS_KEY, password);
    document.body.classList.remove('locked');
    const ov = document.getElementById('login-overlay');
    if (ov) ov.style.display = 'none';
    arrancarApp(datos);
  }

  function initLogin() {
    document.body.classList.add('locked');
    const form = document.getElementById('login-form');
    const err = document.getElementById('login-error');
    const btn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      btn.disabled = true; btn.textContent = 'Verificando…';
      const pass = document.getElementById('login-pass').value;
      const remember = document.getElementById('login-remember').checked;
      try {
        await tryLogin(pass, remember);
      } catch (ex) {
        err.textContent = '❌ Contraseña incorrecta. Intenta de nuevo.';
        btn.disabled = false; btn.textContent = 'Entrar';
      }
    });

    // Reanudar sesión guardada en este dispositivo (sessionStorage: se borra al cerrar la pestaña)
    const cached = sessionStorage.getItem(SS_KEY);
    if (cached) {
      tryLogin(cached, true).catch(() => sessionStorage.removeItem(SS_KEY));
    }
  }

  document.addEventListener('DOMContentLoaded', initLogin);
})();
