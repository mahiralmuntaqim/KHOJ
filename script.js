// ── Mobile Menu ──
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

hamburger.addEventListener('click', () => {
  mobileMenu.classList.toggle('open');
});

mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => mobileMenu.classList.remove('open'));
});

// ── Category Tabs ──
const tabs = document.querySelectorAll('.ctab');
const cards = document.querySelectorAll('.listing-card');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    const cat = tab.dataset.cat;
    cards.forEach(card => {
      if (cat === 'all' || card.dataset.cat === cat) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

// ── Quick Tags ──
document.querySelectorAll('.qtag').forEach(tag => {
  tag.addEventListener('click', () => {
    document.getElementById('searchInput').value = tag.textContent;
    document.getElementById('searchInput').focus();
  });
});

// ── Search Button ──
document.getElementById('searchBtn').addEventListener('click', () => {
  const query = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categorySelect').value;
  if (query || category) {
    console.log('Search:', { query, category });
    alert(`Searching for "${query}" in "${category || 'All Categories'}" — backend coming soon!`);
  }
});

// ── Scroll fade-in for sections ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.listing-card, .rental-card, .step-card, .testi-card').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});


// ══════════════════════════════════════════
// NEW FEATURE SCRIPTS
// ══════════════════════════════════════════

// ── Auth Modal ──
const authModal = document.getElementById('authModal');
const modalClose = document.getElementById('modalClose');

function openAuthModal() {
  authModal.classList.add('open');
  showAuthStep(1);
}
function closeAuthModal() {
  authModal.classList.remove('open');
}

['signInBtn','getStartedBtn','mobileSignIn','mobileGetStarted','ctaProviderBtn','listServiceBtn'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', e => { e.preventDefault(); openAuthModal(); });
});
modalClose.addEventListener('click', closeAuthModal);
authModal.addEventListener('click', e => { if (e.target === authModal) closeAuthModal(); });

function showAuthStep(n) {
  [1,2,3,4].forEach(i => {
    const s = document.getElementById('authStep' + i);
    if (s) s.classList.toggle('hidden', i !== n);
  });
}

// Role selection
let selectedRole = null;
document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedRole = card.dataset.role;
    document.getElementById('roleNextBtn').disabled = false;
  });
});

document.getElementById('roleNextBtn').addEventListener('click', () => {
  if (selectedRole) showAuthStep(2);
});

document.getElementById('backToRole').addEventListener('click', e => {
  e.preventDefault(); showAuthStep(1);
});

document.getElementById('switchToSignIn').addEventListener('click', e => {
  e.preventDefault();
  // Treat as same flow but skip role selection
  selectedRole = 'customer';
  showAuthStep(2);
});

// NID checkbox
document.getElementById('nidCheck').addEventListener('change', e => {
  document.getElementById('nidInputWrap').classList.toggle('hidden', !e.target.checked);
});

// Send OTP
document.getElementById('sendOtpBtn').addEventListener('click', () => {
  const phone = document.getElementById('phoneInput').value.trim();
  if (phone.length < 10) { alert('Please enter a valid phone number.'); return; }
  document.getElementById('otpPhone').textContent = '+880 ' + phone;
  showAuthStep(3);
  startOtpTimer();
});

// OTP auto-tab
const otpBoxes = document.querySelectorAll('.otp-box');
otpBoxes.forEach((box, i) => {
  box.addEventListener('input', () => {
    if (box.value && i < otpBoxes.length - 1) otpBoxes[i+1].focus();
  });
  box.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !box.value && i > 0) otpBoxes[i-1].focus();
  });
});

// OTP Timer
let otpTimerInterval;
function startOtpTimer() {
  let t = 30;
  document.getElementById('otpTimer').textContent = t;
  document.getElementById('resendOtp').style.pointerEvents = 'none';
  document.getElementById('resendOtp').style.opacity = '0.4';
  clearInterval(otpTimerInterval);
  otpTimerInterval = setInterval(() => {
    t--;
    document.getElementById('otpTimer').textContent = t;
    if (t <= 0) {
      clearInterval(otpTimerInterval);
      document.getElementById('resendOtp').style.pointerEvents = 'auto';
      document.getElementById('resendOtp').style.opacity = '1';
    }
  }, 1000);
}

document.getElementById('resendOtp').addEventListener('click', e => {
  e.preventDefault();
  startOtpTimer();
  alert('OTP resent! (demo)');
});

// Verify OTP
document.getElementById('verifyOtpBtn').addEventListener('click', () => {
  const code = Array.from(otpBoxes).map(b => b.value).join('');
  if (code.length < 6) { alert('Please enter the 6-digit code.'); return; }
  const msg = selectedRole === 'provider'
    ? 'You\'re now registered as a Service Provider. Start listing your services!'
    : 'Welcome! Browse and book trusted services near you.';
  document.getElementById('successMessage').textContent = msg;
  showAuthStep(4);
});

document.getElementById('authDoneBtn').addEventListener('click', closeAuthModal);


// ── Location Discovery ──
document.getElementById('detectLocationBtn').addEventListener('click', () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      document.getElementById('locationText').textContent = `📍 Dhaka, Bangladesh (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
    }, () => {
      document.getElementById('locationText').textContent = '📍 Location: Dhaka, Bangladesh (default)';
    });
  } else {
    document.getElementById('locationText').textContent = '📍 Location: Dhaka, Bangladesh (default)';
  }
});

document.querySelectorAll('.district-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.district-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('locationText').textContent = `📍 Showing services in: ${btn.textContent}`;
  });
});


// ── Availability Calendar ──
let calDate = new Date();
let selectedCalDay = null;

function renderCalendar(date) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('calMonthLabel').textContent = months[date.getMonth()] + ' ' + date.getFullYear();

  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';

  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d => {
    const dn = document.createElement('div');
    dn.className = 'cal-day-name';
    dn.textContent = d;
    grid.appendChild(dn);
  });

  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const today = new Date();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    grid.appendChild(empty);
  }

  const busyDays = [3, 7, 12, 18, 22, 27];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'cal-day';
    dayEl.textContent = d;

    const dayDate = new Date(date.getFullYear(), date.getMonth(), d);
    if (dayDate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      dayEl.classList.add('past');
    } else if (busyDays.includes(d)) {
      dayEl.classList.add('busy');
    } else {
      dayEl.classList.add('available');
    }

    if (d === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()) {
      dayEl.classList.add('today');
    }

    if (!dayEl.classList.contains('past') && !dayEl.classList.contains('busy')) {
      dayEl.addEventListener('click', () => {
        document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
        dayEl.classList.add('selected');
        selectedCalDay = d;
        showTimeSlots(d, date);
      });
    }

    grid.appendChild(dayEl);
  }
}

function showTimeSlots(day, date) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const slots = ['9:00 AM','10:30 AM','12:00 PM','2:00 PM','3:30 PM','5:00 PM'];
  const fullSlots = ['10:30 AM','3:30 PM'];
  const container = document.getElementById('timeSlots');
  container.innerHTML = `
    <div class="time-slots-label">Available slots for ${months[date.getMonth()]} ${day}</div>
    <div class="time-slots-grid">
      ${slots.map(s => `<button class="time-slot-btn${fullSlots.includes(s) ? ' full' : ''}" ${fullSlots.includes(s) ? 'disabled' : ''}>${s}</button>`).join('')}
    </div>
  `;
  container.querySelectorAll('.time-slot-btn:not(.full)').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });
}

document.getElementById('calPrev').addEventListener('click', () => {
  calDate.setMonth(calDate.getMonth() - 1);
  renderCalendar(calDate);
});
document.getElementById('calNext').addEventListener('click', () => {
  calDate.setMonth(calDate.getMonth() + 1);
  renderCalendar(calDate);
});

renderCalendar(calDate);


// ── Order History Filters ──
document.querySelectorAll('[data-hfilter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-hfilter]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.hfilter;
    document.querySelectorAll('.history-item').forEach(item => {
      item.style.display = (filter === 'all' || item.dataset.hstatus === filter) ? 'grid' : 'none';
    });
  });
});

function downloadInvoice(orderId) {
  alert(`Downloading invoice for Order ${orderId}... (PDF generation — backend coming soon)`);
}

document.getElementById('exportAllBtn').addEventListener('click', () => {
  alert('Exporting all orders to CSV... (backend coming soon)');
});


// ── In-App Messages ──
document.querySelectorAll('.chat-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
  });
});

document.getElementById('chatSendBtn').addEventListener('click', sendChatMsg);
document.getElementById('chatTypeInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChatMsg();
});

function sendChatMsg() {
  const input = document.getElementById('chatTypeInput');
  const msg = input.value.trim();
  if (!msg) return;

  const chatMessages = document.getElementById('chatMessages');
  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble me';
  bubble.textContent = msg;
  chatMessages.appendChild(bubble);

  const time = document.createElement('div');
  time.className = 'msg-time';
  time.textContent = 'Just now';
  chatMessages.appendChild(time);

  chatMessages.scrollTop = chatMessages.scrollHeight;
  input.value = '';

  // Auto reply simulation
  setTimeout(() => {
    const reply = document.createElement('div');
    reply.className = 'msg-bubble them';
    reply.textContent = 'Got it! I\'ll make a note. See you soon.';
    chatMessages.appendChild(reply);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }, 1200);
}


// ── Booking Modal ──
const bookingModal = document.getElementById('bookingModal');
let currentBookingService = '', currentBookingPrice = '';
let selectedBookingDate = '', selectedBookingTime = '';

function openBookingModal(service, price) {
  currentBookingService = service;
  currentBookingPrice = price;
  document.getElementById('bookingServiceName').textContent = 'Book: ' + service;
  bookingModal.classList.add('open');
  renderBookingCalendar();
  document.getElementById('bookingSummary').style.display = 'none';
  document.getElementById('confirmBookingBtn').style.display = 'none';
}

document.getElementById('bookingModalClose').addEventListener('click', () => {
  bookingModal.classList.remove('open');
});
bookingModal.addEventListener('click', e => { if (e.target === bookingModal) bookingModal.classList.remove('open'); });

function renderBookingCalendar() {
  const mini = document.getElementById('bookingCalMini');
  mini.innerHTML = '';
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  ['S','M','T','W','T','F','S'].forEach(d => {
    const dn = document.createElement('div');
    dn.className = 'cal-day-name';
    dn.textContent = d;
    dn.style.fontSize = '10px';
    mini.appendChild(dn);
  });

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div');
    e.className = 'cal-day empty';
    mini.appendChild(e);
  }

  const busyDays = [3, 7, 12, 18, 22];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'cal-day';
    dayEl.textContent = d;
    dayEl.style.fontSize = '12px'; dayEl.style.padding = '6px 2px';

    if (d < today.getDate()) { dayEl.classList.add('past'); }
    else if (busyDays.includes(d)) { dayEl.classList.add('busy'); }
    else { dayEl.classList.add('available'); }

    if (d === today.getDate()) dayEl.classList.add('today');

    if (!dayEl.classList.contains('past') && !dayEl.classList.contains('busy')) {
      dayEl.addEventListener('click', () => {
        mini.querySelectorAll('.cal-day').forEach(el => el.classList.remove('selected'));
        dayEl.classList.add('selected');
        selectedBookingDate = months[today.getMonth()] + ' ' + d + ', ' + today.getFullYear();
        renderBookingTimeSlots();
      });
    }
    mini.appendChild(dayEl);
  }
}

function renderBookingTimeSlots() {
  const slots = ['9:00 AM','11:00 AM','2:00 PM','4:00 PM'];
  const slotsDiv = document.getElementById('bookingTimeSlots');
  slotsDiv.innerHTML = '<div class="time-slots-label">Choose a time:</div><div class="time-slots-grid">' +
    slots.map(s => `<button class="time-slot-btn">${s}</button>`).join('') + '</div>';

  slotsDiv.querySelectorAll('.time-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      slotsDiv.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedBookingTime = btn.textContent;
      showBookingSummary();
    });
  });
}

function showBookingSummary() {
  if (!selectedBookingDate || !selectedBookingTime) return;
  document.getElementById('bsService').textContent = currentBookingService;
  document.getElementById('bsDate').textContent = selectedBookingDate;
  document.getElementById('bsTime').textContent = selectedBookingTime;
  document.getElementById('bsPrice').textContent = currentBookingPrice;
  document.getElementById('bookingSummary').style.display = 'block';
  document.getElementById('confirmBookingBtn').style.display = 'block';
}

document.getElementById('confirmBookingBtn').addEventListener('click', () => {
  const payload = {
    service: currentBookingService,
    date: selectedBookingDate,
    time: selectedBookingTime,
    price: currentBookingPrice,
    phone: JSON.parse(localStorage.getItem('khojDemoCustomer') || 'null')?.phone || ''
  };
  sessionStorage.setItem('khojPendingPayment', JSON.stringify(payload));
  bookingModal.classList.remove('open');
  window.location.href = 'payment.html';
});


// ── Badge Progress Animation (on scroll) ──
const badgeObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.badge-fill').forEach(fill => {
        const w = fill.style.width;
        fill.style.width = '0';
        setTimeout(() => { fill.style.width = w; }, 100);
      });
    }
  });
}, { threshold: 0.3 });

const badgesGrid = document.querySelector('.badges-grid');
if (badgesGrid) badgeObserver.observe(badgesGrid);
