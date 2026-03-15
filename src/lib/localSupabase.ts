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

const CODA_BEVERAGE_IMPORT = [
  {
    name: 'Plumed Paradise Pina Colada',
    description: 'Indulge in a taste of paradise with this luscious, frothy cocktail, a tropical symphony that dances on the palate, inviting you to spread your wings in a vibrant haven.',
    price: 18,
    alcohol_content: 2,
    non_alcoholic: false,
    ingredients: ['Bacardi Superior', 'Pineapple Juice', 'Coconut Cream'],
    spirit_category: 'RUM',
    flight: 'Tropical Fruit Adventure',
  },
  {
    name: 'Chirping Chi Chi',
    description: 'Embark on a tranquil escape with this playful twist on the classic, where every sip sings a melody of tropical bliss, whisking you away to a serene paradise.',
    price: 18,
    alcohol_content: 2,
    non_alcoholic: false,
    ingredients: ["Tito's Handmade Vodka", 'Coconut Cream', 'Pineapple Juice'],
    spirit_category: 'VODKA',
    flight: null,
  },
  {
    name: 'Coral Canopy Reef',
    description: 'Delve into oceanic paradise with this visually stunning cocktail, a harmonious blend that mirrors the serene beauty and bright hues of a coral reef.',
    price: 18,
    alcohol_content: 2,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: 'Tropical Fruit Adventure',
  },
  {
    name: 'Molten Sunset Lava Flow',
    description: 'Witness a tropical sunset in a glass with this captivating cocktail, where the fiery blend of strawberry, pineapple, and coconut creates a mesmerizing lava flow effect.',
    price: 18,
    alcohol_content: 2,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Sapphire Skies Blue Hawaii',
    description: 'Immerse yourself in the splendor of a tropical daydream, a cocktail that captures the essence of cloudless, sapphire skies and sun-kissed shores.',
    price: 20,
    alcohol_content: 3,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: 'Tropical Fruit Adventure',
  },
  {
    name: 'Soothing Sanctuary Painkiller',
    description: 'Embark on a serene journey to tropical bliss with this enchanting cocktail, offering a delicate balance of warmth and sweetness, perfect for a tranquil escape from the everyday.',
    price: 20,
    alcohol_content: 3,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Aloha Spirit Mai Tai',
    description: 'Savor the sunset and dance with the waves with this blissful cocktail, an embodiment of the Hawaiian spirit and island paradise.',
    price: 20,
    alcohol_content: 3,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: 'Tiki Classic Flight',
  },
  {
    name: 'Island Rendezvous Bahama Mama',
    description: 'Embark on a sun-drenched journey with this vibrant cocktail, a blissful blend of island flavors that celebrates the spirited essence of tropical life.',
    price: 20,
    alcohol_content: 3,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Break The Storm Hurricane',
    description: "Embrace the exhilaration of a tropical tempest with this vibrant and bold cocktail, a daring blend that captures the essence of a storm's untamed beauty.",
    price: 20,
    alcohol_content: 3,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: "Trader Vic's Mai Tai",
    description: 'Indulge in the ultimate embodiment of island elegance with this enchanting cocktail, a symphony of flavors that whisk you away to sandy beaches and sun-kissed shores.',
    price: 20,
    alcohol_content: 3,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Feathered Frenzy Zombie',
    description: 'Surrender to the call of the wild with this audacious, complex cocktail, a tropical storm in a glass that tantalizes the senses and awakens the spirit.',
    price: 22,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: 'Tiki Classic Flight',
  },
  {
    name: "Talon's Tango Scorpion",
    description: "A daring dance of flavors, this cocktail tempts with a mysterious blend, inviting you to embrace the wild thrill of nature's untamed spirit.",
    price: 22,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Rum Ripples Rum Runner',
    description: 'Embark on a flavorful odyssey with this spirited blend, an adventure of sun-kissed sweetness and refreshing zest, perfect for the high seas explorer.',
    price: 22,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Tropic Wings Singapore Sling',
    description: 'Embark on a sensory journey with this enchanting blend, evoking distant tropical horizons and a blush of sunset in every sip.',
    price: 22,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'GIN',
    flight: 'Tiki Classic Flight',
  },
  {
    name: 'Jungle Plumage Bird',
    description: 'Dive into a vivid and adventurous cocktail that brings the lush, vibrant essence of the jungle to life, complete with a mysterious hint of the exotic.',
    price: 22,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: 'Spoonbill Signature',
  },
  {
    name: "Flamingo's Fancy Planter's Punch",
    description: 'Celebrate tropical sophistication with this vibrant, whimsical cocktail, embodying the grace of a flamingo with its flamboyant hue and lively citrus notes. Enhanced with a splash of potent overproof rum to elevate the tropical experience to new heights of indulgence',
    price: 24,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: 'Spoonbill Signature',
  },
  {
    name: 'Opulent Oasis Pearl Diver',
    description: 'Experience a journey into sophisticated relaxation with this exquisite cocktail, blending select rums and delicate flavors for a truly opulent escape.',
    price: 24,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: 'Spoonbill Signature',
  },
  {
    name: 'Shark Beak Bay Shark Bite',
    description: "Embark on a vivid ocean adventure with this audacious cocktail, a tribute to the deep's mysteries with its bold flavors and dramatic 'bleeding' effect. Crowned with a dark rum float, this drink takes a fierce bite with its enhanced potency, perfect for those who like to swim in deeper waters.",
    price: 24,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Nautical Nest Navy Grog',
    description: 'Set sail on a bold seafaring adventure with this hearty cocktail, a tribute to maritime explorers with its robust blend of rums and zesty citrus flavors.',
    price: 24,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Enchanted Canopy Fog Cutter',
    description: 'Lose yourself in the magic of the tropical wilderness with this complex and intriguing cocktail, a symphony of potent spirits and citrus, topped with a haze-like sherry float.',
    price: 24,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Mystic Jungle Bowl',
    description: 'Embark on a flavor expedition with layers of passion fruit and citrus, crowned by a cinnamon flare.',
    price: 60,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Volcanic Spirit Bowl',
    description: 'Experience an eruption of tropical flavors with a smoky grenadine finish like flowing lava.',
    price: 60,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: "Siren's Serenade Bowl",
    description: "Be enchanted by this melody of sweet and citrus notes, as enchanting as a siren's call.",
    price: 60,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: "Navigator's Grog Bowl",
    description: 'Navigate through a sea of flavors, from the sweetness of the tropics to a hint of spice.',
    price: 60,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: "Islander's Sunset Bowl",
    description: 'Set sail towards the horizon with this vibrant blend, where the warmth of the Island sun meets the coolness of the evening tide.',
    price: 60,
    alcohol_content: 4,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Crimson Tide Bowl',
    description: "Set sail on bold flavors with a cocktail that's as deep and daring as the crimson tide.",
    price: 70,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'BOURBON',
    flight: null,
  },
  {
    name: "Pirate's Bounty Bowl",
    description: "Plunder the depths of flavor with a robust bowl fit for a captain's toast.",
    price: 70,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: 'Typhoon Treasure Bowl',
    description: "Brace for a storm of flavors with a mix that's as tempestuous as it is tantalizing.",
    price: 70,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: "Empire's Eclipse Bowl",
    description: "Conquer the night with a cocktail that's as mysterious as an eclipse with a burst of citrus flame.",
    price: 70,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
  {
    name: "Islander's Sunset Bowl",
    description: 'Set sail towards the horizon with this vibrant blend, where the warmth of the island sun meets the coolness of the evening tide.',
    price: 70,
    alcohol_content: 5,
    non_alcoholic: false,
    ingredients: [],
    spirit_category: 'RUM',
    flight: null,
  },
] as const;

const seedMenu = () => {
  const categories = [
    { id: 'cat_cocktails', name: 'Cocktails', menu_type: 'drinks', display_order: 1, parent_id: null, active: true },
    { id: 'cat_spirits', name: 'Spirits', menu_type: 'drinks', display_order: 2, parent_id: null, active: true },
    { id: 'cat_cuisine', name: 'Cuisine', menu_type: 'food', display_order: 1, parent_id: null, active: true },
    { id: 'cat_signature', name: 'Signature', menu_type: 'drinks', display_order: 1, parent_id: 'cat_cocktails', active: true },
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
        image_url: 'https://raw.githubusercontent.com/CAJustise/the-spoonbill/main/public/images/library/misc/mixologyclass.png',
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
        image_url: 'https://raw.githubusercontent.com/CAJustise/the-spoonbill/main/public/images/library/misc/tiki-noir.png',
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
        requirements: [
          '3+ years high-volume craft cocktail experience',
          'Strong leadership and mentorship ability',
          'Comfortable with inventory and cost controls',
        ],
        benefits: [
          'Health benefits',
          'Dining discounts',
          'Performance bonuses',
        ],
        salary_min: 70000,
        salary_max: 85000,
        salary_type: 'yearly',
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
        requirements: [
          '2+ years fine dining prep and line experience',
          'Knife skills and station discipline',
          'Ability to maintain pace during peak service',
        ],
        benefits: [
          'Health benefits',
          'Daily staff meal',
          'Growth pathway to sous chef',
        ],
        salary_min: 24,
        salary_max: 30,
        salary_type: 'hourly',
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

const splitToList = (value: any) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|;/g)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const parseSalaryRange = (rawSalaryRange: any) => {
  if (typeof rawSalaryRange !== 'string' || !rawSalaryRange.trim()) {
    return {
      salary_min: null,
      salary_max: null,
      salary_type: null,
    };
  }

  const normalized = rawSalaryRange.toLowerCase();
  const numberMatches = Array.from(normalized.matchAll(/(\d+(?:\.\d+)?)\s*(k)?/g));

  const values = numberMatches
    .map((match) => {
      const numeric = Number.parseFloat(match[1]);
      if (!Number.isFinite(numeric)) return null;
      return match[2] ? numeric * 1000 : numeric;
    })
    .filter((value): value is number => value !== null);

  const salaryType = /\/\s*hr|hour/.test(normalized)
    ? 'hourly'
    : /\/\s*year|year|k/.test(normalized)
      ? 'yearly'
      : null;

  return {
    salary_min: values[0] ?? null,
    salary_max: values[1] ?? null,
    salary_type: salaryType,
  };
};

const normalizeDrinkName = (value: string) => value.replace(/\s+/g, ' ').trim();

const normalizeDrinkKey = (name: string, price: number | null | undefined) =>
  `${normalizeDrinkName(name).toLowerCase()}|${price ?? ''}`;

const CODA_SIGNATURE_DRINKS = new Set([
  'Aloha Spirit Mai Tai',
  'Feathered Frenzy Zombie',
  "Flamingo's Fancy Planter's Punch",
]);

const CODA_HAPPY_HOUR_DRINKS = new Set([
  'Aloha Spirit Mai Tai',
  'Chirping Chi Chi',
  'Plumed Paradise Pina Colada',
  'Sapphire Skies Blue Hawaii',
]);

const CODA_FLIGHT_OFFERINGS = [
  {
    name: 'Tiki Classic',
    price: 45,
    description:
      'Aloha Spirit Mai Tai, Feathered Frenzy Zombie, and Tropic Wings Singapore Sling.',
    ingredients: ['Aloha Spirit Mai Tai', 'Feathered Frenzy Zombie', 'Tropic Wings Singapore Sling'],
  },
  {
    name: 'Tropical Fruit Adventure',
    price: 50,
    description:
      'Coral Canopy Reef, Plumed Paradise Pina Colada, and Sapphire Skies Blue Hawaii.',
    ingredients: ['Coral Canopy Reef', 'Plumed Paradise Pina Colada', 'Sapphire Skies Blue Hawaii'],
  },
  {
    name: 'Spoonbill Signature',
    price: 55,
    description:
      "Flamingo's Fancy Planter's Punch, Jungle Plumage Bird, and Opulent Oasis Pearl Diver.",
    ingredients: ["Flamingo's Fancy Planter's Punch", 'Jungle Plumage Bird', 'Opulent Oasis Pearl Diver'],
  },
] as const;

const CODA_ZERO_PROOF_ADDITIONS = [
  {
    name: 'Boylan Bottled Cane Colas',
    price: 5,
    description: 'Root Beer, Cane Cola, Ginger Ale, Cream Soda, Black Cherry.',
    ingredients: ['Root Beer', 'Cane Cola', 'Ginger Ale', 'Cream Soda', 'Black Cherry'],
  },
] as const;

const ensureCodaBeverageImport = (db: PlainObject) => {
  if (!Array.isArray(db.menu_categories) || !Array.isArray(db.menu_items)) {
    return false;
  }

  let changed = false;
  const now = nowIso();
  const categories = db.menu_categories as PlainObject[];
  const items = db.menu_items as PlainObject[];

  const ensureCategory = (config: {
    id: string;
    name: string;
    parent_id: string | null;
    display_order: number;
  }) => {
    let category =
      categories.find((entry) => entry.id === config.id) ||
      categories.find((entry) => entry.menu_type === 'drinks' && entry.name === config.name);

    if (!category) {
      category = {
        id: config.id,
        name: config.name,
        menu_type: 'drinks',
        display_order: config.display_order,
        parent_id: config.parent_id,
        active: true,
        created_at: now,
        updated_at: now,
      };
      categories.push(category);
      changed = true;
      return category.id;
    }

    if (category.menu_type !== 'drinks') {
      category.menu_type = 'drinks';
      changed = true;
    }
    if (category.name !== config.name) {
      category.name = config.name;
      changed = true;
    }
    if (category.parent_id !== config.parent_id) {
      category.parent_id = config.parent_id;
      changed = true;
    }
    if (category.display_order !== config.display_order) {
      category.display_order = config.display_order;
      changed = true;
    }
    if (category.active !== true) {
      category.active = true;
      changed = true;
    }
    if (!category.created_at) {
      category.created_at = now;
      changed = true;
    }
    if (!category.updated_at) {
      category.updated_at = now;
      changed = true;
    }

    return category.id;
  };

  const cocktailsCategoryId = ensureCategory({
    id: 'cat_cocktails',
    name: 'Cocktails',
    parent_id: null,
    display_order: 1,
  });
  const signatureCategoryId = ensureCategory({
    id: 'cat_signature',
    name: 'Signature',
    parent_id: cocktailsCategoryId,
    display_order: 1,
  });
  const happyHourCategoryId = ensureCategory({
    id: 'cat_happy_hour',
    name: 'Happy Hour',
    parent_id: cocktailsCategoryId,
    display_order: 2,
  });
  const flightsCategoryId = ensureCategory({
    id: 'cat_flights',
    name: 'Flights',
    parent_id: cocktailsCategoryId,
    display_order: 3,
  });
  const classicsCategoryId = ensureCategory({
    id: 'cat_classics',
    name: 'Classic',
    parent_id: cocktailsCategoryId,
    display_order: 4,
  });
  const zeroProofCategoryId = ensureCategory({
    id: 'cat_zero_proof',
    name: 'Zero Proof',
    parent_id: cocktailsCategoryId,
    display_order: 5,
  });

  const legacyCategoryTargets: Record<string, string> = {
    'Signature Cocktails': signatureCategoryId,
    'Happy Hour Specials': happyHourCategoryId,
    'Cocktail Flights': flightsCategoryId,
    'Classic Cocktails': classicsCategoryId,
  };

  for (const category of categories) {
    if (category.menu_type !== 'drinks') continue;
    const targetCategoryId = legacyCategoryTargets[category.name];
    if (!targetCategoryId || category.id === targetCategoryId) continue;

    for (const item of items) {
      if (item.category_id === category.id) {
        item.category_id = targetCategoryId;
        item.updated_at = now;
        changed = true;
      }
    }

    if (category.active !== false) {
      category.active = false;
      category.updated_at = now;
      changed = true;
    }
  }

  const existingDrinkByKey = new Map<string, PlainObject>();
  const existingDrinksByName = new Map<string, PlainObject[]>();
  items
    .filter((item) => item.menu_type === 'drinks')
    .forEach((item) => {
      const name = typeof item.name === 'string' ? normalizeDrinkName(item.name) : '';
      const key = normalizeDrinkKey(name, item.price);
      if (!existingDrinkByKey.has(key)) {
        existingDrinkByKey.set(key, item);
      }
      const nameKey = name.toLowerCase();
      const list = existingDrinksByName.get(nameKey) || [];
      list.push(item);
      existingDrinksByName.set(nameKey, list);
    });

  for (const imported of CODA_BEVERAGE_IMPORT) {
    const name = normalizeDrinkName(imported.name);
    const price = Number(imported.price);
    const alcoholContent = Number.isFinite(imported.alcohol_content) ? imported.alcohol_content : null;
    const description = imported.description ? imported.description.trim() : null;
    const ingredients = imported.ingredients
      .map((ingredient) => normalizeDrinkName(ingredient))
      .filter(Boolean);
    const isSignature = CODA_SIGNATURE_DRINKS.has(name);
    const isHappyHour = CODA_HAPPY_HOUR_DRINKS.has(name);
    const flightGroup = imported.flight ? normalizeDrinkName(imported.flight) : null;

    const categoryId = imported.non_alcoholic
      ? zeroProofCategoryId
      : isHappyHour
        ? happyHourCategoryId
        : isSignature
          ? signatureCategoryId
          : classicsCategoryId;
    const itemKey = normalizeDrinkKey(name, price);
    let existing = existingDrinkByKey.get(itemKey);
    if (!existing) {
      const sameNameItems = existingDrinksByName.get(name.toLowerCase()) || [];
      if (sameNameItems.length === 1) {
        existing = sameNameItems[0];
      }
    }

    if (!existing) {
      items.push({
        id: `item_${slug(`${name}-${price}`)}`,
        name,
        description,
        price,
        bottle_price: null,
        image_url: null,
        menu_type: 'drinks',
        show_price: true,
        show_description: true,
        active: true,
        ingredients,
        alcohol_content: alcoholContent,
        garnish: null,
        category_id: categoryId,
        coda_signature: isSignature,
        coda_happy_hour: isHappyHour,
        coda_flight_group: flightGroup,
        allergens: null,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        created_at: now,
        updated_at: now,
      });
      changed = true;
      continue;
    }

    // Keep BOH edits intact for existing records; only fill missing essentials.
    let itemChanged = false;
    const ensureField = (field: string, value: any) => {
      const current = existing[field];
      if (current === undefined || current === null || current === '') {
        existing[field] = value;
        itemChanged = true;
      }
    };

    ensureField('name', name);
    ensureField('description', description);
    ensureField('price', price);
    ensureField('menu_type', 'drinks');
    ensureField('show_price', true);
    ensureField('show_description', true);
    ensureField('active', true);
    ensureField('ingredients', ingredients);
    ensureField('alcohol_content', alcoholContent);
    ensureField('category_id', categoryId);
    ensureField('coda_signature', isSignature);
    ensureField('coda_happy_hour', isHappyHour);
    ensureField('coda_flight_group', flightGroup);

    if (!existing.created_at) {
      existing.created_at = now;
      itemChanged = true;
    }
    if (itemChanged) {
      existing.updated_at = now;
      changed = true;
    }
  }

  const upsertCuratedDrink = (config: {
    name: string;
    description: string | null;
    price: number;
    category_id: string;
    ingredients: string[];
    alcohol_content: number | null;
    coda_signature: boolean;
    coda_happy_hour: boolean;
    coda_flight_group: string | null;
  }) => {
    const name = normalizeDrinkName(config.name);
    const key = normalizeDrinkKey(name, config.price);

    let existing = items.find((item) => {
      if (item.menu_type !== 'drinks') return false;
      const itemName = typeof item.name === 'string' ? normalizeDrinkName(item.name) : '';
      return normalizeDrinkKey(itemName, item.price) === key;
    });
    if (!existing) {
      existing = items.find((item) => {
        if (item.menu_type !== 'drinks') return false;
        const itemName = typeof item.name === 'string' ? normalizeDrinkName(item.name) : '';
        return itemName.toLowerCase() === name.toLowerCase();
      });
    }

    if (!existing) {
      existing = {
        id: `item_${slug(`${name}-${config.price}`)}`,
        name,
        description: config.description,
        price: config.price,
        bottle_price: null,
        image_url: null,
        menu_type: 'drinks',
        show_price: true,
        show_description: true,
        active: true,
        ingredients: config.ingredients,
        alcohol_content: config.alcohol_content,
        garnish: null,
        category_id: config.category_id,
        coda_signature: config.coda_signature,
        coda_happy_hour: config.coda_happy_hour,
        coda_flight_group: config.coda_flight_group,
        allergens: null,
        is_vegetarian: true,
        is_vegan: true,
        is_gluten_free: true,
        created_at: now,
        updated_at: now,
      };
      items.push(existing);
      changed = true;
      return;
    }

    // Preserve BOH edits (price, lineup, etc.) for curated rows once seeded.
    let itemChanged = false;
    const ensureField = (field: string, value: any) => {
      const current = existing[field];
      if (current === undefined || current === null || current === '') {
        existing[field] = value;
        itemChanged = true;
      }
    };

    ensureField('menu_type', 'drinks');
    ensureField('show_price', true);
    ensureField('show_description', true);
    ensureField('active', true);
    ensureField('category_id', config.category_id);
    ensureField('coda_flight_group', config.coda_flight_group);

    if (!existing.created_at) {
      existing.created_at = now;
      itemChanged = true;
    }
    if (itemChanged) {
      existing.updated_at = now;
      changed = true;
    }
  };

  for (const flight of CODA_FLIGHT_OFFERINGS) {
    upsertCuratedDrink({
      name: flight.name,
      description: flight.description,
      price: flight.price,
      category_id: flightsCategoryId,
      ingredients: flight.ingredients.map((item) => normalizeDrinkName(item)).filter(Boolean),
      alcohol_content: null,
      coda_signature: false,
      coda_happy_hour: false,
      coda_flight_group: normalizeDrinkName(flight.name),
    });
  }

  for (const zeroProof of CODA_ZERO_PROOF_ADDITIONS) {
    upsertCuratedDrink({
      name: zeroProof.name,
      description: zeroProof.description,
      price: zeroProof.price,
      category_id: zeroProofCategoryId,
      ingredients: zeroProof.ingredients.map((item) => normalizeDrinkName(item)).filter(Boolean),
      alcohol_content: 0,
      coda_signature: false,
      coda_happy_hour: false,
      coda_flight_group: null,
    });
  }

  return changed;
};

const migrateDb = (db: PlainObject) => {
  let changed = false;
  const eventImageByTitle: Record<string, string> = {
    'Island Mixology Class': 'https://raw.githubusercontent.com/CAJustise/the-spoonbill/main/public/images/library/misc/mixologyclass.png',
    'Pacific Rim Tasting Night': 'https://raw.githubusercontent.com/CAJustise/the-spoonbill/main/public/images/library/misc/tiki-noir.png',
  };

  if (Array.isArray(db.job_listings)) {
    db.job_listings = db.job_listings.map((job: PlainObject) => {
      const nextJob = { ...job };
      const inferredSalary = parseSalaryRange(nextJob.salary_range);
      const nextRequirements = splitToList(nextJob.requirements);
      const nextBenefits = splitToList(nextJob.benefits);

      if (JSON.stringify(nextJob.requirements ?? null) !== JSON.stringify(nextRequirements)) {
        nextJob.requirements = nextRequirements;
        changed = true;
      }

      if (JSON.stringify(nextJob.benefits ?? null) !== JSON.stringify(nextBenefits)) {
        nextJob.benefits = nextBenefits;
        changed = true;
      }

      if (nextJob.salary_min == null && inferredSalary.salary_min != null) {
        nextJob.salary_min = inferredSalary.salary_min;
        changed = true;
      }

      if (nextJob.salary_max == null && inferredSalary.salary_max != null) {
        nextJob.salary_max = inferredSalary.salary_max;
        changed = true;
      }

      if ((nextJob.salary_type == null || nextJob.salary_type === '') && inferredSalary.salary_type) {
        nextJob.salary_type = inferredSalary.salary_type;
        changed = true;
      }

      if (nextJob.salary_min === undefined) {
        nextJob.salary_min = null;
        changed = true;
      }

      if (nextJob.salary_max === undefined) {
        nextJob.salary_max = null;
        changed = true;
      }

      if (nextJob.salary_type === undefined) {
        nextJob.salary_type = null;
        changed = true;
      }

      return nextJob;
    });
  }

  if (Array.isArray(db.events)) {
    db.events = db.events.map((event: PlainObject) => {
      const nextEvent = { ...event };
      const targetImageUrl = eventImageByTitle[nextEvent.title];

      if (targetImageUrl && nextEvent.image_url !== targetImageUrl) {
        nextEvent.image_url = targetImageUrl;
        changed = true;
      }

      return nextEvent;
    });
  }

  if (ensureCodaBeverageImport(db)) {
    changed = true;
  }

  return { db, changed };
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

    const migration = migrateDb(this.db);
    this.db = migration.db;
    if (migration.changed) {
      this.saveDb();
    }
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
