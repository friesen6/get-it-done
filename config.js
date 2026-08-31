// Fill these in from your Supabase project:
//   Supabase dashboard -> Project Settings -> Data API  (URL)
//   Supabase dashboard -> Project Settings -> API Keys  (anon / publishable key)
//
// The anon key is SAFE to commit to a public repo. It is designed to be
// public; row-level security in schema.sql is what actually protects the data.
// Never put the `service_role` key here.

export const SUPABASE_URL = 'https://YOUR-PROJECT-REF.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

// Board columns. Change these freely; `id` is what gets stored in the database,
// so if you rename an id, existing cards in that column need updating too.
export const COLUMNS = [
  { id: 'todo',        name: 'To Do' },
  { id: 'in_progress', name: 'In Progress' },
  { id: 'blocked',     name: 'Blocked' },
  { id: 'done',        name: 'Done' },
];
