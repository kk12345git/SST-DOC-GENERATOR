// ══════════════════════════════════════════════
//  SST SUPER SUN TRADERS – Pricing App Logic
//  app.js (Refactored: Simply Tally Edition)
// ══════════════════════════════════════════════

// ── STATE & CONSTANTS ──────────────────────────
let currentPage   = 'home';
let invRowCount   = 0;
let quoRowCount   = 0;
let invGstEnabled  = true;
let quoGstEnabled  = true;

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
  // Initialization - Ensure elements exist
  try {
    const today = new Date().toISOString().split('T')[0];
    const invDate = document.getElementById('inv-date');
    const quoDate = document.getElementById('quo-date');
    if (invDate) invDate.value = today;
    if (quoDate) quoDate.value = today;

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('menu-toggle');
    const sidebar   = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => { sidebar.classList.toggle('open'); });
      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && e.target !== toggleBtn) sidebar.classList.remove('open');
      });
    }

    // Keyboard navigation
    document.querySelectorAll('.dash-card').forEach(card => {
      card.setAttribute('tabindex', '0');
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); card.click(); }
      });
    });

    // Initialize Financials module safely
    if (typeof initFinancials === 'function') initFinancials();
  } catch (err) {
    console.error("Initialization Error:", err);
  }
});

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

  currentPage = page;
  const titles = { home:'Dashboard', invoice:'Tax Invoice', quotation:'Quotation', financials:'Financials' };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  if (page === 'invoice'   && invRowCount === 0) { addInvRow(); addInvRow(); addInvRow(); }
  if (page === 'quotation' && quoRowCount === 0) { addQuoRow(); addQuoRow(); addQuoRow(); }
  if (page === 'financials') { refreshFinUI(); }

  document.querySelector('.sidebar')?.classList.remove('open');
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
    <td class="gst-col"><input type="text" placeholder="0.00" readonly style="background:#f9fafb;width:80px;font-family:'DM Mono',monospace;font-size:12px;" id="inv-gstamt-${n}"></td>
    <td><input type="text" placeholder="0.00" readonly style="background:#f9fafb;width:90px;font-family:'DM Mono',monospace;font-size:12px;" id="inv-amt-${n}"></td>
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
    <td class="gst-col"><input type="text" readonly placeholder="0.00" style="background:#f9fafb;width:90px;font-family:'DM Mono',monospace;font-size:12px;" id="quo-gstamt-${n}"></td>
    <td><input type="text" readonly placeholder="0.00" style="background:#f9fafb;width:100px;font-family:'DM Mono',monospace;font-size:12px;" id="quo-total-${n}"></td>
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

// ── UTILS ──────────────────────────────────────
function formatDateDMY(s) { 
  if(!s) return ''; 
  const d = new Date(s); 
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB'); 
}

function showToast(m, t='') {
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = (t==='error'?'❌ ':'✅ ') + m;
  el.className = 'toast show ' + t;
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

    if (chartTrend) chartTrend.destroy();
    chartTrend = new Chart(ctxTrend, {
      type: 'bar',
      data: { labels: months, datasets: [ { label: 'Inflow (Cr)', data: crData, backgroundColor: '#10b981' }, { label: 'Outflow (Dr)', data: drData, backgroundColor: '#ef4444' } ] },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    const catMap = {};
    transactions.forEach(t => {
      if (t.entryType === 'Dr') catMap[t.ledger] = (catMap[t.ledger] || 0) + t.total;
    });

    if (chartCategory) chartCategory.destroy();
    chartCategory = new Chart(ctxCat, {
      type: 'doughnut',
      data: { labels: Object.keys(catMap), datasets: [{ data: Object.values(catMap), backgroundColor: ['#3b82f6','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#10b981','#6366f1'] }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
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
