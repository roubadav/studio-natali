import type { FC } from 'hono/jsx';
import type { PublicUser, WorkingHoursTemplate } from '../../types';

interface WorkingHoursPageProps {
  hours: WorkingHoursTemplate[];
  workers: PublicUser[];
  currentUser: { userId: number; role: string };
}

export const AdminWorkingHoursPage: FC<WorkingHoursPageProps> = ({ hours, workers, currentUser }) => {
  // JS day_of_week: 0=Sunday, 1=Monday, ..., 6=Saturday
  // We display Monday first, so we use a mapping
  const daysConfig = [
    { name: 'Pondělí', dbIndex: 1, defStart: '08:30', defEnd: '18:00', defOff: false },
    { name: 'Úterý', dbIndex: 2, defStart: '08:30', defEnd: '18:00', defOff: false },
    { name: 'Středa', dbIndex: 3, defStart: '08:30', defEnd: '18:00', defOff: false },
    { name: 'Čtvrtek', dbIndex: 4, defStart: '08:30', defEnd: '18:00', defOff: false },
    { name: 'Pátek', dbIndex: 5, defStart: '08:30', defEnd: '18:00', defOff: false },
    { name: 'Sobota', dbIndex: 6, defStart: '09:00', defEnd: '17:00', defOff: true },
    { name: 'Neděle', dbIndex: 0, defStart: '09:00', defEnd: '17:00', defOff: true },
  ];
  
  return (
    <div>
      {/* Modal Styles - Moved to Admin.tsx */}


      <div class="flex items-center justify-between mb-8">
        <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">Pracovní doba</h1>
      </div>

      {/* Worker tabs */}
      <div class="flex flex-wrap gap-2 mb-6">
        {workers.map((w, idx) => (
          <button 
            onclick={`showWorkerHours(${w.id})`} 
            class={`worker-tab px-4 py-2 rounded-lg ${
              (currentUser.role === 'admin' || currentUser.role === 'superadmin' ? idx === 0 : w.id === currentUser.userId)
                ? 'bg-primary-600 text-white' 
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`} 
            data-worker={w.id}
          >
            {w.name}
          </button>
        ))}
      </div>

      {/* Hours content for each worker */}
      {workers.map((worker, wIdx) => {
        const workerHours = hours.filter(h => h.user_id === worker.id);
        const canEdit = currentUser.role === 'superadmin' || currentUser.userId === worker.id;
        const initialHidden = currentUser.role === 'admin' || currentUser.role === 'superadmin' ? wIdx > 0 : worker.id !== currentUser.userId;
        
        return (
          <div id={`hours-${worker.id}`} class={`hours-section ${initialHidden ? 'hidden' : ''}`}>
            
            {/* Sub-tabs: Exceptions vs Standard */}
            <div class="flex gap-2 mb-4 border-b border-neutral-200 dark:border-neutral-700">
               <button onclick={`switchSubTab(${worker.id}, 'exceptions')`} class={`sub-tab-${worker.id} px-4 py-2 border-b-2 font-medium text-sm transition-colors border-primary-600 text-primary-600`} data-tab="exceptions">
                 Výjimky / Nepřítomnost
               </button>
               <button onclick={`switchSubTab(${worker.id}, 'standard')`} class={`sub-tab-${worker.id} px-4 py-2 border-b-2 font-medium text-sm transition-colors border-transparent text-neutral-500 hover:text-neutral-700`} data-tab="standard">
                 Běžná pracovní doba
               </button>
            </div>

            {/* TAB 1: EXCEPTIONS & BLOCKS */}
            <div id={`tab-exceptions-${worker.id}`} class="sub-content">
              {/* Overrides / Shifts */}
              <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-6 mb-6">
                <h3 class="font-semibold text-lg mb-4">Mimořádné směny a celodenní volno</h3>
                {canEdit ? (
                  <form onsubmit={`addOverride(event, ${worker.id})`} class="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
                    <div>
                      <label class="block text-sm font-medium mb-1">Datum od</label>
                      <input type="date" name="date" class="form-input" required onchange={`onOverrideDateFromChange(this, ${worker.id})`} />
                    </div>
                    <div>
                      <label class="block text-sm font-medium mb-1">Datum do</label>
                      <input type="date" name="date_to" class="form-input" />
                    </div>
                    <div>
                      <label class="block text-sm font-medium mb-1">Typ</label>
                      <select name="type" class="form-input" onchange={`toggleTimeInputs(this, ${worker.id})`}>
                        <option value="off">Celodenní volno</option>
                        <option value="work">Mimořádná směna</option>
                      </select>
                    </div>
                    <div class="time-inputs hidden gap-2 col-span-2">
                       <div>
                         <label class="block text-sm font-medium mb-1">Od - Do</label>
                         <div class="flex gap-1">
                           <input type="time" name="start_time" class="form-input" />
                           <input type="time" name="end_time" class="form-input" />
                         </div>
                       </div>
                    </div>
                    <div class="col-span-2">
                      <label class="block text-sm font-medium mb-1">Poznámka</label>
                      <input type="text" name="note" class="form-input" placeholder="Např. Dovolená" />
                    </div>
                    <div>
                      <button type="submit" class="btn btn-primary w-full">Přidat</button>
                    </div>
                  </form>
                ) : (
                   <p class="text-neutral-500 italic">Nemáte oprávnění upravovat výjimky.</p>
                )}
                
                <div class="mt-6 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <table class="w-full min-w-[500px]">
                    <thead class="bg-neutral-50 dark:bg-neutral-700">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-medium uppercase">Datum</th>
                        <th class="px-4 py-2 text-left text-xs font-medium uppercase">Typ</th>
                        <th class="px-4 py-2 text-left text-xs font-medium uppercase">Čas</th>
                        <th class="px-4 py-2 text-left text-xs font-medium uppercase">Poznámka</th>
                        <th class="px-4 py-2 text-right text-xs font-medium uppercase">Akce</th>
                      </tr>
                    </thead>
                    <tbody id={`overrides-list-${worker.id}`} class="divide-y divide-neutral-200 dark:divide-neutral-700 bg-white dark:bg-neutral-800">
                       <tr><td colspan={5} class="px-4 py-3 text-center text-sm text-neutral-500">Načítám...</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Short Absences (Blocking) */}
              <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm p-6">
                <h3 class="font-semibold text-lg mb-4">Krátkodobá nepřítomnost (Lékař, vyřizování...)</h3>
                <p class="text-sm text-neutral-500 mb-4">Vytvoří blokovanou rezervaci, aby v tento čas nikdo nemohl rezervovat termín.</p>
                
                {canEdit && (
                  <button onclick={`openBlockModal(${worker.id})`} class="btn btn-outline">
                    <i data-lucide="clock" class="w-4 h-4 mr-2"></i>
                    Přidat blokaci času
                  </button>
                )}
              </div>
            </div>

            {/* TAB 2: STANDARD HOURS */}
            <div id={`tab-standard-${worker.id}`} class="sub-content hidden">
              {canEdit && (
                <div class="flex justify-end mb-4">
                  <button onclick={`saveAllHours(${worker.id})`} class="btn btn-primary">
                    <i data-lucide="save" class="w-4 h-4 mr-2"></i>
                    Uložit změny
                  </button>
                </div>
              )}
              <div class="bg-white dark:bg-neutral-800 rounded-xl shadow-sm overflow-x-auto">
                <table class="w-full min-w-[600px]">
                  <thead class="bg-neutral-50 dark:bg-neutral-700">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium uppercase">Den</th>
                      <th class="px-6 py-3 text-left text-xs font-medium uppercase">Pracovní doba</th>
                      <th class="px-6 py-3 text-left text-xs font-medium uppercase">Pauza</th>
                      <th class="px-6 py-3 text-left text-xs font-medium uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {daysConfig.map((dayConfig) => {
                      const dayHours = workerHours.find(h => h.day_of_week === dayConfig.dbIndex);
                      const breakEnabled = !!(dayHours?.break_start || dayHours?.break_end);
                      return (
                        <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                          <td class="px-6 py-4 font-medium text-neutral-900 dark:text-white">{dayConfig.name}</td>
                          <td class="px-6 py-4">
                            <div class="flex items-center gap-2">
                              <input type="time" class="form-input py-1 w-28" id={`start-${worker.id}-${dayConfig.dbIndex}`} value={dayHours?.start_time || dayConfig.defStart} disabled={!canEdit} />
                              <span>-</span>
                              <input type="time" class="form-input py-1 w-28" id={`end-${worker.id}-${dayConfig.dbIndex}`} value={dayHours?.end_time || dayConfig.defEnd} disabled={!canEdit} />
                            </div>
                          </td>
                          <td class="px-6 py-4">
                            <div class="flex flex-col gap-2">
                              <label class="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer">
                                <input type="checkbox" class="custom-checkbox" id={`break-enabled-${worker.id}-${dayConfig.dbIndex}`} checked={breakEnabled} disabled={!canEdit} onchange={`toggleBreakStatus(${worker.id}, ${dayConfig.dbIndex})`} />
                                Pauza
                              </label>
                              <div class="flex items-center gap-2">
                                <input type="time" class="form-input py-1 w-28" id={`break-start-${worker.id}-${dayConfig.dbIndex}`} value={dayHours?.break_start || '12:00'} disabled={!canEdit || !breakEnabled} />
                                <span>-</span>
                                <input type="time" class="form-input py-1 w-28" id={`break-end-${worker.id}-${dayConfig.dbIndex}`} value={dayHours?.break_end || '12:30'} disabled={!canEdit || !breakEnabled} />
                              </div>
                            </div>
                          </td>
                          <td class="px-6 py-4">
                            <label class="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" class="custom-checkbox" id={`active-${worker.id}-${dayConfig.dbIndex}`} checked={dayHours ? !dayHours.is_day_off : !dayConfig.defOff} disabled={!canEdit} onchange={`toggleWorkingStatus(${worker.id}, ${dayConfig.dbIndex})`} />
                              <span class="text-sm" id={`status-text-${worker.id}-${dayConfig.dbIndex}`}>{(dayHours ? !dayHours.is_day_off : !dayConfig.defOff) ? 'Pracuje' : 'Volno'}</span>
                            </label>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {/* Block Time Modal */}
      <div id="block-modal" class="modal-overlay">
        <div class="modal-container">
          <h2 class="text-xl font-bold mb-4 text-neutral-900 dark:text-white">Blokovat čas</h2>
          <form id="block-form" onsubmit="saveBlock(event)">
            <input type="hidden" id="block-worker-id" />
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Datum *</label>
                <input type="date" id="block-date" class="form-input" required />
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Od *</label>
                  <input type="time" id="block-start" class="form-input" required />
                </div>
                <div>
                  <label class="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Do *</label>
                  <input type="time" id="block-end" class="form-input" required />
                </div>
              </div>
              <div>
                <label class="block text-sm font-medium mb-1 text-neutral-700 dark:text-neutral-300">Důvod *</label>
                <input type="text" id="block-reason" class="form-input" placeholder="Lékař, Osobní..." required />
              </div>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button type="button" onclick="closeBlockModal()" class="btn btn-outline">Zrušit</button>
              <button type="submit" class="btn btn-primary">Blokovat</button>
            </div>
          </form>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        function showWorkerHours(workerId) {
          document.querySelectorAll('.worker-tab').forEach(el => {
            const isActive = el.dataset.worker == workerId;
            el.classList.toggle('bg-primary-600', isActive);
            el.classList.toggle('text-white', isActive);
            el.classList.toggle('bg-neutral-100', !isActive);
            el.classList.toggle('dark:bg-neutral-800', !isActive);
            el.classList.toggle('text-neutral-700', !isActive);
            el.classList.toggle('dark:text-neutral-300', !isActive);
          });
          document.querySelectorAll('.hours-section').forEach(el => {
            el.classList.toggle('hidden', !el.id.endsWith(workerId));
          });
          
          loadOverrides(workerId);
        }
        
        function switchSubTab(workerId, tab) {
           document.querySelectorAll('.sub-tab-' + workerId).forEach(el => {
              const isActive = el.dataset.tab === tab;
              el.classList.toggle('border-primary-600', isActive);
              el.classList.toggle('text-primary-600', isActive);
              el.classList.toggle('border-transparent', !isActive);
              el.classList.toggle('text-neutral-500', !isActive);
           });
           
           document.getElementById('tab-exceptions-' + workerId).classList.toggle('hidden', tab !== 'exceptions');
           document.getElementById('tab-standard-' + workerId).classList.toggle('hidden', tab !== 'standard');
        }

        function toggleTimeInputs(select, workerId) {
           const form = select.closest('form');
           const timeInputs = form.querySelector('.time-inputs');
           if (select.value === 'work') {
              timeInputs.classList.remove('hidden');
              timeInputs.classList.add('grid');
           } else {
              timeInputs.classList.add('hidden');
              timeInputs.classList.remove('grid');
           }
        }
        
        async function loadOverrides(workerId) {
           const tbody = document.getElementById('overrides-list-' + workerId);
           try {
             const res = await fetch('/api/working-hours/overrides?workerId=' + workerId);
             const data = await res.json();
             
             if (data.overrides.length === 0) {
               tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-sm text-neutral-500">Žádné výjimky</td></tr>';
               return;
             }
             
             tbody.innerHTML = data.overrides.map(o => \`
               <tr class="hover:bg-neutral-50 dark:hover:bg-neutral-700">
                 <td class="px-4 py-3 text-sm">\${new Date(o.date).toLocaleDateString('cs-CZ')}</td>
                 <td class="px-4 py-3">
                   <span class="px-2 py-1 rounded-full text-xs \${o.is_day_off ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'}">
                     \${o.is_day_off ? 'Volno' : 'Směna'}
                   </span>
                 </td>
                 <td class="px-4 py-3 text-sm">
                   \${!o.is_day_off ? (o.start_time + ' - ' + o.end_time) : '-'}
                 </td>
                 <td class="px-4 py-3 text-sm text-neutral-600 dark:text-neutral-400">\${o.note || '-'}</td>
                 <td class="px-4 py-3 text-right">
                   <button onclick="deleteOverride(\${o.id}, \${workerId})" class="text-red-600 hover:text-red-800 text-sm">Smazat</button>
                 </td>
               </tr>
             \`).join('');
           } catch (e) {
             tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-3 text-center text-red-500">Chyba načítání</td></tr>';
           }
        }
        
        function onOverrideDateFromChange(input, workerId) {
           const form = input.closest('form');
           const dateTo = form.querySelector('input[name="date_to"]');
           if (dateTo && (!dateTo.value || dateTo.value < input.value)) {
              dateTo.value = input.value;
              // Update Flatpickr visible input if present
              if (dateTo._flatpickr) {
                dateTo._flatpickr.setDate(input.value, false);
              }
           }
           if (dateTo._flatpickr) {
             dateTo._flatpickr.set('minDate', input.value);
           } else {
             dateTo.min = input.value;
           }
        }

        async function addOverride(e, workerId) {
           e.preventDefault();
           const form = e.target;
           const formData = new FormData(form);
           const type = formData.get('type');
           const dateFrom = formData.get('date');
           const dateTo = formData.get('date_to') || dateFrom;
           const note = formData.get('note');
           
           // Generate list of dates in range
           const dates = [];
           const start = new Date(dateFrom + 'T00:00:00');
           const end = new Date(dateTo + 'T00:00:00');
           if (end < start) {
             window.showToast('Datum "do" nesmí být před "od"', 'error');
             return;
           }
           // Limit to max 90 days to prevent accidental huge ranges
           const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
           if (diffDays > 90) {
             window.showToast('Maximální rozsah je 90 dní', 'error');
             return;
           }
           
           for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
             const y = d.getFullYear();
             const m = String(d.getMonth() + 1).padStart(2, '0');
             const day = String(d.getDate()).padStart(2, '0');
             dates.push(y + '-' + m + '-' + day);
           }
           
           let hasError = false;
           for (const date of dates) {
             const data = {
               user_id: workerId,
               date: date,
               is_day_off: type === 'off',
               note: note
             };
             
             if (type === 'work') {
               data.start_time = formData.get('start_time');
               data.end_time = formData.get('end_time');
             }
             
             const res = await fetch('/api/working-hours/overrides', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify(data)
             });
             
             if (!res.ok) hasError = true;
           }
           
           if (hasError) {
             window.showToast('Některé dny se nepodařilo uložit', 'error');
           } else {
             const count = dates.length;
             window.showToast(count > 1 ? 'Přidáno ' + count + ' dní' : 'Přidáno', 'success');
           }
           form.reset();
           loadOverrides(workerId);
        }
        
        async function deleteOverride(id, workerId) {
           window.confirmAction('Smazat výjimku?', async () => {
             await fetch('/api/working-hours/overrides/' + id, { method: 'DELETE' });
             loadOverrides(workerId);
           });
        }
        
        function toggleWorkingStatus(workerId, dayOfWeek) {
          const checkbox = document.getElementById('active-' + workerId + '-' + dayOfWeek);
          const statusText = document.getElementById('status-text-' + workerId + '-' + dayOfWeek);
          if (statusText) {
            statusText.textContent = checkbox.checked ? 'Pracuje' : 'Volno';
          }
        }

        function toggleBreakStatus(workerId, dayOfWeek) {
          const checkbox = document.getElementById('break-enabled-' + workerId + '-' + dayOfWeek);
          const start = document.getElementById('break-start-' + workerId + '-' + dayOfWeek);
          const end = document.getElementById('break-end-' + workerId + '-' + dayOfWeek);
          const enabled = checkbox.checked;
          start.disabled = !enabled;
          end.disabled = !enabled;
          if (!enabled) {
            start.value = '';
            end.value = '';
          }
        }

        // Day indices: 0=Sunday, 1=Monday, ..., 6=Saturday
        const dayIndices = [1, 2, 3, 4, 5, 6, 0]; // Monday to Sunday in display order

        async function saveAllHours(workerId) {
          let hasError = false;
          for (const dayOfWeek of dayIndices) {
            const startEl = document.getElementById('start-' + workerId + '-' + dayOfWeek);
            if (!startEl) continue; // Skip if element doesn't exist
            
            const result = await saveHoursForDay(workerId, dayOfWeek);
            if (!result) hasError = true;
          }
          if (!hasError) {
            window.showToast('Vše uloženo!', 'success');
          }
        }

        async function saveHoursForDay(workerId, dayOfWeek) {
          const breakEnabled = document.getElementById('break-enabled-' + workerId + '-' + dayOfWeek).checked;
          const data = {
            user_id: workerId,
            day_of_week: dayOfWeek,
            start_time: document.getElementById('start-' + workerId + '-' + dayOfWeek).value || '09:00',
            end_time: document.getElementById('end-' + workerId + '-' + dayOfWeek).value || '17:00',
            break_start: breakEnabled ? (document.getElementById('break-start-' + workerId + '-' + dayOfWeek).value || '') : '',
            break_end: breakEnabled ? (document.getElementById('break-end-' + workerId + '-' + dayOfWeek).value || '') : '',
            is_working: document.getElementById('active-' + workerId + '-' + dayOfWeek).checked
          };

          try {
            const res = await fetch('/api/working-hours', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            
            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              console.error('Save error for day', dayOfWeek, err);
              window.showToast(err.error || 'Chyba při ukládání', 'error');
              return false;
            }
            return true;
          } catch (e) {
            console.error('Network error:', e);
            window.showToast('Chyba sítě', 'error');
            return false;
          }
        }

        async function saveHours(workerId, dayOfWeek) {
          const result = await saveHoursForDay(workerId, dayOfWeek);
          if (result) {
            window.showToast('Uloženo!', 'success');
          }
        }

        // --- Block Time Logic ---
        function openBlockModal(workerId) {
          document.getElementById('block-worker-id').value = workerId;
          document.getElementById('block-form').reset();
          document.getElementById('block-modal').classList.add('open');
        }

        function closeBlockModal() {
          document.getElementById('block-modal').classList.remove('open');
        }

        async function saveBlock(e) {
          e.preventDefault();
          const workerId = document.getElementById('block-worker-id').value;
          
          const data = {
            workerId: parseInt(workerId),
            date: document.getElementById('block-date').value,
            startTime: document.getElementById('block-start').value,
            endTime: document.getElementById('block-end').value,
            reason: document.getElementById('block-reason').value
          };

          const res = await fetch('/api/reservations/admin-block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (res.ok) {
            window.showToast('Čas zablokován.', 'success');
            closeBlockModal();
          } else {
            window.showToast('Chyba při blokaci.', 'error');
          }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
           const visibleSection = document.querySelector('.hours-section:not(.hidden)');
           if (visibleSection) {
              const workerId = visibleSection.id.replace('hours-', '');
              loadOverrides(workerId);
           }
        });
      `}} />
    </div>
  );
};
