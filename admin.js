import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
'https://ozkcpvlutmupqblfzcro.supabase.co',
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96a2Nwdmx1dG11cHFibGZ6Y3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNDI2NDgsImV4cCI6MjA5NzkxODY0OH0.7aSDXDTvY3A5izw0lU_KUmiQSKtaYA0xPSyQ4kYqOyQ'
);

async function loadFragment(url) {
  const res = await fetch(url);
  return res.text();
}

async function initAdmin() {
  const dashboardHtml = await loadFragment('pages/admin-dashboard.html');
  document.getElementById('app').innerHTML = dashboardHtml;
  lucide.createIcons();
  applyTheme();
  checkSession();
}

// ---- AUTH ----
const ADMIN_EMAIL = 'admin@smartloan.com';

window.checkSession = async function(){
  const { data: { session } } = await supabase.auth.getSession();
  if(session && session.user.email === ADMIN_EMAIL){
    document.getElementById('adminDashboard').classList.remove('hidden');
    document.querySelector('#adminSidebarUser span').textContent = session.user.email;
    loadDashboard();
  } else if(session){
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  } else {
    window.location.href = 'index.html';
  }
}

window.logout = async function(){
  await supabase.auth.signOut().catch(() => {});
  window.location.href = 'index.html';
}

window.toggleTheme = function(){
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');
  localStorage.setItem('smartloan-theme', isLight ? 'light' : 'dark');
  document.querySelectorAll('.theme-toggle i').forEach(el => {
    el.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
  });
  lucide.createIcons();
}

function applyTheme(){
  const saved = localStorage.getItem('smartloan-theme');
  if(saved === 'light'){
    document.body.classList.add('light-theme');
    document.querySelectorAll('.theme-toggle i').forEach(el => {
      el.setAttribute('data-lucide', 'moon');
    });
    lucide.createIcons();
  }
}

// ---- SIDEBAR ----
window.toggleSidebar = function(){
  document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('active');
}

window.closeSidebar = function(){
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('active');
}

window.showSection = function(id){
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelector(`.menu-item[onclick*="'${id}'"]`).classList.add('active');
  closeSidebar();
  if(id === 'alerts') renderAlerts();
  if(id === 'notifications') renderNotifications();
  if(id === 'contracts') renderContracts();
  if(id === 'payments') renderPayments();
}

// ---- LOAD DASHBOARD ----
let dbUsers = [], dbLoans = [], dbTxn = [], dbDocs = [], dbPayments = [];

function buildActivity(){
  const activities = [];
  const userMap = {};
  dbUsers.forEach(u => { userMap[u.user_id] = u.full_name || u.name || u.email || 'Unknown'; userMap[u.id] = u.full_name || u.name || u.email || 'Unknown'; });

  dbLoans.forEach(l => {
    const name = userMap[l.user_id] || l.applicant || 'Unknown';
    activities.push({
      type: 'Loan Applied',
      user: name,
      date: l.created_at || new Date().toISOString(),
      status: 'Info'
    });
    if(l.status === 'Approved' || l.status === 'Disbursed'){
      activities.push({
        type: 'Loan ' + l.status,
        user: name,
        date: l.created_at || new Date().toISOString(),
        status: 'Success'
      });
    }
    if(l.status === 'Declined'){
      activities.push({
        type: 'Loan Declined',
        user: name,
        date: l.created_at || new Date().toISOString(),
        status: 'Failed'
      });
    }
  });

  dbDocs.forEach(d => {
    const name = userMap[d.user_id] || 'Unknown';
    activities.push({
      type: 'Document Uploaded: ' + d.document_type,
      user: name,
      date: d.uploaded_at || new Date().toISOString(),
      status: 'Pending'
    });
    if(d.status === 'Verified'){
      activities.push({
        type: 'Document Verified: ' + d.document_type,
        user: name,
        date: d.updated_at || d.uploaded_at || new Date().toISOString(),
        status: 'Success'
      });
    }
    if(d.status === 'Rejected'){
      activities.push({
        type: 'Document Rejected: ' + d.document_type,
        user: name,
        date: d.updated_at || d.uploaded_at || new Date().toISOString(),
        status: 'Failed'
      });
    }
  });

  dbUsers.forEach(u => {
    activities.push({
      type: 'User Registered',
      user: u.full_name || u.name || u.email || 'Unknown',
      date: u.created_at || new Date().toISOString(),
      status: 'Success'
    });
  });

  return activities;
}

async function loadDashboard(){
  const [usersRes, loansRes, docsRes, paymentsRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('loan_applications').select('*'),
    supabase.from('user_documents').select('*'),
    supabase.from('transactions').select('*').eq('type', 'loan_repayment').order('created_at', { ascending: false }),
  ]);
  if(usersRes.error) console.error('Profiles error:', usersRes.error);
  if(loansRes.error) console.error('Loans error:', loansRes.error);
  if(docsRes.error) console.error('Docs error:', docsRes.error);
  dbUsers = usersRes.data || [];
  dbLoans = loansRes.data || [];
  dbDocs = docsRes.data || [];
  dbPayments = paymentsRes.data || [];
  dbTxn = buildActivity();

  document.getElementById('statUsers').textContent = dbUsers.length;
  document.getElementById('statLoans').textContent = dbLoans.filter(l => l.status === 'Approved' || l.status === 'Disbursed').length;
  var totalDisbursed = dbLoans.filter(l => l.status === 'Approved' || l.status === 'Disbursed').reduce((s,l) => s + Number(l.amount), 0);
  var totalRepaid = dbPayments.reduce((s, p) => s + Number(p.amount), 0);
  document.getElementById('statDisbursed').textContent = '$' + (totalDisbursed - totalRepaid).toLocaleString();
  document.getElementById('statRepaid').textContent = '$' + totalRepaid.toLocaleString();
  document.getElementById('statCollected').textContent = '$' + dbPayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString();
  document.getElementById('statPayCount').textContent = dbPayments.length;
  renderUsers(dbUsers);
  renderLoans(dbLoans);
  renderActivity(dbTxn);
  renderDocuments(dbDocs);
  renderCharts();
  runAiScoring();
}

// ---- RENDER HELPERS ----
function renderUsers(list){
  const tbody = document.getElementById('userTable');
  const docUsers = new Set((dbDocs||[]).map(d => d.user_id));
  const loanCountMap = {};
  (dbLoans||[]).forEach(l => { loanCountMap[l.user_id] = (loanCountMap[l.user_id]||0) + 1; });
  if(!list.length){
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i data-lucide="users" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No users found</p></td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = list.map(u => {
    const profileId = u.id || u.user_id;
    const userId = u.user_id || u.id;
    const kycStatus = docUsers.has(userId) ? 'Verified' : 'Pending';
    const kycBadge = kycStatus === 'Verified' ? 'badge-success' : 'badge-warning';
    const loanCount = loanCountMap[userId]||0;
    return `<tr>
    <td data-label="Name"><strong>${u.full_name||u.name||'—'}</strong></td>
    <td data-label="Email / Phone">${u.email||u.contact||'—'}</td>
    <td data-label="KYC Status"><span class="badge ${kycBadge}">${kycStatus}</span></td>
    <td data-label="Loans">${loanCount}</td>
    <td data-label="Joined">${u.created_at ? new Date(u.created_at).toLocaleDateString() : u.joined||'—'}</td>
    <td data-label="Action">
      <button style="padding:6px 8px;font-size:11px;min-height:auto;background:#f59e0b;margin-right:4px;" onclick="editUser('${profileId}')"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
      <button style="padding:6px 8px;font-size:11px;min-height:auto;background:#dc2626;" onclick="deleteUser('${profileId}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
    </td>
  </tr>`;
  }).join('');
  lucide.createIcons();
}

function renderLoans(list){
  const tbody = document.getElementById('loanTable');
  const userMap = {};
  dbUsers.forEach(u => { userMap[u.user_id] = u.full_name || u.name || u.email || '—'; });
  if(!list.length){
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i data-lucide="file-text" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No loan applications</p></td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = list.map(l => {
    const cls = l.status === 'Approved' || l.status === 'Disbursed' ? 'badge-success' : l.status === 'Declined' ? 'badge-danger' : 'badge-warning';
    const applicantName = l.applicant || userMap[l.user_id] || '—';
    const loanDate = l.created_at ? new Date(l.created_at).toLocaleDateString() : (l.date || '—');
    return `<tr>
      <td data-label="Applicant"><strong>${applicantName}</strong></td>
      <td data-label="Amount">$${Number(l.amount).toLocaleString()}</td>
      <td data-label="Purpose">${l.purpose||'—'}</td>
      <td data-label="Date">${loanDate}</td>
      <td data-label="Term">${l.term||l.repayment_period||'—'}</td>
      <td data-label="Status"><span class="badge ${cls}">${l.status}</span></td>
      <td data-label="Action">
        ${l.status === 'Pending' ? `<button style="padding:6px 8px;font-size:11px;min-height:auto;background:#16a34a;margin-right:4px;" onclick="approveLoan(this,'${l.id}')"><i data-lucide="check" style="width:12px;height:12px;"></i> Approve</button><button style="padding:6px 8px;font-size:11px;min-height:auto;background:#dc2626;margin-right:4px;" onclick="declineLoan(this,'${l.id}')"><i data-lucide="x" style="width:12px;height:12px;"></i> Decline</button>` : ''}
        <button style="padding:6px 8px;font-size:11px;min-height:auto;background:#f59e0b;margin-right:4px;" onclick="editLoan('${l.id}')"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
        <button style="padding:6px 8px;font-size:11px;min-height:auto;background:#dc2626;" onclick="deleteLoan('${l.id}')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </td>
    </tr>`;
  }).join('');
  lucide.createIcons();
}

function renderActivity(txns){
  const tbody = document.getElementById('recentActivity');
  if(!txns.length){
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state"><i data-lucide="activity" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No recent activity</p><div class="sub">Activity will appear as users interact with the platform</div></td></tr>';
    lucide.createIcons();
    return;
  }
  const sorted = [...txns].sort((a,b) => new Date(b.date) - new Date(a.date));
  tbody.innerHTML = sorted.slice(0, 5).map(t => {
    const badgeCls = t.status === 'Success' ? 'badge-success' : t.status === 'Failed' ? 'badge-danger' : t.status === 'Pending' ? 'badge-warning' : 'badge-info';
    const displayDate = t.date ? new Date(t.date).toLocaleDateString() : '—';
    return `<tr>
      <td data-label="Event">${t.type}</td>
      <td data-label="User">${t.user}</td>
      <td data-label="Date">${displayDate}</td>
      <td data-label="Status"><span class="badge ${badgeCls}">${t.status}</span></td>
    </tr>`;
  }).join('');
}

window.filterDocuments = function(){
  const type = document.getElementById('docFilter').value;
  const status = document.getElementById('docStatusFilter').value;
  let filtered = dbDocs;
  if(type !== 'all') filtered = filtered.filter(d => d.document_type === type);
  if(status !== 'all') filtered = filtered.filter(d => d.status === status);
  renderDocuments(filtered);
}

function renderDocuments(list){
  const tbody = document.getElementById('docTable');
  if(!list.length){
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i data-lucide="file-text" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No documents uploaded</p></td></tr>';
    lucide.createIcons();
    return;
  }
  const userMap = {};
  dbUsers.forEach(u => { userMap[u.id] = u.full_name || u.name || u.email; userMap[u.user_id] = u.full_name || u.name || u.email; });
  tbody.innerHTML = list.map(d => {
    const name = userMap[d.user_id] || d.user_id?.slice(0, 8) || '—';
    const size = d.file_size ? (d.file_size / 1024).toFixed(1) + ' KB' : '—';
    const statusCls = d.status === 'Verified' ? 'badge-success' : d.status === 'Rejected' ? 'badge-danger' : 'badge-warning';
    const date = d.uploaded_at ? new Date(d.uploaded_at).toLocaleDateString() : '—';
    const viewBtn = `<a href="${d.file_url}" target="_blank" style="padding:6px 8px;font-size:11px;background:#3b82f6;color:white;border-radius:6px;text-decoration:none;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="eye" style="width:14px;height:14px;"></i> View</a>`;
    let actionHtml = viewBtn;
    if(d.status === 'Pending'){
      actionHtml += `
        <button style="padding:6px 8px;font-size:11px;min-height:auto;background:#16a34a;margin-left:4px;" onclick="verifyDocument('${d.id}')"><i data-lucide="check" style="width:14px;height:14px;"></i> Verify</button>
        <button style="padding:6px 8px;font-size:11px;min-height:auto;background:#dc2626;margin-left:4px;" onclick="rejectDocument('${d.id}')"><i data-lucide="x" style="width:14px;height:14px;"></i> Reject</button>`;
    }
    return `<tr>
      <td data-label="User"><strong>${name}</strong></td>
      <td data-label="Document Type">${d.document_type}</td>
      <td data-label="File Name">${d.file_name || '—'}</td>
      <td data-label="Size">${size}</td>
      <td data-label="Status"><span class="badge ${statusCls}">${d.status}</span></td>
      <td data-label="Uploaded">${date}</td>
      <td data-label="Action" style="white-space:nowrap;">${actionHtml}</td>
    </tr>`;
  }).join('');
  lucide.createIcons();
}

let chartInstances = {};

function renderCharts(){
  Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch(e) {} });
  chartInstances = {};

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const growthData = Array(12).fill(0);
  dbLoans.forEach(l => {
    const d = l.created_at ? new Date(l.created_at) : null;
    if(d) growthData[d.getMonth()] += Number(l.amount) || 0;
  });

  chartInstances.growth = new Chart(document.getElementById('chartGrowth'), {
    type: 'line',
    data: {
      labels: months,
      datasets: [{ label: 'Loan Volume ($)', data: growthData, borderColor: '#3b82f6', tension: 0.3, fill: false }]
    },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });

  const statusCounts = { Approved: 0, Declined: 0, Pending: 0, Disbursed: 0 };
  dbLoans.forEach(l => { if(statusCounts[l.status] !== undefined) statusCounts[l.status]++; });

  chartInstances.repayment = new Chart(document.getElementById('chartRepayment'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#16a34a', '#dc2626', '#f59e0b', '#3b82f6']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  const riskCounts = { Low: 0, Medium: 0, High: 0, 'Not Scored': 0 };
  dbLoans.forEach(l => {
    if(l.ai_risk) riskCounts[l.ai_risk] = (riskCounts[l.ai_risk] || 0) + 1;
    else riskCounts['Not Scored']++;
  });

  chartInstances.risk = new Chart(document.getElementById('chartRisk'), {
    type: 'pie',
    data: {
      labels: Object.keys(riskCounts),
      datasets: [{
        data: Object.values(riskCounts),
        backgroundColor: ['#16a34a', '#f59e0b', '#dc2626', '#94a3b8']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });

  const docUsers = new Set((dbDocs||[]).map(d => d.user_id));
  const verifiedDocs = {};
  (dbDocs||[]).forEach(d => { if(d.status === 'Verified') verifiedDocs[d.user_id] = true; });
  const catCounts = { 'Has Documents': 0, 'Verified KYC': 0, 'No Docs': 0 };
  dbUsers.forEach(u => {
    const uid = u.user_id || u.id;
    if(verifiedDocs[uid]) catCounts['Verified KYC']++;
    else if(docUsers.has(uid)) catCounts['Has Documents']++;
    else catCounts['No Docs']++;
  });

  chartInstances.customers = new Chart(document.getElementById('chartCustomers'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(catCounts),
      datasets: [{
        data: Object.values(catCounts),
        backgroundColor: ['#16a34a', '#3b82f6', '#94a3b8']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

// ---- FILTERS ----
window.filterUsers = function(){
  const q = document.getElementById('userSearch').value.toLowerCase();
  const status = document.getElementById('userStatusFilter').value;
  const docUsers = new Set((dbDocs||[]).map(d => d.user_id));
  let filtered = dbUsers;
  if(q) filtered = filtered.filter(u => (u.full_name||u.name).toLowerCase().includes(q) || (u.email||u.contact).toLowerCase().includes(q) || (u.phone||'').toLowerCase().includes(q));
  if(status === 'pending') filtered = filtered.filter(u => !docUsers.has(u.user_id || u.id));
  else if(status === 'suspended') filtered = [];
  renderUsers(filtered);
}

window.filterLoans = function(){
  const status = document.getElementById('loanFilter').value;
  const q = document.getElementById('loanSearch').value.toLowerCase();
  const userMap = {};
  dbUsers.forEach(u => { userMap[u.user_id] = u.full_name || u.name || u.email || ''; });
  let filtered = dbLoans;
  if(status !== 'all') filtered = filtered.filter(l => l.status.toLowerCase() === status);
  if(q) filtered = filtered.filter(l => (l.applicant || userMap[l.user_id] || '').toLowerCase().includes(q) || l.purpose?.toLowerCase().includes(q));
  renderLoans(filtered);
}

// ---- ACTIONS ----
let editingUserId = null;

window.editUser = function(id){
  if(!id) return alert('Cannot edit this user.');
  const user = dbUsers.find(u => u.id === id || u.user_id === id);
  if(!user) return alert('User not found.');
  editingUserId = user.id;

  const kycStatus = (dbDocs||[]).some(d => d.user_id === (user.user_id || user.id)) ? 'Verified' : 'Pending';

  document.getElementById('editUserModalBody').innerHTML = `
    <h3>User Information</h3>
    <div class="detail-row"><span class="label">Email</span><span class="value">${user.email||user.contact||'—'}</span></div>
    <div class="detail-row"><span class="label">Joined</span><span class="value">${user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>
    <div class="detail-row"><span class="label">KYC Status</span><span class="value"><span class="badge ${kycStatus === 'Verified' ? 'badge-success' : 'badge-warning'}">${kycStatus}</span></span></div>

    <h3>Editable Fields</h3>
    <label style="font-size:13px;font-weight:600;color:#475569;">Full Name</label>
    <input id="editUserName" type="text" value="${(user.full_name||user.name||'')}" placeholder="Enter full name">

    <label style="font-size:13px;font-weight:600;color:#475569;margin-top:12px;display:block;">Phone</label>
    <input id="editUserPhone" type="text" value="${user.phone||''}" placeholder="Enter phone number">
  `;
  document.getElementById('editUserModal').classList.add('active');
  try { lucide.createIcons(); } catch(e) {}
}

window.closeEditUserModal = function(){
  document.getElementById('editUserModal').classList.remove('active');
  editingUserId = null;
}

window.saveEditUser = async function(){
  if(!editingUserId) return;
  const user = dbUsers.find(u => u.id === editingUserId);
  if(!user) return;
  const nameInput = document.getElementById('editUserName');
  const phoneInput = document.getElementById('editUserPhone');
  const newName = nameInput.value.trim();
  const newPhone = phoneInput.value.trim();
  if(!newName) return alert('Name cannot be empty.');
  const updates = {};
  if(newName !== (user.full_name||user.name)) updates.full_name = newName;
  if(newPhone !== (user.phone||'')) updates.phone = newPhone;
  if(Object.keys(updates).length === 0){
    closeEditUserModal();
    return;
  }
  const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
  if(error) return alert('Error: ' + error.message);
  Object.assign(user, updates);
  closeEditUserModal();
  renderUsers(dbUsers);
}

window.deleteUser = async function(id){
  if(!id) return alert('Cannot delete this user.');
  if(!confirm('Are you sure you want to delete this user and all their data?')) return;
  const user = dbUsers.find(u => u.id === id || u.user_id === id);
  if(!user) return alert('User not found.');
  const userId = user.user_id || user.id;
  const results = await Promise.all([
    supabase.from('transactions').delete().eq('user_id', userId),
    supabase.from('profiles').delete().eq('id', user.id),
    supabase.from('loan_applications').delete().eq('user_id', userId),
    supabase.from('user_documents').delete().eq('user_id', userId),
  ]);
  const errors = results.filter(r => r.error).map(r => r.error.message);
  if(errors.length){
    return alert('Delete failed (RLS policy may be blocking):\n' + errors.join('\n'));
  }
  dbUsers = dbUsers.filter(u => (u.id !== user.id && u.user_id !== userId));
  dbLoans = dbLoans.filter(l => l.user_id !== userId);
  dbDocs = dbDocs.filter(d => d.user_id !== userId);
  dbPayments = dbPayments.filter(p => p.user_id !== userId);
  renderUsers(dbUsers);
}

window.approveLoan = async function(btn, id){
  if(id) {
    const loan = dbLoans.find(l => l.id === id);
    const updates = { status: 'Approved' };
    if (loan && !loan.remaining_balance) updates.remaining_balance = Number(loan.amount);
    const { error } = await supabase.from('loan_applications').update(updates).eq('id',id);
    if(error) return alert('Approve failed: ' + error.message);
    if(loan) {
      loan.status = 'Approved';
      if (!loan.remaining_balance) loan.remaining_balance = Number(loan.amount);
    }
  }
  renderLoans(dbLoans);
  document.getElementById('statLoans').textContent = dbLoans.filter(l => l.status === 'Approved' || l.status === 'Disbursed').length;
  document.getElementById('statDisbursed').textContent = '$' + dbLoans.filter(l => l.status === 'Disbursed').reduce((s,l) => s + Number(l.amount), 0);
  document.getElementById('statPending').textContent = dbLoans.filter(l => l.status === 'Pending').length;
}

window.declineLoan = async function(btn, id){
  if(id) {
    const { error } = await supabase.from('loan_applications').update({status:'Declined'}).eq('id',id);
    if(error) return alert('Decline failed: ' + error.message);
  }
  const loan = dbLoans.find(l => l.id === id);
  if(loan) loan.status = 'Declined';
  renderLoans(dbLoans);
  document.getElementById('statLoans').textContent = dbLoans.filter(l => l.status === 'Approved' || l.status === 'Disbursed').length;
  document.getElementById('statDisbursed').textContent = '$' + dbLoans.filter(l => l.status === 'Disbursed').reduce((s,l) => s + Number(l.amount), 0);
  document.getElementById('statPending').textContent = dbLoans.filter(l => l.status === 'Pending').length;
}

let editingLoanId = null;

window.editLoan = function(id){
  const loan = dbLoans.find(l => l.id === id);
  if(!loan) return;
  editingLoanId = id;

  const userMap = {};
  dbUsers.forEach(u => { userMap[u.user_id] = u.full_name || u.name || u.email || '—'; });
  const applicantName = loan.applicant || userMap[loan.user_id] || '—';
  const loanDate = loan.created_at ? new Date(loan.created_at).toLocaleDateString() : (loan.date || '—');

  document.getElementById('editLoanModalBody').innerHTML = `
    <h3>Loan Information</h3>
    <div class="detail-row"><span class="label">Applicant</span><span class="value">${applicantName}</span></div>
    <div class="detail-row"><span class="label">Purpose</span><span class="value">${loan.purpose||'—'}</span></div>
    <div class="detail-row"><span class="label">Date</span><span class="value">${loanDate}</span></div>
    <div class="detail-row"><span class="label">Current Status</span><span class="value"><span class="badge ${loan.status === 'Approved' || loan.status === 'Disbursed' ? 'badge-success' : loan.status === 'Declined' ? 'badge-danger' : 'badge-warning'}">${loan.status||'—'}</span></span></div>

    <h3>Editable Fields</h3>
    <label style="font-size:13px;font-weight:600;color:#475569;">Loan Amount ($)</label>
    <input id="editLoanAmount" type="number" min="1" step="0.01" value="${loan.amount}" placeholder="Enter loan amount">

    <label style="font-size:13px;font-weight:600;color:#475569;margin-top:12px;display:block;">Repayment Term</label>
    <input id="editLoanTerm" type="text" value="${loan.term||loan.repayment_period||''}" placeholder="e.g. 12 months">

    <label style="font-size:13px;font-weight:600;color:#475569;margin-top:12px;display:block;">Status</label>
    <select id="editLoanStatus" style="margin:8px 0 4px;">
      <option value="Pending" ${loan.status === 'Pending' ? 'selected' : ''}>Pending</option>
      <option value="Approved" ${loan.status === 'Approved' ? 'selected' : ''}>Approved</option>
      <option value="Declined" ${loan.status === 'Declined' ? 'selected' : ''}>Declined</option>
      <option value="Disbursed" ${loan.status === 'Disbursed' ? 'selected' : ''}>Disbursed</option>
    </select>
  `;
  document.getElementById('editLoanModal').classList.add('active');
  try { lucide.createIcons(); } catch(e) {}
}

window.closeEditLoanModal = function(){
  document.getElementById('editLoanModal').classList.remove('active');
  editingLoanId = null;
}

window.saveEditLoan = async function(){
  if(!editingLoanId) return;
  const loan = dbLoans.find(l => l.id === editingLoanId);
  if(!loan) return;
  const amountInput = document.getElementById('editLoanAmount');
  const termInput = document.getElementById('editLoanTerm');
  const statusInput = document.getElementById('editLoanStatus');
  const newAmount = parseFloat(amountInput.value);
  if(isNaN(newAmount) || newAmount <= 0) return alert('Enter a valid amount');
  const newTerm = termInput.value.trim();
  const newStatus = statusInput.value;
  const updates = {};
  if(newAmount !== Number(loan.amount)) updates.amount = newAmount;
  if(newTerm !== (loan.term||loan.repayment_period||'')) updates.term = newTerm;
  if(newStatus !== loan.status) updates.status = newStatus;
  if((newStatus === 'Approved' || newStatus === 'Disbursed') && !loan.remaining_balance) {
    updates.remaining_balance = newAmount;
  }
  if(Object.keys(updates).length === 0){
    closeEditLoanModal();
    return;
  }
  const { error } = await supabase.from('loan_applications').update(updates).eq('id', loan.id);
  if(error) return alert('Error: ' + error.message);
  Object.assign(loan, updates);
  closeEditLoanModal();
  renderLoans(dbLoans);
  document.getElementById('statLoans').textContent = dbLoans.filter(l => l.status === 'Approved' || l.status === 'Disbursed').length;
  document.getElementById('statDisbursed').textContent = '$' + dbLoans.filter(l => l.status === 'Disbursed').reduce((s,l) => s + Number(l.amount), 0);
  document.getElementById('statPending').textContent = dbLoans.filter(l => l.status === 'Pending').length;
}

window.deleteLoan = async function(id){
  if(!confirm('Delete this loan application?')) return;
  const { error: txnErr } = await supabase.from('transactions').delete().eq('loan_id', id);
  if(txnErr) return alert('Error deleting related payments: ' + txnErr.message);
  const { error } = await supabase.from('loan_applications').delete().eq('id', id);
  if(error) return alert('Error: ' + error.message);
  dbLoans = dbLoans.filter(l => l.id !== id);
  dbPayments = dbPayments.filter(p => p.loan_id !== id);
  renderLoans(dbLoans);
}

// ---- DOCUMENT VERIFICATION ----
window.verifyDocument = async function(docId){
  if(!docId) return;
  const doc = dbDocs.find(d => d.id === docId);
  if(!doc) return;
  const { error } = await supabase.from('user_documents').update({status:'Verified', updated_at: new Date().toISOString()}).eq('id', docId);
  if(error) return alert('Error: ' + error.message);
  doc.status = 'Verified';
  doc.updated_at = new Date().toISOString();
  renderDocuments(dbDocs);
}

window.rejectDocument = async function(docId){
  if(!docId) return;
  const doc = dbDocs.find(d => d.id === docId);
  if(!doc) return;
  const { error } = await supabase.from('user_documents').update({status:'Rejected', updated_at: new Date().toISOString()}).eq('id', docId);
  if(error) return alert('Error: ' + error.message);
  doc.status = 'Rejected';
  doc.updated_at = new Date().toISOString();
  renderDocuments(dbDocs);
}

let creditScores = [];

window.runAiScoring = async function(){
  if(!dbLoans.length){
    const tbody = document.getElementById('creditScoreTable');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i data-lucide="brain" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No loans to score</p></td></tr>';
    lucide.createIcons();
    return;
  }
  const tbody = document.getElementById('creditScoreTable');
  tbody.innerHTML = '<tr class="no-card"><td colspan="8" style="text-align:center;padding:20px;"><i data-lucide="loader-2" style="width:24px;height:24px;animation:spin 1s linear infinite;color:#2563eb;"></i><p style="margin-top:8px;color:#64748b;">AI is analyzing creditworthiness...</p></td></tr>';
  lucide.createIcons();

  const userMap = {};
  dbUsers.forEach(u => { userMap[u.user_id] = u.full_name || u.name || u.email || 'Unknown'; });

  const loansList = dbLoans.map(l => ({
    loanId: l.id,
    user: userMap[l.user_id] || 'Unknown',
    amount: l.amount,
    purpose: l.purpose,
    income: l.monthly_income,
    employment: l.employment_status,
    period: l.repayment_period,
    status: l.status
  }));

  const prompt = `You are a credit analyst. Evaluate each loan application based on:
- Loan-to-income ratio (high ratio = riskier)
- Employment stability (Employed/Self-employed > Vendor/Unemployed)
- Repayment period (longer periods may increase risk)
- Loan purpose (Business/Education = lower risk, Personal/Emergency = higher risk)

Return a JSON array. For each loan provide: "loanId" (the loan ID), "user" (their name), "amount" (loan amount), "purpose" (loan purpose), "score" (0-100, where 70+ = low risk, 50-69 = medium, below 50 = high), "risk" ("Low"/"Medium"/"High"), "decision" ("Approved" for strong applications, "Declined" for high-risk, "Review" for borderline cases needing manual document review), "reason" (a brief 1-sentence explanation of why this decision was made, mentioning income vs amount, employment, purpose, etc.). Only return valid JSON, no explanation.\n\nLoans: ${JSON.stringify(loansList)}`;

  try {
    const res = await fetch('http://localhost:3456/api/grok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: 'You are a credit risk assessment AI. Output only valid JSON arrays.',
        prompt
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const parsed = JSON.parse(data.result);
    if (Array.isArray(parsed)) {
      creditScores = parsed.map((c, i) => ({ ...c, loanId: loansList[i] ? loansList[i].loanId : c.loanId, date: new Date().toLocaleDateString() }));
      for (const score of creditScores) {
        await supabase.from('loan_applications').update({
          ai_score: score.score,
          ai_risk: score.risk,
          ai_decision: score.decision,
          ai_reason: score.reason || null
        }).eq('id', score.loanId);
      }
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (e) {
    tbody.innerHTML = `<tr class="no-card"><td colspan="8" style="text-align:center;padding:20px;color:#dc2626;"><p>AI scoring failed: ${e.message}</p></td></tr>`;
    lucide.createIcons();
    showToast('AI scoring failed: ' + e.message, 'error');
    return;
  }
  renderCreditScores();
  showToast('AI credit scoring completed for ' + creditScores.length + ' loan(s)', 'success');
}

function showToast(message, type){
  const existing = document.querySelector('.toast');
  if(existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = message;
  Object.assign(toast.style, {
    position: 'fixed', top: '20px', right: '20px', zIndex: '9999',
    padding: '14px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: '500',
    color: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,.2)', maxWidth: '400px',
    background: type === 'success' ? '#16a34a' : '#dc2626',
    opacity: '0', transform: 'translateY(-10px)', transition: 'all .3s'
  });
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

let editingScoreIdx = null;

window.editCreditScore = function(idx){
  const entry = creditScores[idx];
  if(!entry) return;
  editingScoreIdx = idx;

  const loan = dbLoans.find(l => l.id === entry.loanId);
  const user = loan ? dbUsers.find(u => u.user_id === loan.user_id) : null;
  const userId = loan ? loan.user_id : null;
  const userDocs = userId ? (dbDocs||[]).filter(d => d.user_id === userId) : [];

  const docsHtml = userDocs.length ? userDocs.map(d =>
    `<div class="detail-row">
      <span class="label">${d.document_type}</span>
      <span class="value"><a href="${d.file_url}" target="_blank" style="color:#2563eb;text-decoration:none;display:inline-flex;align-items:center;gap:4px;"><i data-lucide="eye" style="width:14px;height:14px;"></i> View</a></span>
    </div>`
  ).join('') : '<div style="font-size:13px;color:#94a3b8;padding:8px 0;">No documents uploaded.</div>';

  document.getElementById('editModalBody').innerHTML = `
    <h3>User Details</h3>
    <div class="detail-row"><span class="label">Name</span><span class="value">${user ? (user.full_name||user.name||'—') : entry.user}</span></div>
    <div class="detail-row"><span class="label">Email</span><span class="value">${user ? (user.email||'—') : '—'}</span></div>
    <div class="detail-row"><span class="label">Phone</span><span class="value">${user ? (user.phone||'—') : '—'}</span></div>
    <div class="detail-row"><span class="label">Joined</span><span class="value">${user && user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</span></div>

    <h3>Loan Details</h3>
    <div class="detail-row"><span class="label">Loan Amount</span><span class="value">$${Number(entry.amount).toLocaleString()}</span></div>
    <div class="detail-row"><span class="label">Purpose</span><span class="value">${entry.purpose||'—'}</span></div>
    <div class="detail-row"><span class="label">Monthly Income</span><span class="value">${loan && loan.monthly_income ? '$'+Number(loan.monthly_income).toLocaleString() : '—'}</span></div>
    <div class="detail-row"><span class="label">Employment</span><span class="value">${loan ? (loan.employment_status||'—') : '—'}</span></div>
    <div class="detail-row"><span class="label">Repayment Period</span><span class="value">${loan ? (loan.repayment_period||'—') : '—'}</span></div>
    <div class="detail-row"><span class="label">Status</span><span class="value">${loan ? (loan.status||'—') : '—'}</span></div>

    <h3>Uploaded Documents</h3>
    ${docsHtml}

    <h3>Credit Score & Decision</h3>
    <label style="font-size:13px;font-weight:600;color:#475569;">Score (0-100)</label>
    <input id="editScoreInput" type="number" min="0" max="100" value="${entry.score}">

    <label style="font-size:13px;font-weight:600;color:#475569;margin-top:12px;display:block;">Decision</label>
    <select id="editDecisionInput" style="margin:8px 0 4px;">
      <option value="Review" ${entry.decision === 'Review' ? 'selected' : ''}>Review — Check Documents</option>
      <option value="Approved" ${entry.decision === 'Approved' ? 'selected' : ''}>Approved</option>
      <option value="Declined" ${entry.decision === 'Declined' ? 'selected' : ''}>Declined</option>
    </select>
  `;
  document.getElementById('editScoreModal').classList.add('active');
  try { lucide.createIcons(); } catch(e) {}
}

window.closeEditModal = function(){
  document.getElementById('editScoreModal').classList.remove('active');
  editingScoreIdx = null;
}

window.saveEditedScore = async function(){
  if(editingScoreIdx === null) return;
  const entry = creditScores[editingScoreIdx];
  if(!entry) return;
  const input = document.getElementById('editScoreInput');
  const score = parseInt(input.value);
  if(isNaN(score) || score < 0 || score > 100) return alert('Enter a valid score (0-100)');
  const decisionInput = document.getElementById('editDecisionInput');
  entry.score = score;
  entry.risk = score >= 70 ? 'Low' : score >= 50 ? 'Medium' : 'High';
  entry.decision = decisionInput.value;
  entry.reason = entry.reason || 'Manually reviewed by admin.';
  await supabase.from('loan_applications').update({
    ai_score: score,
    ai_risk: entry.risk,
    ai_decision: entry.decision,
    ai_reason: entry.reason
  }).eq('id', entry.loanId);
  closeEditModal();
  renderCreditScores();
}

window.deleteCreditScore = function(idx){
  const entry = creditScores[idx];
  if(!entry || !confirm('Delete credit score for ' + entry.user + ' (loan: $' + entry.amount + ')?')) return;
  creditScores.splice(idx, 1);
  renderCreditScores();
}

window.viewReviewDocs = function(idx){
  editCreditScore(idx);
}

function renderCreditScores(){
  const tbody = document.getElementById('creditScoreTable');
  if(!creditScores.length){
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i data-lucide="brain" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No credit scores generated</p></td></tr>';
    lucide.createIcons();
    return;
  }
  tbody.innerHTML = creditScores.map((c, idx) => {
    const riskCls = c.risk === 'Low' ? 'badge-success' : c.risk === 'Medium' ? 'badge-warning' : 'badge-danger';
    const decisionCls = c.decision === 'Approved' ? 'badge-success' : c.decision === 'Review' ? 'badge-warning' : 'badge-danger';
    return `<tr>
      <td data-label="User"><strong>${c.user}</strong></td>
      <td data-label="Loan Amount">$${Number(c.amount).toLocaleString()}</td>
      <td data-label="Purpose">${c.purpose||'—'}</td>
      <td data-label="Credit Score">${c.score}%</td>
      <td data-label="Risk Level"><span class="badge ${riskCls}">${c.risk}</span></td>
      <td data-label="Decision"><span class="badge ${decisionCls}">${c.decision}</span></td>
      <td data-label="Last Updated">${c.date}</td>
      <td data-label="Action">
        ${c.decision === 'Review' ? `<button style="padding:6px 8px;font-size:11px;min-height:auto;background:#3b82f6;margin-right:4px;" onclick="viewReviewDocs(${idx})"><i data-lucide="file-text" style="width:14px;height:14px;"></i> Docs</button>` : ''}
        <button style="padding:6px 8px;font-size:11px;min-height:auto;background:#f59e0b;margin-right:4px;" onclick="editCreditScore(${idx})"><i data-lucide="pencil" style="width:14px;height:14px;"></i></button>
        <button style="padding:6px 8px;font-size:11px;min-height:auto;background:#dc2626;" onclick="deleteCreditScore(${idx})"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
      </td>
    </tr>`;
  }).join('');
  lucide.createIcons();
}

// ---- ALERTS ----
function renderAlerts(){
  const container = document.getElementById('alertsContent');
  const alerts = [];

  dbLoans.forEach(l => {
    if(l.status === 'Pending' && l.ai_risk === 'High'){
      const name = l.applicant || 'Unknown';
      alerts.push({ icon:'alert-triangle', color:'#dc2626', title:'High-Risk Loan Pending', desc:`${name} — $${Number(l.amount).toLocaleString()} (${l.purpose||'—'}) requires immediate review.`, time: l.created_at });
    }
    if(l.status === 'Pending' && !l.ai_risk){
      const name = l.applicant || 'Unknown';
      alerts.push({ icon:'clock', color:'#f59e0b', title:'Loan Needs AI Scoring', desc:`${name} — $${Number(l.amount).toLocaleString()} has not been AI-scored yet.`, time: l.created_at });
    }
  });

  dbDocs.forEach(d => {
    if(d.status === 'Pending'){
      alerts.push({ icon:'file-text', color:'#f59e0b', title:'Document Pending Verification', desc:`${d.document_type} from user ${d.user_id} needs review.`, time: d.uploaded_at });
    }
    if(d.status === 'Rejected'){
      alerts.push({ icon:'x-circle', color:'#dc2626', title:'Document Rejected', desc:`${d.document_type} from user ${d.user_id} was rejected. `, time: d.updated_at || d.uploaded_at });
    }
  });

  dbUsers.forEach(u => {
    const hasDocs = dbDocs.some(d => d.user_id === (u.user_id || u.id));
    if(!hasDocs){
      alerts.push({ icon:'user-x', color:'#94a3b8', title:'User Missing KYC', desc:`${u.full_name||u.name||u.email||'Unknown'} has not uploaded any documents.`, time: u.created_at });
    }
  });

  alerts.sort((a, b) => new Date(b.time||0) - new Date(a.time||0));

  if(!alerts.length){
    container.innerHTML = '<div class="empty-state"><i data-lucide="bell-ring" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No alerts</p></div>';
    lucide.createIcons();
    return;
  }
  container.innerHTML = alerts.map(a => `
    <div class="alert-item" style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-bottom:1px solid #e2e8f0;">
      <i data-lucide="${a.icon}" style="width:20px;height:20px;color:${a.color};flex-shrink:0;margin-top:2px;"></i>
      <div style="flex:1;">
        <strong style="font-size:14px;color:#1e293b;">${a.title}</strong>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${a.desc}</p>
      </div>
      <span style="font-size:11px;color:#94a3b8;white-space:nowrap;">${a.time ? new Date(a.time).toLocaleDateString() : ''}</span>
    </div>
  `).join('');
  lucide.createIcons();
}

// ---- RISK ----
function renderRisk(){
  const container = document.getElementById('riskContent');
  const flagged = dbLoans.filter(l => l.ai_risk === 'High' || l.ai_decision === 'Review');
  const highRiskCount = dbLoans.filter(l => l.ai_risk === 'High').length;
  const reviewCount = dbLoans.filter(l => l.ai_decision === 'Review').length;
  const pendingScoreCount = dbLoans.filter(l => l.status === 'Pending' && !l.ai_risk).length;

  const userMap = {};
  dbUsers.forEach(u => { userMap[u.user_id] = u.full_name || u.name || u.email || '—'; });

  const summaryHtml = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card" style="padding:16px;border-left:4px solid #dc2626;">
        <div style="font-size:24px;font-weight:700;color:#dc2626;">${highRiskCount}</div>
        <div style="font-size:13px;color:#64748b;">High Risk Loans</div>
      </div>
      <div class="card" style="padding:16px;border-left:4px solid #f59e0b;">
        <div style="font-size:24px;font-weight:700;color:#f59e0b;">${reviewCount}</div>
        <div style="font-size:13px;color:#64748b;">Pending Review</div>
      </div>
      <div class="card" style="padding:16px;border-left:4px solid #94a3b8;">
        <div style="font-size:24px;font-weight:700;color:#94a3b8;">${pendingScoreCount}</div>
        <div style="font-size:13px;color:#64748b;">Awaiting AI Score</div>
      </div>
      <div class="card" style="padding:16px;border-left:4px solid #3b82f6;">
        <div style="font-size:24px;font-weight:700;color:#3b82f6;">${flagged.length}</div>
        <div style="font-size:13px;color:#64748b;">Total Flagged</div>
      </div>
    </div>
  `;

  if(!flagged.length){
    container.innerHTML = summaryHtml + '<div class="empty-state"><i data-lucide="shield-alert" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No flagged loans</p></div>';
    lucide.createIcons();
    return;
  }

  container.innerHTML = summaryHtml + `
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr><th>Applicant</th><th>Amount</th><th>Purpose</th><th>AI Risk</th><th>Decision</th><th>AI Score</th><th>Status</th><th>Date</th></tr></thead>
      <tbody>${flagged.map(l => {
        const riskCls = l.ai_risk === 'High' ? 'badge-danger' : l.ai_risk === 'Medium' ? 'badge-warning' : 'badge-success';
        const decisionCls = l.ai_decision === 'Approved' ? 'badge-success' : l.ai_decision === 'Review' ? 'badge-warning' : 'badge-danger';
        return `<tr>
          <td data-label="Applicant"><strong>${l.applicant || userMap[l.user_id] || '—'}</strong></td>
          <td data-label="Amount">$${Number(l.amount).toLocaleString()}</td>
          <td data-label="Purpose">${l.purpose||'—'}</td>
          <td data-label="AI Risk"><span class="badge ${riskCls}">${l.ai_risk||'N/A'}</span></td>
          <td data-label="Decision"><span class="badge ${decisionCls}">${l.ai_decision||'N/A'}</span></td>
          <td data-label="AI Score">${l.ai_score != null ? l.ai_score + '%' : '—'}</td>
          <td data-label="Status"><span class="badge ${l.status === 'Approved'||l.status==='Disbursed'?'badge-success':l.status==='Declined'?'badge-danger':'badge-warning'}">${l.status||'—'}</span></td>
          <td data-label="Date" style="font-size:12px;color:#94a3b8;">${l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>
    </div>
  `;
  lucide.createIcons();
}

// ---- NOTIFICATIONS (ADMIN) ----
function renderNotifications(){
  const container = document.getElementById('notifContent');
  const notes = [];

  dbLoans.forEach(l => {
    const name = l.applicant || 'Unknown';
    if(l.status === 'Pending'){
      notes.push({ icon:'file-plus', color:'#3b82f6', title:'New Loan Application', desc:`${name} applied for $${Number(l.amount).toLocaleString()} (${l.purpose||'—'}).`, time: l.created_at });
    }
    if(l.status === 'Approved' || l.status === 'Disbursed'){
      notes.push({ icon:'check-circle', color:'#16a34a', title:`Loan ${l.status}`, desc:`${name}'s loan of $${Number(l.amount).toLocaleString()} has been ${l.status.toLowerCase()}.`, time: l.created_at });
    }
    if(l.status === 'Declined'){
      notes.push({ icon:'x-circle', color:'#dc2626', title:'Loan Declined', desc:`${name}'s loan of $${Number(l.amount).toLocaleString()} was declined.`, time: l.created_at });
    }
    if(l.ai_reason){
      notes.push({ icon:'brain', color:'#8b5cf6', title:'AI Assessment Completed', desc:`${name}: ${l.ai_reason}`, time: l.created_at });
    }
  });

  dbDocs.forEach(d => {
    if(d.status === 'Verified'){
      notes.push({ icon:'shield-check', color:'#16a34a', title:'Document Verified', desc:`${d.document_type} from user ${d.user_id} approved.`, time: d.updated_at || d.uploaded_at });
    }
    if(d.status === 'Rejected'){
      notes.push({ icon:'shield-off', color:'#dc2626', title:'Document Rejected', desc:`${d.document_type} from user ${d.user_id} rejected.`, time: d.updated_at || d.uploaded_at });
    }
    if(d.status === 'Pending'){
      notes.push({ icon:'clock', color:'#f59e0b', title:'Document Uploaded', desc:`${d.document_type} from user ${d.user_id} awaiting verification.`, time: d.uploaded_at });
    }
  });

  notes.sort((a, b) => new Date(b.time||0) - new Date(a.time||0));

  if(!notes.length){
    container.innerHTML = '<div class="empty-state"><i data-lucide="bell" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No notifications</p></div>';
    lucide.createIcons();
    return;
  }
  container.innerHTML = notes.map(n => `
    <div class="notif-item" style="display:flex;align-items:flex-start;gap:12px;padding:12px;border-bottom:1px solid #e2e8f0;">
      <i data-lucide="${n.icon}" style="width:20px;height:20px;color:${n.color};flex-shrink:0;margin-top:2px;"></i>
      <div style="flex:1;">
        <strong style="font-size:14px;color:#1e293b;">${n.title}</strong>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b;">${n.desc}</p>
      </div>
      <span style="font-size:11px;color:#94a3b8;white-space:nowrap;">${n.time ? new Date(n.time).toLocaleDateString() : ''}</span>
    </div>
  `).join('');
  lucide.createIcons();
}

// ---- SMART CONTRACTS ----
function renderContracts(){
  const container = document.getElementById('contractsContent');
  const userMap = {};
  dbUsers.forEach(u => { userMap[u.user_id] = u.full_name || u.name || u.email || '—'; });

  const total = dbLoans.length;
  const active = dbLoans.filter(l => l.status === 'Approved' || l.status === 'Disbursed').length;
  const completed = dbLoans.filter(l => l.status === 'Disbursed').length;
  const disputed = dbLoans.filter(l => l.status === 'Pending' && l.ai_risk === 'High').length;

  const summaryHtml = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;">
      <div class="card" style="padding:16px;border-left:4px solid #3b82f6;">
        <div style="font-size:24px;font-weight:700;color:#3b82f6;">${total}</div>
        <div style="font-size:13px;color:#64748b;">Total Contracts</div>
      </div>
      <div class="card" style="padding:16px;border-left:4px solid #16a34a;">
        <div style="font-size:24px;font-weight:700;color:#16a34a;">${active}</div>
        <div style="font-size:13px;color:#64748b;">Active</div>
      </div>
      <div class="card" style="padding:16px;border-left:4px solid #6366f1;">
        <div style="font-size:24px;font-weight:700;color:#6366f1;">${completed}</div>
        <div style="font-size:13px;color:#64748b;">Completed (Disbursed)</div>
      </div>
      <div class="card" style="padding:16px;border-left:4px solid #dc2626;">
        <div style="font-size:24px;font-weight:700;color:#dc2626;">${disputed}</div>
        <div style="font-size:13px;color:#64748b;">Flagged / Disputed</div>
      </div>
    </div>
  `;

  if(!dbLoans.length){
    container.innerHTML = summaryHtml + '<div class="empty-state"><i data-lucide="file-code" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No smart contracts deployed</p></div>';
    lucide.createIcons();
    return;
  }

  const contractStatus = (l) => {
    if(l.status === 'Disbursed') return { label:'Completed', cls:'badge-success' };
    if(l.status === 'Approved') return { label:'Active', cls:'badge-success' };
    if(l.status === 'Declined') return { label:'Void', cls:'badge-danger' };
    if(l.ai_risk === 'High') return { label:'Flagged', cls:'badge-danger' };
    return { label:'Draft', cls:'badge-warning' };
  };

  container.innerHTML = summaryHtml + `
    <div style="overflow-x:auto;">
    <table class="data-table">
      <thead><tr><th>Contract ID</th><th>Party</th><th>Amount</th><th>Terms</th><th>Status</th><th>Risk Level</th><th>Date</th></tr></thead>
      <tbody>${dbLoans.map(l => {
        const cs = contractStatus(l);
        const riskCls = l.ai_risk === 'High' ? 'badge-danger' : l.ai_risk === 'Medium' ? 'badge-warning' : l.ai_risk === 'Low' ? 'badge-success' : 'badge-info';
        return `<tr>
          <td data-label="Contract ID" style="font-family:monospace;font-size:12px;">#${String(l.id).slice(0,8)}</td>
          <td data-label="Party"><strong>${l.applicant || userMap[l.user_id] || '—'}</strong></td>
          <td data-label="Amount">$${Number(l.amount).toLocaleString()}</td>
          <td data-label="Terms">${l.term||l.repayment_period||'—'}</td>
          <td data-label="Status"><span class="badge ${cs.cls}">${cs.label}</span></td>
          <td data-label="Risk Level"><span class="badge ${riskCls}">${l.ai_risk||'N/A'}</span></td>
          <td data-label="Date" style="font-size:12px;color:#94a3b8;">${l.created_at ? new Date(l.created_at).toLocaleDateString() : '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>
    </div>
  `;
  lucide.createIcons();
}

// ---- PAYMENTS ----
async function renderPayments(){
  const { data: freshPayments } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'loan_repayment')
    .order('created_at', { ascending: false });

  dbPayments = freshPayments || [];

  const [usersRes, loansRes] = await Promise.all([
    supabase.from('profiles').select('*'),
    supabase.from('loan_applications').select('*')
  ]);
  dbUsers = usersRes.data || [];
  dbLoans = loansRes.data || [];

  document.getElementById('statCollected').textContent = '$' + dbPayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString();
  document.getElementById('statPayCount').textContent = dbPayments.length;

  const tbody = document.getElementById('paymentTable');
  const userMap = {};
  dbUsers.forEach(u => { userMap[u.user_id] = u.full_name || u.name || u.email || 'Unknown'; });

  const loanMap = {};
  dbLoans.forEach(l => { loanMap[l.id] = l; });

  if(!dbPayments.length){
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><i data-lucide="wallet" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No payments recorded yet</p><div class="sub">User repayments will appear here</div></td></tr>';
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = dbPayments.map(p => {
    const loan = loanMap[p.loan_id] || {};
    const userName = loan.user_id ? (userMap[loan.user_id] || 'Unknown') : '—';
    const remaining = loan.remaining_balance ? '$' + Number(loan.remaining_balance).toLocaleString() : '—';
    const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString() + ' ' + new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—';
    return `<tr>
      <td data-label="User"><strong>${userName}</strong></td>
      <td data-label="Loan Amount">$${Number(loan.amount || 0).toLocaleString()}</td>
      <td data-label="Payment Amount"><strong style="color:#16a34a;">-$${Number(p.amount).toLocaleString()}</strong></td>
      <td data-label="Remaining Balance">${remaining}</td>
      <td data-label="Reference" style="font-size:12px;">${p.reference || '—'}</td>
      <td data-label="Date" style="font-size:12px;color:#94a3b8;">${dateStr}</td>
    </tr>`;
  }).join('');
  lucide.createIcons();
}

fetch('/api/admin/config').then(r=>r.json()).then(c=>{if(c.email)ADMIN_EMAIL=c.email}).catch(()=>{});
initAdmin();
