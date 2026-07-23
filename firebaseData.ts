import { GlobalFileRow } from './types';

// Client-side local data storage using localStorage

export const saveToFirebase = async (data: GlobalFileRow[], append: boolean = false) => {
  let finalData = data;
  if (append) {
    const existing = await fetchFromFirebase();
    const appended = [...existing];
    
    data.forEach(row => {
      // Find a matching row in the existing list by N° SWO, or PM number
      const idx = appended.findIndex(r => {
        // Match by N° SWO if both have a valid SWO number
        if (row["N° SWO"] && r["N° SWO"] && String(row["N° SWO"]).trim() !== "" && String(row["N° SWO"]).trim() === String(r["N° SWO"]).trim()) {
          return true;
        }
        // Match by PM number if both have a valid PM number
        if (row["PM number"] && r["PM number"] && String(row["PM number"]).trim() !== "" && String(row["PM number"]).trim() === String(r["PM number"]).trim()) {
          return true;
        }
        return false;
      });

      if (idx !== -1) {
        // Replace existing row entirely with the new loaded row, discarding previous values
        appended[idx] = row;
      } else {
        // Append as a new row
        appended.push(row);
      }
    });

    // Deduplicate the entire dataset to ensure absolute integrity and zero duplicates
    const uniqueRows: GlobalFileRow[] = [];
    const seenSWOs = new Set<string>();
    const seenPMs = new Set<string>();

    appended.forEach(row => {
      const swo = row["N° SWO"] ? String(row["N° SWO"]).trim() : "";
      const pm = row["PM number"] ? String(row["PM number"]).trim() : "";

      let isDuplicate = false;
      if (swo !== "" && seenSWOs.has(swo)) isDuplicate = true;
      if (pm !== "" && seenPMs.has(pm)) isDuplicate = true;

      if (!isDuplicate) {
        if (swo !== "") seenSWOs.add(swo);
        if (pm !== "") seenPMs.add(pm);
        uniqueRows.push(row);
      } else {
        // Replace previous duplicate entry with the newer one to keep newest values
        const existingIdx = uniqueRows.findIndex(r => {
          if (swo !== "" && r["N° SWO"] && String(r["N° SWO"]).trim() === swo) return true;
          if (pm !== "" && r["PM number"] && String(r["PM number"]).trim() === pm) return true;
          return false;
        });
        if (existingIdx !== -1) {
          uniqueRows[existingIdx] = row;
        } else {
          uniqueRows.push(row);
        }
      }
    });

    finalData = uniqueRows;
  } else {
    // Even on direct save/replace, deduplicate the input list to avoid any internal duplicates
    const uniqueRows: GlobalFileRow[] = [];
    const seenSWOs = new Set<string>();
    const seenPMs = new Set<string>();

    data.forEach(row => {
      const swo = row["N° SWO"] ? String(row["N° SWO"]).trim() : "";
      const pm = row["PM number"] ? String(row["PM number"]).trim() : "";

      let isDuplicate = false;
      if (swo !== "" && seenSWOs.has(swo)) isDuplicate = true;
      if (pm !== "" && seenPMs.has(pm)) isDuplicate = true;

      if (!isDuplicate) {
        if (swo !== "") seenSWOs.add(swo);
        if (pm !== "") seenPMs.add(pm);
        uniqueRows.push(row);
      } else {
        const existingIdx = uniqueRows.findIndex(r => {
          if (swo !== "" && r["N° SWO"] && String(r["N° SWO"]).trim() === swo) return true;
          if (pm !== "" && r["PM number"] && String(r["PM number"]).trim() === pm) return true;
          return false;
        });
        if (existingIdx !== -1) {
          uniqueRows[existingIdx] = row;
        } else {
          uniqueRows.push(row);
        }
      }
    });

    finalData = uniqueRows;
  }
  localStorage.setItem('globalFiles_data', JSON.stringify(finalData));
};

export const saveCommentToFirebase = async (siteId: string, category: string, comment: string) => {
  const comments = await fetchCommentsFromFirebase();
  const index = comments.findIndex(c => c.site_id === siteId && c.category === category);
  if (index !== -1) {
    comments[index].comment = comment;
  } else {
    comments.push({ site_id: siteId, category, comment });
  }
  localStorage.setItem('globalFiles_comments', JSON.stringify(comments));
};

export const fetchCommentsFromFirebase = async (): Promise<{site_id: string, category: string, comment: string}[]> => {
  const saved = localStorage.getItem('globalFiles_comments');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing local comments:', e);
      return [];
    }
  }
  return [];
};

export const fetchFromFirebase = async (): Promise<GlobalFileRow[]> => {
  const saved = localStorage.getItem('globalFiles_data');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing local global files data:', e);
      return [];
    }
  }
  return [];
};

export const clearFirebaseData = async () => {
  localStorage.removeItem('globalFiles_data');
};

