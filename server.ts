/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Setup file logging to debug crashes
const logFile = path.join(__dirname, 'server-debug.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => {
  const msg = new Date().toISOString() + ' LOG: ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') + '\n';
  logStream.write(msg);
  originalLog(...args);
};
console.error = (...args) => {
  const msg = new Date().toISOString() + ' ERR: ' + args.map(a => typeof a === 'object' ? (a.stack || JSON.stringify(a)) : a).join(' ') + '\n';
  logStream.write(msg);
  originalError(...args);
};

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

console.log('Server starting, log file at:', logFile);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '500mb' }));
  app.use(express.urlencoded({ limit: '500mb', extended: true }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'Firebase' });
  });

  app.get('/api/retable/workspaces', async (req, res) => {
    try {
      const apiKey = (req.headers['x-api-key'] as string) || process.env.RETABLE_API_KEY || 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM';
      
      if (apiKey === 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM') {
        console.log('Using default key - returning STHIC Workspace');
        return res.json({
          isSthicLive: true,
          data: {
            workspaces: [
              { id: 'ws-sthic-live', name: 'STHIC Production' }
            ]
          }
        });
      }

      const response = await fetch('https://api.retable.io/v1/public/workspaces', {
        headers: { 'ApiKey': apiKey }
      });
      if (!response.ok) {
        throw new Error(`Retable API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Error fetching workspaces, using demo fallback:', error);
      res.json({
        isDemo: true,
        data: {
          workspaces: [
            { id: 'ws-demo-01', name: 'Espace Démo - Suivi PM Retable (Fallback)' }
          ]
        }
      });
    }
  });

  app.get('/api/retable/projects', async (req, res) => {
    try {
      const apiKey = (req.headers['x-api-key'] as string) || process.env.RETABLE_API_KEY || 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM';
      const { workspaceId } = req.query;

      if (apiKey === 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM' || workspaceId === 'ws-sthic-live') {
        return res.json({
          isSthicLive: true,
          data: {
            projects: [
              { id: 'proj-sthic-live', name: 'Suivi PM & Maintenances' }
            ]
          }
        });
      }

      if (apiKey === 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM' || workspaceId === 'ws-demo-01') {
        return res.json({
          isDemo: true,
          data: {
            projects: [
              { id: 'proj-demo-01', name: 'Projet Maintenance Télécom 2026' }
            ]
          }
        });
      }

      if (!workspaceId) {
        return res.status(400).json({ error: 'workspaceId is required' });
      }
      const response = await fetch(`https://api.retable.io/v1/public/workspaces/${workspaceId}/projects`, {
        headers: { 'ApiKey': apiKey }
      });
      if (!response.ok) {
        throw new Error(`Retable API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Error fetching projects, using demo fallback:', error);
      res.json({
        isDemo: true,
        data: {
          projects: [
            { id: 'proj-demo-01', name: 'Projet Maintenance Télécom 2026 (Fallback)' }
          ]
        }
      });
    }
  });

  app.get('/api/retable/tables', async (req, res) => {
    try {
      const apiKey = (req.headers['x-api-key'] as string) || process.env.RETABLE_API_KEY || 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM';
      const { projectId } = req.query;

      if (apiKey === 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM' || projectId === 'proj-sthic-live') {
        return res.json({
          isSthicLive: true,
          data: {
            tables: [
              { id: 'tab-sthic-live', title: 'Planification PM (STHIC Live)' }
            ]
          }
        });
      }

      if (apiKey === 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM' || projectId === 'proj-demo-01') {
        return res.json({
          isDemo: true,
          data: {
            tables: [
              { id: 'tab-demo-01', title: 'Suivi PM Sénégal Global' }
            ]
          }
        });
      }

      if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
      }
      const response = await fetch(`https://api.retable.io/v1/public/projects/${projectId}/tables`, {
        headers: { 'ApiKey': apiKey }
      });
      if (!response.ok) {
        throw new Error(`Retable API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('Error fetching tables, using demo fallback:', error);
      res.json({
        isDemo: true,
        data: {
          tables: [
            { id: 'tab-demo-01', title: 'Suivi PM Sénégal Global (Fallback)' }
          ]
        }
      });
    }
  });

  app.get('/api/retable/data', async (req, res) => {
    try {
      const apiKey = (req.headers['x-api-key'] as string) || process.env.RETABLE_API_KEY || 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM';
      const { retableId } = req.query;

      if (apiKey === 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM' || retableId === 'tab-sthic-live') {
        console.log('Fetching live PM data from sthic-maintenances-generateurs.pages.dev');
        
        // 1. Fetch PM assignments
        const assignmentsRes = await fetch('https://sthic-maintenances-generateurs.pages.dev/api/pm-assignments', {
          headers: { 'x-api-key': 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM' }
        });
        if (!assignmentsRes.ok) {
          throw new Error(`Failed to fetch assignments from STHIC API: ${assignmentsRes.status}`);
        }
        const assignmentsJson = await assignmentsRes.json();
        const assignments = assignmentsJson.assignments || [];

        // 2. Fetch Sites to map Site Name
        const sitesMap = new Map();
        try {
          const sitesRes = await fetch('https://sthic-maintenances-generateurs.pages.dev/api/sites', {
            headers: { 'x-api-key': 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM' }
          });
          if (sitesRes.ok) {
            const sitesJson = await sitesRes.json();
            const sitesList = sitesJson.sites || [];
            sitesList.forEach((site: any) => {
              if (site.id) {
                sitesMap.set(String(site.id), site.nameSite || site.idSite || '');
              }
            });
          }
        } catch (siteErr) {
          console.error("Error fetching sites map:", siteErr);
        }

        // 3. Map to standard flat PM lines compatible with normalized keys
        const rows = assignments.map((asg: any) => {
          const siteName = sitesMap.get(String(asg.siteId)) || asg.siteCode || 'Site Inconnu';
          
          // Determine status translation
          let statusText = 'Planifié';
          if (asg.pmState === 'Closed Complete' || asg.closedAt) {
            statusText = 'Exécuté';
          } else if (asg.reprogrammationDate) {
            statusText = 'Replanifié';
          } else {
            // Check if plannedDate is in the past
            const pDate = new Date(asg.plannedDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (pDate < today) {
              statusText = 'En retard';
            }
          }

          return {
            id: asg.id,
            "ID": asg.siteCode || asg.siteId,
            "PM number": asg.pmNumber,
            "Nom du site": siteName,
            "Region": asg.zone || '',
            "PM Date": asg.plannedDate || '',
            "Types de PM": asg.maintenanceType || '',
            "FE names": asg.technicianName || '',
            "PM date execute": asg.closedAt || '',
            "PM date replanifiée": asg.reprogrammationDate || '',
            "status": statusText
          };
        });

        console.log(`Successfully mapped ${rows.length} PM assignments from STHIC live API`);
        return res.json({ success: true, isSthicLive: true, rows });
      }

      const demoRows = [
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

      if (apiKey === 'Si6JXVXPpNJ1xS7-IfS43OJUfrzlGUqeXY-A-IhFHHCnKwMVgF5xKfAn-dBZTGKM' || retableId === 'tab-demo-01') {
        const rows = demoRows.map((row: any) => {
          const flatRow: any = { id: row.id };
          Object.keys(row.cell_values).forEach((key) => {
            flatRow[key] = (row.cell_values as any)[key];
          });
          return flatRow;
        });
        return res.json({ success: true, isDemo: true, rows });
      }

      if (!retableId) {
        return res.status(400).json({ error: 'retableId is required' });
      }
      const apiUrl = `https://api.retable.io/v1/public/retable/${retableId}/data`;
      console.log(`Fetching Retable data from: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        headers: { 'ApiKey': apiKey }
      });
      if (!response.ok) {
        throw new Error(`Retable API error: ${response.status} ${response.statusText}`);
      }
      const json = await response.json();
      
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

      res.json({ success: true, rows });
    } catch (error: any) {
      console.error('Error fetching table data, using demo fallback:', error);
      const fallbackRows = [
        {
          id: "row-01",
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
        },
        {
          id: "row-02",
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
      ];
      res.json({ success: true, isDemo: true, rows: fallbackRows });
    }
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
        watch: {
          ignored: ['**/server-debug.log']
        }
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const serverInstance = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Set server timeouts to handle large uploads (though mostly handled by Firebase now)
  serverInstance.timeout = 600000; // 10 minutes
  serverInstance.keepAliveTimeout = 65000;
  serverInstance.headersTimeout = 66000;
}

startServer();
