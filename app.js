document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // Credenciais fixas (MVP)
  // =========================
  const AUTH = {
    email: "adm@gmail.com",
    pass: "resto123@",
  };

  // =========================
  // Helpers
  // =========================
  const $ = (q) => document.querySelector(q);
  const $$ = (q) => document.querySelectorAll(q);
  const on = (el, evt, fn) => el && el.addEventListener(evt, fn);

  const STORAGE_KEYS = {
    products: "resto_products_v2",
    sales: "resto_sales_v2",
    auth: "resto_auth_v1",
  };

  const DEFAULT_CATEGORIES = [
    "Prato Feito",
    "Marmita",
    "Salgado Frito",
    "Salgado Assado",
  ];

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function moneyBR(value) {
    const v = Number(value || 0);
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  function uid(prefix = "id") {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  function safeId(s) {
    return String(s).toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-]/g, "");
  }

  function clampMoney(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v < 0) return 0;
    return Math.round(v * 100) / 100;
  }

  // =========================
  // State
  // =========================
  let products = loadJSON(STORAGE_KEYS.products, []);
  let sales = loadJSON(STORAGE_KEYS.sales, []);
  let cart = []; // {productId, qty}

  // =========================
  // Login Elements
  // =========================
  const loginScreen = $("#loginScreen");
  const appRoot = $("#appRoot");
  const loginForm = $("#loginForm");
  const loginEmail = $("#loginEmail");
  const loginPass = $("#loginPass");
  const btnLogout = $("#btnLogout");

  function isLogged() {
    const a = loadJSON(STORAGE_KEYS.auth, { ok: false });
    return !!a.ok;
  }
  function setLogged(ok) {
    saveJSON(STORAGE_KEYS.auth, { ok: !!ok, at: new Date().toISOString() });
  }
  function showLogin() {
    if (loginScreen) loginScreen.style.display = "flex";
    if (appRoot) appRoot.style.display = "none";
  }
  function showApp() {
    if (loginScreen) loginScreen.style.display = "none";
    if (appRoot) appRoot.style.display = "block";
  }

  on(loginForm, "submit", (e) => {
    e.preventDefault();
    const em = (loginEmail?.value || "").trim().toLowerCase();
    const pw = (loginPass?.value || "").trim();

    if (em === AUTH.email && pw === AUTH.pass) {
      setLogged(true);
      showApp();
      renderAll();
      return;
    }
    alert("❌ Login inválido");
  });

  on(btnLogout, "click", () => {
    setLogged(false);
    showLogin();
  });

  // =========================
  // Elements (App)
  // =========================
  const tabs = $$(".tab");
  const views = {
    pos: $("#view-pos"),
    menu: $("#view-menu"),
    admin: $("#view-admin"),
  };

  // POS
  const posCategory = $("#posCategory");
  const posSearch = $("#posSearch");
  const posProducts = $("#posProducts");

  const cartItems = $("#cartItems");
  const cartCount = $("#cartCount");
  const cartSubtotal = $("#cartSubtotal");
  const deliveryFeeLabel = $("#deliveryFeeLabel");
  const grandTotal = $("#grandTotal");

  const discount = $("#discount");
  const paymentMethod = $("#paymentMethod");
  const btnClearCart = $("#btnClearCart");
  const btnCheckout = $("#btnCheckout");

  const kpiTotalDay = $("#kpiTotalDay");
  const kpiSalesCount = $("#kpiSalesCount");
  const lastSales = $("#lastSales");

  // Order meta
  const orderType = $("#orderType");
  const wrapComanda = $("#wrapComanda");
  const orderComanda = $("#orderComanda");

  const wrapDelivery = $("#wrapDelivery");
  const dName = $("#dName");
  const dPhone = $("#dPhone");
  const dAddress = $("#dAddress");
  const dDistrict = $("#dDistrict");
  const dFee = $("#dFee");

  // MENU
  const menuCategory = $("#menuCategory");
  const menuSearch = $("#menuSearch");
  const menuList = $("#menuList");

  // ADMIN
  const formPrato = $("#formPrato");
  const pratoName = $("#pratoName");
  const pratoPrice = $("#pratoPrice");
  const pratoTipo = $("#pratoTipo");

  const formSalgado = $("#formSalgado");
  const salgadoName = $("#salgadoName");
  const salgadoPrice = $("#salgadoPrice");
  const salgadoTipo = $("#salgadoTipo");

  const adminCategory = $("#adminCategory");
  const adminProducts = $("#adminProducts");
  const btnSeed = $("#btnSeed");
  const btnResetAll = $("#btnResetAll");

  // REPORT
  const repStart = $("#repStart");
  const repEnd = $("#repEnd");
  const btnRunReport = $("#btnRunReport");
  const btnClearReport = $("#btnClearReport");
  const repTotal = $("#repTotal");
  const repCount = $("#repCount");
  const reportList = $("#reportList");

  // =========================
  // Navigation (Tabs)
  // =========================
  function showView(name) {
    tabs.forEach((t) => t.classList.toggle("is-active", t.dataset.view === name));
    Object.entries(views).forEach(([k, el]) => el && el.classList.toggle("is-visible", k === name));
    renderAll();
  }
  tabs.forEach((t) => on(t, "click", () => showView(t.dataset.view)));

  // =========================
  // Categories
  // =========================
  function fillCategorySelect(selectEl, includeAll = true) {
    if (!selectEl) return;
    const cats = [...DEFAULT_CATEGORIES];
    const current = selectEl.value;

    selectEl.innerHTML = "";
    if (includeAll) {
      const optAll = document.createElement("option");
      optAll.value = "__ALL__";
      optAll.textContent = "Todas";
      selectEl.appendChild(optAll);
    }
    cats.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      selectEl.appendChild(opt);
    });

    const hasCurrent = [...selectEl.options].some((o) => o.value === current);
    selectEl.value = hasCurrent ? current : (includeAll ? "__ALL__" : cats[0]);
  }

  // =========================
  // Products
  // =========================
  function persistProducts() {
    saveJSON(STORAGE_KEYS.products, products);
  }
  function addProduct({ name, price, category }) {
    products.unshift({
      id: uid("p"),
      name: name.trim(),
      price: clampMoney(price),
      category,
      createdAt: new Date().toISOString(),
    });
    persistProducts();
  }
  function removeProduct(id) {
    products = products.filter((p) => p.id !== id);
    cart = cart.filter((c) => c.productId !== id);
    persistProducts();
  }

  // =========================
  // Cart
  // =========================
  function cartAdd(productId) {
    const item = cart.find((c) => c.productId === productId);
    if (item) item.qty += 1;
    else cart.push({ productId, qty: 1 });
  }
  function cartInc(productId) {
    const item = cart.find((c) => c.productId === productId);
    if (item) item.qty += 1;
  }
  function cartDec(productId) {
    const item = cart.find((c) => c.productId === productId);
    if (!item) return;
    item.qty -= 1;
    if (item.qty <= 0) cart = cart.filter((c) => c.productId !== productId);
  }
  function cartClear() {
    cart = [];
  }
  function getCartSubtotal() {
    return cart.reduce((sum, c) => {
      const p = products.find((x) => x.id === c.productId);
      return p ? sum + p.price * c.qty : sum;
    }, 0);
  }

  // =========================
  // Order type UI
  // =========================
  function updateOrderUI() {
    const type = orderType?.value || "LOCAL";
    if (type === "DELIVERY") {
      if (wrapDelivery) wrapDelivery.style.display = "block";
      if (wrapComanda) wrapComanda.style.display = "none";
    } else {
      if (wrapDelivery) wrapDelivery.style.display = "none";
      if (wrapComanda) wrapComanda.style.display = "block";
    }
    renderTotals();
  }

  // =========================
  // Totals
  // =========================
  function getDeliveryFee() {
    const type = orderType?.value || "LOCAL";
    if (type !== "DELIVERY") return 0;
    return clampMoney(dFee?.value || 0);
  }
  function getDiscount() {
    return clampMoney(discount?.value || 0);
  }
  function renderTotals() {
    const sub = getCartSubtotal();
    const fee = getDeliveryFee();
    const disc = getDiscount();
    const total = Math.max(0, sub + fee - disc);

    if (cartSubtotal) cartSubtotal.textContent = moneyBR(sub);
    if (deliveryFeeLabel) deliveryFeeLabel.textContent = moneyBR(fee);
    if (grandTotal) grandTotal.textContent = moneyBR(total);
  }

  // =========================
  // Sales
  // =========================
  function persistSales() {
    saveJSON(STORAGE_KEYS.sales, sales);
  }

  function checkout() {
    const items = cart
      .map((c) => {
        const p = products.find((x) => x.id === c.productId);
        if (!p) return null;
        return { id: p.id, name: p.name, category: p.category, price: p.price, qty: c.qty, total: p.price * c.qty };
      })
      .filter(Boolean);

    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const fee = getDeliveryFee();
    const disc = getDiscount();
    const total = Math.max(0, subtotal + fee - disc);

    const type = orderType?.value || "LOCAL";

    const meta = (type === "DELIVERY")
      ? {
          type,
          customer: (dName?.value || "").trim(),
          phone: (dPhone?.value || "").trim(),
          address: (dAddress?.value || "").trim(),
          district: (dDistrict?.value || "").trim(),
          deliveryFee: fee,
        }
      : {
          type,
          comanda: (orderComanda?.value || "").trim(),
          deliveryFee: 0,
        };

    const sale = {
      id: uid("s"),
      dateKey: todayKey(),
      createdAt: new Date().toISOString(),
      paymentMethod: paymentMethod?.value || "Dinheiro",
      items,
      subtotal,
      discount: disc,
      total,
      meta,
    };

    sales.unshift(sale);
    persistSales();
    cartClear();

    // limpa campos do pedido
    if (discount) discount.value = "";
    if (orderComanda) orderComanda.value = "";
    if (dName) dName.value = "";
    if (dPhone) dPhone.value = "";
    if (dAddress) dAddress.value = "";
    if (dDistrict) dDistrict.value = "";
    if (dFee) dFee.value = "";
  }

  function getSalesToday() {
    const tk = todayKey();
    return sales.filter((s) => s.dateKey === tk);
  }

  // =========================
  // Filters/Render
  // =========================
  function filterProducts(categoryValue, searchText) {
    const cat = categoryValue;
    const q = (searchText || "").trim().toLowerCase();

    return products.filter((p) => {
      const byCat = cat === "__ALL__" ? true : p.category === cat;
      const byText = !q ? true : p.name.toLowerCase().includes(q);
      return byCat && byText;
    });
  }

  function renderPOSProducts() {
    if (!posProducts) return;
    const list = filterProducts(posCategory?.value || "__ALL__", posSearch?.value || "");

    posProducts.innerHTML = "";
    if (list.length === 0) {
      posProducts.innerHTML = `<div class="muted">Nenhum produto encontrado. Cadastre no Dashboard.</div>`;
      return;
    }

    list.forEach((p) => {
      const el = document.createElement("div");
      el.className = "product";
      el.innerHTML = `
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="meta">
          <span>${escapeHtml(p.category)}</span>
          <span class="price">${moneyBR(p.price)}</span>
        </div>
        <div class="actions">
          <button type="button" class="btn primary" data-add="${p.id}">Adicionar</button>
        </div>
      `;
      posProducts.appendChild(el);
    });

    posProducts.querySelectorAll("[data-add]").forEach((b) => {
      on(b, "click", () => {
        cartAdd(b.dataset.add);
        renderCart();
        renderTotals();
      });
    });
  }

  function renderCart() {
    if (!cartItems || !cartCount) return;

    const count = cart.reduce((s, c) => s + c.qty, 0);
    cartCount.textContent = `${count} itens`;

    cartItems.innerHTML = "";
    if (cart.length === 0) {
      cartItems.innerHTML = `<div class="muted">Carrinho vazio.</div>`;
      renderTotals();
      return;
    }

    cart.forEach((c) => {
      const p = products.find((x) => x.id === c.productId);
      if (!p) return;

      const el = document.createElement("div");
      el.className = "cart-item";
      el.innerHTML = `
        <div>
          <div class="title">${escapeHtml(p.name)}</div>
          <div class="sub">${escapeHtml(p.category)} • ${moneyBR(p.price)} cada</div>
        </div>
        <div class="qty">
          <button type="button" data-dec="${p.id}">-</button>
          <strong>${c.qty}</strong>
          <button type="button" data-inc="${p.id}">+</button>
        </div>
      `;
      cartItems.appendChild(el);
    });

    cartItems.querySelectorAll("[data-inc]").forEach((b) =>
      on(b, "click", () => { cartInc(b.dataset.inc); renderCart(); renderTotals(); })
    );
    cartItems.querySelectorAll("[data-dec]").forEach((b) =>
      on(b, "click", () => { cartDec(b.dataset.dec); renderCart(); renderTotals(); })
    );

    renderTotals();
  }

  function renderPOSKpis() {
    if (!kpiTotalDay || !kpiSalesCount || !lastSales) return;

    const todaySales = getSalesToday();
    const total = todaySales.reduce((s, x) => s + x.total, 0);

    kpiTotalDay.textContent = moneyBR(total);
    kpiSalesCount.textContent = String(todaySales.length);

    const last = todaySales.slice(0, 6);
    lastSales.innerHTML = "";

    if (last.length === 0) {
      lastSales.innerHTML = `<div class="muted">Sem pedidos registrados hoje.</div>`;
      return;
    }

    last.forEach((s) => {
      const time = new Date(s.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const itemsCount = s.items.reduce((a, it) => a + it.qty, 0);

      const type = s.meta?.type === "DELIVERY" ? "Delivery" : "Local";
      const extra =
        s.meta?.type === "DELIVERY"
          ? `${escapeHtml(s.meta.customer || "Cliente")} • ${escapeHtml(s.meta.district || "-")}`
          : `${escapeHtml(s.meta?.comanda || "Mesa/Comanda")} • ${type}`;

      const el = document.createElement("div");
      el.className = "sale";
      el.innerHTML = `
        <div class="row">
          <strong>${moneyBR(s.total)}</strong>
          <span class="muted">${escapeHtml(s.paymentMethod)} • ${time}</span>
        </div>
        <div class="small">${itemsCount} item(ns) • ${extra}</div>
      `;
      lastSales.appendChild(el);
    });
  }

  function renderMenu() {
    if (!menuList) return;

    const list = filterProducts(menuCategory?.value || "__ALL__", menuSearch?.value || "");
    menuList.innerHTML = "";

    if (list.length === 0) {
      menuList.innerHTML = `<div class="muted">Nenhum item no cardápio ainda. Cadastre no Dashboard.</div>`;
      return;
    }

    const groups = {};
    list.forEach((p) => (groups[p.category] ||= []).push(p));

    Object.keys(groups).forEach((cat) => {
      const wrapper = document.createElement("div");
      wrapper.className = "card";
      wrapper.style.marginTop = "12px";
      wrapper.innerHTML = `
        <div class="card-header">
          <h2>${escapeHtml(cat)}</h2>
          <div class="muted">${groups[cat].length} item(ns)</div>
        </div>
        <div class="products" id="group-${safeId(cat)}"></div>
      `;
      menuList.appendChild(wrapper);

      const box = wrapper.querySelector(`#group-${safeId(cat)}`);
      groups[cat].forEach((p) => {
        const el = document.createElement("div");
        el.className = "product";
        el.innerHTML = `
          <div class="name">${escapeHtml(p.name)}</div>
          <div class="meta">
            <span class="muted">No cardápio</span>
            <span class="price">${moneyBR(p.price)}</span>
          </div>
        `;
        box.appendChild(el);
      });
    });
  }

  function renderAdminProducts() {
    if (!adminProducts) return;
    const cat = adminCategory?.value || "__ALL__";
    const list = filterProducts(cat, "");

    adminProducts.innerHTML = "";
    if (list.length === 0) {
      adminProducts.innerHTML = `<div class="muted">Nenhum produto cadastrado.</div>`;
      return;
    }

    list.forEach((p) => {
      const el = document.createElement("div");
      el.className = "admin-item";
      el.innerHTML = `
        <div class="info">
          <div class="t">${escapeHtml(p.name)}</div>
          <div class="s">${escapeHtml(p.category)} • ${moneyBR(p.price)}</div>
        </div>
        <div>
          <button type="button" class="btn danger" data-del="${p.id}">Excluir</button>
        </div>
      `;
      adminProducts.appendChild(el);
    });

    adminProducts.querySelectorAll("[data-del]").forEach((b) => {
      on(b, "click", () => {
        const ok = confirm("Excluir este produto?");
        if (!ok) return;
        removeProduct(b.dataset.del);
        renderAll();
      });
    });
  }

  // =========================
  // Report
  // =========================
  function renderReport(list) {
    const total = list.reduce((s, x) => s + x.total, 0);
    if (repTotal) repTotal.textContent = moneyBR(total);
    if (repCount) repCount.textContent = String(list.length);

    if (!reportList) return;
    reportList.innerHTML = "";

    if (list.length === 0) {
      reportList.innerHTML = `<div class="muted">Nenhum pedido no período.</div>`;
      return;
    }

    list.slice(0, 50).forEach((s) => {
      const dt = new Date(s.createdAt);
      const when = dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const type = s.meta?.type === "DELIVERY" ? "Delivery" : "Local";
      const who =
        s.meta?.type === "DELIVERY"
          ? `${escapeHtml(s.meta.customer || "Cliente")} • ${escapeHtml(s.meta.district || "-")}`
          : `${escapeHtml(s.meta?.comanda || "Mesa/Comanda")}`;

      const el = document.createElement("div");
      el.className = "sale";
      el.innerHTML = `
        <div class="row">
          <strong>${moneyBR(s.total)}</strong>
          <span class="muted">${when}</span>
        </div>
        <div class="small">${type} • ${who} • ${escapeHtml(s.paymentMethod)}</div>
      `;
      reportList.appendChild(el);
    });
  }

  // =========================
  // Events
  // =========================
  on(posCategory, "input", renderPOSProducts);
  on(posSearch, "input", renderPOSProducts);

  on(menuCategory, "input", renderMenu);
  on(menuSearch, "input", renderMenu);

  on(adminCategory, "input", renderAdminProducts);

  on(orderType, "change", updateOrderUI);
  on(dFee, "input", renderTotals);
  on(discount, "input", renderTotals);

  on(btnClearCart, "click", () => {
    cartClear();
    renderAll();
  });

  on(btnCheckout, "click", () => {
    if (cart.length === 0) return alert("Carrinho vazio.");
    const type = orderType?.value || "LOCAL";
    if (type === "DELIVERY") {
      // validação simples
      if (!(dName?.value || "").trim()) return alert("Informe o nome do cliente (Delivery).");
      if (!(dAddress?.value || "").trim()) return alert("Informe o endereço (Delivery).");
    }
    checkout();
    renderAll();
    alert("✅ Pedido finalizado!");
  });

  on(formPrato, "submit", (e) => {
    e.preventDefault();
    const name = (pratoName?.value || "").trim();
    const price = pratoPrice?.value;
    const category = pratoTipo?.value || "Prato Feito";
    if (!name) return alert("Informe o nome do prato.");
    addProduct({ name, price, category });
    if (pratoName) pratoName.value = "";
    if (pratoPrice) pratoPrice.value = "";
    renderAll();
    alert("✅ Prato cadastrado!");
  });

  on(formSalgado, "submit", (e) => {
    e.preventDefault();
    const name = (salgadoName?.value || "").trim();
    const price = salgadoPrice?.value;
    const category = salgadoTipo?.value || "Salgado Frito";
    if (!name) return alert("Informe o nome do salgado.");
    addProduct({ name, price, category });
    if (salgadoName) salgadoName.value = "";
    if (salgadoPrice) salgadoPrice.value = "";
    renderAll();
    alert("✅ Salgado cadastrado!");
  });

  on(btnSeed, "click", () => {
    if (products.length > 0) {
      const ok = confirm("Já existem produtos. Quer adicionar exemplos mesmo assim?");
      if (!ok) return;
    }
    const examples = [
      { name: "Prato Feito (Bife + Arroz + Feijão)", price: 19.9, category: "Prato Feito" },
      { name: "Marmita P (Frango)", price: 16.0, category: "Marmita" },
      { name: "Marmita G (Carne)", price: 22.0, category: "Marmita" },
      { name: "Coxinha", price: 6.5, category: "Salgado Frito" },
      { name: "Kibe", price: 7.0, category: "Salgado Frito" },
      { name: "Esfiha", price: 7.5, category: "Salgado Assado" },
      { name: "Empada", price: 8.0, category: "Salgado Assado" },
    ];
    examples.forEach(addProduct);
    renderAll();
    alert("✅ Exemplos criados!");
  });

  on(btnResetAll, "click", () => {
    const ok = confirm("Isso apaga PRODUTOS e VENDAS. Tem certeza?");
    if (!ok) return;
    products = [];
    sales = [];
    cart = [];
    persistProducts();
    persistSales();
    renderAll();
    alert("✅ Reset concluído.");
  });

  on(btnRunReport, "click", () => {
    const s = repStart?.value;
    const e = repEnd?.value;
    if (!s || !e) return alert("Informe data início e data fim.");

    const start = new Date(s + "T00:00:00");
    const end = new Date(e + "T23:59:59");

    const list = sales.filter((x) => {
      const dt = new Date(x.createdAt);
      return dt >= start && dt <= end;
    });

    renderReport(list);
  });

  on(btnClearReport, "click", () => {
    if (repStart) repStart.value = "";
    if (repEnd) repEnd.value = "";
    renderReport([]);
  });

  // =========================
  // Render All
  // =========================
  function renderAll() {
    fillCategorySelect(posCategory, true);
    fillCategorySelect(menuCategory, true);
    fillCategorySelect(adminCategory, true);

    renderPOSProducts();
    renderCart();
    renderPOSKpis();
    renderMenu();
    renderAdminProducts();
    updateOrderUI();
    renderTotals();
  }

  // =========================
  // Init
  // =========================
  if (isLogged()) showApp();
  else showLogin();

  renderAll();
});
