// lib/addon-limits.ts


export const ADDON_LIMITS = {
    MAX_COUNT: 10,
    TITLE_MAX_LENGTH: 80,
    DESC_MAX_LENGTH: 200,
    MIN_PRICE: 5,
    MAX_PRICE: 5000,
  };
  
  export const validateAddonList = (addons: any[]): string | null => {
    if (!Array.isArray(addons)) return "Addons must be an array.";
    if (addons.length > ADDON_LIMITS.MAX_COUNT) {
      return `Maximum of ${ADDON_LIMITS.MAX_COUNT} add-ons allowed.`;
    }
  
    for (let i = 0; i < addons.length; i++) {
      const addon = addons[i];
      if (addon.enabled === false) continue;
  
      const title = (addon.label || "").trim();
      const desc = (addon.desc || "").trim();
      const price = Number(addon.price);
  
      if (!title) {
        return `Add-on #${i + 1} must have a title.`;
      }
      if (title.length > ADDON_LIMITS.TITLE_MAX_LENGTH) {
        return `Add-on #${i + 1} title cannot exceed ${ADDON_LIMITS.TITLE_MAX_LENGTH} characters.`;
      }
  
      if (desc.length > ADDON_LIMITS.DESC_MAX_LENGTH) {
        return `Add-on "${title}" description cannot exceed ${ADDON_LIMITS.DESC_MAX_LENGTH} characters.`;
      }
  
      if (
        isNaN(price) ||
        !isFinite(price) ||
        price < ADDON_LIMITS.MIN_PRICE ||
        price > ADDON_LIMITS.MAX_PRICE ||
        (price * 100) % 1 !== 0
      ) {
        return `Add-on "${title}" price must be between $${ADDON_LIMITS.MIN_PRICE} and $${ADDON_LIMITS.MAX_PRICE} (up to 2 decimal places).`;
      }
    }
  
    return null;
  };