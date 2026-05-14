const cookieBanner = document.querySelector("[data-cookie-banner]");
const cookieAccept = document.querySelector("[data-cookie-accept]");
const mobileToggle = document.querySelector("[data-mobile-toggle]");
const mobileClose = document.querySelector("[data-mobile-close]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const contactForm = document.querySelector("[data-contact-form]");
const formMessage = document.querySelector("[data-form-message]");

if (cookieBanner && cookieAccept) {
  const consent = localStorage.getItem("cookie-consent");
  if (consent === "accepted") {
    cookieBanner.style.display = "none";
  }
  cookieAccept.addEventListener("click", () => {
    localStorage.setItem("cookie-consent", "accepted");
    cookieBanner.style.display = "none";
  });
}

if (mobileToggle && mobileNav && mobileClose) {
  mobileToggle.addEventListener("click", () => mobileNav.classList.add("open"));
  mobileClose.addEventListener("click", () =>
    mobileNav.classList.remove("open"),
  );
}

if (contactForm) {
  // Le formulaire de contact est traité par scripts/contact.js via /api/contact.
}
