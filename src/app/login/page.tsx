"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, ShieldCheck, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [password,setPassword] = useState("");
  const [show,setShow] = useState(false);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      const next = params.get("next");
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/");
      router.refresh();
    } catch(e) { setError(e instanceof Error ? e.message : "Something went wrong."); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center p-5">
    <section className="surface fade-in w-full max-w-[430px] p-8 sm:p-10 shadow-2xl shadow-black/40">
      <div className="mb-9 flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-red-500/40 bg-red-500/10"><span className="text-2xl font-black italic text-red-500">I</span></div>
        <div><div className="text-xl font-black tracking-[.2em]">INVERTED</div><div className="text-xs tracking-widest muted">PRIVATE WORKSPACE</div></div>
      </div>
      <div className="mb-7"><div className="mb-3 inline-flex rounded-xl bg-red-500/10 p-3 text-red-400"><LockKeyhole size={22}/></div><h1 className="text-2xl font-bold">Welcome back.</h1><p className="mt-2 text-sm muted">Enter the access password to continue to your workspace.</p></div>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium" htmlFor="password">Workspace password</label>
        <div className="relative"><input id="password" autoFocus required type={show?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" className="field pr-12"/><button type="button" aria-label={show?"Hide password":"Show password"} onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 muted">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
        {error && <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <button disabled={busy||!password} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50">{busy?"Checking…":"Unlock workspace"}</button>
      </form>
      <div className="mt-7 flex items-center justify-center gap-2 text-xs muted"><ShieldCheck size={14}/> Protected with a server-verified session</div>
    </section>
  </main>;
}
