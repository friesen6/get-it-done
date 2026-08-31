import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY, COLUMNS } from './config.js';

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const $ = (id) => document.getElementById(id);
const GAP = 1000;

let cards = [];          // local mirror of the `cards` table
let me = null;           // the signed-in user
let dragId = null;

/* ------------------------------------------------------------------ boot */

async function boot() {
  const { data: { session } } = await db.auth.getSession();
  $('boot').hidden = true;
  session ? await startBoard(session.user) : showAuth();

  db.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && !me) startBoard(session.user);
    if (event === 'SIGNED_OUT') location.reload();
  });
}

function showAuth() {
  $('auth').hidden = false;
  $('email').focus();
}

async function startBoard(user) {
  me = user;
  $('auth').hidden = true;
  $('app').hidden = false;
  $('who').textContent = user.email;

  const { data, error } = await db
    .from('cards')
    .select('*')
    .order('position', { ascending: true });

  if (error) {
    // Almost always means this email isn't in `allowed_emails` yet.
    document.body.innerHTML =
      '<div class="boot">Signed in as ' + user.email +
      ', but this account has no access to the board.<br>' +
      'Ask whoever set it up to add your email, then reload.</div>';
    return;
  }

  cards = data;
  render();
  listen();
}

/* -------------------------------------------------------------- realtime */

function listen() {
  const channel = db.channel('board');

  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, ({ eventType, new: row, old }) => {
    if (eventType === 'INSERT') upsertLocal(row);
    if (eventType === 'UPDATE') upsertLocal(row);
    if (eventType === 'DELETE') cards = cards.filter((c) => c.id !== old.id);
    render();
  });

  // Lightweight "who else has this open" indicator.
  channel.on('presence', { event: 'sync' }, () => {
    const others = new Set();
    for (const entries of Object.values(channel.presenceState())) {
      for (const e of entries) if (e.email && e.email !== me.email) others.add(e.email);
    }
    $('presence').textContent = others.size ? `${others.size} other${others.size > 1 ? 's' : ''} viewing` : '';
    $('presence').title = [...others].join(', ');
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') channel.track({ email: me.email });
  });
}

function upsertLocal(row) {
  const i = cards.findIndex((c) => c.id === row.id);
  i === -1 ? cards.push(row) : (cards[i] = row);
}

/* ---------------------------------------------------------------- render */

const inColumn = (columnId) =>
  cards.filter((c) => c.status === columnId).sort((a, b) => a.position - b.position);

function render() {
  const board = $('board');
  const focused = document.activeElement?.dataset?.id;
  board.replaceChildren(...COLUMNS.map(renderColumn));
  if (focused) board.querySelector(`[data-id="${focused}"]`)?.focus();
}

function renderColumn(col) {
  const list = inColumn(col.id);

  const head = el('div', 'column-head', [
    el('span', null, col.name),
    el('span', 'count', String(list.length)),
  ]);

  const cardList = el('div', 'cards', list.map((c) => renderCard(c, col)));

  const add = el('button', 'add', '+ Add a card');
  add.addEventListener('click', () => openEditor(null, col.id));

  const column = el('section', 'column', [head, cardList, add]);

  cardList.addEventListener('dragover', (e) => {
    if (!dragId) return;
    e.preventDefault();
    column.classList.add('drag-over');
  });
  cardList.addEventListener('dragleave', () => column.classList.remove('drag-over'));
  cardList.addEventListener('drop', (e) => {
    e.preventDefault();
    column.classList.remove('drag-over');
    if (dragId) moveCard(dragId, col.id, dropIndex(cardList, e.clientY));
  });

  return column;
}

function renderCard(card, col) {
  const node = el('div', 'card');
  node.tabIndex = 0;
  node.draggable = true;
  node.dataset.id = card.id;

  node.append(el('div', 'card-title', card.title));
  if (card.notes) node.append(el('div', 'card-notes', card.notes));

  const foot = el('div', 'card-foot');
  if (card.assignee) foot.append(el('span', 'assignee', card.assignee));

  // Arrow buttons: the drag-and-drop escape hatch for touch and keyboard.
  const i = COLUMNS.indexOf(col);
  const left = el('button', null, '←');
  const right = el('button', null, '→');
  left.disabled = i === 0;
  right.disabled = i === COLUMNS.length - 1;
  left.title = 'Move left';
  right.title = 'Move right';
  left.addEventListener('click', (e) => { e.stopPropagation(); shift(card, -1); });
  right.addEventListener('click', (e) => { e.stopPropagation(); shift(card, 1); });
  foot.append(el('div', 'nudge', [left, right]));
  node.append(foot);

  node.addEventListener('click', () => openEditor(card));
  node.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEditor(card); }
  });
  node.addEventListener('dragstart', (e) => {
    dragId = card.id;
    node.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
  });
  node.addEventListener('dragend', () => {
    dragId = null;
    node.classList.remove('dragging');
  });

  return node;
}

/** Index a dropped card should land at, based on where the cursor is. */
function dropIndex(container, y) {
  const others = [...container.querySelectorAll('.card:not(.dragging)')];
  const i = others.findIndex((n) => {
    const box = n.getBoundingClientRect();
    return y < box.top + box.height / 2;
  });
  return i === -1 ? others.length : i;
}

/* ----------------------------------------------------------------- moves */

function shift(card, direction) {
  const i = COLUMNS.findIndex((c) => c.id === card.status);
  const target = COLUMNS[i + direction];
  if (target) moveCard(card.id, target.id, inColumn(target.id).length);
}

async function moveCard(id, columnId, index) {
  const card = cards.find((c) => c.id === id);
  if (!card) return;

  const position = positionFor(columnId, index, id);
  if (card.status === columnId && card.position === position) return;

  const before = { status: card.status, position: card.position };
  Object.assign(card, { status: columnId, position });   // optimistic
  render();

  const { error } = await db.from('cards').update({ status: columnId, position }).eq('id', id);
  if (error) {
    Object.assign(card, before);                          // roll back
    render();
    alert('Could not move that card: ' + error.message);
  }
}

/** A fractional position that slots a card between its new neighbours. */
function positionFor(columnId, index, excludeId) {
  const list = inColumn(columnId).filter((c) => c.id !== excludeId);
  const prev = list[index - 1];
  const next = list[index];
  if (!prev && !next) return GAP;
  if (!prev) return next.position - GAP;
  if (!next) return prev.position + GAP;
  return (prev.position + next.position) / 2;
}

/* ---------------------------------------------------------------- editor */

let editing = null;
let editingColumn = null;

function openEditor(card, columnId) {
  editing = card;
  editingColumn = columnId;
  $('card-title').value = card?.title ?? '';
  $('card-notes').value = card?.notes ?? '';
  $('card-assignee').value = card?.assignee ?? '';
  $('card-delete').hidden = !card;
  $('editor').showModal();
  $('card-title').focus();
}

$('editor').addEventListener('close', async () => {
  const action = $('editor').returnValue;
  const card = editing;
  editing = null;
  if (action === 'cancel' || action === '') return;

  if (action === 'delete') {
    if (!confirm(`Delete "${card.title}"?`)) return;
    cards = cards.filter((c) => c.id !== card.id);
    render();
    const { error } = await db.from('cards').delete().eq('id', card.id);
    if (error) alert('Could not delete: ' + error.message);
    return;
  }

  const fields = {
    title: $('card-title').value.trim(),
    notes: $('card-notes').value.trim() || null,
    assignee: $('card-assignee').value.trim() || null,
  };
  if (!fields.title) return;

  if (card) {
    Object.assign(card, fields);
    render();
    const { error } = await db.from('cards').update(fields).eq('id', card.id);
    if (error) alert('Could not save: ' + error.message);
  } else {
    const row = {
      ...fields,
      status: editingColumn,
      position: positionFor(editingColumn, inColumn(editingColumn).length),
    };
    const { data, error } = await db.from('cards').insert(row).select().single();
    if (error) return alert('Could not add that card: ' + error.message);
    upsertLocal(data);
    render();
  }
});

/* ------------------------------------------------------------------ auth */

$('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('auth-msg');
  const button = e.target.querySelector('button');
  button.disabled = true;
  msg.className = 'auth-msg';
  msg.textContent = 'Sending…';

  const { error } = await db.auth.signInWithOtp({
    email: $('email').value.trim(),
    options: { emailRedirectTo: location.href.split('#')[0] },
  });

  button.disabled = false;
  if (error) {
    msg.className = 'auth-msg error';
    msg.textContent = error.message;
  } else {
    msg.textContent = 'Check your email for the sign-in link.';
  }
});

$('signout').addEventListener('click', () => db.auth.signOut());

/* ----------------------------------------------------------------- utils */

function el(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (Array.isArray(content)) node.append(...content);
  else if (content != null) node.textContent = content;   // textContent: never HTML
  return node;
}

boot();
