const STORAGE_KEY = "bodega-inventario-app-v2";

const state = {
  inventory: [],
  history: [],
};

const inventoryTableBody = document.getElementById("inventoryTableBody");
const historyTableBody = document.getElementById("historyTableBody");
const searchInput = document.getElementById("searchInput");
const lowStockOnly = document.getElementById("lowStockOnly");
const incomeItemSelect = document.getElementById("incomeItemSelect");
const outcomeItemSelect = document.getElementById("outcomeItemSelect");
const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll(".tab-panel");

function normalizeText(value) {
  return String(value || "").trim();
}

function parseQuantity(value) {
  if (typeof value === "number") return value;
  const match = String(value || "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function excelSerialToIso(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return normalizeText(value);
  }

  const excelEpoch = Date.UTC(1899, 11, 30);
  const milliseconds = Math.round(numeric * 86400000);
  return new Date(excelEpoch + milliseconds).toISOString();
}

function normalizeDateValue(value) {
  const raw = normalizeText(value);
  if (/^\d+(\.\d+)?$/.test(raw)) {
    return excelSerialToIso(raw);
  }
  return raw;
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function currentDateTimeLocal() {
  const date = new Date();
  const pad = (part) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function createSeedState() {
  const inventorySeed = (window.SEED_DATA?.inventory || []).map((item, index) => {
    const code = normalizeText(item.code) || `AUTO-${String(index + 1).padStart(3, "0")}`;
    return {
      code,
      description: normalizeText(item.description),
      zone: normalizeText(item.zone),
      location: normalizeText(item.location),
      stock: parseQuantity(item.stock),
      minStock: 1,
    };
  }).filter((item) => item.description);

  const deduped = [];
  const seen = new Set();
  for (const item of inventorySeed) {
    if (seen.has(item.code)) {
      item.code = `${item.code}-${deduped.length + 1}`;
    }
    seen.add(item.code);
    deduped.push(item);
  }

  return { inventory: deduped, history: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    state.inventory = parsed.inventory || [];
    state.history = [];
    saveState();
    return;
  }

  const seed = createSeedState();
  state.inventory = seed.inventory;
  state.history = seed.history;
  saveState();
}

function activateTab(targetId) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tabTarget === targetId);
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.id === targetId;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

function populateItemSelects() {
  const options = state.inventory
    .slice()
    .sort((a, b) => a.description.localeCompare(b.description, "es"))
    .map((item) => `<option value="${escapeXml(item.code)}">${escapeXml(`${item.description} (${item.code})`)}</option>`)
    .join("");

  incomeItemSelect.innerHTML = `<option value="">Selecciona un item</option>${options}`;
  outcomeItemSelect.innerHTML = `<option value="">Selecciona un item</option>${options}`;
}

function renderStats() {
  const totalItems = state.inventory.length;
  const totalStock = state.inventory.reduce((sum, item) => sum + item.stock, 0);
  const totalLowStock = state.inventory.filter((item) => item.stock <= item.minStock).length;
  document.getElementById("statItems").textContent = totalItems;
  document.getElementById("statStock").textContent = totalStock;
  document.getElementById("statLowStock").textContent = totalLowStock;
  document.getElementById("statMovements").textContent = state.history.length;
}

function renderInventory() {
  const query = normalizeText(searchInput.value).toLocaleLowerCase("es");
  const rows = state.inventory.filter((item) => {
    const matchesQuery = !query || [item.code, item.description, item.zone, item.location]
      .join(" ")
      .toLocaleLowerCase("es")
      .includes(query);
    const matchesStock = !lowStockOnly.checked || item.stock <= item.minStock;
    return matchesQuery && matchesStock;
  });

  inventoryTableBody.innerHTML = rows.map((item) => `
    <tr>
      <td>${escapeXml(item.code)}</td>
      <td>${escapeXml(item.description)}</td>
      <td>${escapeXml(item.zone || "-")}</td>
      <td>${escapeXml(item.location || "-")}</td>
      <td class="${item.stock <= item.minStock ? "stock-low" : ""}">${escapeXml(item.stock)}</td>
      <td>${escapeXml(item.minStock)}</td>
    </tr>
  `).join("");
}

function renderHistory() {
  historyTableBody.innerHTML = state.history
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 150)
    .map((movement) => `
      <tr>
        <td>${escapeXml(formatDateTime(movement.date) || movement.date)}</td>
        <td>${escapeXml(movement.type)}</td>
        <td>${escapeXml(movement.technician)}</td>
        <td>${escapeXml(movement.itemName)}</td>
        <td>${escapeXml(movement.code)}</td>
        <td>${escapeXml(movement.quantity)}</td>
        <td>${escapeXml(movement.resultingStock)}</td>
      </tr>
    `).join("");
}

function render() {
  renderStats();
  renderInventory();
  renderHistory();
  populateItemSelects();
}

function getItemByCode(code) {
  return state.inventory.find((item) => item.code === code);
}

function registerMovement(type, form) {
  const formData = new FormData(form);
  const item = getItemByCode(formData.get("itemCode"));
  const quantity = Number(formData.get("quantity"));
  const technician = normalizeText(formData.get("technician"));
  const date = normalizeText(formData.get("date"));

  if (!item || !quantity || quantity < 1) {
    alert("Completa el movimiento con un item valido y una cantidad mayor a cero.");
    return;
  }

  if (type === "Egreso" && quantity > item.stock) {
    alert("No puedes registrar un egreso mayor al stock disponible.");
    return;
  }

  item.stock = type === "Ingreso" ? item.stock + quantity : item.stock - quantity;

  state.history.push({
    date,
    type,
    technician,
    itemName: item.description,
    code: item.code,
    quantity,
    resultingStock: item.stock,
  });

  saveState();
  render();
  form.reset();
  form.elements.date.value = currentDateTimeLocal();
}

function buildWorksheet(name, headers, rows) {
  const headerXml = headers.map((header) =>
    `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`
  ).join("");

  const rowsXml = rows.map((row) => {
    const cells = row.map((cell) => {
      const isNumber = typeof cell === "number" && Number.isFinite(cell);
      const type = isNumber ? "Number" : "String";
      return `<Cell><Data ss:Type="${type}">${escapeXml(cell)}</Data></Cell>`;
    }).join("");
    return `<Row>${cells}</Row>`;
  }).join("");

  return `
    <Worksheet ss:Name="${escapeXml(name)}">
      <Table>
        <Row>${headerXml}</Row>
        ${rowsXml}
      </Table>
    </Worksheet>
  `;
}

function exportExcel() {
  const inventoryRows = state.inventory.map((item) => [
    item.code,
    item.description,
    item.zone,
    item.location,
    item.stock,
    item.minStock,
  ]);

  const movementRows = state.history
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((movement) => [
      movement.date,
      movement.type,
      movement.technician,
      movement.itemName,
      movement.code,
      movement.quantity,
      movement.resultingStock,
    ]);

  const incomeRows = movementRows.filter((row) => row[1] === "Ingreso");
  const outcomeRows = movementRows.filter((row) => row[1] === "Egreso");

  const workbook = `<?xml version="1.0"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
   xmlns:o="urn:schemas-microsoft-com:office:office"
   xmlns:x="urn:schemas-microsoft-com:office:excel"
   xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Styles>
      <Style ss:ID="header">
        <Font ss:Bold="1"/>
        <Interior ss:Color="#E8F3EF" ss:Pattern="Solid"/>
      </Style>
    </Styles>
    ${buildWorksheet("Inventario", ["Codigo", "Descripcion", "Zona", "Ubicacion", "Stock", "Stock minimo"], inventoryRows)}
    ${buildWorksheet("Historial", ["Fecha", "Tipo", "Tecnico", "Herramienta", "Codigo", "Cantidad", "Stock resultante"], movementRows)}
    ${buildWorksheet("Ingreso", ["Fecha", "Tipo", "Tecnico", "Herramienta", "Codigo", "Cantidad", "Stock resultante"], incomeRows)}
    ${buildWorksheet("Egreso", ["Fecha", "Tipo", "Tecnico", "Herramienta", "Codigo", "Cantidad", "Stock resultante"], outcomeRows)}
  </Workbook>`;

  const blob = new Blob([workbook], { type: "application/vnd.ms-excel" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `inventario-bodega-${stamp}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function resetToSeed() {
  if (!confirm("Esto reemplazara los cambios guardados por la base inicial del Excel.")) {
    return;
  }

  const seed = createSeedState();
  state.inventory = seed.inventory;
  state.history = seed.history;
  saveState();
  render();
}

function handleNewItem(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const code = normalizeText(formData.get("code"));

  if (getItemByCode(code)) {
    alert("Ya existe un item con ese codigo.");
    return;
  }

  state.inventory.push({
    code,
    description: normalizeText(formData.get("description")),
    zone: normalizeText(formData.get("zone")),
    location: normalizeText(formData.get("location")),
    stock: Number(formData.get("stock")),
    minStock: Number(formData.get("minStock")) || 0,
  });

  saveState();
  render();
  event.currentTarget.reset();
}

function bindEvents() {
  searchInput.addEventListener("input", renderInventory);
  lowStockOnly.addEventListener("change", renderInventory);
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
  });
  document.getElementById("itemForm").addEventListener("submit", handleNewItem);
  document.getElementById("incomeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    registerMovement("Ingreso", event.currentTarget);
  });
  document.getElementById("outcomeForm").addEventListener("submit", (event) => {
    event.preventDefault();
    registerMovement("Egreso", event.currentTarget);
  });
  document.getElementById("exportExcelBtn").addEventListener("click", exportExcel);
  document.getElementById("resetBtn").addEventListener("click", resetToSeed);
}

function initializeDefaultDates() {
  document.querySelector("#incomeForm [name='date']").value = currentDateTimeLocal();
  document.querySelector("#outcomeForm [name='date']").value = currentDateTimeLocal();
}

loadState();
bindEvents();
initializeDefaultDates();
activateTab("inventoryTab");
render();
