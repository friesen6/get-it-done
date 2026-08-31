// Fill these in from your Supabase project:
//   Supabase dashboard -> Project Settings -> Data API  (URL)
//   Supabase dashboard -> Project Settings -> API Keys  (anon / publishable key)
//
// The anon key is SAFE to commit to a public repo. It is designed to be
// public; row-level security in schema.sql is what actually protects the data.
// Never put the `service_role` key here.

export const SUPABASE_URL = 'https://sxoqtrphoyjmgsyftbfj.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4b3F0cnBob3lqbWdzeWZ0YmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxODg0MzEsImV4cCI6MjEwMzc2NDQzMX0.BBLudDQj9ganowlKc11TjVPqgfCkLYF4J3mtJPNSVnk';

// The shared team account. Everyone signs in as this identity by entering
// the team code; nobody types this address. Create the account once in the
// Supabase dashboard (Authentication -> Users -> Add user), and keep public
// signups DISABLED so this stays the only way in.
export const TEAM_ACCOUNT = 'team@getitdone.team';

// Board columns. Change these freely; `id` is what gets stored in the database,
// so if you rename an id, existing cards in that column need updating too.
export const COLUMNS = [
  { id: 'todo',        name: 'To Do' },
  { id: 'in_progress', name: 'In Progress' },
  { id: 'blocked',     name: 'Blocked' },
  { id: 'done',        name: 'Done' },
];
