// Reservation Wizard (externalized to avoid inline script parsing issues)

// XSS protection: escape HTML entities in user-provided data
function escapeHTML(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

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
  backLabel: '',
  missingWorker: '',
  missingServices: '',
  missingDate: '',
  missingTime: '',
  missingContact: '',
  missingTerms: '',
  invalidEmail: '',
  invalidPhone: '',
  lockExpired: ''
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
let lockToken = null; // Client lock token returned by /api/reservations/lock
let availabilityDates = new Set();
let availabilityLoaded = false;
let reservationCompleted = false;
let lockExpiresAt = null;
let lockTimerId = null;
let loadRequestId = 0;

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
window.addEventListener('beforeunload', () => {
  if (lockToken && !reservationCompleted) {
    // Use sendBeacon for reliable unlock on page close
    const payload = JSON.stringify({ clientToken: lockToken });
    if (typeof Blob !== 'undefined') {
      navigator.sendBeacon('/api/reservations/unlock', new Blob([payload], { type: 'application/json' }));
    } else {
      navigator.sendBeacon('/api/reservations/unlock', payload);
    }
  }
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) {
    lucide.createIcons();
  }
  renderCalendar();

  // Add click handlers to worker cards (only non-external ones)
  document.querySelectorAll('.worker-card:not([data-worker-external="true"])').forEach(card => {
    card.addEventListener('click', function (e) {
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
    if (card && card.dataset.workerExternal !== 'true') {
      const name = card.dataset.workerName || '';
      selectWorker(preselectedWorkerId, name);
      goToStep(2);
    }
  }

  // Auto-skip step 1 if only one bookable (non-external) worker is available
  if (!preselectedWorkerId) {
    const workerCards = document.querySelectorAll('.worker-card:not([data-worker-external="true"])');
    if (workerCards.length === 1) {
      const card = workerCards[0];
      const id = parseInt(card.dataset.workerId, 10);
      const name = card.dataset.workerName || '';
      if (!Number.isNaN(id)) {
        selectWorker(id, name);
        goToStep(2);
      }
    }
  }

  // Input listeners for step 4
  ['customer-name', 'customer-email', 'customer-phone'].forEach(id => {
    const input = document.getElementById(id);
    if (input) input.addEventListener('input', updateNavigation);
  });
  const terms = document.getElementById('terms-accepted');
  if (terms) terms.addEventListener('change', updateNavigation);

  // Inline validation on blur
  const emailInput = document.getElementById('customer-email');
  if (emailInput) {
    emailInput.addEventListener('blur', () => {
      const val = emailInput.value.trim();
      if (val && !isValidEmail(val)) {
        emailInput.classList.add('border-red-500', 'focus:border-red-500');
        emailInput.classList.remove('border-neutral-200', 'focus:border-primary-500');
        showFieldError('customer-email', i18n.invalidEmail);
      } else {
        emailInput.classList.remove('border-red-500', 'focus:border-red-500');
        clearFieldError('customer-email');
      }
    });
    emailInput.addEventListener('input', () => {
      emailInput.classList.remove('border-red-500', 'focus:border-red-500');
      clearFieldError('customer-email');
    });
  }

  const phoneInput = document.getElementById('customer-phone');
  if (phoneInput) {
    phoneInput.addEventListener('focus', () => {
      if (!phoneInput.value) phoneInput.value = '+420 ';
    });
    phoneInput.addEventListener('blur', () => {
      const val = phoneInput.value.trim();
      if (val && val !== '+420' && val !== '+420 ' && !isValidPhone(val)) {
        phoneInput.classList.add('border-red-500', 'focus:border-red-500');
        phoneInput.classList.remove('border-neutral-200', 'focus:border-primary-500');
        showFieldError('customer-phone', i18n.invalidPhone);
      } else {
        phoneInput.classList.remove('border-red-500', 'focus:border-red-500');
        clearFieldError('customer-phone');
      }
    });
    phoneInput.addEventListener('input', () => {
      phoneInput.classList.remove('border-red-500', 'focus:border-red-500');
      clearFieldError('customer-phone');
    });
  }
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
  clearLockIfNeeded();
  cart = [];
  selectedDate = null;
  selectedTime = null;
  updateCart();
  resetDateTimeSelections();

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
    if (!show && service) {
      removeServiceById(service.id);
    }
  });

  // Hide empty categories
  document.querySelectorAll('.category-group').forEach(group => {
    const hasVisible = [...group.querySelectorAll('.service-card')].some(el => el.style.display !== 'none');
    group.style.display = hasVisible ? 'block' : 'none';
  });

  if (cart.length === 0) {
    updateCart();
  }
}

function removeServiceSelection(card) {
  card.classList.remove('ring-2', 'ring-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20');
  const qty = card.querySelector('.service-quantity');
  if (qty) {
    qty.classList.add('hidden');
    qty.classList.remove('flex');
  }
  const value = card.querySelector('.quantity-value');
  if (value) value.textContent = '1';
}

function removeServiceById(serviceId) {
  cart = cart.filter(item => item.id !== serviceId);
  const card = document.querySelector('.service-card[data-service-id="' + serviceId + '"]');
  if (card) removeServiceSelection(card);
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

  const nextQuantity = item.quantity + delta;
  if (nextQuantity <= 0) {
    cart = cart.filter(service => service.id !== id);
    const card = document.querySelector('.service-card[data-service-id="' + id + '"]');
    if (card) {
      card.classList.remove('ring-2', 'ring-primary-500', 'bg-primary-50', 'dark:bg-primary-900/20');
      const qty = card.querySelector('.service-quantity');
      if (qty) {
        qty.classList.add('hidden');
        qty.classList.remove('flex');
      }
      const value = card.querySelector('.quantity-value');
      if (value) value.textContent = '1';
    }
  } else {
    item.quantity = nextQuantity;
    document.querySelector('.service-card[data-service-id="' + id + '"] .quantity-value').textContent = item.quantity;
  }
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
          '<p class="font-medium text-neutral-900 dark:text-white">' + escapeHTML(item.name) + (item.quantity > 1 ? ' x' + item.quantity : '') + '</p>' +
          '<p class="text-neutral-500 dark:text-neutral-400">' + (item.duration * item.quantity) + ' ' + escapeHTML(i18n.minutes) + '</p>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  const totalDuration = cart.reduce((sum, item) => sum + item.duration * item.quantity, 0);
  document.getElementById('cart-duration').textContent = totalDuration + ' ' + i18n.minutes;
  if (totalDuration === 0) {
    resetDateTimeSelections();
  }
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
    const isAvailable = availabilityLoaded && availabilityDates.has(dateStr);

    const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();
    const isToday = date.toDateString() === today.toDateString();

    const classes = [
      'calendar-day',
      isDisabled ? 'disabled' : '',
      isAvailable && !isSelected && !isDisabled ? 'available' : '',
      isSelected ? 'selected' : '',
      isToday && !isSelected ? 'today' : ''
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
  clearLockIfNeeded();
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
  const thisRequestId = ++loadRequestId;
  const slotsDiv = document.getElementById('time-slots');
  const refreshBtn = document.getElementById('refresh-slots-btn');
  
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
  if (!selectedDate || totalDuration <= 0) {
    slotsDiv.innerHTML = '<p class="col-span-3 text-center text-neutral-500 dark:text-neutral-400 py-4">' + i18n.select_date_first + '</p>';
    if (refreshBtn) {
      refreshBtn.disabled = false;
      const icon = refreshBtn.querySelector('svg');
      if (icon) icon.classList.remove('animate-spin');
    }
    return;
  }
  const dateStr = formatDateLocal(selectedDate);
  try {
    // Include clientToken to identify own locks
    const token = getClientToken();
    const url = '/api/reservations?date=' + dateStr + '&totalDuration=' + totalDuration + '&workerId=' + selectedWorker.id + '&detailed=true&clientToken=' + encodeURIComponent(token);
    const res = await fetch(url);

    // Stale response guard: if a newer request was started, discard this result
    if (thisRequestId !== loadRequestId) return;

    const data = await res.json();

    if (!data.slots || data.slots.length === 0) {
      if (thisRequestId !== loadRequestId) return;
      slotsDiv.innerHTML = '<p class="col-span-3 text-center text-neutral-500 dark:text-neutral-400 py-4">' + i18n.noSlots + '</p>';
      // Don't return early, let finally block run
    } else {
      if (thisRequestId !== loadRequestId) return;
      const selected = selectedTime;
      slotsDiv.innerHTML = data.slots.map(slot => {
        const available = slot.status === 'available';
        const locked = slot.status === 'locked';
        const ownLock = slot.status === 'own-lock';
        const isSelected = selected && slot.time === selected;

        let classes = 'time-slot ';
        if (available || ownLock) {
          classes += 'cursor-pointer';
          if (ownLock) {
            classes += ' border-2 border-primary-400 dark:border-primary-600';
          }
        } else if (locked) {
          classes += 'bg-red-50 dark:bg-red-900/10 text-red-300 dark:text-red-700 cursor-not-allowed border border-red-100 dark:border-red-900/20';
        } else {
          classes += 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed opacity-60';
        }

        if (isSelected && (available || ownLock)) {
          classes += ' selected';
        }

        const isSelectable = available || ownLock;
        return '<button type="button" class="' + classes + '" ' +
          (isSelectable ? "onclick=\"selectTime('" + slot.time + "')\"" : 'disabled') +
          ' data-time="' + slot.time + '">' + slot.time +
          (ownLock ? ' <i data-lucide="lock" class="w-3 h-3 inline ml-1"></i>' : '') +
          '</button>';
      }).join('');

      if (selected) {
        const slotBtn = document.querySelector('.time-slot[data-time="' + selected + '"]');
        if (slotBtn && !slotBtn.disabled) {
          selectTime(selected);
        }
      }
      if (window.lucide) {
        lucide.createIcons();
      }
    }

  } catch (e) {
    console.error('Error loading time slots:', e);
    if (thisRequestId !== loadRequestId) return;
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
    // Toggle the CSS .selected class which is styled in Layout.tsx
    el.classList.toggle('selected', isSelected);
  });

  document.getElementById('cart-datetime').classList.remove('hidden');
  const dateStr = selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  document.getElementById('cart-datetime-value').textContent = dateStr + ' ' + i18n.atTime + ' ' + time;

  updateNavigation();
}

// Step Navigation
function updateSteps() {
  document.querySelectorAll('.step-item').forEach((el, idx) => {
    const stepNum = Number(el.dataset.step) || (idx + 1);
    const displayStepNum = idx + 1;
    const circle = el.querySelector('.step-circle');

    if (stepNum < currentStep) {
      circle.className = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium step-circle bg-green-500 text-white';
      circle.innerHTML = '<i data-lucide="check" class="w-4 h-4"></i>';
    } else if (stepNum === currentStep) {
      circle.className = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium step-circle bg-primary-600 text-white';
      circle.textContent = displayStepNum;
    } else {
      circle.className = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium step-circle bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400';
      circle.textContent = displayStepNum;
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
      const name = document.getElementById('customer-name').value.trim();
      const email = document.getElementById('customer-email').value.trim();
      const phone = document.getElementById('customer-phone').value.trim();
      canProceed = name && email && phone && isValidEmail(email) && isValidPhone(phone);
      break;
    }
    case 5: canProceed = document.getElementById('terms-accepted').checked; break;
  }

  // Update continue buttons for steps 2-4
  const continueBtn2 = document.getElementById('btn-continue-step-2');
  if (continueBtn2) {
    continueBtn2.disabled = !(currentStep === 2 && canProceed);
    continueBtn2.classList.toggle('btn-cta', currentStep === 2 && canProceed);
  }
  
  const continueBtn3 = document.getElementById('btn-continue-step-3');
  if (continueBtn3) {
    continueBtn3.disabled = !(currentStep === 3 && canProceed);
    continueBtn3.classList.toggle('btn-cta', currentStep === 3 && canProceed);
  }
  
  const continueBtn4 = document.getElementById('btn-continue-step-4');
  if (continueBtn4) {
    continueBtn4.disabled = !(currentStep === 4 && canProceed);
    continueBtn4.classList.toggle('btn-cta', currentStep === 4 && canProceed);
  }

  // Update summary button (only for step 5)
  const summaryBtn = document.getElementById('btn-summary-action');
  if (summaryBtn) {
    if (currentStep === 5) {
      summaryBtn.classList.remove('hidden');
      summaryBtn.classList.add('flex');
      summaryBtn.disabled = !canProceed;
      summaryBtn.classList.toggle('btn-cta', canProceed);
    } else {
      summaryBtn.classList.add('hidden');
      summaryBtn.classList.remove('flex');
    }
    if (window.lucide) {
      lucide.createIcons();
    }
  }
}

function showTooltip(targetId, message) {
  const target = document.getElementById(targetId);
  if (!target || !message) return;
  const existing = document.querySelector('[data-tooltip="' + targetId + '"]');
  if (existing) existing.remove();
  const tooltip = document.createElement('div');
  tooltip.dataset.tooltip = targetId;
  tooltip.className = 'absolute z-50 text-xs px-2 py-1 rounded bg-red-600 text-white shadow-md';
  tooltip.textContent = message;
  document.body.appendChild(tooltip);
  const rect = target.getBoundingClientRect();
  tooltip.style.left = rect.left + rect.width / 2 + 'px';
  tooltip.style.top = rect.top - 8 + window.scrollY + 'px';
  tooltip.style.transform = 'translate(-50%, -100%)';
  setTimeout(() => tooltip.remove(), 2400);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  return /^\+?\d[\d\s]{8,}$/.test(value);
}

function resetDateTimeSelections() {
  selectedDate = null;
  selectedTime = null;
  const cartDatetime = document.getElementById('cart-datetime');
  if (cartDatetime) cartDatetime.classList.add('hidden');
  if (lockTimerId) {
    clearTimeout(lockTimerId);
    lockTimerId = null;
  }
  lockToken = null;
  lockExpiresAt = null;
  const slotsDiv = document.getElementById('time-slots');
  if (slotsDiv) {
    slotsDiv.innerHTML = '<p class="col-span-3 text-center text-neutral-500 dark:text-neutral-400 py-4">' + i18n.select_date_first + '</p>';
  }
  // Increment loadRequestId to cancel any in-flight loadTimeSlots calls
  loadRequestId++;
  renderCalendar();
}

async function clearLockIfNeeded() {
  if (!lockToken) return;
  try {
    await fetch('/api/reservations/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientToken: lockToken })
    });
  } finally {
    lockToken = null;
    lockExpiresAt = null;
    if (lockTimerId) {
      clearTimeout(lockTimerId);
      lockTimerId = null;
    }
  }
}

async function nextStep() {
  hideError();
  if (!validateStep(currentStep)) {
    return;
  }

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

      lockToken = data.lockToken || token;
      lockExpiresAt = data.expiresAt || null;
      if (lockTimerId) clearTimeout(lockTimerId);
      if (lockExpiresAt) {
        const remaining = new Date(lockExpiresAt).getTime() - Date.now();
        if (remaining > 0) {
          lockTimerId = setTimeout(() => {
            lockToken = null;
            lockExpiresAt = null;
            selectedTime = null;
            showError(i18n.lockExpired);
            loadTimeSlots();
            updateNavigation();
          }, remaining);
        }
      }
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
    // Show loading on time slots while availability loads
    const slotsDiv = document.getElementById('time-slots');
    if (slotsDiv) {
      slotsDiv.innerHTML = '<div class="col-span-3 flex items-center justify-center py-12"><i data-lucide="loader-2" class="w-8 h-8 animate-spin text-primary-600"></i></div>';
      if (window.lucide) lucide.createIcons();
    }
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
      '<div><p class="text-sm text-neutral-500 dark:text-neutral-400">' + escapeHTML(i18n.workerLabel) + '</p><p class="font-medium text-neutral-900 dark:text-white">' + escapeHTML(selectedWorker.name) + '</p></div>' +
    '</div>' +
    '<div class="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-700">' +
      '<i data-lucide="calendar" class="w-5 h-5 text-primary-600"></i>' +
      '<div><p class="text-sm text-neutral-500 dark:text-neutral-400">' + escapeHTML(i18n.datetimeLabel) + '</p><p class="font-medium text-neutral-900 dark:text-white">' + escapeHTML(dateStr) + ' ' + escapeHTML(i18n.atTime) + ' ' + escapeHTML(selectedTime || '—') + '</p></div>' +
    '</div>' +
    '<div class="pb-4 border-b border-neutral-200 dark:border-neutral-700">' +
      '<p class="text-sm text-neutral-500 dark:text-neutral-400 mb-2">' + escapeHTML(i18n.servicesLabel) + '</p>' +
      cart.map(item => '<p class="font-medium text-neutral-900 dark:text-white">' + escapeHTML(item.name) + (item.quantity > 1 ? ' x' + item.quantity : '') + ' — ' + (item.duration * item.quantity) + ' ' + escapeHTML(i18n.minutes) + '</p>').join('') +
    '</div>' +
    '<div class="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-700">' +
      '<i data-lucide="clock" class="w-5 h-5 text-primary-600"></i>' +
      '<div><p class="text-sm text-neutral-500 dark:text-neutral-400">' + escapeHTML(i18n.durationLabel) + '</p><p class="font-medium text-neutral-900 dark:text-white">' + totalDuration + ' ' + escapeHTML(i18n.minutes) + '</p></div>' +
    '</div>' +
    '<div class="mt-4 text-sm text-neutral-500 dark:text-neutral-400">' + escapeHTML(i18n.paymentInfo) + '</div>' +
    '<div class="text-xs text-neutral-500 dark:text-neutral-400 mt-1">' + escapeHTML(i18n.priceNote) + '</div>';
  if (window.lucide) {
    lucide.createIcons();
  }
}

async function submitReservation() {
  hideError();
  if (!validateStep(4) || !validateStep(5)) {
    return;
  }

  if (lockExpiresAt && new Date(lockExpiresAt).getTime() <= Date.now()) {
    showError(i18n.lockExpired);
    return;
  }

  const submitBtn = document.getElementById('btn-summary-action');
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
        clientToken: getClientToken(),
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
    if (lockTimerId) {
      clearTimeout(lockTimerId);
      lockTimerId = null;
    }

    // Hide all steps and show success
    for (let i = 1; i <= 5; i++) {
      document.getElementById('step-' + i).classList.add('hidden');
    }
    const successStep = document.getElementById('step-success');
    if (successStep) successStep.classList.remove('hidden');

    const stepNavigation = document.getElementById('step-navigation');
    if (stepNavigation) stepNavigation.classList.add('hidden');

    const progressSteps = document.getElementById('progress-steps');
    if (progressSteps) progressSteps.classList.add('hidden');

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

function validateStep(step) {
  switch (step) {
    case 1:
      if (!selectedWorker.id) {
        showError(i18n.missingWorker);
        showTooltip('step-1', i18n.missingWorker);
        return false;
      }
      break;
    case 2:
      if (cart.length === 0) {
        showError(i18n.missingServices);
        showTooltip('btn-continue-step-2', i18n.missingServices);
        return false;
      }
      break;
    case 3:
      if (!selectedDate) {
        showError(i18n.missingDate);
        showTooltip('calendar-days', i18n.missingDate);
        return false;
      }
      if (!selectedTime) {
        showError(i18n.missingTime);
        showTooltip('time-slots', i18n.missingTime);
        return false;
      }
      break;
    case 4: {
      const name = document.getElementById('customer-name').value.trim();
      const email = document.getElementById('customer-email').value.trim();
      const phone = document.getElementById('customer-phone').value.trim();
      if (!name || !email || !phone) {
        showError(i18n.missingContact);
        showTooltip('customer-name', i18n.missingContact);
        return false;
      }
      if (!isValidEmail(email)) {
        showError(i18n.invalidEmail);
        showTooltip('customer-email', i18n.invalidEmail);
        return false;
      }
      if (!isValidPhone(phone)) {
        showError(i18n.invalidPhone);
        showTooltip('customer-phone', i18n.invalidPhone);
        return false;
      }
      break;
    }
    case 5:
      if (!document.getElementById('terms-accepted').checked) {
        showError(i18n.missingTerms);
        showTooltip('terms-accepted', i18n.missingTerms);
        return false;
      }
      break;
    default:
      return true;
  }
  return true;
}

function showError(msg) {
  const el = document.getElementById('error-message');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-message').classList.add('hidden');
}

function showFieldError(fieldId, message) {
  clearFieldError(fieldId);
  const field = document.getElementById(fieldId);
  if (!field) return;
  const errorEl = document.createElement('p');
  errorEl.id = fieldId + '-error';
  errorEl.className = 'text-red-500 text-xs mt-1';
  errorEl.textContent = message;
  field.parentNode.appendChild(errorEl);
}

function clearFieldError(fieldId) {
  const existing = document.getElementById(fieldId + '-error');
  if (existing) existing.remove();
}
