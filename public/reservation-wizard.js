// Reservation Wizard (externalized to avoid inline script parsing issues)
const wizardConfig = window.__RESERVATION_WIZARD__ || {};
const bookingWindow = Number.isFinite(wizardConfig.bookingWindow) ? wizardConfig.bookingWindow : 30;
const preselectedWorkerId = wizardConfig.preselectedWorkerId ?? null;
const locale = wizardConfig.locale || 'cs-CZ';
const i18n = Object.assign({
  minutes: '',
  currency: '',
  startsAtPrefix: '',
  cartEmpty: '',
  loading: '',
  noSlots: '',
  loadError: '',
  slotUnavailable: '',
  serverError: '',
  submitLabel: '',
  continueLabel: '',
  sendingLabel: '',
  submitFailed: '',
  workerLabel: '',
  datetimeLabel: '',
  servicesLabel: '',
  durationLabel: '',
  paymentInfo: '',
  priceNote: '',
  verificationMessage: '',
  atTime: '',
  backLabel: ''
}, wizardConfig.i18n || {});
const servicesData = Array.isArray(wizardConfig.servicesData) ? wizardConfig.servicesData : [];
const monthNames = Array.isArray(wizardConfig.monthNames) ? wizardConfig.monthNames : [];

// State
let currentStep = 1;
let selectedWorker = { id: null, name: '' };
let cart = []; // { id, name, price, duration, priceType, quantity }
let selectedDate = null;
let selectedTime = null;
let currentMonth = new Date();
let lockToken = null;
let availabilityDates = new Set();
let availabilityLoaded = false;
let reservationCompleted = false;

// Client token for lock ownership - persisted in sessionStorage
function generateUUID() {
  // Fallback for older browsers without crypto.randomUUID()
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getClientToken() {
  let token = sessionStorage.getItem('reservationClientToken');
  if (!token) {
    token = 'client_' + generateUUID();
    sessionStorage.setItem('reservationClientToken', token);
  }
  return token;
}

function formatDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

// Unlock reservation on page close if not completed
window.addEventListener('beforeunload', async (e) => {
  if (lockToken && !reservationCompleted) {
    // Use sendBeacon for reliable unlock on page close
    const token = getClientToken();
    const data = JSON.stringify({ reservationId: lockToken, clientToken: token });
    navigator.sendBeacon('/api/reservations/unlock', data);
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  renderCalendar();

  // Add click handlers to worker cards
  document.querySelectorAll('.worker-card').forEach(card => {
    card.addEventListener('click', function () {
      const id = parseInt(this.dataset.workerId, 10);
      const name = this.dataset.workerName || '';
      if (!Number.isNaN(id)) {
        selectWorker(id, name);
        if (currentStep === 1) {
          goToStep(2);
        }
      }
    });
  });

  if (preselectedWorkerId) {
    const card = document.querySelector('.worker-card[data-worker-id="' + preselectedWorkerId + '"]');
    if (card) {
      const name = card.dataset.workerName || '';
      selectWorker(preselectedWorkerId, name);
      goToStep(2);
    }
  }

  // Input listeners for step 4
  ['customer-name', 'customer-email', 'customer-phone'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', updateNavigation);
  });
  const terms = document.getElementById('terms-accepted');
  if (terms) terms.addEventListener('change', updateNavigation);
});

function handleInlineBack() {
  if (currentStep <= 1) {
    if (history.length > 1) {
      history.back();
    } else {
      window.location.href = '/';
    }
    return;
  }
  prevStep();
}

function goToStep(step) {
  document.getElementById('step-' + currentStep).classList.add('hidden');
  currentStep = step;
  document.getElementById('step-' + currentStep).classList.remove('hidden');
  updateSteps();
  updateNavigation();
}

// Worker Selection
function selectWorker(id, name) {
  selectedWorker = { id, name };
  document.querySelectorAll('.worker-card').forEach(el => {
    el.classList.toggle('ring-2', el.dataset.workerId == id);
    el.classList.toggle('ring-primary-500', el.dataset.workerId == id);
  });
  document.getElementById('cart-worker').classList.remove('hidden');
  document.getElementById('cart-worker-name').textContent = name;
  updateNavigation();
  if (currentStep >= 3) {
    fetchAvailabilityForMonth();
  }

  // Filter services for this worker
  document.querySelectorAll('.service-card').forEach(el => {
    const service = servicesData.find(s => s.id == el.dataset.serviceId);
    const show = service && service.userId == id;
    el.style.display = show ? 'flex' : 'none';
  });

  // Hide empty categories
  document.querySelectorAll('.category-group').forEach(group => {
    const hasVisible = [...group.querySelectorAll('.service-card')].some(el => el.style.display !== 'none');
    group.style.display = hasVisible ? 'block' : 'none';
  });
}

// Service Selection
function toggleService(id) {
  const card = document.querySelector('.service-card[data-service-id="' + id + '"]');
  const idx = cart.findIndex(item => item.id === id);

  if (idx >= 0) {
    cart.splice(idx, 1);
    card.classList.remove('ring-2', 'ring-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20');
    card.querySelector('.service-quantity').classList.add('hidden');
    card.querySelector('.service-quantity').classList.remove('flex');
  } else {
    const service = servicesData.find(s => s.id === id);
    cart.push({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      priceType: service.priceType,
      quantity: 1
    });
    card.classList.add('ring-2', 'ring-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20');
    card.querySelector('.service-quantity').classList.remove('hidden');
    card.querySelector('.service-quantity').classList.add('flex');
  }

  updateCart();
  updateNavigation();
}

function updateQuantity(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.quantity = Math.max(1, item.quantity + delta);
  document.querySelector('.service-card[data-service-id="' + id + '"] .quantity-value').textContent = item.quantity;
  updateCart();
  if (currentStep >= 3) {
    fetchAvailabilityForMonth();
  }
}

function updateCart() {
  const cartItems = document.getElementById('cart-items');
  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="text-neutral-500 dark:text-neutral-400 text-sm">' + i18n.cartEmpty + '</p>';
  } else {
    cartItems.innerHTML = cart.map(item => {
      return '<div class="flex justify-between items-start text-sm">' +
        '<div>' +
          '<p class="font-medium text-neutral-900 dark:text-white">' + item.name + (item.quantity > 1 ? ' x' + item.quantity : '') + '</p>' +
          '<p class="text-neutral-500 dark:text-neutral-400">' + (item.duration * item.quantity) + ' ' + i18n.minutes + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  const totalDuration = cart.reduce((sum, item) => sum + item.duration * item.quantity, 0);
  document.getElementById('cart-duration').textContent = totalDuration + ' ' + i18n.minutes;
  if (currentStep >= 3) {
    fetchAvailabilityForMonth();
  }
}

// Calendar
function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  document.getElementById('calendar-title').textContent = (monthNames[month] || '') + ' ' + year;

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDay = (firstDay.getDay() + 6) % 7; // Monday start
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '';

  // Empty cells before first day
  for (let i = 0; i < startDay; i++) {
    html += '<div></div>';
  }

  // Days
  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(year, month, day);
    const dateStr = formatDateLocal(date);

    // Calculate limit
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + bookingWindow);
    maxDate.setHours(23, 59, 59, 999);

    const isPast = date < today;
    const isTooFar = date > maxDate;
    const isUnavailable = availabilityLoaded && !availabilityDates.has(dateStr);
    const isDisabled = isPast || isTooFar || isUnavailable;

    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
    const isToday = date.toDateString() === today.toDateString();

    const classes = [
      'w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors',
      isDisabled ? 'text-neutral-300 dark:text-neutral-600 cursor-not-allowed' : 'cursor-pointer hover:bg-primary-100 dark:hover:bg-primary-900/30',
      isSelected ? 'bg-primary-600 text-white hover:bg-primary-700' : '',
      isToday && !isSelected ? 'ring-2 ring-primary-500' : ''
    ].filter(Boolean).join(' ');

    html += '<button type="button" class="' + classes + '" ' +
      (isDisabled ? 'disabled' : 'onclick="selectDate(' + year + ',' + month + ',' + day + ')"') + '>' + day + '</button>';
  }

  document.getElementById('calendar-days').innerHTML = html;
}

function prevMonth() {
  currentMonth.setMonth(currentMonth.getMonth() - 1);
  fetchAvailabilityForMonth();
}

function nextMonth() {
  currentMonth.setMonth(currentMonth.getMonth() + 1);
  fetchAvailabilityForMonth();
}

function selectDate(year, month, day) {
  selectedDate = new Date(year, month, day);
  selectedTime = null;
  renderCalendar();
  loadTimeSlots();
  updateNavigation();
}

async function fetchAvailabilityForMonth() {
  if (!selectedWorker.id || cart.length === 0) {
    availabilityDates = new Set();
    availabilityLoaded = false;
    renderCalendar();
    return;
  }

  const totalDuration = cart.reduce((sum, item) => sum + item.duration * item.quantity, 0);
  if (!totalDuration) {
    availabilityDates = new Set();
    availabilityLoaded = false;
    renderCalendar();
    return;
  }

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const start = formatDateLocal(first);
  const end = formatDateLocal(last);

  try {
    const res = await fetch('/api/availability?start=' + start + '&end=' + end + '&workerId=' + selectedWorker.id + '&totalDuration=' + totalDuration);
    const data = await res.json();
    availabilityDates = new Set((data.availableDates || []));
    availabilityLoaded = true;
  } catch (e) {
    availabilityDates = new Set();
    availabilityLoaded = false;
  }

  renderCalendar();
}

function autoSelectFirstAvailableDate() {
  if (!availabilityLoaded || availabilityDates.size === 0) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + bookingWindow);
  maxDate.setHours(23, 59, 59, 999);

  // Find first available date starting from today
  for (let i = 0; i <= bookingWindow; i++) {
    const testDate = new Date(today);
    testDate.setDate(today.getDate() + i);
    
    if (testDate > maxDate) break;
    
    const dateStr = formatDateLocal(testDate);
    if (availabilityDates.has(dateStr)) {
      selectDate(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
      return;
    }
  }
}

async function loadTimeSlots() {
  console.log('[DEBUG] loadTimeSlots started');
  const slotsDiv = document.getElementById('time-slots');
  const refreshBtn = document.getElementById('refresh-slots-btn');
  console.log('[DEBUG] slotsDiv:', slotsDiv, 'refreshBtn:', refreshBtn);
  
  // Show loading state - empty grid with spinner
  slotsDiv.innerHTML = '<div class="col-span-3 flex items-center justify-center py-12"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-primary-600"></i></div>';
  if (refreshBtn) {
    refreshBtn.disabled = true;
  }
  if (window.lucide) {
    lucide.createIcons();
  }
  // Add spin animation AFTER lucide.createIcons() replaces the <i> with <svg>
  if (refreshBtn) {
    const icon = refreshBtn.querySelector('svg');
    if (icon) icon.classList.add('animate-spin');
  }

  const totalDuration = cart.reduce((sum, item) => sum + item.duration * item.quantity, 0);
  const dateStr = formatDateLocal(selectedDate);
  console.log('[DEBUG] Fetching slots for date:', dateStr, 'duration:', totalDuration, 'workerId:', selectedWorker.id);

  try {
    // Include clientToken to identify own locks
    const token = getClientToken();
    const url = '/api/reservations?date=' + dateStr + '&totalDuration=' + totalDuration + '&workerId=' + selectedWorker.id + '&detailed=true&clientToken=' + encodeURIComponent(token);
    console.log('[DEBUG] Fetch URL:', url);
    const res = await fetch(url);
    console.log('[DEBUG] Response status:', res.status);
    const data = await res.json();
    console.log('[DEBUG] Response data:', data);

    if (!data.slots || data.slots.length === 0) {
      slotsDiv.innerHTML = '<p class="col-span-3 text-center text-neutral-500 dark:text-neutral-400 py-4">' + i18n.noSlots + '</p>';
      // Don't return early, let finally block run
    } else {
      slotsDiv.innerHTML = data.slots.map(slot => {
        const available = slot.status === 'available';
        const locked = slot.status === 'locked';
        const ownLock = slot.status === 'own-lock';

        let classes = 'p-2 rounded-lg text-sm font-medium transition-colors ';
        if (available) {
          classes += 'bg-neutral-100 dark:bg-neutral-700 hover:bg-primary-100 dark:hover:bg-primary-900/30 text-neutral-900 dark:text-white time-slot cursor-pointer';
        } else if (ownLock) {
          // Own lock - selectable with visual indicator
          classes += 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-900/50 time-slot cursor-pointer border-2 border-primary-400 dark:border-primary-600';
        } else if (locked) {
          classes += 'bg-red-50 dark:bg-red-900/10 text-red-300 dark:text-red-700 cursor-not-allowed border border-red-100 dark:border-red-900/20';
        } else {
          classes += 'bg-neutral-50 dark:bg-neutral-800 text-neutral-300 dark:text-neutral-600 cursor-not-allowed';
        }

        const isSelectable = available || ownLock;
        return '<button type="button" class="' + classes + '" ' +
          (isSelectable ? "onclick=\"selectTime('" + slot.time + "')\"" : 'disabled') +
          ' data-time="' + slot.time + '">' + slot.time +
          (ownLock ? ' <i data-lucide="lock" class="w-3 h-3 inline ml-1"></i>' : '') +
          (locked ? ' <span class="sr-only">(obsazeno)</span>' : '') +
          '</button>';
      }).join('');

      if (window.lucide) {
        lucide.createIcons();
      }
    }

  } catch (e) {
    console.error('Error loading time slots:', e);
    slotsDiv.innerHTML = '<p class="col-span-3 text-center text-red-600 dark:text-red-400 py-4">' + i18n.loadError + '</p>';
  } finally {
    // Re-enable refresh button
    if (refreshBtn) {
      refreshBtn.disabled = false;
      const icon = refreshBtn.querySelector('svg');
      if (icon) icon.classList.remove('animate-spin');
    }
  }
}

function refreshTimeSlots() {
  if (selectedDate) {
    loadTimeSlots();
  }
}

function selectTime(time) {
  selectedTime = time;
  document.querySelectorAll('.time-slot').forEach(el => {
    const isSelected = el.dataset.time === time;
    // Remove all state classes first
    el.classList.remove('bg-primary-600', 'bg-primary-100', 'bg-neutral-100', 'text-white', 'text-primary-700', 'dark:bg-primary-900/30', 'dark:text-primary-300');
    
    if (isSelected) {
      el.classList.add('bg-primary-600', 'text-white');
    } else {
      // Restore default available state
      el.classList.add('bg-neutral-100', 'dark:bg-neutral-700');
    }
  });

  document.getElementById('cart-datetime').classList.remove('hidden');
  const dateStr = selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('cart-datetime-value').textContent = dateStr + ' ' + i18n.atTime + ' ' + time;

  updateNavigation();
}

// Step Navigation
function updateSteps() {
  document.querySelectorAll('.step-item').forEach((el, idx) => {
    const stepNum = idx + 1;
    const circle = el.querySelector('.step-circle');

    if (stepNum < currentStep) {
      circle.className = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium step-circle bg-green-500 text-white';
      circle.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
    } else if (stepNum === currentStep) {
      circle.className = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium step-circle bg-primary-600 text-white';
      circle.textContent = stepNum;
    } else {
      circle.className = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium step-circle bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400';
      circle.textContent = stepNum;
    }
  });
  if (window.lucide) {
    lucide.createIcons();
  }
}

function updateNavigation() {
  let canProceed = false;
  switch (currentStep) {
    case 1: canProceed = selectedWorker.id !== null; break;
    case 2: canProceed = cart.length > 0; break;
    case 3: canProceed = selectedDate !== null && selectedTime !== null; break;
    case 4: {
      const name = document.getElementById('customer-name').value;
      const email = document.getElementById('customer-email').value;
      const phone = document.getElementById('customer-phone').value;
      canProceed = name && email && phone;
      break;
    }
    case 5: canProceed = document.getElementById('terms-accepted').checked; break;
  }

  // Update continue buttons for steps 2-4
  const continueBtn2 = document.getElementById('btn-continue-step-2');
  if (continueBtn2) {
    continueBtn2.disabled = !(currentStep === 2 && canProceed);
  }
  
  const continueBtn3 = document.getElementById('btn-continue-step-3');
  if (continueBtn3) {
    continueBtn3.disabled = !(currentStep === 3 && canProceed);
  }
  
  const continueBtn4 = document.getElementById('btn-continue-step-4');
  if (continueBtn4) {
    continueBtn4.disabled = !(currentStep === 4 && canProceed);
  }

  // Update summary button (only for step 5)
  const summaryBtn = document.getElementById('btn-summary-action');
  if (summaryBtn) {
    if (currentStep === 5) {
      summaryBtn.classList.remove('hidden');
      summaryBtn.classList.add('flex');
      summaryBtn.disabled = !canProceed;
    } else {
      summaryBtn.classList.add('hidden');
      summaryBtn.classList.remove('flex');
    }
    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

async function nextStep() {
  hideError();

  // Lock slot when leaving step 3
  if (currentStep === 3) {
    const dateStr = formatDateLocal(selectedDate);
    const totalDuration = cart.reduce((sum, item) => sum + item.duration * item.quantity, 0);

    // Get fresh client token
    const token = getClientToken();

    console.log('Locking slot with params:', {
      workerId: selectedWorker.id,
      date: dateStr,
      time: selectedTime,
      duration: totalDuration,
      clientToken: token
    });

    try {
      const res = await fetch('/api/reservations/lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: selectedWorker.id,
          date: dateStr,
          time: selectedTime,
          duration: totalDuration,
          clientToken: token,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || i18n.slotUnavailable);
        selectedTime = null;
        loadTimeSlots();
        updateNavigation();
        return;
      }

      lockToken = data.reservationId;
    } catch (e) {
      showError(i18n.serverError);
      return;
    }
  }

  document.getElementById('step-' + currentStep).classList.add('hidden');
  currentStep++;
  document.getElementById('step-' + currentStep).classList.remove('hidden');

  // Render confirmation summary when entering step 4
  if (currentStep === 4) {
    renderConfirmation();
  }

  // When entering step 3, fetch availability and auto-select first available date
  if (currentStep === 3) {
    await fetchAvailabilityForMonth();
    autoSelectFirstAvailableDate();
  }
  updateSteps();
  updateNavigation();
}

async function prevStep() {
  const previousStep = currentStep;
  document.getElementById('step-' + currentStep).classList.add('hidden');
  currentStep--;
  document.getElementById('step-' + currentStep).classList.remove('hidden');
  
  // When returning to step 3 from step 4, reload time slots to show own lock
  if (currentStep === 3 && previousStep === 4) {
    await loadTimeSlots();
    // Re-highlight the selected time if still valid
    if (selectedTime) {
      const slotBtn = document.querySelector('.time-slot[data-time="' + selectedTime + '"]');
      if (slotBtn && !slotBtn.disabled) {
        selectTime(selectedTime);
      }
    }
  }
  
  updateSteps();
  updateNavigation();
}

function renderConfirmation() {
  const dateStr = selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const totalDuration = cart.reduce((sum, item) => sum + item.duration * item.quantity, 0);
  document.getElementById('confirmation-summary').innerHTML =
    '<div class="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-700">' +
      '<i data-lucide="user" class="w-5 h-5 text-primary-600"></i>' +
      '<div><p class="text-sm text-neutral-500 dark:text-neutral-400">' + i18n.workerLabel + '</p><p class="font-medium text-neutral-900 dark:text-white">' + selectedWorker.name + '</p></div>' +
    '</div>' +
    '<div class="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-700">' +
      '<i data-lucide="calendar" class="w-5 h-5 text-primary-600"></i>' +
      '<div><p class="text-sm text-neutral-500 dark:text-neutral-400">' + i18n.datetimeLabel + '</p><p class="font-medium text-neutral-900 dark:text-white">' + dateStr + ' ' + i18n.atTime + ' ' + (selectedTime || '—') + '</p></div>' +
    '</div>' +
    '<div class="pb-4 border-b border-neutral-200 dark:border-neutral-700">' +
      '<p class="text-sm text-neutral-500 dark:text-neutral-400 mb-2">' + i18n.servicesLabel + '</p>' +
      cart.map(item => '<p class="font-medium text-neutral-900 dark:text-white">' + item.name + (item.quantity > 1 ? ' x' + item.quantity : '') + ' — ' + (item.duration * item.quantity) + ' ' + i18n.minutes + '</p>').join('') +
    '</div>' +
    '<div class="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-700">' +
      '<i data-lucide="clock" class="w-5 h-5 text-primary-600"></i>' +
      '<div><p class="text-sm text-neutral-500 dark:text-neutral-400">' + i18n.durationLabel + '</p><p class="font-medium text-neutral-900 dark:text-white">' + totalDuration + ' ' + i18n.minutes + '</p></div>' +
    '</div>' +
    '<div class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">' + i18n.paymentInfo + '</div>' +
    '<div class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">' + i18n.priceNote + '</div>';
  if (window.lucide) {
    lucide.createIcons();
  }
}

async function submitReservation() {
  hideError();

  const submitBtn = document.getElementById('btn-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> ' + i18n.sendingLabel;
  }
  if (window.lucide) {
    lucide.createIcons();
  }

  try {
    const res = await fetch('/api/reservations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workerId: selectedWorker.id,
        date: formatDateLocal(selectedDate),
        time: selectedTime,
        customerName: document.getElementById('customer-name').value,
        customerEmail: document.getElementById('customer-email').value,
        customerPhone: document.getElementById('customer-phone').value,
        note: document.getElementById('customer-note').value,
        termsAccepted: document.getElementById('terms-accepted').checked,
        lockToken: lockToken,
        items: cart.map(item => ({ serviceId: item.id, quantity: item.quantity })),
        honeypot: document.getElementById('honeypot').value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || i18n.submitFailed);
    }

    // Mark as completed to prevent unlock on page close
    reservationCompleted = true;

    // Hide all steps and show success
    for (let i = 1; i <= 5; i++) {
      document.getElementById('step-' + i).classList.add('hidden');
    }
    document.getElementById('step-success').classList.remove('hidden');
    document.getElementById('step-navigation').classList.add('hidden');
    document.getElementById('progress-steps').classList.add('hidden');

    if (data.requireVerification) {
      document.getElementById('success-message').textContent = i18n.verificationMessage;
    }

  } catch (e) {
    showError(e.message);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i data-lucide="check" class="w-4 h-4 mr-2"></i> ' + i18n.submitLabel;
    }
    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

function showError(msg) {
  const el = document.getElementById('error-message');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-message').classList.add('hidden');
}
