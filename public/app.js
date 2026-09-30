'use strict';

const listEl = document.getElementById('todo-list');
const emptyEl = document.getElementById('empty');
const listErrorEl = document.getElementById('list-error');
const addFormEl = document.getElementById('add-form');
const addErrorEl = document.getElementById('add-error');
const viewFormEl = document.getElementById('view-form');
const viewIdEl = document.getElementById('view-id');
const viewResultEl = document.getElementById('view-result');
const filterStatusEl = document.getElementById('filter-status');
const sortByEl = document.getElementById('sort-by');
const sortDirectionEl = document.getElementById('sort-direction');
const refreshEl = document.getElementById('refresh');

async function request(url, options) {
  const res = await fetch(url, options);
  if (res.status === 204) {
    return null;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      (data && data.detail) || `Request failed (HTTP ${res.status})`;
    throw new Error(detail);
  }
  return data;
}

function buildUrl(path, params) {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

function addTodo() {
  const body = { title: addFormEl.title.value.trim() };
  const description = addFormEl.description.value.trim();
  const dueDate = addFormEl.dueDate.value.trim();
  if (description) {
    body.description = description;
  }
  if (dueDate) {
    body.dueDate = dueDate;
  }
  return body;
}

function showError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function clearError(el) {
  el.hidden = true;
  el.textContent = '';
}

function text(label, value) {
  const el = document.createElement('span');
  el.className = label;
  el.textContent = value;
  return el;
}

function buildItem(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item';
  li.dataset.id = todo.id;
  renderDisplay(li, todo);
  return li;
}

function renderDisplay(li, todo) {
  li.replaceChildren();
  li.classList.remove('editing');

  const statusClass = todo.isCompleted
    ? 'status-completed'
    : todo.dueDate && todo.dueDate < today()
      ? 'status-overdue'
      : 'status-active';

  const status = document.createElement('span');
  status.className = `status ${statusClass}`;
  status.textContent = todo.isCompleted ? 'Completed' : 'Active';

  const title = text('title', todo.title);
  const dueDate = text('due', todo.dueDate ? `Due ${todo.dueDate}` : 'No due date');
  const id = text('id', todo.id);
  const description = text(
    'description',
    todo.description || 'No description',
  );
  if (!todo.description) {
    description.classList.add('muted');
  }

  const actions = document.createElement('div');
  actions.className = 'actions';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.textContent = todo.isCompleted ? 'Mark active' : 'Complete';
  toggleBtn.addEventListener('click', () => toggleTodo(todo, !todo.isCompleted));

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.textContent = 'Edit';
  editBtn.addEventListener('click', () => enterEdit(li, todo));

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'danger';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => removeTodo(todo.id));

  actions.append(toggleBtn, editBtn, deleteBtn);
  li.append(status, title, dueDate, description, id, actions);
}

function enterEdit(li, todo) {
  li.replaceChildren();
  li.classList.add('editing');

  const form = document.createElement('form');
  form.className = 'edit-form';

  const titleLabel = document.createElement('label');
  titleLabel.textContent = 'Title';
  const title = document.createElement('input');
  title.type = 'text';
  title.name = 'title';
  title.value = todo.title;
  title.required = true;
  titleLabel.append(title);

  const descLabel = document.createElement('label');
  descLabel.textContent = 'Description';
  const desc = document.createElement('input');
  desc.type = 'text';
  desc.name = 'description';
  desc.value = todo.description || '';
  descLabel.append(desc);

  const dueLabel = document.createElement('label');
  dueLabel.textContent = 'Due date (YYYY-MM-DD)';
  const due = document.createElement('input');
  due.type = 'text';
  due.name = 'dueDate';
  due.value = todo.dueDate || '';
  due.placeholder = '2026-12-31';
  dueLabel.append(due);

  const row = document.createElement('div');
  row.className = 'edit-actions';
  const save = document.createElement('button');
  save.type = 'submit';
  save.textContent = 'Save';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => renderDisplay(li, todo));
  row.append(save, cancel);

  form.append(titleLabel, descLabel, dueLabel, row);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = { title: title.value.trim() };
    const description = desc.value.trim();
    const dueDate = due.value.trim();
    if (description) {
      body.description = description;
    }
    if (dueDate) {
      body.dueDate = dueDate;
    }
    try {
      const updated = await request(`/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      renderDisplay(li, updated);
      await loadList();
    } catch (err) {
      showError(listErrorEl, err.message);
    }
  });

  li.append(form);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

async function loadList() {
  clearError(listErrorEl);
  const params = {
    status: filterStatusEl.value,
    sort: sortByEl.value,
    direction: sortDirectionEl.value,
  };
  try {
    const todos = await request(buildUrl('/todos', params));
    renderList(todos);
  } catch (err) {
    showError(listErrorEl, err.message);
    renderList([]);
  }
}

function renderList(todos) {
  listEl.replaceChildren();
  emptyEl.hidden = todos.length > 0;
  for (const todo of todos) {
    listEl.append(buildItem(todo));
  }
}

async function toggleTodo(todo, completed) {
  try {
    await request(`/todos/${todo.id}/${completed ? 'complete' : 'incomplete'}`, {
      method: 'PATCH',
    });
    await loadList();
  } catch (err) {
    showError(listErrorEl, err.message);
  }
}

async function removeTodo(id) {
  try {
    await request(`/todos/${id}`, { method: 'DELETE' });
    await loadList();
  } catch (err) {
    showError(listErrorEl, err.message);
  }
}

async function viewById() {
  const id = viewIdEl.value.trim();
  viewResultEl.textContent = '';
  if (!id) {
    return;
  }
  try {
    const todo = await request(`/todos/${id}`);
    const li = buildItem(todo);
    viewResultEl.replaceChildren(li);
  } catch (err) {
    showError(viewResultEl, err.message);
  }
}

addFormEl.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError(addErrorEl);
  try {
    const created = await request('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addTodo()),
    });
    addFormEl.reset();
    viewIdEl.value = created.id;
    await loadList();
  } catch (err) {
    showError(addErrorEl, err.message);
  }
});

viewFormEl.addEventListener('submit', (event) => {
  event.preventDefault();
  viewById();
});

filterStatusEl.addEventListener('change', loadList);
sortByEl.addEventListener('change', loadList);
sortDirectionEl.addEventListener('change', loadList);
refreshEl.addEventListener('click', loadList);

loadList();