type Branding = {
  logoLight: string;
  logoDark: string;
  logoIcon: string;
};

const DEFAULT_BRANDING: Branding = {
  logoLight: '/assets/branding/classly-logo-light.svg',
  logoDark: '/assets/branding/classly-logo-dark.svg',
  logoIcon: '/assets/branding/classly-logo-icon.svg',
};

const DEFAULT_BRAND_NAME = 'Classly';

export function getTenantBranding(): Branding {
  if (typeof window === 'undefined') {
    return DEFAULT_BRANDING;
  }

  try {
    const rawTenant = window.localStorage.getItem('tenant');
    if (!rawTenant) {
      return DEFAULT_BRANDING;
    }

    const parsed = JSON.parse(rawTenant);
    const logoLight = parsed?.logo_light_url || parsed?.branding?.logo_light_url;
    const logoDark = parsed?.logo_dark_url || parsed?.branding?.logo_dark_url;
    const logoIcon = parsed?.logo_icon_url || parsed?.branding?.logo_icon_url;

    return {
      logoLight: typeof logoLight === 'string' && logoLight.length > 0 ? logoLight : DEFAULT_BRANDING.logoLight,
      logoDark: typeof logoDark === 'string' && logoDark.length > 0 ? logoDark : DEFAULT_BRANDING.logoDark,
      logoIcon: typeof logoIcon === 'string' && logoIcon.length > 0 ? logoIcon : DEFAULT_BRANDING.logoIcon,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to parse tenant branding from localStorage', error);
    return DEFAULT_BRANDING;
  }
}

export function setTenantBranding(tenantJson: unknown): Branding {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('tenant', JSON.stringify(tenantJson));
  }

  return getTenantBranding();
}

export function getTenantBrandName(fallback: string = DEFAULT_BRAND_NAME): string {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const rawTenant = window.localStorage.getItem('tenant');
    if (!rawTenant) {
      return fallback;
    }

    const parsed = JSON.parse(rawTenant);
    const nameCandidate = parsed?.name || parsed?.branding?.name;
    return typeof nameCandidate === 'string' && nameCandidate.trim().length > 0
      ? nameCandidate.trim()
      : fallback;
  } catch {
    return fallback;
  }
}
