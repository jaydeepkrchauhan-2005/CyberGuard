import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, LayoutDashboard, FolderKanban, Server, Bug, FileText,
  Plus, Search, Bell, ChevronDown, ArrowUpRight, Activity, AlertTriangle,
  CheckCircle2, Clock3, Download, Printer, Pencil, Trash2, X, RefreshCw,
  LockKeyhole, ScanSearch, ClipboardCheck, ExternalLink, Menu
} from 'lucide-react';

const API = 'http://localhost:4000/api';
const SEVERITIES = [
  { key:'critical', label:'Critical', color:'#f06464' },
  { key:'high', label:'High', color:'#f39a57' },
  { key:'medium', label:'Medium', color:'#e8c66a' },
  { key:'low', label:'Low', color:'#65b9a6' },
  { key:'info', label:'Info', color:'#8a9caf' },
];
const EMPTY_FINDING = { projectId:'', assetId:'', title:'', severity:'medium', cvss:'', status:'Open', endpoint:'', description:'', evidence:'', impact:'', remediation:'', referencesText:'' };
const NAV = [
  { id:'overview', label:'Overview', icon:LayoutDashboard, group:'Workspace' },
  { id:'projects', label:'Projects', icon:FolderKanban, group:'Workspace' },
  { id:'assets', label:'Assets', icon:Server, group:'Workspace' },
  { id:'findings', label:'Findings', icon:Bug, group:'Security' },
  { id:'reports', label:'Report generator', icon:FileText, group:'Security' },
];

async function api(path, options={}) {
  const response = await fetch(`${API}${path}`, {
    headers:{'Content-Type':'application/json', ...(options.headers||{})},
    ...options,
  });
  const data = await response.json().catch(()=>({error:'Unexpected server response.'}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
function dateLabel(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined,{day:'2-digit',month:'short',year:'numeric'});
}
function Severity({value}) {
  const item=SEVERITIES.find(s=>s.key===value)||SEVERITIES[4];
  return <span className="severity-pill" style={{'--sev':item.color}}><i />{item.label}</span>;
}
function Status({value}) {
  return <span className={`status-pill ${String(value||'Open').toLowerCase().replaceAll(' ','-')}`}>{value||'Open'}</span>;
}
function StatCard({label,value,sub,icon:Icon,tone}) {
  return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18}/></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-sub">{sub}</div></div>;
}
function Empty({title,body,action}) {
  return <div className="empty-state"><div className="empty-icon"><ClipboardCheck size={22}/></div><h3>{title}</h3><p>{body}</p>{action}</div>;
}
function Field({label,children,wide=false}) {
  return <label className={`form-field ${wide?'wide':''}`}><span>{label}</span>{children}</label>;
}

export default function App() {
  const [page,setPage]=useState('overview');
  const [projects,setProjects]=useState([]);
  const [assets,setAssets]=useState([]);
  const [findings,setFindings]=useState([]);
  const [overview,setOverview]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [query,setQuery]=useState('');
  const [severityFilter,setSeverityFilter]=useState('all');
  const [statusFilter,setStatusFilter]=useState('all');
  const [projectForm,setProjectForm]=useState({name:'',description:'',status:'Active'});
  const [assetForm,setAssetForm]=useState({projectId:'',name:'',type:'Web Application',identifier:'',notes:''});
  const [findingDraft,setFindingDraft]=useState(EMPTY_FINDING);
  const [editingFinding,setEditingFinding]=useState(null);
  const [showFindingForm,setShowFindingForm]=useState(false);
  const [reportProject,setReportProject]=useState('');
  const [reportSummary,setReportSummary]=useState('');
  const [mobileNav,setMobileNav]=useState(false);
  const [busy,setBusy]=useState(false);

  async function refresh(showLoader=false) {
    if(showLoader) setLoading(true);
    try {
      const [p,a,f,o]=await Promise.all([api('/projects'),api('/assets'),api('/findings'),api('/overview')]);
      setProjects(p); setAssets(a); setFindings(f); setOverview(o);
      setReportProject(current=>current||p[0]?.id||'');
      setError('');
    } catch(e) { setError(`${e.message}. Start the API server and try again.`); }
    finally { setLoading(false); }
  }
  useEffect(()=>{refresh(true);},[]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),3800);return()=>clearTimeout(t);},[notice]);

  const counts=useMemo(()=>SEVERITIES.reduce((acc,s)=>({...acc,[s.key]:findings.filter(f=>f.severity===s.key).length}),{}),[findings]);
  const filteredFindings=useMemo(()=>findings.filter(f=>{
    const hay=[f.title,f.description,f.endpoint,f.severity,f.status].join(' ').toLowerCase();
    return hay.includes(query.toLowerCase())&&(severityFilter==='all'||f.severity===severityFilter)&&(statusFilter==='all'||f.status===statusFilter);
  }).sort((a,b)=>SEVERITIES.findIndex(s=>s.key===a.severity)-SEVERITIES.findIndex(s=>s.key===b.severity)),[findings,query,severityFilter,statusFilter]);
  const selectedReportFindings=findings.filter(f=>!reportProject||f.projectId===reportProject);
  const selectedProject=projects.find(p=>p.id===reportProject);
  const reportCounts=SEVERITIES.reduce((acc,s)=>({...acc,[s.key]:selectedReportFindings.filter(f=>f.severity===s.key).length}),{});

  async function createProject(e) {
    e.preventDefault(); if(!projectForm.name.trim())return;
    setBusy(true);
    try { await api('/projects',{method:'POST',body:JSON.stringify(projectForm)});setProjectForm({name:'',description:'',status:'Active'});setNotice('Project created successfully.');await refresh(); }
    catch(e){setNotice(e.message);} finally{setBusy(false);}
  }
  async function createAsset(e) {
    e.preventDefault(); if(!assetForm.name.trim()||!assetForm.projectId)return;
    setBusy(true);
    try { await api('/assets',{method:'POST',body:JSON.stringify(assetForm)});setAssetForm({projectId:'',name:'',type:'Web Application',identifier:'',notes:''});setNotice('Asset added successfully.');await refresh(); }
    catch(e){setNotice(e.message);} finally{setBusy(false);}
  }
  function startNewFinding() {
    setEditingFinding(null);setFindingDraft({...EMPTY_FINDING,projectId:projects[0]?.id||''});setShowFindingForm(true);
  }
  function editFinding(f) {
    setEditingFinding(f.id);setFindingDraft({...f,referencesText:(f.references||[]).join('\n')});setShowFindingForm(true);
  }
  async function saveFinding(e) {
    e.preventDefault();
    if(!findingDraft.title.trim()||!findingDraft.projectId){setNotice('Add a finding title and select a project.');return;}
    const payload={...findingDraft,references:findingDraft.referencesText.split('\n').map(s=>s.trim()).filter(Boolean)};
    delete payload.referencesText;
    setBusy(true);
    try {
      if(editingFinding) await api(`/findings/${editingFinding}`,{method:'PUT',body:JSON.stringify(payload)});
      else await api('/findings',{method:'POST',body:JSON.stringify(payload)});
      setShowFindingForm(false);setEditingFinding(null);setNotice(editingFinding?'Finding updated.':'Finding recorded.');await refresh();
    } catch(e){setNotice(e.message);} finally{setBusy(false);}
  }
  async function deleteFinding(id) {
    if(!window.confirm('Delete this finding? This cannot be undone.'))return;
    try {await api(`/findings/${id}`,{method:'DELETE'});setNotice('Finding deleted.');await refresh();}
    catch(e){setNotice(e.message);}
  }
  async function runDemoAssessment() {
    if(!projects.length){setNotice('Create a project before starting an assessment.');return;}
    const projectId=reportProject||projects[0].id;
    if(!window.confirm('This adds clearly labelled sample findings to your workspace. It does NOT scan or contact any target. Continue?'))return;
    setBusy(true);
    try {const result=await api('/demo-assessment',{method:'POST',body:JSON.stringify({projectId})});setNotice(`${result.created} simulated findings added. No live scan was run.`);await refresh();}
    catch(e){setNotice(e.message);} finally{setBusy(false);}
  }
  function exportReport() {
    const rows=selectedReportFindings;
    const lines=[`# ${selectedProject?.name||'Security Assessment Report'}`,'',`**Generated:** ${new Date().toLocaleString()}`,`**Project status:** ${selectedProject?.status||'—'}`,'', '## Executive Summary','',reportSummary.trim()||`This report contains ${rows.length} recorded finding(s). ${reportCounts.critical+reportCounts.high} are classified as Critical or High and should be prioritized for review.`,'','## Risk Overview','','| Severity | Count |','|---|---:|',...SEVERITIES.map(s=>`| ${s.label} | ${reportCounts[s.key]} |`),'','## Findings',''];
    rows.forEach((f,i)=>{lines.push(`### ${i+1}. ${f.title}`,'',`**Severity:** ${f.severity}  **CVSS:** ${f.cvss||'—'}  **Status:** ${f.status}`,`**Affected endpoint/system:** ${f.endpoint||'—'}`,'','**Description**',f.description||'—','','**Evidence**','```text',f.evidence||'—','```','','**Impact**',f.impact||'—','','**Remediation**',f.remediation||'—','','');});
    const blob=new Blob([lines.join('\n')],{type:'text/markdown;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='cyberguard-security-assessment.md';a.click();URL.revokeObjectURL(url);
  }

  const activeNav=NAV.find(n=>n.id===page);
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav?'open':''}`}>
      <div className="brand"><div className="brand-mark"><ShieldCheck size={22}/></div><div><strong>CYBERGUARD</strong><small>SECURITY WORKSPACE</small></div></div>
      <div className="workspace-switch"><div className="workspace-avatar">CG</div><div><b>Security Team</b><small>Local workspace</small></div><ChevronDown size={15}/></div>
      {['Workspace','Security'].map(group=><div className="nav-group" key={group}><div className="nav-heading">{group}</div>{NAV.filter(n=>n.group===group).map(n=><button key={n.id} className={`nav-link ${page===n.id?'active':''}`} onClick={()=>{setPage(n.id);setMobileNav(false);}}><n.icon size={17}/><span>{n.label}</span>{n.id==='findings'&&<em>{findings.length}</em>}</button>)}</div>)}
      <div className="sidebar-bottom"><div className="safe-note"><div className="safe-note-icon"><LockKeyhole size={15}/></div><div><b>Authorized testing only</b><p>Use only on systems you own or have written permission to assess.</p></div></div><div className="user-mini"><div className="user-avatar">A</div><div><b>Analyst workspace</b><small>Local demo account</small></div><span className="online-dot"/></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="topbar-left"><button className="mobile-menu" onClick={()=>setMobileNav(!mobileNav)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{activeNav?.label||'Overview'}</b></div></div>
        <div className="topbar-right"><span className="api-status"><i/> API workspace</span><button className="icon-action" title="Refresh data" onClick={()=>refresh()}><RefreshCw size={17}/></button><div className="top-avatar">A</div></div>
      </header>

      <div className="content">
        {error&&<div className="error-banner"><AlertTriangle size={17}/><span>{error}</span><button onClick={()=>refresh(true)}>Retry</button></div>}
        {notice&&<div className="toast"><CheckCircle2 size={16}/>{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
        {loading?<div className="loading"><RefreshCw className="spin" size={22}/> Loading your security workspace…</div>:<>
        {page==='overview'&&<section>
          <div className="page-heading"><div><div className="eyebrow">SECURITY OPERATIONS</div><h1>Good morning, Analyst<span>.</span></h1><p>Monitor assessment activity, manage findings and turn verified observations into actionable reports.</p></div><button className="btn btn-primary" onClick={()=>{setPage('findings');startNewFinding();}}><Plus size={16}/> Add finding</button></div>
          <div className="stat-grid">
            <StatCard label="Total projects" value={overview?.projects??0} sub="Assessment workspaces" icon={FolderKanban} tone="blue"/>
            <StatCard label="Assets in scope" value={overview?.assets??0} sub="Registered targets" icon={Server} tone="violet"/>
            <StatCard label="Recorded findings" value={overview?.findings??0} sub={`${overview?.open??0} still need attention`} icon={Bug} tone="amber"/>
            <StatCard label="Critical / High" value={(counts.critical||0)+(counts.high||0)} sub="Prioritize for remediation" icon={AlertTriangle} tone="red"/>
          </div>
          <div className="dashboard-grid">
            <div className="panel risk-panel"><div className="panel-head"><div><h2>Finding severity</h2><p>Distribution across all recorded assessments</p></div><span className="subtle-tag">LIVE DATA</span></div>
              <div className="severity-bars">{SEVERITIES.map(s=><div className="severity-bar-row" key={s.key}><div className="bar-label"><i style={{background:s.color}}/>{s.label}</div><div className="bar-track"><div className="bar-fill" style={{width:`${findings.length?counts[s.key]/findings.length*100:0}%`,background:s.color}}/></div><b>{counts[s.key]||0}</b></div>)}</div>
              <div className="risk-foot"><Activity size={15}/> Severity totals update when findings are created, edited or resolved.</div>
            </div>
            <div className="panel quick-panel"><div className="panel-head"><div><h2>Quick actions</h2><p>Continue your assessment workflow</p></div></div>
              <button className="quick-action" onClick={()=>setPage('projects')}><span className="quick-icon blue"><FolderKanban size={17}/></span><span><b>Create a project</b><small>Define an assessment workspace</small></span><ArrowUpRight size={16}/></button>
              <button className="quick-action" onClick={()=>setPage('assets')}><span className="quick-icon violet"><Server size={17}/></span><span><b>Register an asset</b><small>Add an approved target to scope</small></span><ArrowUpRight size={16}/></button>
              <button className="quick-action" onClick={runDemoAssessment}><span className="quick-icon amber"><ScanSearch size={17}/></span><span><b>Run demo assessment</b><small>Add sample data (no live scanning)</small></span><ArrowUpRight size={16}/></button>
              <button className="quick-action" onClick={()=>setPage('reports')}><span className="quick-icon green"><FileText size={17}/></span><span><b>Generate a report</b><small>Build a report from recorded findings</small></span><ArrowUpRight size={16}/></button>
            </div>
          </div>
          <div className="panel recent-panel"><div className="panel-head"><div><h2>Recent findings</h2><p>Latest observations added to your workspace</p></div><button className="text-button" onClick={()=>setPage('findings')}>View all findings <ArrowUpRight size={14}/></button></div>
            <FindingsTable findings={[...findings].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5)} assets={assets} projects={projects} onEdit={editFinding} onDelete={deleteFinding}/>
          </div>
          <div className="disclaimer"><LockKeyhole size={15}/><span><b>Scope reminder:</b> This workspace records assessment data; the demo assessment creates simulated examples only. It does not scan, exploit or contact any target system.</span></div>
        </section>}

        {page==='projects'&&<section>
          <div className="page-heading"><div><div className="eyebrow">WORKSPACE MANAGEMENT</div><h1>Projects<span>.</span></h1><p>Organize security assessments and keep scope, assets and findings together.</p></div></div>
          <div className="two-panel-layout">
            <div className="panel form-panel"><div className="panel-head"><div><h2>Create project</h2><p>Start a new authorized assessment workspace</p></div><span className="panel-icon"><Plus size={17}/></span></div>
              <form onSubmit={createProject} className="form-grid"><Field label="Project name"><input value={projectForm.name} onChange={e=>setProjectForm({...projectForm,name:e.target.value})} placeholder="e.g. Customer Portal Security Review" required/></Field><Field label="Project status"><select value={projectForm.status} onChange={e=>setProjectForm({...projectForm,status:e.target.value})}><option>Active</option><option>On Hold</option><option>Completed</option></select></Field><Field label="Description" wide><textarea value={projectForm.description} onChange={e=>setProjectForm({...projectForm,description:e.target.value})} placeholder="Purpose, authorization reference and scope notes…" rows="4"/></Field><button className="btn btn-primary" disabled={busy}><Plus size={15}/> Create project</button></form>
            </div>
            <div className="project-list"><div className="list-heading"><div><h2>Your projects</h2><p>{projects.length} workspace(s)</p></div></div>{projects.length===0?<Empty title="No projects yet" body="Create your first project to start organizing an assessment."/>:projects.map(p=><div className="project-card" key={p.id}><div className="project-card-icon"><FolderKanban size={19}/></div><div className="project-card-main"><div className="project-card-title">{p.name}<Status value={p.status}/></div><p>{p.description||'No description added.'}</p><small>Created {dateLabel(p.createdAt)} · {assets.filter(a=>a.projectId===p.id).length} assets · {findings.filter(f=>f.projectId===p.id).length} findings</small></div></div>)}</div>
          </div>
        </section>}

        {page==='assets'&&<section>
          <div className="page-heading"><div><div className="eyebrow">SCOPE MANAGEMENT</div><h1>Assets<span>.</span></h1><p>Maintain an inventory of systems explicitly approved for assessment.</p></div></div>
          <div className="two-panel-layout">
            <div className="panel form-panel"><div className="panel-head"><div><h2>Register an asset</h2><p>Only add systems covered by written authorization</p></div><span className="panel-icon"><Server size={17}/></span></div>
              {projects.length===0?<Empty title="Create a project first" body="Assets must belong to a project. Create a project before registering assets." action={<button className="btn btn-primary" onClick={()=>setPage('projects')}>Go to projects</button>}/>:<form onSubmit={createAsset} className="form-grid"><Field label="Project"><select value={assetForm.projectId||projects[0]?.id} onChange={e=>setAssetForm({...assetForm,projectId:e.target.value})}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Asset type"><select value={assetForm.type} onChange={e=>setAssetForm({...assetForm,type:e.target.value})}>{['Web Application','Network','Mobile Application','API','Server','Other'].map(t=><option key={t}>{t}</option>)}</select></Field><Field label="Asset name"><input value={assetForm.name} onChange={e=>setAssetForm({...assetForm,name:e.target.value})} placeholder="e.g. Customer portal" required/></Field><Field label="Identifier / approved scope"><input value={assetForm.identifier} onChange={e=>setAssetForm({...assetForm,identifier:e.target.value})} placeholder="Approved hostname, IP or app identifier"/></Field><Field label="Notes" wide><textarea rows="3" value={assetForm.notes} onChange={e=>setAssetForm({...assetForm,notes:e.target.value})} placeholder="Authorization notes, exclusions, test window…"/></Field><button className="btn btn-primary" disabled={busy}><Plus size={15}/> Add asset</button></form>}
            </div>
            <div className="project-list"><div className="list-heading"><div><h2>Asset inventory</h2><p>{assets.length} registered asset(s)</p></div></div>{assets.length===0?<Empty title="No assets registered" body="Registered assets will appear here."/>:assets.map(a=><div className="asset-card" key={a.id}><div className="asset-icon"><Server size={18}/></div><div className="asset-main"><b>{a.name}</b><span>{a.type} · {projects.find(p=>p.id===a.projectId)?.name||'Unassigned project'}</span><small>{a.identifier||'No identifier supplied'}</small></div><span className="asset-tag">IN SCOPE</span></div>)}</div>
          </div>
        </section>}

        {page==='findings'&&<section>
          <div className="page-heading"><div><div className="eyebrow">VULNERABILITY MANAGEMENT</div><h1>Findings<span>.</span></h1><p>Record verified observations, assess risk and track remediation progress.</p></div><button className="btn btn-primary" onClick={startNewFinding}><Plus size={16}/> New finding</button></div>
          <div className="filter-row"><div className="search-box"><Search size={16}/><input placeholder="Search findings, endpoints or descriptions…" value={query} onChange={e=>setQuery(e.target.value)}/></div><select value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)}><option value="all">All severities</option>{SEVERITIES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">All statuses</option><option>Open</option><option>In Progress</option><option>Resolved</option></select></div>
          {showFindingForm&&<div className="panel finding-form-panel"><div className="panel-head"><div><h2>{editingFinding?'Edit finding':'Record a finding'}</h2><p>Use evidence from an authorized assessment. Do not enter secrets or real credentials.</p></div><button className="icon-action" onClick={()=>setShowFindingForm(false)}><X size={17}/></button></div>
            <form className="finding-form-grid" onSubmit={saveFinding}>
              <Field label="Finding title"><input value={findingDraft.title} onChange={e=>setFindingDraft({...findingDraft,title:e.target.value})} placeholder="e.g. Insecure direct object reference" required/></Field>
              <Field label="Project"><select value={findingDraft.projectId} onChange={e=>setFindingDraft({...findingDraft,projectId:e.target.value,assetId:''})} required><option value="">Select project</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Affected asset"><select value={findingDraft.assetId} onChange={e=>setFindingDraft({...findingDraft,assetId:e.target.value})}><option value="">Select asset (optional)</option>{assets.filter(a=>a.projectId===findingDraft.projectId).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>
              <Field label="Severity"><select value={findingDraft.severity} onChange={e=>setFindingDraft({...findingDraft,severity:e.target.value})}>{SEVERITIES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}</select></Field>
              <Field label="CVSS score (0–10)"><input type="number" min="0" max="10" step="0.1" value={findingDraft.cvss} onChange={e=>setFindingDraft({...findingDraft,cvss:e.target.value})} placeholder="e.g. 7.5"/></Field>
              <Field label="Status"><select value={findingDraft.status} onChange={e=>setFindingDraft({...findingDraft,status:e.target.value})}><option>Open</option><option>In Progress</option><option>Resolved</option></select></Field>
              <Field label="Endpoint / affected system" wide><input value={findingDraft.endpoint} onChange={e=>setFindingDraft({...findingDraft,endpoint:e.target.value})} placeholder="Approved host, route, component or endpoint"/></Field>
              <Field label="Description" wide><textarea rows="3" value={findingDraft.description} onChange={e=>setFindingDraft({...findingDraft,description:e.target.value})} placeholder="Describe the verified security issue…"/></Field>
              <Field label="Evidence" wide><textarea rows="3" value={findingDraft.evidence} onChange={e=>setFindingDraft({...findingDraft,evidence:e.target.value})} placeholder="Record sanitized request/response excerpts or reproducible observations…"/></Field>
              <Field label="Impact" wide><textarea rows="2" value={findingDraft.impact} onChange={e=>setFindingDraft({...findingDraft,impact:e.target.value})} placeholder="Explain realistic business or technical impact…"/></Field>
              <Field label="Remediation" wide><textarea rows="3" value={findingDraft.remediation} onChange={e=>setFindingDraft({...findingDraft,remediation:e.target.value})} placeholder="Recommended corrective action…"/></Field>
              <Field label="References (one URL per line)" wide><textarea rows="2" value={findingDraft.referencesText} onChange={e=>setFindingDraft({...findingDraft,referencesText:e.target.value})} placeholder="https://owasp.org/…"/></Field>
              <div className="form-footer"><button type="button" className="btn btn-secondary" onClick={()=>setShowFindingForm(false)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy?'Saving…':editingFinding?'Save changes':'Save finding'}</button></div>
            </form>
          </div>}
          <div className="panel table-panel"><div className="panel-head"><div><h2>All findings</h2><p>Showing {filteredFindings.length} of {findings.length} recorded findings</p></div><span className="subtle-tag">ASSESSMENT DATA</span></div><FindingsTable findings={filteredFindings} assets={assets} projects={projects} onEdit={editFinding} onDelete={deleteFinding}/></div>
        </section>}

        {page==='reports'&&<section>
          <div className="page-heading"><div><div className="eyebrow">DOCUMENTATION & EXPORT</div><h1>Report generator<span>.</span></h1><p>Generate a professional assessment report from findings saved in your workspace.</p></div><div className="heading-actions"><button className="btn btn-secondary" onClick={exportReport}><Download size={15}/> Export Markdown</button><button className="btn btn-primary" onClick={()=>window.print()}><Printer size={15}/> Print / Save PDF</button></div></div>
          <div className="report-controls panel"><Field label="Select project"><select value={reportProject} onChange={e=>setReportProject(e.target.value)}><option value="">All projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></Field><Field label="Executive summary"><textarea rows="3" value={reportSummary} onChange={e=>setReportSummary(e.target.value)} placeholder="Optional: add a concise summary of scope, approach, key risks and overall posture. Leave blank to use an automatically generated summary."/></Field><div className="report-control-note"><CheckCircle2 size={15}/> Report preview updates from saved findings.</div></div>
          <article className="report-paper"><div className="report-topline"><ShieldCheck size={19}/> CYBERGUARD <span>CONFIDENTIAL · SECURITY ASSESSMENT</span></div><div className="report-cover"><div className="eyebrow">TECHNICAL SECURITY REPORT</div><h2>{selectedProject?.name||'Security Assessment Report'}</h2><p>Assessment findings and remediation recommendations</p><div className="report-meta"><div><small>PROJECT STATUS</small><b>{selectedProject?.status||'All projects'}</b></div><div><small>GENERATED ON</small><b>{new Date().toLocaleDateString()}</b></div><div><small>FINDINGS</small><b>{selectedReportFindings.length}</b></div></div></div>
            <div className="report-section"><h3>01 / Executive summary</h3><p>{reportSummary.trim()||`This report consolidates ${selectedReportFindings.length} recorded finding(s) for ${selectedProject?.name||'the selected workspace'}. ${reportCounts.critical+reportCounts.high} finding(s) are classified as Critical or High and should be prioritized for review. All observations should be validated against the original assessment evidence before external distribution.`}</p></div>
            <div className="report-section"><h3>02 / Risk overview</h3><div className="report-risk-grid">{SEVERITIES.map(s=><div key={s.key}><i style={{background:s.color}}/><b>{reportCounts[s.key]||0}</b><small>{s.label}</small></div>)}</div></div>
            <div className="report-section"><h3>03 / Detailed findings</h3>{selectedReportFindings.length===0?<p>No findings are recorded for this selection yet. Add findings in the Findings section to populate this report.</p>:selectedReportFindings.map((f,i)=><div className="report-finding" key={f.id}><div className="report-finding-title"><span>{String(i+1).padStart(2,'0')}</span><h4>{f.title}</h4><Severity value={f.severity}/></div><div className="report-finding-meta">{f.endpoint||'Affected system not specified'} · CVSS {f.cvss||'—'} · {f.status}</div><b>Description</b><p>{f.description||'—'}</p><b>Evidence</b><pre>{f.evidence||'—'}</pre><b>Impact</b><p>{f.impact||'—'}</p><b>Remediation</b><p>{f.remediation||'—'}</p>{f.references?.length>0&&<div className="report-refs">References: {f.references.join(' · ')}</div>}</div>)}</div>
            <div className="report-footer">Generated with CyberGuard · Verify findings and evidence before sharing this report.</div>
          </article>
        </section>}
        </>}
      </div>
      <footer className="app-footer"><span>CYBERGUARD <i>v1.0</i></span><span>Authorized security assessment workspace</span><span><i className="footer-dot"/> Local API connected when server is running</span></footer>
    </main>
  </div>;
}

function FindingsTable({findings,assets,projects,onEdit,onDelete}) {
  if(!findings.length)return <Empty title="No findings to display" body="Add a verified finding or adjust your search and filters." />;
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>Finding</th><th>Project / asset</th><th>Severity</th><th>CVSS</th><th>Status</th><th>Recorded</th><th>Actions</th></tr></thead><tbody>{findings.map(f=><tr key={f.id}><td><div className="finding-cell"><b>{f.title}</b><small>{f.endpoint||f.description||'No endpoint specified'}</small></div></td><td><div className="finding-cell"><b>{projects.find(p=>p.id===f.projectId)?.name||'—'}</b><small>{assets.find(a=>a.id===f.assetId)?.name||'Asset not linked'}</small></div></td><td><Severity value={f.severity}/></td><td><span className="cvss">{f.cvss||'—'}</span></td><td><Status value={f.status}/></td><td><span className="date-cell">{dateLabel(f.createdAt)}</span></td><td><div className="row-actions"><button title="Edit" onClick={()=>onEdit(f)}><Pencil size={14}/></button><button title="Delete" onClick={()=>onDelete(f.id)}><Trash2 size={14}/></button></div></td></tr>)}</tbody></table></div>;
}
