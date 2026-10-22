(() => {
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char]);
  const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const status = (selector, message) => {
    const element = $(selector);
    if (element) element.textContent = message || '';
  };
  async function request(path, options = {}) {
    const response = await fetch(`/api/marketplace/${path}`, {
      ...options,
      credentials: 'same-origin',
      headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
    if (!response.ok) {
      let message = `Marketplace request failed (${response.status})`;
      try {
        const body = await response.json();
        message = body.error || message;
      } catch (_) {}
      throw new Error(message);
    }
    if (response.status === 204) return undefined;
    return response.json();
  }

  let stations = [];
  let serverListings = [];
  let stationLoadError = '';
  let activeEditId = null;
  let pricingTimer = null;
  let pricingController = null;
  let orderPending = false;
  let cart = [];
  const savedFavourites = new Set();
  const stationSelect = $('#listingLocation');

  const categoryFor = (value, name = '') => {
    const text = `${value || ''} ${name || ''}`.toLowerCase();
    if (/fruit|banana|apple|mango|orange/.test(text)) return 'Fruits';
    if (/grain|rice|paddy|maize|mustard|wheat/.test(text)) return 'Grains';
    if (/herb|ginger|turmeric|herbs/.test(text)) return 'Herbs';
    if (/dairy|milk/.test(text)) return 'Dairy';
    if (/vegetable|tomato|potato|carrot|lettuce|green|cabbage|onion/.test(text)) return 'Vegetables';
    return value || 'Other';
  };
  const productIcon = (name, category) => {
    const text = `${name} ${category}`.toLowerCase();
    if (/tomato/.test(text)) return '🍅';
    if (/potato/.test(text)) return '🥔';
    if (/ginger/.test(text)) return '🫚';
    if (/banana/.test(text)) return '🍌';
    if (/apple/.test(text)) return '🍎';
    if (/rice|paddy|grain|maize/.test(text)) return '🌾';
    if (/milk|dairy/.test(text)) return '🥛';
    if (/carrot/.test(text)) return '🥕';
    return '🥬';
  };

  function getProducts() {
    const samples = typeof customerProductsData !== 'undefined' ? customerProductsData : [];
    const live = serverListings.map((listing) => ({
      id: `server:${listing.id}`,
      productId: String(listing.id),
      name: listing.name,
      category: categoryFor(listing.cropType, listing.name),
      cropType: listing.cropType,
      price: Number(listing.price),
      unit: listing.unit,
      farmer: listing.farmerName,
      location: listing.storagePointName || 'Storage station not listed',
      storagePointName: listing.storagePointName || '',
      stock: `${Number(listing.availableQuantity ?? listing.quantity)} ${listing.unit} available`,
      availableQuantity: Number(listing.availableQuantity ?? listing.quantity),
      img: '',
      season: 'Farmer listing',
      source: 'server',
      icon: productIcon(listing.name, listing.cropType),
    }));
    return [
      ...samples.map((product) => ({
        ...product,
        productId: `sample-${product.id}`,
        storagePointName: '',
        source: 'sample',
        availableQuantity: Number.parseFloat(product.stock) || 0,
        icon: productIcon(product.name, product.category),
      })),
      ...live,
    ];
  }
  function productById(id) {
    return getProducts().find((product) => String(product.id) === String(id));
  }
  function cartTotal() {
    return cart.reduce((total, item) => {
      const product = productById(item.id);
      return total + (product ? product.price * item.qty : 0);
    }, 0);
  }
  function syncCartCount() {
    const count = $('#cartCount');
    if (count) count.textContent = String(cart.reduce((sum, item) => sum + item.qty, 0));
  }
  function updateFarmerStats() {
    const count = $('#farmerListingCount');
    const stock = $('#farmerStockCount');
    if (count) count.textContent = String(serverListings.length);
    if (stock) stock.textContent = serverListings.reduce((sum, listing) =>
      sum + Number(listing.availableQuantity ?? listing.quantity ?? 0), 0).toLocaleString('en-IN');
  }
  function renderFarmerListings() {
    updateFarmerStats();
    const grid = $('#farmerListingsGrid');
    if (!grid) return;
    if (!serverListings.length) {
      grid.innerHTML = '<div class="panel" style="grid-column:1/-1;text-align:center;padding:24px"><div style="font-size:32px">🧺</div><strong>Your farm shop is ready</strong><p class="subtle">Add your first produce listing above to create a customer-ready product card.</p></div>';
      return;
    }
    grid.innerHTML = serverListings.map((listing) => {
      const category = categoryFor(listing.cropType, listing.name);
      return `<article class="farmer-listing-card"><div class="listing-art" aria-hidden="true">${productIcon(listing.name, category)}</div><div class="listing-body"><h4>${esc(listing.name)}</h4><p>${esc(category)} · Crop type: ${esc(listing.cropType)} · Storage station: ${esc(listing.storagePointName || 'Not listed')}</p><div class="customer-price farmer-listing-price">${money(listing.price)}<small style="font-size:11px;color:var(--muted)">/${esc(listing.unit)}</small></div><p style="margin-top:7px">${Number(listing.availableQuantity ?? listing.quantity)} ${esc(listing.unit)} available</p><div class="listing-actions"><button type="button" data-listing-edit="${esc(listing.id)}">Edit</button><button type="button" data-listing-remove="${esc(listing.id)}">Remove</button></div></div></article>`;
    }).join('');
  }
  function renderCustomerProducts() {
    const grid = $('#customerProducts');
    if (!grid) return;
    const query = ($('#customerProductSearch')?.value || '').trim().toLowerCase();
    const locationQuery = ($('#customerLocation')?.value || '').trim().toLowerCase();
    const selectedCategory = document.querySelector('#customerMarketTabs button.active')?.dataset.customerKind || 'All';
    const products = getProducts().filter((product) => {
      const searchable = `${product.name} ${product.category} ${product.farmer} ${product.location}`.toLowerCase();
      const locationMatches = !locationQuery || locationQuery === 'assam, india'
        || searchable.includes(locationQuery) || locationQuery.split(',')[0].trim() === 'assam';
      return (selectedCategory === 'All' || product.category === selectedCategory)
        && searchable.includes(query) && locationMatches;
    });
    const sampleCount = products.filter((product) => product.source === 'sample').length;
    const liveCount = products.length - sampleCount;
    const results = $('#customerResultsText');
    if (results) results.textContent = `${products.length} listings · ${liveCount} shared farmer ${liveCount === 1 ? 'listing' : 'listings'} · ${sampleCount} sample`;
    grid.innerHTML = products.map((product) => {
      const photo = product.img
        ? `<img src="${esc(product.img)}" alt="${esc(product.name)}" loading="lazy">`
        : `<span style="font-size:54px;display:grid;place-items:center;height:100%">${product.icon}</span>`;
      const stock = product.availableQuantity;
      const shipFrom = product.source === 'sample'
        ? `Sample origin: ${esc(product.location)}`
        : `Storage station: ${esc(product.storagePointName)}`;
      return `<article class="customer-product"><div class="customer-product-photo">${photo}<button class="heart" data-fav="${esc(product.id)}" aria-label="Save ${esc(product.name)}">${savedFavourites.has(String(product.id)) ? '♥' : '♡'}</button></div><div class="customer-product-body"><h4>${esc(product.name)}</h4><p class="product-farmer">${esc(product.farmer)} · ${shipFrom}${product.source === 'sample' ? ' · Sample' : ''}</p><div class="customer-product-bottom"><span class="customer-price">${money(product.price)}<small style="font-size:11px;color:#a8b9ab">/${esc(product.unit)}</small></span><button class="add-cart" data-add-cart="${esc(product.id)}" ${stock <= 0 ? 'disabled' : ''}>＋ Add</button></div><button class="product-detail-btn" data-product-detail="${esc(product.id)}">View details ↗</button></div></article>`;
    }).join('') || '<p class="subtle">No matching produce found. Try another search or category.</p>';
    syncCartCount();
  }

  async function loadStations() {
    try {
      stations = await request('storage-points');
      stationLoadError = '';
      if (!stationSelect) return;
      const previous = stationSelect.value;
      stationSelect.innerHTML = '<option value="">Select an available storage station</option>'
        + stations.map((station) => `<option value="${esc(station.id)}">${esc(station.name)} · ${esc(station.district)}, ${esc(station.state)}</option>`).join('');
      if (stations.some((station) => station.id === previous)) stationSelect.value = previous;
      stationSelect.disabled = stations.length === 0;
      if (!stations.length) {
        stationSelect.innerHTML = '<option value="">No available storage stations</option>';
        stationLoadError = 'No storage stations are currently available. Listings need an available station.';
        status('#farmerMarketplaceStatus', 'No storage stations are currently available. Listings need an available station.');
      }
    } catch (error) {
      stationLoadError = `Could not load storage stations: ${error.message}. Retry by refreshing the page.`;
      if (stationSelect) {
        stationSelect.innerHTML = '<option value="">Could not load stations</option>';
        stationSelect.disabled = true;
      }
      status('#farmerMarketplaceStatus', stationLoadError);
    }
  }
  async function loadListings() {
    status('#farmerMarketplaceStatus', 'Loading shared farmer listings…');
    status('#customerMarketplaceStatus', 'Loading shared farmer listings…');
    try {
      serverListings = await request('listings');
      status('#farmerMarketplaceStatus', stationLoadError);
      status('#customerMarketplaceStatus', '');
      renderFarmerListings();
      renderCustomerProducts();
      return true;
    } catch (error) {
      status('#farmerMarketplaceStatus', `Could not load marketplace listings: ${error.message}. Retry by refreshing the page.`);
      status('#customerMarketplaceStatus', `Shared farmer listings could not be loaded: ${error.message}. Sample catalog remains available.`);
      renderFarmerListings();
      renderCustomerProducts();
      return false;
    }
  }
  function selectedStationName(id) {
    return stations.find((station) => String(station.id) === String(id))?.name || '';
  }
  function farmerName() {
    try {
      const profile = JSON.parse(localStorage.getItem('vk_profile') || '{}');
      return String(profile.farmerName || '').trim() || 'Demo farmer';
    } catch (_) {
      return 'Demo farmer';
    }
  }
  function listingPayload() {
    return {
      name: $('#listingName').value.trim(),
      cropType: $('#listingCategory').value,
      price: Number($('#listingPrice').value),
      unit: $('#listingUnit').value,
      quantity: Number($('#listingStock').value),
      storagePointId: stationSelect.value,
      farmerName: farmerName(),
    };
  }
  function setFormBusy(busy) {
    const submit = $('#listingSubmit');
    if (submit) {
      submit.disabled = busy;
      submit.textContent = busy ? 'Saving…' : activeEditId ? 'Save changes' : '＋ Add listing';
    }
  }
  function resetListingForm() {
    $('#farmerListingForm')?.reset();
    activeEditId = null;
    setFormBusy(false);
    schedulePricing();
  }
  async function saveListing(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const payload = listingPayload();
    if (!payload.name || !payload.storagePointId || !Number.isFinite(payload.price) || payload.price <= 0
      || !Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      status('#farmerMarketplaceStatus', 'Enter a name, a positive price and quantity, and select an available storage station.');
      return;
    }
    const wasEditing = Boolean(activeEditId);
    setFormBusy(true);
    status('#farmerMarketplaceStatus', activeEditId ? 'Updating listing…' : 'Creating listing…');
    try {
      const saved = activeEditId
        ? await request(`listings/${encodeURIComponent(activeEditId)}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await request('listings', { method: 'POST', body: JSON.stringify(payload) });
      serverListings = wasEditing
        ? serverListings.map((listing) => String(listing.id) === String(saved.id) ? saved : listing)
        : [saved, ...serverListings];
      renderFarmerListings();
      renderCustomerProducts();
      resetListingForm();
      const refreshed = await loadListings();
      if (refreshed) status('#farmerMarketplaceStatus', wasEditing ? 'Listing updated.' : 'Listing saved and shared with the marketplace.');
      activeEditId = null;
      toast('Listing saved');
    } catch (error) {
      setFormBusy(false);
      status('#farmerMarketplaceStatus', `Could not save listing: ${error.message}`);
    }
  }
  async function removeListing(id) {
    const listing = serverListings.find((item) => String(item.id) === String(id));
    if (!listing) return;
    if (!confirm(`Remove “${listing.name}” from shared farmer listings?`)) return;
    status('#farmerMarketplaceStatus', 'Removing listing…');
    try {
      await request(`listings/${encodeURIComponent(listing.id)}`, { method: 'DELETE' });
      if (String(activeEditId) === String(listing.id)) resetListingForm();
      serverListings = serverListings.filter((item) => String(item.id) !== String(listing.id));
      renderFarmerListings();
      renderCustomerProducts();
      const refreshed = await loadListings();
      if (refreshed) status('#farmerMarketplaceStatus', 'Listing removed from the marketplace.');
      toast('Listing removed');
    } catch (error) {
      status('#farmerMarketplaceStatus', `Could not remove listing: ${error.message}`);
    }
  }
  function editListing(id) {
    const listing = serverListings.find((item) => String(item.id) === String(id));
    if (!listing) return;
    activeEditId = listing.id;
    $('#listingName').value = listing.name;
      $('#listingCategory').value = listing.cropType;
    $('#listingPrice').value = listing.price;
    $('#listingUnit').value = listing.unit;
    $('#listingStock').value = listing.availableQuantity ?? listing.quantity;
    stationSelect.value = listing.storagePointId;
    $('#listingEmoji').value = productIcon(listing.name, listing.cropType);
    setFormBusy(false);
    schedulePricing();
    $('#listingName').focus();
    $('#farmerListingForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function addToCart(product) {
    if (!product || product.availableQuantity <= 0) return;
    const item = cart.find((entry) => String(entry.id) === String(product.id));
    if (item) {
      if (item.qty >= product.availableQuantity) {
        toast('That is the available quantity for this listing');
        return;
      }
      item.qty += 1;
    } else {
      cart.push({ id: product.id, qty: 1 });
    }
    renderCustomerProducts();
    toast('Added to your demo cart');
  }
  function renderCart() {
    cart = cart.filter((item) => productById(item.id));
    const rows = cart.map((item) => {
      const product = productById(item.id);
      const shipFrom = product.source === 'sample'
        ? `Sample origin: ${product.location}`
        : `Storage station: ${product.storagePointName}`;
      return `<div style="display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)"><div><strong>${esc(product.name)}</strong><div class="subtle">${money(product.price)} / ${esc(product.unit)} · ${esc(shipFrom)}</div></div><div style="display:flex;gap:8px;align-items:center"><button class="btn ghost" data-cart-minus="${esc(product.id)}" aria-label="Remove one">−</button><strong>${item.qty}</strong><button class="btn ghost" data-cart-plus="${esc(product.id)}" aria-label="Add one" ${item.qty >= product.availableQuantity ? 'disabled' : ''}>＋</button></div></div>`;
    }).join('');
    const total = cartTotal();
    modal('Your cart', `${rows || '<p>Your cart is empty. Add fresh produce to get started.</p>'}<div style="display:flex;justify-content:space-between;padding:16px 0;font-size:18px"><strong>Current total</strong><strong>${money(total)}</strong></div><p class="subtle">Checkout submits a demo order only. No payment is processed.</p>${cart.length ? '<button class="btn green" style="width:100%" id="demoCheckout">Place demo order</button>' : ''}`);
  }
  async function checkout() {
    if (orderPending || !cart.length) return;
    const items = cart.map((item) => {
      const product = productById(item.id);
      return product && {
        productId: product.productId,
        name: product.name,
        quantity: item.qty,
        unitPrice: product.price,
        unit: product.unit,
        storagePointName: product.source === 'sample'
          ? `Sample origin: ${product.location}`
          : product.storagePointName,
      };
    }).filter(Boolean);
    if (!items.length) {
      status('#customerMarketplaceStatus', 'Your cart no longer contains available products. Refresh and try again.');
      closeModal();
      return;
    }
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    orderPending = true;
    const checkoutButton = $('#demoCheckout');
    if (checkoutButton) {
      checkoutButton.disabled = true;
      checkoutButton.textContent = 'Submitting…';
    }
    try {
      const receipt = await request('orders', { method: 'POST', body: JSON.stringify({ items, totalAmount }) });
      cart = [];
      renderCustomerProducts();
      modal('Demo order receipt', `<div class="notice"><strong>Demo receipt only.</strong> No payment has been processed.</div><p><strong>Receipt:</strong> ${esc(receipt.id)}</p><p><strong>Status:</strong> ${esc(receipt.status)}</p><p><strong>Items:</strong> ${Number(receipt.itemCount)}</p><p><strong>Total:</strong> ${money(receipt.totalAmount)}</p><p class="subtle">Recorded ${esc(new Date(receipt.createdAt).toLocaleString())}. This demo order does not charge you or confirm delivery.</p><button class="btn green" id="receiptDone">Done</button>`);
      $('#receiptDone')?.addEventListener('click', closeModal);
    } catch (error) {
      const current = $('#modalBody');
      if (current) {
        const errorMessage = document.createElement('p');
        errorMessage.className = 'notice';
        errorMessage.setAttribute('role', 'alert');
        errorMessage.textContent = `Order could not be submitted: ${error.message}. Your cart is unchanged.`;
        current.prepend(errorMessage);
      }
    } finally {
      orderPending = false;
    }
  }

  async function loadPriceGuidance() {
    const output = $('#marketSmartPricing');
    if (!output) return;
    const cropType = $('#listingCategory')?.value || '';
    const askingPrice = Number($('#listingPrice')?.value);
    const unit = $('#listingUnit')?.value || '';
    if (!cropType || !Number.isFinite(askingPrice) || askingPrice <= 0 || !unit) {
      output.innerHTML = '<strong>Market Smart Pricing</strong><p class="subtle" style="margin:5px 0 0">Enter a crop, price and unit to compare with the simulated regional cap.</p>';
      return;
    }
    if (pricingController) pricingController.abort();
    pricingController = new AbortController();
    const controller = pricingController;
    output.innerHTML = '<strong>Market Smart Pricing</strong><p class="subtle" style="margin:5px 0 0">Checking simulated regional guidance…</p>';
    const params = new URLSearchParams({ cropType, askingPrice: String(askingPrice), unit });
    try {
      const response = await fetch(`/api/marketplace/price-guidance?${params}`, {
        credentials: 'same-origin', signal: controller.signal,
      });
      if (!response.ok) {
        let message = `Guidance unavailable (${response.status})`;
        try { message = (await response.json()).error || message; } catch (_) {}
        throw new Error(message);
      }
      const guidance = await response.json();
      if (controller.signal.aborted) return;
      const below = Number(guidance.askingPrice) <= Number(guidance.regionalRetailCap);
      output.innerHTML = `<strong>Market Smart Pricing</strong><p style="margin:5px 0 0"><strong>${money(guidance.askingPrice)}/${esc(guidance.unit)}</strong> · Simulated regional cap: <strong>${money(guidance.regionalRetailCap)}/${esc(guidance.unit)}</strong></p><p class="subtle" style="margin:4px 0 0">${esc(guidance.comparison)} · Source: ${esc(guidance.sourceLabel)}</p>`;
    } catch (error) {
      if (error.name !== 'AbortError') {
        output.innerHTML = `<strong>Market Smart Pricing</strong><p class="subtle" role="alert" style="margin:5px 0 0">Price guidance unavailable: ${esc(error.message)}. Cap and source will not be shown until the service responds.</p>`;
      }
    }
  }
  function schedulePricing() {
    clearTimeout(pricingTimer);
    pricingTimer = setTimeout(loadPriceGuidance, 250);
  }

  document.addEventListener('submit', (event) => {
    if (event.target?.id === 'farmerListingForm') saveListing(event);
  }, true);
  document.addEventListener('click', (event) => {
    const target = event.target;
    const edit = target.closest?.('[data-listing-edit]');
    const remove = target.closest?.('[data-listing-remove]');
    if (edit || remove) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (edit) editListing(edit.dataset.listingEdit);
      else removeListing(remove.dataset.listingRemove);
      return;
    }
    const productGrid = target.closest?.('#customerProducts');
    if (productGrid) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const favourite = target.closest('[data-fav]');
      if (favourite) {
        const id = String(favourite.dataset.fav);
        savedFavourites.has(id) ? savedFavourites.delete(id) : savedFavourites.add(id);
        renderCustomerProducts();
        return;
      }
      const addButton = target.closest('[data-add-cart]');
      if (addButton) {
        addToCart(productById(addButton.dataset.addCart));
        return;
      }
      const details = target.closest('[data-product-detail]');
      if (details) {
        const product = productById(details.dataset.productDetail);
        if (!product) return;
        const image = product.img
          ? `<img src="${esc(product.img)}" alt="${esc(product.name)}" style="width:100%;max-height:230px;object-fit:cover;border-radius:14px">`
          : `<div style="height:150px;display:grid;place-items:center;background:#17281b;border-radius:14px;font-size:66px">${product.icon}</div>`;
        const sampleNote = product.source === 'sample' ? 'This is a sample catalog listing. ' : '';
        const shipFrom = product.source === 'sample'
          ? `Sample origin: ${esc(product.location)}`
          : `Storage station: ${esc(product.storagePointName)}`;
        modal(product.name, `<div style="display:grid;grid-template-columns:minmax(0,1fr);gap:12px">${image}<p><strong>${money(product.price)}/${esc(product.unit)}</strong> · ${esc(product.stock)}</p><p>Seller: ${esc(product.farmer)}<br>${shipFrom}</p><p class="subtle">${sampleNote}Confirm quality and availability before arranging a purchase.</p><button class="btn green" id="detailAddCart">＋ Add to cart</button></div>`);
        $('#detailAddCart')?.addEventListener('click', () => {
          addToCart(product);
          closeModal();
        });
      }
      return;
    }
    if (target.closest?.('#viewCartBtn')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      renderCart();
      return;
    }
    const plus = target.closest?.('[data-cart-plus]');
    const minus = target.closest?.('[data-cart-minus]');
    if (plus || minus) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const id = String((plus || minus).dataset.cartPlus || (plus || minus).dataset.cartMinus);
      const item = cart.find((entry) => String(entry.id) === id);
      const product = productById(id);
      if (item && product) {
        if (plus && item.qty < product.availableQuantity) item.qty += 1;
        if (minus) item.qty -= 1;
        cart = cart.filter((entry) => entry.qty > 0);
        renderCart();
        renderCustomerProducts();
      }
      return;
    }
    if (target.closest?.('#demoCheckout')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      checkout();
    }
  }, true);
  $('#listingCategory')?.addEventListener('change', schedulePricing);
  $('#listingPrice')?.addEventListener('input', schedulePricing);
  $('#listingUnit')?.addEventListener('change', schedulePricing);
  $('#customerProductSearch')?.addEventListener('input', renderCustomerProducts);
  $('#customerLocation')?.addEventListener('input', renderCustomerProducts);
  $('#customerMarketTabs')?.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => {
    setTimeout(renderCustomerProducts, 0);
  }));
  window.addEventListener('focus', () => { loadStations().then(loadListings); });

  renderFarmerListings();
  renderCustomerProducts();
  loadStations().then(loadListings);
})();
