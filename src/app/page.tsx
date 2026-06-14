"use client";

import Link from "next/link";
import { ArrowRight, FileText, MapPinned, Route } from "lucide-react";

const modules = [
  {
    title: "Rota Yönetimi",
    description: "Adresleri grupla, sırala ve navigasyona aktar.",
    href: "/sahanav",
    icon: Route,
    accent: "bg-blue-50 text-primary ring-blue-100",
  },
  {
    title: "Adres İşleme",
    description: "PDF/TXT dosyalarından adresleri ayır, filtrele ve dışa aktar.",
    href: "/adresmatic",
    icon: FileText,
    accent: "bg-emerald-50 text-emerald-600 ring-emerald-100",
  },
];

export default function ModuleHomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F3F6FA] text-[#172033] selection:bg-primary/10">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-5 pt-5 sm:max-w-4xl sm:px-6 sm:pt-8">
        <header className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-3xl font-black tracking-tight text-slate-950">SahaNav</h1>
              <p className="mt-1 text-sm font-semibold text-slate-500">Saha operasyon yönetim paneli</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
              <MapPinned className="h-6 w-6" />
            </div>
          </div>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-2xl font-black text-slate-950">2</p>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-slate-400">Modül</p>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-sm font-black leading-6 text-slate-950">Rota + Adres</p>
              <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-slate-400">İşleme</p>
            </div>
          </section>
        </header>

        <section className="mt-5 grid grid-cols-1 gap-3 sm:mt-7 sm:grid-cols-2 sm:gap-4">
          {modules.map((module) => {
            const Icon = module.icon;

            return (
              <Link
                key={module.href}
                href={module.href}
                className="group flex min-h-40 flex-col justify-between rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200/70 transition-all active:scale-[0.99] sm:min-h-52 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${module.accent}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-primary group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-7 space-y-2">
                  <h2 className="text-xl font-black tracking-tight text-slate-950">{module.title}</h2>
                  <p className="break-words text-sm font-medium leading-6 text-slate-500">{module.description}</p>
                </div>
              </Link>
            );
          })}
        </section>

        <footer className="mt-auto pt-6 text-center text-xs font-bold uppercase tracking-[0.24em] text-slate-300">
          SahaNav v2
        </footer>
      </div>
    </main>
  );
}
