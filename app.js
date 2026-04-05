// ══════════════════════════════════════════════
//  SST SUPER SUN TRADERS – Pricing App Logic
//  Enhanced UI/UX & Logo Management Edition
// ══════════════════════════════════════════════

// ── STATE & CONSTANTS ──────────────────────────
let currentPage    = 'home';
let invRowCount    = 0;
let quoRowCount    = 0;
let invGstEnabled   = true;
let quoGstEnabled   = true;

// Authentication State
let isAuth = localStorage.getItem('sst_auth') === 'true';
let currentUser = JSON.parse(localStorage.getItem('sst_user') || '{"name": "SST Super Sun Traders", "email": "admin@sst.com"}');
let registeredUsers = JSON.parse(localStorage.getItem('sst_users') || '[]');

// Branding State
let companyLogo = localStorage.getItem('sst_company_logo') || '';
let currentClientLogo = ''; // Specific to current quotation

// Simply Tally - Financial State
let transactions = JSON.parse(localStorage.getItem('sst_transactions') || '[]');
let chartTrend    = null;
let chartCategory = null;

const ACCOUNT_TYPES = {
  RECEIPT: 'Receipt (Income)',
  PAYMENT: 'Payment (Expense)',
  SALES:   'Sales (Voucher)',
  PURCHASE:'Purchase (Voucher)'
};

const LEDGER_CATEGORIES = {
  'Receipt (Income)': ['Sales Revenue', 'Consulting', 'Other Income', 'Capital Infusion'],
  'Payment (Expense)':['Material Purchase', 'Rent & Electricity', 'Salary & Wages', 'Logistics', 'Marketing', 'Office Expenses', 'Taxes paid', 'General Expenses'],
  'Sales (Voucher)':['Product Sales (GST)', 'Service Sales (GST)'],
  'Purchase (Voucher)':['Raw Material (GST)', 'Asset Purchase (GST)']
};

// ── INITIALISE ON LOAD ──────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  try {
    // 🌙☀️ Restore theme first (before anything renders)
    initTheme();

    checkAuth();
    loadSettings();
    
    // Dates
    const today = new Date().toISOString().split('T')[0];
    const invDate = document.getElementById('inv-date');
    const quoDate = document.getElementById('quo-date');
    if (invDate) invDate.value = today;
    if (quoDate) quoDate.value = today;

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('menu-toggle');
    const sidebar   = document.getElementById('sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        const overlay = document.getElementById('sidebar-overlay');
        if (overlay) overlay.classList.toggle('active', sidebar.classList.contains('open'));
      });
    }

    // Initialize Financials module safely
    if (typeof initFinancials === 'function') initFinancials();
    
    // Initialize Dashboard welcome
    updateWelcomeText();
  } catch (err) {
    console.error("Initialization Error:", err);
  }
}

// ══════════════════════════════════════════════
//  🌙☀️ THEME TOGGLE — DARK / LIGHT MODE
// ══════════════════════════════════════════════

let currentTheme = 'dark'; // default

function initTheme() {
  const saved = localStorage.getItem('sst_theme_mode') || 'dark';
  currentTheme = saved;
  applyTheme(saved, false); // false = no animation on initial load
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme, true);
  localStorage.setItem('sst_theme_mode', currentTheme);
}

function applyTheme(theme, animate) {
  const html = document.documentElement;

  // Pause CSS transitions briefly on initial load to avoid flash
  if (!animate) {
    html.style.setProperty('--dur', '0s');
    setTimeout(() => html.style.removeProperty('--dur'), 50);
  }

  if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }

  // Update all toggle pill emojis and labels
  updateToggleUI(theme);

  // Re-render charts with matching colors
  if (typeof renderCharts === 'function') {
    setTimeout(renderCharts, 350);
  }

  if (animate) {
    showToast(theme === 'light' ? '☀️ Switched to Light Mode' : '🌙 Switched to Dark Mode', 'info');
  }
}

function updateToggleUI(theme) {
  const isLight = theme === 'light';
  const pillEmoji  = isLight ? '☀️' : '🌙';

  // Update all .theme-toggle-pill elements
  document.querySelectorAll('.theme-toggle-pill').forEach(el => {
    el.textContent = pillEmoji;
  });
}

// ══════════════════════════════════════════════
//  AUTHENTICATION MOCK
// ══════════════════════════════════════════════
function checkAuth() {
  const authScreen = document.getElementById('auth-screen');
  if (isAuth) {
    authScreen.style.display = 'none';
  } else {
    authScreen.style.display = 'flex';
  }
}

function switchAuthTab(type) {
  const loginTab = document.getElementById('tab-login');
  const signupTab = document.getElementById('tab-signup');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');

  if (type === 'login') {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    title.textContent = 'Welcome Back';
    subtitle.textContent = 'Login to manage your business financials';
  } else {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    loginForm.style.display = 'none';
    signupForm.style.display = 'block';
    title.textContent = 'Create Account';
    subtitle.textContent = 'Join SST Super Sun Traders today';
  }
}

function handleAuth(e) {
  e.preventDefault();
  const user = document.getElementById('auth-user').value;
  const pass = document.getElementById('auth-pass').value;

  // 1. Check Hardcoded SST Credentials
  if (user === 'SST' && pass === 'SST@123') {
    loginSuccess("SST Super Sun Traders", "admin@sst.com");
    return;
  }

  // 2. Check Registered Users
  const found = registeredUsers.find(u => u.username === user && u.password === pass);
  if (found) {
    loginSuccess(found.name, `${found.username}@sst.com`);
  } else {
    showToast("Invalid Credentials. Please check username/password.", "error");
  }
}

function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const user = document.getElementById('reg-user').value;
  const pass = document.getElementById('reg-pass').value;

  if (registeredUsers.some(u => u.username === user) || user === 'SST') {
    showToast("Username already exists!", "error");
    return;
  }

  registeredUsers.push({ name, username: user, password: pass });
  localStorage.setItem('sst_users', JSON.stringify(registeredUsers));
  
  showToast("Account Created! You can now Login.", "success");
  switchAuthTab('login');
}

function loginSuccess(name, email) {
  isAuth = true;
  localStorage.setItem('sst_auth', 'true');
  currentUser = { name, email };
  localStorage.setItem('sst_user', JSON.stringify(currentUser));
  
  showToast(`Welcome back, ${name}!`, "success");
  checkAuth();
  updateWelcomeText();
}

function handleLogout() {
  if (!confirm("Are you sure you want to logout?")) return;
  isAuth = false;
  localStorage.removeItem('sst_auth');
  checkAuth();
}

function updateWelcomeText() {
  const welcome = document.querySelector('.welcome-header h1 span');
  if (welcome) welcome.textContent = currentUser.name.split(' ')[0];
}

// ══════════════════════════════════════════════
//  SETTINGS & BRANDING
// ══════════════════════════════════════════════
function loadSettings() {
  // Load Logo
  if (companyLogo) {
    updateLogoPreviews(companyLogo);
  }
  
  // Load User Info
  const nameInput = document.getElementById('settings-user-name');
  if (nameInput) nameInput.value = currentUser.name;

  // Load Theme
  loadTheme();
}

// ── UI/UX THEME CUSTOMIZER ──────────────────
function hexToRGB(hex) {
  let r = 0, g = 0, b = 0;
  // 3 digits
  if (hex.length == 4) {
    r = "0x" + hex[1] + hex[1];
    g = "0x" + hex[2] + hex[2];
    b = "0x" + hex[3] + hex[3];
  } else if (hex.length == 7) {
    r = "0x" + hex[1] + hex[2];
    g = "0x" + hex[3] + hex[4];
    b = "0x" + hex[5] + hex[6];
  }
  return `${+r}, ${+g}, ${+b}`;
}

function updateThemePreview() {
  const primary = document.getElementById('theme-primary').value;
  const accent  = document.getElementById('theme-accent').value;
  const opacity = document.getElementById('theme-glass-opacity').value / 100;
  const radius  = document.getElementById('theme-radius').value;

  const root = document.documentElement;
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--primary-glow', `rgba(${hexToRGB(primary)}, 0.3)`);
  root.style.setProperty('--glass-bg', `rgba(255, 255, 255, ${opacity})`);
  root.style.setProperty('--radius-md', `${radius}px`);
  root.style.setProperty('--radius-lg', `${radius * 1.5}px`);
  root.style.setProperty('--radius-xl', `${radius * 2.5}px`);
}

function saveTheme() {
  const settings = {
    primary: document.getElementById('theme-primary').value,
    accent:  document.getElementById('theme-accent').value,
    opacity: document.getElementById('theme-glass-opacity').value,
    radius:  document.getElementById('theme-radius').value
  };
  localStorage.setItem('sst_theme', JSON.stringify(settings));
  showToast("UI Design Saved Successfully!", "success");
}

function resetTheme() {
  if (!confirm("Reset all UI changes to default?")) return;
  localStorage.removeItem('sst_theme');
  location.reload();
}

function loadTheme() {
  const saved = localStorage.getItem('sst_theme');
  if (saved) {
    const theme = JSON.parse(saved);
    document.getElementById('theme-primary').value = theme.primary;
    document.getElementById('theme-accent').value  = theme.accent;
    document.getElementById('theme-glass-opacity').value = theme.opacity;
    document.getElementById('theme-radius').value  = theme.radius;
    updateThemePreview();
  }
}

function handleCompanyLogo(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      companyLogo = e.target.result;
      updateLogoPreviews(companyLogo);
      showToast("Company logo uploaded successfully.");
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function updateLogoPreviews(dataUrl) {
  const sidebarLogoBox = document.getElementById('sidebar-logo-box');
  const logoText = document.getElementById('logo-text');
  const sidebarPreview = document.getElementById('company-logo-preview');
  const settingsPreview = document.getElementById('company-logo-settings-preview');
  const placeholder = document.getElementById('company-upload-placeholder');
  const removeBtn = document.getElementById('btn-remove-logo');

  if (dataUrl) {
    if (logoText) logoText.style.display = 'none';
    if (sidebarPreview) {
      sidebarPreview.src = dataUrl;
      sidebarPreview.style.display = 'block';
    }
    if (settingsPreview) {
      settingsPreview.src = dataUrl;
      settingsPreview.style.display = 'block';
    }
    if (placeholder) placeholder.style.display = 'none';
    if (removeBtn) removeBtn.style.display = 'block';
  }
}

function removeCompanyLogo() {
  companyLogo = '';
  localStorage.removeItem('sst_company_logo');
  
  const logoText = document.getElementById('logo-text');
  const sidebarPreview = document.getElementById('company-logo-preview');
  const settingsPreview = document.getElementById('company-logo-settings-preview');
  const placeholder = document.getElementById('company-upload-placeholder');
  const removeBtn = document.getElementById('btn-remove-logo');

  if (logoText) logoText.style.display = 'block';
  if (sidebarPreview) sidebarPreview.style.display = 'none';
  if (settingsPreview) settingsPreview.style.display = 'none';
  if (placeholder) placeholder.style.display = 'block';
  if (removeBtn) removeBtn.style.display = 'none';
  
  showToast("Logo removed.");
}

function handleClientLogo(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      currentClientLogo = e.target.result;
      const preview = document.getElementById('quo-logo-preview');
      const status = document.getElementById('quo-logo-status');
      if (preview) {
        preview.src = currentClientLogo;
        preview.style.display = 'block';
      }
      if (status) status.style.display = 'none';
      showToast("Client logo attached to quotation.");
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function saveSettings() {
  const name = document.getElementById('settings-user-name').value;
  currentUser.name = name;
  localStorage.setItem('sst_user', JSON.stringify(currentUser));
  if (companyLogo) localStorage.setItem('sst_company_logo', companyLogo);
  
  showToast("Settings saved successfully.");
  updateWelcomeText();
}

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (!pageEl) return;
  pageEl.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.dataset.page === page) b.classList.add('active');
  });

  // Sync bottom nav
  document.querySelectorAll('.bnav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.page === page);
  });

  currentPage = page;
  const titles = { home:'Dashboard', invoice:'Tax Invoice', quotation:'Quotation', financials:'Financials', settings:'App Settings' };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  if (page === 'invoice'   && invRowCount === 0) { addInvRow(); addInvRow(); addInvRow(); }
  if (page === 'quotation' && quoRowCount === 0) { addQuoRow(); addQuoRow(); addQuoRow(); }
  if (page === 'financials') { refreshFinUI(); }

  closeSidebar();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

function backToForm(type) {
  document.getElementById(type + '-form-section').style.display = '';
  document.getElementById(type + '-print-area').style.display   = 'none';
}

function resetForm() {
  if (currentPage === 'invoice') {
    document.querySelectorAll('#page-invoice input, #page-invoice textarea').forEach(el => el.value = '');
    document.getElementById('inv-items-body').innerHTML = '';
    invRowCount = 0;
    addInvRow(); addInvRow(); addInvRow();
    setInvGst(true);
    calcInvTotals();
    backToForm('invoice');
  } else if (currentPage === 'quotation') {
    document.querySelectorAll('#page-quotation input, #page-quotation textarea').forEach(el => el.value = '');
    document.getElementById('quo-items-body').innerHTML = '';
    quoRowCount = 0;
    addQuoRow(); addQuoRow(); addQuoRow();
    setQuoGst(true);
    calcQuoTotals();
    backToForm('quotation');
    // Reset client logo
    currentClientLogo = '';
    document.getElementById('quo-logo-preview').style.display = 'none';
    document.getElementById('quo-logo-status').style.display = 'block';
  }
  const today = new Date().toISOString().split('T')[0];
  if (currentPage === 'invoice')   document.getElementById('inv-date').value = today;
  if (currentPage === 'quotation') document.getElementById('quo-date').value = today;
  showToast('Form reset successful.');
}

// ══════════════════════════════════════════════
//  GST & PRICING COMMON LOGIC
// ══════════════════════════════════════════════

function setInvGst(enabled) {
  invGstEnabled = enabled;
  document.getElementById('inv-gst-on') ?.classList.toggle('active', enabled);
  document.getElementById('inv-gst-off')?.classList.toggle('active', !enabled);
  const table = document.getElementById('inv-items-table');
  if (table) table.classList.toggle('no-gst', !enabled);
  const cgstRow = document.getElementById('inv-cgst-row');
  const sgstRow = document.getElementById('inv-sgst-row');
  if (cgstRow) cgstRow.style.display = enabled ? '' : 'none';
  if (sgstRow) sgstRow.style.display = enabled ? '' : 'none';
  const grandLabel = document.getElementById('inv-grand-label');
  if (grandLabel) grandLabel.textContent = enabled ? 'Grand Total' : 'Total Amount';
  calcInvTotals();
}

function setQuoGst(enabled) {
  quoGstEnabled = enabled;
  document.getElementById('quo-gst-on') ?.classList.toggle('active', enabled);
  document.getElementById('quo-gst-off')?.classList.toggle('active', !enabled);
  const table = document.getElementById('quo-items-table');
  if (table) table.classList.toggle('no-gst', !enabled);
  const gstRow = document.getElementById('quo-gst-row');
  if (gstRow) gstRow.style.display = enabled ? '' : 'none';
  const grandLabel = document.getElementById('quo-grand-label');
  if (grandLabel) grandLabel.textContent = enabled ? 'Grand Total (incl. GST)' : 'Total Amount';
  calcQuoTotals();
}

function addInvRow() {
  invRowCount++;
  const n = invRowCount;
  const tbody = document.getElementById('inv-items-body');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.id = 'inv-row-' + n;
  tr.innerHTML = `
    <td class="sno">${n}</td>
    <td><input class="left" type="text" placeholder="Item description" oninput="calcInvTotals()"></td>
    <td><input type="text" placeholder="HSN" style="width:90px"></td>
    <td><input type="number" placeholder="0" min="0" step="1" style="width:70px" oninput="calcInvTotals()"></td>
    <td><input type="text" placeholder="pcs" style="width:55px"></td>
    <td><input type="number" placeholder="0.00" min="0" step="0.01" style="width:90px" oninput="calcInvTotals()"></td>
    <td class="gst-col">
      <select style="padding:7px 6px;border:1.5px solid #ccc;border-radius:6px;font-size:13px;" onchange="calcInvTotals()">
        <option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option><option value="0">0%</option>
      </select>
    </td>
    <td class="gst-col"><input type="text" placeholder="0.00" readonly style="background:#f9fafb;width:80px;font-family:'JetBrains Mono',monospace;font-size:12px;" id="inv-gstamt-${n}"></td>
    <td><input type="text" placeholder="0.00" readonly style="background:#f9fafb;width:90px;font-family:'JetBrains Mono',monospace;font-size:12px;" id="inv-amt-${n}"></td>
    <td><input type="text" placeholder="Batch No." style="width:100px"></td>
    <td><input type="text" placeholder="dd/mm/yy" style="width:80px"></td>
    <td><input type="text" placeholder="dd/mm/yy" style="width:80px"></td>
    <td><button class="del-row" onclick="delRow('inv-row-${n}','inv')">✕</button></td>
  `;
  tbody.appendChild(tr);
}

function addQuoRow() {
  quoRowCount++;
  const n = quoRowCount;
  const tbody = document.getElementById('quo-items-body');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.id = 'quo-row-' + n;
  tr.innerHTML = `
    <td class="sno">${n}</td>
    <td><input class="left" type="text" placeholder="Item name / description" oninput="calcQuoTotals()"></td>
    <td><input type="text" placeholder="Code" style="width:100px"></td>
    <td><input type="number" placeholder="0.00" min="0" step="0.01" style="width:100px" oninput="calcQuoTotals()"></td>
    <td class="gst-col">
      <select style="padding:7px 6px;border:1.5px solid #ccc;border-radius:6px;font-size:13px;" onchange="calcQuoTotals()">
        <option value="5">5%</option><option value="12">12%</option><option value="18">18%</option><option value="28">28%</option><option value="0">0%</option>
      </select>
    </td>
    <td class="gst-col"><input type="text" readonly placeholder="0.00" style="background:#f9fafb;width:90px;font-family:'JetBrains Mono',monospace;font-size:12px;" id="quo-gstamt-${n}"></td>
    <td><input type="text" readonly placeholder="0.00" style="background:#f9fafb;width:100px;font-family:'JetBrains Mono',monospace;font-size:12px;" id="quo-total-${n}"></td>
    <td><button class="del-row" onclick="delRow('quo-row-${n}','quo')">✕</button></td>
  `;
  tbody.appendChild(tr);
}

function delRow(id, type) {
  const el = document.getElementById(id);
  if (el) el.remove();
  if (type === 'inv') { renumberRows('inv-items-body'); calcInvTotals(); }
  else                { renumberRows('quo-items-body'); calcQuoTotals(); }
}

function renumberRows(tbodyId) {
  const rows = document.querySelectorAll('#' + tbodyId + ' tr');
  rows.forEach((row, idx) => {
    const snoCell = row.querySelector('.sno');
    if (snoCell) snoCell.textContent = idx + 1;
  });
}

function calcInvTotals() {
  const rows = document.querySelectorAll('#inv-items-body tr');
  let sub = 0, totalGst = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const qty    = parseFloat(inputs[2]?.value) || 0;
    const rate   = parseFloat(inputs[4]?.value) || 0;
    const gstPct = parseFloat(row.querySelector('select')?.value || 0);
    const base   = qty * rate;
    const gstAmt = invGstEnabled ? (base * gstPct / 100) : 0;
    const total  = base + gstAmt;
    sub      += base;
    totalGst += gstAmt;
    const n    = row.id ? row.id.split('-')[2] : null;
    const gEl  = n ? document.getElementById('inv-gstamt-' + n) : null;
    const aEl  = n ? document.getElementById('inv-amt-' + n) : null;
    if (gEl) gEl.value = gstAmt > 0 ? gstAmt.toFixed(2) : '';
    if (aEl) aEl.value = total  > 0 ? total.toFixed(2)  : '';
  });
  const cgst  = totalGst / 2, sgst = totalGst / 2, grand = sub + totalGst;
  const subEl = document.getElementById('inv-subtotal');
  const cgstEl = document.getElementById('inv-cgst');
  const sgstEl = document.getElementById('inv-sgst');
  const grandEl = document.getElementById('inv-grand');
  if (subEl) subEl.textContent = '₹' + sub.toFixed(2);
  if (cgstEl) cgstEl.textContent = '₹' + cgst.toFixed(2);
  if (sgstEl) sgstEl.textContent = '₹' + sgst.toFixed(2);
  if (grandEl) grandEl.textContent = '₹' + grand.toFixed(2);
}

function calcQuoTotals() {
  const rows = document.querySelectorAll('#quo-items-body tr');
  let subTotal = 0, totalGst = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const price  = parseFloat(inputs[2]?.value) || 0;
    const gstPct = parseFloat(row.querySelector('select')?.value || 0);
    const gstAmt = quoGstEnabled ? (price * gstPct / 100) : 0;
    const total  = price + gstAmt;
    subTotal += price;
    totalGst += gstAmt;
    const n    = row.id ? row.id.split('-')[2] : null;
    const gEl  = n ? document.getElementById('quo-gstamt-' + n) : null;
    const tEl  = n ? document.getElementById('quo-total-'  + n) : null;
    if (gEl) gEl.value = gstAmt > 0 ? gstAmt.toFixed(2) : '';
    if (tEl) tEl.value = total  > 0 ? total.toFixed(2)  : '';
  });
  const grand = subTotal + totalGst;
  const subEl = document.getElementById('quo-subtotal');
  const gstEl = document.getElementById('quo-gst');
  const grandEl = document.getElementById('quo-grand');
  if (subEl) subEl.textContent = '₹' + subTotal.toFixed(2);
  if (gstEl) gstEl.textContent = '₹' + totalGst.toFixed(2);
  if (grandEl) grandEl.textContent = '₹' + grand.toFixed(2);
}

// ══════════════════════════════════════════════
//  PREVIEW & PRINT (UPDATED FOR LOGOS)
// ══════════════════════════════════════════════

function previewInvoice() {
  const data = getInvoiceData();
  const html = `
    <div style="font-family:'Inter',sans-serif;color:#1e293b;padding:5mm;">
      <div class="doc-logo-container">
        ${companyLogo ? `<img src="${companyLogo}" class="doc-company-logo">` : `<div style="font-size:24px;font-weight:900;color:var(--primary)">SST Super Sun Traders</div>`}
        <div style="text-align:right">
          <h1 style="margin:0;font-size:24px;color:#6366f1;">TAX INVOICE</h1>
          <p style="margin:5px 0 0;font-size:12px;color:#64748b;">${esc(data.invNo)} | ${formatDateDMY(data.invDate)}</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:30px;font-size:12px;">
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:15px;">
          <h3 style="margin:0 0 10px;font-size:10px;text-transform:uppercase;color:#94a3b8;">Seller</h3>
          <p><strong>SST Super Sun Traders</strong><br>#29/23, 8th Street, Kodambakkam, Chennai<br>GST: 33BKGPV4919L1ZM</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:10px;padding:15px;">
          <h3 style="margin:0 0 10px;font-size:10px;text-transform:uppercase;color:#94a3b8;">Buyer</h3>
          <p><strong>${esc(data.buyerName)}</strong><br>${esc(data.buyerAddr).replace(/\n/g,'<br>')}<br>GST: ${esc(data.buyerGst)}</p>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px;">
        <thead>
          <tr style="background:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;">
            <th style="padding:10px;text-align:center;">#</th>
            <th style="padding:10px;text-align:left;">Description</th>
            <th style="padding:10px;">HSN</th>
            <th style="padding:10px;">Qty</th>
            <th style="padding:10px;">Rate</th>
            <th style="padding:10px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((it, i) => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:10px;text-align:center;">${i+1}</td>
              <td style="padding:10px;"><strong>${esc(it.desc)}</strong></td>
              <td style="padding:10px;text-align:center;">${esc(it.hsn)}</td>
              <td style="padding:10px;text-align:center;">${it.qty} ${esc(it.unit)}</td>
              <td style="padding:10px;text-align:center;">₹${it.rate.toFixed(2)}</td>
              <td style="padding:10px;text-align:right;">₹${(it.qty*it.rate).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:20px;">
        <div style="font-size:11px;color:#64748b;padding-top:10px;">
          <p>Amount in words: <br><strong style="color:#1e293b">${amtWords(data.grand)}</strong></p>
        </div>
        <div style="font-size:13px;border:1px solid #e2e8f0;border-radius:10px;padding:15px;background:#f8fafc;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>Subtotal</span><span>₹${data.sub.toFixed(2)}</span></div>
          ${invGstEnabled ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>CGST</span><span>₹${data.cgst.toFixed(2)}</span></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;"><span>SGST</span><span>₹${data.sgst.toFixed(2)}</span></div>
          ` : ''}
          <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #e2e8f0;font-weight:900;font-size:16px;color:#6366f1;">
            <span>Grand Total</span><span>₹${data.grand.toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      <div style="margin-top:60px;display:flex;justify-content:space-between;font-size:11px;">
        <div>
          <p style="margin-bottom:40px;">Received with thanks,</p>
          <p>Customer Signature</p>
        </div>
        <div style="text-align:right;">
          <p style="margin-bottom:40px;">For <strong>SST Super Sun Traders</strong></p>
          <p>Authorized Signatory</p>
        </div>
      </div>
    </div>
  `;
  document.getElementById('invoice-doc').innerHTML = html;
  document.getElementById('invoice-form-section').style.display = 'none';
  document.getElementById('invoice-print-area').style.display   = 'block';
  window.scrollTo({top: 0, behavior: 'auto'});
}

function previewQuotation() {
  const data = getQuotationData();
  const html = `
    <div style="font-family:'Inter',sans-serif;color:#1e293b;padding:5mm;">
      <div class="doc-logo-container">
        ${companyLogo ? `<img src="${companyLogo}" class="doc-company-logo">` : `<div style="font-size:24px;font-weight:900;color:var(--primary)">SST Super Sun Traders</div>`}
        ${currentClientLogo ? `<img src="${currentClientLogo}" class="doc-client-logo">` : `<div></div>`}
      </div>

      <div style="text-align:center;margin-bottom:40px;">
        <h1 style="margin:0;font-size:28px;letter-spacing:1px;color:#6366f1;">QUOTATION</h1>
        <div style="width:60px;height:3px;background:#6366f1;margin:10px auto;"></div>
        <p style="margin:0;font-size:13px;color:#64748b;">${esc(data.quoNo)} | ${formatDateDMY(data.quoDate)}</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-bottom:30px;font-size:13px;">
        <div>
          <h3 style="margin:0 0 12px;font-size:11px;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;">Client Info</h3>
          <p><strong>${esc(data.clientName)}</strong><br>${esc(data.clientAddr).replace(/\n/g,'<br>')}<br>Ph: ${esc(data.phone)}</p>
        </div>
        <div style="text-align:right;">
          <h3 style="margin:0 0 12px;font-size:11px;text-transform:uppercase;color:#94a3b8;letter-spacing:1px;">Validity</h3>
          <p>This quotation is valid until:<br><strong>${data.validUntil ? formatDateDMY(data.validUntil) : 'NA'}</strong></p>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:30px;">
        <thead>
          <tr style="background:#6366f1;color:white;">
            <th style="padding:12px;text-align:center;border-radius:6px 0 0 6px;">#</th>
            <th style="padding:12px;text-align:left;">Product / Description</th>
            <th style="padding:12px;text-align:center;">Code</th>
            <th style="padding:12px;text-align:right;border-radius:0 6px 6px 0;">Price (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((it, i) => `
            <tr style="border-bottom:1px solid #f1f5f9;">
              <td style="padding:12px;text-align:center;color:#64748b;">${i+1}</td>
              <td style="padding:12px;"><strong>${esc(it.name)}</strong></td>
              <td style="padding:12px;text-align:center;color:#64748b;">${esc(it.code)}</td>
              <td style="padding:12px;text-align:right;font-weight:600;">₹${it.price.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="width:300px;margin-left:auto;border-top:2px solid #6366f1;padding-top:15px;">
        ${quoGstEnabled ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px;color:#64748b;">
          <span>Sub Total</span><span>₹${data.sub.toFixed(2)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:14px;color:#64748b;">
          <span>GST Amount</span><span>₹${data.gst.toFixed(2)}</span>
        </div>
        ` : ''}
        <div style="display:flex;justify-content:space-between;font-size:18px;font-weight:900;color:#1e293b;">
          <span>Total Value</span><span>₹${data.grand.toFixed(2)}</span>
        </div>
      </div>

      <div style="margin-top:80px;font-size:12px;border-top:1px solid #f1f5f9;padding-top:20px;">
        <h4 style="margin:0 0 10px;color:#6366f1;">Terms & Conditions:</h4>
        <ul style="padding-left:18px;color:#64748b;margin:0;">
          <li>Payment should be made in favor of SST Super Sun Traders.</li>
          <li>Delivery within 7-10 working days of official order.</li>
          <li>Valid for the period specified above.</li>
        </ul>
      </div>

      <div style="margin-top:60px;text-align:right;">
        <p style="margin-bottom:50px;">For <strong>SST Super Sun Traders</strong></p>
        <p style="font-weight:700;">Authorized Signature</p>
      </div>
    </div>
  `;
  document.getElementById('quotation-doc').innerHTML = html;
  document.getElementById('quotation-form-section').style.display = 'none';
  document.getElementById('quotation-print-area').style.display   = 'block';
  window.scrollTo({top: 0, behavior: 'auto'});
}

function getInvoiceData() {
  const items = [];
  document.querySelectorAll('#inv-items-body tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const desc = inputs[0]?.value;
    if (!desc) return;
    items.push({
      desc:  desc,
      hsn:   inputs[1]?.value || '',
      qty:   parseFloat(inputs[2]?.value) || 0,
      unit:  inputs[3]?.value || 'pcs',
      rate:  parseFloat(inputs[4]?.value) || 0
    });
  });
  const sub   = parseFloat(document.getElementById('inv-subtotal').textContent.replace('₹','')) || 0;
  const grand = parseFloat(document.getElementById('inv-grand').textContent.replace('₹',''))    || 0;
  const cgst  = parseFloat(document.getElementById('inv-cgst').textContent.replace('₹',''))     || 0;
  const sgst  = parseFloat(document.getElementById('inv-sgst').textContent.replace('₹',''))     || 0;

  return {
    invNo:     document.getElementById('inv-no').value,
    invDate:   document.getElementById('inv-date').value,
    buyerName: document.getElementById('inv-buyer-name').value || 'Cash / Counter',
    buyerAddr: document.getElementById('inv-buyer-addr').value || '',
    buyerGst:  document.getElementById('inv-buyer-gst').value || '-',
    items, sub, cgst, sgst, grand
  };
}

function getQuotationData() {
  const items = [];
  document.querySelectorAll('#quo-items-body tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const name = inputs[0]?.value;
    if (!name) return;
    items.push({
      name:  name,
      code:  inputs[1]?.value || '-',
      price: parseFloat(inputs[2]?.value) || 0
    });
  });
  const sub   = parseFloat(document.getElementById('quo-subtotal').textContent.replace('₹','')) || 0;
  const gst   = parseFloat(document.getElementById('quo-gst').textContent.replace('₹',''))      || 0;
  const grand = parseFloat(document.getElementById('quo-grand').textContent.replace('₹',''))    || 0;

  return {
    quoNo:      document.getElementById('quo-no').value || 'Draft',
    quoDate:    document.getElementById('quo-date').value,
    validUntil: document.getElementById('quo-valid').value,
    clientName: document.getElementById('quo-client-name').value || 'Valued Client',
    clientAddr: document.getElementById('quo-client-addr').value || '-',
    phone:      document.getElementById('quo-client-phone').value || '-',
    items, sub, gst, grand
  };
}


// ── UTILS ──────────────────────────────────────
function formatDateDMY(s) { 
  if(!s) return ''; 
  const d = new Date(s); 
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB'); 
}

function showToast(m, t='') {
  const el = document.getElementById('toast');
  if(!el) return;
  const icons = { error: '❌', info: 'ℹ️', success: '✅' };
  const icon = icons[t] || '✅';
  el.textContent = icon + ' ' + m;
  el.className = 'toast show' + (t === 'error' ? ' error' : '') + (t === 'info' ? ' info' : '');
  setTimeout(()=>el.classList.remove('show'), 3000);
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function amtWords(val) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  function hundreds(num) {
    if (num < 20)  return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + hundreds(num % 100) : '');
  }
  const parts = val.toFixed(2).split('.');
  let n = parseInt(parts[0], 10);
  if (n === 0) return 'Rupees Zero Only';
  let res = '';
  if (n >= 10000000) { res += hundreds(Math.floor(n / 10000000)) + ' Crore '; n %= 10000000; }
  if (n >= 100000)   { res += hundreds(Math.floor(n / 100000))   + ' Lakh ';  n %= 100000; }
  if (n >= 1000)     { res += hundreds(Math.floor(n / 1000))     + ' Thousand '; n %= 1000; }
  res += hundreds(n);
  const paise = parseInt(parts[1], 10);
  return 'Rupees ' + res.trim() + (paise > 0 ? ' and Paise ' + hundreds(paise) : '') + ' Only';
}

function downloadPDF(type) {
  const pages = { invoice: 'invoice-doc', quotation: 'quotation-doc', financials: 'financial-report-doc' };
  const el = document.getElementById(pages[type]);
  if (!el) { showToast('Nothing to download!', 'error'); return; }
  const opt = { margin: 5, filename: `SST_${type}_${Date.now()}.pdf`, precision: 2, image: { type:'jpeg', quality:0.98 }, html2canvas: { scale:2, useCORS: true }, jsPDF: { unit:'mm', format:'a4', orientation:'portrait' }, pagebreak: { mode: 'css' } };
  showToast('Generating PDF...');
  html2pdf().set(opt).from(el).save();
}

// ══════════════════════════════════════════════
//  SIMPLY TALLY – FINANCIALS MODULE
// ══════════════════════════════════════════════

function initFinancials() {
  const fDate = document.getElementById('fin-date');
  if (fDate) fDate.value = new Date().toISOString().split('T')[0];
  const rDate = document.getElementById('report-date');
  if (rDate) rDate.value = new Date().toISOString().substring(0, 7); 
  
  // Fill Voucher Types
  const typeSel = document.getElementById('fin-type');
  if (typeSel) {
    typeSel.innerHTML = Object.entries(ACCOUNT_TYPES).map(([k, v]) => `<option value="${v}">${v}</option>`).join('');
    updateFinLedgers();
  }
  
  refreshFinUI();
}

function switchFinTab(tabId) {
  document.querySelectorAll('.fin-tab-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.f-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  const activeBtn = Array.from(document.querySelectorAll('.f-tab')).find(b => b.getAttribute('onclick').includes(tabId));
  if (activeBtn) activeBtn.classList.add('active');

  if (tabId === 'f-dashboard') renderCharts();
}

function updateFinLedgers() {
  const type = document.getElementById('fin-type').value;
  const ledgerSel = document.getElementById('fin-ledger');
  if (!ledgerSel) return;
  ledgerSel.innerHTML = (LEDGER_CATEGORIES[type] || []).map(c => `<option value="${c}">${c}</option>`).join('');
}

function toggleGstInput() {
  const ledger = document.getElementById('fin-ledger').value;
  const gstSec = document.getElementById('fin-gst-section');
  if (gstSec) gstSec.style.display = ledger.toLowerCase().includes('(gst)') ? 'block' : 'none';
}

function addFinVoucher() {
  const date = document.getElementById('fin-date').value;
  const type = document.getElementById('fin-type').value; // Receipt, Payment, vs
  const ledger = document.getElementById('fin-ledger').value;
  const totalAmt = parseFloat(document.getElementById('fin-amt').value) || 0;
  const nar = document.getElementById('fin-desc').value;
  const gstPct = parseFloat(document.getElementById('fin-gst-pct')?.value) || 0;

  if (totalAmt <= 0 || !date) { showToast('Amount and Date are required.', 'error'); return; }

  // Compliance Logic: Automated GST split
  let baseAmt = totalAmt;
  let taxAmt = 0;
  if (ledger.toLowerCase().includes('(gst)')) {
    baseAmt = totalAmt / (1 + (gstPct/100));
    taxAmt  = totalAmt - baseAmt;
  }

  const voucher = {
    id: Date.now(),
    date,
    type,
    ledger,
    total: totalAmt,
    base: baseAmt,
    tax: taxAmt,
    taxPct: gstPct,
    narration: nar,
    entryType: (type.includes('Receipt') || type.includes('Sales')) ? 'Cr' : 'Dr'
  };

  transactions.push(voucher);
  localStorage.setItem('sst_transactions', JSON.stringify(transactions));
  
  // Clear form
  document.getElementById('fin-amt').value = '';
  document.getElementById('fin-desc').value = '';
  refreshFinUI();
  showToast('Voucher entry successful!');
}

function deleteFinVoucher(id) {
  if (!confirm('Delete this voucher?')) return;
  transactions = transactions.filter(t => t.id !== id);
  localStorage.setItem('sst_transactions', JSON.stringify(transactions));
  refreshFinUI();
}

function refreshFinUI() {
  const tbody = document.getElementById('fin-body');
  if (!tbody) return;

  const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
  tbody.innerHTML = sorted.map(t => `
    <tr>
      <td>${formatDateDMY(t.date)}</td>
      <td class="left"><strong>${t.ledger}</strong><br><small style="color:#64748b">${t.narration}</small></td>
      <td><span class="badge ${t.entryType==='Cr'?'success':'danger'}">${t.type.split(' ')[0]}</span></td>
      <td style="font-weight:700; color:${t.entryType==='Dr'?'#dc2626':'#059669'}">${t.entryType}</td>
      <td class="num bold">₹${t.total.toFixed(2)}</td>
      <td><button class="del-row" onclick="deleteFinVoucher(${t.id})">✕</button></td>
    </tr>
  `).join('');

  // Update Summary
  let totalRec = 0, totalPay = 0;
  transactions.forEach(t => {
    if (t.entryType === 'Cr') totalRec += t.total;
    else totalPay += t.total;
  });

  const incEl = document.getElementById('fin-total-income');
  const expEl = document.getElementById('fin-total-expense');
  const balEl = document.getElementById('fin-net-balance');
  
  if (incEl) incEl.textContent = '₹' + totalRec.toLocaleString('en-IN', {minimumFractionDigits:2});
  if (expEl) expEl.textContent = '₹' + totalPay.toLocaleString('en-IN', {minimumFractionDigits:2});
  if (balEl) balEl.textContent = '₹' + (totalRec - totalPay).toLocaleString('en-IN', {minimumFractionDigits:2});
  
  if (document.getElementById('f-dashboard')?.classList.contains('active')) renderCharts();
}

function renderCharts() {
  const trendEl = document.getElementById('chartTrend');
  const catEl   = document.getElementById('chartCategory');
  if (!trendEl || !catEl || typeof Chart === 'undefined') return;
  
  try {
    const ctxTrend = trendEl.getContext('2d');
    const ctxCat   = catEl.getContext('2d');

    const months = [];
    const crData = []; // Credit (Income)
    const drData = []; // Debit (Expense)
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      let d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleString('default', { month: 'short' }));
      let mCr = 0, mDr = 0;
      transactions.forEach(t => {
        let td = new Date(t.date);
        if (td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()) {
          if (t.entryType === 'Cr') mCr += t.total; else mDr += t.total;
        }
      });
      crData.push(mCr);
      drData.push(mDr);
    }

    // Theme-aware chart colors
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const tickColor  = isLight ? '#4b5683' : '#94a3b8';
    const gridColor  = isLight ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.05)';
    const barInflow  = isLight ? 'rgba(99,102,241,0.70)'  : 'rgba(129,140,248,0.75)';
    const barOutflow = isLight ? 'rgba(244, 63, 94, 0.70)' : 'rgba(251,113,133,0.75)';
    // keep alias for legend labels
    const darkTickColor = tickColor;
    const darkGridColor = gridColor;

    if (chartTrend) chartTrend.destroy();
    chartTrend = new Chart(ctxTrend, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [
          { label: 'Inflow (Cr)', data: crData, backgroundColor: barInflow, borderRadius: 6 },
          { label: 'Outflow (Dr)', data: drData, backgroundColor: barOutflow, borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'bottom', labels: { color: darkTickColor, boxWidth: 12, font: { size: 11 } } }
        },
        scales: {
          x: { ticks: { color: darkTickColor }, grid: { color: darkGridColor } },
          y: { ticks: { color: darkTickColor }, grid: { color: darkGridColor } }
        }
      }
    });

    const catMap = {};
    transactions.forEach(t => {
      if (t.entryType === 'Dr') catMap[t.ledger] = (catMap[t.ledger] || 0) + t.total;
    });

    const catColors = ['#818cf8','#34d399','#fbbf24','#fb7185','#a78bfa','#38bdf8','#f97316','#6366f1'];
    if (chartCategory) chartCategory.destroy();
    chartCategory = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: Object.keys(catMap),
        datasets: [{ data: Object.values(catMap), backgroundColor: catColors, borderWidth: 0, hoverOffset: 6 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: darkTickColor, boxWidth: 10, font: { size: 10 }, padding: 12 } } },
        cutout: '65%'
      }
    });
  } catch (e) {
    console.warn("Chart rendering failed:", e);
  }
}

// ── COMPLIANCE REPORTING ──────────────────────────
function generateComplianceReport() {
  const type = document.getElementById('report-type').value;
  const dateStr = document.getElementById('report-date').value;
  if (!dateStr) { showToast('Select month/year.', 'error'); return; }

  const selYear = parseInt(dateStr.split('-')[0]), selMonth = parseInt(dateStr.split('-')[1]) - 1;
  const filtered = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === selYear && d.getMonth() === selMonth;
  });

  if (filtered.length === 0) { showToast('No data for this period.', 'error'); return; }

  let html = '';
  if (type === 'gst') html = buildGstCompliance(filtered, dateStr);
  else if (type === 'pl') html = buildProfitLoss(filtered, dateStr);
  else html = buildGeneralReport(filtered, dateStr);

  document.getElementById('financial-report-doc').innerHTML = html;
  document.getElementById('financial-print-area').style.display = 'block';
  showToast('Compliance report generated!');
}

function buildGstCompliance(data, period) {
  let outputTax = 0, inputTax = 0, taxableSales = 0, taxablePurchases = 0;
  data.forEach(t => {
    if (t.ledger.toLowerCase().includes('sales')) { taxableSales += t.base; outputTax += t.tax; }
    if (t.ledger.toLowerCase().includes('purchase')) { taxablePurchases += t.base; inputTax += t.tax; }
  });

  return `
    <div class="rep-doc">
      <div class="rep-header"><div class="rep-title">GSTR-1 COMPLIANCE SUMMARY</div><div class="rep-meta">Period: ${period}</div></div>
      <div class="rep-summary-grid">
        <div class="rep-sum-card thin"><div class="rep-sum-label">Taxable Sales</div><div class="rep-sum-val">₹${taxableSales.toFixed(2)}</div></div>
        <div class="rep-sum-card thin"><div class="rep-sum-label">Output GST (Liability)</div><div class="rep-sum-val danger">₹${outputTax.toFixed(2)}</div></div>
        <div class="rep-sum-card thin"><div class="rep-sum-label">Input Tax Credit</div><div class="rep-sum-val success">₹${inputTax.toFixed(2)}</div></div>
      </div>
      <table class="rep-table">
        <thead><tr><th>Date</th><th>Particulars</th><th>HSN/Category</th><th>Taxable Val</th><th>GST Amt</th><th class="num">Total</th></tr></thead>
        <tbody>
          ${data.filter(t => t.tax > 0).map(t => `<tr><td>${formatDateDMY(t.date)}</td><td>${t.narration}</td><td>${t.ledger}</td><td>₹${t.base.toFixed(2)}</td><td>₹${t.tax.toFixed(2)}</td><td class="num">₹${t.total.toFixed(2)}</td></tr>`).join('')}
        </tbody>
      </table>
      <div style="margin-top:20px; text-align:right; border-top:2px solid #eee; padding-top:10px;">
        <strong>Net GST Payable: ₹${Math.max(0, outputTax - inputTax).toFixed(2)}</strong>
      </div>
    </div>`;
}

function buildProfitLoss(data, period) {
  let income = 0, directExp = 0, indirectExp = 0;
  data.forEach(t => {
    if (t.entryType === 'Cr') income += t.base;
    else {
      if (t.ledger.includes('Material')) directExp += t.base;
      else indirectExp += t.base;
    }
  });

  const grossProfit = income - directExp;
  const netProfit   = grossProfit - indirectExp;

  return `
    <div class="rep-doc">
      <div class="rep-header"><div class="rep-title">PROFIT & LOSS ACCOUNT (UNAUDITED)</div><div class="rep-meta">Period: ${period}</div></div>
      <table class="rep-table ledger-table">
        <thead><tr><th>Particulars</th><th class="num">Debit (Dr)</th><th class="num">Credit (Cr)</th></tr></thead>
        <tbody>
          <tr><td>Sales Revenue (Net of Tax)</td><td></td><td class="num">₹${income.toFixed(2)}</td></tr>
          <tr><td>Cost of Goods Sold (Direct)</td><td class="num">₹${directExp.toFixed(2)}</td><td></td></tr>
          <tr class="subtotal-row"><td><strong>GROSS PROFIT</strong></td><td></td><td class="num"><strong>₹${grossProfit.toFixed(2)}</strong></td></tr>
          <tr><td>Indirect Expenses (Logistics, Rent, etc)</td><td class="num">₹${indirectExp.toFixed(2)}</td><td></td></tr>
          <tr class="grand-total-row"><td><strong>NET PROFIT / LOSS</strong></td><td></td><td class="num" style="color:${netProfit>=0?'#059669':'#dc2626'}"><strong>₹${netProfit.toFixed(2)}</strong></td></tr>
        </tbody>
      </table>
    </div>`;
}

function buildGeneralReport(filtered, period) {
  let inc = 0, exp = 0; filtered.forEach(t => { if(t.entryType==='Cr') inc += t.total; else exp += t.total; });
  return `
    <div class="rep-doc">
      <div class="rep-header"><div class="rep-title">FINANCIAL SUMMARY</div><div class="rep-meta">Period: ${period}</div></div>
      <div class="rep-summary-grid">
        <div class="rep-sum-card"><div class="rep-sum-label">Total Inflow (Cr)</div><div class="rep-sum-val success">₹${inc.toFixed(2)}</div></div>
        <div class="rep-sum-card"><div class="rep-sum-label">Total Outflow (Dr)</div><div class="rep-sum-val danger">₹${exp.toFixed(2)}</div></div>
        <div class="rep-sum-card"><div class="rep-sum-label">Net Surplus</div><div class="rep-sum-val primary">₹${(inc-exp).toFixed(2)}</div></div>
      </div>
      <table class="rep-table">
        <thead><tr><th>Date</th><th>Ledger</th><th>Type</th><th class="num">Amount (₹)</th></tr></thead>
        <tbody>${filtered.map(t => `<tr><td>${formatDateDMY(t.date)}</td><td>${t.ledger}</td><td>${t.entryType}</td><td class="num">₹${t.total.toFixed(2)}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}
