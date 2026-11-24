import { Octokit } from "octokit";
import './style.css';

// Referencias a elementos del DOM
const btnConectar = document.getElementById('btn-conectar');
const authStatus = document.getElementById('auth-status');
const createCard = document.getElementById('create-card');
const searchInput = document.getElementById('search-input');
const reposContainer = document.getElementById('repos-container');
const repoNameInput = document.getElementById('repo-name');
const repoDescInput = document.getElementById('repo-desc');
const repoPrivateCheckbox = document.getElementById('repo-private');
const btnCrear = document.getElementById('btn-crear');

let octokit = null;
let allRepos = [];

// Evento para conectar y autenticar con Octokit utilizando el archivo .env de Vite
btnConectar.addEventListener('click', async () => {
  const token = import.meta.env.VITE_GITHUB_TOKEN;

  if (!token || token === "ghp_tu_token_personal_aqui") {
    alert("No se encontró un token válido en el archivo .env. Por favor, configura VITE_GITHUB_TOKEN.");
    return;
  }

  try {
    authStatus.textContent = "Autenticando...";
    authStatus.className = "status disconnected";

    octokit = new Octokit({ auth: token });

    const { data: user } = await octokit.rest.users.getAuthenticated();

    authStatus.textContent = `Conectado como: @${user.login}`;
    authStatus.className = "status connected";

    createCard.style.opacity = "1";
    createCard.style.pointerEvents = "auto";
    searchInput.removeAttribute('disabled');

    await cargarRepositorios();
  } catch (error) {
    console.error(error);
    authStatus.textContent = "Error de autenticación (Token inválido en .env)";
    authStatus.className = "status disconnected";
    octokit = null;
    createCard.style.opacity = "0.5";
    createCard.style.pointerEvents = "none";
    searchInput.setAttribute('disabled', 'true');
  }
});

// Función para obtener y renderizar los repositorios del usuario autenticado
async function cargarRepositorios() {
  if (!octokit) return;

  reposContainer.innerHTML = `<p class="placeholder-text">Cargando repositorios...</p>`;

  try {
    const response = await octokit.rest.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100
    });

    allRepos = response.data;
    renderizarRepositorios(allRepos);
  } catch (error) {
    console.error(error);
    reposContainer.innerHTML = `<p class="placeholder-text">Error al cargar los repositorios.</p>`;
  }
}

// Función para pintar la lista de repositorios en el DOM
function renderizarRepositorios(repos) {
  if (repos.length === 0) {
    reposContainer.innerHTML = `<p class="placeholder-text">No se encontraron repositorios.</p>`;
    return;
  }

  reposContainer.innerHTML = '';

  repos.forEach(repo => {
    const repoElement = document.createElement('div');
    repoElement.className = 'repo-item';
    repoElement.innerHTML = `
      <div>
        <h3><a href="${repo.html_url}" target="_blank">${repo.name}</a></h3>
        <p>${repo.description ? repo.description : 'Sin descripción'}</p>
      </div>
      <div class="repo-meta">
        <span class="badge">${repo.private ? 'Privado' : 'Público'}</span>
        <span>⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count}</span>
      </div>
    `;
    reposContainer.appendChild(repoElement);
  });
}

// Filtrar repositorios en tiempo real mediante el buscador
searchInput.addEventListener('input', (e) => {
  const query = e.target.value.toLowerCase();
  const reposFiltrados = allRepos.filter(repo =>
    repo.name.toLowerCase().includes(query) ||
    (repo.description && repo.description.toLowerCase().includes(query))
  );
  renderizarRepositorios(reposFiltrados);
});

// Evento para crear un nuevo repositorio interactivamente
btnCrear.addEventListener('click', async () => {
  if (!octokit) return;

  const name = repoNameInput.value.trim();
  const description = repoDescInput.value.trim();
  const isPrivate = repoPrivateCheckbox.checked;

  if (!name) {
    alert("El nombre del repositorio es obligatorio.");
    return;
  }

  try {
    btnCrear.textContent = "Creando...";
    btnCrear.setAttribute('disabled', 'true');

    const response = await octokit.rest.repos.createForAuthenticatedUser({
      name: name,
      description: description,
      private: isPrivate,
      auto_init: true
    });

    alert(`¡Repositorio "${response.data.name}" creado exitosamente!`);

    repoNameInput.value = '';
    repoDescInput.value = '';
    repoPrivateCheckbox.checked = false;

    await cargarRepositorios();
  } catch (error) {
    console.error(error);
    alert(`Error al crear el repositorio: ${error.message}`);
  } finally {
    btnCrear.textContent = "Crear Repositorio";
    btnCrear.removeAttribute('disabled');
  }
});