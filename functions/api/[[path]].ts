/* eslint-disable */
export const onRequest = async (context: any) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Set up standard CORS headers for maximum compatibility
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, ApiKey',
  };

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const getResponse = async () => {
    // 1. GET /api/health
    if (pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', database: 'Firebase' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract apiKey from request headers or Cloudflare environment bindings only.
    const apiKey = request.headers.get('x-api-key') || request.headers.get('ApiKey') || env.RETABLE_API_KEY || null;

    if (pathname.startsWith('/api/retable/') && !apiKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing RETABLE_API_KEY' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 2. GET /api/retable/workspaces
    if (pathname === '/api/retable/workspaces') {
      try {
        const response = await fetch('https://api.retable.io/v1/public/workspaces', {
          headers: { 'ApiKey': apiKey }
        });
        if (!response.ok) {
          throw new Error(`Retable API error: ${response.status}`);
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        return new Response(JSON.stringify({
          isDemo: true,
          data: {
            workspaces: [
              { id: 'ws-demo-01', name: 'Espace Démo - Suivi PM Retable (Fallback)' }
            ]
          }
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 3. GET /api/retable/projects
    if (pathname === '/api/retable/projects') {
      const workspaceId = url.searchParams.get('workspaceId');

      if (!workspaceId) {
        return new Response(JSON.stringify({ error: 'workspaceId is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      try {
        const response = await fetch(`https://api.retable.io/v1/public/workspaces/${workspaceId}/projects`, {
          headers: { 'ApiKey': apiKey }
        });
        if (!response.ok) throw new Error(`Retable API error: ${response.status}`);
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        return new Response(JSON.stringify({
          isDemo: true,
          data: {
            projects: [
              { id: 'proj-demo-01', name: 'Projet Maintenance Télécom 2026 (Fallback)' }
            ]
          }
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 4. GET /api/retable/tables
    if (pathname === '/api/retable/tables') {
      const projectId = url.searchParams.get('projectId');

      if (!projectId) {
        return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      try {
        const response = await fetch(`https://api.retable.io/v1/public/projects/${projectId}/tables`, {
          headers: { 'ApiKey': apiKey }
        });
        if (!response.ok) throw new Error(`Retable API error: ${response.status}`);
        const data = await response.json();
        return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        return new Response(JSON.stringify({
          isDemo: true,
          data: {
            tables: [
              { id: 'tab-demo-01', title: 'Suivi PM Sénégal Global (Fallback)' }
            ]
          }
        }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // 5. GET /api/retable/data
    if (pathname === '/api/retable/data') {
      const retableId = url.searchParams.get('retableId');

      if (!retableId) {
        return new Response(JSON.stringify({ error: 'retableId is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      try {
        const response = await fetch(`https://api.retable.io/v1/public/retable/${retableId}/data`, {
          headers: { 'ApiKey': apiKey }
        });
        if (!response.ok) throw new Error(`Retable API error: ${response.status}`);
        const json: any = await response.json();

        let rawRows = [];
        if (json && json.data && Array.isArray(json.data.rows)) {
          rawRows = json.data.rows;
        } else if (json && Array.isArray(json.rows)) {
          rawRows = json.rows;
        } else if (Array.isArray(json)) {
          rawRows = json;
        }

        const rows = rawRows.map((row: any) => {
          const flatRow: any = { id: row.row_id || row.id };
          if (Array.isArray(row.columns)) {
            row.columns.forEach((col: any) => {
              if (col && col.name) {
                flatRow[col.name] = col.val;
              }
            });
          } else if (row.cell_values) {
            Object.keys(row.cell_values).forEach((key) => {
              flatRow[key] = row.cell_values[key];
            });
          } else {
            Object.keys(row).forEach((k) => {
              if (k !== 'columns' && k !== 'cell_values') {
                flatRow[k] = row[k];
              }
            });
          }
          return flatRow;
        });

        return new Response(JSON.stringify({ success: true, rows }), { headers: { 'Content-Type': 'application/json' } });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Unable to fetch Retable data' }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  };

  const response = await getResponse();
  
  // Attach CORS headers to response
  Object.entries(corsHeaders).forEach(([key, val]) => {
    response.headers.set(key, val);
  });

  return response;
};

function getDemoRows() {
  return [
    {
      id: "row-01",
      cell_values: {
        "ID": "SITE_DK_01",
        "PM number": "PM-2026-1001",
        "Nom du site": "Site Dakar Plateau",
        "Region": "DAKAR",
        "PM Date": "2026-07-23",
        "Types de PM": "Trimestrielle",
        "FE names": "Ibrahima Ndiaye",
        "PM date execute": "2026-07-23",
        "PM date replanifiée": "",
        "status": "Exécuté"
      }
    },
    {
      id: "row-02",
      cell_values: {
        "ID": "SITE_TH_02",
        "PM number": "PM-2026-1002",
        "Nom du site": "Site Thiès Gare",
        "Region": "THIES",
        "PM Date": "2026-07-23",
        "Types de PM": "Semestrielle",
        "FE names": "Moustapha Diop",
        "PM date execute": "",
        "PM date replanifiée": "",
        "status": "Planifié"
      }
    },
    {
      id: "row-03",
      cell_values: {
        "ID": "SITE_SL_03",
        "PM number": "PM-2026-1003",
        "Nom du site": "Site Saint-Louis Nord",
        "Region": "SAINT-LOUIS",
        "PM Date": "2026-07-23",
        "Types de PM": "Annuelle",
        "FE names": "Amadou Sow",
        "PM date execute": "",
        "PM date replanifiée": "2026-07-25",
        "status": "Replanifié"
      }
    },
    {
      id: "row-04",
      cell_values: {
        "ID": "SITE_ZG_04",
        "PM number": "PM-2026-1004",
        "Nom du site": "Site Ziguinchor Centre",
        "Region": "ZIGUINCHOR",
        "PM Date": "2026-07-23",
        "Types de PM": "Mensuelle",
        "FE names": "Fatou Fall",
        "PM date execute": "",
        "PM date replanifiée": "",
        "status": "En retard"
      }
    },
    {
      id: "row-05",
      cell_values: {
        "ID": "SITE_KL_05",
        "PM number": "PM-2026-1005",
        "Nom du site": "Site Kaolack Marché",
        "Region": "KAOLACK",
        "PM Date": "2026-07-23",
        "Types de PM": "Trimestrielle",
        "FE names": "Ousmane Cissé",
        "PM date execute": "2026-07-23",
        "PM date replanifiée": "",
        "status": "Exécuté"
      }
    },
    {
      id: "row-06",
      cell_values: {
        "ID": "SITE_DK_06",
        "PM number": "PM-2026-1006",
        "Nom du site": "Site Dakar Almadies",
        "Region": "DAKAR",
        "PM Date": "2026-07-24",
        "Types de PM": "Trimestrielle",
        "FE names": "Ibrahima Ndiaye",
        "PM date execute": "",
        "PM date replanifiée": "",
        "status": "Planifié"
      }
    },
    {
      id: "row-07",
      cell_values: {
        "ID": "SITE_TH_07",
        "PM number": "PM-2026-1007",
        "Nom du site": "Site Thiès Route",
        "Region": "THIES",
        "PM Date": "2026-07-22",
        "Types de PM": "Mensuelle",
        "FE names": "Moustapha Diop",
        "PM date execute": "2026-07-22",
        "PM date replanifiée": "",
        "status": "Exécuté"
      }
    }
  ];
}
