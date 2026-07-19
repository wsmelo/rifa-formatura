import { createClient } from "@supabase/supabase-js";
import posterUrl from "./assets/formatura-da-mara.jpeg";
import { RAFFLE_CONFIG } from "./config.js";
import {
  calculateAdminStats,
  filterAdminRows,
  formatAdminDate,
  formatAdminNumber,
  formatAdminPhone,
  getAdminStatus,
  isAdminPasswordSetupHash,
  validateAdminPassword,
} from "./admin-utils.js";
import "./admin.css";

const state = {
  rows: [],
  query: "",
  status: "all",
  loading: false,
  pendingAction: null,
  sessionUserId: null,
  passwordSetupRequired: isAdminPasswordSetupHash(window.location.hash),
};

let supabase;
let elements;
let authSubscription;
let refreshTimer;

function renderShell() {
  document.title = "Administração | Rifa da Formatura";
  document.body.innerHTML = [
    '<a class="skip-link" href="#admin-content">Ir para o conteúdo</a>',
    '<div class="admin-app">',
    '  <header class="admin-topbar">',
    '    <div class="admin-topbar-inner">',
    '      <a class="admin-brand" href="./" aria-label="Abrir a página da Rifa da Formatura">',
    '        <svg aria-hidden="true" viewBox="0 0 48 48">',
    '          <path d="m4 18 20-10 20 10-20 10L4 18Z"></path>',
    '          <path d="M12 23v10c6 6 18 6 24 0V23"></path>',
    '          <path d="M42 20v12"></path>',
    '        </svg>',
    '        <span>Rifa da<br><strong>Formatura</strong></span>',
    '      </a>',
    '      <div class="admin-account" id="admin-account" hidden>',
    '        <span id="admin-email-label"></span>',
    '        <button class="admin-link-button" id="logout-button" type="button">Sair</button>',
    '      </div>',
    '    </div>',
    '  </header>',
    '  <main id="admin-content">',
    '    <section class="admin-login" id="login-view">',
    '      <div class="login-layout">',
    '        <div class="login-panel">',
    '          <div class="login-heading">',
    '            <h1>Acesso da organização</h1>',
    '            <p>Entre com sua conta administrativa para conferir compradores e controlar os números da rifa.</p>',
    '          </div>',
    '          <form id="login-form" novalidate>',
    '            <label for="admin-email">E-mail</label>',
    '            <input id="admin-email" name="email" type="email" autocomplete="username" placeholder="seuemail@exemplo.com" required>',
    '            <label for="admin-password">Senha</label>',
    '            <input id="admin-password" name="password" type="password" autocomplete="current-password" placeholder="Digite sua senha" minlength="6" required>',
    '            <p class="admin-form-error" id="login-error" role="alert"></p>',
    '            <button class="admin-primary-button login-button" id="login-button" type="submit">Entrar no painel</button>',
    '          </form>',
    '          <p class="login-security"><span aria-hidden="true">●</span> Seus dados administrativos são protegidos pelo Supabase.</p>',
    '        </div>',
    '        <div class="login-poster" aria-hidden="true">',
    '          <img src="./assets/formatura-da-mara.jpeg" alt="">',
    '          <div><strong>Organização da rifa</strong><span>Controle seguro e sincronizado.</span></div>',
    '        </div>',
    '      </div>',
    '    </section>',
    '    <section class="admin-login" id="password-setup-view" hidden>',
    '      <div class="login-layout">',
    '        <div class="login-panel">',
    '          <div class="login-heading">',
    '            <h1>Crie sua senha de acesso</h1>',
    '            <p>Escolha uma senha segura para entrar no painel administrativo em qualquer celular ou computador.</p>',
    '          </div>',
    '          <form id="password-setup-form" novalidate>',
    '            <label for="new-admin-password">Nova senha</label>',
    '            <input id="new-admin-password" name="new-password" type="password" autocomplete="new-password" placeholder="Mínimo de 8 caracteres" minlength="8" required>',
    '            <label for="confirm-admin-password">Confirmar senha</label>',
    '            <input id="confirm-admin-password" name="confirm-password" type="password" autocomplete="new-password" placeholder="Digite a senha novamente" minlength="8" required>',
    '            <p class="admin-form-error" id="password-setup-error" role="alert"></p>',
    '            <button class="admin-primary-button login-button" id="password-setup-button" type="submit">Salvar senha e abrir painel</button>',
    '          </form>',
    '          <p class="login-security"><span aria-hidden="true">●</span> Sua senha é salva diretamente pelo Supabase.</p>',
    '        </div>',
    '        <div class="login-poster" aria-hidden="true">',
    '          <img src="./assets/formatura-da-mara.jpeg" alt="">',
    '          <div><strong>Seu painel está pronto</strong><span>Falta apenas criar sua senha.</span></div>',
    '        </div>',
    '      </div>',
    '    </section>',
    '    <section class="access-denied" id="access-denied" hidden>',
    '      <div>',
    '        <span class="access-icon" aria-hidden="true">!</span>',
    '        <h1>Conta sem acesso</h1>',
    '        <p>Esta conta existe, mas ainda não foi autorizada como administradora da rifa.</p>',
    '        <button class="admin-secondary-button" id="denied-logout-button" type="button">Sair e usar outra conta</button>',
    '      </div>',
    '    </section>',
    '    <section class="admin-dashboard" id="dashboard-view" hidden>',
    '      <div class="dashboard-heading">',
    '        <div>',
    '          <h1>Painel da rifa</h1>',
    '          <p>Acompanhe as escolhas, confira os pagamentos e mantenha os números atualizados.</p>',
    '        </div>',
    '        <div class="dashboard-heading-actions">',
    '          <span id="last-updated">Ainda não atualizado</span>',
    '          <button class="admin-secondary-button refresh-button" id="refresh-button" type="button">',
    '            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5M18.5 9A7 7 0 0 0 6.8 6.8L4 10m16 4-2.8 3.2A7 7 0 0 1 5.5 15"></path></svg>',
    '            Atualizar',
    '          </button>',
    '        </div>',
    '      </div>',
    '      <div class="admin-stats" aria-label="Resumo dos números">',
    '        <button type="button" data-stat-filter="available"><span>Disponíveis</span><strong id="stat-available">—</strong></button>',
    '        <button type="button" data-stat-filter="reserved"><span>Aguardando Pix</span><strong id="stat-reserved">—</strong></button>',
    '        <button type="button" data-stat-filter="payment_reported"><span>Pix informado</span><strong id="stat-reported">—</strong></button>',
    '        <button type="button" data-stat-filter="paid"><span>Pagos / vendidos</span><strong id="stat-paid">—</strong></button>',
    '      </div>',
    '      <div class="admin-data-section">',
    '        <div class="admin-toolbar">',
    '          <div class="admin-search">',
    '            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m16 16 5 5"></path></svg>',
    '            <label class="sr-only" for="admin-search-input">Buscar comprador ou número</label>',
    '            <input id="admin-search-input" type="search" placeholder="Buscar por nome, WhatsApp ou número">',
    '          </div>',
    '          <label class="admin-filter">',
    '            <span class="sr-only">Filtrar por situação</span>',
    '            <select id="status-filter">',
    '              <option value="all">Todas as situações</option>',
    '              <option value="available">Disponíveis</option>',
    '              <option value="reserved">Aguardando Pix</option>',
    '              <option value="payment_reported">Pix informado</option>',
    '              <option value="paid">Pagos / vendidos</option>',
    '            </select>',
    '          </label>',
    '        </div>',
    '        <div class="results-summary">',
    '          <strong id="results-count">0 números</strong>',
    '          <button class="admin-link-button" id="clear-filters" type="button" hidden>Limpar filtros</button>',
    '        </div>',
    '        <div class="admin-table-wrap" id="table-wrap" aria-live="polite">',
    '          <table class="admin-table">',
    '            <thead><tr><th>Número</th><th>Comprador</th><th>Situação</th><th>Atualização</th><th><span class="sr-only">Ações</span></th></tr></thead>',
    '            <tbody id="admin-table-body"></tbody>',
    '          </table>',
    '          <div class="admin-empty" id="admin-empty" hidden>',
    '            <strong>Nenhum número encontrado</strong>',
    '            <span>Tente mudar a busca ou o filtro selecionado.</span>',
    '          </div>',
    '        </div>',
    '        <p class="dashboard-error" id="dashboard-error" role="alert"></p>',
    '      </div>',
    '    </section>',
    '  </main>',
    '</div>',
    '<dialog class="admin-dialog" id="admin-dialog" aria-labelledby="action-title">',
    '  <form method="dialog" class="admin-dialog-shell" id="action-form">',
    '    <button class="admin-dialog-close" id="action-close" value="cancel" type="button" aria-label="Fechar">×</button>',
    '    <p class="admin-dialog-number" id="action-number"></p>',
    '    <h2 id="action-title"></h2>',
    '    <p class="admin-dialog-message" id="action-message"></p>',
    '    <div class="manual-buyer-fields" id="manual-buyer-fields" hidden>',
    '      <label for="manual-buyer-name">Nome do comprador <span>(opcional)</span></label>',
    '      <input id="manual-buyer-name" type="text" minlength="3" maxlength="80" autocomplete="off" placeholder="Digite o nome">',
    '      <label for="manual-buyer-phone">WhatsApp <span>(opcional)</span></label>',
    '      <input id="manual-buyer-phone" type="tel" inputmode="tel" autocomplete="off" placeholder="(00) 00000-0000">',
    '    </div>',
    '    <p class="admin-form-error" id="action-error" role="alert"></p>',
    '    <div class="admin-dialog-actions">',
    '      <button class="admin-secondary-button" id="action-cancel" value="cancel" type="button">Cancelar</button>',
    '      <button class="admin-primary-button" id="action-confirm" value="default" type="submit">Confirmar</button>',
    '    </div>',
    '  </form>',
    '</dialog>',
    '<div class="admin-toast" id="admin-toast" role="status" aria-live="polite"></div>',
  ].join("");

  document.querySelectorAll(".login-poster img").forEach(function (image) {
    image.src = posterUrl;
  });

  elements = {
    account: document.querySelector("#admin-account"),
    accountEmail: document.querySelector("#admin-email-label"),
    loginView: document.querySelector("#login-view"),
    loginForm: document.querySelector("#login-form"),
    email: document.querySelector("#admin-email"),
    password: document.querySelector("#admin-password"),
    loginButton: document.querySelector("#login-button"),
    loginError: document.querySelector("#login-error"),
    passwordSetupView: document.querySelector("#password-setup-view"),
    passwordSetupForm: document.querySelector("#password-setup-form"),
    newPassword: document.querySelector("#new-admin-password"),
    confirmPassword: document.querySelector("#confirm-admin-password"),
    passwordSetupError: document.querySelector("#password-setup-error"),
    passwordSetupButton: document.querySelector("#password-setup-button"),
    logout: document.querySelector("#logout-button"),
    accessDenied: document.querySelector("#access-denied"),
    deniedLogout: document.querySelector("#denied-logout-button"),
    dashboard: document.querySelector("#dashboard-view"),
    dashboardError: document.querySelector("#dashboard-error"),
    lastUpdated: document.querySelector("#last-updated"),
    refresh: document.querySelector("#refresh-button"),
    statAvailable: document.querySelector("#stat-available"),
    statReserved: document.querySelector("#stat-reserved"),
    statReported: document.querySelector("#stat-reported"),
    statPaid: document.querySelector("#stat-paid"),
    search: document.querySelector("#admin-search-input"),
    statusFilter: document.querySelector("#status-filter"),
    clearFilters: document.querySelector("#clear-filters"),
    resultsCount: document.querySelector("#results-count"),
    tableBody: document.querySelector("#admin-table-body"),
    tableWrap: document.querySelector("#table-wrap"),
    empty: document.querySelector("#admin-empty"),
    dialog: document.querySelector("#admin-dialog"),
    actionForm: document.querySelector("#action-form"),
    actionClose: document.querySelector("#action-close"),
    actionCancel: document.querySelector("#action-cancel"),
    actionNumber: document.querySelector("#action-number"),
    actionTitle: document.querySelector("#action-title"),
    actionMessage: document.querySelector("#action-message"),
    manualFields: document.querySelector("#manual-buyer-fields"),
    manualName: document.querySelector("#manual-buyer-name"),
    manualPhone: document.querySelector("#manual-buyer-phone"),
    actionError: document.querySelector("#action-error"),
    actionConfirm: document.querySelector("#action-confirm"),
    toast: document.querySelector("#admin-toast"),
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onlyDigits(value) {
  return String(value || "").replace(/\D/g, "");
}

function readableAdminError(error) {
  const message = String(error?.message || "Não foi possível concluir esta ação.");
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid login credentials")) {
    return "E-mail ou senha incorretos.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Este e-mail ainda não foi confirmado no Supabase.";
  }
  if (normalized.includes("password") && normalized.includes("characters")) {
    return "A senha não atende aos requisitos de segurança do Supabase.";
  }
  if (normalized.includes("admin access required") || error?.code === "42501") {
    return "Esta conta ainda não foi autorizada como administradora.";
  }
  if (normalized.includes("could not find the function")) {
    return "O painel ainda precisa ser ativado no banco. Execute o arquivo supabase-admin-setup.sql.";
  }
  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "Não foi possível conectar ao banco. Confira sua internet e tente novamente.";
  }
  if (normalized.includes("not available")) {
    return "Este número não está mais disponível. Atualize o painel.";
  }
  return message;
}

function isAccessDeniedError(error) {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42501" || message.includes("admin access required");
}

function setView(view) {
  elements.loginView.hidden = view !== "login";
  elements.passwordSetupView.hidden = view !== "password-setup";
  elements.accessDenied.hidden = view !== "denied";
  elements.dashboard.hidden = view !== "dashboard";
  elements.account.hidden = view === "login" || view === "password-setup";
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(function () {
    elements.toast.classList.remove("is-visible");
  }, 2800);
}

function renderStats() {
  const stats = calculateAdminStats(state.rows);
  elements.statAvailable.textContent = String(stats.available);
  elements.statReserved.textContent = String(stats.reserved);
  elements.statReported.textContent = String(stats.payment_reported);
  elements.statPaid.textContent = String(stats.paid);
}

function renderBuyer(row) {
  if (!row.buyer_name && !row.buyer_phone) {
    return '<span class="empty-buyer">' + (row.status === "paid" ? "Venda sem identificação" : "—") + "</span>";
  }
  const phone = onlyDigits(row.buyer_phone);
  const phoneHtml = phone
    ? '<a href="https://wa.me/55' + escapeHtml(phone) + '" target="_blank" rel="noreferrer">' + escapeHtml(formatAdminPhone(phone)) + "</a>"
    : '<span class="empty-buyer">WhatsApp não informado</span>';
  return '<div class="buyer-cell"><strong>' + escapeHtml(row.buyer_name || "Nome não informado") + "</strong>" + phoneHtml + "</div>";
}

function renderRowActions(row) {
  if (row.status === "available") {
    return '<button class="table-action primary" type="button" data-action="mark-paid" data-number="' + row.number + '">Marcar vendido</button>';
  }

  const actions = [];
  if ((row.status === "reserved" || row.status === "payment_reported") && row.reservation_id) {
    actions.push(
      '<button class="table-action primary" type="button" data-action="confirm-payment" data-number="' +
        row.number +
        '">Confirmar Pix</button>',
    );
  }
  actions.push(
    '<button class="table-action danger" type="button" data-action="release" data-number="' +
      row.number +
      '">Liberar</button>',
  );
  return '<div class="row-actions">' + actions.join("") + "</div>";
}

function renderRows() {
  const filteredRows = filterAdminRows(state.rows, {
    query: state.query,
    status: state.status,
  });
  const noun = filteredRows.length === 1 ? "número" : "números";
  elements.resultsCount.textContent = filteredRows.length + " " + noun;
  elements.clearFilters.hidden = !state.query && state.status === "all";
  elements.empty.hidden = filteredRows.length !== 0;
  elements.tableWrap.classList.toggle("is-empty", filteredRows.length === 0);

  elements.tableBody.innerHTML = filteredRows
    .map(function (row) {
      const status = getAdminStatus(row.status);
      const dateLabel = row.expires_at && row.status === "reserved" ? "Expira " + formatAdminDate(row.expires_at) : formatAdminDate(row.updated_at);
      return (
        '<tr>' +
        '<td data-label="Número"><span class="raffle-number">' + escapeHtml(formatAdminNumber(row.number)) + "</span></td>" +
        '<td data-label="Comprador">' + renderBuyer(row) + "</td>" +
        '<td data-label="Situação"><span class="admin-status status-' + escapeHtml(status.tone) + '"><i></i>' + escapeHtml(status.label) + "</span></td>" +
        '<td data-label="Atualização"><span class="date-cell">' + escapeHtml(dateLabel) + "</span></td>" +
        '<td data-label="Ações" class="actions-cell">' + renderRowActions(row) + "</td>" +
        "</tr>"
      );
    })
    .join("");
}

function renderDashboard() {
  renderStats();
  renderRows();
}

function setDashboardLoading(loading) {
  state.loading = loading;
  elements.refresh.disabled = loading;
  elements.refresh.classList.toggle("is-loading", loading);
  elements.tableWrap.classList.toggle("is-loading", loading);
}

async function loadDashboard(options = {}) {
  if (!supabase || state.loading) return;
  setDashboardLoading(true);
  elements.dashboardError.textContent = "";
  try {
    const response = await supabase.rpc("get_formatura_raffle_admin_dashboard");
    if (response.error) throw response.error;
    state.rows = Array.isArray(response.data) ? response.data : [];
    renderDashboard();
    elements.lastUpdated.textContent =
      "Atualizado às " +
      new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    if (!options.quiet) showToast("Painel atualizado.");
  } catch (error) {
    if (isAccessDeniedError(error)) {
      setView("denied");
      return;
    }
    elements.dashboardError.textContent = readableAdminError(error);
  } finally {
    setDashboardLoading(false);
  }
}

async function applySession(session) {
  if (!session) {
    state.sessionUserId = null;
    state.rows = [];
    setView("login");
    elements.accountEmail.textContent = "";
    return;
  }

  elements.accountEmail.textContent = session.user.email || "Conta administrativa";
  if (state.passwordSetupRequired) {
    setView("password-setup");
    return;
  }
  setView("dashboard");
  const isNewUser = state.sessionUserId !== session.user.id;
  state.sessionUserId = session.user.id;
  if (isNewUser || state.rows.length === 0) {
    await loadDashboard({ quiet: true });
  }
}

async function handlePasswordSetup(event) {
  event.preventDefault();
  elements.passwordSetupError.textContent = "";
  const password = elements.newPassword.value;
  const confirmation = elements.confirmPassword.value;
  const validationError = validateAdminPassword(password, confirmation);
  if (validationError) {
    elements.passwordSetupError.textContent = validationError;
    return;
  }

  elements.passwordSetupButton.disabled = true;
  elements.passwordSetupButton.textContent = "Salvando...";
  try {
    const response = await supabase.auth.updateUser({ password });
    if (response.error) throw response.error;
    state.passwordSetupRequired = false;
    elements.newPassword.value = "";
    elements.confirmPassword.value = "";
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search + "#admin",
    );
    const sessionResponse = await supabase.auth.getSession();
    if (sessionResponse.error) throw sessionResponse.error;
    if (!sessionResponse.data.session) {
      throw new Error("Sessão do convite não encontrada. Abra novamente o link recebido.");
    }
    await applySession(sessionResponse.data.session);
    showToast("Senha criada com sucesso.");
  } catch (error) {
    elements.passwordSetupError.textContent = readableAdminError(error);
  } finally {
    elements.passwordSetupButton.disabled = false;
    elements.passwordSetupButton.textContent = "Salvar senha e abrir painel";
  }
}

async function handleLogin(event) {
  event.preventDefault();
  elements.loginError.textContent = "";
  const email = elements.email.value.trim();
  const password = elements.password.value;
  if (!email || !password) {
    elements.loginError.textContent = "Informe seu e-mail e sua senha.";
    return;
  }

  elements.loginButton.disabled = true;
  elements.loginButton.textContent = "Entrando...";
  try {
    const response = await supabase.auth.signInWithPassword({ email, password });
    if (response.error) throw response.error;
    elements.password.value = "";
    await applySession(response.data.session);
  } catch (error) {
    elements.loginError.textContent = readableAdminError(error);
  } finally {
    elements.loginButton.disabled = false;
    elements.loginButton.textContent = "Entrar no painel";
  }
}

async function handleLogout() {
  if (!supabase) return;
  await supabase.auth.signOut();
  state.sessionUserId = null;
  state.rows = [];
  setView("login");
  elements.password.value = "";
  elements.email.focus();
}

function findRow(number) {
  return state.rows.find(function (row) {
    return Number(row.number) === Number(number);
  });
}

function reservationNumbers(row) {
  if (!row.reservation_id) return [row.number];
  return state.rows
    .filter(function (candidate) {
      return candidate.reservation_id === row.reservation_id;
    })
    .map(function (candidate) {
      return candidate.number;
    })
    .sort(function (first, second) {
      return first - second;
    });
}

function openActionDialog(action, row) {
  state.pendingAction = { action, row };
  elements.actionError.textContent = "";
  elements.manualName.value = "";
  elements.manualPhone.value = "";
  elements.manualFields.hidden = action !== "mark-paid";
  elements.actionConfirm.classList.remove("danger");
  elements.actionNumber.textContent = "Número " + formatAdminNumber(row.number);

  if (action === "confirm-payment") {
    const numbers = reservationNumbers(row).map(formatAdminNumber).join(", ");
    elements.actionTitle.textContent = "Confirmar recebimento do Pix?";
    elements.actionMessage.textContent =
      "Os números " + numbers + " serão marcados como pagos para " + (row.buyer_name || "este comprador") + ".";
    elements.actionConfirm.textContent = "Confirmar pagamento";
  } else if (action === "release") {
    elements.actionTitle.textContent = "Liberar este número?";
    elements.actionMessage.textContent =
      "O número voltará a aparecer como disponível para outras pessoas. O nome e o WhatsApp ligados somente a ele serão removidos.";
    elements.actionConfirm.textContent = "Liberar número";
    elements.actionConfirm.classList.add("danger");
  } else {
    elements.actionTitle.textContent = "Marcar como vendido";
    elements.actionMessage.textContent =
      "Use esta opção para uma venda feita fora do site. Você pode registrar o comprador agora ou deixar os campos vazios.";
    elements.actionConfirm.textContent = "Marcar vendido";
  }

  elements.dialog.showModal();
  if (action === "mark-paid") {
    window.setTimeout(function () {
      elements.manualName.focus();
    }, 80);
  }
}

function closeActionDialog() {
  if (elements.dialog.open) elements.dialog.close();
  state.pendingAction = null;
  elements.actionError.textContent = "";
}

function validateManualBuyer() {
  const name = elements.manualName.value.trim();
  const phone = onlyDigits(elements.manualPhone.value);
  if (name && name.length < 3) {
    throw new Error("O nome precisa ter pelo menos 3 letras.");
  }
  if (phone && phone.length !== 10 && phone.length !== 11) {
    throw new Error("Informe um WhatsApp com DDD ou deixe o campo vazio.");
  }
  return { name: name || null, phone: phone || null };
}

async function handleAction(event) {
  event.preventDefault();
  if (!state.pendingAction || elements.actionConfirm.disabled) return;
  const action = state.pendingAction.action;
  const row = state.pendingAction.row;
  elements.actionError.textContent = "";
  elements.actionConfirm.disabled = true;
  const originalLabel = elements.actionConfirm.textContent;
  elements.actionConfirm.textContent = "Salvando...";

  try {
    let response;
    if (action === "confirm-payment") {
      response = await supabase.rpc("admin_confirm_formatura_raffle_payment", {
        p_reservation_id: row.reservation_id,
      });
    } else if (action === "release") {
      response = await supabase.rpc("admin_release_formatura_raffle_number", {
        p_number: row.number,
      });
    } else {
      const buyer = validateManualBuyer();
      response = await supabase.rpc("admin_mark_formatura_raffle_number_paid", {
        p_number: row.number,
        p_buyer_name: buyer.name,
        p_buyer_phone: buyer.phone,
      });
    }
    if (response.error) throw response.error;

    const successMessage =
      action === "confirm-payment"
        ? "Pagamento confirmado."
        : action === "release"
          ? "Número liberado."
          : "Número marcado como vendido.";
    closeActionDialog();
    await loadDashboard({ quiet: true });
    showToast(successMessage);
  } catch (error) {
    elements.actionError.textContent = readableAdminError(error);
  } finally {
    elements.actionConfirm.disabled = false;
    elements.actionConfirm.textContent = originalLabel;
  }
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.passwordSetupForm.addEventListener("submit", handlePasswordSetup);
  elements.logout.addEventListener("click", handleLogout);
  elements.deniedLogout.addEventListener("click", handleLogout);
  elements.refresh.addEventListener("click", function () {
    loadDashboard();
  });
  elements.search.addEventListener("input", function (event) {
    state.query = event.target.value;
    renderRows();
  });
  elements.statusFilter.addEventListener("change", function (event) {
    state.status = event.target.value;
    renderRows();
  });
  elements.clearFilters.addEventListener("click", function () {
    state.query = "";
    state.status = "all";
    elements.search.value = "";
    elements.statusFilter.value = "all";
    renderRows();
    elements.search.focus();
  });
  document.querySelector(".admin-stats").addEventListener("click", function (event) {
    const button = event.target.closest("[data-stat-filter]");
    if (!button) return;
    state.status = button.dataset.statFilter;
    elements.statusFilter.value = state.status;
    renderRows();
    document.querySelector(".admin-data-section").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  elements.tableBody.addEventListener("click", function (event) {
    const button = event.target.closest("button[data-action][data-number]");
    if (!button) return;
    const row = findRow(button.dataset.number);
    if (row) openActionDialog(button.dataset.action, row);
  });
  elements.actionClose.addEventListener("click", closeActionDialog);
  elements.actionCancel.addEventListener("click", closeActionDialog);
  elements.actionForm.addEventListener("submit", handleAction);
  elements.dialog.addEventListener("click", function (event) {
    if (event.target === elements.dialog) closeActionDialog();
  });
  elements.manualPhone.addEventListener("input", function (event) {
    const digits = onlyDigits(event.target.value).slice(0, 11);
    if (digits.length <= 2) {
      event.target.value = digits;
    } else if (digits.length <= 6) {
      event.target.value = "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    } else if (digits.length <= 10) {
      event.target.value = "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
    } else {
      event.target.value = "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
    }
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && state.sessionUserId) loadDashboard({ quiet: true });
  });
}

export async function mountAdmin() {
  renderShell();
  bindEvents();

  if (!RAFFLE_CONFIG.supabaseUrl || !RAFFLE_CONFIG.supabaseAnonKey) {
    elements.loginError.textContent = "O Supabase ainda não foi configurado neste site.";
    elements.loginButton.disabled = true;
    return;
  }

  supabase = createClient(RAFFLE_CONFIG.supabaseUrl, RAFFLE_CONFIG.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "rifa-formatura-admin-auth",
    },
  });

  const sessionResponse = await supabase.auth.getSession();
  if (sessionResponse.error) {
    elements.loginError.textContent = readableAdminError(sessionResponse.error);
  } else {
    await applySession(sessionResponse.data.session);
  }

  const listener = supabase.auth.onAuthStateChange(function (event, session) {
    if (event === "SIGNED_OUT") {
      applySession(null);
    } else if (event === "SIGNED_IN" && session && session.user.id !== state.sessionUserId) {
      window.setTimeout(function () {
        applySession(session);
      }, 0);
    }
  });
  authSubscription = listener.data.subscription;

  refreshTimer = window.setInterval(function () {
    if (state.sessionUserId && !document.hidden) loadDashboard({ quiet: true });
  }, 20000);

  window.addEventListener(
    "pagehide",
    function () {
      authSubscription?.unsubscribe();
      window.clearInterval(refreshTimer);
    },
    { once: true },
  );
}
