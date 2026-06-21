/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from './supabase';

export const DEFAULT_FOLDER_GROUPS = [
  {
    section: 'WORKSPACE',
    tags: ['research', 'rejected-ideas'],
  },
  {
    section: 'SYSTEM',
    tags: ['template', 'protocol'],
  },
];

export async function getSidebarSections(): Promise<any[]> {
  // Try loading from localStorage first as the quickest state or fallback
  const fallback = localStorage.getItem('sidebar_sections');
  let localData: any[] | null = null;
  if (fallback) {
    try {
      localData = JSON.parse(fallback);
    } catch (e) {
      console.warn("Failed to parse sidebar_sections from localStorage", e);
    }
  }

  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('value')
      .eq('key', 'sidebar_sections')
      .maybeSingle();

    if (error) {
      console.warn("Could not load sidebar preferences from Supabase (may be missing user_preferences table). Using local fallback:", error);
      return localData || DEFAULT_FOLDER_GROUPS;
    }

    if (data && data.value) {
      // Keep localStorage in sync with database if DB works
      try {
        localStorage.setItem('sidebar_sections', JSON.stringify(data.value));
      } catch { // ignore localStorage errors
      }
      return data.value as any[];
    }
  } catch (err) {
    console.error("Failed to query user_preferences table from Supabase:", err);
  }
  return localData || DEFAULT_FOLDER_GROUPS;
}

export async function saveSidebarSections(sections: any[]): Promise<boolean> {
  // Always save to localStorage immediately to guarantee local persistence
  try {
    localStorage.setItem('sidebar_sections', JSON.stringify(sections));
  } catch (err) {
    console.error("Failed to save sidebar preferences to localStorage:", err);
  }

  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          key: 'sidebar_sections',
          value: sections,
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error("Error saving sidebar preferences to Supabase:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to save user_preferences to Supabase:", err);
    return false;
  }
}

export const DEFAULT_DASHBOARD_PREFERENCES = {
  visibleMetrics: ['launched', 'validated', 'awaiting-test', 'raw-idea', 'killed'],
  showActiveContext: true,
  showRecentActivity: true,
  customMetrics: [],
  customSections: []
};

export async function getDashboardPreferences(): Promise<any> {
  const fallback = localStorage.getItem('dashboard_preferences');
  let localData: any = null;
  if (fallback) {
    try {
      localData = JSON.parse(fallback);
    } catch (e) {}
  }

  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('value')
      .eq('key', 'dashboard_preferences')
      .maybeSingle();

    if (error) {
      return localData || DEFAULT_DASHBOARD_PREFERENCES;
    }

    if (data && data.value) {
      try {
        localStorage.setItem('dashboard_preferences', JSON.stringify(data.value));
      } catch {}
      return { ...DEFAULT_DASHBOARD_PREFERENCES, ...data.value }; // Merge with defaults
    }
  } catch (err) {}
  
  return localData || DEFAULT_DASHBOARD_PREFERENCES;
}

export async function saveDashboardPreferences(prefs: any): Promise<boolean> {
  try {
    localStorage.setItem('dashboard_preferences', JSON.stringify(prefs));
  } catch (err) {}

  try {
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        {
          key: 'dashboard_preferences',
          value: prefs,
        },
        { onConflict: 'key' }
      );

    if (error) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}
