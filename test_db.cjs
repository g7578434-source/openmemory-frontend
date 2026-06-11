const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jxfowslxoinrbzvcpzbt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Zm93c2x4b2lucmJ6dmNwemJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNzg2NjksImV4cCI6MjA5NjY1NDY2OX0.m6O5F3T5jZ9HTvT09cq2_EOs_TVnTBByuieU5Knc3nE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("1. Fetching notes...");
  const { data: fetchRes, error: fetchErr } = await supabase.from('notes').select('*').limit(3);
  if (fetchErr) {
    console.error("Fetch notes failed:", fetchErr);
    return;
  }
  console.log("Fetch notes success. Found:", fetchRes.length);

  console.log("2. Inserting a temporary test note...");
  const { data: insertRes, error: insertErr } = await supabase
    .from('notes')
    .insert({ title: 'Test Delete Note', content: 'Testing RLS Delete' })
    .select()
    .single();

  if (insertErr) {
    console.error("Insert failed:", insertErr);
    return;
  }
  console.log("Insert success. Created note ID:", insertRes.id);

  console.log("3. Attempting to delete the note...");
  const { error: deleteErr } = await supabase
    .from('notes')
    .delete()
    .eq('id', insertRes.id);

  if (deleteErr) {
    console.error("Delete failed:", deleteErr);
  } else {
    console.log("Delete success! RLS policy is configured correctly.");
  }
}

run();
