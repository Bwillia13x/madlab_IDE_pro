/**
 * Error Toast System
 * User-friendly error notifications with recovery actions
 */

import { toast } from 'sonner';
import { type EnhancedError, type RecoveryAction } from './index';

interface ErrorToastOptions {
  duration?: number;
  dismissible?: boolean;
  showRecovery?: boolean;
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

export class ErrorToastManager {
  /**
   * Show error toast with recovery actions
   */
  showError(error: EnhancedError, options: ErrorToastOptions = {}) {
    const {
      duration = this.getDurationBySeverity(error.severity),
      dismissible = true,
      showRecovery = true,
    } = options;

    const toastId = toast.error(error.userMessage, {
      description: this.getDescription(error),
      duration,
      dismissible,
      action: showRecovery && error.recoveryActions.length > 0 ? 
        this.createRecoveryAction(error.recoveryActions[0]) : undefined,
      cancel: error.recoveryActions.length > 1 ? 
        this.createRecoveryAction(error.recoveryActions[1]) : undefined,
    });

    return toastId;
  }

  /**
   * Show success toast for error recovery
   */
  showRecoverySuccess(message: string, options: Partial<ErrorToastOptions> = {}) {
    return toast.success(message, {
      duration: options.duration || 3000,
      dismissible: options.dismissible ?? true,
    });
  }

  /**
   * Show warning toast for potential issues
   */
  showWarning(message: string, description?: string, options: Partial<ErrorToastOptions> = {}) {
    return toast.warning(message, {
      description,
      duration: options.duration || 5000,
      dismissible: options.dismissible ?? true,
    });
  }

  /**
   * Show info toast for user guidance
   */
  showInfo(message: string, description?: string, options: Partial<ErrorToastOptions> = {}) {
    return toast.info(message, {
      description,
      duration: options.duration || 4000,
      dismissible: options.dismissible ?? true,
    });
  }

  private getDurationBySeverity(severity: string): number {
    switch (severity) {
      case 'critical': return 0; // Don't auto-dismiss critical errors
      case 'high': return 10000; // 10 seconds
      case 'medium': return 6000; // 6 seconds
      case 'low': return 4000; // 4 seconds
      default: return 5000;
    }
  }

  private getDescription(error: EnhancedError): string {
    const parts: string[] = [];
    
    if (error.code) {
      parts.push(`Code: ${error.code}`);
    }
    
    if (error.context?.component) {
      parts.push(`Component: ${error.context.component}`);
    }

    return parts.join(' • ');
  }

  private createRecoveryAction(action: RecoveryAction) {
    return {
      label: action.label,
      onClick: async () => {
        try {
          await action.action();
          this.showRecoverySuccess(`${action.label} completed successfully`);
        } catch (error) {
          const recoveryError = new Error(error instanceof Error ? error.message : 'Recovery action failed') as EnhancedError;
          recoveryError.category = 'system';
          recoveryError.severity = 'medium';
          recoveryError.userMessage = `Failed to ${action.label.toLowerCase()}`;
          recoveryError.technicalMessage = error instanceof Error ? error.message : 'Recovery action failed';
          recoveryError.recoveryActions = [];
          this.showError(recoveryError);
        }
      },
    };
  }
}

// Create singleton instance
export const errorToast = new ErrorToastManager();

// Convenience functions
export const showErrorToast = (error: EnhancedError, options?: ErrorToastOptions) => {
  return errorToast.showError(error, options);
};

export const showWarningToast = (message: string, description?: string, options?: Partial<ErrorToastOptions>) => {
  return errorToast.showWarning(message, description, options);
};

export const showInfoToast = (message: string, description?: string, options?: Partial<ErrorToastOptions>) => {
  return errorToast.showInfo(message, description, options);
};

export const showSuccessToast = (message: string, options?: Partial<ErrorToastOptions>) => {
  return errorToast.showRecoverySuccess(message, options);
};

export default errorToast;