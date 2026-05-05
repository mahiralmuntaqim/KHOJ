(function () {
  const state = {
    step: 1,
    service: '',
    amount: 0,
    phone: '',
    date: '',
    time: '',
    method: 'online',
    gateway: 'bkash',
    booking: null
  };

  const cards = {
    details: document.getElementById('paymentDetailsCard'),
    method: document.getElementById('paymentMethodCard'),
    confirm: document.getElementById('paymentConfirmCard')
  };

  function money(amount) {
    return `৳${Number(amount || 0).toLocaleString()}`;
  }

  function getHistory() {
    return JSON.parse(localStorage.getItem('khojPaymentStatuses') || '[]');
  }

  function loadPendingPayment() {
    const pending = JSON.parse(sessionStorage.getItem('khojPendingPayment') || 'null');
    if (!pending) return;
    state.service = pending.service || state.service;
    state.amount = pending.price || state.amount;
    state.phone = pending.phone || state.phone;
    state.date = pending.date || state.date;
    state.time = pending.time || state.time;
    document.getElementById('payService').value = state.service;
    document.getElementById('payAmount').value = state.amount;
    document.getElementById('payPhone').value = state.phone;
  }

  function saveHistory(entry) {
    const rows = getHistory();
    rows.unshift(entry);
    localStorage.setItem('khojPaymentStatuses', JSON.stringify(rows.slice(0, 10)));
    renderHistory();
  }

  function setStep(step) {
    state.step = step;
    Object.values(cards).forEach(card => card.classList.remove('active'));
    if (step === 1) cards.details.classList.add('active');
    if (step === 2) cards.method.classList.add('active');
    if (step === 3) cards.confirm.classList.add('active');

    document.querySelectorAll('.step-dot').forEach(dot => {
      const dotStep = Number(dot.dataset.stepDot);
      dot.classList.toggle('active', dotStep === step);
      dot.classList.toggle('done', dotStep < step);
    });
  }

  async function getCustomer() {
    const saved = JSON.parse(localStorage.getItem('khojDemoCustomer') || 'null');
    if (saved?._id) return saved;

    const stamp = Date.now();
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'KHOJ Payment Customer',
        phone: state.phone || `017${stamp}`,
        email: `payment-${stamp}@khoj.local`,
        password: 'payment123',
        role: 'customer'
      })
    });

    if (!response.ok) throw new Error((await response.json()).error || 'Unable to create customer');
    const data = await response.json();
    localStorage.setItem('khojDemoCustomer', JSON.stringify(data.user));
    return data.user;
  }

  async function createBooking() {
    const customer = await getCustomer();
    const scheduledDate = state.date && state.time
      ? new Date(`${state.date} ${state.time}`).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: customer._id,
        scheduledDate,
        listingTitle: state.service,
        category: 'service',
        type: 'service',
        price: state.amount,
        unit: 'session',
        providerName: `${state.service} Provider`,
        providerPhone: `019${Date.now()}`,
        locationLabel: 'Dhaka'
      })
    });

    if (!response.ok) throw new Error((await response.json()).message || 'Booking failed');
    return response.json();
  }

  async function markPaid(bookingId) {
    const response = await fetch('/api/payments/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookingId,
        amount: state.amount,
        method: 'online',
        gateway: state.gateway,
        transactionId: `${state.gateway.toUpperCase()}-${Date.now()}`
      })
    });

    if (!response.ok) throw new Error((await response.json()).message || 'Payment failed');
    return response.json();
  }

  function renderConfirm() {
    const online = state.method === 'online';
    const gatewayLabel = online ? state.gateway : 'offline';
    const title = document.getElementById('confirmTitle');
    const text = document.getElementById('confirmText');
    const icon = document.getElementById('confirmIcon');
    const summary = document.getElementById('confirmSummary');

    icon.classList.toggle('due', !online);
    icon.textContent = online ? 'OK' : 'DUE';
    title.textContent = online ? 'Confirm Online Payment' : 'Confirm Offline Payment';
    text.textContent = online
      ? `Press OK to complete payment through ${state.gateway}. The status will become Paid.`
      : 'Press OK to confirm this booking with payment due. The status will remain Unpaid.';

    summary.innerHTML = `
      <div><span>Service</span><strong>${state.service}</strong></div>
      ${state.date && state.time ? `<div><span>Schedule</span><strong>${state.date} at ${state.time}</strong></div>` : ''}
      <div><span>Amount</span><strong>${money(state.amount)}</strong></div>
      <div><span>Method</span><strong>${online ? 'Online' : 'Offline'}</strong></div>
      <div><span>Gateway</span><strong>${gatewayLabel}</strong></div>
    `;
  }

  function renderHistory() {
    const list = document.getElementById('paymentStatusList');
    const rows = getHistory();

    if (!rows.length) {
      list.innerHTML = '<div class="payment-page-row"><strong>No payments yet</strong><span>Complete a payment to track paid/unpaid status here.</span></div>';
      return;
    }

    list.innerHTML = rows.map(row => `
      <div class="payment-page-row">
        <div>
          <strong>${row.orderId}</strong>
          <span>${row.service} · ${row.method === 'offline' ? 'Offline' : row.method} · ${money(row.amount)}</span>
        </div>
        <span class="payment-pill ${row.status === 'paid' ? 'paid' : 'unpaid'}">${row.status === 'paid' ? 'Paid' : 'Unpaid'}</span>
      </div>
    `).join('');
  }

  document.getElementById('paymentDetailsCard').addEventListener('submit', event => {
    event.preventDefault();
    state.service = document.getElementById('payService').value.trim();
    state.amount = Number(document.getElementById('payAmount').value);
    state.phone = document.getElementById('payPhone').value.trim();

    if (!state.service || !state.amount) {
      alert('Please enter service and amount.');
      return;
    }

    setStep(2);
  });

  document.querySelectorAll('.method-card').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.method-card').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
      state.method = button.dataset.method;
      document.getElementById('gatewayPanel').classList.toggle('hidden', state.method !== 'online');
    });
  });

  document.querySelectorAll('.gateway-card').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.gateway-card').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
      state.gateway = button.dataset.gateway;
    });
  });

  document.getElementById('reviewPaymentBtn').addEventListener('click', () => {
    renderConfirm();
    setStep(3);
  });

  document.getElementById('editPaymentBtn').addEventListener('click', () => setStep(2));

  document.getElementById('finalizePaymentBtn').addEventListener('click', async () => {
    const button = document.getElementById('finalizePaymentBtn');
    button.disabled = true;
    button.textContent = 'Processing...';

    try {
      const bookingData = await createBooking();
      state.booking = bookingData.booking;
      const orderId = bookingData.booking.payment?.invoiceId || bookingData.booking._id;

      if (state.method === 'offline') {
        saveHistory({
          orderId,
          service: state.service,
          amount: state.amount,
          method: 'offline',
          status: 'unpaid'
        });
        sessionStorage.removeItem('khojPendingPayment');
        alert('Payment due.\n\nOffline payment selected. Booking is confirmed but payment status is Unpaid.');
      } else {
        const paymentData = await markPaid(bookingData.booking._id);
        saveHistory({
          orderId: paymentData.booking.payment.invoiceId,
          service: state.service,
          amount: state.amount,
          method: state.gateway,
          status: 'paid'
        });
        sessionStorage.removeItem('khojPendingPayment');
        alert(`Payment successful.\n\nGateway: ${state.gateway}\nStatus: Paid`);
      }

      setStep(1);
    } catch (error) {
      alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = 'OK';
    }
  });

  document.getElementById('clearPaymentHistoryBtn').addEventListener('click', () => {
    localStorage.removeItem('khojPaymentStatuses');
    renderHistory();
  });

  loadPendingPayment();
  renderHistory();
})();
