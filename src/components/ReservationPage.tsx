import type { FC, PropsWithChildren } from 'hono/jsx';
import { html } from 'hono/html';
import type { User, ServiceWithCategory, ServiceCategory, SlotStatus } from '../types';
import { getTranslations } from '../lib/i18n';

const t = getTranslations();

const fallbackPhoto = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#f5f0e8" />
        <stop offset="100%" stop-color="#dcc9ad" />
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#g)" />
    <rect x="45" y="60" width="110" height="80" rx="12" fill="none" stroke="#8a654b" stroke-width="8" />
    <circle cx="80" cy="90" r="10" fill="#8a654b" />
    <path d="M60 130l25-25 20 20 15-15 30 30" fill="none" stroke="#8a654b" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`
)}`;

// ============ RESERVATION PAGE ============

interface ReservationPageProps {
  workers: Omit<User, 'password_hash'>[];
  services: ServiceWithCategory[];
  categories: ServiceCategory[];
  preselectedWorkerId?: number;
}

export const ReservationPage: FC<ReservationPageProps> = ({ 
  workers, 
  services, 
  categories,
  preselectedWorkerId 
}) => {
  const today = new Date();
  const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Group services by category
  const servicesByCategory: Record<string, ServiceWithCategory[]> = {};
  for (const service of services) {
    const catName = service.category_name || t.common.other;
    if (!servicesByCategory[catName]) {
      servicesByCategory[catName] = [];
    }
    servicesByCategory[catName].push(service);
  }
  
  return (
    <div class="section py-8">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-8">
          <h1 class="section-title">{t.reservation.title}</h1>
          <p class="section-subtitle mx-auto">{t.reservation.subtitle}</p>
        </div>
        
        {/* Reservation Form */}
        <form id="reservation-form" class="space-y-8">
          <input type="hidden" name="honeypot" id="honeypot" value="" />
          
          <div class="grid lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div class="lg:col-span-2 space-y-8">
              
              {/* Step 1: Select Worker */}
              <div class="card p-6" id="step-worker">
                <h2 class="text-xl font-semibold mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
                  <span class="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm">1</span>
                  {t.reservation.select_worker}
                </h2>
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {workers.map(worker => (
                    <label class="cursor-pointer">
                      <input 
                        type="radio" 
                        name="workerId" 
                        value={worker.id} 
                        class="peer hidden"
                        required
                        checked={preselectedWorkerId === worker.id}
                        onchange="updateServices(); updateCart();"
                      />
                      <div class="card p-4 text-center border-2 border-transparent peer-checked:border-primary-500 transition-colors">
                        <div class="w-16 h-16 mx-auto mb-2 rounded-full bg-primary-100 dark:bg-neutral-700 flex items-center justify-center overflow-hidden">
                          {worker.image ? (
                            <img src={worker.image} alt={worker.name} class="w-full h-full object-cover" loading="lazy" decoding="async" onerror={`this.onerror=null; this.src='${fallbackPhoto}'; this.classList.add('object-contain');`} />
                          ) : (
                            <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 text-primary-600 dark:text-primary-300">
                              <i data-lucide="image" class="w-8 h-8"></i>
                            </div>
                          )}
                        </div>
                        <p class="font-medium text-neutral-900 dark:text-white">{worker.name}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Step 2: Select Services */}
              <div class="card p-6" id="step-services">
                <h2 class="text-xl font-semibold mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
                  <span class="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm">2</span>
                  {t.reservation.select_services}
                </h2>
                
                <div id="services-container" class="space-y-6">
                  {Object.entries(servicesByCategory).map(([categoryName, categoryServices]) => (
                    <div>
                      <h3 class="font-semibold text-neutral-700 dark:text-neutral-300 mb-3">{categoryName}</h3>
                      <div class="space-y-2">
                        {categoryServices.map(service => (
                          <div 
                            class="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-600 transition-colors service-item"
                            data-service-id={service.id}
                            data-user-id={service.user_id}
                          >
                            <div class="flex-1">
                              <p class="font-medium text-neutral-900 dark:text-white">{service.name}</p>
                              <p class="text-sm text-neutral-500 dark:text-neutral-400">
                                {service.duration} {t.common.minutes} • {service.price_type === 'starts_at' ? t.common.starts_at_prefix : ''}{service.price} {t.common.currency}
                              </p>
                            </div>
                            <button 
                              type="button"
                              class="w-10 h-10 rounded-full bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 transition-colors add-service-btn"
                              onclick={`addToCart(${service.id}, '${service.name}', ${service.duration}, ${service.price}, '${service.price_type}')`}
                            >
                              <i data-lucide="plus" class="w-5 h-5"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Step 3: Select Date/Time */}
              <div class="card p-6" id="step-datetime">
                <h2 class="text-xl font-semibold mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
                  <span class="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm">3</span>
                  {t.reservation.select_datetime}
                </h2>
                
                <div class="grid md:grid-cols-2 gap-6">
                  {/* Calendar */}
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.select_date_label}</label>
                    <input 
                      type="date" 
                      name="date" 
                      id="date-input"
                      class="form-input"
                      min={minDate}
                      required
                      onchange="loadSlots()"
                    />
                  </div>
                  
                  {/* Time Slots */}
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.select_time_label}</label>
                    <div id="time-slots" class="min-h-[150px] flex items-center justify-center text-neutral-500">
                      {t.reservation.select_datetime_help}
                    </div>
                    <input type="hidden" name="time" id="time-input" required />
                  </div>
                </div>
              </div>
              
              {/* Step 4: Customer Details */}
              <div class="card p-6" id="step-details">
                <h2 class="text-xl font-semibold mb-4 flex items-center gap-2 text-neutral-900 dark:text-white">
                  <span class="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm">4</span>
                  {t.reservation.your_details}
                </h2>
                
                <div class="grid md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.name} *</label>
                    <input type="text" name="customerName" class="form-input" required placeholder={t.reservation.name_placeholder} />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.email} *</label>
                    <input type="email" name="customerEmail" class="form-input" required placeholder={t.reservation.email_placeholder} />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.phone} *</label>
                    <input type="tel" name="customerPhone" class="form-input" required placeholder={t.reservation.phone_placeholder} />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.note}</label>
                    <input type="text" name="note" class="form-input" placeholder={t.reservation.note_placeholder} />
                  </div>
                </div>
                
                <div class="mt-4">
                  <label class="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" name="termsAccepted" required class="mt-1" />
                    <span class="text-sm text-neutral-600 dark:text-neutral-400">
                      {t.reservation.terms_agree} (<a href="/obchodni-podminky" target="_blank" class="text-primary-600 hover:underline">{t.common.view}</a>)
                    </span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Sidebar - Cart */}
            <div class="lg:col-span-1">
              <div class="card p-6 sticky top-24">
                <h3 class="text-lg font-semibold mb-4 text-neutral-900 dark:text-white">{t.reservation.cart_title}</h3>
                
                <div id="cart-items" class="space-y-3 mb-4">
                  <p class="text-neutral-500 text-sm">{t.reservation.cart_empty}</p>
                </div>
                
                <div id="cart-totals" class="hidden border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-2">
                  <div class="flex justify-between text-sm">
                    <span class="text-neutral-600 dark:text-neutral-400">{t.reservation.total_duration}:</span>
                    <span id="total-duration" class="font-medium text-neutral-900 dark:text-white">0 {t.common.minutes}</span>
                  </div>
                </div>
                
                <button 
                  type="submit" 
                  id="submit-btn"
                  class="btn btn-primary w-full mt-6 flex items-center justify-center gap-2"
                  disabled
                >
                  <i data-lucide="send" class="w-4 h-4"></i>
                  {t.reservation.submit}
                </button>
                <p class="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                  {t.reservation.submit_disclaimer}
                </p>
                
                <div id="form-error" class="hidden mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg text-sm"></div>
                <div id="form-success" class="hidden mt-4 p-3 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded-lg text-sm"></div>
              </div>
            </div>
          </div>
        </form>
        
        {/* Success Modal */}
        <div id="success-modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white dark:bg-neutral-800 rounded-2xl p-8 max-w-md mx-4 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <i data-lucide="check-circle" class="w-8 h-8 text-green-600 dark:text-green-400"></i>
            </div>
            <h3 class="text-2xl font-semibold mb-2 text-neutral-900 dark:text-white">{t.reservation.success_title}</h3>
            <p class="text-neutral-600 dark:text-neutral-400 mb-6">{t.reservation.success_message}</p>
            <a href="/" class="btn btn-primary">{t.common.back_home}</a>
          </div>
        </div>
      </div>
      
      {/* JavaScript for form handling */}
      <script dangerouslySetInnerHTML={{ __html: `
        // Cart state
        let cart = [];
        let selectedTime = null;
        
        // Get worker ID
        function getWorkerId() {
          const radio = document.querySelector('input[name="workerId"]:checked');
          return radio ? parseInt(radio.value) : null;
        }
        
        // Filter services by worker
        function updateServices() {
          const workerId = getWorkerId();
          document.querySelectorAll('.service-item').forEach(item => {
            const serviceUserId = parseInt(item.dataset.userId);
            if (!workerId || serviceUserId === workerId) {
              item.style.display = 'flex';
            } else {
              item.style.display = 'none';
            }
          });
        }
        
        // Add service to cart
        function addToCart(id, name, duration, price, priceType) {
          const existing = cart.find(item => item.id === id);
          if (existing) {
            existing.quantity++;
          } else {
            cart.push({ id, name, duration, price, priceType, quantity: 1 });
          }
          updateCart();
        }
        
        // Remove from cart
        function removeFromCart(id) {
          const index = cart.findIndex(item => item.id === id);
          if (index > -1) {
            if (cart[index].quantity > 1) {
              cart[index].quantity--;
            } else {
              cart.splice(index, 1);
            }
          }
          updateCart();
        }
        
        // Update cart display
        function updateCart() {
          const container = document.getElementById('cart-items');
          const totalsDiv = document.getElementById('cart-totals');
          const submitBtn = document.getElementById('submit-btn');
          
          if (cart.length === 0) {
            container.innerHTML = '<p class="text-neutral-500 text-sm">${t.reservation.cart_empty}</p>';
            totalsDiv.classList.add('hidden');
            submitBtn.disabled = true;
            return;
          }
          
          let totalDuration = 0;
          
          container.innerHTML = cart.map(item => {
            totalDuration += item.duration * item.quantity;
            
            return \`
              <div class="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                <div class="flex-1">
                  <p class="font-medium text-sm text-neutral-900 dark:text-white">\${item.name}</p>
                  <p class="text-xs text-neutral-500">${item.duration * item.quantity} ${t.common.minutes}</p>
                </div>
                <div class="flex items-center gap-2">
                  <button type="button" onclick="removeFromCart(\${item.id})" class="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 flex items-center justify-center hover:bg-red-200 dark:hover:bg-red-800">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
                  </button>
                </div>
              </div>
            \`;
          }).join('');
          
          totalsDiv.classList.remove('hidden');
          document.getElementById('total-duration').textContent = totalDuration + ' ${t.common.minutes}';
          
          // Update time slots if date is selected
          const date = document.getElementById('date-input').value;
          if (date) loadSlots();
          
          validateForm();
        }
        
        // Load available time slots
        async function loadSlots() {
          const date = document.getElementById('date-input').value;
          const workerId = getWorkerId();
          const totalDuration = cart.reduce((sum, item) => sum + item.duration * item.quantity, 0);
          
          if (!date || !workerId || totalDuration === 0) {
            document.getElementById('time-slots').innerHTML = '<p class="text-neutral-500">${t.reservation.select_datetime_help}</p>';
            return;
          }
          
          document.getElementById('time-slots').innerHTML = '<p class="text-neutral-500">${t.common.loading}</p>';
          
          try {
            const response = await fetch(\`/api/reservations?date=\${date}&workerId=\${workerId}&totalDuration=\${totalDuration}\`);
            const data = await response.json();
            
            if (!data.slots || data.slots.length === 0) {
              document.getElementById('time-slots').innerHTML = '<p class="text-neutral-500">${t.reservation.no_slots_for_day}</p>';
              return;
            }
            
            document.getElementById('time-slots').innerHTML = \`
              <div class="grid grid-cols-3 gap-2">
                \${data.slots.map(time => \`
                  <button type="button" class="time-slot" onclick="selectTime('\${time}')" data-time="\${time}">
                    \${time}
                  </button>
                \`).join('')}
              </div>
            \`;
          } catch (error) {
            document.getElementById('time-slots').innerHTML = '<p class="text-red-500">${t.common.load_error}</p>';
          }
        }
        
        // Select time slot
        function selectTime(time) {
          selectedTime = time;
          document.getElementById('time-input').value = time;
          
          document.querySelectorAll('.time-slot').forEach(btn => {
            btn.classList.remove('selected');
            if (btn.dataset.time === time) {
              btn.classList.add('selected');
            }
          });
          
          validateForm();
        }
        
        // Validate form
        function validateForm() {
          const workerId = getWorkerId();
          const date = document.getElementById('date-input').value;
          const time = document.getElementById('time-input').value;
          const name = document.querySelector('input[name="customerName"]').value;
          const email = document.querySelector('input[name="customerEmail"]').value;
          const phone = document.querySelector('input[name="customerPhone"]').value;
          const terms = document.querySelector('input[name="termsAccepted"]').checked;
          
          const valid = workerId && cart.length > 0 && date && time && name && email && phone && terms;
          document.getElementById('submit-btn').disabled = !valid;
        }
        
        // Form submission
        document.getElementById('reservation-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          
          const honeypot = document.getElementById('honeypot').value;
          if (honeypot) return; // Bot detected
          
          const submitBtn = document.getElementById('submit-btn');
          const errorDiv = document.getElementById('form-error');
          const successDiv = document.getElementById('form-success');
          
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="animate-spin mr-2">⏳</span> ${t.reservation.sending}';
          errorDiv.classList.add('hidden');
          successDiv.classList.add('hidden');
          
          try {
            const response = await fetch('/api/reservations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workerId: getWorkerId(),
                date: document.getElementById('date-input').value,
                time: document.getElementById('time-input').value,
                customerName: document.querySelector('input[name="customerName"]').value,
                customerEmail: document.querySelector('input[name="customerEmail"]').value,
                customerPhone: document.querySelector('input[name="customerPhone"]').value,
                note: document.querySelector('input[name="note"]').value,
                termsAccepted: document.querySelector('input[name="termsAccepted"]').checked,
                items: cart.map(item => ({ serviceId: item.id, quantity: item.quantity })),
                honeypot: honeypot
              })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
              throw new Error(data.error || '${t.reservation.submit_failed}');
            }
            
            // Show success modal
            document.getElementById('success-modal').classList.remove('hidden');
            
          } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.classList.remove('hidden');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg> ${t.reservation.submit}';
          }
        });
        
        // Add event listeners for validation
        document.querySelectorAll('input').forEach(input => {
          input.addEventListener('change', validateForm);
          input.addEventListener('input', validateForm);
        });
        
        // Initialize
        updateServices();
        lucide.createIcons();
      `}} />
    </div>
  );
};
