/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment */
// @ts-nocheck

type PlainObject = Record<string, any>;

const DB_KEY = 'spoonbill.local.db.v1';
const USERS_KEY = 'spoonbill.local.users.v1';
const SESSION_KEY = 'spoonbill.local.session.v1';
const FILES_KEY = 'spoonbill.local.files.v1';

const FK_TABLE_MAP: Record<string, string> = {
  category_id: 'menu_categories',
  department_id: 'job_departments',
  job_type_id: 'job_types',
  role_id: 'admin_roles',
  menu_id: 'tasting_menus',
  course_id: 'tasting_menu_courses',
  template_id: 'tasting_menu_templates',
};

const ALIAS_TABLE_MAP: Record<string, string> = {
  category: 'menu_categories',
  department: 'job_departments',
  job_type: 'job_types',
  role: 'admin_roles',
};

const DEFAULT_ADMIN_EMAIL = 'admin@spoonbill.local';
const DEFAULT_ADMIN_PASSWORD = 'spoonbill-admin';

const nowIso = () => new Date().toISOString();

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'item';

const createId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
};

const formatTime = (hour24: number) => `${String(hour24).padStart(2, '0')}:00`;

const buildDefaultTimeSlots = () => {
  const slots: PlainObject[] = [];

  for (let day = 0; day < 7; day += 1) {
    for (let hour = 17; hour <= 22; hour += 1) {
      slots.push({
        id: createId('slot'),
        start_time: formatTime(hour),
        end_time: formatTime(hour + 1),
        day_of_week: day,
        capacity: 24,
        is_event_slot: false,
        active: true,
        created_at: nowIso(),
      });
    }

    for (let hour = 18; hour <= 21; hour += 1) {
      slots.push({
        id: createId('event_slot'),
        start_time: formatTime(hour),
        end_time: formatTime(hour + 2),
        day_of_week: day,
        capacity: 80,
        is_event_slot: true,
        active: true,
        created_at: nowIso(),
      });
    }
  }

  return slots;
};

const seedMenu = () => {
  const categories = [
    { id: 'cat_cocktails', name: 'Cocktails', menu_type: 'drinks', display_order: 1, parent_id: null, active: true },
    { id: 'cat_spirits', name: 'Spirits', menu_type: 'drinks', display_order: 2, parent_id: null, active: true },
    { id: 'cat_cuisine', name: 'Cuisine', menu_type: 'food', display_order: 1, parent_id: null, active: true },
    { id: 'cat_signature', name: 'Signature Cocktails', menu_type: 'drinks', display_order: 1, parent_id: 'cat_cocktails', active: true },
    { id: 'cat_zero_proof', name: 'Zero Proof', menu_type: 'drinks', display_order: 2, parent_id: 'cat_cocktails', active: true },
    { id: 'cat_whiskey', name: 'Whiskey', menu_type: 'drinks', display_order: 1, parent_id: 'cat_spirits', active: true },
    { id: 'cat_agave', name: 'Agave', menu_type: 'drinks', display_order: 2, parent_id: 'cat_spirits', active: true },
    { id: 'cat_small_plates', name: 'Small Plates', menu_type: 'food', display_order: 1, parent_id: 'cat_cuisine', active: true },
    { id: 'cat_entrees', name: 'Entrees', menu_type: 'food', display_order: 2, parent_id: 'cat_cuisine', active: true },
  ].map((item) => ({ ...item, created_at: nowIso(), updated_at: nowIso() }));

  const items = [
    {
      id: 'item_tidepool',
      name: 'Tidepool Daiquiri',
      description: 'White rum, pandan, lime, and demerara.',
      price: 18,
      bottle_price: null,
      image_url: null,
      menu_type: 'drinks',
      show_price: true,
      show_description: true,
      ingredients: ['White Rum', 'Pandan', 'Lime'],
      allergens: null,
      is_vegetarian: true,
      is_vegan: true,
      is_gluten_free: true,
      alcohol_content: 3,
      garnish: 'Lime zest',
      category_id: 'cat_signature',
      active: true,
    },
    {
      id: 'item_orchid',
      name: 'Orchid No. 5',
      description: 'Lychee, coconut water, jasmine, and citrus.',
      price: 14,
      bottle_price: null,
      image_url: null,
      menu_type: 'drinks',
      show_price: true,
      show_description: true,
      ingredients: ['Lychee', 'Coconut Water', 'Jasmine'],
      allergens: null,
      is_vegetarian: true,
      is_vegan: true,
      is_gluten_free: true,
      alcohol_content: 0,
      garnish: 'Edible orchid',
      category_id: 'cat_zero_proof',
      active: true,
    },
    {
      id: 'item_single_malt',
      name: 'Highland Single Malt',
      description: 'Notes of honey, peat, and orange oil.',
      price: 24,
      bottle_price: null,
      image_url: null,
      menu_type: 'drinks',
      show_price: true,
      show_description: true,
      ingredients: ['Scotch Whisky'],
      allergens: null,
      is_vegetarian: true,
      is_vegan: true,
      is_gluten_free: true,
      alcohol_content: 4,
      garnish: null,
      category_id: 'cat_whiskey',
      active: true,
    },
    {
      id: 'item_crudo',
      name: 'Hamachi Crudo',
      description: 'Yuzu kosho, cucumber, and chili crisp.',
      price: 22,
      bottle_price: null,
      image_url: null,
      menu_type: 'food',
      show_price: true,
      show_description: true,
      ingredients: ['Hamachi', 'Yuzu', 'Cucumber'],
      allergens: ['Fish'],
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: true,
      alcohol_content: null,
      garnish: null,
      category_id: 'cat_small_plates',
      active: true,
    },
    {
      id: 'item_short_rib',
      name: 'Miso Short Rib',
      description: 'Shiitake glaze, scallion rice, and sesame.',
      price: 36,
      bottle_price: null,
      image_url: null,
      menu_type: 'food',
      show_price: true,
      show_description: true,
      ingredients: ['Beef Short Rib', 'Miso', 'Sesame'],
      allergens: ['Soy'],
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: false,
      alcohol_content: null,
      garnish: null,
      category_id: 'cat_entrees',
      active: true,
    },
  ].map((item) => ({ ...item, created_at: nowIso(), updated_at: nowIso() }));

  return { categories, items };
};

const seedTastings = () => {
  const menus = [
    {
      id: 'tm_omakase',
      name: 'Spoonbill Tasting Journey',
      description: 'A five-course guided pairing highlighting our seasonal menu.',
      price: 115,
      menu_type: 'prix_fixe',
      display_order: 1,
      active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  const courses = [
    {
      id: 'tc_first',
      menu_id: 'tm_omakase',
      name: 'First Course',
      description: 'Bright and citrus-driven opener.',
      display_order: 1,
      allows_choice: false,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: 'tc_second',
      menu_id: 'tm_omakase',
      name: 'Main Course',
      description: 'Chef-selected centerpiece.',
      display_order: 2,
      allows_choice: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  const items = [
    {
      id: 'ti_first',
      course_id: 'tc_first',
      name: 'Madai Sashimi',
      description: 'Finger lime, shiso oil, and sea salt.',
      ingredients: ['Madai', 'Finger Lime', 'Shiso'],
      allergens: ['Fish'],
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: true,
      display_order: 1,
      active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
    {
      id: 'ti_second',
      course_id: 'tc_second',
      name: 'Black Cod',
      description: 'Charred pineapple glaze and coconut rice.',
      ingredients: ['Black Cod', 'Pineapple', 'Coconut'],
      allergens: ['Fish'],
      is_vegetarian: false,
      is_vegan: false,
      is_gluten_free: true,
      display_order: 1,
      active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    },
  ];

  return { menus, courses, items };
};

const buildDefaultDb = () => {
  const { categories, items } = seedMenu();
  const tastings = seedTastings();

  return {
    menu_categories: categories,
    menu_items: items,
    tasting_menus: tastings.menus,
    tasting_menu_courses: tastings.courses,
    tasting_menu_items: tastings.items,
    tasting_menu_templates: [],
    tasting_menu_course_templates: [],
    events: [
      {
        id: 'event_mixology',
        title: 'Island Mixology Class',
        description: 'Hands-on class featuring three signature Spoonbill cocktails.',
        date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        time: '19:00:00',
        price: 85,
        image_url: null,
        booking_type: 'class',
        booking_url: null,
        display_order: 1,
        active: true,
        created_at: nowIso(),
      },
      {
        id: 'event_tasting',
        title: 'Pacific Rim Tasting Night',
        description: 'Chef-led tasting with paired cocktails.',
        date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        time: '18:30:00',
        price: 125,
        image_url: null,
        booking_type: 'reservation',
        booking_url: null,
        display_order: 2,
        active: true,
        created_at: nowIso(),
      },
    ],
    time_slots: buildDefaultTimeSlots(),
    reservations: [],
    event_bookings: [],
    tables: [],
    job_departments: [
      { id: 'dept_service', name: 'Service', description: 'Front of house hospitality team', active: true, created_at: nowIso() },
      { id: 'dept_bar', name: 'Bar', description: 'Cocktail and beverage operations', active: true, created_at: nowIso() },
      { id: 'dept_kitchen', name: 'Kitchen', description: 'Culinary operations', active: true, created_at: nowIso() },
    ],
    job_types: [
      { id: 'type_full_time', name: 'Full Time', code: 'FT', description: '40+ hours/week', active: true, created_at: nowIso() },
      { id: 'type_part_time', name: 'Part Time', code: 'PT', description: 'Flexible schedule', active: true, created_at: nowIso() },
      { id: 'type_seasonal', name: 'Seasonal', code: 'SE', description: 'Seasonal contract', active: true, created_at: nowIso() },
    ],
    job_listings: [
      {
        id: 'job_head_bartender',
        title: 'Head Bartender',
        description: 'Lead cocktail program execution and bar team development.',
        requirements: '3+ years high-volume craft cocktail experience',
        salary_range: '$70k - $85k',
        location: 'Santa Monica, CA',
        is_featured: true,
        active: true,
        department_id: 'dept_bar',
        job_type_id: 'type_full_time',
        created_at: nowIso(),
      },
      {
        id: 'job_line_cook',
        title: 'Line Cook',
        description: 'Execute service with precision and consistency.',
        requirements: '2+ years fine dining prep and line experience',
        salary_range: '$24 - $30/hr',
        location: 'Santa Monica, CA',
        is_featured: false,
        active: true,
        department_id: 'dept_kitchen',
        job_type_id: 'type_full_time',
        created_at: nowIso(),
      },
    ],
    job_applications: [],
    investor_submissions: [],
    image_categories: [
      { id: 'img_cat_food', name: 'Cuisine', description: 'Food photography', active: true, created_at: nowIso() },
      { id: 'img_cat_drinks', name: 'Cocktails', description: 'Drink photography', active: true, created_at: nowIso() },
      { id: 'img_cat_space', name: 'Venue', description: 'Interior and ambiance', active: true, created_at: nowIso() },
    ],
    images: [],
    image_metadata: [],
    admin_roles: [
      { id: 'role_owner', name: 'Owner', description: 'Full BOH access', created_at: nowIso() },
      { id: 'role_manager', name: 'Manager', description: 'Operational BOH access', created_at: nowIso() },
    ],
    admin_permissions: [],
    admin_role_permissions: [],
    admin_user_roles: [
      {
        id: 'aur_owner',
        user_id: 'admin_local_owner',
        role_id: 'role_owner',
        created_at: nowIso(),
      },
    ],
  };
};

const defaultUsers = () => [
  {
    id: 'admin_local_owner',
    email: DEFAULT_ADMIN_EMAIL,
    password: DEFAULT_ADMIN_PASSWORD,
    created_at: nowIso(),
  },
];

const storageAvailable = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const loadJson = (key: string, fallbackFactory: () => any) => {
  if (!storageAvailable()) {
    return fallbackFactory();
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      const value = fallbackFactory();
      window.localStorage.setItem(key, JSON.stringify(value));
      return value;
    }
    return JSON.parse(raw);
  } catch {
    const value = fallbackFactory();
    window.localStorage.setItem(key, JSON.stringify(value));
    return value;
  }
};

const persistJson = (key: string, value: any) => {
  if (!storageAvailable()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

class LocalStore {
  db: PlainObject;
  users: PlainObject[];
  session: PlainObject | null;
  files: PlainObject;

  constructor() {
    this.db = loadJson(DB_KEY, buildDefaultDb);
    this.users = loadJson(USERS_KEY, defaultUsers);
    this.session = loadJson(SESSION_KEY, () => null);
    this.files = loadJson(FILES_KEY, () => ({}));
  }

  saveDb() {
    persistJson(DB_KEY, this.db);
  }

  saveUsers() {
    persistJson(USERS_KEY, this.users);
  }

  saveSession() {
    persistJson(SESSION_KEY, this.session);
  }

  saveFiles() {
    persistJson(FILES_KEY, this.files);
  }

  table(tableName: string): PlainObject[] {
    if (!this.db[tableName]) {
      this.db[tableName] = [];
      this.saveDb();
    }
    return this.db[tableName];
  }
}

const parseRelationDescriptors = (selection: string) => {
  const descriptors: PlainObject[] = [];
  const relationRegex = /(\w+)\s*:\s*([a-zA-Z_][\w]*)\s*\(([^()]+)\)/g;

  let match: RegExpExecArray | null;
  while (true) {
    match = relationRegex.exec(selection);
    if (!match) break;

    descriptors.push({
      alias: match[1],
      token: match[2],
      fields: match[3]
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    });
  }

  return descriptors;
};

const inferRelatedTable = (alias: string, token: string, row: PlainObject) => {
  if (token.endsWith('_id')) {
    return FK_TABLE_MAP[token] || `${token.replace(/_id$/, '')}s`;
  }

  if (row[token]) {
    return token;
  }

  if (ALIAS_TABLE_MAP[alias]) {
    return ALIAS_TABLE_MAP[alias];
  }

  return token;
};

const inferForeignKey = (alias: string, token: string, row: PlainObject) => {
  if (token.endsWith('_id')) {
    return token;
  }

  const candidates = [`${alias}_id`, `${token.replace(/s$/, '')}_id`, `${token}_id`];
  return candidates.find((candidate) => Object.prototype.hasOwnProperty.call(row, candidate));
};

const pickFields = (row: PlainObject, fields: string[]) => {
  if (fields.length === 1 && fields[0] === '*') {
    return clone(row);
  }

  const picked: PlainObject = {};
  fields.forEach((field) => {
    if (field in row) {
      picked[field] = row[field];
    }
  });
  return picked;
};

const applyRelations = (rows: PlainObject[], selection: string | undefined, store: LocalStore) => {
  if (!selection) return rows;
  const descriptors = parseRelationDescriptors(selection);
  if (!descriptors.length) return rows;

  return rows.map((row) => {
    const hydrated = { ...row };

    descriptors.forEach((descriptor) => {
      const relatedTableName = inferRelatedTable(descriptor.alias, descriptor.token, row);
      const foreignKey = inferForeignKey(descriptor.alias, descriptor.token, row);
      const relatedTable = store.table(relatedTableName);

      if (!foreignKey) {
        hydrated[descriptor.alias] = null;
        return;
      }

      const foreignValue = row[foreignKey];
      const relatedRow = relatedTable.find((candidate) => candidate.id === foreignValue);
      hydrated[descriptor.alias] = relatedRow ? pickFields(relatedRow, descriptor.fields) : null;
    });

    return hydrated;
  });
};

const normalizeRecord = (record: PlainObject, tableName: string): PlainObject => {
  const normalized = { ...record };

  if (!normalized.id) {
    normalized.id = createId(slug(tableName));
  }

  if (!normalized.created_at) {
    normalized.created_at = nowIso();
  }

  normalized.updated_at = nowIso();

  return normalized;
};

class LocalQueryBuilder {
  store: LocalStore;
  tableName: string;
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
  selection: string | undefined;
  payload: PlainObject[] | PlainObject | null;
  filters: Array<{ column: string; value: any }>;
  orderBy: Array<{ column: string; ascending: boolean }>;
  singleResult: boolean;
  returnData: boolean;

  constructor(store: LocalStore, tableName: string) {
    this.store = store;
    this.tableName = tableName;
    this.operation = 'select';
    this.selection = undefined;
    this.payload = null;
    this.filters = [];
    this.orderBy = [];
    this.singleResult = false;
    this.returnData = true;
  }

  select(selection = '*') {
    this.selection = selection;
    this.returnData = true;
    return this;
  }

  insert(payload: PlainObject[] | PlainObject) {
    this.operation = 'insert';
    this.payload = payload;
    this.returnData = false;
    return this;
  }

  update(payload: PlainObject) {
    this.operation = 'update';
    this.payload = payload;
    this.returnData = false;
    return this;
  }

  delete() {
    this.operation = 'delete';
    this.payload = null;
    this.returnData = false;
    return this;
  }

  upsert(payload: PlainObject[] | PlainObject) {
    this.operation = 'upsert';
    this.payload = payload;
    this.returnData = false;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  then(onFulfilled: (value: any) => any, onRejected?: (reason: any) => any) {
    return this.execute().then(onFulfilled, onRejected);
  }

  catch(onRejected: (reason: any) => any) {
    return this.execute().catch(onRejected);
  }

  finally(onFinally: () => void) {
    return this.execute().finally(onFinally);
  }

  applyFilters(rows: PlainObject[]) {
    if (!this.filters.length) return rows;

    return rows.filter((row) =>
      this.filters.every(({ column, value }) => {
        if (!(column in row)) {
          return false;
        }
        return row[column] === value;
      }),
    );
  }

  applyOrder(rows: PlainObject[]) {
    if (!this.orderBy.length) return rows;

    const ordered = [...rows];
    ordered.sort((a, b) => {
      for (const rule of this.orderBy) {
        const aVal = a[rule.column];
        const bVal = b[rule.column];

        if (aVal === bVal) continue;
        if (aVal == null) return rule.ascending ? 1 : -1;
        if (bVal == null) return rule.ascending ? -1 : 1;

        if (aVal < bVal) return rule.ascending ? -1 : 1;
        if (aVal > bVal) return rule.ascending ? 1 : -1;
      }

      return 0;
    });

    return ordered;
  }

  createPayloadArray() {
    if (Array.isArray(this.payload)) {
      return this.payload;
    }
    if (this.payload) {
      return [this.payload];
    }
    return [];
  }

  async executeSelect() {
    const sourceRows = this.store.table(this.tableName);
    const filtered = this.applyFilters(sourceRows);
    const ordered = this.applyOrder(filtered);
    const rows = applyRelations(clone(ordered), this.selection, this.store);

    if (this.singleResult) {
      return {
        data: rows[0] || null,
        error: null,
      };
    }

    return {
      data: rows,
      error: null,
    };
  }

  async executeInsert() {
    const payloadRows = this.createPayloadArray();
    const table = this.store.table(this.tableName);

    const insertedRows = payloadRows.map((row) => {
      const normalized = normalizeRecord(row, this.tableName);
      table.push(normalized);
      return normalized;
    });

    this.store.saveDb();

    const data = this.returnData ? clone(insertedRows) : null;
    return {
      data: this.singleResult ? data?.[0] || null : data,
      error: null,
    };
  }

  async executeUpdate() {
    const table = this.store.table(this.tableName);
    const updateValues = this.payload || {};

    const updatedRows: PlainObject[] = [];
    table.forEach((row, index) => {
      const matches = this.filters.every(({ column, value }) => row[column] === value);
      if (!matches) return;

      const nextRow = {
        ...row,
        ...updateValues,
        updated_at: nowIso(),
      };

      table[index] = nextRow;
      updatedRows.push(nextRow);
    });

    this.store.saveDb();

    const data = this.returnData ? clone(updatedRows) : null;
    return {
      data: this.singleResult ? data?.[0] || null : data,
      error: null,
    };
  }

  async executeDelete() {
    const table = this.store.table(this.tableName);
    const deletedRows: PlainObject[] = [];

    const keep = table.filter((row) => {
      const matches = this.filters.every(({ column, value }) => row[column] === value);
      if (matches) {
        deletedRows.push(row);
        return false;
      }
      return true;
    });

    this.store.db[this.tableName] = keep;
    this.store.saveDb();

    const data = this.returnData ? clone(deletedRows) : null;
    return {
      data: this.singleResult ? data?.[0] || null : data,
      error: null,
    };
  }

  async executeUpsert() {
    const payloadRows = this.createPayloadArray();
    const table = this.store.table(this.tableName);
    const touchedRows: PlainObject[] = [];

    payloadRows.forEach((payloadRow) => {
      const normalized = normalizeRecord(payloadRow, this.tableName);
      const index = table.findIndex((candidate) => candidate.id === normalized.id);

      if (index >= 0) {
        table[index] = {
          ...table[index],
          ...normalized,
          updated_at: nowIso(),
        };
        touchedRows.push(table[index]);
        return;
      }

      table.push(normalized);
      touchedRows.push(normalized);
    });

    this.store.saveDb();

    const data = this.returnData ? clone(touchedRows) : null;
    return {
      data: this.singleResult ? data?.[0] || null : data,
      error: null,
    };
  }

  async execute() {
    try {
      switch (this.operation) {
        case 'insert':
          return await this.executeInsert();
        case 'update':
          return await this.executeUpdate();
        case 'delete':
          return await this.executeDelete();
        case 'upsert':
          return await this.executeUpsert();
        case 'select':
        default:
          return await this.executeSelect();
      }
    } catch (error: any) {
      return {
        data: null,
        error: {
          message: error?.message || 'Local data layer error',
        },
      };
    }
  }
}

const toSessionPayload = (user: PlainObject | null) => {
  if (!user) return null;
  return {
    access_token: `local-${user.id}`,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
    },
  };
};

class LocalAuth {
  store: LocalStore;

  constructor(store: LocalStore) {
    this.store = store;
  }

  async getSession() {
    return {
      data: {
        session: this.store.session,
      },
      error: null,
    };
  }

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const user = this.store.users.find(
      (candidate) =>
        candidate.email.toLowerCase() === String(email || '').toLowerCase() &&
        candidate.password === password,
    );

    if (!user) {
      return {
        data: {
          user: null,
          session: null,
        },
        error: {
          message: 'Invalid login credentials',
        },
      };
    }

    const session = toSessionPayload(user);
    this.store.session = session;
    this.store.saveSession();

    return {
      data: {
        user: session.user,
        session,
      },
      error: null,
    };
  }

  async signOut() {
    this.store.session = null;
    this.store.saveSession();

    return {
      error: null,
    };
  }

  async updateUser(attributes: { email?: string; password?: string }) {
    const activeSession = this.store.session;
    if (!activeSession?.user?.id) {
      return {
        data: { user: null },
        error: {
          message: 'No active user session',
        },
      };
    }

    const index = this.store.users.findIndex((candidate) => candidate.id === activeSession.user.id);
    if (index < 0) {
      return {
        data: { user: null },
        error: {
          message: 'Current user not found',
        },
      };
    }

    const updated = {
      ...this.store.users[index],
      ...attributes,
      updated_at: nowIso(),
    };

    this.store.users[index] = updated;
    this.store.saveUsers();

    this.store.session = toSessionPayload(updated);
    this.store.saveSession();

    return {
      data: {
        user: this.store.session.user,
      },
      error: null,
    };
  }

  admin = {
    createUser: async ({ email, password }: { email: string; password: string }) => {
      const existing = this.store.users.find(
        (candidate) => candidate.email.toLowerCase() === String(email || '').toLowerCase(),
      );

      if (existing) {
        return {
          data: { user: null },
          error: {
            message: 'User already registered',
          },
        };
      }

      const user = {
        id: createId('user'),
        email,
        password,
        created_at: nowIso(),
      };

      this.store.users.push(user);
      this.store.saveUsers();

      return {
        data: {
          user: {
            id: user.id,
            email: user.email,
          },
        },
        error: null,
      };
    },

    deleteUser: async (userId: string) => {
      const before = this.store.users.length;
      this.store.users = this.store.users.filter((candidate) => candidate.id !== userId);
      this.store.saveUsers();

      if (this.store.db.admin_user_roles) {
        this.store.db.admin_user_roles = this.store.db.admin_user_roles.filter(
          (role: PlainObject) => role.user_id !== userId,
        );
        this.store.saveDb();
      }

      if (this.store.session?.user?.id === userId) {
        this.store.session = null;
        this.store.saveSession();
      }

      if (before === this.store.users.length) {
        return {
          error: {
            message: 'User not found',
          },
        };
      }

      return {
        error: null,
      };
    },
  };
}

const readAsDataUrl = async (file: File | Blob): Promise<string> => {
  if (typeof FileReader === 'undefined') {
    return '';
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
};

class LocalStorageBucket {
  store: LocalStore;
  bucket: string;

  constructor(store: LocalStore, bucket: string) {
    this.store = store;
    this.bucket = bucket;
  }

  async upload(path: string, file: File | Blob, options?: { onUploadProgress?: (arg: { loaded: number; total: number }) => void }) {
    const bucketFiles = this.store.files[this.bucket] || {};

    let dataUrl = '';
    if (typeof Blob !== 'undefined' && file instanceof Blob) {
      dataUrl = await readAsDataUrl(file);
      if (options?.onUploadProgress) {
        options.onUploadProgress({
          loaded: file.size,
          total: file.size,
        });
      }
    }

    bucketFiles[path] = {
      name: path,
      data_url: dataUrl,
      size: typeof file === 'object' && 'size' in file ? file.size : 0,
      updated_at: nowIso(),
    };

    this.store.files[this.bucket] = bucketFiles;
    this.store.saveFiles();

    return {
      data: {
        path,
        id: path,
        fullPath: `${this.bucket}/${path}`,
      },
      error: null,
    };
  }

  list(prefix = '') {
    const bucketFiles = this.store.files[this.bucket] || {};
    const rows = Object.values(bucketFiles)
      .filter((file: PlainObject) => file.name.startsWith(prefix))
      .sort((a: PlainObject, b: PlainObject) => a.name.localeCompare(b.name))
      .map((file: PlainObject) => ({
        name: file.name,
        id: file.name,
        updated_at: file.updated_at,
      }));

    return {
      data: rows,
      error: null,
    };
  }

  remove(paths: string[]) {
    const bucketFiles = this.store.files[this.bucket] || {};
    paths.forEach((path) => {
      delete bucketFiles[path];
    });

    this.store.files[this.bucket] = bucketFiles;
    this.store.saveFiles();

    return {
      data: null,
      error: null,
    };
  }

  getPublicUrl(path: string) {
    const bucketFiles = this.store.files[this.bucket] || {};
    const file = bucketFiles[path];

    return {
      data: {
        publicUrl:
          file?.data_url ||
          `https://placehold.co/1200x800/e2f2f4/0f4c5c?text=${encodeURIComponent(path)}`,
      },
    };
  }
}

class LocalStorageApi {
  store: LocalStore;

  constructor(store: LocalStore) {
    this.store = store;
  }

  from(bucket: string) {
    return new LocalStorageBucket(this.store, bucket);
  }
}

class LocalSupabaseClient {
  store: LocalStore;
  auth: LocalAuth;
  storage: LocalStorageApi;

  constructor(store: LocalStore) {
    this.store = store;
    this.auth = new LocalAuth(store);
    this.storage = new LocalStorageApi(store);
  }

  from(tableName: string) {
    return new LocalQueryBuilder(this.store, tableName);
  }
}

const singletonStore = new LocalStore();

export const createLocalSupabaseClient = () => new LocalSupabaseClient(singletonStore);
export const localAdminDefaults = {
  email: DEFAULT_ADMIN_EMAIL,
  password: DEFAULT_ADMIN_PASSWORD,
};
