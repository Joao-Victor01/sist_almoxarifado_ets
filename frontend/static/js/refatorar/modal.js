// frontend/static/js/modal.js

export function initGenericModal({ openSelectors, modalId, cancelId, hiddenCleanup = true }) {
    const modalEl = document.getElementById(modalId);
    const modal = new bootstrap.Modal(modalEl);
  
    openSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(btn => {
        btn.addEventListener('click', e => {
          e.preventDefault();
          modal.show();
        });
      });
    });
  
    document.getElementById(cancelId).addEventListener('click', () => {
      modal.hide();
    });
  
    if (hiddenCleanup) {
      modalEl.addEventListener('hidden.bs.modal', () => {
        document.body.classList.remove('modal-open');
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      });
    }
  
    return modal;
  }
  