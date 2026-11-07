'use strict';

(() => {
  const STORAGE_KEY = 'bitacora-contador-usuarios-v1';
  const DEFAULT_INTERVAL_HOURS = 6;
  const MIN_INTERVAL_HOURS = 0.5;
  const MAX_INTERVAL_HOURS = 720;

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    saveButton: $('#saveButton'),
    saveIndicator: $('#saveIndicator'),
    saveText: $('#saveText'),
    activeCount: $('#activeCount'),
    totalCount: $('#totalCount'),
    activeSummary: $('#activeSummary'),
    progressFill: $('#progressFill'),
    progressPercent: $('#progressPercent'),
    activityProgress: $('#activityProgress'),
    timerDisplay: $('#timerDisplay'),
    intervalInput: $('#intervalInput'),
    applyIntervalButton: $('#applyIntervalButton'),
    renameGroupButton: $('#renameGroupButton'),
    deleteGroupButton: $('#deleteGroupButton'),
    addGroupButton: $('#addGroupButton'),
    groupsList: $('#groupsList'),
    currentGroupName: $('#currentGroupName'),
    addUserButton: $('#addUserButton'),
    userList: $('#userList'),
    listCount: $('#listCount'),
    footerStatus: $('#footerStatus'),
    dialog: $('#appDialog'),
    dialogForm: $('#dialogForm'),
    dialogKicker: $('#dialogKicker'),
    dialogTitle: $('#dialogTitle'),
    dialogDescription: $('#dialogDescription'),
    dialogFieldWrap: $('#dialogFieldWrap'),
    dialogLabel: $('#dialogLabel'),
    dialogInput: $('#dialogInput'),
    dialogConfirm: $('#dialogConfirm'),
    dialogCancel: $('#dialogCancel'),
    dialogClose: $('#dialogClose'),
    toast: $('#toast'),
  };

  let state = loadData();
  let dialogAction = null;
  let toastTimeout = null;
  let timerInterval = null;

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }

  function createDefaultData() {
    const groupId = makeId();
    const now = Date.now();
    return {
      version: 1,
      resetIntervalHours: DEFAULT_INTERVAL_HOURS,
      nextResetAt: now + DEFAULT_INTERVAL_HOURS * 60 * 60 * 1000,
      selectedGroupId: groupId,
      groups: [{ id: groupId, name: 'Grupo 1', users: [] }],
    };
  }

  function normalizeData(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.groups)) {
      throw new Error('La estructura de datos no es válida.');
    }

    const groups = raw.groups.map((group, groupIndex) => {
      const safeGroup = group && typeof group === 'object' ? group : {};
      const users = Array.isArray(safeGroup.users) ? safeGroup.users : [];
      return {
        id: String(safeGroup.id || makeId()),
        name: String(safeGroup.name || `Grupo ${groupIndex + 1}`).trim().slice(0, 48) || `Grupo ${groupIndex + 1}`,
        users: users.map((user) => {
          const safeUser = user && typeof user === 'object' ? user : {};
          return {
            id: String(safeUser.id || makeId()),
            name: String(safeUser.name || 'Usuario').trim().slice(0, 48) || 'Usuario',
            active: Boolean(safeUser.active),
          };
        }),
      };
    });

    if (groups.length === 0) {
      const fresh = createDefaultData();
      groups.push(...fresh.groups);
    }

    let interval = Number(raw.resetIntervalHours ?? raw.reset_interval_hours ?? DEFAULT_INTERVAL_HOURS);
    if (!Number.isFinite(interval) || interval < MIN_INTERVAL_HOURS || interval > MAX_INTERVAL_HOURS) {
      interval = DEFAULT_INTERVAL_HOURS;
    }

    let nextResetAt = Number(raw.nextResetAt ?? raw.next_reset_at);
    if (!Number.isFinite(nextResetAt) || nextResetAt <= 0) {
      nextResetAt = Date.now() + interval * 60 * 60 * 1000;
    }

    const selectedGroupId = groups.some((group) => group.id === String(raw.selectedGroupId ?? raw.selected_group_id))
      ? String(raw.selectedGroupId ?? raw.selected_group_id)
      : groups[0].id;

    return {
      version: 1,
      resetIntervalHours: interval,
      nextResetAt,
      selectedGroupId,
      groups,
    };
  }

  function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? normalizeData(JSON.parse(saved)) : createDefaultData();
    } catch (error) {
      console.warn('No se pudieron cargar los datos guardados:', error);
      return createDefaultData();
    }
  }

  function setSaveStatus(status, message) {
    elements.saveIndicator.classList.toggle('is-saving', status === 'saving');
    elements.saveIndicator.classList.toggle('has-error', status === 'error');
    elements.saveText.textContent = message;
    elements.footerStatus.textContent = status === 'error' ? 'Error de almacenamiento' : status === 'saving' ? 'Guardando…' : 'Todo en orden';
  }

  function saveData(showToast = false) {
    setSaveStatus('saving', 'Guardando…');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveStatus('saved', 'Guardado localmente');
      if (showToast) showToastMessage('Los cambios se guardaron en este navegador.');
      return true;
    } catch (error) {
      console.error('No se pudieron guardar los datos:', error);
      setSaveStatus('error', 'No se pudo guardar');
      showToastMessage('El navegador no permitió guardar los cambios. Revisa el almacenamiento disponible.');
      return false;
    }
  }

  function selectedGroup() {
    const group = state.groups.find((item) => item.id === state.selectedGroupId);
    if (group) return group;
    state.selectedGroupId = state.groups[0].id;
    return state.groups[0];
  }

  function getCounts() {
    let total = 0;
    let active = 0;
    for (const group of state.groups) {
      for (const user of group.users) {
        total += 1;
        if (user.active) active += 1;
      }
    }
    return { total, active };
  }

  function updateCounts() {
    const { total, active } = getCounts();
    const percentage = total ? Math.round((active / total) * 100) : 0;
    elements.activeCount.textContent = String(active);
    elements.totalCount.textContent = String(total);
    elements.activeSummary.textContent = total
      ? `${active} de ${total} ${total === 1 ? 'personaje está' : 'personajes están'} activos`
      : 'Aún no hay actividad registrada';
    elements.progressFill.style.width = `${percentage}%`;
    elements.progressPercent.textContent = `${percentage}%`;
    elements.activityProgress.setAttribute('aria-valuenow', String(percentage));
  }

  function renderGroups() {
    elements.groupsList.replaceChildren();
    for (const group of state.groups) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'group-tab';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(group.id === state.selectedGroupId));
      button.setAttribute('aria-controls', 'userList');
      button.title = `Mostrar ${group.name}`;

      const name = document.createElement('span');
      name.className = 'tab-name';
      name.textContent = group.name;
      const count = document.createElement('span');
      count.className = 'tab-count';
      count.textContent = String(group.users.length);
      button.append(name, count);
      button.addEventListener('click', () => selectGroup(group.id));
      button.addEventListener('dblclick', () => renameGroup(group));
      elements.groupsList.append(button);
    }
  }

  function renderUsers() {
    const group = selectedGroup();
    elements.currentGroupName.textContent = group.name;
    elements.userList.replaceChildren();
    elements.listCount.textContent = `${group.users.length} ${group.users.length === 1 ? 'personaje' : 'personajes'}`;

    if (group.users.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state';
      const seal = document.createElement('div');
      seal.className = 'empty-seal';
      seal.setAttribute('aria-hidden', 'true');
      seal.textContent = '✦';
      const heading = document.createElement('h3');
      heading.textContent = 'Este grupo todavía está vacío';
      const description = document.createElement('p');
      description.textContent = 'Agrega el primer usuario o personaje para comenzar el registro.';
      empty.append(seal, heading, description);
      elements.userList.append(empty);
      return;
    }

    for (const user of group.users) {
      elements.userList.append(createUserCard(group, user));
    }
  }

  function createUserCard(group, user) {
    const card = document.createElement('article');
    card.className = `user-card${user.active ? ' is-active' : ''}`;

    const identity = document.createElement('div');
    identity.className = 'user-identity';
    const avatar = document.createElement('div');
    avatar.className = 'user-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = user.name.trim().charAt(0) || '•';

    const meta = document.createElement('div');
    meta.className = 'user-meta';
    const name = document.createElement('span');
    name.className = 'user-name';
    name.textContent = user.name;
    name.title = 'Doble clic para renombrar';
    name.tabIndex = 0;
    name.setAttribute('role', 'button');
    name.setAttribute('aria-label', `Renombrar a ${user.name}`);
    name.addEventListener('dblclick', () => renameUser(group.id, user));
    name.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        renameUser(group.id, user);
      }
    });
    const status = document.createElement('span');
    status.className = 'user-state';
    const dot = document.createElement('span');
    dot.className = 'state-dot';
    dot.setAttribute('aria-hidden', 'true');
    const statusText = document.createElement('span');
    statusText.textContent = user.active ? 'ACTIVO' : 'INACTIVO';
    status.append(dot, statusText);
    meta.append(name, status);
    identity.append(avatar, meta);

    const actions = document.createElement('div');
    actions.className = 'row-actions';
    const renameButton = document.createElement('button');
    renameButton.type = 'button';
    renameButton.className = 'row-action';
    renameButton.textContent = '✎';
    renameButton.title = `Renombrar ${user.name}`;
    renameButton.setAttribute('aria-label', `Renombrar ${user.name}`);
    renameButton.addEventListener('click', () => renameUser(group.id, user));
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'row-action delete';
    deleteButton.textContent = '×';
    deleteButton.title = `Eliminar ${user.name}`;
    deleteButton.setAttribute('aria-label', `Eliminar ${user.name}`);
    deleteButton.addEventListener('click', () => deleteUser(group.id, user));
    actions.append(renameButton, deleteButton);

    const toggleLabel = document.createElement('label');
    toggleLabel.className = 'switch-control';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = user.active;
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-label', `Marcar a ${user.name} como activo`);
    const track = document.createElement('span');
    track.className = 'switch-track';
    const switchText = document.createElement('span');
    switchText.className = 'switch-label';
    switchText.textContent = user.active ? 'ACTIVO' : 'OFF';
    toggle.addEventListener('change', () => {
      user.active = toggle.checked;
      saveData();
      updateCounts();
      renderGroups();
      renderUsers();
    });
    toggleLabel.append(toggle, track, switchText);

    card.append(identity, actions, toggleLabel);
    return card;
  }

  function renderAll() {
    renderGroups();
    renderUsers();
    updateCounts();
    elements.intervalInput.value = String(state.resetIntervalHours);
  }

  function selectGroup(groupId) {
    state.selectedGroupId = groupId;
    renderGroups();
    renderUsers();
    saveData();
  }

  function saveAndRender() {
    renderAll();
    saveData();
  }

  function openTextDialog({ kicker = 'GESTIÓN', title, description = '', label = 'Nombre', value = '', confirmText = 'Guardar', onConfirm }) {
    dialogAction = onConfirm;
    elements.dialogKicker.textContent = kicker;
    elements.dialogTitle.textContent = title;
    elements.dialogDescription.textContent = description;
    elements.dialogLabel.textContent = label;
    elements.dialogInput.value = value;
    elements.dialogInput.maxLength = 48;
    elements.dialogFieldWrap.hidden = false;
    elements.dialogConfirm.textContent = confirmText;
    elements.dialogCancel.hidden = false;
    elements.dialog.showModal();
    window.setTimeout(() => elements.dialogInput.focus(), 0);
  }

  function openConfirmDialog({ title, description, confirmText = 'Eliminar', onConfirm }) {
    dialogAction = onConfirm;
    elements.dialogKicker.textContent = 'CONFIRMAR ACCIÓN';
    elements.dialogTitle.textContent = title;
    elements.dialogDescription.textContent = description;
    elements.dialogFieldWrap.hidden = true;
    elements.dialogConfirm.textContent = confirmText;
    elements.dialogCancel.hidden = false;
    elements.dialog.showModal();
    elements.dialogCancel.focus();
  }

  function closeDialog() {
    if (elements.dialog.open) elements.dialog.close();
    dialogAction = null;
    elements.dialogFieldWrap.hidden = false;
  }

  function addGroup() {
    openTextDialog({
      kicker: 'ORGANIZACIÓN',
      title: 'Crear un grupo',
      description: 'Cada grupo mantiene su propio listado de usuarios y personajes.',
      label: 'Nombre del grupo',
      value: `Grupo ${state.groups.length + 1}`,
      confirmText: 'Crear grupo',
      onConfirm: (name) => {
        const group = { id: makeId(), name, users: [] };
        state.groups.push(group);
        state.selectedGroupId = group.id;
        saveAndRender();
        showToastMessage(`Se creó el grupo «${name}».`);
      },
    });
  }

  function renameGroup(group = selectedGroup()) {
    openTextDialog({
      kicker: 'ORGANIZACIÓN',
      title: 'Renombrar grupo',
      description: 'El nuevo nombre aparecerá en la lista de grupos.',
      label: 'Nombre del grupo',
      value: group.name,
      confirmText: 'Guardar nombre',
      onConfirm: (name) => {
        group.name = name;
        saveAndRender();
        showToastMessage('El nombre del grupo fue actualizado.');
      },
    });
  }

  function addUser() {
    const group = selectedGroup();
    openTextDialog({
      kicker: 'DIRECTORIO',
      title: 'Agregar personaje',
      description: `Se añadirá al grupo «${group.name}».`,
      label: 'Nombre del usuario o personaje',
      value: '',
      confirmText: 'Agregar',
      onConfirm: (name) => {
        group.users.push({ id: makeId(), name, active: false });
        saveAndRender();
        showToastMessage(`«${name}» ya forma parte del grupo.`);
      },
    });
  }

  function renameUser(groupId, user) {
    openTextDialog({
      kicker: 'DIRECTORIO',
      title: 'Renombrar personaje',
      description: 'El estado de actividad se conservará.',
      label: 'Nuevo nombre',
      value: user.name,
      confirmText: 'Guardar nombre',
      onConfirm: (name) => {
        user.name = name;
        saveAndRender();
        showToastMessage('El nombre fue actualizado.');
      },
    });
  }

  function deleteUser(groupId, user) {
    openConfirmDialog({
      title: 'Eliminar personaje',
      description: `¿Quieres eliminar a «${user.name}»? Esta acción no se puede deshacer.`,
      onConfirm: () => {
        const group = state.groups.find((item) => item.id === groupId);
        if (!group) return;
        group.users = group.users.filter((item) => item.id !== user.id);
        saveAndRender();
        showToastMessage('El personaje fue eliminado del grupo.');
      },
    });
  }

  function deleteSelectedGroup() {
    const group = selectedGroup();
    if (state.groups.length <= 1) {
      showToastMessage('Debe existir al menos un grupo.');
      return;
    }
    openConfirmDialog({
      title: 'Eliminar grupo',
      description: `Se eliminará «${group.name}» junto con sus ${group.users.length} ${group.users.length === 1 ? 'personaje' : 'personajes'}. Esta acción no se puede deshacer.`,
      onConfirm: () => {
        state.groups = state.groups.filter((item) => item.id !== group.id);
        state.selectedGroupId = state.groups[0].id;
        saveAndRender();
        showToastMessage('El grupo fue eliminado.');
      },
    });
  }

  function handleIntervalApply() {
    const raw = String(elements.intervalInput.value).trim().replace(',', '.');
    const hours = Number(raw);
    if (!Number.isFinite(hours) || hours < MIN_INTERVAL_HOURS || hours > MAX_INTERVAL_HOURS) {
      showToastMessage('Introduce un intervalo válido entre 0,5 y 720 horas.');
      elements.intervalInput.value = String(state.resetIntervalHours);
      elements.intervalInput.focus();
      return;
    }
    state.resetIntervalHours = hours;
    state.nextResetAt = Date.now() + hours * 60 * 60 * 1000;
    saveData();
    updateTimer();
    showToastMessage(`El reinicio se programó cada ${hours} ${hours === 1 ? 'hora' : 'horas'}.`);
  }

  function formatTime(milliseconds) {
    const remaining = Math.max(0, Math.floor(milliseconds / 1000));
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;
    return [hours, minutes, seconds].map((number) => String(number).padStart(2, '0')).join(':');
  }

  function performAutomaticReset(now) {
    for (const group of state.groups) {
      for (const user of group.users) user.active = false;
    }
    const intervalMs = state.resetIntervalHours * 60 * 60 * 1000;
    const missedIntervals = Math.floor((now - state.nextResetAt) / intervalMs) + 1;
    state.nextResetAt += missedIntervals * intervalMs;
    renderAll();
    saveData();
    showToastMessage('Reinicio automático: todos los interruptores están en OFF.');
    elements.footerStatus.textContent = 'Actividad reiniciada';
  }

  function updateTimer() {
    const now = Date.now();
    if (now >= state.nextResetAt) performAutomaticReset(now);
    elements.timerDisplay.textContent = formatTime(state.nextResetAt - Date.now());
  }

  function showToastMessage(message) {
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    if (toastTimeout) window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => elements.toast.classList.remove('show'), 3100);
  }

  elements.dialogForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const action = dialogAction;
    if (!action) return closeDialog();
    if (!elements.dialogFieldWrap.hidden) {
      const name = elements.dialogInput.value.trim();
      if (!name) {
        elements.dialogInput.setCustomValidity('Escribe un nombre para continuar.');
        elements.dialogInput.reportValidity();
        elements.dialogInput.addEventListener('input', () => elements.dialogInput.setCustomValidity(''), { once: true });
        return;
      }
      closeDialog();
      action(name.slice(0, 48));
    } else {
      closeDialog();
      action();
    }
  });

  elements.dialogCancel.addEventListener('click', closeDialog);
  elements.dialogClose.addEventListener('click', closeDialog);
  elements.dialog.addEventListener('click', (event) => {
    if (event.target === elements.dialog) closeDialog();
  });
  elements.dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeDialog();
  });
  elements.saveButton.addEventListener('click', () => saveData(true));
  elements.addGroupButton.addEventListener('click', addGroup);
  elements.renameGroupButton.addEventListener('click', () => renameGroup());
  elements.deleteGroupButton.addEventListener('click', deleteSelectedGroup);
  elements.addUserButton.addEventListener('click', addUser);
  elements.applyIntervalButton.addEventListener('click', handleIntervalApply);
  elements.intervalInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') handleIntervalApply();
  });

  // Mantiene disponible la opción de borrar el grupo seleccionado con Alt + Supr.
  elements.groupsList.addEventListener('keydown', (event) => {
    if (event.altKey && event.key === 'Delete') {
      event.preventDefault();
      deleteSelectedGroup();
    }
  });

  window.addEventListener('pagehide', () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) { console.warn(error); }
  });

  renderAll();
  updateTimer();
  timerInterval = window.setInterval(updateTimer, 1000);

  // Evita dejar una referencia activa al intervalo al cerrar esta página.
  window.addEventListener('beforeunload', () => {
    if (timerInterval) window.clearInterval(timerInterval);
  });
})();
