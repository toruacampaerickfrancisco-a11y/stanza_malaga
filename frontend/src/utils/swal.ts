import Swal from 'sweetalert2';

export const showAlert = (title: string, text: string, icon: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonColor: '#800020',
    confirmButtonText: 'Aceptar'
  });
};

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export const showToast = (title: string, icon: 'success' | 'error' | 'warning' | 'info' = 'success') => {
  return Toast.fire({
    icon,
    title
  });
};

export const showSuccess = (title: string, text: string = '') => {
  if (!text) return showToast(title, 'success');
  return showAlert(title, text, 'success');
};

export const showError = (title: string, text: string = '') => {
  if (!text) return showToast(title, 'error');
  return showAlert(title, text, 'error');
};

export const showInfo = (title: string, text: string = '') => {
  return showAlert(title, text, 'info');
};

export const showConfirm = async (title: string, text: string, confirmButtonText: string = 'Sí, continuar'): Promise<boolean> => {
  const result = await Swal.fire({
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText,
    cancelButtonText: 'Cancelar'
  });
  return result.isConfirmed;
};
