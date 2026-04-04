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

  // IMPROVEMENT: keyboard navigation
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
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (!pageEl) return;
  pageEl.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => {
    if (b.dataset.page === page) b.classList.add('active');
  });

  currentPage = page;
  const titles = { home: 'Dashboard', invoice: 'Tax Invoice', quotation: 'Quotation' };
  document.getElementById('topbar-title').textContent = titles[page] || page;

  if (page === 'invoice'   && invRowCount === 0) { addInvRow(); addInvRow(); addInvRow(); }
  if (page === 'quotation' && quoRowCount === 0) { addQuoRow(); addQuoRow(); addQuoRow(); }

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
  showToast('Form has been reset.');
}

// ══════════════════════════════════════════════
//  GST TOGGLE
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

// ══════════════════════════════════════════════
//  ROWS & CALCULATION
// ══════════════════════════════════════════════

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
  document.getElementById('inv-subtotal').textContent = '₹' + sub.toFixed(2);
  document.getElementById('inv-cgst').textContent     = '₹' + cgst.toFixed(2);
  document.getElementById('inv-sgst').textContent     = '₹' + sgst.toFixed(2);
  document.getElementById('inv-grand').textContent    = '₹' + grand.toFixed(2);
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
  document.getElementById('quo-subtotal').textContent = '₹' + subTotal.toFixed(2);
  document.getElementById('quo-gst').textContent      = '₹' + totalGst.toFixed(2);
  document.getElementById('quo-grand').textContent    = '₹' + grand.toFixed(2);
}

// ══════════════════════════════════════════════
//  DOCUMENT BUILDERS
// ══════════════════════════════════════════════

function numToWords(n) {
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n === 0) return 'Zero';
  function hundreds(num) {
    if (num < 20)  return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + hundreds(num % 100) : '');
  }
  n = Math.floor(n);
  let res = '';
  if (n >= 10000000) { res += hundreds(Math.floor(n / 10000000)) + ' Crore '; n %= 10000000; }
  if (n >= 100000)   { res += hundreds(Math.floor(n / 100000))   + ' Lakh ';  n %= 100000; }
  if (n >= 1000)     { res += hundreds(Math.floor(n / 1000))     + ' Thousand '; n %= 1000; }
  res += hundreds(n);
  return res.trim();
}
function amtWords(val) {
  const parts = val.toFixed(2).split('.');
  const words = numToWords(parseInt(parts[0], 10));
  const paise = parseInt(parts[1], 10);
  return 'Rupees ' + words + (paise > 0 ? ' and Paise ' + numToWords(paise) : '') + ' Only';
}
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function buildQuotationDocHTML(data) {
  const { quoDate, clientName, clientAddr, contact, clientPhone, itemRows, grand, quoGst } = data;
  const rows = itemRows.map((r, i) => `
    <tr class="qt-row">
      <td>${i + 1}</td>
      <td class="left bold">${esc(r.name)}</td>
      <td>${esc(r.code)}</td>
      <td class="num">${r.price.toFixed(2)}</td>
      ${quoGst ? `<td>${r.gstPct}%</td><td class="num">${r.gstAmt.toFixed(2)}</td>` : '<td>-</td><td class="num">-</td>'}
      <td class="num">${r.total.toFixed(2)}</td>
    </tr>`).join('');
  const pad = Array(Math.max(0, 5-itemRows.length)).fill(0).map(()=>`<tr class="qt-row empty"><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');
  return `
  <div class="qt-doc">
    <div class="qt-header"><div class="qt-logo-block"><div class="qt-logo-circle">SST</div><div><div class="qt-company-name">SUPER SUN TRADERS</div><div class="qt-company-info">#29/23, 8th Street, Dr.Subbaraya Nagar, Chennai - 600 024</div></div></div></div>
    <div class="qt-title-row"><div class="qt-title-text">QUOTATION</div><div class="qt-date-text">Date : ${quoDate}</div></div>
    <div class="qt-to-block"><strong>To:</strong> ${esc(clientName)}<br>${esc(contact)}${contact?'<br>':''}${esc(clientAddr).replace(/\n/g,'<br>')}${clientAddr?'<br>':''}${clientPhone?'Ph: '+esc(clientPhone):''}</div>
    <table class="qt-table"><thead><tr><th>S.NO</th><th>ITEM NO</th><th>PRODUCT CODE</th><th class="num">UNIT PRICE</th><th>GST</th><th>GST AMT</th><th class="num">AMOUNT</th></tr></thead><tbody>${rows}${pad}</tbody><tfoot><tr><td colspan="6" class="right bold">TOTAL</td><td class="num bold">${grand.toFixed(2)}</td></tr></tfoot></table>
    <div class="qt-footer"><div class="qt-sign-block">Authorised Signatory<br><strong>SUPER SUN TRADERS</strong></div></div>
  </div>`;
}

function buildInvoiceDocHTML(data, copyLabel) {
  const { invNo, invDate, delivNote, modePayment, refNo, refDate, buyerOrderNo, buyerOrderDate, dispatchDocNo, delivNoteDate, dispatchedThrough, destination, buyerName, buyerGst, buyerAddr, termsDelivery, itemRows, grand, gstEnabled } = data;
  const rows = itemRows.map((r, i) => `
    <tr class="inv-item-row"><td rowspan="2" class="inv-sno">${i+1}</td><td class="inv-desc-cell">${esc(r.desc)}</td><td class="center">${esc(r.hsn)}</td><td class="num">${r.qty} ${esc(r.unit)}</td><td class="num">${r.rate.toFixed(2)}</td><td class="center">${esc(r.unit)}</td><td class="num">${r.base.toFixed(2)}</td></tr>
    <tr class="inv-sub-row"><td colspan="6" class="inv-sub-info">Batch: ${esc(r.batch)} &nbsp; Mfg: ${esc(r.mfgDt)} &nbsp; Exp: ${esc(r.expiry)}</td></tr>`).join('');
  let taxRows = '';
  if (gstEnabled) {
    const m = {}; itemRows.forEach(r => { const k = r.gstPct.toFixed(1); if(!m[k])m[k]=0; m[k]+=r.gstAmt; });
    Object.entries(m).forEach(([p, a]) => {
      taxRows += `<tr class="inv-tax-row"><td colspan="5" class="right italic">OUTPUT CGST @ ${(p/2).toFixed(1)}%</td><td class="center">${(p/2).toFixed(1)}%</td><td class="num">${(a/2).toFixed(2)}</td></tr>`;
      taxRows += `<tr class="inv-tax-row"><td colspan="5" class="right italic">OUTPUT SGST @ ${(p/2).toFixed(1)}%</td><td class="center">${(p/2).toFixed(1)}%</td><td class="num">${(a/2).toFixed(2)}</td></tr>`;
    });
  }
  return `
  <div class="inv-doc">
    <div class="inv-title-row"><div class="inv-title">TAX INVOICE</div><div class="inv-copy-badge">${esc(copyLabel)}</div></div>
    <div class="inv-top-grid">
      <div class="inv-company-block"><strong>SST SUPER SUN TRADERS</strong><br>#29/23, 8th Street, Dr.Subbaraya Nagar, Kodambakkam, Chennai<br>GSTIN: 33BKGPV4919L1ZM</div>
      <div class="inv-fields-grid">
        <div class="inv-field-label">Inv No & Date</div><div class="inv-field-val">${esc(invNo)} / ${invDate}</div>
        <div class="inv-field-label">Delivery Note</div><div class="inv-field-val">${esc(delivNote)}</div>
        <div class="inv-field-label">Payment</div><div class="inv-field-val">${esc(modePayment)}</div>
        <div class="inv-field-label">Buyer Order</div><div class="inv-field-val">${esc(buyerOrderNo)} / ${formatDateDMY(buyerOrderDate)}</div>
        <div class="inv-field-label">Destination</div><div class="inv-field-val">${esc(destination)} via ${esc(dispatchedThrough)}</div>
      </div>
    </div>
    <div class="inv-buyer-block"><strong>Buyer:</strong> ${esc(buyerName)}<br>${esc(buyerAddr).replace(/\n/g,'<br>')}<br>GST: ${esc(buyerGst)}</div>
    <table class="inv-table"><thead><tr><th>SI</th><th>Description</th><th>HSN</th><th>Qty</th><th>Rate</th><th>per</th><th>Amount</th></tr></thead><tbody>${rows}</tbody><tfoot>${taxRows}<tr class="inv-grand-row"><td colspan="6" class="right bold">TOTAL</td><td class="num bold">${grand.toFixed(2)}</td></tr></tfoot></table>
    <div class="inv-bottom-row"><div><strong>${amtWords(grand)}</strong></div><div class="inv-for-block">for SST SUPER SUN TRADERS<br><br>Authorised Signatory</div></div>
  </div>`;
}

function previewInvoice() {
  const data = {
    invNo: document.getElementById('inv-no').value, invDate: formatDateDMY(document.getElementById('inv-date').value),
    delivNote: document.getElementById('inv-delivery-note').value, modePayment: document.getElementById('inv-mode-payment').value,
    refNo: document.getElementById('inv-ref-no').value, refDate: document.getElementById('inv-ref-date').value,
    buyerOrderNo: document.getElementById('inv-buyer-order-no').value, buyerOrderDate: document.getElementById('inv-buyer-order-date').value,
    dispatchDocNo: document.getElementById('inv-dispatch-doc-no').value, delivNoteDate: document.getElementById('inv-deliv-note-date').value,
    dispatchedThrough: document.getElementById('inv-dispatched-through').value, destination: document.getElementById('inv-destination').value,
    buyerName: document.getElementById('inv-buyer-name').value, buyerGst: document.getElementById('inv-buyer-gst').value,
    buyerAddr: document.getElementById('inv-buyer-addr').value, termsDelivery: document.getElementById('inv-terms-delivery').value,
    itemRows: [], sub: 0, grand: 0, gstEnabled: invGstEnabled
  };
  let tGst = 0;
  document.querySelectorAll('#inv-items-body tr').forEach(row => {
    const ins = row.querySelectorAll('input');
    const desc = ins[0]?.value, qty = parseFloat(ins[2]?.value)||0, rate = parseFloat(ins[4]?.value)||0, pct = parseFloat(row.querySelector('select')?.value)||0;
    if(!desc && qty===0) return;
    const b = qty*rate, g = invGstEnabled ? (b*pct/100) : 0;
    data.sub += b; tGst += g;
    data.itemRows.push({ desc, hsn: ins[1]?.value, qty, unit: ins[3]?.value, rate, gstPct: pct, gstAmt: g, base: b, total: b+g, batch: ins[5]?.value, mfgDt: ins[6]?.value, expiry: ins[7]?.value });
  });
  if(data.itemRows.length===0){ showToast('Add items!','error'); return; }
  data.grand = data.sub + tGst;
  let html = '';
  ['Original','Duplicate','Office Copy'].forEach((l,i) => {
    html += `<div class="print-copy ${i===2?'print-copy--last':''}">` + buildInvoiceDocHTML(data, l) + `</div>`;
  });
  document.getElementById('invoice-doc').innerHTML = html;
  document.getElementById('invoice-form-section').style.display = 'none';
  document.getElementById('invoice-print-area').style.display   = 'block';
  showToast('Invoices ready!');
}

function previewQuotation() {
  const data = {
    quoDate: formatDateDMY(document.getElementById('quo-date').value),
    clientName: document.getElementById('quo-client-name').value,
    contact: document.getElementById('quo-contact').value,
    clientAddr: document.getElementById('quo-client-addr').value,
    clientPhone: document.getElementById('quo-client-phone').value,
    itemRows: [], grand: 0, quoGst: quoGstEnabled
  };
  document.querySelectorAll('#quo-items-body tr').forEach(row => {
    const ins = row.querySelectorAll('input');
    const name = ins[0]?.value, price = parseFloat(ins[2]?.value)||0, pct = parseFloat(row.querySelector('select')?.value)||0;
    if(!name && price===0) return;
    const g = quoGstEnabled ? (price*pct/100) : 0;
    data.grand += (price + g);
    data.itemRows.push({ name, code: ins[1]?.value, price, gstPct: pct, gstAmt: g, total: price+g });
  });
  if(data.itemRows.length===0){ showToast('Add items!','error'); return; }
  document.getElementById('quotation-doc').innerHTML = buildQuotationDocHTML(data);
  document.getElementById('quotation-form-section').style.display = 'none';
  document.getElementById('quotation-print-area').style.display   = 'block';
  showToast('Quotation ready!');
}

function formatDateDMY(s) { if(!s) return ''; const d = new Date(s); return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-GB'); }

function showToast(m, t='') {
  const el = document.getElementById('toast');
  if(!el) return;
  el.textContent = (t==='error'?'❌ ':'✅ ') + m;
  el.className = 'toast show ' + t;
  setTimeout(()=>el.classList.remove('show'), 3000);
}

function downloadPDF(type) {
  const el = document.getElementById(type==='invoice'?'invoice-doc':'quotation-doc');
  const opt = { margin: 5, filename: `SST_${type}_${Date.now()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: 'css' } };
  showToast('Generating PDF...');
  html2pdf().set(opt).from(el).save();
}
