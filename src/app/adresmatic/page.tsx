"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDownAZ, ArrowUpAZ, Download, FileText, ListFilter, Route, Trash2 } from "lucide-react";
import { AdresMaticAddressCard } from "@/components/adresmatic/address-card";
import { AdresMaticFileUploader } from "@/components/adresmatic/file-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import {
  getAdresMaticStreetInfo,
  hasAdresMaticStreetMarker,
  parseAdresMaticAddress,
  type ParsedAdresMaticAddress,
} from "@/lib/adresmatic-address-parser";
import { cn } from "@/lib/utils";

const ADRESMATIC_COMPLETED_STORAGE_KEY = "adresmatic_completed_ids";
const ADRESMATIC_SESSION_STORAGE_KEY = "adresmatic_session_v1";

type AdresMaticPanel = "tek" | "cift" | "sokak";
type AdresMaticSortOrder = "asc" | "desc";

type AdresMaticSession = {
  addresses: ParsedAdresMaticAddress[];
  completedIds: string[];
  activePanel: AdresMaticPanel;
  sortOrders: Record<AdresMaticPanel, AdresMaticSortOrder>;
  fileName: string;
  totalCount: number;
  updatedAt: string;
};

const foldAdresMaticLabel = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/\u015f/g, "s")
    .replace(/\u0131/g, "i")
    .replace(/\u0130/g, "i")
    .replace(/\u00c5\u0178/g, "s")
    .replace(/\u00c4\u00b1/g, "i")
    .replace(/\u00c4\u00b0/g, "i")
    .replace(/\s+/g, " ")
    .trim();

const isAdresMaticCompanyLabel = (line: string) =>
  foldAdresMaticLabel(line).replace(/\s*\/\s*/g, "/").startsWith("firma/sahis:");

const isAdresMaticAddressLabel = (line: string) => foldAdresMaticLabel(line).startsWith("adres:");

const getAdresMaticLabelValue = (line: string) => {
  const colonIndex = line.indexOf(":");
  return colonIndex >= 0 ? line.slice(colonIndex + 1).trim() : "";
};

const ADRESMATIC_COMPANY_LABEL_PATTERN = /firma\s*\/\s*(?:sahis|\u015fah\u0131s|\u00c5\u0178ah\u00c4\u00b1s)\s*:/gi;
const ADRESMATIC_ADDRESS_LABEL_PATTERN = /adres\s*:/gi;

const normalizeAdresMaticUploadedContent = (content: string) =>
  content
    .replace(/\r/g, "\n")
    .replace(new RegExp(`\\s+(?=${ADRESMATIC_COMPANY_LABEL_PATTERN.source})`, "gi"), "\n")
    .replace(new RegExp(`\\s+(?=${ADRESMATIC_ADDRESS_LABEL_PATTERN.source})`, "gi"), "\n");

const formatAdresMaticSessionTime = (value: string) => {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(value));
  } catch (error) {
    return "";
  }
};

const sortAdresMaticByDoorNumber = (
  addresses: ParsedAdresMaticAddress[],
  sortOrder: AdresMaticSortOrder
) =>
  [...addresses].sort((firstAddress, secondAddress) => {
    if (firstAddress.doorNumberNumeric === null && secondAddress.doorNumberNumeric === null) return 0;
    if (firstAddress.doorNumberNumeric === null) return 1;
    if (secondAddress.doorNumberNumeric === null) return -1;
    const first = firstAddress.doorNumberNumeric;
    const second = secondAddress.doorNumberNumeric;
    return sortOrder === "asc" ? first - second : second - first;
  });

function AdresMaticSummaryCard({
  active,
  count,
  description,
  icon,
  onOpen,
  onSortChange,
  sortOrder,
  title,
}: {
  active: boolean;
  count: number;
  description: string;
  icon: React.ReactNode;
  onOpen: () => void;
  onSortChange: (sortOrder: AdresMaticSortOrder) => void;
  sortOrder: AdresMaticSortOrder;
  title: string;
}) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onOpen();
      }}
      className={cn(
        "cursor-pointer border-slate-200 bg-white transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/60",
        active && "border-primary ring-2 ring-primary/15"
      )}
    >
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {icon}
            </div>
            <div className="min-w-0">
              <h2 className="break-words text-sm font-black text-slate-900">{title}</h2>
              <p className="mt-1 break-words text-xs font-medium text-slate-400">{description}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-black text-slate-700">
            {count}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2" onClick={(event) => event.stopPropagation()}>
          <Button
            type="button"
            size="sm"
            variant={sortOrder === "asc" ? "default" : "outline"}
            className="h-9 min-w-0 px-2 text-xs"
            onClick={() => onSortChange("asc")}
          >
            <ArrowDownAZ className="mr-1.5 h-3.5 w-3.5" />
            Kucukten
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sortOrder === "desc" ? "default" : "outline"}
            className="h-9 min-w-0 px-2 text-xs"
            onClick={() => onSortChange("desc")}
          >
            <ArrowUpAZ className="mr-1.5 h-3.5 w-3.5" />
            Buyukten
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdresMaticPage() {
  const shouldSkipNextSessionSave = useRef(false);
  const [adresMaticAddresses, setAdresMaticAddresses] = useState<ParsedAdresMaticAddress[]>([]);
  const [isAdresMaticLoading, setIsAdresMaticLoading] = useState(false);
  const [isAdresMaticSessionReady, setIsAdresMaticSessionReady] = useState(false);
  const [adresMaticFileName, setAdresMaticFileName] = useState("");
  const [adresMaticLastUpdatedAt, setAdresMaticLastUpdatedAt] = useState("");
  const [activeAdresMaticPanel, setActiveAdresMaticPanel] = useState<AdresMaticPanel>("tek");
  const [adresMaticSortOrders, setAdresMaticSortOrders] = useState<Record<AdresMaticPanel, AdresMaticSortOrder>>({
    tek: "asc",
    cift: "asc",
    sokak: "asc",
  });
  const { toast } = useToast();

  useEffect(() => {
    const savedSession = localStorage.getItem(ADRESMATIC_SESSION_STORAGE_KEY);
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession) as Partial<AdresMaticSession>;
        if (Array.isArray(session.addresses)) {
          const completedIds = new Set(session.completedIds ?? []);
          setAdresMaticAddresses(
            session.addresses.map((address) => ({
              ...address,
              isCompleted: completedIds.has(address.id) || !!address.isCompleted,
            }))
          );
          setActiveAdresMaticPanel(session.activePanel ?? "tek");
          setAdresMaticSortOrders({
            tek: session.sortOrders?.tek ?? "asc",
            cift: session.sortOrders?.cift ?? "asc",
            sokak: session.sortOrders?.sokak ?? "asc",
          });
          setAdresMaticFileName(session.fileName ?? "");
          setAdresMaticLastUpdatedAt(session.updatedAt ?? "");
          shouldSkipNextSessionSave.current = true;
        }
      } catch (error) {
        console.error("AdresMatic oturumu okunamadi:", error);
      }
    }

    setIsAdresMaticSessionReady(true);
  }, []);

  useEffect(() => {
    if (!isAdresMaticSessionReady) return;

    if (shouldSkipNextSessionSave.current) {
      shouldSkipNextSessionSave.current = false;
      return;
    }

    const completedIds = adresMaticAddresses.filter((address) => address.isCompleted).map((address) => address.id);
    const updatedAt = new Date().toISOString();

    if (adresMaticAddresses.length === 0) {
      localStorage.removeItem(ADRESMATIC_SESSION_STORAGE_KEY);
      localStorage.removeItem(ADRESMATIC_COMPLETED_STORAGE_KEY);
      setAdresMaticLastUpdatedAt("");
      return;
    }

    const session: AdresMaticSession = {
      addresses: adresMaticAddresses,
      completedIds,
      activePanel: activeAdresMaticPanel,
      sortOrders: adresMaticSortOrders,
      fileName: adresMaticFileName,
      totalCount: adresMaticAddresses.length,
      updatedAt,
    };

    localStorage.setItem(ADRESMATIC_SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(ADRESMATIC_COMPLETED_STORAGE_KEY, JSON.stringify(completedIds));
    setAdresMaticLastUpdatedAt(updatedAt);
  }, [
    activeAdresMaticPanel,
    adresMaticAddresses,
    adresMaticFileName,
    adresMaticSortOrders,
    isAdresMaticSessionReady,
  ]);

  const handleAdresMaticFileLoaded = (content: string, fileName = "") => {
    setIsAdresMaticLoading(true);

    try {
      const lines = normalizeAdresMaticUploadedContent(content).split("\n");
      const parsed: ParsedAdresMaticAddress[] = [];

      let currentName = "";
      let currentAddress = "";

      const commitAdresMaticRecord = () => {
        if (!currentName) return;
        parsed.push(parseAdresMaticAddress(`${currentName} | ${currentAddress}`));
      };

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (isAdresMaticCompanyLabel(line)) {
          commitAdresMaticRecord();
          currentName = getAdresMaticLabelValue(line);
          currentAddress = "";
          continue;
        }

        if (!currentName) continue;

        if (isAdresMaticAddressLabel(line)) {
          currentAddress = getAdresMaticLabelValue(line);
          continue;
        }

        currentAddress = currentAddress ? `${currentAddress} ${line}` : line;
      }

      commitAdresMaticRecord();
      setAdresMaticAddresses(parsed);
      setActiveAdresMaticPanel("tek");
      setAdresMaticFileName(fileName);

      toast({
        title: "AdresMatic dosyasi islendi",
        description: `${parsed.length} adres kaydi basariyla yuklendi.`,
      });
    } catch (error) {
      console.error("AdresMatic dosya ayristirma hatasi:", error);
      toast({
        title: "AdresMatic dosyasi islenemedi",
        description: "Dosya icerigi okunurken bir hata olustu.",
        variant: "destructive",
      });
    } finally {
      setIsAdresMaticLoading(false);
    }
  };

  const toggleAdresMaticComplete = (id: string) => {
    setAdresMaticAddresses((previous) =>
      previous.map((address) => (address.id === id ? { ...address, isCompleted: !address.isCompleted } : address))
    );
  };

  const clearAdresMaticSession = () => {
    setAdresMaticAddresses([]);
    setActiveAdresMaticPanel("tek");
    setAdresMaticSortOrders({ tek: "asc", cift: "asc", sokak: "asc" });
    setAdresMaticFileName("");
    setAdresMaticLastUpdatedAt("");
    localStorage.removeItem(ADRESMATIC_SESSION_STORAGE_KEY);
    localStorage.removeItem(ADRESMATIC_COMPLETED_STORAGE_KEY);
  };

  const continueAdresMaticSession = () => {
    document.getElementById("adresmatic-active-list")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const adresMaticBuckets = useMemo(() => {
    const tek = adresMaticAddresses.filter((address) => address.oddOrEven === "Tek");
    const cift = adresMaticAddresses.filter((address) => address.oddOrEven === "Cift");
    const sokak = adresMaticAddresses.filter(hasAdresMaticStreetMarker);
    const review = adresMaticAddresses.filter(
      (address) => !address.doorNumberNumeric || address.warning || address.confidence === "low"
    );

    return {
      tek: sortAdresMaticByDoorNumber(tek, adresMaticSortOrders.tek),
      cift: sortAdresMaticByDoorNumber(cift, adresMaticSortOrders.cift),
      sokak: sortAdresMaticByDoorNumber(sokak, adresMaticSortOrders.sokak),
      review,
    };
  }, [adresMaticAddresses, adresMaticSortOrders]);

  const activeAdresMaticList = adresMaticBuckets[activeAdresMaticPanel];
  const activeAdresMaticTitle =
    activeAdresMaticPanel === "tek"
      ? "Tek Kapi Numarali Adresler"
      : activeAdresMaticPanel === "cift"
        ? "Cift Kapi Numarali Adresler"
        : "Sokak Iceren Adresler";

  const setAdresMaticSortOrder = (panel: AdresMaticPanel, sortOrder: AdresMaticSortOrder) => {
    setAdresMaticSortOrders((previous) => ({ ...previous, [panel]: sortOrder }));
    setActiveAdresMaticPanel(panel);
  };

  const exportAdresMaticData = (format: "txt" | "csv") => {
    let content = "";

    if (format === "csv") {
      content = "Isim,Tam Adres,Sokak/Cadde,Kapi No,Tip,Sokak Bilgisi\n";
      adresMaticAddresses.forEach((address) => {
        content += `"${address.name.replace(/"/g, '""')}","${address.fullAddress.replace(/"/g, '""')}","${address.streetOrAvenue}","${address.doorNumber}","${address.oddOrEven}","${getAdresMaticStreetInfo(address)}"\n`;
      });
    } else {
      adresMaticAddresses.forEach((address) => {
        const streetInfo = getAdresMaticStreetInfo(address);
        content += `${address.oddOrEven} | ${address.streetOrAvenue} No:${address.doorNumber} | ${address.name} | ${address.fullAddress}${streetInfo ? ` | Sokak: ${streetInfo}` : ""}\n`;
      });
    }

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `adresmatic_export_${Date.now()}.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#F8FAFC] pb-10 text-[#1E293B] selection:bg-primary/10">
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex min-h-16 items-center justify-between gap-2 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 rounded-lg bg-primary p-1.5">
              <FileText className="h-5 w-5 text-primary-foreground sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="min-w-0 truncate text-lg font-bold tracking-tight text-primary sm:text-xl">
                AdresMatic
              </h1>
              <p className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:block">
                Tek / Cift / Sokak ayrimi
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="h-9 px-2 text-slate-500 hover:bg-primary/5 hover:text-primary sm:px-3">
              <Link href="/">Ana Menüye Dön</Link>
            </Button>
            {adresMaticAddresses.length > 0 && (
              <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-2 sm:px-3">
                    <Download className="mr-1.5 h-4 w-4 sm:mr-2" />
                    <span className="whitespace-nowrap">Disa Aktar</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportAdresMaticData("txt")}>TXT Olarak Kaydet</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportAdresMaticData("csv")}>CSV Olarak Kaydet</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={clearAdresMaticSession}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-5xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-4 sm:py-6">
        {adresMaticAddresses.length === 0 ? (
          <div className="mx-auto mt-4 max-w-2xl sm:mt-10">
            <AdresMaticFileUploader
              onAdresMaticFileLoaded={handleAdresMaticFileLoaded}
              isAdresMaticLoading={isAdresMaticLoading}
            />
            <div className="mt-4 flex min-w-0 items-start justify-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-center text-xs leading-5 text-muted-foreground sm:mt-6">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="min-w-0 break-words">
                PDF/TXT okuma ve export AdresMatic modulunun kendi motoruyla calisir.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <section className="flex flex-col gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900">Kayıtlı çalışma bulundu</p>
                <p className="mt-1 break-words text-xs font-medium text-slate-500">
                  {adresMaticFileName ? `${adresMaticFileName} · ` : ""}
                  {adresMaticAddresses.length} kayıt
                  {formatAdresMaticSessionTime(adresMaticLastUpdatedAt)
                    ? ` · ${formatAdresMaticSessionTime(adresMaticLastUpdatedAt)}`
                    : ""}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                <Button size="sm" className="h-9 px-3" onClick={continueAdresMaticSession}>
                  Devam et
                </Button>
                <Button size="sm" variant="outline" className="h-9 px-2 text-xs sm:px-3" onClick={clearAdresMaticSession}>
                  Yeni Dosya Yükle / Temizle
                </Button>
              </div>
            </section>

            <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Toplam kayit</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{adresMaticAddresses.length}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Tek: {adresMaticBuckets.tek.length}</Badge>
                <Badge variant="secondary">Cift: {adresMaticBuckets.cift.length}</Badge>
                <Badge variant="secondary">Sokak: {adresMaticBuckets.sokak.length}</Badge>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <AdresMaticSummaryCard
                active={activeAdresMaticPanel === "tek"}
                count={adresMaticBuckets.tek.length}
                description="1, 3, 5 veya ters siralama"
                icon={<Route className="h-5 w-5" />}
                onOpen={() => setActiveAdresMaticPanel("tek")}
                onSortChange={(sortOrder) => setAdresMaticSortOrder("tek", sortOrder)}
                sortOrder={adresMaticSortOrders.tek}
                title="Tek Kapi Numarali Adresler"
              />
              <AdresMaticSummaryCard
                active={activeAdresMaticPanel === "cift"}
                count={adresMaticBuckets.cift.length}
                description="2, 4, 6 veya ters siralama"
                icon={<ListFilter className="h-5 w-5" />}
                onOpen={() => setActiveAdresMaticPanel("cift")}
                onSortChange={(sortOrder) => setAdresMaticSortOrder("cift", sortOrder)}
                sortOrder={adresMaticSortOrders.cift}
                title="Cift Kapi Numarali Adresler"
              />
              <AdresMaticSummaryCard
                active={activeAdresMaticPanel === "sokak"}
                count={adresMaticBuckets.sokak.length}
                description="SOK, SK veya SOKAK gecenler"
                icon={<FileText className="h-5 w-5" />}
                onOpen={() => setActiveAdresMaticPanel("sokak")}
                onSortChange={(sortOrder) => setAdresMaticSortOrder("sokak", sortOrder)}
                sortOrder={adresMaticSortOrders.sokak}
                title="Sokak Iceren Adresler"
              />
            </section>

            <section id="adresmatic-active-list" className="scroll-mt-24 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-black text-slate-900 sm:text-lg">{activeAdresMaticTitle}</h2>
                  <p className="text-xs font-medium text-slate-400">
                    {activeAdresMaticList.length} kayit gosteriliyor
                  </p>
                </div>
                <Badge variant="outline">
                  {adresMaticSortOrders[activeAdresMaticPanel] === "asc" ? "Kucukten buyuge" : "Buyukten kucuge"}
                </Badge>
              </div>

              {activeAdresMaticList.length > 0 ? (
                <div className="grid grid-cols-1 gap-3">
                  {activeAdresMaticList.map((address) => (
                    <AdresMaticAddressCard
                      key={address.id}
                      address={address}
                      onToggleAdresMaticComplete={toggleAdresMaticComplete}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-white px-4 py-8 text-center text-sm font-medium text-slate-400">
                  Bu kart icin adres bulunamadi.
                </div>
              )}
            </section>

            {adresMaticBuckets.review.length > 0 && (
              <section className="space-y-3 rounded-xl border border-destructive/15 bg-destructive/5 p-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-sm font-black text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Inceleme Gerekli
                  </h2>
                  <Badge variant="destructive">{adresMaticBuckets.review.length}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {adresMaticBuckets.review.slice(0, 6).map((address) => (
                    <AdresMaticAddressCard
                      key={address.id}
                      address={address}
                      onToggleAdresMaticComplete={toggleAdresMaticComplete}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      <Toaster />
    </main>
  );
}
