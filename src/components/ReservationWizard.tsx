import type { FC } from 'hono/jsx';
import type { Service, PublicUser, ServiceCategory } from '../types';
import { BaseLayout } from './Layout';
import { getTranslations } from '../lib/i18n';

const t = getTranslations();

const categoryIconMap: Record<string, string> = {
  damske: 'sparkles',
  panske: 'scissors',
  detske: 'heart',
};

// ============ TYPES ============
interface ReservationWizardProps {
  workers: PublicUser[];
  services: Service[];
  categories: ServiceCategory[];
  bookingWindow: number;
  preselectedWorkerId?: number;
}

// ============ WIZARD LAYOUT ============
export const ReservationWizard: FC<ReservationWizardProps> = ({ workers, services, categories, bookingWindow, preselectedWorkerId }) => {
  const assetVersion = '20260311-2';
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

  const bookableWorkers = workers.filter(worker => worker.role !== 'external');
  const hideWorkerStepInProgress = bookableWorkers.length === 1;
  const progressSteps = hideWorkerStepInProgress
    ? [
        { label: t.reservation.steps.services, step: 2 },
        { label: t.reservation.steps.datetime, step: 3 },
        { label: t.reservation.steps.details, step: 4 },
        { label: t.reservation.steps.confirmation, step: 5 },
      ]
    : [
        { label: t.reservation.steps.worker, step: 1 },
        { label: t.reservation.steps.services, step: 2 },
        { label: t.reservation.steps.datetime, step: 3 },
        { label: t.reservation.steps.details, step: 4 },
        { label: t.reservation.steps.confirmation, step: 5 },
      ];

  const wizardData = {
    bookingWindow,
    preselectedWorkerId: preselectedWorkerId ?? null,
    hideWorkerStepInProgress,
    locale: t.common.locale,
    i18n: {
      minutes: t.common.minutes,
      currency: t.common.currency,
      startsAtPrefix: t.common.starts_at_prefix,
      cartEmpty: t.reservation.cart_empty,
      loading: t.common.loading,
      noSlots: t.reservation.no_slots,
      loadError: t.common.load_error,
      slotUnavailable: t.reservation.slot_unavailable,
      serverError: t.common.server_error,
      submitLabel: t.reservation.submit,
      continueLabel: t.reservation.continue,
      sendingLabel: t.reservation.sending,
      submitFailed: t.reservation.submit_failed,
      workerLabel: t.reservation.worker_label,
      datetimeLabel: t.reservation.datetime_label,
      servicesLabel: t.reservation.services_label,
      durationLabel: t.reservation.total_duration,
      paymentInfo: t.reservation.payment_methods,
      priceNote: t.reservation.pricing_note,
      verificationMessage: t.reservation.verification_message,
      atTime: t.reservation.at_time,
      backLabel: t.common.back,
      select_date_first: t.reservation.select_date_first,
      missingWorker: t.reservation.missing_worker,
      missingServices: t.reservation.missing_services,
      missingDate: t.reservation.missing_date,
      missingTime: t.reservation.missing_time,
      missingContact: t.reservation.missing_contact,
      missingTerms: t.reservation.missing_terms,
      invalidEmail: t.reservation.invalid_email,
      invalidPhone: t.reservation.invalid_phone,
      lockExpired: t.reservation.lock_expired
    },
    servicesData: services.map(s => ({
      id: s.id,
      name: s.name,
      price: s.price,
      duration: s.duration,
      priceType: s.price_type,
      userId: s.user_id
    })),
    monthNames: t.common.months
  };

  const serializedWizardData = JSON.stringify(wizardData).replace(/</g, '\\u003c');

  return (
    <BaseLayout title={t.reservation.page_title} description="Online rezervace ke kadeřnici Vilmě Strakaté v Říčanech u Prahy. Vyberte si službu a volný termín." canonical="https://studionatali-ricany.cz/rezervace" noindex={false}>
      <div class="min-h-screen bg-accent-cream dark:bg-neutral-900">
        {/* Header */}
        <header class="bg-white dark:bg-neutral-800 shadow-sm">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <a href="/" class="flex items-center">
              <img src="/logo.svg" alt={t.common.site_name} class="h-12 w-auto" width="48" height="48" loading="eager" decoding="async" />
            </a>
            <a href="/" class="text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-600">
              ← {t.common.back_to_site}
            </a>
          </div>
        </header>

        {/* Progress Steps */}
        <div class="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="flex items-center justify-center gap-2 sm:gap-4" id="progress-steps">
              {progressSteps.map((item, idx) => (
                <div class={`step-item flex items-center gap-2 ${idx === 0 ? 'active' : ''}`} data-step={item.step}>
                  <div class={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium step-circle
                    ${idx === 0 ? 'bg-primary-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>
                    {idx + 1}
                  </div>
                  <span class="hidden sm:block text-sm font-medium text-neutral-600 dark:text-neutral-400 step-label">
                    {item.label}
                  </span>
                  {idx < progressSteps.length - 1 && <div class="w-8 h-px bg-neutral-300 dark:bg-neutral-600 hidden sm:block" />}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="grid lg:grid-cols-3 gap-8">
            {/* Left: Steps Content */}
            <div class="lg:col-span-2">
              {/* Step 1: Worker Selection */}
              <div id="step-1" class="step-content">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 class="text-2xl font-bold text-neutral-900 dark:text-white">{t.reservation.select_worker}</h2>
                  <button type="button" class="btn btn-outline whitespace-nowrap self-start sm:self-auto" onclick="handleInlineBack()">
                    ← {t.common.back}
                  </button>
                </div>
                <div class="grid sm:grid-cols-2 gap-4">
                  {workers.map(worker => {
                    const isExternal = worker.role === 'external';
                    if (isExternal) {
                      return (
                        <a
                          href="https://www.facebook.com/StudioNatali"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="worker-card worker-external card p-6 text-left hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer block"
                          data-worker-id={worker.id}
                          data-worker-name={worker.name}
                          data-worker-external="true"
                        >
                          <div class="flex items-center gap-4">
                            <div class="w-16 h-16 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                              {worker.image ? (
                                <img src={worker.image} alt={worker.name} class="w-full h-full object-cover" loading="lazy" decoding="async" onerror={`this.onerror=null; this.src='${fallbackPhoto}'; this.classList.add('object-contain');`} />
                              ) : (
                                <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 text-primary-600 dark:text-primary-300">
                                  <i data-lucide="image" class="w-8 h-8"></i>
                                </div>
                              )}
                            </div>
                            <div class="flex-1">
                              <h3 class="font-semibold text-neutral-900 dark:text-white">{worker.name}</h3>
                              <p class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">{worker.bio || t.team.role_label}</p>
                            </div>
                          </div>
                          <div class="mt-3 ml-20 flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 font-medium">
                            Rezervace pouze přes Facebook
                          </div>
                        </a>
                      );
                    }
                    return (
                      <button
                        type="button"
                        class="worker-card card p-6 text-left hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer w-full"
                        data-worker-id={worker.id}
                        data-worker-name={worker.name}
                      >
                        <div class="flex items-center gap-4">
                          <div class="w-16 h-16 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                            {worker.image ? (
                              <img src={worker.image} alt={worker.name} class="w-full h-full object-cover" loading="lazy" decoding="async" onerror={`this.onerror=null; this.src='${fallbackPhoto}'; this.classList.add('object-contain');`} />
                            ) : (
                              <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900 dark:to-primary-800 text-primary-600 dark:text-primary-300">
                                <i data-lucide="image" class="w-8 h-8"></i>
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 class="font-semibold text-neutral-900 dark:text-white">{worker.name}</h3>
                            <p class="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">{worker.bio || t.team.role_label}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Service Selection */}
              <div id="step-2" class="step-content hidden">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 class="text-2xl font-bold text-neutral-900 dark:text-white">{t.reservation.select_services}</h2>
                  <div class="flex w-full sm:w-auto gap-2 sm:gap-3">
                    <button type="button" class="btn btn-outline whitespace-nowrap flex-1 sm:flex-none" onclick="handleInlineBack()">
                      ← {t.common.back}
                    </button>
                    <button type="button" id="btn-continue-step-2" class="btn btn-primary btn-cta whitespace-nowrap flex-1 sm:flex-none" onclick="nextStep()">
                      {t.reservation.continue} →
                    </button>
                  </div>
                </div>
                <div class="space-y-6">
                  {categories.map(category => {
                    const catServices = services.filter(s => s.category_id === category.id);
                    if (catServices.length === 0) return null;
                    const categoryIcon = categoryIconMap[category.slug] || category.icon?.toLowerCase() || 'scissors';
                    return (
                      <div class="category-group" data-category={category.id}>
                        <h3 class="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-3 flex items-center gap-2">
                          <i data-lucide={categoryIcon} class="w-5 h-5 text-primary-600"></i>
                          {category.name}
                        </h3>
                        <div class="space-y-2">
                          {catServices.map(service => {
                            const subtitle = service.description?.trim()
                              ? (/^včetně:/i.test(service.description.trim()) ? service.description.trim() : `Včetně: ${service.description.trim()}`)
                              : '';
                            return (
                              <div
                                class="service-card card p-4 flex items-center justify-between cursor-pointer hover:ring-2 hover:ring-primary-500 transition-all"
                                data-service-id={service.id}
                                data-service-name={service.name}
                                data-service-price={service.price}
                                data-service-duration={service.duration}
                                data-service-price-type={service.price_type}
                                onclick={`toggleService(${service.id})`}
                              >
                                <div class="flex-1">
                                  <h4 class="font-medium text-neutral-900 dark:text-white">{service.name}</h4>
                                  {subtitle && (
                                    <p class="text-xs text-primary-700 dark:text-primary-300 mt-1 inline-block px-2 py-1 rounded-full bg-primary-50 dark:bg-primary-900/30">
                                      {subtitle}
                                    </p>
                                  )}
                                  <p class="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                                    {service.duration} {t.common.minutes}
                                  </p>
                                </div>
                                <div class="text-right ml-4">
                                  <p class="font-semibold text-primary-600 dark:text-primary-400">
                                    {service.price_type === 'starts_at' ? t.common.starts_at_prefix : ''}{service.price} {t.common.currency}
                                  </p>
                                  <div class="service-quantity hidden items-center gap-2 mt-2">
                                    <button type="button" class="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center"
                                      onclick={`event.stopPropagation(); updateQuantity(${service.id}, -1)`}>
                                      <i data-lucide="minus" class="w-4 h-4"></i>
                                    </button>
                                    <span class="quantity-value font-medium">1</span>
                                    <button type="button" class="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 flex items-center justify-center"
                                      onclick={`event.stopPropagation(); updateQuantity(${service.id}, 1)`}>
                                      <i data-lucide="plus" class="w-4 h-4"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Date & Time Selection */}
              <div id="step-3" class="step-content hidden">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 class="text-2xl font-bold text-neutral-900 dark:text-white">{t.reservation.select_datetime}</h2>
                  <div class="flex w-full sm:w-auto gap-2 sm:gap-3">
                    <button type="button" class="btn btn-outline whitespace-nowrap flex-1 sm:flex-none" onclick="handleInlineBack()">
                      ← {t.common.back}
                    </button>
                    <button type="button" id="btn-continue-step-3" class="btn btn-primary btn-cta whitespace-nowrap flex-1 sm:flex-none" onclick="nextStep()">
                      {t.reservation.continue} →
                    </button>
                  </div>
                </div>
                <div class="grid md:grid-cols-2 gap-6">
                  {/* Calendar */}
                  <div class="card p-4">
                    <div id="calendar-header" class="flex items-center justify-between mb-4">
                      <button type="button" onclick="prevMonth()" class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                        <i data-lucide="chevron-left" class="w-5 h-5"></i>
                      </button>
                      <h3 id="calendar-title" class="font-semibold text-neutral-900 dark:text-white">{t.reservation.calendar_loading}</h3>
                      <button type="button" onclick="nextMonth()" class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
                        <i data-lucide="chevron-right" class="w-5 h-5"></i>
                      </button>
                    </div>
                    <div class="grid grid-cols-7 gap-1 mb-2">
                      {t.common.weekdays_short.map(d => (
                        <div class="text-center text-sm font-medium text-neutral-500 dark:text-neutral-400 py-2">{d}</div>
                      ))}
                    </div>
                    <div id="calendar-days" class="grid grid-cols-7 gap-1">
                      {/* Days will be rendered via JS */}
                    </div>
                  </div>

                  {/* Time Slots */}
                  <div class="card p-4">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="font-semibold text-neutral-900 dark:text-white">{t.reservation.available_times}</h3>
                      <button 
                        type="button" 
                        id="refresh-slots-btn"
                        onclick="refreshTimeSlots()"
                        class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        title="Obnovit dostupné časy"
                      >
                        <i data-lucide="refresh-cw" class="w-5 h-5 text-neutral-600 dark:text-neutral-400"></i>
                      </button>
                    </div>
                    <div id="time-slots" class="grid grid-cols-3 gap-2">
                      <p class="col-span-3 text-center text-neutral-500 dark:text-neutral-400 py-8">
                        {t.reservation.select_date_first}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Contact Info */}
              <div id="step-4" class="step-content hidden">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 class="text-2xl font-bold text-neutral-900 dark:text-white">{t.reservation.your_details}</h2>
                  <div class="flex w-full sm:w-auto gap-2 sm:gap-3">
                    <button type="button" class="btn btn-outline whitespace-nowrap flex-1 sm:flex-none" onclick="handleInlineBack()">
                      ← {t.common.back}
                    </button>
                    <button type="button" id="btn-continue-step-4" class="btn btn-primary btn-cta whitespace-nowrap flex-1 sm:flex-none" onclick="nextStep()">
                      {t.reservation.continue} →
                    </button>
                  </div>
                </div>
                <div class="card p-6 space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.name} *</label>
                    <input type="text" id="customer-name" class="form-input" required placeholder={t.reservation.name_placeholder} />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.email} *</label>
                    <input type="email" id="customer-email" class="form-input" required placeholder={t.reservation.email_placeholder} />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.phone} *</label>
                    <input
                      type="tel"
                      id="customer-phone"
                      class="form-input"
                      required
                      placeholder={t.reservation.phone_placeholder}
                      inputmode="tel"
                      pattern="^\\+\\d[\\d\\s]{8,}$"
                      value="+420 "
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t.reservation.note}</label>
                    <textarea id="customer-note" class="form-input" rows={3} placeholder={t.reservation.note_placeholder}></textarea>
                  </div>
                  {/* Honeypot */}
                  <input type="text" name="website" id="honeypot" class="hidden" autocomplete="off" />
                </div>
              </div>

              {/* Step 5: Confirmation */}
              <div id="step-5" class="step-content hidden">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                  <h2 class="text-2xl font-bold text-neutral-900 dark:text-white">{t.reservation.confirmation_title}</h2>
                  <button type="button" class="btn btn-outline whitespace-nowrap self-start sm:self-auto" onclick="handleInlineBack()">
                    ← {t.common.back}
                  </button>
                </div>
                <div class="card p-6">
                  <div id="confirmation-summary" class="space-y-4 mb-6">
                    {/* Summary will be filled by JS */}
                  </div>
                  <div class="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                    <label class="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" id="terms-accepted" class="w-5 h-5 text-primary-600 rounded border-neutral-300 focus:ring-primary-500" />
                      <span class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                        {t.reservation.terms_prefix}{' '}
                        <a href="/obchodni-podminky" target="_blank" class="text-primary-600 hover:underline">{t.reservation.terms_link}</a>{' '}
                        {t.reservation.terms_and}{' '}
                        <a href="/zpracovani-udaju" target="_blank" class="text-primary-600 hover:underline">{t.reservation.privacy_link}</a>.
                        <span class="text-red-500 ml-1">*</span>
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Success Step */}
              <div id="step-success" class="step-content hidden">
                <div class="text-center py-12">
                  <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <i data-lucide="check-circle" class="w-10 h-10 text-green-600 dark:text-green-400"></i>
                  </div>
                  <h2 class="text-2xl font-bold text-neutral-900 dark:text-white mb-4">{t.reservation.success_title}</h2>
                  <p class="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto" id="success-message">
                    {t.reservation.success_message}
                  </p>
                  <a href="/" class="btn btn-primary">{t.common.back_home}</a>
                </div>
              </div>

              {/* Error Message */}
              <div id="error-message" class="hidden mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg"></div>
            </div>

            {/* Right: Cart Summary */}
            <div class="lg:col-span-1">
              <div class="card p-6 sticky top-4">
                <h3 class="font-semibold text-neutral-900 dark:text-white mb-4">{t.reservation.summary_title}</h3>
                
                <div id="cart-worker" class="hidden mb-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                  <p class="text-sm text-neutral-500 dark:text-neutral-400">{t.reservation.worker_label}</p>
                  <p class="font-medium text-neutral-900 dark:text-white" id="cart-worker-name">-</p>
                </div>

                <div id="cart-items" class="space-y-3 mb-4">
                  <p class="text-neutral-500 dark:text-neutral-400 text-sm">{t.reservation.cart_empty}</p>
                </div>

                <div id="cart-datetime" class="hidden mb-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <p class="text-sm text-neutral-500 dark:text-neutral-400">{t.reservation.datetime_label}</p>
                  <p class="font-medium text-neutral-900 dark:text-white" id="cart-datetime-value">-</p>
                </div>

                <div class="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div class="flex justify-between text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                    <span>{t.reservation.total_duration}</span>
                    <span id="cart-duration">0 {t.common.minutes}</span>
                  </div>
                  
                  {/* Summary Action Button - only visible in step 5 */}
                    <button 
                      type="button" 
                      id="btn-summary-action" 
                      onclick="submitReservation()" 
                      class="btn btn-primary btn-cta w-full mt-6 items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hidden" 
                      disabled
                    >
                    <i data-lucide="check" class="w-4 h-4 mr-2"></i>
                    {t.reservation.submit}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Reservation Wizard Script */}
      <script dangerouslySetInnerHTML={{ __html: `window.__RESERVATION_WIZARD__ = ${serializedWizardData};` }} />
      <script src={`/reservation-wizard.js?v=${assetVersion}`} defer></script>
    </BaseLayout>
  );
};
