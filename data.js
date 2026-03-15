(function () {
  const STORAGE_KEY = 'spoonbill-boh-data-v1';
  const AUTH_KEY = 'spoonbill-admin-auth-v1';
  const SESSION_KEY = 'spoonbill-admin-session-v1';

  const MENU_CATEGORIES = ['Spirits', 'Cocktails', 'Cuisine', 'Tastings'];

  const defaultData = {
    settings: {
      venueName: 'The Spoonbill Lounge',
      phone: '(310) 555-0147',
      email: 'hello@spoonbilllounge.com',
      address: 'Redondo Beach, CA',
    },
    menuItems: [
      {
        id: uid(),
        name: 'Japanese Whisky Flight',
        category: 'Spirits',
        description: 'Three premium pours with tasting notes.',
        price: 42,
        active: true,
      },
      {
        id: uid(),
        name: 'Yuzu Marlin',
        category: 'Cocktails',
        description: 'Citrus-forward gin cocktail with yuzu and marigold bitters.',
        price: 19,
        active: true,
      },
      {
        id: uid(),
        name: 'Miso Butter Black Cod',
        category: 'Cuisine',
        description: 'Pacific black cod with charred bok choy and sesame rice.',
        price: 38,
        active: true,
      },
      {
        id: uid(),
        name: 'Chef\'s Pacific Rim Journey',
        category: 'Tastings',
        description: 'Five-course tasting with optional cocktail pairing.',
        price: 115,
        active: true,
      },
    ],
    reservations: [],
    classes: [],
    privateEvents: [],
    teamMembers: [],
    schedules: [],
  };

  const defaultAuth = {
    password: 'spoonbill-admin',
  };

  function uid() {
    if (window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return structuredClone(defaultData);
      const parsed = JSON.parse(raw);
      return mergeData(parsed);
    } catch (err) {
      console.warn('Failed to load Spoonbill data, using defaults.', err);
      return structuredClone(defaultData);
    }
  }

  function mergeData(input) {
    const safe = input || {};
    return {
      settings: { ...defaultData.settings, ...(safe.settings || {}) },
      menuItems: normalizeArray(safe.menuItems, defaultData.menuItems),
      reservations: normalizeArray(safe.reservations),
      classes: normalizeArray(safe.classes),
      privateEvents: normalizeArray(safe.privateEvents),
      teamMembers: normalizeArray(safe.teamMembers),
      schedules: normalizeArray(safe.schedules),
    };
  }

  function normalizeArray(items, fallback) {
    const source = Array.isArray(items)
      ? items
      : Array.isArray(fallback)
        ? fallback
        : [];

    return source.map((entry) => ({ id: entry.id || uid(), ...entry }));
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mergeData(data)));
  }

  function loadAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (!raw) return { ...defaultAuth };
      const parsed = JSON.parse(raw);
      if (!parsed.password || typeof parsed.password !== 'string') {
        return { ...defaultAuth };
      }
      return { password: parsed.password };
    } catch {
      return { ...defaultAuth };
    }
  }

  function saveAuth(auth) {
    const next = {
      password: auth && typeof auth.password === 'string' && auth.password.trim()
        ? auth.password.trim()
        : defaultAuth.password,
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(next));
  }

  function setAdminSession(active) {
    if (active) {
      sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }

  function isAdminAuthenticated() {
    return Boolean(sessionStorage.getItem(SESSION_KEY));
  }

  function requireAdminAuth() {
    if (!isAdminAuthenticated()) {
      window.location.href = 'admin-login.html';
      return false;
    }
    return true;
  }

  window.SpoonbillStore = {
    STORAGE_KEY,
    AUTH_KEY,
    SESSION_KEY,
    MENU_CATEGORIES,
    uid,
    loadData,
    saveData,
    mergeData,
    loadAuth,
    saveAuth,
    setAdminSession,
    isAdminAuthenticated,
    requireAdminAuth,
  };
})();
