function getField(form, name) {
  const el = form.querySelector(`[name="${name}"]`);
  return el ? el.value : "";
}

function showContactPopup(message) {
  const existing = document.querySelector(".toast-popup__overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "toast-popup__overlay";

  const card = document.createElement("div");
  card.className = "toast-popup";

  const title = document.createElement("p");
  title.className = "toast-popup__message";
  title.textContent = message;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "toast-popup__close";
  button.textContent = "OK";

  card.appendChild(title);
  card.appendChild(button);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  function closePopup() {
    overlay.remove();
  }

  button.addEventListener("click", closePopup);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closePopup();
  });
}

async function submitContact(e) {
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;
  e.preventDefault();

  const name = getField(form, "name").trim();
  const email = getField(form, "email").trim();
  const message = getField(form, "message").trim();

  if (!name || !email || !message) return;

  const status = form.querySelector("[data-contact-status]");
  if (status) status.textContent = "Envoi...";

  try {
    const res = await fetch(
      `${window.APP_CONFIG?.API_BASE || ""}/api/contact`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      },
    );

    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || `Erreur ${res.status}`);

    if (status) status.textContent = "Merci ! Message envoyé.";
    form.reset();
    showContactPopup(
      "Votre message a bien été envoyé. Nous reviendrons vers vous rapidement.",
    );
  } catch (err) {
    if (status) status.textContent = err.message || "Erreur lors de l’envoi.";
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("form[data-contact-form]").forEach((form) => {
    form.addEventListener("submit", submitContact);
  });
});
