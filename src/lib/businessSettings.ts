export type RestaurantBusinessType = 'full_service' | 'fast_casual' | 'quick_serve';

export interface BusinessSettings {
  businessType: RestaurantBusinessType;
  businessName: string;
  unitNumber: string;
  businessAddress: string;
  businessPhone: string;
  businessLogoUrl: string;
}

export const BUSINESS_SETTINGS_STORAGE_KEY = 'spoonbill_business_settings_v1';
export const BUSINESS_SETTINGS_UPDATED_EVENT = 'spoonbill:business-settings-updated';

const DEFAULT_SETTINGS: BusinessSettings = {
  businessType: 'full_service',
  businessName: 'The Spoonbill Lounge',
  unitNumber: '',
  businessAddress: '',
  businessPhone: '',
  businessLogoUrl: '',
};

export const getDefaultBusinessSettings = (): BusinessSettings => ({ ...DEFAULT_SETTINGS });

export const getBusinessSettings = (): BusinessSettings => {
  if (typeof window === 'undefined') {
    return getDefaultBusinessSettings();
  }

  try {
    const raw = window.localStorage.getItem(BUSINESS_SETTINGS_STORAGE_KEY);
    if (!raw) return getDefaultBusinessSettings();

    const parsed = JSON.parse(raw) as Partial<BusinessSettings>;
    return {
      businessType:
        parsed.businessType === 'fast_casual' || parsed.businessType === 'quick_serve'
          ? parsed.businessType
          : 'full_service',
      businessName: String(parsed.businessName || DEFAULT_SETTINGS.businessName),
      unitNumber: String(parsed.unitNumber || ''),
      businessAddress: String(parsed.businessAddress || ''),
      businessPhone: String(parsed.businessPhone || ''),
      businessLogoUrl: String(parsed.businessLogoUrl || ''),
    };
  } catch {
    return getDefaultBusinessSettings();
  }
};

export const saveBusinessSettings = (settings: BusinessSettings) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BUSINESS_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(BUSINESS_SETTINGS_UPDATED_EVENT));
};
