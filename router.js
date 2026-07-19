if (window.location.hash === "#admin") {
  document.documentElement.classList.add("admin-mode");
  import("./admin.js").then(({ mountAdmin }) => mountAdmin());
} else {
  import("./main.js");
}
