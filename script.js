const BACKEND_URL = 'http://localhost:3000/api';

// UI Elements
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const signinBox = document.getElementById('signin-box');
const signupBox = document.getElementById('signup-box');

// Swap Forms
document.getElementById('swapToSignup').addEventListener('click', (e) => { e.preventDefault(); signinBox.style.display='none'; signupBox.style.display='block'; });
document.getElementById('swapToSignin').addEventListener('click', (e) => { e.preventDefault(); signupBox.style.display='none'; signinBox.style.display='block'; });

function showStatus(id, msg, isError = false) {
  const el = document.getElementById(id);
  if(!el) return;
  el.textContent = msg;
  el.className = `status-msg ${isError ? 'msg-error' : 'msg-success'}`;
}

// 1. SIGN UP
document.getElementById('demoSignupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('demoUpName').value,
        phone: document.getElementById('demoUpPhone').value,
        email: document.getElementById('demoUpEmail').value,
        password: document.getElementById('demoUpPass').value,
        role: document.getElementById('demoUpRole').value
      })
    });
    const data = await res.json();
    if (res.ok) { 
        showStatus('demoSignupStatus', 'Account Created! Please Sign In.'); 
        document.getElementById('demoSignupForm').reset(); 
    } else { 
        showStatus('demoSignupStatus', data.error || data.message, true); 
    }
  } catch (err) { showStatus('demoSignupStatus', 'Server Error.', true); }
});

// 2. SIGN IN
document.getElementById('demoSigninForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`${BACKEND_URL}/auth/signin`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: document.getElementById('demoInIdentifier').value,
        password: document.getElementById('demoInPass').value
      })
    });
    const data = await res.json();
    
    if (res.ok) {
      // Save data & Update Header
      localStorage.setItem('k_id', data.user._id);
      document.getElementById('loggedName').textContent = data.user.name;
      document.getElementById('loggedRole').textContent = data.user.role;
      document.getElementById('loggedId').textContent = data.user._id;

      // Switch from Auth view to App view
      authView.style.display = 'none';
      appView.style.display = 'block';

      // --- ROLE-BASED ROUTING ---
      // Hide all specific role views first
      document.getElementById('customer-view').style.display = 'none';
      document.getElementById('provider-view').style.display = 'none';
      document.getElementById('admin-view').style.display = 'none';

      if (data.user.role === 'customer') {
          document.getElementById('customer-view').style.display = 'block';
          
      } else if (data.user.role === 'provider') {
          document.getElementById('provider-view').style.display = 'block';

          // Auto-fill NID form if they are unverified
          if(document.getElementById('demoNidUserId')) {
              document.getElementById('demoNidUserId').value = data.user._id;
          }

          // Check current NID status safely
          const nidStatus = (data.user.nidVerification && data.user.nidVerification.status) 
                            ? data.user.nidVerification.status 
                            : 'unverified';

          // Hide all provider sub-states
          document.getElementById('prov-unverified').style.display = 'none';
          document.getElementById('prov-pending').style.display = 'none';
          document.getElementById('prov-verified').style.display = 'none';
          document.getElementById('prov-rejected').style.display = 'none';

          // Show the correct provider state based on their database status
          if (nidStatus === 'verified') {
              document.getElementById('prov-verified').style.display = 'block';
          } else if (nidStatus === 'pending') {
              document.getElementById('prov-pending').style.display = 'block';
          } else if (nidStatus === 'rejected') {
              document.getElementById('prov-rejected').style.display = 'block';
          } else {
              document.getElementById('prov-unverified').style.display = 'block';
          }

      } else if (data.user.role === 'admin') {
          document.getElementById('admin-view').style.display = 'block';
          // Auto-load admin data
          loadAdminNidLists();
          if (document.getElementById('demoLoadDashBtn')) document.getElementById('demoLoadDashBtn').click();
      }
    } else { 
        showStatus('demoSigninStatus', data.error || data.message, true); 
    }
  } catch (err) { showStatus('demoSigninStatus', 'Server Error.', true); }
});

// LOGOUT
document.getElementById('demoLogoutBtn').addEventListener('click', () => {
  localStorage.removeItem('k_id');
  appView.style.display = 'none';
  authView.style.display = 'block';
  if(document.getElementById('demoDashStatus')) document.getElementById('demoDashStatus').style.display = 'none';
  if(document.getElementById('demoNidStatus')) document.getElementById('demoNidStatus').style.display = 'none';
});

// 3. SUBMIT NID (For Provider)
document.getElementById('demoNidForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const res = await fetch(`${BACKEND_URL}/users/verify-nid`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: document.getElementById('demoNidUserId').value,
        nidNumber: document.getElementById('demoNidNum').value,
        frontImageUrl: "dummy.jpg", backImageUrl: "dummy.jpg"
      })
    });
    if (res.ok) {
        showStatus('demoNidStatus', 'NID Submitted Successfully!');
        // Transition smoothly to pending state
        setTimeout(() => {
            document.getElementById('prov-unverified').style.display = 'none';
            document.getElementById('prov-pending').style.display = 'block';
        }, 1500);
    }
  } catch (err) { showStatus('demoNidStatus', 'Error.', true); }
});

// RETRY NID (If Rejected)
document.getElementById('demoRetryNidBtn')?.addEventListener('click', () => {
    document.getElementById('prov-rejected').style.display = 'none';
    document.getElementById('prov-unverified').style.display = 'block';
    document.getElementById('demoNidNum').value = '';
});

// 4. ADMIN DASHBOARD METRICS
document.getElementById('demoLoadDashBtn')?.addEventListener('click', async () => {
  try {
    const res = await fetch(`${BACKEND_URL}/admin/dashboard`, {
      headers: { 'user-id': localStorage.getItem('k_id') }
    });
    const data = await res.json();

    if (res.ok) {
      showStatus('demoDashStatus', 'Analytics Loaded Successfully.');
      document.getElementById('dashResRev').textContent = `৳${data.data.financials.totalPlatformRevenue || 0}`;
      document.getElementById('dashResTx').textContent = data.data.financials.successfulTransactions || 0;

      let prov = 0, cus = 0;
      data.data.demographics.forEach(d => {
        if(d._id === 'provider') prov = d.count;
        if(d._id === 'customer') cus = d.count;
      });
      document.getElementById('dashResPro').textContent = prov;
      document.getElementById('dashResCus').textContent = cus;
    } else {
      showStatus('demoDashStatus', `Access Denied: ${data.error}`, true);
    }
  } catch (err) { showStatus('demoDashStatus', 'Failed to connect.', true); }
});

// 5. ADMIN NID LIST RENDERING
async function loadAdminNidLists() {
    try {
        const res = await fetch(`${BACKEND_URL}/admin/nid-list`);
        const data = await res.json();

        if(res.ok) {
            // Render Pending
            const pendingContainer = document.getElementById('adminPendingList');
            if(data.pending.length === 0) {
                pendingContainer.innerHTML = '<p style="font-size:13px; color:var(--text-faint);">No pending requests at this time.</p>';
            } else {
                pendingContainer.innerHTML = data.pending.map(u => `
                    <div style="background: white; border: 1px solid #ffd54f; padding: 16px; margin-bottom: 12px; border-radius: var(--radius-sm); display: flex; justify-content: space-between; align-items: center; box-shadow: var(--shadow-sm);">
                        <div>
                            <strong style="font-size: 15px; display: block; margin-bottom: 4px;">${u.name}</strong>
                            <span style="font-size: 12px; color: var(--text-muted);">Phone: ${u.phone} | NID: <strong>${u.nidVerification ? u.nidVerification.nidNumber : 'N/A'}</strong></span>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="handleNidAction('${u._id}', 'approve')" style="background: var(--green); color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Approve</button>
                            <button onclick="handleNidAction('${u._id}', 'reject')" style="background: white; color: #c62828; border: 1px solid #c62828; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold;">Reject</button>
                        </div>
                    </div>
                `).join('');
            }

            // Render Approved
            const approvedContainer = document.getElementById('adminApprovedList');
            if(data.verified.length === 0) {
                approvedContainer.innerHTML = '<p style="font-size:13px; color:var(--text-faint);">No verified providers yet.</p>';
            } else {
                approvedContainer.innerHTML = data.verified.map(u => `
                    <div style="padding: 10px 8px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between;">
                        <span><strong>${u.name}</strong> (${u.phone})</span>
                        <span style="color: var(--text-muted);">NID: ${u.nidVerification ? u.nidVerification.nidNumber : 'N/A'}</span>
                    </div>
                `).join('');
            }
        }
    } catch(err) { console.error("Failed to load lists", err); }
}

// Ensure Admin Lists load when the Dashboard refreshes
document.getElementById('demoLoadDashBtn')?.addEventListener('click', loadAdminNidLists);

// 6. ADMIN APPROVE/REJECT ACTION
window.handleNidAction = async (userId, action) => {
    const endpoint = action === 'approve' ? `/admin/approve-nid/${userId}` : `/admin/reject-nid/${userId}`;

    try {
        const res = await fetch(`${BACKEND_URL}${endpoint}`, { method: 'PUT' });
        if (res.ok) {
            // Instantly refresh the lists and metrics
            loadAdminNidLists();
            document.getElementById('demoLoadDashBtn').click();
        } else {
            console.error("Failed to process the request.");
        }
    } catch(err) {
        console.error("Server error during action.", err);
    }
};