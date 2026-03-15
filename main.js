(function () {
  const store = window.SpoonbillStore;
  if (!store) return;

  const { loadData, saveData, MENU_CATEGORIES, uid } = store;
  let state = loadData();
  let activeCategory = MENU_CATEGORIES[0];

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    bindMenuTabs();
    bindPublicForms();
    renderPublicSite();
    const year = document.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  function bindMenuTabs() {
    document.querySelectorAll('.tab-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const next = button.getAttribute('data-category');
        if (!MENU_CATEGORIES.includes(next)) return;
        activeCategory = next;

        document.querySelectorAll('.tab-btn').forEach((item) => {
          item.classList.toggle('active', item === button);
        });

        renderMenu();
      });
    });
  }

  function bindPublicForms() {
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
        setFeedback('reservation', 'Reservation request received. BOH will follow up shortly.');
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
        setFeedback('class', 'Class request submitted. A coordinator will confirm details.');
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
        setFeedback('event', 'Private event inquiry received. BOH will contact you soon.');
      });
    }
  }

  function renderPublicSite() {
    state = loadData();
    renderMenu();
    renderContactDetails();
  }

  function renderMenu() {
    const container = document.getElementById('menu-items');
    if (!container) return;

    const items = state.menuItems
      .filter((item) => item.category === activeCategory)
      .filter((item) => item.active !== false)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (!items.length) {
      container.innerHTML = '<p class="muted">No active items in this category yet.</p>';
      return;
    }

    container.innerHTML = items
      .map((item) => {
        const safeName = escapeHtml(item.name || 'Untitled');
        const safeDescription = escapeHtml(item.description || '');
        const price = Number(item.price || 0);
        return `
          <article class="menu-card">
            <div class="menu-card-head">
              <h3>${safeName}</h3>
              <span class="menu-price">$${price.toFixed(2)}</span>
            </div>
            <p>${safeDescription}</p>
          </article>
        `;
      })
      .join('');
  }

  function renderContactDetails() {
    const settings = state.settings || {};

    const address = document.getElementById('venue-address');
    const phone = document.getElementById('venue-phone');
    const email = document.getElementById('venue-email');

    if (address) address.textContent = settings.address || 'Redondo Beach, CA';

    if (phone) {
      const rawPhone = settings.phone || '(310) 555-0147';
      const digits = rawPhone.replace(/[^\d+]/g, '');
      phone.textContent = rawPhone;
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
    if (!target) return;
    target.textContent = message;
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
