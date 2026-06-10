"use client";

import React, { useState, useRef } from "react";
import { Upload, FileWarning, Loader2, FileText, MapPin, AlertCircle, FilePlus } from "lucide-react";
import { parseAddressLine, deduplicateAddresses } from "@/lib/parser";
import type { ParsedAddress } from "@/types/address";
import { useToast } from "@/hooks/use-toast";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;

interface FileUploaderProps {
  onDataLoaded: (data: ParsedAddress[]) => void;
}

export default function FileUploader({ onDataLoaded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ 
        data: arrayBuffer,
        useSystemFonts: true,
        disableFontFace: false
      });
      
      const pdf = await loadingTask.promise;
      let fullText = "";

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        const lines: { [key: number]: string[] } = {};
        
        items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push(item.str);
        });

        const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
        const pageText = sortedY.map(y => lines[y].join(" ")).join("\n");
        fullText += pageText + "\n";
        page.cleanup();
      }
      return fullText;
    } catch (err: any) {
      throw new Error("PDF dosyası okunamadı.");
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setError(null);
    const fileName = file.name.toLowerCase();
    const isTxt = fileName.endsWith(".txt");
    const isPdf = fileName.endsWith(".pdf");

    if (!isTxt && !isPdf) {
      toast({ variant: "destructive", title: "Hata", description: "Lütfen .txt veya .pdf seçin." });
      return;
    }

    setLoading(true);
    try {
      let content = "";
      if (isTxt) {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error("Dosya okunamadı."));
          reader.readAsText(file, "UTF-8");
        });
      } else if (isPdf) {
        content = await extractTextFromPdf(file);
      }

      const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 15);
      const results: ParsedAddress[] = [];
      for (const line of lines) {
        const parsed = parseAddressLine(line);
        if (parsed) results.push(parsed);
      }
      const cleanResults = deduplicateAddresses(results);
      if (cleanResults.length === 0) throw new Error("Geçerli adres bulunamadı.");
      onDataLoaded(cleanResults);
      toast({ title: "Başarılı", description: `${cleanResults.length} adres yüklendi.` });
    } catch (err: any) {
      setError(err.message);
      toast({ variant: "destructive", title: "Hata", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "relative transition-all duration-500 p-8 text-center min-h-[420px] flex flex-col items-center justify-center cursor-pointer ios-card group",
        isDragging ? "bg-primary/5 scale-[1.02]" : "bg-white"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) processFile(e.dataTransfer.files[0]); }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.length && processFile(e.target.files[0])} accept=".txt,.pdf" className="hidden" />
      
      <div className="flex flex-col items-center gap-8 relative z-20">
        <div className={cn(
          "w-24 h-24 rounded-[2rem] flex items-center justify-center transition-all duration-500",
          loading ? "bg-primary/10" : "bg-[#F2F2F7] group-hover:scale-110 ios-shadow"
        )}>
          {loading ? (
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
          ) : error ? (
            <AlertCircle className="w-10 h-10 text-destructive" />
          ) : (
            <FilePlus className="w-10 h-10 text-primary" />
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight">
            {error ? "Hata Oluştu" : "Dosya Yükle"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-[240px] mx-auto font-medium">
            {error ? error : "Listeyi içeren PDF veya TXT dosyasını buraya sürükleyin."}
          </p>
        </div>

        <div className="flex items-center gap-2 px-6 py-2 rounded-full bg-[#F2F2F7] text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          <FileText className="w-3 h-3" /> PDF & TXT Desteklenir
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-md flex flex-col items-center justify-center z-50 rounded-[1.5rem]">
          <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
          <p className="font-bold text-primary">Analiz Ediliyor</p>
        </div>
      )}
    </Card>
  );
}