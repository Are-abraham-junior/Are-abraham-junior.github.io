/*
  Configuration runtime pour le frontend.

  Option 2 (ton choix) : le front est hébergé sur Vercel, mais l’API reste sur un backend Node/Express ailleurs.

  Remplis API_BASE avec l’URL complète de ton backend, ex :
  https://audrey-api.mon-domaine.com
*/

window.APP_CONFIG = window.APP_CONFIG || {};

// Utilise l’API locale par défaut lorsque le site est servi depuis le même domaine.
window.APP_CONFIG.API_BASE = window.APP_CONFIG.API_BASE || "";
