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
    <td><input type="text" placeholder="Batch No." style="width:100px" aria-label="Batch Number"></td>
    <td><input type="text" placeholder="dd/mm/yy" style="width:80px" aria-label="Mfg Date"></td>
    <td><input type="text" placeholder="dd/mm/yy" style="width:80px" aria-label="Expiry Date"></td>
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

// ══════════════════════════════════════════════
//  HTML HELPERS  (Quotation layout – Image 1)
// ══════════════════════════════════════════════

/** Sanitise a string to prevent XSS when injecting user values as innerHTML. */
function esc2(str) { return esc(str); } // alias kept for compat

/**
 * Quotation document – matches client reference (Image 1).
 * Bordered table, logo+name top-left, QUOTATION underlined heading, To: block.
 */
function buildQuotationDocHTML(data) {
  const { quoDate, clientName, clientAddr, contact, clientPhone,
          itemRows, grand, quoGst } = data;

  // Pad to minimum 5 visible rows
  const MIN_ROWS = 5;
  let rows = itemRows.slice();
  while (rows.length < MIN_ROWS) rows.push(null); // null = empty row

  const rowsHTML = rows.map((r, i) => {
    if (!r) return `<tr class="qt-row empty">
      <td>${i + 1}</td><td></td><td></td><td></td>
      <td></td><td></td><td></td>
    </tr>`;
    const gstCol   = quoGst ? `<td>${r.gstPct}%</td><td class="num">${r.gstAmt > 0 ? r.gstAmt.toFixed(2) : ''}</td>` : '<td></td><td></td>';
    return `<tr class="qt-row">
      <td>${i + 1}</td>
      <td class="left bold">${esc(r.name)}</td>
      <td>${esc(r.code)}</td>
      <td class="num">${r.price > 0 ? r.price.toFixed(2) : ''}</td>
      ${gstCol}
      <td class="num">${r.total > 0 ? r.total.toFixed(2) : ''}</td>
    </tr>`;
  }).join('');

  const totalGst = itemRows.reduce((s, r) => s + (r.gstAmt || 0), 0);

  let addrBlock = '';
  if (clientName) addrBlock += `<div class="qt-client-name">${esc(clientName)}</div>`;
  let addrLines = '';
  if (contact)     addrLines += esc(contact) + '<br>';
  if (clientAddr)  addrLines += esc(clientAddr).replace(/\n/g, '<br>');
  if (clientPhone) addrLines += '<br>Ph: ' + esc(clientPhone);
  if (addrLines)   addrBlock += `<div class="qt-client-addr">${addrLines}</div>`;

  // Format date dd/mm/yyyy
  function fmtDMY(str) {
    if (!str) return '';
    const [y,m,d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  return `
<div class="qt-doc">
  <!-- Header -->
  <div class="qt-header">
    <div class="qt-logo-block">
      <div class="qt-logo-circle">SST</div>
      <div>
        <div class="qt-company-name">SUPER SUN TRADERS</div>
        <div class="qt-company-info">#29/23, 8th Street, Dr.Subbaraya Nagar, Chennai - 600 024<br>
        GST: 33BKGPV4919L1ZM &nbsp;|&nbsp; Ph: 044 4218 8202 / 4208 2575 &nbsp;|&nbsp; supersuntraders@gmail.com</div>
      </div>
    </div>
    <div class="qt-header-divider"></div>
  </div>

  <!-- Title & Date -->
  <div class="qt-title-row">
    <div class="qt-title-text">QUOTATION</div>
    <div class="qt-date-text">Date : ${quoDate}</div>
  </div>

  <!-- To block -->
  <div class="qt-to-block">
    <span class="qt-to-label">To:</span>
    ${addrBlock}
  </div>

  <!-- Items Table -->
  <table class="qt-table">
    <thead>
      <tr>
        <th>S.NO</th>
        <th>ITEM NO</th>
        <th>PRODUCT CODE</th>
        <th class="num">UNIT PRICE</th>
        <th>GST</th>
        <th>GST AMT</th>
        <th class="num">AMOUNT</th>
      </tr>
    </thead>
    <tbody>${rowsHTML}</tbody>
    <tfoot>
      <tr class="qt-total-row">
        <td colspan="6" class="right bold">TOTAL</td>
        <td class="num bold">${grand.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Footer -->
  <div class="qt-footer">
    <div class="qt-sign-block">
      <div class="qt-sign-label">Authorised Signatory</div>
      <div class="qt-sign-name">SUPER SUN TRADERS</div>
    </div>
  </div>

  <!-- Bottom bar -->
  <div class="qt-bottom-bar">
    <strong>SUPER SUN TRADERS</strong><br>
    #29/23, 8th Street, Dr.Subbaraya Nagar, Kodambakkam, Chennai - 600 024<br>
    Ph: 044 4218 8202 / 4208 2575 &nbsp;|&nbsp; GST: 33BKGPV4919L1ZM<br>
    supersuntraders@gmail.com
  </div>
</div>`;
}

// ══════════════════════════════════════════════
//  Invoice header helper – still used for copy-badge
// ══════════════════════════════════════════════
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
 * Invoice document – matches client reference (Image 2).
 * Centered "Tax Invoice" title, 2-col header info grid, Batch/Mfg Dt/Expiry
 * sub-rows, GST tax breakdown rows, Amount in Words + "For SST SUPER SUN TRADERS".
 */
function buildInvoiceDocHTML(data, copyLabel) {
  const { invNo, invDate, delivNote, modePayment, refNo, refDate,
          buyerOrderNo, buyerOrderDate, dispatchDocNo, delivNoteDate,
          dispatchedThrough, destination, cityPortLoading, cityPortDischarge,
          buyerName, buyerGst, buyerAddr, buyerPhone, buyerEmail,
          termsDelivery, itemRows, sub, cgst, sgst, grand, gstEnabled } = data;

  // Format date dd/mm/yyyy from YYYY-MM-DD
  function fmtDMY(str) {
    if (!str) return '';
    const [y,m,d] = str.split('-');
    return `${d}/${m}/${y}`;
  }

  const copyBadgeHTML = copyLabel
    ? `<div class="inv-copy-badge">${esc(copyLabel)}</div>` : '';

  // Build buyer address
  let buyerBlock = '';
  if (buyerName)  buyerBlock += `<div class="inv-buyer-name">${esc(buyerName)}</div>`;
  if (buyerAddr)  buyerBlock += `<div>${esc(buyerAddr).replace(/\n/g,'<br>')}</div>`;
  if (buyerPhone) buyerBlock += `<div>Ph: ${esc(buyerPhone)}</div>`;
  if (buyerEmail) buyerBlock += `<div>${esc(buyerEmail)}</div>`;
  if (buyerGst)   buyerBlock += `<div>GSTIN: ${esc(buyerGst)}</div>`;

  // Build items rows — MIN 4 rows
  const MIN_ROWS = 4;
  let rows = itemRows.slice();
  while (rows.length < MIN_ROWS) rows.push(null);

  const itemRowsHTML = rows.map((r, i) => {
    if (!r) return `<tr class="inv-item-row">
      <td rowspan="2" class="inv-sno">${i+1}</td>
      <td class="inv-desc-cell"></td>
      <td></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td>
    </tr>
    <tr class="inv-sub-row"><td class="inv-sub-info"></td><td colspan="5"></td></tr>`;
    const gstCols = gstEnabled
      ? `<td class="num">${r.rate > 0 ? r.rate.toFixed(2) : ''}</td><td class="num"></td><td class="num">${r.total > 0 ? r.total.toFixed(2) : ''}</td>`
      : `<td class="num">${r.rate > 0 ? r.rate.toFixed(2) : ''}</td><td class="num"></td><td class="num">${r.total > 0 ? r.total.toFixed(2) : ''}</td>`;
    return `<tr class="inv-item-row">
      <td rowspan="2" class="inv-sno">${i+1}</td>
      <td class="inv-desc-cell">${esc(r.desc)}</td>
      <td>${esc(r.hsn)}</td>
      <td class="num">${r.qty > 0 ? r.qty : ''}</td>
      <td class="num">${r.rate > 0 ? r.rate.toFixed(2) : ''}</td>
      <td class="num"></td>
      <td class="num">${r.total > 0 ? r.total.toFixed(2) : ''}</td>
    </tr>
    <tr class="inv-sub-row">
      <td class="inv-sub-info">Batch&nbsp;${esc(r.batch||'')} &nbsp; Mfg Dt&nbsp;${esc(r.mfgDt||'')} &nbsp; Expiry&nbsp;${esc(r.expiry||'')}</td>
      <td colspan="5"></td>
    </tr>`;
  }).join('');

  // GST breakdown rows
  let taxRowsHTML = '';
  if (gstEnabled) {
    // Group items by GST rate and compute separate CGST/SGST per rate
    const rateMap = {};
    itemRows.forEach(r => {
      if (!r) return;
      const key = r.gstPct.toFixed(1);
      if (!rateMap[key]) rateMap[key] = 0;
      rateMap[key] += r.base;
    });
    Object.entries(rateMap).sort(([a],[b])=>parseFloat(a)-parseFloat(b)).forEach(([pct, base]) => {
      const half = base * parseFloat(pct) / 100 / 2;
      if (half > 0) {
        const halfPct = (parseFloat(pct)/2).toFixed(1);
        taxRowsHTML += `
        <tr class="inv-tax-row">
          <td colspan="5" class="right bold italic">OUTPUT CGST @ ${halfPct}%</td>
          <td class="num bold italic">${halfPct}&nbsp;%</td>
          <td class="num">${half.toFixed(2)}</td>
        </tr>
        <tr class="inv-tax-row">
          <td colspan="5" class="right bold italic">OUTPUT SGST @ ${halfPct}%</td>
          <td class="num bold italic">${halfPct}&nbsp;%</td>
          <td class="num">${half.toFixed(2)}</td>
        </tr>`;
      }
    });
  }

  return `
<div class="inv-doc">
  <!-- Title -->
  <div class="inv-title-row">
    <div class="inv-title">Tax Invoice${copyLabel ? '' : ''}</div>
    ${copyBadgeHTML}
  </div>

  <!-- Top info block -->
  <div class="inv-top-grid">
    <!-- Left: Company info -->
    <div class="inv-company-block">
      <div class="inv-co-name">SST SUPER SUN TRADERS</div>
      <div class="inv-co-info">
        #29/23, 8th Street, Dr.Subbaraya Nagar,<br>
        Kodambakkam, Chennai - 600 024<br>
        GSTIN/UIN: 33BKGPV4919L1ZM<br>
        State Name : Tamil Nadu, Code : 33<br>
        Ph: 044 4218 8202 / 4208 2575<br>
        E-Mail : supersuntraders@gmail.com
      </div>
    </div>
    <!-- Right: Invoice fields grid -->
    <div class="inv-fields-grid">
      <div class="inv-field-label">Invoice No.</div>      <div class="inv-field-label">Dated</div>
      <div class="inv-field-val">${esc(invNo)}</div>       <div class="inv-field-val">${invDate}</div>

      <div class="inv-field-label">Delivery Note</div>   <div class="inv-field-label">Mode/Terms of Payment</div>
      <div class="inv-field-val">${esc(delivNote)}<br><span class="inv-deliv-cum">DELIVERY CUM INVOICE</span></div>
      <div class="inv-field-val">${esc(modePayment)}</div>

      <div class="inv-field-label">Reference No. &amp; Date.</div> <div class="inv-field-label">Other References</div>
      <div class="inv-field-val">${esc(refNo)}${refDate?' – '+esc(refDate):''}</div> <div class="inv-field-val"></div>

      <div class="inv-field-label">Buyer's Order No.</div> <div class="inv-field-label">Dated</div>
      <div class="inv-field-val">${esc(buyerOrderNo)}</div>  <div class="inv-field-val">${esc(buyerOrderDate)}</div>

      <div class="inv-field-label">Dispatch Doc No.</div>  <div class="inv-field-label">Delivery Note Date</div>
      <div class="inv-field-val">${esc(dispatchDocNo)}</div> <div class="inv-field-val">${esc(delivNoteDate)}</div>

      <div class="inv-field-label">Dispatched through</div> <div class="inv-field-label">Destination</div>
      <div class="inv-field-val">${esc(dispatchedThrough)}</div> <div class="inv-field-val">${esc(destination)}</div>

      <div class="inv-field-label">City/Port of Loading</div> <div class="inv-field-label">City/Port of Discharge</div>
      <div class="inv-field-val">${esc(cityPortLoading)}</div>  <div class="inv-field-val">${esc(cityPortDischarge)}</div>
    </div>
  </div>

  <!-- Buyer block -->
  <div class="inv-buyer-block">
    <div class="inv-buyer-header">Buyer (Bill to)</div>
    <div class="inv-buyer-details">${buyerBlock}</div>
    <div class="inv-buyer-meta">
      <div>State Name &nbsp;: Tamil Nadu, Code : 33</div>
      <div>Terms of Delivery<br><strong>${esc(termsDelivery) || 'THROUGH OWN STAFF'}</strong></div>
    </div>
  </div>

  <!-- Items Table -->
  <table class="inv-table">
    <thead>
      <tr>
        <th class="inv-th-sno">SI<br>No.</th>
        <th class="inv-th-desc">Description of Goods</th>
        <th>HSN/SAC</th>
        <th class="num">Quantity</th>
        <th class="num">Rate</th>
        <th class="num">per</th>
        <th class="num">Amount</th>
      </tr>
    </thead>
    <tbody>${itemRowsHTML}</tbody>
    <tfoot>
      ${taxRowsHTML}
      <tr class="inv-grand-row">
        <td colspan="6" class="right bold">Grand Total</td>
        <td class="num bold">${grand.toFixed(2)}</td>
      </tr>
    </tfoot>
  </table>

  <!-- Amount in words + signatory -->
  <div class="inv-bottom-row">
    <div class="inv-words-block">
      <span class="inv-words-label">Amount in Words:</span><br>
      <em>${amtWords(grand)}</em>
    </div>
    <div class="inv-for-block">For SST SUPER SUN TRADERS</div>
  </div>
</div>`;
}

// Legacy stub so old code paths don't break
function companyHeaderHTML() { return ''; }
function docFooterHTML()     { return ''; }

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

function previewInvoice() {
  // ── Read form values ────────────────────────
  const invNo             = document.getElementById('inv-no').value.trim()             || '';
  const invDateRaw        = document.getElementById('inv-date').value                  || '';
  const invDate           = formatDateDMY(invDateRaw);
  const delivNote         = document.getElementById('inv-delivery-note').value.trim()  || '';
  const modePayment       = document.getElementById('inv-mode-payment').value.trim()   || '';
  const refNo             = document.getElementById('inv-ref-no').value.trim()         || '';
  const refDate           = document.getElementById('inv-ref-date').value              || '';
  const buyerOrderNo      = document.getElementById('inv-buyer-order-no').value.trim() || '';
  const buyerOrderDate    = document.getElementById('inv-buyer-order-date').value      || '';
  const dispatchDocNo     = document.getElementById('inv-dispatch-doc-no').value.trim()|| '';
  const delivNoteDate     = document.getElementById('inv-deliv-note-date').value       || '';
  const dispatchedThrough = document.getElementById('inv-dispatched-through').value.trim() || '';
  const destination       = document.getElementById('inv-destination').value.trim()    || '';
  const cityPortLoading   = document.getElementById('inv-city-loading').value.trim()   || '';
  const cityPortDischarge = document.getElementById('inv-city-discharge').value.trim() || '';
  const buyerName         = document.getElementById('inv-buyer-name').value.trim()     || '';
  const buyerGst          = document.getElementById('inv-buyer-gst').value.trim()      || '';
  const buyerAddr         = document.getElementById('inv-buyer-addr').value.trim()     || '';
  const buyerPhone        = document.getElementById('inv-buyer-phone').value.trim()    || '';
  const buyerEmail        = document.getElementById('inv-buyer-email').value.trim()    || '';
  const termsDelivery     = document.getElementById('inv-terms-delivery').value.trim() || '';

  // ── Build item rows ──────────────────────────
  const itemRows = [];
  let sub = 0, totalGst = 0;

  document.querySelectorAll('#inv-items-body tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const desc   = inputs[0]?.value.trim() || '';
    const hsn    = inputs[1]?.value.trim() || '';
    const qty    = parseFloat(inputs[2]?.value) || 0;
    const unit   = inputs[3]?.value.trim() || '';
    const rate   = parseFloat(inputs[4]?.value) || 0;
    const batch  = inputs[5]?.value.trim() || '';
    const mfgDt  = inputs[6]?.value.trim() || '';
    const expiry = inputs[7]?.value.trim() || '';
    const sel    = row.querySelector('select');
    const gstPct = sel ? parseFloat(sel.value) : 5;

    if (!desc && qty === 0 && rate === 0) return;

    const base   = qty * rate;
    const gstAmt = invGstEnabled ? parseFloat((base * gstPct / 100).toFixed(2)) : 0;
    const total  = base + gstAmt;
    sub      += base;
    totalGst += gstAmt;
    itemRows.push({ desc, hsn, qty, unit, rate, batch, mfgDt, expiry, gstPct, base, gstAmt, total });
  });

  if (itemRows.length === 0) {
    showToast('Please fill in at least one item row.', 'error');
    return;
  }

  const cgst  = totalGst / 2;
  const sgst  = totalGst / 2;
  const grand = sub + totalGst;

  const data = {
    invNo, invDate, delivNote, modePayment, refNo, refDate,
    buyerOrderNo, buyerOrderDate, dispatchDocNo, delivNoteDate,
    dispatchedThrough, destination, cityPortLoading, cityPortDischarge,
    buyerName, buyerGst, buyerAddr, buyerPhone, buyerEmail,
    termsDelivery, itemRows, sub, cgst, sgst, grand,
    gstEnabled: invGstEnabled,
  };

  // ── Generate all 3 copies ───────────────────
  let allCopiesHTML = '';
  INVOICE_COPIES.forEach((copy, idx) => {
    const isLast = idx === INVOICE_COPIES.length - 1;
    allCopiesHTML += `<div class="print-copy${isLast ? ' print-copy--last' : ''}">${buildInvoiceDocHTML(data, copy.label)}</div>`;
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
  const quoDateRaw = document.getElementById('quo-date').value || '';
  const quoDate    = formatDateDMY(quoDateRaw);
  const clientName = document.getElementById('quo-client-name').value.trim()  || '';
  const contact    = document.getElementById('quo-contact').value.trim()      || '';
  const clientAddr = document.getElementById('quo-client-addr').value.trim()  || '';
  const clientPhone= document.getElementById('quo-client-phone').value.trim() || '';

  const itemRows = [];
  let subTotal = 0, totalGst = 0;

  document.querySelectorAll('#quo-items-body tr').forEach(row => {
    const inputs = row.querySelectorAll('input');
    const name   = inputs[0]?.value.trim() || '';
    const code   = inputs[1]?.value.trim() || '';
    const price  = parseFloat(inputs[2]?.value) || 0;
    const sel    = row.querySelector('select');
    const gstPct = sel ? parseFloat(sel.value) : 0;

    if (!name && price === 0) return;
    const gstAmt = quoGstEnabled ? parseFloat((price * gstPct / 100).toFixed(2)) : 0;
    const total  = price + gstAmt;
    subTotal += price;
    totalGst += gstAmt;
    itemRows.push({ name, code, price, gstPct, gstAmt, total });
  });

  if (itemRows.length === 0) {
    showToast('Please fill in at least one item row.', 'error');
    return;
  }

  const grand = subTotal + totalGst;

  const html = buildQuotationDocHTML({
    quoDate, clientName, contact, clientAddr, clientPhone,
    itemRows, grand, quoGst: quoGstEnabled,
  });

  document.getElementById('quotation-doc').innerHTML = html;
  document.getElementById('quotation-form-section').style.display = 'none';
  document.getElementById('quotation-print-area').style.display   = 'block';
  showToast('Quotation ready — print or download!');
}


// ══════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════

/** Format YYYY-MM-DD → "04 Apr 2026" */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
/** Format YYYY-MM-DD → "04/04/2026" (dd/mm/yyyy) */
function formatDateDMY(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
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
