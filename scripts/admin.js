const els = {
  loginPanel: document.querySelector("[data-admin-login-panel]"),
  composerPanel: document.querySelector("[data-admin-composer-panel]"),
  loginForm: document.querySelector("[data-admin-login-form]"),
  email: document.querySelector("[data-admin-email]"),
  password: document.querySelector("[data-admin-password]"),
  loginError: document.querySelector("[data-admin-login-error]"),
  logoutBtn: document.querySelector("[data-admin-logout]"),

  postForm: document.querySelector("[data-admin-post-form]"),
  postId: document.querySelector("[data-admin-post-id]"),
  title: document.querySelector("[data-admin-title]"),
  excerpt: document.querySelector("[data-admin-excerpt]"),
  type: document.querySelector("[data-admin-type]"),
  content: document.querySelector("[data-admin-content]"),
  mediaFile: document.querySelector("[data-admin-media-file]"),
  mediaUrl: document.querySelector("[data-admin-media-url]"),
  submitBtn: document.querySelector("[data-admin-submit]"),
  formMessage: document.querySelector("[data-admin-form-message]"),

  postsList: document.querySelector("[data-admin-posts-list]"),
};

const TOKEN_KEY = "admin-jwt-token";

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function show(el, visible) {
  if (!el) return;
  el.style.display = visible ? "" : "none";
}

const API_BASE = window.APP_CONFIG?.API_BASE || "http://localhost:3000";

async function api(path, { method = "GET", token, body, headers } = {}) {
  // Appel de l’API du backend. Si la page est servie par Live Server (127.0.0.1:5500),
  // on force le service sur localhost:3000.
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      ...(headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const message = json?.message || `Erreur ${res.status}`;
    throw new Error(message);
  }
  return json;
}

function renderPostItem(post) {
  const wrap = document.createElement("div");
  wrap.className = "admin-post-item";

  const topDiv = document.createElement("div");
  topDiv.className = "admin-post-item__top";

  const infoDiv = document.createElement("div");

  const titleDiv = document.createElement("div");
  titleDiv.className = "admin-post-item__title";
  titleDiv.textContent = post.title || "";
  infoDiv.appendChild(titleDiv);

  const metaDiv = document.createElement("div");
  metaDiv.className = "admin-post-item__meta";
  metaDiv.textContent = `${new Date(post.createdAt).toLocaleString("fr-FR")} · ${post.type || "text"}`;
  infoDiv.appendChild(metaDiv);

  topDiv.appendChild(infoDiv);

  const actionsDiv = document.createElement("div");
  actionsDiv.className = "admin-post-item__actions";

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "btn-secondary";
  editBtn.setAttribute("data-admin-edit", post.id);
  editBtn.textContent = "Éditer";
  actionsDiv.appendChild(editBtn);

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "btn-danger";
  deleteBtn.setAttribute("data-admin-delete", post.id);
  deleteBtn.textContent = "Supprimer";
  actionsDiv.appendChild(deleteBtn);

  topDiv.appendChild(actionsDiv);
  wrap.appendChild(topDiv);

  // Excerpt
  if (post.excerpt) {
    const excerptDiv = document.createElement("div");
    excerptDiv.className = "admin-post-item__excerpt";
    excerptDiv.textContent = post.excerpt;
    wrap.appendChild(excerptDiv);
  }

  // Content preview
  const contentPreview = (post.content || "").toString().trim();
  if (contentPreview) {
    const contentShort =
      contentPreview.length > 400
        ? contentPreview.slice(0, 400) + "…"
        : contentPreview;

    const contentDiv = document.createElement("div");
    contentDiv.className = "admin-post-item__content-preview";
    contentDiv.textContent = contentShort;
    wrap.appendChild(contentDiv);
  }

  // Media preview
  if (post.media?.url) {
    const mediaDiv = document.createElement("div");
    mediaDiv.className = "admin-post-item__media";

    if (post.type === "video" && post.media.kind !== "image") {
      const video = document.createElement("video");
      video.src = post.media.url;
      video.controls = true;
      video.playsInline = true;
      mediaDiv.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = post.media.url;
      img.alt = "";
      mediaDiv.appendChild(img);
    }

    wrap.appendChild(mediaDiv);
  }

  return wrap;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', '"')
    .replaceAll("'", "&#039;");
}

async function loadPosts() {
  if (!els.postsList) return;

  // Utiliser textContent au lieu d'innerHTML pour éviter XSS
  els.postsList.textContent = "";
  const loading = document.createElement("div");
  loading.className = "admin-loading";
  loading.textContent = "Chargement...";
  els.postsList.appendChild(loading);

  const token = getToken();
  // For admin UI we still read public posts; endpoint is open.
  const data = await api("/api/posts");
  const posts = data.posts || [];

  els.postsList.textContent = "";
  if (!posts.length) {
    const empty = document.createElement("div");
    empty.className = "admin-empty";
    empty.textContent = "Aucun post pour le moment.";
    els.postsList.appendChild(empty);
    return;
  }
  posts.forEach((p) => els.postsList.appendChild(renderPostItem(p)));

  els.postsList.querySelectorAll("[data-admin-edit]").forEach((btn) => {
    btn.addEventListener("click", () => startEdit(btn.dataset.adminEdit));
  });
  els.postsList.querySelectorAll("[data-admin-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deletePost(btn.dataset.adminDelete));
  });
}

function resetForm() {
  if (els.postId) els.postId.value = "";
  if (els.title) els.title.value = "";
  if (els.excerpt) els.excerpt.value = "";
  if (els.type) els.type.value = "text";
  if (els.content) els.content.value = "";
  if (els.mediaFile) els.mediaFile.value = "";
  if (els.mediaUrl) els.mediaUrl.value = "";
  if (els.formMessage) els.formMessage.textContent = "";
}

function fillForm(post) {
  if (els.postId) els.postId.value = post.id;
  els.title.value = post.title || "";
  els.excerpt.value = post.excerpt || "";
  els.type.value = post.type || "text";
  els.content.value = post.content || "";
  if (els.mediaUrl) els.mediaUrl.value = post.media?.url || "";
  if (els.mediaFile) els.mediaFile.value = "";
  if (els.formMessage) els.formMessage.textContent = "";
}

async function login(email, password) {
  els.loginError && (els.loginError.textContent = "");
  // IMPORTANT: utiliser l’API du serveur, pas un chemin relatif à blog.html.
  const res = await fetch(`${location.origin}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    throw new Error(json?.message || `Erreur ${res.status}`);
  }
  return json;
}

async function startEdit(id) {
  const token = getToken();
  if (!token) return;
  const data = await api("/api/posts");
  const post = (data.posts || []).find((p) => p.id === id);
  if (!post) return;
  fillForm(post);

  els.submitBtn.textContent = "Mettre à jour";
}

async function deletePost(id) {
  const token = getToken();
  if (!token) return;
  if (!confirm("Supprimer ce post ?")) return;
  await api(`/api/posts/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
  resetForm();
  els.submitBtn.textContent = "Publier";
  await loadPosts();
}

async function submitPost(event) {
  event.preventDefault();
  const token = getToken();
  if (!token) {
    els.formMessage.textContent = "Vous devez être connecté.";
    return;
  }

  const id = els.postId?.value;
  const title = els.title?.value?.trim();
  const content = els.content?.value?.trim();
  const excerpt = els.excerpt?.value?.trim();
  const type = els.type?.value || "text";

  if (!title || !content) {
    els.formMessage.textContent = "Titre et contenu sont requis.";
    return;
  }

  const fd = new FormData();
  fd.append("title", title);
  fd.append("content", content);
  fd.append("excerpt", excerpt || "");
  fd.append("type", type);
  if (els.mediaUrl?.value) fd.append("mediaUrl", els.mediaUrl.value);
  if (els.mediaFile?.files?.[0]) fd.append("mediaFile", els.mediaFile.files[0]);

  try {
    els.formMessage.textContent = "En cours...";
    if (id) {
      await api(`/api/posts/${encodeURIComponent(id)}`, {
        method: "PUT",
        token,
        body: fd,
      });
      els.formMessage.textContent = "Post mis à jour.";
    } else {
      await api("/api/posts", { method: "POST", token, body: fd });
      els.formMessage.textContent = "Post publié.";
      resetForm();
      els.submitBtn.textContent = "Publier";
    }
    await loadPosts();
  } catch (e) {
    els.formMessage.textContent = e.message || "Erreur.";
  }
}

function initAdminUi() {
  if (!els.loginForm || !els.postForm || !els.postsList) return;

  const token = getToken();
  if (token) {
    show(els.loginPanel, false);
    show(els.composerPanel, true);
    resetForm();
    loadPosts();
  } else {
    show(els.loginPanel, true);
    show(els.composerPanel, false);
  }

  els.loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = els.email.value.trim();
    const password = els.password.value;
    try {
      const json = await login(email, password);
      setToken(json.token);
      show(els.loginPanel, false);
      show(els.composerPanel, true);
      resetForm();
      loadPosts();
    } catch (err) {
      if (els.loginError)
        els.loginError.textContent = err.message || "Connexion impossible.";
    }
  });

  els.logoutBtn?.addEventListener("click", () => {
    clearToken();
    show(els.loginPanel, true);
    show(els.composerPanel, false);
    resetForm();
    if (els.postsList) els.postsList.innerHTML = "";
  });

  els.postForm?.addEventListener("submit", submitPost);

  // Start in composer mode if token exists
  if (token) els.submitBtn.textContent = "Publier";
}

function initPasswordToggle() {
  const eyeBtn = document.querySelector("[data-admin-toggle-password]");
  const pwd = document.querySelector("[data-admin-password]");
  if (!eyeBtn || !pwd) return;

  eyeBtn.addEventListener("click", () => {
    const isHidden = pwd.type === "password";
    pwd.type = isHidden ? "text" : "password";
    eyeBtn.textContent = isHidden ? "🙈" : "👁";
  });
}

window.addEventListener("DOMContentLoaded", () => {
  initAdminUi();
  initPasswordToggle();
});
