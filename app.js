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

  document.getElementById('authMessage').innerHTML = '<p style="color:green;">Registration Sucessful!</p>';
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
}

window.logout = async function(){
  const { error } = await supabase.auth.signOut();
  if(!error){
    document.getElementById('dashboardPage').classList.add('hidden');
    document.getElementById('authPage').classList.remove('hidden');
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

  const { data: loans, error } = await supabase
    .from('loan_applications')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  const container = document.getElementById('repaymentContent');

  if(error || !loans || !loans.length){
    container.innerHTML = '<div class="empty-state"><i data-lucide="wallet" style="width:32px;height:32px;color:#cbd5e1;"></i><p>No loan applications yet.</p><div class="sub">Apply for a loan to see your repayment status here.</div></div>';
    try { lucide.createIcons(); } catch(e) {}
    return;
  }

  container.innerHTML = loans.map(loan => {
    const statusCls = loan.status === 'Disbursed' || loan.status === 'Approved' ? 'badge-success' : loan.status === 'Declined' ? 'badge-danger' : 'badge-warning';
    const dateStr = loan.created_at ? new Date(loan.created_at).toLocaleDateString() : '—';
    const incomeStr = loan.monthly_income ? '$' + Number(loan.monthly_income).toLocaleString() : '—';
    const isActive = loan.status === 'Approved' || loan.status === 'Disbursed';

    return `<div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <strong style="font-size:16px;color:#1e3a8a;">Loan $${Number(loan.amount).toLocaleString()}</strong>
        <span class="badge ${statusCls}">${loan.status}</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px;">
        <div class="status"><span style="color:#64748b;">Purpose:</span> ${loan.purpose || '—'}</div>
        <div class="status"><span style="color:#64748b;">Monthly Income:</span> ${incomeStr}</div>
        <div class="status"><span style="color:#64748b;">Repayment Period:</span> ${loan.repayment_period || '—'}</div>
        <div class="status"><span style="color:#64748b;">Applied:</span> ${dateStr}</div>
      </div>
      ${isActive ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:13px;color:#16a34a;display:flex;align-items:center;gap:6px;"><i data-lucide="check-circle" style="width:14px;height:14px;"></i> Smart Contract: ACTIVE — Repayment tracking enabled</div>` : ''}
    </div>`;
  }).join('');
  try { lucide.createIcons(); } catch(e) {}
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

  let { data: profile } = await supabase.from('profiles').select('*').eq('user_id', session.user.id).single();
  if(!profile){
    const { data: newProfile } = await supabase.from('profiles').insert({
      user_id: session.user.id,
      full_name: session.user.user_metadata?.full_name || '',
      email: session.user.email
    }).select().single();
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
      <label style="font-size:13px;font-weight:600;color:#475569;margin-top:12px;display:block;">Residential Address</label>
      <input id="profileAddress" value="${profile.residential_address || ''}" placeholder="Enter your address">
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
  const address = document.getElementById('profileAddress').value.trim();
  if(!name) return document.getElementById('profileSaveMsg').textContent = 'Name is required.';
  const { error } = await supabase.from('profiles').update({
    full_name: name, phone: phone || null, residential_address: address || null
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
    phone,
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
    msg += '\n\nCould not upload: ' + uploadErrors.join(', ') + '.\nMake sure the storage bucket exists in your Supabase project.';
  }
  alert(msg);
}

initApp();
