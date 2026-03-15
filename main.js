(function () {
  const store = window.SpoonbillStore;
  if (!store) return;

  const { loadData, saveData, MENU_CATEGORIES, uid } = store;

  let state = loadData();
  let activeCategory = MENU_CATEGORIES[0];

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindDrawers();
    bindMenuTabs();
    bindForms();
    renderAll();

    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function bindDrawers() {
    const drawers = document.querySelectorAll('.drawer');

    function closeAll() {
      drawers.forEach((drawer) => drawer.classList.remove('active'));
      document.body.classList.remove('drawer-open');
    }

    function openDrawer(id) {
      const target = document.getElementById(id);
      if (!target) return;
      closeAll();
      target.classList.add('active');
      document.body.classList.add('drawer-open');
    }

    document.querySelectorAll('[data-drawer]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const id = link.getAttribute('data-drawer');
        if (!id) return;
        openDrawer(id);
      });
    });

    document.querySelectorAll('.close-btn').forEach((button) => {
      button.addEventListener('click', closeAll);
    });

    drawers.forEach((drawer) => {
      drawer.addEventListener('click', (event) => {
        if (event.target === drawer) closeAll();
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeAll();
    });
  }

  function bindMenuTabs() {
    document.querySelectorAll('.tab-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const category = button.getAttribute('data-category');
        if (!MENU_CATEGORIES.includes(category)) return;

        activeCategory = category;
        document.querySelectorAll('.tab-btn').forEach((item) => {
          item.classList.toggle('active', item === button);
        });

        renderMenu();
      });
    });
  }

  function bindForms() {
    const reservationForm = document.getElementById('reservation-form');
    const classForm = document.getElementById('class-request-form');
    const eventForm = document.getElementById('private-event-form');

    if (reservationForm) {
      reservationForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(reservationForm);

        state.reservations.push({
          id: uid(),
          name: String(formData.get('name') || '').trim(),
          phone: String(formData.get('phone') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          partySize: Number(formData.get('partySize') || 1),
          date: String(formData.get('date') || ''),
          time: String(formData.get('time') || ''),
          notes: String(formData.get('notes') || '').trim(),
          status: 'Pending',
          source: 'Web',
          createdAt: new Date().toISOString(),
        });

        saveData(state);
        reservationForm.reset();
        setFeedback('reservation', 'Reservation request received.');
      });
    }

    if (classForm) {
      classForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(classForm);
        const guests = Number(formData.get('guests') || 1);

        state.classes.push({
          id: uid(),
          title: String(formData.get('classType') || 'Class Request').trim(),
          classType: String(formData.get('classType') || '').trim(),
          instructor: 'TBD',
          date: String(formData.get('date') || ''),
          startTime: '',
          endTime: '',
          capacity: Math.max(guests, 1),
          enrolled: guests,
          price: 0,
          notes: String(formData.get('notes') || '').trim(),
          requesterName: String(formData.get('name') || '').trim(),
          requesterEmail: String(formData.get('email') || '').trim(),
          requesterPhone: String(formData.get('phone') || '').trim(),
          status: 'Requested',
          source: 'Web',
          createdAt: new Date().toISOString(),
        });

        saveData(state);
        classForm.reset();
        setFeedback('class', 'Class request submitted.');
      });
    }

    if (eventForm) {
      eventForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(eventForm);

        state.privateEvents.push({
          id: uid(),
          name: String(formData.get('name') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          phone: String(formData.get('phone') || '').trim(),
          eventType: String(formData.get('eventType') || '').trim(),
          guests: Number(formData.get('guests') || 0),
          date: String(formData.get('date') || ''),
          startTime: String(formData.get('startTime') || ''),
          endTime: '',
          notes: String(formData.get('notes') || '').trim(),
          status: 'Lead',
          source: 'Web',
          createdAt: new Date().toISOString(),
        });

        saveData(state);
        eventForm.reset();
        setFeedback('event', 'Private event inquiry received.');
      });
    }
  }

  function renderAll() {
    state = loadData();
    renderMenu();
    renderContact();
  }

  function renderMenu() {
    const container = document.getElementById('menu-items');
    if (!container) return;

    const items = state.menuItems
      .filter((item) => item.category === activeCategory)
      .filter((item) => item.active !== false)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));

    if (!items.length) {
      container.innerHTML = '<p class="muted">No active items in this category yet.</p>';
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const name = escapeHtml(item.name || 'Untitled');
        const description = escapeHtml(item.description || '');
        const price = Number(item.price || 0).toFixed(2);

        return `
          <article class="menu-card">
            <div class="menu-card-head">
              <h3>${name}</h3>
              <span>$${price}</span>
            </div>
            <p>${description}</p>
          </article>
        `;
      })
      .join('');
  }

  function renderContact() {
    const settings = state.settings || {};

    const address = document.getElementById('venue-address');
    const phone = document.getElementById('venue-phone');
    const email = document.getElementById('venue-email');

    if (address) address.textContent = settings.address || 'Redondo Beach, CA';

    if (phone) {
      const value = settings.phone || '(310) 555-0147';
      const digits = value.replace(/[^\d+]/g, '');
      phone.textContent = value;
      phone.href = `tel:${digits || '+13105550147'}`;
    }

    if (email) {
      const value = settings.email || 'hello@spoonbilllounge.com';
      email.textContent = value;
      email.href = `mailto:${value}`;
    }
  }

  function setFeedback(key, message) {
    const target = document.querySelector(`[data-feedback="${key}"]`);
    if (target) target.textContent = message;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
