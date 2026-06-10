
"use client";

import React, { useState, useRef } from "react";
import { Upload, FileWarning, Loader2, FileText, MapPin } from "lucide-react";
import { parseAddressLine, deduplicateAddresses } from "@/lib/parser";
import type { ParsedAddress } from "@/types/address";
import { useToast } from "@/hooks/use-toast";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";
import * as pdfjs from "pdfjs-dist";

// PDF Worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface FileUploaderProps {
  onDataLoaded: (data: ParsedAddress[]) => void;
}

export default function FileUploader({ onDataLoaded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      let lastY;
      let pageText = "";
      
      // Smart text extraction based on Y coordinates to maintain line structure
      for (const item of textContent.items as any[]) {
        if (lastY !== undefined && Math.abs(lastY - item.transform[5]) > 2) {
          pageText += "\n";
        }
        pageText += item.str;
        lastY = item.transform[5];
      }
      fullText += pageText + "\n";
    }
    return fullText;
  };

  const processFile = async (file: File) => {
    if (!file) return;
    
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
          reader.onerror = reject;
          reader.readAsText(file, "UTF-8");
        });
      } else if (isPdf) {
        content = await extractTextFromPdf(file);
      }

      if (!content || !content.trim()) {
        throw new Error("Dosya içeriği okunamadı veya boş.");
      }

      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 10);
      const results: ParsedAddress[] = [];

      for (const line of lines) {
        const parsed = parseAddressLine(line);
        if (parsed) results.push(parsed);
      }

      const cleanResults = deduplicateAddresses(results);
      
      if (cleanResults.length === 0) {
        toast({
          variant: "destructive",
          title: "Veri Bulunamadı",
          description: "Dosyada geçerli bir adres formatı tespit edilemedi.",
        });
        setLoading(false);
        return;
      }

      onDataLoaded(cleanResults);
      
      toast({
        title: "Başarılı",
        description: `${cleanResults.length} adet adres yüklendi.`,
      });
    } catch (err: any) {
      console.error("Processing error:", err);
      toast({
        variant: "destructive",
        title: "Hata",
        description: err.message || "Dosya işlenirken bir sorun oluştu.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleZoneClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card
      className={cn(
        "relative border-2 border-dashed transition-all duration-300 p-12 text-center min-h-[400px] flex flex-col items-center justify-center cursor-pointer overflow-hidden z-10 group",
        isDragging ? "border-primary bg-primary/10 shadow-lg scale-[1.01]" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleZoneClick}
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
          isDragging && "scale-110 bg-primary/20 rotate-3"
        )}>
          {loading ? (
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          ) : (
            <div className="relative">
               <Upload className="w-16 h-16 text-primary" />
               <FileText className="w-8 h-8 text-accent absolute -bottom-1 -right-1 bg-background rounded-lg p-1 shadow-sm border" />
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <h3 className="text-3xl font-black tracking-tight text-foreground">Dosya Yükle</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto font-medium">
            Adresleri içeren <span className="text-primary font-bold">PDF</span> veya <span className="text-primary font-bold">TXT</span> dosyasını sürükleyin veya buraya tıklayın.
          </p>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-4 py-2 rounded-lg border">
            <FileWarning className="w-3.5 h-3.5" /> PDF & TXT DESTEKLENİR
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="relative">
              <Loader2 className="w-14 h-14 text-primary animate-spin" />
              <MapPin className="w-6 h-6 text-accent absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce" />
            </div>
            <div>
              <p className="font-black text-xl text-primary mb-1">Analiz Ediliyor...</p>
              <p className="text-muted-foreground text-sm font-medium">PDF içeriği taranıyor ve adresler ayrıştırılıyor.</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
