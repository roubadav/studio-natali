import type { FC } from 'hono/jsx';
import { BaseLayout } from './Layout';
import type { ReservationWithItems } from '../types';
import { getTranslations } from '../lib/i18n';

const t = getTranslations();

interface ActionPageProps {
  reservation: ReservationWithItems;
  token: string;
  action: 'approve' | 'reject' | 'cancel';
}

export const ReservationActionPage: FC<ActionPageProps> = ({ reservation, token, action }) => {
  const isApprove = action === 'approve';
  const isReject = action === 'reject';
  const isCancel = action === 'cancel'; // Customer cancellation

  const title = isApprove ? t.reservation_actions.approve_title : isReject ? t.reservation_actions.reject_title : t.reservation_actions.cancel_title;
  
  return (
    <BaseLayout title={`${title} | ${t.common.site_name}`}>
      <div class="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center p-4">
        <div class="max-w-md w-full bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-8">
          <div class="text-center mb-6">
            <div class={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${
              isApprove ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              <i data-lucide={isApprove ? 'check' : 'x'} class="w-8 h-8"></i>
            </div>
            <h1 class="text-2xl font-bold text-neutral-900 dark:text-white">{title}</h1>
            <p class="text-neutral-500 dark:text-neutral-400 mt-2">
              {reservation.customer_name} - {reservation.date} {t.reservation_actions.at_time} {reservation.start_time}
            </p>
          </div>

          <form id="action-form" class="space-y-4">
            {(isReject || isCancel) && (
              <div>
                <label class="block text-sm font-medium mb-2">{t.reservation_actions.reason_label} {isCancel ? t.reservation_actions.reason_cancel : t.reservation_actions.reason_reject} *</label>
                <textarea 
                  name="reason" 
                  class="form-input w-full" 
                  rows={3} 
                  required 
                  placeholder={isCancel ? t.reservation_actions.reason_cancel_placeholder : t.reservation_actions.reason_reject_placeholder}
                ></textarea>
              </div>
            )}

            <button type="submit" class={`btn w-full ${isApprove ? 'btn-primary' : 'bg-red-600 text-white hover:bg-red-700'}`}>
              {isApprove ? t.reservation_actions.confirm_approve : isReject ? t.reservation_actions.confirm_reject : t.reservation_actions.confirm_cancel}
            </button>
          </form>
          
          <div id="result-message" class="hidden mt-4 text-center p-4 rounded-lg"></div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('action-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          const formData = new FormData(form);
          const btn = form.querySelector('button');
          const result = document.getElementById('result-message');
          
          btn.disabled = true;
          btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> ${t.reservation_actions.processing}';
          lucide.createIcons();

          const action = '${isApprove ? 'approve' : 'reject'}'; // 'cancel' uses reject logic mostly or same endpoint
          // Wait, 'cancel' is customer action. API logic might need to distinguish if we want to track 'cancelled_by'.
          // For now reusing 'reject' status logic but maybe passing a flag?
          // The API /reservations/manage handles 'approve' | 'reject'. 
          // For customer cancel, we should use 'reject' action but maybe semantic is different?
          // Actually, 'reject' sets status to 'cancelled'. That fits.
          
          try {
            const res = await fetch('/api/reservations/manage', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: '${token}',
                action: '${isCancel ? 'reject' : (isApprove ? 'approve' : 'reject')}',
                reason: formData.get('reason')
              })
            });
            
            const data = await res.json();
            
            if (res.ok) {
              form.classList.add('hidden');
              result.classList.remove('hidden');
              result.classList.add('bg-green-100', 'text-green-800');
              result.textContent = '${t.reservation_actions.success}';
            } else {
              throw new Error(data.error || '${t.reservation_actions.error}');
            }
          } catch (e) {
            btn.disabled = false;
            btn.textContent = '${t.reservation_actions.retry}';
            result.classList.remove('hidden');
            result.classList.add('bg-red-100', 'text-red-800');
            result.textContent = e.message;
          }
        });
        
        lucide.createIcons();
      `}} />
    </BaseLayout>
  );
};
