// ─── Dynamic Date & Greeting ──────────────────────
const now = new Date();
const dateStr = new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(now);
document.getElementById("dateDisplay").textContent = dateStr;

const hour = now.getHours();
const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
document.getElementById("greetingText").textContent = `${greeting}, Admin`;

// ─── Realistic MSC Trust Inventory Data ───────────
const inventory = [
  { name: "Psychiatric medication packs", category: "Clinical & Pharma", stock: 145, unit: "Packs", threshold: 30, updated: "Today, 10:20 AM", img: "img/medication.png" },
  { name: "Rice bags — 25 kg", category: "Food & nutrition", stock: 42, unit: "Bags", threshold: 20, updated: "Today, 09:48 AM", img: "img/rice.png" },
  { name: "Yoga mats", category: "Program materials", stock: 36, unit: "Units", threshold: 15, updated: "Yesterday", img: "img/yoga.png" },
  { name: "Tailoring fabric rolls", category: "Vocational & Care", stock: 28, unit: "Rolls", threshold: 10, updated: "Yesterday", img: "img/fabric.png" },
  { name: "First aid kits", category: "Clinical & Pharma", stock: 8, unit: "Units", threshold: 15, updated: "Yesterday", img: "img/firstaid.png" },
  { name: "Counselling assessment forms", category: "Program materials", stock: 220, unit: "Packs", threshold: 50, updated: "01 Jun 2026", img: "img/forms.png" },
  { name: "Floor cleaner — 5 L", category: "Vocational & Care", stock: 12, unit: "Bottles", threshold: 15, updated: "01 Jun 2026", img: "img/cleaner.png" },
  { name: "Baking flour — 10 kg", category: "Food & nutrition", stock: 6, unit: "Bags", threshold: 12, updated: "31 May 2026", img: "img/flour.png" },
  { name: "Children's drawing books", category: "Program materials", stock: 0, unit: "Packs", threshold: 20, updated: "31 May 2026", img: "img/books.png" },
  { name: "Blood pressure monitors", category: "Clinical & Pharma", stock: 4, unit: "Units", threshold: 5, updated: "30 May 2026", img: "img/bp.png" }
];

const alerts = [
  { name: "First aid kits", text: "Minimum level: 15 units", stock: "8 left", icon: "briefcase-medical" },
  { name: "Baking flour — 10 kg", text: "Minimum level: 12 bags", stock: "6 left", icon: "wheat" },
  { name: "Children's drawing books", text: "Minimum level: 20 packs", stock: "Out", icon: "notebook-pen" },
  { name: "Blood pressure monitors", text: "Minimum level: 5 units", stock: "4 left", icon: "heart-pulse" },
  { name: "Floor cleaner — 5 L", text: "Minimum level: 15 bottles", stock: "12 left", icon: "spray-can" }
];

// ─── DOM References ──────────────────────────────
const inventoryBody = document.getElementById("inventoryBody");
const categoryFilter = document.getElementById("categoryFilter");
const search = document.getElementById("globalSearch");
const itemCount = document.getElementById("itemCount");
const modal = document.getElementById("modalBackdrop");
const toast = document.getElementById("toast");
const dashboard = document.getElementById("dashboard");
const sectionView = document.getElementById("sectionView");
const pageHeading = document.getElementById("pageHeading");

// ─── Status Logic ────────────────────────────────
function getStatus(item) {
  if (item.stock === 0) return ["Out of stock", "out-stock"];
  if (item.stock <= item.threshold) return ["Low stock", "low-stock"];
  return ["In stock", "in-stock"];
}

// ─── Render Card Helper ──────────────────────────
function itemCard(item) {
  const [label, className] = getStatus(item);
  const imgHtml = item.img
    ? `<img src="${item.img}" alt="${item.name}" loading="lazy">`
    : `<span class="inv-icon-fallback"><i data-lucide="package"></i></span>`;
  return `<article class="inv-card">
    <div class="inv-card-img">${imgHtml}</div>
    <div class="inv-card-body">
      <h4>${item.name}</h4>
      <div class="inv-card-meta"><span class="inv-card-cat">${item.category}</span><span class="status ${className}">${label}</span></div>
      <div class="inv-card-row">
        <div class="inv-card-stock"><strong>${item.stock} ${item.unit}</strong><span>Current stock</span></div>
        <div class="inv-card-updated"><b>${item.updated}</b></div>
      </div>
    </div>
  </article>`;
}

// ─── Render Dashboard Grid ──────────────────────
function renderTable() {
  const term = search.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const filtered = inventory.filter(item =>
    (category === "all" || item.category === category) &&
    (`${item.name} ${item.category}`.toLowerCase().includes(term))
  );

  inventoryBody.innerHTML = filtered.map(itemCard).join("") || `<p style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px 0">No matching items found.</p>`;
  itemCount.textContent = `Showing ${filtered.length} item${filtered.length === 1 ? "" : "s"}`;
  lucide.createIcons();
}

// ─── Render Alerts ───────────────────────────────
function renderAlerts() {
  document.getElementById("alertList").innerHTML = alerts.map(item => `
    <div class="alert-item"><div class="alert-img"><i data-lucide="${item.icon}"></i></div>
    <p>${item.name}<span>${item.text}</span></p><b>${item.stock}</b></div>`).join("");
}

// ─── Inventory Cards for Section Page ────────────
function inventoryCards(items = inventory) {
  return items.map(itemCard).join("");
}

// ─── Section Page Data ───────────────────────────
const sectionData = {
  inventory: {
    title: "Inventory",
    subtitle: "Review all items and current stock availability.",
    action: `<button class="primary-btn section-add-item"><i data-lucide="plus"></i>Add new item</button>`,
    content: () => `<div class="section-summary"><article class="mini-stat"><p>Total catalog items</p><h3>${inventory.length}</h3></article><article class="mini-stat"><p>Available items</p><h3>${inventory.filter(item => item.stock > 0).length}</h3></article><article class="mini-stat"><p>Needs attention</p><h3>${inventory.filter(item => item.stock <= item.threshold).length}</h3></article></div>
      <article class="panel section-panel"><div class="panel-heading"><div><h3>All Inventory Items</h3><p>Full stock catalog with current status</p></div></div><div class="inv-grid">${inventoryCards()}</div></article>`
  },
  inward: {
    title: "Stock Inward",
    subtitle: "Record and review items received by the trust.",
    action: `<button class="primary-btn"><i data-lucide="plus"></i>Add inward entry</button>`,
    content: () => movementTable("in")
  },
  outward: {
    title: "Stock Outward",
    subtitle: "Track supplies issued to programs and departments.",
    action: `<button class="primary-btn"><i data-lucide="plus"></i>Add outward entry</button>`,
    content: () => movementTable("out")
  },
  categories: {
    title: "Categories",
    subtitle: "Understand how supplies are grouped across the trust.",
    action: `<button class="primary-btn"><i data-lucide="plus"></i>Add category</button>`,
    content: () => `<div class="category-grid">${[
      ["stethoscope", "Clinical & Pharma", "448 items", "Medicines, equipment, diagnostic tools"],
      ["notebook-pen", "Program materials", "312 items", "Therapy tools, forms, mats, stationery"],
      ["wheat", "Food & nutrition", "275 items", "Rice, flour, oil, provisions for kitchens"],
      ["hammer", "Vocational & Care", "213 items", "Tailoring, carpentry, baking, farming supplies"]
    ].map(item => `<article class="category-card"><div class="category-card-icon"><i data-lucide="${item[0]}"></i></div><h3>${item[1]}</h3><p>${item[3]}</p><b>${item[2]}</b></article>`).join("")}</div>`
  },
  programs: {
    title: "Programs",
    subtitle: "Monitor supply allocation across the trust's care and rehabilitation services.",
    action: `<button class="primary-btn"><i data-lucide="plus"></i>Allocate stock</button>`,
    content: () => `<div class="program-banner"><div><p class="eyebrow">M.S. Chellamuthu Trust & Research Foundation</p><h3>Mental Health for All</h3><p>Supporting affordable and accessible holistic care through well-supplied programs at KK Nagar.</p></div><i data-lucide="heart-handshake"></i></div>
      <div class="program-grid">${[
        ["stethoscope", "Clinical Treatment", "312 allocated", "Ahana Hospitals — psychiatric care & assessments"],
        ["house-heart", "Residential Rehab", "186 allocated", "Shristi & Bodhi — psychosocial rehabilitation"],
        ["pill", "De-addiction & Aftercare", "148 allocated", "Trishul — 30-bed treatment & counselling"],
        ["briefcase-business", "Vocational Training", "224 allocated", "Care Factory — tailoring, baking, farming"],
        ["baby", "Special Education", "136 allocated", "Aakaash School — children with disabilities"],
        ["users-round", "Community Outreach", "92 allocated", "Rural mental health camps & awareness"]
      ].map(item => `<article class="program-card"><div class="program-card-icon"><i data-lucide="${item[0]}"></i></div><div><h3>${item[1]}</h3><p>${item[3]}</p><b>${item[2]}</b></div></article>`).join("")}</div>`
  },
  suppliers: {
    title: "Suppliers",
    subtitle: "Keep vendor contacts and supply categories organized.",
    action: `<button class="primary-btn"><i data-lucide="plus"></i>Add supplier</button>`,
    content: () => `<article class="panel section-panel"><div class="panel-heading"><div><h3>Approved Suppliers</h3><p>Active suppliers supporting trust operations at KK Nagar</p></div></div><div class="table-wrap"><table><thead><tr><th scope="col">Supplier name</th><th scope="col">Category</th><th scope="col">Contact person</th><th scope="col">Phone</th><th scope="col">Status</th></tr></thead><tbody>
      <tr><td>Madurai Medico Supplies</td><td>Clinical & Pharma</td><td>R. Kumar</td><td>+91 98765 43210</td><td><span class="status in-stock">Active</span></td></tr>
      <tr><td>Southern Food Grains</td><td>Food & nutrition</td><td>S. Meena</td><td>+91 94432 11870</td><td><span class="status in-stock">Active</span></td></tr>
      <tr><td>KK Nagar Stationers</td><td>Program materials</td><td>A. Selvam</td><td>+91 97891 42560</td><td><span class="status in-stock">Active</span></td></tr>
      <tr><td>CleanCare Wholesale</td><td>Vocational & Care</td><td>P. Lakshmi</td><td>+91 98421 78235</td><td><span class="status in-stock">Active</span></td></tr>
      </tbody></table></div></article>`
  },
  reports: {
    title: "Reports",
    subtitle: "Generate clear summaries for review and planning.",
    action: `<button class="primary-btn"><i data-lucide="download"></i>Export summary</button>`,
    content: () => `<div class="report-grid">
      <article class="report-card"><i data-lucide="clipboard-list"></i><div><h3>Inventory summary</h3><p>Current quantities and stock status</p></div></article>
      <article class="report-card"><i data-lucide="triangle-alert"></i><div><h3>Low stock report</h3><p>Items that need replenishment</p></div></article>
      <article class="report-card"><i data-lucide="arrow-left-right"></i><div><h3>Movement history</h3><p>Monthly inward and outward records</p></div></article>
    </div>`
  }
};

// ─── Movement Table ──────────────────────────────
function movementTable(type) {
  const isInward = type === "in";
  const rows = isInward ? [
    ["IN-1042", "Psychiatric medication packs", "+80 packs", "Madurai Medico Supplies", "Today, 10:20 AM"],
    ["IN-1041", "Rice bags — 25 kg", "+40 bags", "Southern Food Grains", "01 Jun 2026"],
    ["IN-1040", "Counselling assessment forms", "+100 packs", "KK Nagar Stationers", "31 May 2026"],
    ["IN-1039", "Yoga mats", "+20 units", "CleanCare Wholesale", "30 May 2026"]
  ] : [
    ["OUT-0824", "Rice bags — 25 kg", "-15 bags", "Community kitchen", "Today, 09:48 AM"],
    ["OUT-0823", "Psychiatric medication packs", "-25 packs", "Ahana Hospitals", "01 Jun 2026"],
    ["OUT-0822", "Tailoring fabric rolls", "-8 rolls", "Care Factory", "31 May 2026"],
    ["OUT-0821", "Children's drawing books", "-24 packs", "Aakaash School", "30 May 2026"]
  ];
  return `<article class="panel section-panel"><div class="panel-heading"><div><h3>${isInward ? "Recent Receipts" : "Recent Issues"}</h3><p>${isInward ? "Latest supplies received into inventory" : "Latest supplies issued from inventory"}</p></div></div><div class="table-wrap"><table><thead><tr><th scope="col">Reference</th><th scope="col">Item name</th><th scope="col">Quantity</th><th scope="col">${isInward ? "Supplier" : "Issued to"}</th><th scope="col">Date</th></tr></thead><tbody>${rows.map(row => `<tr><td>${row[0]}</td><td>${row[1]}</td><td><span class="movement-type ${type}"><i data-lucide="${isInward ? "arrow-down-to-line" : "arrow-up-from-line"}"></i>${row[2]}</span></td><td>${row[3]}</td><td>${row[4]}</td></tr>`).join("")}</tbody></table></div></article>`;
}

// ─── Navigation ──────────────────────────────────
function switchPage(page) {
  const navButton = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (!navButton) return;
  document.querySelector(".nav-item.active")?.classList.remove("active");
  navButton.classList.add("active");
  closeSidebar();

  if (page === "dashboard") {
    dashboard.hidden = false;
    sectionView.hidden = true;
    pageHeading.textContent = "Inventory Dashboard";
    animateMetrics();
  } else {
    const section = sectionData[page];
    dashboard.hidden = true;
    sectionView.hidden = false;
    pageHeading.textContent = section.title;

    // Skeleton shimmer loading
    sectionView.innerHTML = `<div class="section-intro"><div><p class="eyebrow">Inventory Management</p><h2>${section.title}</h2><p>${section.subtitle}</p></div><div class="section-tools">${section.action}</div></div><div class="skeleton skeleton-stat" style="margin-bottom:12px"></div><div class="skeleton skeleton-row"></div><div class="skeleton skeleton-row"></div><div class="skeleton skeleton-row"></div>`;
    lucide.createIcons();

    setTimeout(() => {
      sectionView.innerHTML = `<div class="section-intro"><div><p class="eyebrow">Inventory Management</p><h2>${section.title}</h2><p>${section.subtitle}</p></div><div class="section-tools">${section.action}</div></div>${section.content()}`;
      sectionView.querySelector(".section-add-item")?.addEventListener("click", openModal);
      sectionView.querySelectorAll(".report-card").forEach(card => card.addEventListener("click", () => showToast(`${card.querySelector("h3").textContent} ready to generate`)));
      lucide.createIcons();
    }, 400);
  }
}

// ─── Toast ───────────────────────────────────────
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2800);
}

// ─── Modal ───────────────────────────────────────
function openModal() {
  modal.hidden = false;
  document.querySelector('input[name="name"]').focus();
}
function closeModal() {
  modal.hidden = true;
  document.getElementById("addItemForm").reset();
}

// ─── Event Listeners ─────────────────────────────
document.getElementById("addItemBtn").addEventListener("click", openModal);
document.getElementById("quickAdd").addEventListener("click", openModal);
document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("cancelModal").addEventListener("click", closeModal);
modal.addEventListener("click", event => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !modal.hidden) closeModal(); });
categoryFilter.addEventListener("change", renderTable);
search.addEventListener("input", renderTable);

document.getElementById("addItemForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(event.target);
  inventory.unshift({
    name: data.get("name"),
    category: data.get("category"),
    stock: Number(data.get("stock")),
    unit: data.get("unit"),
    threshold: Number(data.get("threshold")),
    updated: "Just now"
  });
  renderTable();
  closeModal();
  showToast("✓ Item added to inventory");
});

document.getElementById("exportBtn").addEventListener("click", () => {
  const rows = [["Item name", "Category", "Stock", "Unit", "Status", "Last updated"], ...inventory.map(item => [item.name, item.category, item.stock, item.unit, getStatus(item)[0], item.updated])];
  const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: "msc-trust-inventory.csv" });
  link.click();
  URL.revokeObjectURL(url);
  showToast("✓ Inventory report exported");
});

document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => switchPage(button.dataset.page)));

// ─── Hamburger Menu ──────────────────────────────
const menuBtn = document.getElementById("menuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("sidebarOverlay");

function openSidebar() {
  sidebar.classList.add("open");
  menuBtn.classList.add("active");
  overlay.classList.add("show");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  menuBtn.classList.remove("active");
  overlay.classList.remove("show");
}
menuBtn.addEventListener("click", () => sidebar.classList.contains("open") ? closeSidebar() : openSidebar());
overlay.addEventListener("click", closeSidebar);
sidebar.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", closeSidebar));

// ─── FAB ─────────────────────────────────────────
document.getElementById("fabAdd").addEventListener("click", openModal);

// ─── Other Listeners ─────────────────────────────
document.querySelector(".notification-btn").addEventListener("click", () => showToast("You have 5 low stock alerts"));
document.querySelector(".full-btn").addEventListener("click", () => showToast("Showing the latest low stock alerts"));
document.querySelectorAll(".stat-card").forEach(card => card.addEventListener("click", () => showToast(`${card.querySelector("p").textContent}: ${card.querySelector("h3").textContent}`)));
document.querySelectorAll(".more-btn").forEach(button => button.addEventListener("click", () => showToast("More options will appear here")));

// ─── Chart Tooltip ───────────────────────────────
const chartTooltip = document.getElementById("chartTooltip");
const chartValues = [148, 173, 159, 221, 205, 255, 233];
const chartLabels = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5", "Week 6", "Week 7"];

document.querySelectorAll(".chart-points.inward-points circle").forEach((dot, i) => {
  dot.addEventListener("mouseenter", e => {
    const rect = dot.closest(".line-chart").getBoundingClientRect();
    const cx = dot.cx.baseVal.value;
    const cy = dot.cy.baseVal.value;
    const svg = dot.closest("svg");
    const svgRect = svg.getBoundingClientRect();
    const xRatio = svgRect.width / 700;
    const yRatio = svgRect.height / 220;
    chartTooltip.textContent = `${chartLabels[i]}: ${chartValues[i]} items`;
    chartTooltip.classList.add("show");
    const ttWidth = chartTooltip.offsetWidth;
    chartTooltip.style.left = `${svg.offsetLeft + cx * xRatio - ttWidth / 2}px`;
    chartTooltip.style.top = `${svg.offsetTop + cy * yRatio - 34}px`;
  });
  dot.addEventListener("mouseleave", () => chartTooltip.classList.remove("show"));
});

// ─── Animate Count-Up ────────────────────────────
function countUp(element, target, duration = 1200, prefix = "", suffix = "") {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) { element.textContent = prefix + target.toLocaleString("en-IN") + suffix; return; }

  element.textContent = prefix + "0" + suffix;
  const start = performance.now();
  const update = now => {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out quart for smooth deceleration
    const eased = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(target * eased);
    element.textContent = prefix + current.toLocaleString("en-IN") + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

function animateMetrics() {
  countUp(document.getElementById("totalItems"), 1248, 1400);
  countUp(document.getElementById("availableStock"), 1102, 1200);
  countUp(document.getElementById("lowStockCount"), 18, 800);
}

// Intersection Observer — re-trigger count-up when stat cards scroll into view
const statObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateMetrics();
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });
const statGrid = document.querySelector(".stat-grid");
if (statGrid) statObserver.observe(statGrid);

// ─── Smooth Number Transition (Filter Change) ────
function animateItemCount(newCount) {
  const el = document.getElementById("itemCount");
  el.style.transition = "opacity .2s, transform .2s";
  el.style.opacity = "0";
  el.style.transform = "translateY(4px)";
  setTimeout(() => {
    el.textContent = `Showing ${newCount} item${newCount === 1 ? "" : "s"}`;
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  }, 200);
}

// Patch renderTable to animate the count
const _origRenderTable = renderTable;
renderTable = function() {
  _origRenderTable();
  const countText = document.getElementById("itemCount").textContent;
  const match = countText.match(/(\d+)/);
  if (match) animateItemCount(Number(match[1]));
};

// ─── Initialize ──────────────────────────────────
_origRenderTable();
renderAlerts();
lucide.createIcons();
animateMetrics();
