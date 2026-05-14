function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "<")
    .replaceAll(">", ">")
    .replaceAll('"', '"')
    .replaceAll("'", "&#039;");
}

function renderMedia(post) {
  if (!post.media?.url) return "";
  const url = escapeHtml(post.media.url);
  if (post.type === "video") {
    return `
      <div class="blog-post__media">
        <video src="${url}" controls playsinline></video>
      </div>
    `;
  }
  return `
    <div class="blog-post__media">
      <img src="${url}" alt="" />
    </div>
  `;
}

function renderPost(post) {
  const title = escapeHtml(post.title || "");
  const excerpt = escapeHtml(post.excerpt || "");
  const content = escapeHtml(post.content || "").replaceAll("\n", "<br/>");
  const createdAt = post.createdAt
    ? new Date(post.createdAt).toLocaleString("fr-FR")
    : "";
  const type = escapeHtml(post.type || "text");

  return `
    <article class="blog-post">
      <div class="blog-post__top">
        <h3 class="blog-post__title">${title}</h3>
        <div class="blog-post__meta">${createdAt} · ${type}</div>
      </div>
      ${excerpt ? `<div class="blog-post__excerpt">${excerpt}</div>` : ""}
      ${renderMedia(post)}
      <div class="blog-post__content">${content.length > 220 ? content.slice(0, 220) + "…" : content}</div>
    </article>
  `;
}

async function loadBlogPosts() {
  const list = document.querySelector("[data-blog-posts-list]");
  if (!list) return;

  // Utiliser textContent au lieu d'innerHTML pour éviter XSS
  list.textContent = "";
  const loading = document.createElement("div");
  loading.className = "admin-loading";
  loading.textContent = "Chargement...";
  list.appendChild(loading);

  const res = await fetch(`${window.APP_CONFIG?.API_BASE || ""}/api/posts`);
  const json = await res.json();
  const posts = json.posts || [];

  list.textContent = "";
  if (!posts.length) {
    const empty = document.createElement("div");
    empty.className = "admin-empty";
    empty.textContent = "Aucun article publié.";
    list.appendChild(empty);
    return;
  }

  posts.forEach((p) => {
    const el = document.createElement("div");
    el.innerHTML = renderPost(p); // renderPost utilise déjà escapeHtml
    list.appendChild(el.firstElementChild);
  });
}

window.addEventListener("DOMContentLoaded", loadBlogPosts);
