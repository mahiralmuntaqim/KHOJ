(function () {
  function notify(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function getAmount(price) {
    return Number(String(price).replace(/[^\d.]/g, '')) || 0;
  }

  function getScheduledDate(date, time) {
    const parsed = new Date(`${date} ${time}`);
    return Number.isNaN(parsed.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : parsed;
  }

  function getSelectedGateway() {
    return document.querySelector('.gateway-option.selected')?.dataset.gateway || 'bkash';
  }

  function savePaymentStatus(entry) {
    const entries = JSON.parse(localStorage.getItem('khojPaymentStatuses') || '[]');
    entries.unshift(entry);
    localStorage.setItem('khojPaymentStatuses', JSON.stringify(entries.slice(0, 6)));
    renderPaymentDashboard();
  }

  function renderPaymentDashboard() {
    const table = document.querySelector('.dash-table');
    if (!table) return;

    let panel = document.getElementById('paymentStatusDashboard');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'paymentStatusDashboard';
      panel.className = 'payment-status-dashboard';
      table.parentElement.appendChild(panel);
    }

    const entries = JSON.parse(localStorage.getItem('khojPaymentStatuses') || '[]');
    const rows = entries.length ? entries : [
      { orderId: 'KHJ-DEMO-001', service: 'AC Servicing', amount: 800, method: 'bkash', status: 'paid' },
      { orderId: 'KHJ-DEMO-002', service: 'Plumbing', amount: 700, method: 'offline', status: 'unpaid' }
    ];

    panel.innerHTML = `
      <div class="dash-table-header payment-status-title">
        <span>Payment Status</span>
        <span class="view-all">Paid / Unpaid</span>
      </div>
      <div class="payment-status-list">
        ${rows.map(row => `
          <div class="payment-status-row">
            <span>${row.orderId}</span>
            <span>${row.service}</span>
            <span>${row.method === 'offline' ? 'Offline' : row.method}</span>
            <span>${row.amount}</span>
            <span class="payment-pill ${row.status === 'paid' ? 'paid' : 'unpaid'}">${row.status === 'paid' ? 'Paid' : 'Unpaid'}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  async function getDemoCustomer() {
    const saved = JSON.parse(localStorage.getItem('khojDemoCustomer') || 'null');
    if (saved?._id) return saved;

    const stamp = Date.now();
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'KHOJ Demo Customer',
        phone: `017${stamp}`,
        email: `demo-${stamp}@khoj.local`,
        password: 'demo123',
        role: 'customer'
      })
    });

    if (!response.ok) throw new Error((await response.json()).error || 'Unable to create demo customer');
    const data = await response.json();
    localStorage.setItem('khojDemoCustomer', JSON.stringify(data.user));
    return data.user;
  }

  async function createBooking(details) {
    const customer = await getDemoCustomer();
    const amount = getAmount(details.price);
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: customer._id,
        scheduledDate: getScheduledDate(details.date, details.time).toISOString(),
        listingTitle: details.service,
        category: 'service',
        type: 'service',
        price: amount,
        unit: 'session',
        providerName: `${details.service} Provider`,
        providerPhone: `019${Date.now()}`,
        locationLabel: 'Dhaka'
      })
    });

    if (!response.ok) throw new Error((await response.json()).message || 'Booking failed');
    return response.json();
  }

  const api = {
    async pay(bookingId, amount, method = 'card', gatewayOverride) {
      const isOffline = method === 'offline' || method === 'cash';
      const gateway = isOffline ? 'offline' : (gatewayOverride || getSelectedGateway());
      const response = await fetch('/api/payments/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          amount,
          method: isOffline ? 'offline' : 'online',
          gateway,
          transactionId: isOffline ? `DUE-${Date.now()}` : `${gateway.toUpperCase()}-${Date.now()}`
        })
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Payment failed');
      const data = await response.json();
      notify('khoj:payment:paid', data);
      return data;
    },

    async requestRefund(bookingId, amount, reason) {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, amount, reason })
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Refund request failed');
      const data = await response.json();
      notify('khoj:payment:refund-requested', data);
      return data;
    },

    async confirmBookingWithPayment(details) {
      const button = document.getElementById('confirmBookingBtn');
      const modal = document.getElementById('bookingModal');
      const methodLabel = details.paymentMethod === 'offline' ? 'Offline Payment' : 'Online Payment';
      const gateway = details.paymentMethod === 'offline' ? 'offline' : getSelectedGateway();

      try {
        if (button) {
          button.disabled = true;
          button.textContent = 'Confirming...';
        }

        const bookingData = await createBooking(details);
        const amount = getAmount(details.price);
        const orderId = bookingData.booking.payment?.invoiceId || bookingData.booking._id;

        if (details.paymentMethod === 'offline') {
          savePaymentStatus({
            orderId,
            service: details.service,
            amount,
            method: 'offline',
            status: 'unpaid'
          });
          notify('khoj:payment:due', { booking: bookingData.booking });
          if (modal) modal.classList.remove('open');
          alert(`Booking confirmed!\n\nService: ${details.service}\nDate: ${details.date}\nTime: ${details.time}\nPrice: ${details.price}\nPayment: Offline\nStatus: Payment due`);
          return { booking: bookingData.booking, payment: bookingData.booking.payment };
        }

        const paymentData = await api.pay(bookingData.booking._id, amount, details.paymentMethod, gateway);

        savePaymentStatus({
          orderId: paymentData.booking.payment.invoiceId,
          service: details.service,
          amount,
          method: gateway,
          status: 'paid'
        });

        if (modal) modal.classList.remove('open');
        alert(`Payment successful!\n\nGateway: ${gateway}\nService: ${details.service}\nPrice: ${details.price}\nStatus: Paid\nInvoice: ${paymentData.booking.payment.invoiceId}`);
        return { booking: bookingData.booking, payment: paymentData.booking.payment };
      } catch (error) {
        alert(error.message);
        return null;
      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = 'Confirm Booking';
        }
      }
    }
  };

  window.KhojPaymentRefund = api;

  window.downloadInvoice = function downloadInvoice(orderId) {
    alert(`Invoice ${orderId}\n\nPayment status: Paid\nRefund support: Available from your booking details.`);
  };

  document.querySelectorAll('input[name="paymentMethod"]').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.payment-option').forEach(option => option.classList.remove('selected'));
      input.closest('.payment-option')?.classList.add('selected');
      document.getElementById('gatewayOptions')?.classList.toggle('hidden', input.value !== 'online');
    });
  });

  document.querySelectorAll('.gateway-option').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.gateway-option').forEach(option => option.classList.remove('selected'));
      button.classList.add('selected');
      const online = document.querySelector('input[name="paymentMethod"][value="online"]');
      if (online) {
        online.checked = true;
        online.dispatchEvent(new Event('change'));
      }
    });
  });

  renderPaymentDashboard();
})();
