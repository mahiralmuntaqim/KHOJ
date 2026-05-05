(function () {
  function notify(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function renderParcel(parcel) {
    const eta = document.querySelector('.parcel-eta strong');
    const current = document.querySelector('.parcel-current strong');
    const parcelId = document.querySelector('.parcel-id strong');
    const origin = document.querySelector('.parcel-origin span');
    const destination = document.querySelector('.parcel-dest span');

    if (eta) eta.textContent = parcel.eta || 'Today, 4-6 PM';
    if (current) current.textContent = parcel.currentLocation || 'Updating location';
    if (parcelId) parcelId.textContent = parcel.parcelId;
    if (origin) origin.textContent = parcel.origin || 'Warehouse';
    if (destination) destination.textContent = parcel.destination || 'Your Address';
  }

  async function loadParcelTracking(parcelId) {
    const response = await fetch(`/api/parcels/track/${encodeURIComponent(parcelId)}`);
    if (!response.ok) throw new Error('Parcel not found');
    return response.json();
  }

  const button = document.getElementById('trackBtn');
  if (button) {
    button.addEventListener('click', async () => {
      const id = document.getElementById('trackingInput').value.trim().toUpperCase();
      if (!id.startsWith('KHJ-PCL')) return;

      try {
        const parcel = await loadParcelTracking(id);
        renderParcel(parcel);
        notify('khoj:parcel:tracked', parcel);
        alert(`Parcel ${parcel.parcelId} is ${parcel.status.replace(/-/g, ' ')} at ${parcel.currentLocation}.`);
      } catch (error) {
        alert('Parcel not found. Try: KHJ-PCL-8841');
      }
    });
  }

  window.KhojParcelTracking = { loadParcelTracking, renderParcel };
})();
