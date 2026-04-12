const storageKeys = {
  user: 'khojUser',
  booking: 'khojLatestBooking'
};

const state = {
  user: null,
  latestBooking: null,
  selectedListing: null,
  bookings: []
};

clearPersistedSession();

const elements = {
  hamburger: document.getElementById('hamburger'),
  mobileMenu: document.getElementById('mobileMenu'),
  authModal: document.getElementById('authModal'),
  bookingModal: document.getElementById('bookingModal'),
  signInForm: document.getElementById('signInForm'),
  bookingForm: document.getElementById('bookingForm'),
  authFeedback: document.getElementById('authFeedback'),
  bookingFeedback: document.getElementById('bookingFeedback'),
  authStatus: document.getElementById('authStatus'),
  bookingStatus: document.getElementById('bookingStatus'),
  paymentPanel: document.getElementById('paymentPanel'),
  paymentButton: document.getElementById('statusPaymentBtn'),
  bookingListing: document.getElementById('bookingListing'),
  bookingProvider: document.getElementById('bookingProvider'),
  bookingDate: document.getElementById('bookingDate'),
  bookingModalTitle: document.getElementById('bookingModalTitle'),
  payNowButton: document.getElementById('payNowBtn'),
  paymentHint: document.getElementById('paymentHint'),
  paymentSuccessCard: document.getElementById('paymentSuccessCard'),
  paymentSuccessText: document.getElementById('paymentSuccessText'),
  dashboardGrid: document.getElementById('dashboardGrid'),
  dashboardEmpty: document.getElementById('dashboardEmpty'),
  signInTriggers: [
    document.getElementById('signInTrigger'),
    document.getElementById('mobileSignInTrigger'),
    document.getElementById('getStartedTrigger'),
    document.getElementById('mobileGetStartedTrigger'),
    document.getElementById('statusSignInBtn')
  ].filter(Boolean)
};

wireNavigation();
wireSearch();
wireAnimation();
wireAuthFlow();
wireBookingButtons();
wirePaymentMethodSelector();
renderState();
syncBookings();

function saveToStorage(key, value) {
  void key;
  void value;
}

function removeFromStorage(key) {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(`Unable to clear ${key}`, error);
  }
}

function wireNavigation() {
  elements.hamburger.addEventListener('click', () => {
    elements.mobileMenu.classList.toggle('open');
  });

  elements.mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => elements.mobileMenu.classList.remove('open'));
  });
}

function wireSearch() {
  const tabs = document.querySelectorAll('.ctab');
  const cards = document.querySelectorAll('.listing-card');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => item.classList.remove('active'));
      tab.classList.add('active');

      const category = tab.dataset.cat;
      cards.forEach((card) => {
        card.classList.toggle('hidden', category !== 'all' && card.dataset.cat !== category);
      });
    });
  });

  document.querySelectorAll('.qtag').forEach((tag) => {
    tag.addEventListener('click', () => {
      document.getElementById('searchInput').value = tag.textContent;
      document.getElementById('searchInput').focus();
    });
  });

  document.getElementById('searchBtn').addEventListener('click', () => {
    const query = document.getElementById('searchInput').value.trim();
    const category = document.getElementById('categorySelect').value;

    if (query || category) {
      alert(`Searching for "${query}" in "${category || 'All Categories'}" - backend search can be added next.`);
    }
  });
}

function wireAnimation() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.listing-card, .rental-card, .step-card, .testi-card').forEach((element) => {
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(element);
  });
}

function wireAuthFlow() {
  elements.signInTriggers.forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      openModal('authModal');
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', () => closeModal(button.dataset.closeModal));
  });

  elements.signInForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      name: document.getElementById('signInName').value.trim(),
      phone: document.getElementById('signInPhone').value.trim(),
      password: document.getElementById('signInPassword').value
    };

    elements.authFeedback.textContent = 'Signing in...';

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Sign in failed');
      }

      const previousUserId = state.user?.id || null;
      const nextUserId = data.user.id;

      state.user = data.user;
      saveToStorage(storageKeys.user, state.user);
      if (previousUserId !== nextUserId) {
        resetUserScopedState();
      }
      elements.authFeedback.textContent = data.message;
      closeModal('authModal');
      await syncBookings();
      renderState();
    } catch (error) {
      elements.authFeedback.textContent = error.message;
    }
  });
}

function wireBookingButtons() {
  document.querySelectorAll('.card-btn').forEach((button) => {
    button.addEventListener('click', () => {
      prepareBooking(extractServiceData(button.closest('.listing-card')));
    });
  });

  document.querySelectorAll('.rental-btn').forEach((button) => {
    button.addEventListener('click', () => {
      prepareBooking(extractRentalData(button.closest('.rental-card')));
    });
  });

  elements.bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!state.user) {
      openModal('authModal');
      return;
    }

    if (!state.selectedListing) {
      elements.bookingFeedback.textContent = 'Please pick a listing first.';
      return;
    }

    const payload = {
      customerId: state.user.id,
      scheduledDate: elements.bookingDate.value,
      listingTitle: state.selectedListing.title,
      category: state.selectedListing.category,
      price: state.selectedListing.price,
      unit: state.selectedListing.unit,
      providerName: state.selectedListing.providerName,
      providerPhone: state.selectedListing.providerPhone,
      locationLabel: state.selectedListing.location
    };

    elements.bookingFeedback.textContent = 'Creating booking...';

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Booking failed');
      }

      state.latestBooking = data.booking;
      saveToStorage(storageKeys.booking, state.latestBooking);
      resetPaymentState();
      elements.paymentPanel.classList.remove('hidden');
      elements.bookingFeedback.textContent = `${data.message}. Choose online or offline payment below.`;
      window.setTimeout(() => {
        elements.paymentPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 120);
      await syncBookings();
      renderState();
    } catch (error) {
      elements.bookingFeedback.textContent = error.message;
    }
  });

  elements.payNowButton.addEventListener('click', handlePayment);
  elements.paymentButton.addEventListener('click', () => {
    if (!state.latestBooking) {
      return;
    }

    const latestListing = typeof state.latestBooking.listing === 'object'
      ? state.latestBooking.listing
      : null;
    elements.bookingModalTitle.textContent = latestListing
      ? `Complete payment for ${latestListing.title}`
      : 'Complete payment for your latest booking';
    elements.bookingListing.value = latestListing
      ? `${latestListing.title} - ${latestListing.category}`
      : 'Latest booking';
    elements.bookingProvider.value = latestListing ? 'Saved booking provider' : 'Saved booking';
    elements.bookingDate.value = state.latestBooking.scheduledDate
      ? new Date(state.latestBooking.scheduledDate).toISOString().split('T')[0]
      : getTomorrowDate();
    resetPaymentState();
    elements.paymentPanel.classList.remove('hidden');
    elements.bookingFeedback.textContent = 'Choose your payment method to complete the latest booking.';
    window.setTimeout(() => {
      elements.paymentPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
    openModal('bookingModal');
  });
}

function wirePaymentMethodSelector() {
  document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
    input.addEventListener('change', updatePaymentHint);
  });
  updatePaymentHint();
}

function extractServiceData(card) {
  const providerLine = card.querySelector('.card-provider').textContent.replace(/^by\s+/i, '');
  const providerParts = providerLine.includes('•')
    ? providerLine.split('•')
    : providerLine.split('â€¢');
  const [providerName, location] = providerParts.map((item) => item.trim());

  return {
    title: card.querySelector('.card-title').textContent.trim(),
    category: card.querySelector('.card-cat').textContent.trim(),
    providerName,
    providerPhone: slugify(`${providerName}-${location}`),
    location,
    price: extractNumber(card.querySelector('.card-price').textContent),
    unit: (card.querySelector('.card-price small') || {}).textContent?.replace('/', '').trim() || 'visit'
  };
}

function extractRentalData(card) {
  const info = card.querySelector('.rental-info');
  const rawDetails = info.querySelector('p').textContent;
  const details = rawDetails.includes('•')
    ? rawDetails.split('•')
    : rawDetails.split('â€¢');

  return {
    title: info.querySelector('h3').textContent.trim(),
    category: 'Rentals',
    providerName: `${info.querySelector('h3').textContent.trim()} Provider`,
    providerPhone: slugify(info.querySelector('h3').textContent.trim()),
    location: (details[1] || 'Bangladesh').trim(),
    price: extractNumber(card.querySelector('.rental-price').textContent),
    unit: (card.querySelector('.rental-price span') || {}).textContent?.replace('/', '').trim() || 'day'
  };
}

function prepareBooking(listing) {
  if (!state.user) {
    elements.authFeedback.textContent = 'Sign in first so we can attach the booking to your account.';
    openModal('authModal');
    return;
  }

  state.selectedListing = listing;
  elements.bookingModalTitle.textContent = `Confirm your booking for ${listing.title}`;
  elements.bookingListing.value = `${listing.title} - ${listing.category}`;
  elements.bookingProvider.value = `${listing.providerName} - ${listing.location}`;
  elements.bookingDate.value = getTomorrowDate();
  elements.bookingFeedback.textContent = '';
  elements.paymentPanel.classList.add('hidden');
  openModal('bookingModal');
}

async function handlePayment() {
  if (!state.latestBooking) {
    alert('Create a booking first.');
    return;
  }

  const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'online';
  const payload = {
    bookingId: state.latestBooking._id,
    amount: state.latestBooking.payment?.amount || 0,
    method: selectedPaymentMethod,
    gateway: selectedPaymentMethod,
    transactionId: selectedPaymentMethod === 'offline' ? `OFF-${Date.now()}` : `ONL-${Date.now()}`
  };

  elements.bookingFeedback.textContent = `Processing ${selectedPaymentMethod} payment...`;
  elements.payNowButton.disabled = true;
  elements.payNowButton.textContent = selectedPaymentMethod === 'offline' ? 'Confirming Offline Payment...' : 'Confirming Online Payment...';

  try {
    const response = await fetch('/api/payments/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Payment failed');
    }

    state.latestBooking = data.booking;
    saveToStorage(storageKeys.booking, state.latestBooking);
    elements.bookingFeedback.textContent = `Payment done successfully by ${selectedPaymentMethod} method.`;
    elements.paymentSuccessText.textContent = selectedPaymentMethod === 'offline'
      ? 'Offline payment confirmed. It is now visible in your dashboard.'
      : 'Online payment confirmed. It is now visible in your dashboard.';
    elements.paymentSuccessCard.classList.remove('hidden');
    await syncBookings();
    renderState();
    document.querySelector('.dashboard-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => closeModal('bookingModal'), 1200);
  } catch (error) {
    elements.bookingFeedback.textContent = error.message;
  } finally {
    elements.payNowButton.disabled = false;
    elements.payNowButton.textContent = 'Confirm Payment';
  }
}

async function syncBookings() {
  if (!state.user?.id) {
    resetUserScopedState();
    renderDashboard();
    renderState();
    return;
  }

  try {
    const response = await fetch(`/api/bookings/customer/${state.user.id}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load dashboard');
    }

    state.bookings = data;
    if (data.length > 0) {
      state.latestBooking = data[0];
      saveToStorage(storageKeys.booking, state.latestBooking);
    } else {
      state.latestBooking = null;
      removeFromStorage(storageKeys.booking);
    }
    renderDashboard();
  } catch (error) {
    elements.dashboardEmpty.textContent = error.message;
    elements.dashboardEmpty.classList.remove('hidden');
    elements.dashboardGrid.classList.add('hidden');
  }
}

function renderDashboard() {
  if (!state.bookings.length) {
    elements.dashboardGrid.innerHTML = '';
    elements.dashboardGrid.classList.add('hidden');
    elements.dashboardEmpty.classList.remove('hidden');
    elements.dashboardEmpty.textContent = state.user
      ? 'No bookings yet. Create one and the payment result will appear here.'
      : 'Sign in to see your bookings, payment method, and payment status here.';
    return;
  }

  elements.dashboardGrid.innerHTML = state.bookings.map((booking) => {
    const paymentStatus = booking.payment?.status || 'unpaid';
    const methodLabel = booking.payment?.gateway === 'offline' || booking.payment?.gateway === 'offline-payment'
      ? 'Offline Payment'
      : booking.payment?.gateway === 'online' || booking.payment?.gateway === 'online-payment'
        ? 'Online Payment'
        : booking.payment?.method || 'Not selected';
    const listingTitle = typeof booking.listing === 'string' ? 'Booked item' : booking.listing.title;
    const price = booking.payment?.amount || (typeof booking.listing === 'object' ? booking.listing.price : 0);

    return `
      <article class="dashboard-card">
        <h3>${listingTitle}</h3>
        <p class="dashboard-meta">Booking ID: ${booking._id}</p>
        <span class="dashboard-status ${paymentStatus === 'paid' ? 'paid' : 'unpaid'}">${paymentStatus === 'paid' ? 'Payment Successful' : 'Awaiting Payment'}</span>
        <p class="dashboard-line">Booking status: ${booking.status}</p>
        <p class="dashboard-line">Payment method: ${methodLabel}</p>
        <p class="dashboard-line">Amount: BDT ${price}</p>
        <p class="dashboard-line">Scheduled date: ${new Date(booking.scheduledDate).toLocaleDateString()}</p>
      </article>
    `;
  }).join('');

  elements.dashboardEmpty.classList.add('hidden');
  elements.dashboardGrid.classList.remove('hidden');
}

function renderState() {
  if (state.user) {
    elements.authStatus.textContent = `Signed in as ${state.user.name}`;
  } else {
    elements.authStatus.textContent = 'Not signed in';
  }

  if (state.latestBooking && state.latestBooking.listing) {
    const paid = state.latestBooking.payment && state.latestBooking.payment.status === 'paid';
    const listingTitle = typeof state.latestBooking.listing === 'string'
      ? 'Your latest booking'
      : state.latestBooking.listing.title;
    elements.bookingStatus.textContent = `${listingTitle} is ${state.latestBooking.status}. Payment status: ${paid ? 'paid successfully' : 'unpaid'}.`;
    elements.paymentButton.disabled = paid;
    elements.paymentButton.textContent = paid ? 'Payment Successful' : 'Pay Latest Booking';
  } else {
    elements.bookingStatus.textContent = state.user
      ? 'You are signed in. Book any service or rental to continue to payment.'
      : 'Sign in first, then book any service or rental from the cards below.';
    elements.paymentButton.disabled = true;
    elements.paymentButton.textContent = 'Pay Latest Booking';
  }
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function extractNumber(text) {
  const digits = text.replace(/[^\d]/g, '');
  return Number(digits || 0);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function getTomorrowDate() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  return now.toISOString().split('T')[0];
}

function updatePaymentHint() {
  const selectedPaymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'online';
  elements.paymentHint.textContent = selectedPaymentMethod === 'offline'
    ? 'Offline payment marks the order as paid now and stores it in the dashboard for manual cash or hand-to-hand settlement.'
    : 'Online payment confirms instantly with the server and updates your dashboard right away.';
}

function resetPaymentState() {
  elements.paymentSuccessCard.classList.add('hidden');
  elements.payNowButton.disabled = false;
  elements.payNowButton.textContent = 'Confirm Payment';
  updatePaymentHint();
}

function resetUserScopedState() {
  state.latestBooking = null;
  state.bookings = [];
  state.selectedListing = null;
  removeFromStorage(storageKeys.booking);
}

function clearPersistedSession() {
  removeFromStorage(storageKeys.user);
  removeFromStorage(storageKeys.booking);
}
