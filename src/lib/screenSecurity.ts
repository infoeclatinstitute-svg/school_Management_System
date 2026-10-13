export const enableScreenSecurity = async () => {
  try {
    if (typeof window !== 'undefined') {
      if ((window as any).AndroidSecurity?.enableProtection) {
        (window as any).AndroidSecurity.enableProtection();
      }
      if ((window as any).desktopAPI?.enableScreenProtection) {
        (window as any).desktopAPI.enableScreenProtection();
      }
    }
  } catch {
    // Web fallback
  }
};

export const disableScreenSecurity = async () => {
  try {
    if (typeof window !== 'undefined') {
      if ((window as any).AndroidSecurity?.disableProtection) {
        (window as any).AndroidSecurity.disableProtection();
      }
      if ((window as any).desktopAPI?.disableScreenProtection) {
        (window as any).desktopAPI.disableScreenProtection();
      }
    }
  } catch {
    // Web fallback
  }
};
