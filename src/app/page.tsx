"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AudioLines, Clapperboard, Code2, FolderGit2, Settings, Search, LogOut, Plus, Upload, Github, Sparkles, HardDrive, Moon, Sun, Menu, X, ArrowUpRight, Music2, Play, FileCode2, ShieldCheck } from "lucide-react";

type Section = "Home"|"Video Viewer"|"Music Library"|"AI GitHub Workspace"|"Settings";
type IntegrationStatus = { status: "configured" | "incomplete" | "checking" | "error"; message: string; missing?: string[] }; 
type ConfigurationStatus = { github: IntegrationStatus; supabase: IntegrationStatus; ai: IntegrationStatus; security: IntegrationStatus };
const nav: {name:Section;icon:typeof Clapperboard;desc:string}[] = [
  {name:"Home",icon:FolderGit2,desc:"Your overview"},
  {name:"Video Viewer",icon:Clapperboard,desc:"Your video collection"},
  {name:"Music Library",icon:AudioLines,desc:"Songs and playlists"},
  {name:"AI GitHub Workspace",icon:Code2,desc:"Build directly with AI"},
  {name:"Settings",icon:Settings,desc:"Workspace preferences"},
];
export default function Dashboard() {
  const [section,setSection] = useState<Section>("Home");
  const [mobile,setMobile] = useState(false);
  const [light,setLight] = useState(false);
  const [query,setQuery] = useState("");
  const [configuration,setConfiguration] = useState<ConfigurationStatus | null>(null);
  const [configurationLoading,setConfigurationLoading] = useState(false);
  const router=useRouter();
  useEffect(() => {
    if (section !== "Settings") return;
    let active = true;
    setConfigurationLoading(true);
    fetch("/api/configuration", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error("Could not check configuration. Refresh and try again.");
        return response.json() as Promise<ConfigurationStatus>;
      })
      .then(data => { if (active) setConfiguration(data); })
      .catch(error => {
        if (!active) return;
        const failed = { status: "error" as const, message: error instanceof Error ? error.message : "Configuration check failed." };
        setConfiguration({ github: failed, supabase: failed, ai: failed, security: failed });
      })
      .finally(() => { if (active) setConfigurationLoading(false); });
    return () => { active = false; };
  }, [section]);
  async function logout(){await fetch("/api/logout",{method:"POST"});router.replace("/login");router.refresh();}
  const cards = [
    {name:"Video Viewer" as Section,desc:"Upload, organize and watch your videos from anywhere.",icon:Clapperboard,tag:"MEDIA"},
    {name:"Music Library" as Section,desc:"Keep your tracks, playlists and listening queue together.",icon:AudioLines,tag:"AUDIO"},
    {name:"AI GitHub Workspace" as Section,desc:"Give AI files and paths, then review changes before committing.",icon:Code2,tag:"DEVELOPMENT"},
  ];
  return <div className={light?"light min-h-screen bg-[#f4f6fa] text-slate-900":"min-h-screen"}>
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-[264px] flex-col border-r border-white/10 bg-[#0b0d12] p-5 transition-transform lg:static lg:translate-x-0 ${mobile?"translate-x-0":"-translate-x-full"}`}>
        <div className="mb-10 flex items-center justify-between"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/40 bg-red-500/10 text-xl font-black italic text-red-500">I</div><div><div className="font-black tracking-[.18em]">INVERTED</div><div className="text-[10px] tracking-[.2em] text-zinc-500">PRIVATE WORKSPACE</div></div></div><button className="lg:hidden text-zinc-400" onClick={()=>setMobile(false)}><X/></button></div>
        <div className="mb-3 px-3 text-[10px] font-bold tracking-[.2em] text-zinc-600">WORKSPACE</div>
        <nav className="space-y-1">{nav.map(item=><button key={item.name} onClick={()=>{setSection(item.name);setMobile(false)}} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${section===item.name?"border border-red-500/20 bg-red-500/10 text-white":"text-zinc-400 hover:bg-white/5 hover:text-white"}`}><item.icon size={18} className={section===item.name?"text-red-400":""}/><span className="flex-1 text-sm font-medium">{item.name}</span>{section===item.name&&<span className="h-1.5 w-1.5 rounded-full bg-red-500"/>}</button>)}</nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.03] p-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={15} className="text-emerald-400"/> Private session</div><p className="text-xs leading-5 text-zinc-500">Your workspace is protected. Media and GitHub integrations are configured separately.</p><button onClick={logout} className="mt-4 flex items-center gap-2 text-xs text-zinc-400 hover:text-white"><LogOut size={14}/> Sign out</button></div>
      </aside>
      {mobile&&<button aria-label="Close menu" onClick={()=>setMobile(false)} className="fixed inset-0 z-20 bg-black/60 lg:hidden"/>}
      <main className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-white/10 bg-[#08090d]/85 px-5 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3"><button className="lg:hidden text-zinc-400" onClick={()=>setMobile(true)}><Menu/></button><div><div className="text-sm font-semibold">{section}</div><div className="text-xs text-zinc-500">{nav.find(n=>n.name===section)?.desc}</div></div></div>
          <div className="flex items-center gap-2"><button onClick={()=>setLight(!light)} aria-label="Toggle theme" className="btn-ghost !rounded-full !p-2.5">{light?<Moon size={17}/>:<Sun size={17}/>}</button><div className="hidden h-9 w-9 place-items-center rounded-full border border-red-500/30 bg-red-500/10 text-sm font-bold text-red-400 sm:grid">IN</div></div>
        </header>
        <div className="mx-auto max-w-[1400px] p-5 sm:p-8">
          {section==="Home"&&<div className="fade-in">
            <div className="relative mb-8 overflow-hidden rounded-3xl border border-red-500/20 bg-gradient-to-br from-[#241014] via-[#151018] to-[#10131b] p-7 sm:p-10"><div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full border-[40px] border-red-500/10"/><div className="relative max-w-2xl"><div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-semibold tracking-wider text-red-300"><Sparkles size={13}/> YOUR SPACE. YOUR RULES.</div><h1 className="text-3xl font-black tracking-tight sm:text-5xl">Everything you need.<br/><span className="text-red-500">Nothing in your way.</span></h1><p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">A private home for your media and development workflow. Pick up where you left off.</p><button onClick={()=>setSection("AI GitHub Workspace")} className="btn-primary mt-6 inline-flex items-center gap-2">Open workspace <ArrowUpRight size={16}/></button></div></div>
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold">Your workspace</h2><p className="mt-1 text-xs text-zinc-500">Choose where you want to go.</p></div><span className="text-xs text-zinc-500">03 MODULES</span></div>
            <div className="grid gap-4 md:grid-cols-3">{cards.map((card,i)=><button key={card.name} onClick={()=>setSection(card.name)} className="surface group p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-red-500/40"><div className="mb-7 flex items-center justify-between"><div className="rounded-xl border border-white/10 bg-white/[.04] p-3 text-red-400"><card.icon size={22}/></div><span className="text-[10px] font-bold tracking-[.18em] text-zinc-600">{card.tag}</span></div><h3 className="text-base font-bold">{card.name}</h3><p className="mt-2 min-h-10 text-sm leading-5 text-zinc-500">{card.desc}</p><div className="mt-6 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-red-400"><span>Open module</span><ArrowUpRight size={16}/></div></button>)}</div>
            <div className="mt-6 grid gap-4 md:grid-cols-2"><div className="surface flex items-center gap-4 p-5"><div className="rounded-xl bg-white/5 p-3 text-zinc-400"><HardDrive/></div><div><div className="text-sm font-semibold">Cloud storage</div><div className="mt-1 text-xs text-zinc-500">Connect Supabase to enable persistent uploads.</div></div></div><div className="surface flex items-center gap-4 p-5"><div className="rounded-xl bg-white/5 p-3 text-zinc-400"><Github/></div><div><div className="text-sm font-semibold">GitHub connection</div><div className="mt-1 text-xs text-zinc-500">Connect an OAuth app to edit repositories.</div></div></div></div>
          </div>}
          {section==="Video Viewer"&&<Module title="Video Viewer" subtitle="A home for your videos, wherever you are." icon={<Clapperboard size={22}/>}><div className="surface p-6 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-400"><Upload size={24}/></div><h3 className="font-semibold">Cloud video library is being connected</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">Persistent uploads require your Supabase project and private storage bucket. This module will not pretend files are saved until cloud storage is configured.</p><button onClick={()=>setSection("Settings")} className="btn-ghost mt-5">View setup settings</button></div></Module>}
          {section==="Music Library"&&<Module title="Music Library" subtitle="Your tracks, playlists and listening queue." icon={<Music2 size={22}/>}><div className="surface p-6 text-center"><div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-red-500/10 text-red-400"><AudioLines size={24}/></div><h3 className="font-semibold">Your library is ready for storage setup</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">Connect Supabase Storage to keep songs available across sessions and devices.</p><button onClick={()=>setSection("Settings")} className="btn-ghost mt-5">View setup settings</button></div></Module>}
          {section==="AI GitHub Workspace"&&<Module title="AI GitHub Workspace" subtitle="Upload files, specify their destination, and work against a real GitHub repository." icon={<Code2 size={22}/>}><div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div className="surface min-h-[430px] p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><Github size={17}/> Repository context</div><span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] text-amber-300">NOT CONNECTED</span></div><label className="mb-2 block text-xs text-zinc-500">Repository (owner/name)</label><input className="field" placeholder="your-account/your-repository"/><label className="mb-2 mt-4 block text-xs text-zinc-500">Branch</label><input className="field" placeholder="main" defaultValue="main"/><div className="mt-5 rounded-xl border border-dashed border-white/15 p-6 text-center"><Upload className="mx-auto mb-2 text-zinc-500"/><div className="text-sm font-medium">Drop files here or choose files</div><p className="mt-1 text-xs text-zinc-500">Source files will be mapped to the paths you specify.</p><input type="file" multiple className="mt-4 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white"/></div><button className="btn-primary mt-5 w-full" onClick={()=>setSection("Settings")}>Configure GitHub connection</button></div><div className="surface flex min-h-[430px] flex-col p-5"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><Sparkles size={17} className="text-red-400"/> AI instructions</div><span className="text-[10px] text-zinc-500">WORKSPACE</span></div><div className="flex-1 rounded-xl border border-white/5 bg-black/20 p-4 text-sm leading-6 text-zinc-500">Your uploaded files, repository structure, and requested edits will appear here. The AI integration is inactive until an AI provider and GitHub OAuth credentials are configured.</div><textarea value={query} onChange={e=>setQuery(e.target.value)} className="field mt-4 min-h-24 resize-y" placeholder="Example: Update ChatView.tsx and place it at src/components/chat/ChatView.tsx…"/><button disabled={!query.trim()} className="btn-primary mt-3 inline-flex items-center justify-center gap-2 disabled:opacity-40"><Sparkles size={16}/> Prepare changes</button></div></div></Module>}
          {section==="Settings"&&<Module title="Settings" subtitle="Manage connections and workspace preferences." icon={<Settings size={22}/>}><div className="grid gap-4 lg:grid-cols-2"><Setting title="GitHub OAuth" detail="Connect your GitHub account to select repositories, read files and prepare commits." status={configurationLoading ? {status:"checking",message:"Checking server configuration…"} : configuration?.github ?? {status:"checking",message:"Waiting for configuration check…"}}/><Setting title="Supabase storage" detail="Private inverted-media bucket for persistent videos and music." status={configurationLoading ? {status:"checking",message:"Checking server configuration…"} : configuration?.supabase ?? {status:"checking",message:"Waiting for configuration check…"}}/><Setting title="AI provider" detail="Server-side AI API endpoint, key and model." status={configurationLoading ? {status:"checking",message:"Checking server configuration…"} : configuration?.ai ?? {status:"checking",message:"Waiting for configuration check…"}}/><Setting title="Security" detail="Signed, HTTP-only session cookie protection." status={configurationLoading ? {status:"checking",message:"Checking server configuration…"} : configuration?.security ?? {status:"checking",message:"Waiting for configuration check…"}}/></div><div className="mt-4 flex items-center justify-between"><p className="text-xs text-zinc-500">Only configuration status is shown. Secret values stay on the server.</p><button onClick={() => setSection("Home") || setSection("Settings")} className="btn-ghost text-xs">Refresh status</button></div><div className="surface mt-4 p-5"><h3 className="font-semibold">Environment variables</h3><p className="mt-2 text-sm leading-6 text-zinc-500">Add the values from <code className="text-red-300">.env.example</code> to your Vercel project settings. Keep service-role keys, OAuth secrets, AI keys, and the site password server-side only.</p><button onClick={()=>navigator.clipboard?.writeText("SITE_PASSWORD=\nAUTH_SECRET=\nSUPABASE_URL=\nSUPABASE_ANON_KEY=\nSUPABASE_SERVICE_ROLE_KEY=\nGITHUB_CLIENT_ID=\nGITHUB_CLIENT_SECRET=\nAI_API_KEY=\nAI_API_URL=\nAI_MODEL=")} className="btn-ghost mt-4">Copy variable names</button></div></Module>}
        </div>
      </main>
    </div>
  </div>;
}
function Module({title,subtitle,icon,children}:{title:string;subtitle:string;icon:React.ReactNode;children:React.ReactNode}) { return <div className="fade-in"><div className="mb-6 flex items-center gap-3"><div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-red-400">{icon}</div><div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-zinc-500">{subtitle}</p></div></div>{children}</div>; }
function Setting({title,detail,status}:{title:string;detail:string;status:IntegrationStatus}) {
  const tone = status.status === "configured" ? "text-emerald-400" : status.status === "checking" ? "text-zinc-400" : status.status === "error" ? "text-red-400" : "text-amber-300";
  const label = status.status === "configured" ? "Configured" : status.status === "checking" ? "Checking…" : status.status === "error" ? "Check failed" : "Needs attention";
  return <div className="surface p-5"><div className="flex items-center justify-between gap-3"><div className="font-semibold">{title}</div><span className={`text-xs font-semibold ${tone}`}>{label}</span></div><p className="mt-2 text-sm leading-6 text-zinc-500">{detail}</p><div className={`mt-4 text-xs font-medium ${tone}`}>{status.message}</div>{status.missing?.length ? <div className="mt-2 text-xs text-zinc-500">Missing: {status.missing.join(", ")}</div> : null}</div>;
}
