const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration credentials
const memApiKey = 'sk-mem-b125d563-4d51-476c-86fa-c138a04f51dd';
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://jxfowslxoinrbzvcpzbt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Zm93c2x4b2lucmJ6dmNwemJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNzg2NjksImV4cCI6MjA5NjY1NDY2OX0.m6O5F3T5jZ9HTvT09cq2_EOs_TVnTBByuieU5Knc3nE';

const supabase = createClient(supabaseUrl, supabaseKey);

// Clean collections name (remove emojis and format nice tags)
function cleanCollectionName(title) {
  if (!title) return '';
  let name = title.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');
  name = name.replace(/—.*$/, ''); // clean up dash subtitles
  name = name.trim();
  return name;
}

// Replace references to "Mem" with "OpenMemory" using word boundaries
function replaceMemReferences(text) {
  if (!text) return '';
  return text
    .replace(/\bmem\.ai\b/gi, 'OpenMemory')
    .replace(/\bmem\s+ai\b/gi, 'OpenMemory')
    .replace(/\bmem\b/gi, 'OpenMemory')
    .replace(/\bMem\b/g, 'OpenMemory')
    .replace(/\bMEM\b/g, 'OPENMEMORY');
}

// Basic markdown to HTML converter for Tiptap compatibility
function markdownToHtml(md) {
  if (!md) return '';
  
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Bullet lists (simple line lists)
  html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  
  // Paragraphs
  const lines = html.split(/\n\n+/);
  html = lines.map(line => {
    line = line.trim();
    if (!line) return '';
    if (line.startsWith('<h') || line.startsWith('<ul') || line.startsWith('<li>')) {
      return line;
    }
    return `<p>${line.replace(/\n/g, '<br />')}</p>`;
  }).join('');
  
  return html;
}

async function runMigration() {
  console.log("🚀 Starting Mem.ai to OpenMemory migration...");
  
  try {
    // 1. Fetch collections from Mem.ai
    console.log("\n1. Fetching Collections from Mem.ai...");
    const colRes = await fetch("https://api.mem.ai/v2/collections", {
      headers: { "Authorization": `Bearer ${memApiKey}` }
    });
    
    if (!colRes.ok) {
      throw new Error(`Failed to fetch collections: ${colRes.statusText}`);
    }
    
    const colJson = await colRes.json();
    const collectionsMap = {}; // id -> cleanName
    colJson.results.forEach(col => {
      const cleanName = cleanCollectionName(col.title);
      collectionsMap[col.id] = cleanName;
      console.log(`   Mapped: ${col.id} -> "${cleanName}"`);
    });
    
    // 2. Fetch notes listing from Mem.ai (with cursor pagination)
    console.log("\n2. Querying list of Notes from Mem.ai...");
    let notesUrl = "https://api.mem.ai/v2/notes?limit=100";
    let hasNextPage = true;
    const allNotesSummary = [];
    
    while (hasNextPage) {
      const notesRes = await fetch(notesUrl, {
        headers: { "Authorization": `Bearer ${memApiKey}` }
      });
      
      if (!notesRes.ok) {
        throw new Error(`Failed to fetch notes: ${notesRes.statusText}`);
      }
      
      const notesJson = await notesRes.json();
      if (notesJson.results && notesJson.results.length > 0) {
        allNotesSummary.push(...notesJson.results);
      }
      
      if (notesJson.next_page) {
        notesUrl = `https://api.mem.ai/v2/notes?limit=100&page=${encodeURIComponent(notesJson.next_page)}`;
        console.log(`   Fetched page page token. Total summaries collected so far: ${allNotesSummary.length}`);
      } else {
        hasNextPage = false;
      }
    }
    console.log(`   Done! Collected summaries for ${allNotesSummary.length} notes.`);
    
    // 3. Process each note (fetch details, replace references, convert to HTML, insert to DB)
    console.log("\n3. Migrating notes one by one...");
    for (let i = 0; i < allNotesSummary.length; i++) {
      const summary = allNotesSummary[i];
      const percent = Math.round(((i + 1) / allNotesSummary.length) * 100);
      console.log(`\n   [${i + 1}/${allNotesSummary.length}] (${percent}%) Processing note: "${summary.title || 'Untitled'}" (ID: ${summary.id})...`);
      
      // Fetch full note details
      const detailRes = await fetch(`https://api.mem.ai/v2/notes/${summary.id}`, {
        headers: { "Authorization": `Bearer ${memApiKey}` }
      });
      
      if (!detailRes.ok) {
        console.error(`   ❌ Failed to fetch details for note ${summary.id}: ${detailRes.statusText}`);
        continue;
      }
      
      const noteDetails = await detailRes.json();
      
      // Perform text replacement of Mem references
      const originalTitle = noteDetails.title || 'Untitled';
      const cleanTitle = replaceMemReferences(originalTitle);
      const originalContent = noteDetails.content || '';
      const cleanContent = replaceMemReferences(originalContent);
      
      // Convert Markdown content to HTML
      const htmlContent = markdownToHtml(cleanContent);
      
      // Insert note into Supabase, preserving timestamps
      const { data: insertedNote, error: insertError } = await supabase
        .from('notes')
        .insert({
          title: cleanTitle,
          content: htmlContent,
          created_at: noteDetails.created_at,
          updated_at: noteDetails.updated_at
        })
        .select()
        .single();
        
      if (insertError) {
        console.error(`   ❌ Failed to save note to database:`, insertError);
        continue;
      }
      
      console.log(`   Saved to OpenMemory DB as ID: ${insertedNote.id}`);
      
      // Handle collections/tags link
      const tagsToLink = noteDetails.collection_ids || [];
      if (tagsToLink.length > 0) {
        console.log(`   Processing tags for note...`);
        for (const colId of tagsToLink) {
          const tagName = collectionsMap[colId];
          if (!tagName) continue;
          
          // Check if tag already exists in tags database
          let { data: tagRow } = await supabase
            .from('tags')
            .select()
            .eq('name', tagName)
            .single();
            
          if (!tagRow) {
            const { data: newTag, error: tagInsertError } = await supabase
              .from('tags')
              .insert({ name: tagName })
              .select()
              .single();
              
            if (tagInsertError) {
              console.error(`     Failed to insert tag "${tagName}":`, tagInsertError);
              continue;
            }
            tagRow = newTag;
          }
          
          // Link tag to note
          const { error: linkError } = await supabase
            .from('note_tags')
            .insert({ note_id: insertedNote.id, tag_id: tagRow.id });
            
          if (linkError) {
            console.error(`     Failed to link note to tag "${tagName}":`, linkError);
          } else {
            console.log(`     Linked tag: #${tagName}`);
          }
        }
      }
    }
    
    console.log("\n🎉 Migration completed successfully!");
  } catch (err) {
    console.error("\n❌ Migration halted due to fatal error:", err);
  }
}

runMigration();
