(function () {
  const allLocations = [
    'Warehouse, Farmgate',
    'Dhanmondi Hub',
    'Gulshan Distribution Center',
    'Badda Sorting Point',
    'Mohakhali Terminal',
    'Banani Transit Hub',
    'Mirpur Collection Center',
    'Uttara Dispatch Point',
    'Motijheel Main Branch',
    'Paltan Distribution',
    'Shantinagar Sorting',
    'Tejgaon Logistics',
    'Kawran Bazar Hub',
    'Shahbag Transit',
    'Jatrabari Delivery Hub',
    'Kamalapur Station Area',
    'Purana Paltan Hub',
    'Buriganga River Distribution',
    'Sadarghat Terminal',
    'Destination'
  ];

  const demoOrders = {
    'KHJ-2025-0042': { status: 'in-progress', steps: [true, true, true, false], times: ['Jan 14, 9:00 AM', 'Jan 14, 9:30 AM', 'Jan 14, 10:00 AM', ''] },
    'KHJ-2025-0038': { status: 'completed', steps: [true, true, true, true], times: ['Jan 10, 11:00 AM', 'Jan 10, 11:20 AM', 'Jan 10, 12:00 PM', 'Jan 10, 2:30 PM'] },
    'KHJ-2025-0055': { status: 'pending', steps: [true, false, false, false], times: ['Jan 15, 8:45 AM', '', '', ''] }
  };

  function titleCase(value) {
    return value.replace('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function formatTrackingDetail(time, location) {
    if (time && location) return `${time} · ${location}`;
    return time || location || '';
  }

  function getRandomLocations(seed = '') {
    const shuffled = [...allLocations].sort(() => {
      let hash = seed.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0);
      return Math.sin(hash) - 0.5;
    });
    return shuffled.slice(0, 5);
  }

  function generateRealisticTimes(status, locations) {
    const now = new Date();
    const times = [];
    let stepCount = 0;

    if (status === 'pending') stepCount = 1;
    else if (status === 'confirmed') stepCount = 2;
    else if (status === 'in-progress') stepCount = 3;
    else if (status === 'completed') stepCount = 4;

    const intervals = [0, 8, 18, 35];

    for (let i = 0; i < 4; i++) {
      if (i < stepCount) {
        const time = new Date(now.getTime() - (Date.now() % 1000000) + intervals[i] * 60000);
        times.push(time.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }));
      } else {
        times.push('');
      }
    }
    return times;
  }

  function getLiveRoute(order) {
    if (order.locations && order.locations.length) return order.locations;
    return getRandomLocations(order.id || 'default');
  }

  function renderOrderTracking(id, order) {
    const result = document.getElementById('trackingResult');
    const badge = document.getElementById('trackStatusBadge');
    const currentLocation = document.getElementById('trackCurrentLocation');

    document.getElementById('trackOrderId').textContent = id;
    badge.textContent = titleCase(order.status);
    badge.className = `track-badge ${order.status}`;
    
    const route = getLiveRoute({ id, locations: order.locations });
    const currentStep = order.steps.filter(Boolean).length - 1;
    const currentLoc = route[Math.min(currentStep, 4)];
    currentLocation.innerHTML = `Current location: <strong>${order.currentLocation || currentLoc || 'In Transit'}</strong>`;

    order.steps.forEach((done, index) => {
      const step = document.getElementById(`tStep${index + 1}`);
      const connector = document.getElementById(`tConn${index + 1}`);
      const time = document.getElementById(`tTime${index + 1}`);
      const locationLabel = route[index] || '';

      if (step) step.className = `track-step${done ? ' completed' : (index > 0 && order.steps[index - 1] ? ' active' : '')}`;
      if (time) time.textContent = formatTrackingDetail(order.times[index] || '', locationLabel);
      if (connector) connector.classList.toggle('done', done);
    });

    result.style.display = 'block';
  }

  function getSavedPaymentOrder(id) {
    const entries = JSON.parse(localStorage.getItem('khojPaymentStatuses') || '[]');
    return entries.find(entry => String(entry.orderId).toUpperCase() === id);
  }

  function renderSavedPaymentOrder(id, entry) {
    const paid = entry.status === 'paid';
    const locations = getRandomLocations(id);
    const times = generateRealisticTimes(paid ? 'confirmed' : 'pending', locations);
    
    renderOrderTracking(id, {
      status: paid ? 'confirmed' : 'pending',
      steps: paid ? [true, true, false, false] : [true, false, false, false],
      times: times,
      currentLocation: paid ? locations[1] : locations[0],
      locations: locations
    });
  }

  function renderPendingFallback(id) {
    const locations = getRandomLocations(id);
    const times = generateRealisticTimes('pending', locations);
    
    renderOrderTracking(id, {
      status: 'pending',
      steps: [true, false, false, false],
      times: times,
      currentLocation: locations[0],
      locations: locations
    });
  }

  async function loadOrderTracking(id) {
    const response = await fetch(`/api/bookings/track/${encodeURIComponent(id)}`);
    if (!response.ok) throw new Error('Order not found');
    return response.json();
  }

  function renderBookingStatus(booking) {
    if (!booking) return;

    const bookingId = booking.payment?.invoiceId || booking._id || 'Current booking';
    const locations = getRandomLocations(bookingId);

    const routeByStatus = {
      pending: {
        steps: [true, false, false, false],
        currentLocation: locations[0]
      },
      confirmed: {
        steps: [true, true, false, false],
        currentLocation: locations[1]
      },
      'in-progress': {
        steps: [true, true, true, false],
        currentLocation: locations[2]
      },
      completed: {
        steps: [true, true, true, true],
        currentLocation: locations[4]
      },
      cancelled: {
        steps: [true, false, false, false],
        currentLocation: locations[0]
      }
    };

    const status = booking.status || 'pending';
    const timeline = routeByStatus[status] || routeByStatus.pending;
    const times = generateRealisticTimes(status, locations);

    renderOrderTracking(bookingId, {
      status,
      steps: timeline.steps,
      times: times,
      locations: locations,
      currentLocation: timeline.currentLocation
    });
  }

  async function updateBookingStatus(bookingId, status) {
    const response = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error((await response.json()).message || 'Status update failed');
    return response.json();
  }

  const button = document.getElementById('trackBtn');
  if (button) {
    button.addEventListener('click', async () => {
      const id = document.getElementById('trackingInput').value.trim().toUpperCase();
      if (!id || id.startsWith('KHJ-PCL')) return;

      try {
        const data = await loadOrderTracking(id);
        renderOrderTracking(data.trackingId || id, data);
      } catch (error) {
        const demo = demoOrders[id];
        if (demo) {
          renderOrderTracking(id, demo);
          return;
        }

        const saved = getSavedPaymentOrder(id);
        if (saved) {
          renderSavedPaymentOrder(id, saved);
          return;
        }

        renderPendingFallback(id);
      }
    });
  }

  window.addEventListener('khoj:payment:paid', event => {
    renderBookingStatus(event.detail?.booking);
  });

  window.KhojOrderStatusTracking = { loadOrderTracking, renderOrderTracking, renderBookingStatus, updateBookingStatus };
})();
