// Throwaway stand-in for the Supabase client, used only by _test.html.
let seq = 0;
const rows = [
  { id: 'a', title: 'Write the schema', notes: 'RLS on every table', assignee: 'vic', status: 'todo', position: 1000 },
  { id: 'b', title: 'Pick a hosting plan', notes: null, assignee: null, status: 'todo', position: 2000 },
  { id: 'c', title: 'Drag and drop', notes: 'HTML5 DnD + arrow buttons', assignee: 'sam', status: 'in_progress', position: 1000 },
  { id: 'd', title: 'Decide on auth', notes: null, assignee: null, status: 'done', position: 1000 },
];

const ok = (data) => Promise.resolve({ data, error: null });

function table() {
  const api = {
    select: () => api,
    order: () => ok(rows.map((r) => ({ ...r }))),   // a fresh array, like the real client
    eq: () => ok(null),
    single: () => ok({ ...pending, id: 'new-' + ++seq }),
    update: (patch) => { Object.assign(rows.find((r) => r.id === lastId) ?? {}, patch); return api; },
    delete: () => api,
    insert: (row) => { pending = row; return api; },
    then: (res) => ok(null).then(res),
  };
  return api;
}

let pending = null;
let lastId = null;

export function createClient() {
  return {
    auth: {
      getSession: () => ok({ session: { user: {} } }),
      onAuthStateChange: () => {},
      signInWithPassword: () => ok({ user: {} }),
      signOut: () => ok(null),
    },
    from: () => table(),
    channel: () => ({
      on() { return this; },
      subscribe() { return this; },
      presenceState: () => ({}),
      track() {},
    }),
  };
}
