(function () {
  const store = window.SpoonbillStore;
  if (!store) return;

  const {
    loadData,
    saveData,
    mergeData,
    uid,
    MENU_CATEGORIES,
    loadAuth,
    saveAuth,
    setAdminSession,
    requireAdminAuth,
  } = store;

  const reservationStatuses = ['Pending', 'Confirmed', 'Seated', 'Completed', 'Cancelled'];
  const classStatuses = ['Requested', 'Scheduled', 'Confirmed', 'Completed', 'Cancelled'];
  const eventStatuses = ['Lead', 'Quoted', 'Confirmed', 'Completed', 'Closed'];
  const teamStatuses = ['Active', 'On Leave', 'Inactive'];

  let state = loadData();
  let statusTimer = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (!requireAdminAuth()) return;

    bindNavigation();
    bindForms();
    bindActions();
    renderAll();
  }

  function bindNavigation() {
    const navButtons = Array.from(document.querySelectorAll('.boh-nav-btn'));
    const panels = Array.from(document.querySelectorAll('.boh-panel'));

    navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const panel = button.getAttribute('data-panel');

        navButtons.forEach((item) => item.classList.toggle('active', item === button));
        panels.forEach((item) => {
          item.classList.toggle('active', item.id === `panel-${panel}`);
        });
      });
    });
  }

  function bindForms() {
    const menuForm = document.getElementById('menu-form');
    const reservationForm = document.getElementById('reservation-admin-form');
    const classesForm = document.getElementById('classes-form');
    const eventsForm = document.getElementById('events-form');
    const teamForm = document.getElementById('team-form');
    const scheduleForm = document.getElementById('schedule-form');
    const venueForm = document.getElementById('venue-settings-form');
    const passwordForm = document.getElementById('admin-password-form');

    if (menuForm) {
      menuForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(menuForm);

        state.menuItems.push({
          id: uid(),
          name: String(formData.get('name') || '').trim(),
          category: String(formData.get('category') || MENU_CATEGORIES[0]),
          price: Number(formData.get('price') || 0),
          description: String(formData.get('description') || '').trim(),
          active: String(formData.get('active')) !== 'false',
        });

        menuForm.reset();
        commit('Menu item added.');
      });
    }

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
          source: 'BOH',
          createdAt: new Date().toISOString(),
        });

        reservationForm.reset();
        commit('Reservation added to queue.');
      });
    }

    if (classesForm) {
      classesForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(classesForm);

        state.classes.push({
          id: uid(),
          title: String(formData.get('title') || '').trim(),
          classType: String(formData.get('classType') || '').trim(),
          date: String(formData.get('date') || ''),
          instructor: String(formData.get('instructor') || '').trim(),
          startTime: String(formData.get('startTime') || ''),
          endTime: String(formData.get('endTime') || ''),
          capacity: Number(formData.get('capacity') || 1),
          enrolled: 0,
          price: Number(formData.get('price') || 0),
          notes: String(formData.get('notes') || '').trim(),
          status: 'Scheduled',
          source: 'BOH',
          createdAt: new Date().toISOString(),
        });

        classesForm.reset();
        commit('Class scheduled.');
      });
    }

    if (eventsForm) {
      eventsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(eventsForm);

        state.privateEvents.push({
          id: uid(),
          name: String(formData.get('name') || '').trim(),
          eventType: String(formData.get('eventType') || '').trim(),
          date: String(formData.get('date') || ''),
          startTime: String(formData.get('startTime') || ''),
          endTime: String(formData.get('endTime') || '').trim(),
          guests: Number(formData.get('guests') || 0),
          phone: String(formData.get('phone') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          notes: String(formData.get('notes') || '').trim(),
          status: 'Lead',
          source: 'BOH',
          createdAt: new Date().toISOString(),
        });

        eventsForm.reset();
        commit('Private event lead added.');
      });
    }

    if (teamForm) {
      teamForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(teamForm);

        state.teamMembers.push({
          id: uid(),
          name: String(formData.get('name') || '').trim(),
          role: String(formData.get('role') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          phone: String(formData.get('phone') || '').trim(),
          startDate: String(formData.get('startDate') || ''),
          rate: Number(formData.get('rate') || 0),
          status: String(formData.get('status') || 'Active'),
        });

        teamForm.reset();
        commit('Team member added.');
      });
    }

    if (scheduleForm) {
      scheduleForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(scheduleForm);

        const memberId = String(formData.get('memberId') || '');
        const member = state.teamMembers.find((item) => item.id === memberId);
        if (!member) {
          setStatus('Select a valid team member for schedule assignment.', 'error');
          return;
        }

        state.schedules.push({
          id: uid(),
          memberId,
          date: String(formData.get('date') || ''),
          shift: String(formData.get('shift') || ''),
          start: String(formData.get('start') || ''),
          end: String(formData.get('end') || ''),
          station: String(formData.get('station') || '').trim(),
          notes: String(formData.get('notes') || '').trim(),
        });

        scheduleForm.reset();
        commit('Schedule block added.');
      });
    }

    if (venueForm) {
      venueForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(venueForm);

        state.settings = {
          venueName: String(formData.get('venueName') || '').trim(),
          phone: String(formData.get('phone') || '').trim(),
          email: String(formData.get('email') || '').trim(),
          address: String(formData.get('address') || '').trim(),
        };

        commit('Venue settings saved.');
      });
    }

    if (passwordForm) {
      passwordForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(passwordForm);
        const currentPassword = String(formData.get('currentPassword') || '');
        const newPassword = String(formData.get('newPassword') || '');
        const confirmPassword = String(formData.get('confirmPassword') || '');

        const auth = loadAuth();

        if (currentPassword !== auth.password) {
          setStatus('Current password is incorrect.', 'error');
          return;
        }

        if (newPassword.length < 6) {
          setStatus('New password must be at least 6 characters.', 'error');
          return;
        }

        if (newPassword !== confirmPassword) {
          setStatus('New password and confirmation do not match.', 'error');
          return;
        }

        saveAuth({ password: newPassword });
        passwordForm.reset();
        setStatus('Admin password updated successfully.');
      });
    }
  }

  function bindActions() {
    const logoutButton = document.getElementById('logout-btn');
    const exportButton = document.getElementById('export-json-btn');
    const importInput = document.getElementById('import-json-input');

    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        setAdminSession(false);
        window.location.href = 'admin-login.html';
      });
    }

    if (exportButton) {
      exportButton.addEventListener('click', () => {
        const payload = JSON.stringify(mergeData(state), null, 2);
        const blob = new Blob([payload], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);

        anchor.href = url;
        anchor.download = `spoonbill-boh-backup-${stamp}.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        setStatus('BOH data exported.');
      });
    }

    if (importInput) {
      importInput.addEventListener('change', async () => {
        const file = importInput.files && importInput.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          state = mergeData(parsed);
          commit('BOH data imported successfully.');
        } catch {
          setStatus('Import failed: invalid JSON file.', 'error');
        } finally {
          importInput.value = '';
        }
      });
    }
  }

  function commit(message, level) {
    saveData(state);
    renderAll();
    setStatus(message, level || 'success');
  }

  function renderAll() {
    state = loadData();
    renderDashboard();
    renderMenuTable();
    renderReservationsTable();
    renderClassesTable();
    renderEventsTable();
    renderTeamTable();
    renderSchedulesTable();
    renderVenueForm();
    renderScheduleMemberOptions();
  }

  function renderDashboard() {
    const pendingReservations = state.reservations.filter(
      (item) => String(item.status).toLowerCase() === 'pending'
    ).length;

    const today = toDateString(new Date());

    const upcomingClasses = state.classes.filter((item) => {
      const status = String(item.status || '').toLowerCase();
      return item.date && item.date >= today && status !== 'cancelled';
    }).length;

    const openEventLeads = state.privateEvents.filter((item) => {
      const status = String(item.status || '').toLowerCase();
      return !['completed', 'closed'].includes(status);
    }).length;

    setText('metric-reservations', String(pendingReservations));
    setText('metric-classes', String(upcomingClasses));
    setText('metric-events', String(openEventLeads));
    setText('metric-team', String(state.teamMembers.length));

    const todayReservations = state.reservations.filter((item) => item.date === today).length;
    const todayClasses = state.classes.filter((item) => item.date === today).length;
    const todaySchedules = state.schedules.filter((item) => item.date === today).length;

    const todayGlance = [
      `${todayReservations} reservations on the books for today.`,
      `${todayClasses} classes scheduled today.`,
      `${todaySchedules} schedule blocks assigned today.`,
    ];

    const todayGlanceList = document.getElementById('today-glance');
    if (todayGlanceList) {
      todayGlanceList.innerHTML = todayGlance.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
    }

    const summaryItems = MENU_CATEGORIES.map((category) => {
      const count = state.menuItems.filter((item) => item.category === category && item.active !== false).length;
      return `${category}: ${count} active item${count === 1 ? '' : 's'}`;
    });

    const summaryList = document.getElementById('menu-summary');
    if (summaryList) {
      summaryList.innerHTML = summaryItems.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
    }
  }

  function renderMenuTable() {
    const tbody = document.getElementById('menu-table-body');
    if (!tbody) return;

    const rows = [...state.menuItems].sort((a, b) => {
      const categorySort = String(a.category).localeCompare(String(b.category));
      if (categorySort !== 0) return categorySort;
      return String(a.name).localeCompare(String(b.name));
    });

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5">No menu items yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((item) => {
        const categoryOptions = MENU_CATEGORIES
          .map((value) => `<option value="${escapeHtml(value)}" ${value === item.category ? 'selected' : ''}>${escapeHtml(value)}</option>`)
          .join('');

        return `
          <tr>
            <td>
              <input data-menu-name="${item.id}" value="${escapeHtml(item.name || '')}">
              <textarea data-menu-description="${item.id}" rows="2">${escapeHtml(item.description || '')}</textarea>
            </td>
            <td>
              <select data-menu-category="${item.id}">${categoryOptions}</select>
            </td>
            <td>
              <input data-menu-price="${item.id}" type="number" min="0" step="0.01" value="${Number(item.price || 0)}">
            </td>
            <td>
              <select data-menu-active="${item.id}">
                <option value="true" ${item.active !== false ? 'selected' : ''}>Active</option>
                <option value="false" ${item.active === false ? 'selected' : ''}>Hidden</option>
              </select>
            </td>
            <td>
              <div class="table-actions">
                <button type="button" class="table-btn" data-save-menu="${item.id}">Save</button>
                <button type="button" class="table-btn danger" data-delete-menu="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-save-menu]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-save-menu');
        const item = state.menuItems.find((entry) => entry.id === id);
        if (!item) return;

        item.name = readValue(`[data-menu-name="${id}"]`);
        item.description = readValue(`[data-menu-description="${id}"]`);
        item.category = readValue(`[data-menu-category="${id}"]`);
        item.price = Number(readValue(`[data-menu-price="${id}"]`) || 0);
        item.active = readValue(`[data-menu-active="${id}"]`) !== 'false';
        commit('Menu item updated.');
      });
    });

    tbody.querySelectorAll('[data-delete-menu]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-delete-menu');
        state.menuItems = state.menuItems.filter((entry) => entry.id !== id);
        commit('Menu item removed.');
      });
    });
  }

  function renderReservationsTable() {
    const tbody = document.getElementById('reservations-table-body');
    if (!tbody) return;

    const rows = [...state.reservations].sort(sortByDateAndTimeDesc);

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6">No reservations in queue.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((item) => {
        const statusOptions = reservationStatuses
          .map((value) => `<option value="${value}" ${value === item.status ? 'selected' : ''}>${value}</option>`)
          .join('');

        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.name || 'Unknown')}</strong>
              <div class="muted">${escapeHtml(item.phone || '')} · ${escapeHtml(item.email || '')}</div>
            </td>
            <td>${escapeHtml(formatWhen(item.date, item.time))}</td>
            <td>${escapeHtml(String(item.partySize || 0))}</td>
            <td>
              <select data-res-status="${item.id}">${statusOptions}</select>
            </td>
            <td>
              <span class="status-pill">${escapeHtml(item.source || 'Unknown')}</span>
            </td>
            <td>
              <div class="table-actions">
                <button type="button" class="table-btn" data-save-res="${item.id}">Save</button>
                <button type="button" class="table-btn danger" data-delete-res="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-save-res]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-save-res');
        const row = state.reservations.find((entry) => entry.id === id);
        if (!row) return;
        row.status = readValue(`[data-res-status="${id}"]`) || 'Pending';
        commit('Reservation status updated.');
      });
    });

    tbody.querySelectorAll('[data-delete-res]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-delete-res');
        state.reservations = state.reservations.filter((entry) => entry.id !== id);
        commit('Reservation removed.');
      });
    });
  }

  function renderClassesTable() {
    const tbody = document.getElementById('classes-table-body');
    if (!tbody) return;

    const rows = [...state.classes].sort(sortByDateAndTimeDesc);

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6">No classes scheduled.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((item) => {
        const statusOptions = classStatuses
          .map((value) => `<option value="${value}" ${value === item.status ? 'selected' : ''}>${value}</option>`)
          .join('');

        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.title || item.classType || 'Class')}</strong>
              <div class="muted">${escapeHtml(item.classType || '')}</div>
            </td>
            <td>${escapeHtml(formatWhen(item.date, item.startTime))}</td>
            <td>${escapeHtml(item.instructor || 'TBD')}</td>
            <td>${escapeHtml(`${Number(item.enrolled || 0)}/${Number(item.capacity || 0)}`)}</td>
            <td>
              <select data-class-status="${item.id}">${statusOptions}</select>
            </td>
            <td>
              <div class="table-actions">
                <button type="button" class="table-btn" data-save-class="${item.id}">Save</button>
                <button type="button" class="table-btn danger" data-delete-class="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-save-class]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-save-class');
        const row = state.classes.find((entry) => entry.id === id);
        if (!row) return;
        row.status = readValue(`[data-class-status="${id}"]`) || 'Scheduled';
        commit('Class status updated.');
      });
    });

    tbody.querySelectorAll('[data-delete-class]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-delete-class');
        state.classes = state.classes.filter((entry) => entry.id !== id);
        commit('Class removed.');
      });
    });
  }

  function renderEventsTable() {
    const tbody = document.getElementById('events-table-body');
    if (!tbody) return;

    const rows = [...state.privateEvents].sort(sortByDateAndTimeDesc);

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6">No private event leads yet.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((item) => {
        const statusOptions = eventStatuses
          .map((value) => `<option value="${value}" ${value === item.status ? 'selected' : ''}>${value}</option>`)
          .join('');

        return `
          <tr>
            <td>
              <strong>${escapeHtml(item.name || 'Unknown')}</strong>
              <div class="muted">${escapeHtml(item.phone || '')} · ${escapeHtml(item.email || '')}</div>
            </td>
            <td>${escapeHtml(item.eventType || 'Event')}</td>
            <td>${escapeHtml(formatWhen(item.date, item.startTime))}</td>
            <td>${escapeHtml(String(item.guests || 0))}</td>
            <td><select data-event-status="${item.id}">${statusOptions}</select></td>
            <td>
              <div class="table-actions">
                <button type="button" class="table-btn" data-save-event="${item.id}">Save</button>
                <button type="button" class="table-btn danger" data-delete-event="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-save-event]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-save-event');
        const row = state.privateEvents.find((entry) => entry.id === id);
        if (!row) return;
        row.status = readValue(`[data-event-status="${id}"]`) || 'Lead';
        commit('Event lead status updated.');
      });
    });

    tbody.querySelectorAll('[data-delete-event]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-delete-event');
        state.privateEvents = state.privateEvents.filter((entry) => entry.id !== id);
        commit('Event lead removed.');
      });
    });
  }

  function renderTeamTable() {
    const tbody = document.getElementById('team-table-body');
    if (!tbody) return;

    const rows = [...state.teamMembers].sort((a, b) => String(a.name).localeCompare(String(b.name)));

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5">No team members added.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((item) => {
        const statusOptions = teamStatuses
          .map((value) => `<option value="${value}" ${value === item.status ? 'selected' : ''}>${value}</option>`)
          .join('');

        return `
          <tr>
            <td>
              <input data-team-name="${item.id}" value="${escapeHtml(item.name || '')}">
            </td>
            <td>
              <input data-team-role="${item.id}" value="${escapeHtml(item.role || '')}">
            </td>
            <td>
              <div class="muted">${escapeHtml(item.email || 'No email')}</div>
              <div class="muted">${escapeHtml(item.phone || 'No phone')}</div>
            </td>
            <td>
              <select data-team-status="${item.id}">${statusOptions}</select>
            </td>
            <td>
              <div class="table-actions">
                <button type="button" class="table-btn" data-save-team="${item.id}">Save</button>
                <button type="button" class="table-btn danger" data-delete-team="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-save-team]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-save-team');
        const row = state.teamMembers.find((entry) => entry.id === id);
        if (!row) return;

        row.name = readValue(`[data-team-name="${id}"]`);
        row.role = readValue(`[data-team-role="${id}"]`);
        row.status = readValue(`[data-team-status="${id}"]`) || 'Active';
        commit('Team member updated.');
      });
    });

    tbody.querySelectorAll('[data-delete-team]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-delete-team');
        state.teamMembers = state.teamMembers.filter((entry) => entry.id !== id);
        state.schedules = state.schedules.filter((entry) => entry.memberId !== id);
        commit('Team member removed and schedules cleaned up.');
      });
    });
  }

  function renderSchedulesTable() {
    const tbody = document.getElementById('schedules-table-body');
    if (!tbody) return;

    const rows = [...state.schedules].sort(sortByDateAndStartDesc);

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6">No schedules assigned.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((item) => {
        const memberName = getMemberName(item.memberId);
        return `
          <tr>
            <td>${escapeHtml(memberName)}</td>
            <td>${escapeHtml(item.date || '')}</td>
            <td>${escapeHtml(item.shift || '')}</td>
            <td>${escapeHtml(`${item.start || '--'} - ${item.end || '--'}`)}</td>
            <td>${escapeHtml(item.station || '')}</td>
            <td>
              <div class="table-actions">
                <button type="button" class="table-btn danger" data-delete-schedule="${item.id}">Delete</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('[data-delete-schedule]').forEach((button) => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-delete-schedule');
        state.schedules = state.schedules.filter((entry) => entry.id !== id);
        commit('Schedule block removed.');
      });
    });
  }

  function renderScheduleMemberOptions() {
    const select = document.getElementById('schedule-member');
    if (!select) return;

    if (!state.teamMembers.length) {
      select.innerHTML = '<option value="">Add team members first</option>';
      return;
    }

    const options = state.teamMembers
      .map((member) => `<option value="${member.id}">${escapeHtml(member.name || 'Unnamed')}</option>`)
      .join('');

    select.innerHTML = options;
  }

  function renderVenueForm() {
    const form = document.getElementById('venue-settings-form');
    if (!form) return;

    const settings = state.settings || {};
    setFormValue(form, 'venueName', settings.venueName || 'The Spoonbill Lounge');
    setFormValue(form, 'phone', settings.phone || '(310) 555-0147');
    setFormValue(form, 'email', settings.email || 'hello@spoonbilllounge.com');
    setFormValue(form, 'address', settings.address || 'Redondo Beach, CA');
  }

  function setFormValue(form, name, value) {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) input.value = value;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setStatus(message, level) {
    const status = document.getElementById('boh-status');
    if (!status) return;

    status.textContent = message;
    status.className = 'boh-status';
    status.classList.add(level === 'error' ? 'error' : 'success');

    if (statusTimer) {
      window.clearTimeout(statusTimer);
    }

    statusTimer = window.setTimeout(() => {
      status.textContent = '';
      status.className = 'boh-status';
    }, 4400);
  }

  function readValue(selector) {
    const element = document.querySelector(selector);
    return element ? String(element.value || '').trim() : '';
  }

  function getMemberName(memberId) {
    const member = state.teamMembers.find((item) => item.id === memberId);
    return member ? member.name || 'Unnamed' : 'Unknown Member';
  }

  function toDateString(date) {
    return date.toISOString().slice(0, 10);
  }

  function formatWhen(date, time) {
    if (!date && !time) return 'TBD';
    if (!date) return time;
    if (!time) return date;
    return `${date} ${time}`;
  }

  function sortByDateAndTimeDesc(a, b) {
    const aKey = `${a.date || ''}T${a.time || a.startTime || '00:00'}`;
    const bKey = `${b.date || ''}T${b.time || b.startTime || '00:00'}`;
    return aKey > bKey ? -1 : 1;
  }

  function sortByDateAndStartDesc(a, b) {
    const aKey = `${a.date || ''}T${a.start || '00:00'}`;
    const bKey = `${b.date || ''}T${b.start || '00:00'}`;
    return aKey > bKey ? -1 : 1;
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
