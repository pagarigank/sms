/**
 * Apply tenant branding to the document root.
 * Called on app bootstrap after fetching tenant info.
 */
export function applyTenantBranding(branding: Record<string, any> | undefined) {
  if (!branding) return;

  const root = document.documentElement;

  if (branding.primaryColor) {
    root.style.setProperty('--primary', branding.primaryColor);
  }
  if (branding.secondaryColor) {
    root.style.setProperty('--secondary', branding.secondaryColor);
  }
  if (branding.accentColor) {
    root.style.setProperty('--accent', branding.accentColor);
  }
  if (branding.backgroundColor) {
    root.style.setProperty('--background', branding.backgroundColor);
  }
  if (branding.fontFamily) {
    root.style.fontFamily = branding.fontFamily;
  }
  if (branding.favicon) {
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (link) {
      link.href = branding.favicon;
    }
  }
}

/**
 * Get tenant logo URL.
 */
export function getTenantLogo(branding: Record<string, any> | undefined): string | null {
  return branding?.logo || null;
}

/**
 * Get tenant name.
 */
export function getTenantName(tenant: { name?: string; branding?: Record<string, any> }): string {
  return tenant.branding?.schoolName || tenant.name || 'School';
}
