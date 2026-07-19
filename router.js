import { isAdminRouteHash } from "./admin-utils.js";

if (isAdminRouteHash(window.location.hash)) {
  document.documentElement.classList.add("admin-mode");
  import("./admin.js").then(({ mountAdmin }) => mountAdmin());
} else {
  import("./main.js");
}
