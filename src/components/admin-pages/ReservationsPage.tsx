import type { FC } from 'hono/jsx';
import type { ReservationWithItems, PublicUser } from '../../types';

interface ReservationsPageProps {
  reservations: ReservationWithItems[];
  workers: PublicUser[];
}

export const AdminReservationsPage: FC<ReservationsPageProps> = ({ reservations, workers }) => {
  // Sort reservations: Pending first (by date), then Confirmed/Blocked (by date), then others
  const sortedReservations = [...reservations].sort((a, b) => {
    const score = (s: string) => s === 'pending' ? 0 : (s === 'confirmed' || s === 'blocked' || s.startsWith('block')) ? 1 : 2;
    if (score(a.status) !== score(b.status)) return score(a.status) - score(b.status);
    return new Date(a.date + 'T' + a.start_time).getTime() - new Date(b.date + 'T' + b.start_time).getTime();
  });

  return (
    <div>
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Rezervace</h1>
        <div class="flex flex-wrap gap-2">
          <button onclick="openNewReservationModal()" class="btn btn-primary flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i>
            Nová rezervace
          </button>
          {workers.length > 1 && (
            <div class="relative">
              <select id="filter-worker" onchange="filterReservations()" class="form-input py-2 pl-4 pr-10 appearance-none cursor-pointer w-48">
                <option value="">Všechny kadeřnice</option>
                {workers.map(w => <option value={w.id}>{w.name}</option>)}
              </select>
              <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"></i>
            </div>
          )}
          <div class="relative">
            <select id="filter-status" onchange="filterReservations()" class="form-input py-2 pl-4 pr-10 appearance-none cursor-pointer w-48">
              <option value="active" selected>Aktivní (Výchozí)</option>
              <option value="all">Všechny</option>
              <option value="pending">Čeká na potvrzení</option>
              <option value="confirmed">Potvrzeno</option>
              <option value="cancelled">Zrušeno</option>
              <option value="completed">Dokončeno</option>
            </select>
            <i data-lucide="chevron-down" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none"></i>
          </div>
        </div>
      </div>

      {/* Calendar Navigation */}
      <div class="flex items-center justify-between mb-6">
        <button onclick="prevWeek()" class="btn btn-outline">
          <i data-lucide="chevron-left" class="w-4 h-4 mr-1"></i> Předchozí
        </button>
        <h2 id="week-title" class="text-lg font-semibold text-neutral-900 dark:text-white">Týden</h2>
        <button onclick="nextWeek()" class="btn btn-outline">
          Další <i data-lucide="chevron-right" class="w-4 h-4 ml-1"></i>
        </button>
      </div>

      {/* Reservations Table */}
      <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-x-auto">
        <table class="w-full min-w-[800px]">
          <thead class="bg-neutral-50 dark:bg-neutral-700">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Datum</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Čas</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Zákazník</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Kadeřnice</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Služby</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Cena</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Stav</th>
              <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase">Akce</th>
            </tr>
          </thead>
          <tbody id="reservations-body" class="divide-y divide-neutral-200 dark:divide-neutral-700">
            {sortedReservations.map(r => {
              const worker = workers.find(w => w.id === r.user_id);
              const totalPrice = r.items?.reduce((sum: number, i: any) => sum + (i.price_at_time || 0) * (i.quantity || 1), 0) || 0;
              const isBlocked = r.workflow_step === 'admin_block';
              
              return (
                <tr class="reservation-row hover:bg-neutral-50 dark:hover:bg-neutral-700" data-worker={r.user_id} data-status={isBlocked ? 'blocked' : r.status}>
                  <td class="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-white">{r.date}</td>
                  <td class="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{r.start_time} - {r.end_time}</td>
                  <td class="px-4 py-3">
                    <div class="text-sm font-medium text-neutral-900 dark:text-white">{r.customer_name}</div>
                    <div class="text-xs text-neutral-500 dark:text-neutral-400">{r.customer_email}</div>
                  </td>
                  <td class="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">{worker?.name || '-'}</td>
                  <td class="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400 max-w-xs truncate">
                    {isBlocked ? 'BLOKACE' : (r.items?.map((i: any) => i.service_name).join(', ') || '-')}
                  </td>
                  <td class="px-4 py-3 text-sm font-medium text-neutral-900 dark:text-white">{isBlocked ? '-' : totalPrice + ' Kč'}</td>
                  <td class="px-4 py-3">
                    <span class={`px-2 py-1 text-xs rounded-full ${
                      isBlocked ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                      r.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      r.status === 'pending' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                      r.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      r.status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-neutral-100 text-neutral-800'
                    }`}>
                      {isBlocked ? 'Blokováno' : r.status === 'pending' ? 'Čeká' : r.status === 'confirmed' ? 'Potvrzeno' : r.status === 'cancelled' ? 'Zrušeno' : r.status === 'completed' ? 'Dokončeno' : r.status}
                    </span>
                  </td>
                  <td class="px-4 py-3 whitespace-nowrap text-sm">
                    <div class="flex gap-1">
                      {isBlocked ? (
                         <button onclick={`updateStatus(${r.id}, 'cancelled')`} class="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Odblokovat">
                           <i data-lucide="trash-2" class="w-4 h-4"></i>
                         </button>
                      ) : (
                        <>
                          {r.status === 'pending' && (
                            <button onclick={`updateStatus(${r.id}, 'confirmed')`} class="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded" title="Potvrdit">
                              <i data-lucide="check" class="w-4 h-4"></i>
                            </button>
                          )}
                          {r.status === 'confirmed' && (
                            <button onclick={`updateStatus(${r.id}, 'completed')`} class="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded" title="Dokončit">
                              <i data-lucide="check-check" class="w-4 h-4"></i>
                            </button>
                          )}
                          {r.status !== 'cancelled' && r.status !== 'completed' && (
                            <button onclick={`updateStatus(${r.id}, 'cancelled')`} class="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded" title="Zrušit">
                              <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                          )}
                          <button onclick={`showDetail(${r.id})`} class="p-1.5 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded" title="Detail">
                            <i data-lucide="eye" class="w-4 h-4"></i>
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedReservations.length === 0 && (
        <div class="text-center py-12 text-neutral-500">Žádné rezervace</div>
      )}

      {/* New Reservation Modal */}
      <div id="new-reservation-modal" class="modal-overlay">
        <div class="modal-container max-w-lg">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-xl font-bold text-neutral-900 dark:text-white">Nová rezervace</h2>
            <button onclick="closeNewReservationModal()" class="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg">
              <i data-lucide="x" class="w-5 h-5"></i>
            </button>
          </div>
          <form id="new-reservation-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-1">Kadeřnice *</label>
              {workers.length === 1 ? (
                <>
                  <input type="text" class="form-input bg-neutral-100 dark:bg-neutral-700" value={workers[0].name} disabled />
                  <input type="hidden" id="nr-worker" value={String(workers[0].id)} />
                </>
              ) : (
                <select id="nr-worker" class="form-input" required>
                  <option value="">Vyberte...</option>
                  {workers.map(w => <option value={w.id}>{w.name}</option>)}
                </select>
              )}
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium mb-1">Datum *</label>
                <input type="date" id="nr-date" class="form-input" required />
              </div>
              <div>
                <label class="block text-sm font-medium mb-1">Čas *</label>
                <select id="nr-time" class="form-input" required>
                  <option value="">Nejprve vyberte datum</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Služby *</label>
              <div id="nr-services" class="text-sm text-neutral-500">Nejprve vyberte kadeřnici</div>
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Jméno zákazníka *</label>
              <input type="text" id="nr-name" class="form-input" required placeholder="Jan Novák" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Telefon *</label>
              <input type="tel" id="nr-phone" class="form-input" required placeholder="+420 " />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Email</label>
              <input type="email" id="nr-email" class="form-input" placeholder="email@example.com" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Poznámka</label>
              <textarea id="nr-note" class="form-input" rows={2} placeholder="Telefonická rezervace..."></textarea>
            </div>
            <div class="flex justify-end gap-3 pt-2">
              <button type="button" onclick="closeNewReservationModal()" class="btn btn-outline">Zrušit</button>
              <button type="submit" class="btn btn-primary">Vytvořit rezervaci</button>
            </div>
          </form>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        function filterReservations() {
          const workerId = document.getElementById('filter-worker').value;
          const status = document.getElementById('filter-status').value;
          
          document.querySelectorAll('.reservation-row').forEach(row => {
            const rowStatus = row.dataset.status;
            const matchWorker = !workerId || row.dataset.worker == workerId;
            
            let matchStatus = true;
            if (status === 'active') {
               // Show Pending, Confirmed, Blocked. Hide Cancelled, Completed.
               matchStatus = rowStatus !== 'cancelled' && rowStatus !== 'completed';
            } else if (status === 'all') {
               matchStatus = true;
            } else {
               // Exact match (including blocked if filter supports it, but here we mapped blocked to 'blocked' status)
               matchStatus = rowStatus === status;
            }
            
            row.style.display = matchWorker && matchStatus ? '' : 'none';
          });
        }
        
        async function updateStatus(id, status) {
          const res = await fetch('/api/reservations/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          });
          
          if (res.ok) {
            window.location.reload();
          } else {
            const err = await res.json();
            window.showToast(err.error || 'Chyba', 'error');
          }
        }
        
        function showDetail(id) {
          // Placeholder for detail modal
          window.showToast('Detail rezervace #' + id, 'info');
        }
        
        let currentWeekStart = new Date();
        currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay() + 1);
        
        function updateWeekTitle() {
          const end = new Date(currentWeekStart);
          end.setDate(end.getDate() + 6);
          document.getElementById('week-title').textContent = 
            currentWeekStart.toLocaleDateString('cs-CZ') + ' - ' + end.toLocaleDateString('cs-CZ');
        }
        
        function prevWeek() {
          currentWeekStart.setDate(currentWeekStart.getDate() - 7);
          updateWeekTitle();
          // Reload with new date range
          const startStr = currentWeekStart.toISOString().split('T')[0];
          const end = new Date(currentWeekStart);
          end.setDate(end.getDate() + 6);
          const endStr = end.toISOString().split('T')[0];
          
          window.location.href = window.location.pathname + '?start=' + startStr + '&end=' + endStr;
        }
        
        function nextWeek() {
          currentWeekStart.setDate(currentWeekStart.getDate() + 7);
          updateWeekTitle();
          // Reload with new date range
          const startStr = currentWeekStart.toISOString().split('T')[0];
          const end = new Date(currentWeekStart);
          end.setDate(end.getDate() + 6);
          const endStr = end.toISOString().split('T')[0];
          
          window.location.href = window.location.pathname + '?start=' + startStr + '&end=' + endStr;
        }
        
        // Initial filter application
        document.addEventListener('DOMContentLoaded', () => {
           filterReservations();
           updateWeekTitle();
        });

        // ============ NEW RESERVATION MODAL ============
        let nrSelectedServices = [];
        let nrServiceDurations = {};

        function openNewReservationModal() {
          document.getElementById('new-reservation-modal').classList.add('open');
          // Auto-load services: if hidden input (single worker), trigger directly
          const workerEl = document.getElementById('nr-worker');
          if (workerEl.type === 'hidden' && workerEl.value) {
            loadNrServices(workerEl.value);
          } else {
            // Auto-select if only one worker in select
            const workerOptions = workerEl.querySelectorAll('option[value]:not([value=""])');
            if (workerOptions.length === 1) {
              workerEl.value = workerOptions[0].value;
              workerEl.dispatchEvent(new Event('change'));
            }
          }
          lucide.createIcons();
        }

        function closeNewReservationModal() {
          document.getElementById('new-reservation-modal').classList.remove('open');
          document.getElementById('new-reservation-form').reset();
          nrSelectedServices = [];
          nrServiceDurations = {};
          document.getElementById('nr-services').innerHTML = '<span class="text-neutral-500">Nejprve vyberte kadeřnici</span>';
          document.getElementById('nr-time').innerHTML = '<option value="">Nejprve vyberte datum</option>';
        }

        // Load services when worker is selected
        const workerEl = document.getElementById('nr-worker');
        if (workerEl.tagName === 'SELECT') {
          workerEl.addEventListener('change', (e) => {
            nrSelectedServices = [];
            loadNrServices(e.target.value);
          });
        }

        async function loadNrServices(workerId) {
          nrSelectedServices = [];
          if (!workerId) {
            document.getElementById('nr-services').innerHTML = '<span class="text-neutral-500">Nejprve vyberte kadeřnici</span>';
            return;
          }
          try {
            const res = await fetch('/api/services?workerId=' + workerId);
            const data = await res.json();
            const services = data.services || [];
            if (services.length === 0) {
              document.getElementById('nr-services').innerHTML = '<span class="text-neutral-500">Žádné služby</span>';
              return;
            }
            document.getElementById('nr-services').innerHTML = services.map(s => {
              nrServiceDurations[s.id] = s.duration;
              return '<label class="flex items-center gap-2 py-1 cursor-pointer">' +
                '<input type="checkbox" class="custom-checkbox" value="' + s.id + '" data-duration="' + s.duration + '" onchange="toggleNrService(' + s.id + ', ' + s.duration + ')">' +
                '<span>' + s.name + ' (' + s.duration + ' min, ' + s.price + ' Kč)</span>' +
              '</label>';
            }).join('');
          } catch (err) {
            document.getElementById('nr-services').innerHTML = '<span class="text-red-500">Chyba při načítání služeb</span>';
          }
        }

        function toggleNrService(id, duration) {
          const idx = nrSelectedServices.findIndex(s => s.serviceId === id);
          if (idx >= 0) {
            nrSelectedServices.splice(idx, 1);
          } else {
            nrSelectedServices.push({ serviceId: id, quantity: 1 });
          }
          // Reload time slots if date is set
          const date = document.getElementById('nr-date').value;
          if (date && nrSelectedServices.length > 0) {
            loadNrTimeSlots();
          }
        }

        // Load time slots when date changes
        document.getElementById('nr-date').addEventListener('change', (e) => {
          // Blur to close any native date picker popup
          e.target.blur();
          loadNrTimeSlots();
        });

        // Also load when input event fires (some browsers)
        document.getElementById('nr-date').addEventListener('input', () => {
          loadNrTimeSlots();
        });

        async function loadNrTimeSlots() {
          const workerId = document.getElementById('nr-worker').value;
          const date = document.getElementById('nr-date').value;
          if (!workerId || !date) return;

          // Calculate total duration from selected services
          let totalDuration = 0;
          const checkboxes = document.querySelectorAll('#nr-services input[type=checkbox]:checked');
          checkboxes.forEach(cb => {
            const dur = parseInt(cb.dataset.duration || '0');
            totalDuration += dur;
          });
          if (totalDuration <= 0) totalDuration = 30;

          try {
            const url = '/api/reservations?date=' + date + '&totalDuration=' + totalDuration + '&workerId=' + workerId + '&admin=true';
            console.log('[NR] Fetching slots:', url);
            const res = await fetch(url);
            const data = await res.json();
            console.log('[NR] Response:', JSON.stringify(data));
            const slots = data.slots || [];
            const select = document.getElementById('nr-time');
            if (slots.length === 0) {
              select.innerHTML = '<option value="">Žádné volné sloty</option>';
            } else {
              const timeSlots = Array.isArray(slots) && typeof slots[0] === 'string' ? slots : slots.map(s => s.time);
              select.innerHTML = '<option value="">Vyberte čas...</option>' + 
                timeSlots.map(t => '<option value="' + t + '">' + t + '</option>').join('');
            }
          } catch (err) {
            document.getElementById('nr-time').innerHTML = '<option value="">Chyba načítání</option>';
          }
        }

        // Submit new reservation
        document.getElementById('new-reservation-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const workerId = parseInt(document.getElementById('nr-worker').value);
          const date = document.getElementById('nr-date').value;
          const time = document.getElementById('nr-time').value;
          const name = document.getElementById('nr-name').value.trim();
          const phone = document.getElementById('nr-phone').value.trim();
          const email = document.getElementById('nr-email').value.trim();
          const note = document.getElementById('nr-note').value.trim();

          if (!workerId || !date || !time || !name || !phone || nrSelectedServices.length === 0) {
            window.showToast('Vyplňte všechna povinná pole a vyberte službu', 'error');
            return;
          }

          try {
            const res = await fetch('/api/reservations/admin-create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workerId, date, time,
                customerName: name,
                customerPhone: phone,
                customerEmail: email || undefined,
                note: note || undefined,
                items: nrSelectedServices
              })
            });
            const data = await res.json();
            if (res.ok) {
              window.showToast('Rezervace vytvořena', 'success');
              closeNewReservationModal();
              setTimeout(() => window.location.reload(), 500);
            } else {
              window.showToast(data.error || 'Chyba', 'error');
            }
          } catch (err) {
            window.showToast('Chyba při vytváření rezervace', 'error');
          }
        });
      `}} />
    </div>
  );
};
