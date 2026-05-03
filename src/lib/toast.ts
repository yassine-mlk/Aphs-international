import { toast } from 'sonner';

export const showToast = (
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
) => {
  switch (type) {
    case 'success':
      toast.success(message, { duration: 4000 });
      break;
    case 'error':
      toast.error(message, { duration: 5000 });
      break;
    default:
      toast(message, { 
        duration: 4000,
        icon: type === 'info' ? 'ℹ️' : undefined
      });
  }
};
