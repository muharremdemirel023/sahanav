"use client";

import React, { useState, useRef } from "react";
import { Upload, FileWarning, Loader2, FileText, MapPin, AlertCircle } from "lucide-react";
import { parseAddressLine, deduplicateAddresses } from "@/lib/parser";
import type { ParsedAddress } from "@/types/address";
import { useToast } from "@/hooks/use-toast";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import * as pdfjs from "pdfjs-dist";

// PDF.js worker setup - specific version targeting to avoid mismatches
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
        
        // Items are sorted by their vertical position (Y) to maintain line structure
        const items = textContent.items as any[];
        
        // Group items by their vertical position (Y coordinate is at index 5 of transform)
        const lines: { [key: number]: string[] } = {};
        
        items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!lines[y]) lines[y] = [];
          lines[y].push(item.str);
        });

        // Sort Y coordinates from top to bottom
        const sortedY = Object.keys(lines)
          .map(Number)
          .sort((a, b) => b - a);

        const pageText = sortedY
          .map(y => lines[y].join(" "))
          .join("\n");

        fullText += pageText + "\n";
        
        // Basic cleanup for the page to free memory
        page.cleanup();
      }
      return fullText;
    } catch (err: any) {
      console.error("PDF Extraction error:", err);
      throw new Error("PDF dosyası okunurken bir hata oluştu. Dosya şifreli veya bozuk olabilir.");
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setError(null);
    
    const fileName = file.name.toLowerCase();
    const isTxt = fileName.endsWith(".txt");
    const isPdf = fileName.endsWith(".pdf");

    if (!isTxt && !isPdf) {
      toast({
        variant: "destructive",
        title: "Dosya Tipi Hatası",
        description: "Lütfen sadece .txt veya .pdf uzantılı bir dosya seçin.",
      });
      return;
    }

    setLoading(true);

    try {
      let content = "";

      if (isTxt) {
        content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error("TXT dosyası okunamadı."));
          reader.readAsText(file, "UTF-8");
        });
      } else if (isPdf) {
        content = await extractTextFromPdf(file);
      }

      if (!content || !content.trim()) {
        throw new Error("Dosya içeriği okunamadı veya boş.");
      }

      // PDF text can be messy, split by new lines and filter out very short junk
      const lines = content.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 15); // Addresses are usually long

      const results: ParsedAddress[] = [];

      for (const line of lines) {
        const parsed = parseAddressLine(line);
        if (parsed) results.push(parsed);
      }

      const cleanResults = deduplicateAddresses(results);
      
      if (cleanResults.length === 0) {
        throw new Error("Dosyada geçerli bir adres formatı tespit edilemedi.");
      }

      onDataLoaded(cleanResults);
      
      toast({
        title: "Başarılı",
        description: `${cleanResults.length} adet adres yüklendi.`,
      });
    } catch (err: any) {
      console.error("Processing error:", err);
      const msg = err.message || "Dosya işlenirken bir sorun oluştu.";
      setError(msg);
      toast({
        variant: "destructive",
        title: "Hata",
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "relative border-2 border-dashed transition-all duration-300 p-12 text-center min-h-[400px] flex flex-col items-center justify-center cursor-pointer overflow-hidden group",
        isDragging ? "border-primary bg-primary/10 shadow-lg" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) processFile(e.dataTransfer.files[0]); }}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => e.target.files?.length && processFile(e.target.files[0])}
        accept=".txt,.pdf"
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-6 pointer-events-none relative z-20">
        <div className={cn(
          "p-6 rounded-2xl bg-primary/10 transition-all duration-500 shadow-inner",
          isDragging && "scale-110 bg-primary/20"
        )}>
          {loading ? (
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          ) : error ? (
            <AlertCircle className="w-16 h-16 text-destructive" />
          ) : (
            <div className="relative">
               <Upload className="w-16 h-16 text-primary" />
               <FileText className="w-8 h-8 text-accent absolute -bottom-1 -right-1 bg-background rounded-lg p-1 shadow-sm border" />
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <h3 className="text-3xl font-black tracking-tight text-foreground">
            {error ? "Bir Hata Oluştu" : "Dosya Yükle"}
          </h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto font-medium">
            {error ? error : (
              <>Adresleri içeren <span className="text-primary font-bold">PDF</span> veya <span className="text-primary font-bold">TXT</span> dosyasını sürükleyin veya buraya tıklayın.</>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-4 py-2 rounded-lg border">
            <FileWarning className="w-3.5 h-3.5" /> PDF & TXT DESTEKLENİR
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="relative">
              <Loader2 className="w-14 h-14 text-primary animate-spin" />
              <MapPin className="w-6 h-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
            </div>
            <div>
              <p className="font-black text-xl text-primary mb-1">Analiz Ediliyor...</p>
              <p className="text-muted-foreground text-sm font-medium">Veriler taranıyor ve adresler ayrıştırılıyor.</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
