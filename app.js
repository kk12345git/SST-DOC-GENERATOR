// ══════════════════════════════════════════════
//  SST SUPER SUN TRADERS – Pricing App Logic
//  app.js
// ══════════════════════════════════════════════

// ── STATE ──────────────────────────────────────
let currentPage  = 'home';
let invRowCount  = 0;
let quoRowCount  = 0;
let invGstEnabled = true;   // GST toggle for Invoice
let quoGstEnabled = true;   // GST toggle for Quotation


// ── INITIALISE ON LOAD ──────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('inv-date').value = today;
  document.getElementById('quo-date').value = today;

  // IMPROVEMENT: mobile sidebar toggle
  const toggleBtn = document.getElementById('menu-toggle');
  const sidebar   = document.querySelector('.sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && e.target !== toggleBtn) {
        sidebar.classList.remove('open');
      }
    });
  }

  // IMPROVEMENT: keyboard navigation – allow dash-cards to be activated with Enter/Space
  document.querySelectorAll('.dash-card').forEach(card => {
    card.setAttribute('tabindex', '0');
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
});

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════
function showPage(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Deactivate all nav buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  // Show selected page
  const pageEl = document.getElementById('page-' + page);
  if (!pageEl) {
    console.error('[SST] Page not found: page-' + page);
    return;
  }
  pageEl.classList.add('active');

  // Activate matching nav button using data-page attribute (more reliable than textContent)
  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.dataset.page === page) b.classList.add('active');
  });

  currentPage = page;
  const titles = { home: 'Dashboard', invoice: 'Tax Invoice', quotation: 'Quotation' };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  // Seed initial rows
  if (page === 'invoice'   && invRowCount === 0) { addInvRow(); addInvRow(); addInvRow(); }
  if (page === 'quotation' && quoRowCount === 0) { addQuoRow(); addQuoRow(); addQuoRow(); }

  // Close mobile sidebar after navigation
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
    setInvGst(true); // reset GST toggle to ON
    calcInvTotals();
    backToForm('invoice');
  } else if (currentPage === 'quotation') {
    document.querySelectorAll('#page-quotation input, #page-quotation textarea').forEach(el => el.value = '');
    document.getElementById('quo-items-body').innerHTML = '';
    quoRowCount = 0;
    addQuoRow(); addQuoRow(); addQuoRow();
    setQuoGst(true); // reset GST toggle to ON
    calcQuoTotals();
    backToForm('quotation');
  }
  const today = new Date().toISOString().split('T')[0];
  if (currentPage === 'invoice')   document.getElementById('inv-date').value = today;
  if (currentPage === 'quotation') document.getElementById('quo-date').value = today;
  showToast('Form has been reset.');
}

// ══════════════════════════════════════════════
//  GST TOGGLE
// ══════════════════════════════════════════════

/** Toggle With / Without GST for the Invoice form and totals. */
function setInvGst(enabled) {
  invGstEnabled = enabled;
  // Toggle active class on the two buttons
  document.getElementById('inv-gst-on') ?.classList.toggle('active', enabled);
  document.getElementById('inv-gst-off')?.classList.toggle('active', !enabled);
  // Hide/show GST columns in the live form table
  const table = document.getElementById('inv-items-table');
  if (table) table.classList.toggle('no-gst', !enabled);
  // Hide/show CGST & SGST rows in the totals box
  const cgstRow = document.getElementById('inv-cgst-row');
  const sgstRow = document.getElementById('inv-sgst-row');
  if (cgstRow) cgstRow.style.display = enabled ? '' : 'none';
  if (sgstRow) sgstRow.style.display = enabled ? '' : 'none';
  // Update Grand Total label
  const grandLabel = document.getElementById('inv-grand-label');
  if (grandLabel) grandLabel.textContent = enabled ? 'Grand Total' : 'Total Amount';
  calcInvTotals();
}

/** Toggle With / Without GST for the Quotation form and totals. */
function setQuoGst(enabled) {
  quoGstEnabled = enabled;
  document.getElementById('quo-gst-on') ?.classList.toggle('active', enabled);
  document.getElementById('quo-gst-off')?.classList.toggle('active', !enabled);
  const table = document.getElementById('quo-items-table');
  if (table) table.classList.toggle('no-gst', !enabled);
  const gstRow = document.getElementById('quo-gst-row');
  if (gstRow) gstRow.style.display = enabled ? '' : 'none';
  // Update Grand Total label
  const grandLabel = document.getElementById('quo-grand-label');
  if (grandLabel) grandLabel.textContent = enabled ? 'Grand Total (incl. GST)' : 'Total Amount';
  calcQuoTotals();
}


// ══════════════════════════════════════════════
//  INVOICE ROWS
// ══════════════════════════════════════════════

/**
 * Adds a new row to the Invoice items table.
 * Row inputs order: [0]desc, [1]hsn, [2]qty, [3]unit, [4]rate
 * (select is queried separately)
 */
function addInvRow() {
  invRowCount++;
  const n     = invRowCount;
  const tbody = document.getElementById('inv-items-body');
  if (!tbody) return;

  const tr  = document.createElement('tr');
  tr.id     = 'inv-row-' + n;
  tr.innerHTML = `
    <td class="sno">${n}</td>
    <td><input class="left" type="text" placeholder="Item description" oninput="calcInvTotals()" aria-label="Item description"></td>
    <td><input type="text" placeholder="HSN" style="width:90px" aria-label="HSN Code"></td>
    <td><input type="number" placeholder="0" min="0" step="1" style="width:70px" oninput="calcInvTotals()" aria-label="Quantity"></td>
    <td><input type="text" placeholder="pcs" style="width:55px" aria-label="Unit"></td>
    <td><input type="number" placeholder="0.00" min="0" step="0.01" style="width:90px" oninput="calcInvTotals()" aria-label="Rate"></td>
    <td class="gst-col">
      <select style="padding:7px 6px;border:1.5px solid #ccc;border-radius:6px;font-size:13px;" onchange="calcInvTotals()" aria-label="GST Percentage">
        <option value="5">5%</option>
        <option value="12">12%</option>
        <option value="18">18%</option>
        <option value="28">28%</option>
        <option value="0">0%</option>
      </select>
    </td>
    <td class="gst-col"><input type="text" placeholder="0.00" readonly style="background:#f9fafb;width:80px;font-family:'DM Mono',monospace;font-size:12px;" id="inv-gstamt-${n}" aria-label="GST Amount (computed)"></td>
    <td><input type="text" placeholder="0.00" readonly style="background:#f9fafb;width:90px;font-family:'DM Mono',monospace;font-size:12px;" id="inv-amt-${n}" aria-label="Total Amount (computed)"></td>
    <td><button class="del-row" onclick="delRow('inv-row-${n}','inv')" title="Delete row" aria-label="Delete row ${n}">✕</button></td>
  `;
  tbody.appendChild(tr);
}


/** Remove a row by id and recalculate totals. */
function delRow(id, type) {
  const el = document.getElementById(id);
  if (el) el.remove();
  // Renumber rows for consistency
  if (type === 'inv') { renumberRows('inv-items-body'); calcInvTotals(); }
  else                { renumberRows('quo-items-body'); calcQuoTotals(); }
}

/** Renumber the serial numbers in the first column after deletion. */
function renumberRows(tbodyId) {
  const rows = document.querySelectorAll('#' + tbodyId + ' tr');
  rows.forEach((row, idx) => {
    const snoCell = row.querySelector('.sno');
    if (snoCell) snoCell.textContent = idx + 1;
  });
}

/** Calculate and display Invoice totals. */
function calcInvTotals() {
  const rows    = document.querySelectorAll('#inv-items-body tr');
  let sub = 0, totalGst = 0;

  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    // inputs: [0]=desc, [1]=hsn, [2]=qty, [3]=unit, [4]=rate
    const qty    = parseFloat(inputs[2]?.value) || 0;
    const rate   = parseFloat(inputs[4]?.value) || 0;
    const sel    = row.querySelector('select');
    const gstPct = sel ? parseFloat(sel.value) : 5;
    const base   = qty * rate;
    // Respect GST toggle — zero out tax when disabled
    const gstAmt = invGstEnabled ? parseFloat((base * gstPct / 100).toFixed(2)) : 0;
    const total  = parseFloat((base + gstAmt).toFixed(2));

    sub      += base;
    totalGst += gstAmt;

    const n    = row.id ? row.id.split('-')[2] : null;
    const gEl  = n ? document.getElementById('inv-gstamt-' + n) : null;
    const aEl  = n ? document.getElementById('inv-amt-'    + n) : null;
    if (gEl) gEl.value = gstAmt > 0 ? gstAmt.toFixed(2) : '';
    if (aEl) aEl.value = total  > 0 ? total.toFixed(2)  : '';
  });

  const cgst  = totalGst / 2;
  const sgst  = totalGst / 2;
  const grand = sub + totalGst;

  document.getElementById('inv-subtotal').textContent = '₹' + sub.toFixed(2);
  document.getElementById('inv-cgst').textContent     = '₹' + cgst.toFixed(2);
  document.getElementById('inv-sgst').textContent     = '₹' + sgst.toFixed(2);
  document.getElementById('inv-grand').textContent    = '₹' + grand.toFixed(2);
}


// ══════════════════════════════════════════════
//  QUOTATION ROWS
// ══════════════════════════════════════════════

/**
 * Adds a new row to the Quotation items table.
 * Row inputs order: [0]name, [1]code, [2]price
 */
function addQuoRow() {
  quoRowCount++;
  const n     = quoRowCount;
  const tbody = document.getElementById('quo-items-body');
  if (!tbody) return;

  const tr  = document.createElement('tr');
  tr.id     = 'quo-row-' + n;
  tr.innerHTML = `
    <td class="sno">${n}</td>
    <td><input class="left" type="text" placeholder="Item name / description" oninput="calcQuoTotals()" aria-label="Item name"></td>
    <td><input type="text" placeholder="Code" style="width:100px" aria-label="Product Code"></td>
    <td><input type="number" placeholder="0.00" min="0" step="0.01" style="width:100px" oninput="calcQuoTotals()" aria-label="Unit Price"></td>
    <td class="gst-col">
      <select style="padding:7px 6px;border:1.5px solid #ccc;border-radius:6px;font-size:13px;" onchange="calcQuoTotals()" aria-label="GST Percentage">
        <option value="5">5%</option>
        <option value="12">12%</option>
        <option value="18">18%</option>
        <option value="28">28%</option>
        <option value="0">0%</option>
      </select>
    </td>
    <td class="gst-col"><input type="text" readonly placeholder="0.00" style="background:#f9fafb;width:90px;font-family:'DM Mono',monospace;font-size:12px;" id="quo-gstamt-${n}" aria-label="GST Amount (computed)"></td>
    <td><input type="text" readonly placeholder="0.00" style="background:#f9fafb;width:100px;font-family:'DM Mono',monospace;font-size:12px;" id="quo-total-${n}" aria-label="Total incl. GST (computed)"></td>
    <td><button class="del-row" onclick="delRow('quo-row-${n}','quo')" title="Delete row" aria-label="Delete row ${n}">✕</button></td>
  `;
  tbody.appendChild(tr);
}


/** Calculate and display Quotation totals. */
function calcQuoTotals() {
  const rows = document.querySelectorAll('#quo-items-body tr');
  let subTotal = 0, totalGst = 0;

  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    // inputs[0]=name, [1]=code, [2]=price
    const price  = parseFloat(inputs[2]?.value) || 0;
    const sel    = row.querySelector('select');
    const gstPct = sel ? parseFloat(sel.value) : 5;
    // Respect GST toggle
    const gstAmt = quoGstEnabled ? parseFloat((price * gstPct / 100).toFixed(2)) : 0;
    const total  = parseFloat((price + gstAmt).toFixed(2));

    subTotal += price;
    totalGst += gstAmt;

    const n    = row.id ? row.id.split('-')[2] : null;
    const gEl  = n ? document.getElementById('quo-gstamt-' + n) : null;
    const tEl  = n ? document.getElementById('quo-total-'  + n) : null;
    if (gEl) gEl.value = gstAmt > 0 ? gstAmt.toFixed(2) : '';
    if (tEl) tEl.value = total  > 0 ? total.toFixed(2)  : '';
  });

  const grand = subTotal + totalGst;
  document.getElementById('quo-subtotal').textContent = '₹' + subTotal.toFixed(2);
  document.getElementById('quo-gst').textContent      = '₹' + totalGst.toFixed(2);
  document.getElementById('quo-grand').textContent    = '₹' + grand.toFixed(2);
}


// ══════════════════════════════════════════════
//  AMOUNT IN WORDS  (Indian numbering)
// ══════════════════════════════════════════════
function numToWords(n) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
                 'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen',
                 'Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  if (n === 0) return 'Zero';

  // Inner helper (handles up to 999)
  function hundredsToWords(num) {
    if (num < 20)  return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + hundredsToWords(num % 100) : '');
  }

  // FIX: Removed trailing space edge cases by trimming results
  n = Math.floor(n);
  if (n >= 10000000) return (hundredsToWords(Math.floor(n / 10000000)) + ' Crore '   + numToWords(n % 10000000)).trim();
  if (n >= 100000)   return (hundredsToWords(Math.floor(n / 100000))   + ' Lakh '    + numToWords(n % 100000)).trim();
  if (n >= 1000)     return (hundredsToWords(Math.floor(n / 1000))     + ' Thousand ' + numToWords(n % 1000)).trim();
  return hundredsToWords(n);
}

function amtWords(val) {
  // FIX: Guard against NaN / negative
  if (isNaN(val) || val < 0) return 'Invalid amount';
  const parts = val.toFixed(2).split('.');
  const words = numToWords(parseInt(parts[0], 10));
  const paise = parseInt(parts[1], 10);
  return 'Rupees ' + words + (paise > 0 ? ' and ' + numToWords(paise) + ' Paise' : '') + ' Only';
}

// ══════════════════════════════════════════════
//  HTML BUILDER HELPERS
// ══════════════════════════════════════════════

/** Sanitise a string to prevent XSS when injecting user values as innerHTML. */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Builds the company header for a document.
 * @param {string} docType  - e.g. 'TAX INVOICE'
 * @param {string} [copyLabel] - optional copy-type label shown in top-right corner
 *                               e.g. 'Original for Recipient'
 */
function companyHeaderHTML(docType, copyLabel = '') {
  const copyBadgeHTML = copyLabel
    ? `<div class="copy-label-badge">${esc(copyLabel)}</div>`
    : '';
  return `
  <div class="doc-header">
    <div class="doc-logo-area">
      <div class="doc-logo-circle">SST</div>
      <div>
        <div class="doc-company-name">SST Super Sun Traders</div>
        <div class="doc-company-info">
          #29/23, 8th Street, Dr.Subbaraya Nagar, Kodambakkam, Chennai – 600 024<br>
          GST: 33BKGPV4919L1ZM &nbsp;|&nbsp; Ph: 044 4218 8202 / 4208 2575<br>
          supersuntraders@gmail.com
        </div>
      </div>
    </div>
    <div class="doc-title-area">
      <div class="doc-type-badge">${esc(docType)}</div>
      ${copyBadgeHTML}
    </div>
  </div>`;
}

function docFooterHTML() {
  return `
  <div class="doc-footer">
    <div>
      <div style="font-size:11px;color:var(--gray-500);">Subject to Chennai Jurisdiction Only</div>
    </div>
    <div class="doc-sign">
      <div class="doc-sign-line"></div>
      <div class="doc-sign-name">SST SUPER SUN TRADERS</div>
      <div class="doc-sign-title">Authorised Signatory</div>
    </div>
  </div>
  <div class="doc-bottom-bar">
    SST SUPER SUN TRADERS | #29/23, 8th Street, Dr.Subbaraya Nagar, Kodambakkam, Chennai – 600 024<br>
    GST: 33BKGPV4919L1ZM | Ph: 044 4218 8202 / 4208 2575 | supersuntraders@gmail.com
  </div>`;
}

// ══════════════════════════════════════════════
//  PREVIEW INVOICE  (3 copies)
// ══════════════════════════════════════════════

/**
 * The three GST invoice copy types printed together.
 * Index 0 prints first (top of the stack).
 */
const INVOICE_COPIES = [
  { label: 'Original for Recipient',  color: '#1a4a1a' },
  { label: 'Duplicate for Transporter', color: '#7b3e00' },
  { label: 'Normal Copy',              color: '#1a2e58' },
];

/**
 * Build the inner HTML shared by all 3 invoice copies.
 * This is called once — all copies contain identical data,
 * differing only in their copy-label badge.
 */
function buildInvoiceBodyHTML(data) {
  const { invNo, invDate, delivNote, dispatch,
          buyerName, buyerGst, buyerAddr, buyerPhone, buyerEmail,
          itemsHTML, sub, cgst, sgst, grand, gstEnabled } = data;

  let addrLines = esc(buyerAddr).replace(/\n/g, '<br>');
  if (buyerPhone) addrLines += '<br>Ph: '   + esc(buyerPhone);
  if (buyerEmail) addrLines += '<br>'       + esc(buyerEmail);
  if (buyerGst)   addrLines += '<br>GST: '  + esc(buyerGst);

  // Conditional GST columns in the preview table
  const gstHead   = gstEnabled ? '<th>GST%</th><th>GST Amt</th>' : '';
  const gstTotals = gstEnabled ? `
      <div class="doc-total-row"><span class="tl">CGST</span><span class="tv">₹${cgst.toFixed(2)}</span></div>
      <div class="doc-total-row"><span class="tl">SGST</span><span class="tv">₹${sgst.toFixed(2)}</span></div>` : '';
  const subtotalLabel = gstEnabled ? 'Taxable Value' : 'Subtotal';
  const grandLabel    = gstEnabled ? 'Grand Total'   : 'Total Amount';

  return `
  <div class="doc-body">
    <div class="doc-section-row">
      <div>
        <div class="doc-section-label">Bill To</div>
        <div class="doc-to-name">${esc(buyerName)}</div>
        <div class="doc-to-address">${addrLines}</div>
      </div>
      <div>
        <div class="doc-section-label">Invoice Info</div>
        <div class="doc-meta">
          <strong>Invoice No.</strong> ${esc(invNo)}<br>
          <strong>Date</strong> ${invDate}<br>
          ${delivNote ? '<strong>Delivery Note</strong> ' + esc(delivNote) + '<br>' : ''}
          ${dispatch  ? '<strong>Dispatch</strong> '      + esc(dispatch)  + '<br>' : ''}
          <strong>State</strong> Tamil Nadu, Code: 33
        </div>
      </div>
    </div>

    <table class="doc-items-table">
      <thead>
        <tr>
          <th style="width:36px">#</th>
          <th>Description of Goods</th>
          <th>HSN/SAC</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Rate</th>
          ${gstHead}
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>

    <div class="doc-totals">
      <div class="doc-total-row"><span class="tl">${subtotalLabel}</span><span class="tv">₹${sub.toFixed(2)}</span></div>
      ${gstTotals}
      <div class="doc-total-row grand-total"><span class="tl">${grandLabel}</span><span class="tv">₹${grand.toFixed(2)}</span></div>
    </div>
    <div class="amount-words">${amtWords(grand)}</div>

    <div class="doc-terms">
      <strong>Terms &amp; Conditions:</strong><br>
      1. Goods once sold will not be taken back.<br>
      2. Interest @ 24% p.a. will be charged on overdue bills.<br>
      3. Subject to Chennai Jurisdiction Only.
    </div>

    ${docFooterHTML()}
  </div>`;
}


function previewInvoice() {
  // ── Read form values ────────────────────────
  const invNo      = document.getElementById('inv-no').value.trim()           || '___';
  const invDate    = formatDate(document.getElementById('inv-date').value)     || '___';
  const delivNote  = document.getElementById('inv-delivery-note').value.trim() || '';
  const dispatch   = document.getElementById('inv-dispatch').value.trim()      || '';
  const buyerName  = document.getElementById('inv-buyer-name').value.trim()    || '___';
  const buyerGst   = document.getElementById('inv-buyer-gst').value.trim()     || '';
  const buyerAddr  = document.getElementById('inv-buyer-addr').value.trim()    || '';
  const buyerPhone = document.getElementById('inv-buyer-phone').value.trim()   || '';
  const buyerEmail = document.getElementById('inv-buyer-email').value.trim()   || '';

  // ── Build items rows ────────────────────────
  let itemsHTML = '';
  let sub = 0, totalGst = 0;
  const rows = document.querySelectorAll('#inv-items-body tr');
  let sno = 0;

  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    // inputs: [0]=desc, [1]=hsn, [2]=qty, [3]=unit, [4]=rate
    const desc   = inputs[0]?.value.trim();
    const hsn    = inputs[1]?.value.trim() || '';
    const qty    = parseFloat(inputs[2]?.value) || 0;
    const unit   = inputs[3]?.value.trim() || '';
    const rate   = parseFloat(inputs[4]?.value) || 0;
    const sel    = row.querySelector('select');
    const gstPct = sel ? parseFloat(sel.value) : 5;

    if (!desc && qty === 0 && rate === 0) return;

    sno++;
    const base   = qty * rate;
    // Respect GST toggle in preview too
    const gstAmt = invGstEnabled ? parseFloat((base * gstPct / 100).toFixed(2)) : 0;
    const total  = base + gstAmt;
    sub      += base;
    totalGst += gstAmt;

    // Conditionally include GST columns per row
    const gstCols = invGstEnabled
      ? `<td>${gstPct}%</td><td class="money">₹${gstAmt.toFixed(2)}</td>`
      : '';

    itemsHTML += `
      <tr>
        <td>${sno}</td>
        <td>${esc(desc)}</td>
        <td>${esc(hsn)}</td>
        <td>${qty}</td>
        <td>${esc(unit)}</td>
        <td class="money">₹${rate.toFixed(2)}</td>
        ${gstCols}
        <td class="money"><strong>₹${total.toFixed(2)}</strong></td>
      </tr>`;
  });

  if (sno === 0) {
    showToast('Please fill in at least one item row.', 'error');
    return;
  }

  const cgst  = totalGst / 2;
  const sgst  = totalGst / 2;
  const grand = sub + totalGst;

  // ── Shared data payload (includes gstEnabled flag) ──
  const data = {
    invNo, invDate, delivNote, dispatch,
    buyerName, buyerGst, buyerAddr, buyerPhone, buyerEmail,
    itemsHTML, sub, cgst, sgst, grand,
    gstEnabled: invGstEnabled,
  };

  // ── Generate all 3 copies ───────────────────
  let allCopiesHTML = '';
  INVOICE_COPIES.forEach((copy, idx) => {
    const isLast = idx === INVOICE_COPIES.length - 1;
    allCopiesHTML += `
      <div class="print-copy${isLast ? ' print-copy--last' : ''}">
        <div class="print-doc">
          ${companyHeaderHTML('TAX INVOICE', copy.label)}
          ${buildInvoiceBodyHTML(data)}
        </div>
      </div>`;
  });

  document.getElementById('invoice-doc').innerHTML = allCopiesHTML;
  document.getElementById('invoice-form-section').style.display = 'none';
  document.getElementById('invoice-print-area').style.display   = 'block';
  showToast('3 invoice copies ready — print or download!');
}


// ══════════════════════════════════════════════
//  PREVIEW QUOTATION
// ══════════════════════════════════════════════
function previewQuotation() {
  const quoNo      = document.getElementById('quo-no').value.trim()           || '';
  const quoDate    = formatDate(document.getElementById('quo-date').value)     || '___';
  const quoValid   = formatDate(document.getElementById('quo-valid').value)    || '';
  const clientName = document.getElementById('quo-client-name').value.trim()  || '___';
  const contact    = document.getElementById('quo-contact').value.trim()      || '';
  const clientAddr = document.getElementById('quo-client-addr').value.trim()  || '';
  const clientPhone= document.getElementById('quo-client-phone').value.trim() || '';

  let itemsHTML = '';
  let subTotal = 0, totalGst = 0;
  const rows = document.querySelectorAll('#quo-items-body tr');
  let sno = 0;

  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const name   = inputs[0]?.value.trim();
    const code   = inputs[1]?.value.trim() || '';
    const price  = parseFloat(inputs[2]?.value) || 0;
    const sel    = row.querySelector('select');
    const gstPct = sel ? parseFloat(sel.value) : 5;

    if (!name && price === 0) return;
    sno++;
    // Respect GST toggle
    const gstAmt = quoGstEnabled ? parseFloat((price * gstPct / 100).toFixed(2)) : 0;
    const total  = price + gstAmt;
    subTotal += price;
    totalGst += gstAmt;

    // Conditionally include GST columns per row
    const gstCols = quoGstEnabled
      ? `<td>${gstPct}%</td><td class="money">₹${gstAmt.toFixed(2)}</td>`
      : '';

    itemsHTML += `
      <tr>
        <td>${sno}</td>
        <td>${esc(name)}</td>
        <td>${esc(code)}</td>
        <td class="money">₹${price.toFixed(2)}</td>
        ${gstCols}
        <td class="money"><strong>₹${total.toFixed(2)}</strong></td>
      </tr>`;
  });

  if (sno === 0) {
    showToast('Please fill in at least one item row.', 'error');
    return;
  }

  const grand = subTotal + totalGst;

  let addrLines = '';
  if (contact)     addrLines += esc(contact) + '<br>';
  addrLines += esc(clientAddr).replace(/\n/g, '<br>');
  if (clientPhone) addrLines += '<br>Ph: ' + esc(clientPhone);

  // Conditional GST headers and totals for the preview document
  const gstHead    = quoGstEnabled ? '<th>GST</th><th>GST AMT</th>' : '';
  const gstTotals  = quoGstEnabled
    ? `<div class="doc-total-row"><span class="tl">Total GST</span><span class="tv">₹${totalGst.toFixed(2)}</span></div>` : '';
  const valueLabel = quoGstEnabled ? 'VALUE INCL GST' : 'VALUE';
  const grandLabel = quoGstEnabled ? 'Grand Total (incl. GST)' : 'Total Amount';
  const subLabel   = quoGstEnabled ? 'Total (excl. GST)' : 'Subtotal';

  const html = `
  ${companyHeaderHTML('QUOTATION')}
  <div class="doc-body">
    <div class="doc-section-row">
      <div>
        <div class="doc-section-label">To</div>
        <div class="doc-to-name">${esc(clientName)}</div>
        <div class="doc-to-address">${addrLines}</div>
      </div>
      <div>
        <div class="doc-section-label">Quotation Info</div>
        <div class="doc-meta">
          ${quoNo ? '<strong>Quotation No.</strong> ' + esc(quoNo) + '<br>' : ''}
          <strong>Date</strong> ${quoDate}<br>
          ${quoValid ? '<strong>Valid Until</strong> ' + quoValid + '<br>' : ''}
        </div>
      </div>
    </div>

    <table class="doc-items-table">
      <thead>
        <tr>
          <th style="width:36px">S.NO</th>
          <th>ITEM NAME</th>
          <th>PRODUCT CODE</th>
          <th>UNIT PRICE</th>
          ${gstHead}
          <th>${valueLabel}</th>
        </tr>
      </thead>
      <tbody>${itemsHTML}</tbody>
    </table>

    <div class="doc-totals">
      <div class="doc-total-row"><span class="tl">${subLabel}</span><span class="tv">₹${subTotal.toFixed(2)}</span></div>
      ${gstTotals}
      <div class="doc-total-row grand-total"><span class="tl">${grandLabel}</span><span class="tv">₹${grand.toFixed(2)}</span></div>
    </div>
    <div class="amount-words">${amtWords(grand)}</div>

    <div class="doc-terms">
      <strong>Terms &amp; Conditions:</strong><br>
      1. This quotation is valid for the period mentioned above.<br>
      2. Prices are subject to change without prior notice after the validity date.<br>
      3. Subject to Chennai Jurisdiction Only.
    </div>

    ${docFooterHTML()}
  </div>`;

  document.getElementById('quotation-doc').innerHTML = html;
  document.getElementById('quotation-form-section').style.display = 'none';
  document.getElementById('quotation-print-area').style.display   = 'block';
  showToast('Quotation ready — print or download!');
}


// ══════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════

/** Format a YYYY-MM-DD date string to Indian locale (e.g. "04 Apr 2026"). */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Show a toast notification (type: '' | 'error' | 'info') */
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  const icon = type === 'error' ? '⚠️' : type === 'info' ? '⏳' : '✅';
  t.textContent = icon + ' ' + msg;
  t.className   = 'toast' + (type === 'error' ? ' error' : '');
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ══════════════════════════════════════════════
//  DOWNLOAD PDF
// ══════════════════════════════════════════════

/**
 * Download the current invoice or quotation as a PDF.
 * Uses html2pdf.js loaded via CDN in index.html.
 * @param {'invoice'|'quotation'} type
 */
function downloadPDF(type) {
  // Guard: check library is loaded
  if (typeof html2pdf === 'undefined') {
    showToast('PDF library not loaded. Please check your internet connection.', 'error');
    return;
  }

  const isInvoice = type === 'invoice';
  const element   = document.getElementById(isInvoice ? 'invoice-doc' : 'quotation-doc');
  const docNo     = isInvoice
    ? (document.getElementById('inv-no').value.trim() || 'INVOICE')
    : (document.getElementById('quo-no').value.trim() || 'QUOTATION');
  const filename  = `SST-${isInvoice ? 'Invoice' : 'Quotation'}-${docNo}.pdf`;

  const opt = {
    margin:     [8, 8, 8, 8],
    filename,
    image:      { type: 'jpeg', quality: 0.98 },
    html2canvas:{ scale: 2, useCORS: true, letterRendering: true },
    jsPDF:      { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak:  { mode: ['css', 'legacy'] },  // respects page-break-after on .print-copy
  };

  showToast('Generating PDF…', 'info');
  html2pdf().set(opt).from(element).save()
    .then(() => showToast(`PDF "${filename}" downloaded!`))
    .catch(err => { console.error(err); showToast('PDF generation failed.', 'error'); });
}
