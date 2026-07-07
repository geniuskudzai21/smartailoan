import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase = createClient(
'https://ozkcpvlutmupqblfzcro.supabase.co',
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96a2Nwdmx1dG11cHFibGZ6Y3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNDI2NDgsImV4cCI6MjA5NzkxODY0OH0.7aSDXDTvY3A5izw0lU_KUmiQSKtaYA0xPSyQ4kYqOyQ'
);

async function loadFragment(url) {
  const res = await fetch(url);
  return res.text();
}

async function initApp() {
  const [welcomeHtml, authHtml, dashboardHtml] = await Promise.all([
    loadFragment('pages/welcome.html'),
    loadFragment('pages/auth.html'),
    loadFragment('pages/dashboard.html'),
  ]);
  document.getElementById('app').innerHTML = welcomeHtml + authHtml + dashboardHtml;
  lucide.createIcons();
  checkSession();
  applyTheme();
  setTimeout(typeWriter, 500);
}

function typeWriter() {
  const el = document.getElementById('typing-text');
  if(!el) return;
  const text = el.getAttribute('data-text');
  if(!text) return;
  el.textContent = '';
  let i = 0;
  function type() {
    if(i < text.length){
      el.textContent += text.charAt(i);
      i++;
      const delay = text.charAt(i-1) === '.' || text.charAt(i-1) === ',' || text.charAt(i-1) === '—' ? 120 : 30;
      setTimeout(type, delay);
    } else {
      el.innerHTML += '<span class="cursor">|</span>';
    }
  }
  type();
}

window.checkSession = async function(){
  const { data: { session } } = await supabase.auth.getSession();
  if(session){
    document.getElementById('welcomePage').classList.add('hidden');
    document.getElementById('authPage').classList.add('hidden');
    document.getElementById('dashboardPage').classList.remove('hidden');
    document.getElementById('sidebarUser').textContent = session.user.user_metadata?.full_name || session.user.email;
  }
}

window.openAuth = function(){
  document.getElementById('welcomePage').classList.add('hidden');
  document.getElementById('authPage').classList.remove('hidden');
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById('authMessage').innerHTML = '';
}

window.goHome = function(){
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('welcomePage').classList.remove('hidden');
}

window.showLogin = function(){
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById('authMessage').innerHTML = '';
}

window.showRegister = function(){
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('registerForm').classList.remove('hidden');
  document.getElementById('authMessage').innerHTML = '';
}

window.registerUser = async function(){
  const fullname = document.getElementById('fullname').value;
  const contact = document.getElementById('regContact').value;
  const password = document.getElementById('regPassword').value;

  if(!fullname || !contact || !password){
    document.getElementById('authMessage').innerHTML = '<p style="color:red;">Please complete all fields.</p>';
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email: contact,
    password,
    options: { data: { full_name: fullname } }
  });

  if(error){
    document.getElementById('authMessage').innerHTML = '<p style="color:red;">' + error.message + '</p>';
    return;
  }

  const userId = data.user?.id;
  if(userId){
    await supabase.from('profiles').insert({
      user_id: userId,
      full_name: fullname,
      email: contact,
    }).catch(() => {});
  }

  showToast('Account created successfully! Please sign in.', 'success');
  document.getElementById('authMessage').innerHTML = '<p style="color:green;">Registration Successful! Redirecting...</p>';
  setTimeout(() => showLogin(), 2000);
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
    background: type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb',
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

window.loginUser = async function(){
  const contact = document.getElementById('contact').value;
  const password = document.getElementById('password').value;

  if(!contact || !password){
    document.getElementById('authMessage').innerHTML = '<p style="color:red;">Please enter email and password.</p>';
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: contact,
    password
  });

  if(error){
    document.getElementById('authMessage').innerHTML = '<p style="color:red;">' + error.message + '</p>';
    return;
  }

  if(contact === 'admin@smartloan.com'){
    window.location.href = 'admin.html';
    return;
  }

  const name = data.user?.user_metadata?.full_name || data.user?.email || contact;
  document.getElementById('sidebarUser').textContent = name;
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('dashboardPage').classList.remove('hidden');

  const userId = data.user?.id;
  if(userId){
    await supabase.from('profiles').upsert({
      user_id: userId,
      full_name: name,
      email: data.user.email,
    }, { onConflict: 'user_id' }).catch(() => {});
  }
}

window.logout = async function(){
  const { error } = await supabase.auth.signOut();
  if(!error){
    document.getElementById('dashboardPage').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
  }
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
  document.getElementById(id).classList.remove('hidden');
  closeSidebar();
  if(id === 'repayment') renderRepayment();
  if(id === 'notifications') renderNotifications();
  if(id === 'profile') renderProfile();
}

window.renderRepayment = async function(){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session) return;

  const [loansRes, paymentsRes] = await Promise.all([
    supabase.from('loan_applications').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
    supabase.from('transactions').select('*').eq('user_id', session.user.id).eq('type', 'loan_repayment').order('created_at', { ascending: false })
  ]);

  const loans = loansRes.data || [];
  const payments = paymentsRes.data || [];
  const container = document.getElementById('repaymentContent');

  if(!loans.length){
    container.innerHTML = '<div class="empty-state"><i data-lucide="wallet" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No loan applications yet.</p><div class="sub">Apply for a loan to see your repayment status here.</div></div>';
    try { lucide.createIcons(); } catch(e) {}
    return;
  }

  const activeLoans = loans.filter(l => l.status === 'Approved' || l.status === 'Disbursed');
  const otherLoans = loans.filter(l => l.status !== 'Approved' && l.status !== 'Disbursed');

  let html = '';

  if(activeLoans.length){
    const totalRemaining = activeLoans.reduce((s, l) => s + Number(l.remaining_balance || l.amount), 0);
    const totalAmount = activeLoans.reduce((s, l) => s + Number(l.amount), 0);

    html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:16px;">
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:12px;">
        <div style="font-size:11px;color:#166534;">Outstanding Balance</div>
        <div style="font-size:20px;font-weight:700;color:#16a34a;">$${totalRemaining.toLocaleString()}</div>
      </div>
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:12px;">
        <div style="font-size:11px;color:#1e40af;">Total Borrowed</div>
        <div style="font-size:20px;font-weight:700;color:#2563eb;">$${totalAmount.toLocaleString()}</div>
      </div>
    </div>`;

    activeLoans.forEach(loan => {
      const remaining = Number(loan.remaining_balance || loan.amount);
      const total = Number(loan.amount);
      const paid = total - remaining;
      const pct = total > 0 ? Math.round((paid / total) * 100) : 0;
      const months = parseInt(loan.repayment_period) || 1;
      const monthlyEst = total / months;
      const dateStr = loan.created_at ? new Date(loan.created_at).toLocaleDateString() : '—';

      html += `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:12px;" id="loan-card-${loan.id}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="font-size:16px;color:#1e3a8a;">Loan $${total.toLocaleString()}</strong>
          <span class="badge badge-success">${loan.status}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
          <div><span style="color:#64748b;">Remaining:</span> <strong>$${remaining.toLocaleString()}</strong></div>
          <div><span style="color:#64748b;">Monthly Est:</span> <strong>$${monthlyEst.toFixed(2)}</strong></div>
          <div><span style="color:#64748b;">Period:</span> ${loan.repayment_period || '—'}</div>
          <div><span style="color:#64748b;">Applied:</span> ${dateStr}</div>
        </div>
        <div style="margin:12px 0 4px;">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:4px;">
            <span>Repayment Progress</span>
            <span>${pct}%</span>
          </div>
          <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
            <div style="background:${pct >= 100 ? '#16a34a' : '#3b82f6'};width:${pct}%;height:100%;border-radius:99px;transition:width .3s;"></div>
          </div>
        </div>
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;">
          <button onclick="makePayment('${loan.id}')" style="padding:8px 16px;font-size:13px;background:#16a34a;color:white;border:none;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
            <i data-lucide="wallet" style="width:14px;height:14px;"></i> Make Payment
          </button>
          <div id="payment-form-${loan.id}" class="hidden" style="margin-top:12px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
            <label style="font-size:13px;font-weight:600;color:#475569;">Payment Amount ($)</label>
            <div style="display:flex;gap:8px;margin-top:6px;">
              <input id="payment-amount-${loan.id}" type="number" min="1" step="0.01" max="${remaining}" value="${Math.min(monthlyEst, remaining).toFixed(2)}" style="flex:1;">
              <button onclick="submitPayment('${loan.id}')" style="padding:8px 16px;font-size:13px;background:#2563eb;color:white;border:none;border-radius:8px;cursor:pointer;">Pay</button>
              <button onclick="document.getElementById('payment-form-${loan.id}').classList.add('hidden')" style="padding:8px 12px;font-size:13px;background:#94a3b8;color:white;border:none;border-radius:8px;cursor:pointer;">Cancel</button>
            </div>
            <div id="payment-msg-${loan.id}" style="margin-top:6px;font-size:12px;"></div>
          </div>
        </div>
      </div>`;
    });
  }

  if(otherLoans.length){
    html += `<h3 style="margin:16px 0 12px;font-size:15px;color:#1e293b;display:flex;align-items:center;gap:8px;"><i data-lucide="clock" style="width:16px;height:16px;color:#f59e0b;"></i> Other Applications</h3>`;
    otherLoans.forEach(loan => {
      const statusCls = loan.status === 'Declined' ? 'badge-danger' : 'badge-warning';
      const dateStr = loan.created_at ? new Date(loan.created_at).toLocaleDateString() : '—';
      html += `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <strong style="font-size:16px;color:#1e3a8a;">Loan $${Number(loan.amount).toLocaleString()}</strong>
          <span class="badge ${statusCls}">${loan.status}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
          <div><span style="color:#64748b;">Purpose:</span> ${loan.purpose || '—'}</div>
          <div><span style="color:#64748b;">Period:</span> ${loan.repayment_period || '—'}</div>
          <div><span style="color:#64748b;">Applied:</span> ${dateStr}</div>
        </div>
      </div>`;
    });
  }

  if(payments.length){
    html += `<h3 style="margin:16px 0 12px;font-size:15px;color:#1e293b;display:flex;align-items:center;gap:8px;"><i data-lucide="refresh-cw" style="width:16px;height:16px;color:#64748b;"></i> Payment History</h3>`;
    html += `<div style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">`;
    payments.forEach(p => {
      const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString() + ' ' + new Date(p.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—';
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;">
        <div>
          <strong style="color:#16a34a;">-$${Number(p.amount).toLocaleString()}</strong>
          <span style="color:#64748b;margin-left:8px;font-size:12px;">${p.reference || 'Loan Repayment'}</span>
        </div>
        <span style="font-size:12px;color:#94a3b8;">${dateStr}</span>
      </div>`;
    });
    html += `</div>`;
  }

  container.innerHTML = html;
  try { lucide.createIcons(); } catch(e) {}
}

window.makePayment = function(loanId){
  const form = document.getElementById('payment-form-' + loanId);
  if(form) form.classList.toggle('hidden');
}

window.submitPayment = async function(loanId){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session) return;

  const amountInput = document.getElementById('payment-amount-' + loanId);
  const msgEl = document.getElementById('payment-msg-' + loanId);
  const amount = parseFloat(amountInput.value);

  if(!amount || amount <= 0){
    msgEl.innerHTML = '<span style="color:#dc2626;">Please enter a valid amount.</span>';
    return;
  }

  const { data: loan, error: loanErr } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('id', loanId)
    .single();

  if(loanErr || !loan){
    msgEl.innerHTML = '<span style="color:#dc2626;">Loan not found.</span>';
    return;
  }

  const remaining = Number(loan.remaining_balance || loan.amount);
  if(amount > remaining){
    msgEl.innerHTML = '<span style="color:#dc2626;">Amount exceeds remaining balance of $' + remaining.toLocaleString() + '.</span>';
    return;
  }

  const newRemaining = remaining - amount;

  const { error: txnErr } = await supabase.from('transactions').insert({
    user_id: session.user.id,
    loan_id: loanId,
    type: 'loan_repayment',
    amount: amount,
    reference: 'Repayment - Loan #' + loanId.slice(0,8),
    status: 'Completed'
  });

  if(txnErr){
    msgEl.innerHTML = '<span style="color:#dc2626;">Error recording payment: ' + txnErr.message + '</span>';
    return;
  }

  const { error: updateErr } = await supabase
    .from('loan_applications')
    .update({ remaining_balance: newRemaining })
    .eq('id', loanId);

  if(updateErr){
    msgEl.innerHTML = '<span style="color:#dc2626;">Error updating balance: ' + updateErr.message + '</span>';
    return;
  }

  msgEl.innerHTML = '<span style="color:#16a34a;">Payment successful! $' + amount.toLocaleString() + ' paid. Remaining: $' + newRemaining.toLocaleString() + '</span>';
  amountInput.value = '';
  document.getElementById('payment-form-' + loanId).classList.add('hidden');

  setTimeout(() => renderRepayment(), 1500);
}

window.renderNotifications = async function(){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session) return;

  const { data: loans, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('notificationContent');

  if(error || !loans || !loans.length){
    container.innerHTML = '<div class="empty-state"><i data-lucide="bell" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No notifications yet.</p><div class="sub">Apply for a loan to receive status updates here.</div></div>';
    try { lucide.createIcons(); } catch(e) {}
    return;
  }

  const hasUpdates = loans.some(l => l.status !== 'Pending');

  if(!hasUpdates){
    container.innerHTML = '<div class="empty-state"><i data-lucide="bell" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No notifications yet.</p><div class="sub">Your loan applications are pending review. Check back for updates.</div></div>';
    try { lucide.createIcons(); } catch(e) {}
    return;
  }

  container.innerHTML = loans.map(loan => {
    const dateStr = loan.created_at ? new Date(loan.created_at).toLocaleDateString() : '';
    let icon, iconColor, title, reason;

    if(loan.status === 'Approved'){
      icon = 'check-circle';
      iconColor = '#22c55e';
      title = 'Loan Approved';
      reason = loan.ai_reason || 'Your loan application has been approved.';
    } else if(loan.status === 'Disbursed'){
      icon = 'landmark';
      iconColor = '#3b82f6';
      title = 'Loan Disbursed';
      reason = loan.ai_reason || 'Your loan has been disbursed successfully.';
    } else if(loan.status === 'Declined'){
      icon = 'x-circle';
      iconColor = '#ef4444';
      title = 'Loan Declined';
      reason = loan.ai_reason || 'Your loan application was not approved.';
    } else {
      icon = 'clock';
      iconColor = '#f59e0b';
      title = 'Loan Submitted';
      reason = 'Your application is pending review.';
    }

    return `<div class="notification">
      <i data-lucide="${icon}" style="color:${iconColor};width:16px;height:16px;flex-shrink:0;"></i>
      <div style="flex:1;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <strong>${title}</strong>
          <span style="font-size:11px;color:#94a3b8;">${dateStr}</span>
        </div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;">
          $${Number(loan.amount).toLocaleString()} — ${reason}
        </div>
      </div>
    </div>`;
  }).join('');
  try { lucide.createIcons(); } catch(e) {}
}

window.renderProfile = async function(){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session) return;

  const { data: profile, error: fetchErr } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).single();
  if(fetchErr && fetchErr.code !== 'PGRST116'){
    document.getElementById('profileContent').innerHTML = `<div class="empty-state"><p style="color:#dc2626;">Error loading profile: ${fetchErr.message}</p></div>`;
    return;
  }

  if(!profile){
    const { data: newProfile, error: insertErr } = await supabase.from('profiles').insert({
      user_id: session.user.id,
      full_name: session.user.user_metadata?.full_name || '',
      email: session.user.email
    }).select().single();
    if(insertErr){
      document.getElementById('profileContent').innerHTML = `<div class="empty-state"><p style="color:#dc2626;">Could not create profile: ${insertErr.message}</p></div>`;
      return;
    }
    profile = newProfile;
  }

  const container = document.getElementById('profileContent');
  container.innerHTML = `
    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 16px;color:#1e3a8a;font-size:16px;display:flex;align-items:center;gap:8px;"><i data-lucide="user" style="width:18px;height:18px;"></i> Personal Information</h3>
      <label style="font-size:13px;font-weight:600;color:#475569;">Full Name</label>
      <input id="profileName" value="${profile.full_name || ''}" placeholder="Enter your full name">
      <label style="font-size:13px;font-weight:600;color:#475569;margin-top:12px;display:block;">Email</label>
      <input id="profileEmail" value="${profile.email || session.user.email || ''}" placeholder="Email address" disabled style="background:#f1f5f9;cursor:not-allowed;">
      <label style="font-size:13px;font-weight:600;color:#475569;margin-top:12px;display:block;">Phone</label>
      <input id="profilePhone" value="${profile.phone || ''}" placeholder="Enter phone number" type="tel">
      <button onclick="saveProfile()" style="margin-top:16px;"><i data-lucide="save"></i> Save Changes</button>
      <span id="profileSaveMsg" style="margin-left:12px;font-size:13px;"></span>
    </div>

    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
      <h3 style="margin:0 0 16px;color:#1e3a8a;font-size:16px;display:flex;align-items:center;gap:8px;"><i data-lucide="lock" style="width:18px;height:18px;"></i> Change Password</h3>
      <label style="font-size:13px;font-weight:600;color:#475569;">Current Password</label>
      <input id="currentPass" type="password" placeholder="Enter current password">
      <label style="font-size:13px;font-weight:600;color:#475569;margin-top:12px;display:block;">New Password</label>
      <input id="newPass" type="password" placeholder="Enter new password (min 6 characters)">
      <label style="font-size:13px;font-weight:600;color:#475569;margin-top:12px;display:block;">Confirm New Password</label>
      <input id="confirmPass" type="password" placeholder="Confirm new password">
      <button onclick="changePassword()" style="margin-top:16px;"><i data-lucide="key"></i> Update Password</button>
      <span id="passMsg" style="margin-left:12px;font-size:13px;"></span>
    </div>

    <div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
      <h3 style="margin:0 0 16px;color:#1e3a8a;font-size:16px;display:flex;align-items:center;gap:8px;"><i data-lucide="bell" style="width:18px;height:18px;"></i> Notification Preferences</h3>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-size:14px;font-weight:500;">
          <input type="checkbox" id="notifyEmail" ${profile.notify_email !== false ? 'checked' : ''} style="width:18px;height:18px;margin:0;"> Email Notifications (loan updates, offers)
        </label>
        <label style="display:flex;align-items:center;gap:12px;cursor:pointer;font-size:14px;font-weight:500;">
          <input type="checkbox" id="notifySms" ${profile.notify_sms !== false ? 'checked' : ''} style="width:18px;height:18px;margin:0;"> SMS Notifications (payment reminders, alerts)
        </label>
      </div>
      <button onclick="saveNotificationPrefs()" style="margin-top:16px;"><i data-lucide="save"></i> Save Preferences</button>
      <span id="prefMsg" style="margin-left:12px;font-size:13px;"></span>
    </div>
  `;
  try { lucide.createIcons(); } catch(e) {}
}

window.saveProfile = async function(){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session) return;
  const name = document.getElementById('profileName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  if(!name) return document.getElementById('profileSaveMsg').textContent = 'Name is required.';
  const { error } = await supabase.from('profiles').update({
    full_name: name, phone: phone || null
  }).eq('user_id', session.user.id);
  const msg = document.getElementById('profileSaveMsg');
  if(error){ msg.innerHTML = '<span style="color:#dc2626;">Error: ' + error.message + '</span>'; return; }
  document.getElementById('sidebarUser').textContent = name;
  msg.innerHTML = '<span style="color:#16a34a;">Profile updated successfully!</span>';
  setTimeout(() => msg.innerHTML = '', 3000);
}

window.changePassword = async function(){
  const current = document.getElementById('currentPass').value;
  const newPass = document.getElementById('newPass').value;
  const confirm = document.getElementById('confirmPass').value;
  const msg = document.getElementById('passMsg');
  if(!current || !newPass || !confirm) return msg.innerHTML = '<span style="color:#dc2626;">Please fill all password fields.</span>';
  if(newPass.length < 6) return msg.innerHTML = '<span style="color:#dc2626;">New password must be at least 6 characters.</span>';
  if(newPass !== confirm) return msg.innerHTML = '<span style="color:#dc2626;">Passwords do not match.</span>';
  const { error } = await supabase.auth.updateUser({ password: newPass });
  if(error) return msg.innerHTML = '<span style="color:#dc2626;">Error: ' + error.message + '</span>';
  document.getElementById('currentPass').value = '';
  document.getElementById('newPass').value = '';
  document.getElementById('confirmPass').value = '';
  msg.innerHTML = '<span style="color:#16a34a;">Password updated successfully!</span>';
  setTimeout(() => msg.innerHTML = '', 3000);
}

window.saveNotificationPrefs = async function(){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session) return;
  const email = document.getElementById('notifyEmail').checked;
  const sms = document.getElementById('notifySms').checked;
  const { error } = await supabase.from('profiles').update({
    notify_email: email, notify_sms: sms
  }).eq('user_id', session.user.id);
  const msg = document.getElementById('prefMsg');
  if(error){ msg.innerHTML = '<span style="color:#dc2626;">Error: ' + error.message + '</span>'; return; }
  msg.innerHTML = '<span style="color:#16a34a;">Preferences saved!</span>';
  setTimeout(() => msg.innerHTML = '', 3000);
}

window.submitLoan = async function(){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session) return alert('Please login first.');

  const amount = document.getElementById('loanAmount').value;
  const phone = document.getElementById('loanPhone').value;
  const purpose = document.getElementById('loanPurpose').value;
  const date = document.getElementById('loanDate').value;
  const income = document.getElementById('loanIncome').value;
  const employment = document.getElementById('loanEmployment').value;
  const period = document.getElementById('loanPeriod').value;

  if(!amount || !phone || !purpose || !income || !employment || !period){
    return alert('Please complete all required fields.');
  }

  const { error: loanErr } = await supabase.from('loan_applications').insert({
    user_id: session.user.id,
    amount: parseFloat(amount),
    purpose,
    monthly_income: parseFloat(income),
    employment_status: employment,
    repayment_period: period
  });

  if(loanErr) return alert('Error: ' + loanErr.message);

  const kycFields = [
    {id:'kycNationalId', type:'National ID'},
    {id:'kycPayslip', type:'Payslip'},
    {id:'kycUtility', type:'Utility Bill'},
    {id:'kycInsurance', type:'Insurance Documents'},
    {id:'kycBank', type:'Bank Statements'},
  ];

  let uploadErrors = [];

  const hasFiles = kycFields.some(f => document.getElementById(f.id)?.files?.[0]);
  if(hasFiles){
    await supabase.storage.createBucket('user-documents', { public: true }).catch(() => {});
  }

  for(const field of kycFields){
    const fileInput = document.getElementById(field.id);
    const file = fileInput?.files?.[0];
    if(!file) continue;

    const filePath = `${session.user.id}/${field.type}_${Date.now()}`;
    const { error: uploadErr } = await supabase.storage.from('user-documents').upload(filePath, file);
    if(uploadErr){
      uploadErrors.push(field.type);
      continue;
    }

    const { data: { publicUrl } } = supabase.storage.from('user-documents').getPublicUrl(filePath);

    await supabase.from('user_documents').insert({
      user_id: session.user.id,
      document_type: field.type,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      status: 'Pending'
    });
  }

  document.getElementById('loanAmount').value = '';
  document.getElementById('loanPhone').value = '';
  document.getElementById('loanPurpose').selectedIndex = 0;
  document.getElementById('loanDate').value = '';
  document.getElementById('loanIncome').value = '';
  document.getElementById('loanEmployment').selectedIndex = 0;
  document.getElementById('loanPeriod').selectedIndex = 0;
  for(const field of kycFields){
    document.getElementById(field.id).value = '';
  }

  let msg = 'Loan application submitted successfully!';
  if(uploadErrors.length){
    msg = 'Submitted but some documents failed to upload: ' + uploadErrors.join(', ');
    showToast(msg, 'error');
  } else {
    showToast('Loan application submitted successfully!', 'success');
  }
}

initApp();
