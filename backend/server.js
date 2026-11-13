import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, 'data.json');
const PORT = Number(process.env.PORT || 4000);
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

const seed = {
  projects: [
    { id: 'proj-demo', name: 'Demo Web Application Review', description: 'Sample authorized assessment workspace. Replace with your own approved scope.', status: 'Active', createdAt: new Date().toISOString() }
  ],
  assets: [
    { id: 'asset-demo', projectId: 'proj-demo', name: 'Demo application', type: 'Web Application', identifier: 'demo.local (placeholder)', notes: 'Fictional asset for demonstration only.' }
  ],
  findings: [
    { id: 'finding-demo-1', projectId: 'proj-demo', assetId: 'asset-demo', title: 'Missing security headers (sample)', severity: 'medium', cvss: '5.3', status: 'Open', endpoint: 'Demo asset / response headers', description: 'This is a fictional example finding used to demonstrate the reporting workflow. It is not the result of a real scan.', evidence: 'Sample evidence only — replace with verified observations from an authorized assessment.', impact: 'Weak browser-side security controls may increase exposure to certain client-side attacks.', remediation: 'Review and configure suitable security headers such as Content-Security-Policy, X-Content-Type-Options and Referrer-Policy based on application requirements.', references: ['https://owasp.org/www-project-secure-headers/'], createdAt: new Date().toISOString() },
    { id: 'finding-demo-2', projectId: 'proj-demo', assetId: 'asset-demo', title: 'Verbose error message (sample)', severity: 'low', cvss: '3.1', status: 'In Progress', endpoint: 'Demo asset / error handling', description: 'Fictional example of an application returning overly detailed error information.', evidence: 'Sample only. No live target was contacted.', impact: 'Detailed errors can disclose implementation information to an observer.', remediation: 'Return generic client-facing errors and keep diagnostic details in protected server logs.', references: [], createdAt: new Date().toISOString() }
  ]
};

function loadData() {
  try {
    if (fs.existsSync(dataFile)) return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (error) { console.error('Could not read data store:', error.message); }
  fs.writeFileSync(dataFile, JSON.stringify(seed, null, 2));
  return structuredClone(seed);
}
let db = loadData();
function save() { fs.writeFileSync(dataFile, JSON.stringify(db, null, 2)); }
function send(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 100_000) reject(new Error('Request body too large')); });
    req.on('end', () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}
function cleanText(value, max = 4000) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function validSeverity(v) { return ['critical','high','medium','low','info'].includes(v); }
function validStatus(v) { return ['Open','In Progress','Resolved'].includes(v); }

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && origin !== allowedOrigin) return send(res, 403, { error: 'Origin not allowed' });
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const route = url.pathname;
  try {
    if (req.method === 'GET' && route === '/api/health') return send(res, 200, { ok: true, service: 'CyberGuard API' });
    if (req.method === 'GET' && route === '/api/overview') {
      const counts = { critical:0, high:0, medium:0, low:0, info:0 };
      db.findings.forEach(f => { if (counts[f.severity] !== undefined) counts[f.severity]++; });
      return send(res, 200, { projects:db.projects.length, assets:db.assets.length, findings:db.findings.length, open:db.findings.filter(f=>f.status!=='Resolved').length, counts, recent:[...db.findings].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5) });
    }
    if (req.method === 'GET' && route === '/api/projects') return send(res, 200, db.projects);
    if (req.method === 'POST' && route === '/api/projects') {
      const b = await readBody(req); const name = cleanText(b.name, 120);
      if (!name) return send(res, 400, { error: 'Project name is required.' });
      const item = { id:randomUUID(), name, description:cleanText(b.description), status:['Active','Completed','On Hold'].includes(b.status)?b.status:'Active', createdAt:new Date().toISOString() };
      db.projects.push(item); save(); return send(res, 201, item);
    }
    if (req.method === 'GET' && route === '/api/assets') return send(res, 200, db.assets);
    if (req.method === 'POST' && route === '/api/assets') {
      const b = await readBody(req); const name = cleanText(b.name, 120);
      if (!name || !db.projects.some(p=>p.id===b.projectId)) return send(res, 400, { error: 'A valid asset name and project are required.' });
      const item = { id:randomUUID(), projectId:b.projectId, name, type:['Web Application','Network','Mobile Application','API','Server','Other'].includes(b.type)?b.type:'Other', identifier:cleanText(b.identifier, 300), notes:cleanText(b.notes) };
      db.assets.push(item); save(); return send(res, 201, item);
    }
    if (req.method === 'GET' && route === '/api/findings') return send(res, 200, db.findings);
    if (req.method === 'POST' && route === '/api/findings') {
      const b = await readBody(req);
      if (!cleanText(b.title,160) || !validSeverity(b.severity) || !db.projects.some(p=>p.id===b.projectId)) return send(res,400,{error:'Title, valid severity and project are required.'});
      if (b.cvss !== '' && b.cvss != null && (!Number.isFinite(Number(b.cvss)) || Number(b.cvss)<0 || Number(b.cvss)>10)) return send(res,400,{error:'CVSS must be between 0 and 10.'});
      const item = { id:randomUUID(), projectId:b.projectId, assetId:db.assets.some(a=>a.id===b.assetId)?b.assetId:'', title:cleanText(b.title,160), severity:b.severity, cvss:b.cvss===''?'':String(b.cvss), status:validStatus(b.status)?b.status:'Open', endpoint:cleanText(b.endpoint,500), description:cleanText(b.description), evidence:cleanText(b.evidence), impact:cleanText(b.impact), remediation:cleanText(b.remediation), references:Array.isArray(b.references)?b.references.map(x=>cleanText(x,500)).filter(Boolean).slice(0,10):[], createdAt:new Date().toISOString() };
      db.findings.push(item); save(); return send(res,201,item);
    }
    const findingMatch = route.match(/^\/api\/findings\/([^/]+)$/);
    if (findingMatch && req.method === 'PUT') {
      const item = db.findings.find(f=>f.id===findingMatch[1]); if (!item) return send(res,404,{error:'Finding not found.'});
      const b = await readBody(req);
      if (b.title !== undefined) { const v=cleanText(b.title,160); if(!v) return send(res,400,{error:'Title cannot be empty.'}); item.title=v; }
      if (b.severity !== undefined) { if(!validSeverity(b.severity)) return send(res,400,{error:'Invalid severity.'}); item.severity=b.severity; }
      if (b.status !== undefined) { if(!validStatus(b.status)) return send(res,400,{error:'Invalid status.'}); item.status=b.status; }
      if (b.projectId !== undefined) { if(!db.projects.some(p=>p.id===b.projectId)) return send(res,400,{error:'Invalid project.'}); item.projectId=b.projectId; }
      for (const k of ['cvss','endpoint','description','evidence','impact','remediation']) if (b[k] !== undefined) item[k]=k==='cvss'?String(b[k]):cleanText(b[k]);
      if (b.assetId !== undefined) item.assetId=db.assets.some(a=>a.id===b.assetId)?b.assetId:'';
      if (b.references !== undefined) item.references=Array.isArray(b.references)?b.references.map(x=>cleanText(x,500)).filter(Boolean).slice(0,10):[];
      item.updatedAt=new Date().toISOString(); save(); return send(res,200,item);
    }
    if (findingMatch && req.method === 'DELETE') {
      const before=db.findings.length; db.findings=db.findings.filter(f=>f.id!==findingMatch[1]);
      if(db.findings.length===before) return send(res,404,{error:'Finding not found.'});
      save(); return send(res,200,{ok:true});
    }
    if (req.method === 'POST' && route === '/api/demo-assessment') {
      const b=await readBody(req);
      if (!db.projects.some(p=>p.id===b.projectId)) return send(res,400,{error:'Select a valid project first.'});
      const samples=[
        {title:'Security headers review required',severity:'medium',cvss:'5.3',endpoint:'Approved asset / response headers',description:'Demonstration observation: review the presence and suitability of browser security headers.',evidence:'Demo assessment placeholder. Replace with evidence collected during an authorized test.',impact:'Missing or weak headers can reduce browser-side defense in depth.',remediation:'Review Content-Security-Policy, X-Content-Type-Options, Referrer-Policy and other headers appropriate to the application.'},
        {title:'Error handling review required',severity:'low',cvss:'3.1',endpoint:'Approved asset / error handling',description:'Demonstration observation: verify that client-facing errors do not expose sensitive implementation details.',evidence:'Demo assessment placeholder. No target was contacted and no live scan was run.',impact:'Verbose errors may reveal implementation details.',remediation:'Return generic error messages to clients and retain diagnostic detail in protected server logs.'}
      ];
      const created=samples.map(s=>({...s,id:randomUUID(),projectId:b.projectId,assetId:'',status:'Open',impact:s.impact,references:[],createdAt:new Date().toISOString(),demo:true}));
      db.findings.push(...created); save(); return send(res,201,{created:created.length,findings:created,mode:'simulation'});
    }
    return send(res,404,{error:'Route not found.'});
  } catch (error) {
    console.error('API error:', error.message);
    return send(res, error.message==='Request body too large'?413:400, { error: error.message==='Request body too large'?'Request body too large.':'Invalid request.' });
  }
});
server.listen(PORT, () => console.log(`CyberGuard API running at http://localhost:${PORT}`));
