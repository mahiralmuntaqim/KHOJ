(function () {
  const state = {
    lastPaidBooking: null,
    lastReview: null,
    lastEmergencyRequest: null,
    lastTrackedParcel: null
  };

  window.addEventListener('khoj:payment:paid', event => {
    state.lastPaidBooking = event.detail?.booking || null;
  });

  window.addEventListener('khoj:payment:refund-requested', event => {
    const refund = event.detail?.refund;
    if (refund && state.lastPaidBooking) {
      state.lastPaidBooking.refund = refund;
    }
  });

  window.addEventListener('khoj:review:submitted', event => {
    state.lastReview = event.detail?.review || null;
  });

  window.addEventListener('khoj:emergency:requested', event => {
    state.lastEmergencyRequest = event.detail?.request || null;
  });

  window.addEventListener('khoj:parcel:tracked', event => {
    state.lastTrackedParcel = event.detail || null;
  });

  window.KhojFeatureCollaboration = {
    getState() {
      return { ...state };
    }
  };
})();
