(function () {
  const fallbackPhone = '09609000000';
  const fallbackProviderNumbers = ['09609000005', '09609000006', '09609000007', '09609000008'];

  function getRandomFallbackNumber() {
    return fallbackProviderNumbers[Math.floor(Math.random() * fallbackProviderNumbers.length)];
  }

  const serviceMeta = {
    'Electric Emergency': {
      icon: '⚡',
      providerName: 'KHOJ Electric Care 24/7',
      helpline: '09609000001',
      priority: 'high',
      responseTimeMinutes: 10,
      description: 'Live electrician dispatch for wiring faults, outages, and urgent power hazards.',
      chatReplies: [
        'Electrician is on the way. Please stay away from the affected area.',
        'Share your location so we can reach you faster.'
      ]
    },
    'Plumbing Emergency': {
      icon: '🚿',
      providerName: 'KHOJ Plumbing 24/7',
      helpline: '09609000002',
      priority: 'normal',
      responseTimeMinutes: 12,
      description: 'Fast plumbing support for leaks, clogs, and water damage control.',
      chatReplies: [
        'Plumber is arriving shortly. Please shut the valve if possible.',
        'Share your location so we can route the technician immediately.'
      ]
    },
    'Locksmith': {
      icon: '🔒',
      providerName: 'KHOJ Lock Assist 24/7',
      helpline: '09609000003',
      priority: 'normal',
      responseTimeMinutes: 15,
      description: 'Urgent locksmith service for lockouts, broken keys, and safe access.',
      chatReplies: [
        'Locksmith is on the way. Please keep your ID ready if requested.',
        'Share your location for faster arrival.'
      ]
    },
    'Gas Leak': {
      icon: '🔥',
      providerName: 'KHOJ Gas Rescue 24/7',
      helpline: '09609000004',
      priority: 'high',
      responseTimeMinutes: 5,
      description: 'High-priority gas leak response with immediate safety isolation and inspection.',
      chatReplies: [
        'Gas technician is dispatched now. Evacuate until the area is safe.',
        'Share your location and stay outside until help arrives.'
      ]
    }
  };

  let liveLocation = null;
  let activeService = null;
  let countdownInterval = null;

  function notify(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function getSavedContacts() {
    return JSON.parse(localStorage.getItem('khojSosContacts') || '[]');
  }

  function saveContacts(contacts) {
    localStorage.setItem('khojSosContacts', JSON.stringify(contacts.slice(0, 5)));
    renderContacts();
  }

  function renderContacts() {
    const list = document.getElementById('sosContactList');
    if (!list) return;

    const contacts = getSavedContacts();
    if (!contacts.length) {
      list.innerHTML = '<span class="sos-contact-chip">No saved contacts yet</span>';
      return;
    }

    list.innerHTML = contacts.map((contact, index) => `
      <span class="sos-contact-chip">
        ${contact.name}: ${contact.phone}
        <button type="button" data-remove-sos="${index}">x</button>
      </span>
    `).join('');

    list.querySelectorAll('[data-remove-sos]').forEach(button => {
      button.addEventListener('click', () => {
        const next = getSavedContacts();
        next.splice(Number(button.dataset.removeSos), 1);
        saveContacts(next);
      });
    });
  }

  function getLiveLocation() {
    return new Promise(resolve => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(position => {
        liveLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          mapUrl: `https://www.google.com/maps/search/?api=1&query=${position.coords.latitude},${position.coords.longitude}`
        };
        updateLocationPreview(liveLocation);
        resolve(liveLocation);
      }, () => resolve(null), { enableHighAccuracy: true, timeout: 8000 });
    });
  }

  function updateLocationPreview(location) {
    const liveLocationText = document.getElementById('liveLocationText');
    const mapPreviewLink = document.getElementById('mapPreviewLink');
    if (!liveLocationText || !mapPreviewLink) return;

    if (location) {
      liveLocationText.textContent = `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
      mapPreviewLink.href = location.mapUrl;
      mapPreviewLink.classList.remove('hidden');
      mapPreviewLink.textContent = 'Open in Google Maps';
    } else {
      liveLocationText.textContent = 'GPS unavailable';
      mapPreviewLink.classList.add('hidden');
    }
  }

  function getPriorityLabel(key) {
    return key === 'high' ? 'High' : key === 'normal' ? 'Normal' : 'Low';
  }

  function getServiceMeta(name) {
    const meta = serviceMeta[name];
    if (meta) return meta;
    return {
      icon: '🚨',
      providerName: 'KHOJ Emergency Team 24/7',
      helpline: getRandomFallbackNumber(),
      priority: 'normal',
      responseTimeMinutes: 15,
      description: 'Emergency support is ready for your request.',
      chatReplies: ['Hi, we are ready for any emergency, please proceed.', 'Help is on the way.']
    };
  }

  function setStatus(message) {
    const status = document.getElementById('sosStatus');
    if (status) status.textContent = message;
  }

  function updatePanel(serviceType) {
    activeService = serviceType;
    const meta = getServiceMeta(serviceType);
    const emergencyPanel = document.getElementById('emergencyPanel');
    const title = document.getElementById('emergencyPanelTitle');
    const providerName = document.getElementById('emergencyProviderName');
    const description = document.getElementById('emergencyPanelDescription');
    const priorityBadge = document.getElementById('emergencyPriorityBadge');
    const callBtn = document.getElementById('emergencyCategoryCallBtn');
    const chatPanel = document.getElementById('emergencyChatPanel');

    if (emergencyPanel) emergencyPanel.classList.remove('hidden');
    if (title) title.textContent = `${meta.icon} ${serviceType}`;
    if (providerName) providerName.textContent = `${meta.providerName} is on standby 24/7.`;
    if (description) description.textContent = `${meta.description} Expected response: ${meta.responseTimeMinutes} min.`;
    if (priorityBadge) {
      priorityBadge.className = `priority-badge ${meta.priority}`;
      priorityBadge.textContent = `Priority: ${getPriorityLabel(meta.priority)}`;
    }
    if (callBtn) callBtn.dataset.helpline = meta.helpline;
    if (chatPanel) chatPanel.classList.remove('hidden');

    setStatus(`Selected ${serviceType}. Provider will respond immediately and may ask for location.`);
    if (!liveLocation) getLiveLocation();
  }

  async function requestSupport(serviceType, extra = {}) {
    const response = await fetch('/api/emergency/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceType, city: 'Dhaka', ...extra })
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.message || 'Emergency request failed');
    }
    const data = await response.json();
    notify('khoj:emergency:requested', data);
    return data;
  }

  async function triggerEmergency() {
    if (!activeService) {
      alert('Select a service category first.');
      return;
    }

    const meta = getServiceMeta(activeService);
    setStatus('Getting GPS and preparing emergency dispatch...');
    const location = liveLocation || await getLiveLocation();
    const contacts = getSavedContacts();
    const data = await requestSupport(activeService, {
      phone: contacts[0]?.phone || '',
      location,
      contacts
    });

    setStatus('Connecting… Help is on the way.');
    const countdownElement = document.getElementById('sosCountdown');
    if (countdownElement) countdownElement.textContent = `Calling helpline ${data.request.helpline} now...`;
    alert(`SOS sent.\n\nLive GPS: ${location?.mapUrl || 'Not available'}\nContacts notified: ${contacts.length}\nCalling: ${data.request.helpline}`);
    window.location.href = `tel:${data.request.helpline}`;
    return data;
  }

  function runSosCountdown() {
    const countdownElement = document.getElementById('sosCountdown');
    if (!activeService) {
      alert('Choose a service category before sending SOS.');
      return;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
    }

    let remaining = 5;
    setStatus('Connecting… Please wait.');
    if (countdownElement) countdownElement.textContent = `SOS triggering in ${remaining}s...`;
    countdownInterval = setInterval(async () => {
      remaining -= 1;
      if (countdownElement) countdownElement.textContent = `SOS triggering in ${remaining}s...`;
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        if (countdownElement) countdownElement.textContent = '';
        try {
          await triggerEmergency();
        } catch (error) {
          setStatus('Unable to send SOS. Please call directly.');
          alert(error.message || `Unable to send SOS. Call ${fallbackPhone}`);
          window.location.href = `tel:${fallbackPhone}`;
        }
      }
    }, 1000);
  }

  function appendChatMessage(text, sender = 'helper') {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function simulateProviderReply(serviceType) {
    const meta = getServiceMeta(serviceType);
    const reply = meta.chatReplies[Math.floor(Math.random() * meta.chatReplies.length)];
    setTimeout(() => appendChatMessage(reply, 'helper'), 1200);
  }

  document.querySelectorAll('.emg-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const serviceType = chip.dataset.service || chip.textContent.replace(/[^\u0000-\u007F]/g, '').trim();
      updatePanel(serviceType);
    });
  });

  document.getElementById('emergencyCategoryCallBtn')?.addEventListener('click', async () => {
    const callBtn = document.getElementById('emergencyCategoryCallBtn');
    if (!activeService) {
      activeService = 'Emergency Support';
      updatePanel(activeService);
    }
    const meta = getServiceMeta(activeService);
    const helpline = callBtn?.dataset.helpline || meta.helpline || getRandomFallbackNumber();
    setStatus(`${meta.providerName} is calling you now. Please share your location if asked.`);
    appendChatMessage('Hi, we are ready for any emergency, please proceed.', 'helper');
    appendChatMessage(`Hi, I need immediate help for ${activeService}.`, 'user');
    const location = liveLocation || await getLiveLocation();
    if (location) {
      appendChatMessage(`My location: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`, 'user');
      appendChatMessage(`${meta.providerName} received your location and is routing help immediately.`, 'helper');
    } else {
      appendChatMessage('Live location could not be determined. Please tell us your address.', 'helper');
    }
    window.location.href = `tel:${helpline}`;
  });

  document.getElementById('emergencyCategoryChatBtn')?.addEventListener('click', async () => {
    if (!activeService) {
      activeService = 'Emergency Support';
      updatePanel(activeService);
    }
    const meta = getServiceMeta(activeService);
    appendChatMessage('Hi, we are ready for any emergency, please proceed.', 'helper');
    appendChatMessage(`Hi, I need immediate help for ${activeService}.`, 'user');
    appendChatMessage(`${meta.providerName} is online and will help you right away.`, 'helper');
    const location = liveLocation || await getLiveLocation();
    if (location) {
      appendChatMessage(`My location: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`, 'user');
      appendChatMessage(`Thanks! We got your location and are dispatching help now.`, 'helper');
    } else {
      appendChatMessage('Location unavailable. Please share your address.', 'helper');
    }
  });

  document.getElementById('emergencyPanelSosBtn')?.addEventListener('click', () => {
    runSosCountdown();
  });

  document.getElementById('saveSosContactBtn')?.addEventListener('click', () => {
    const name = document.getElementById('sosContactName').value.trim();
    const phone = document.getElementById('sosContactPhone').value.trim();
    if (!name || !phone) {
      alert('Please enter contact name and phone.');
      return;
    }

    saveContacts([{ name, phone }, ...getSavedContacts()]);
    document.getElementById('sosContactName').value = '';
    document.getElementById('sosContactPhone').value = '';
  });

  document.getElementById('chatSendBtn')?.addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const message = input.value.trim();
    if (!message) return;
    appendChatMessage(message, 'user');
    input.value = '';
    if (activeService) simulateProviderReply(activeService);
  });

  document.getElementById('sosButton')?.addEventListener('click', async () => {
    try {
      if (!activeService) {
        setStatus('Tap a category first, then use ONE-TAP SOS.');
        return;
      }
      runSosCountdown();
    } catch (error) {
      alert(error.message || `Unable to send SOS. Call ${fallbackPhone}`);
      window.location.href = `tel:${fallbackPhone}`;
    }
  });

  document.getElementById('emergencyHelplineLink')?.addEventListener('click', () => {
    setStatus('Calling the emergency helpline now...');
  });

  renderContacts();
})();
