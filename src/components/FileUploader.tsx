
"use client";

import React, { useState, useRef } from "react";
import { Upload, FileWarning, Loader2, FilePlus, ArrowRight, Download, Trash2, Edit2, Check, X } from "lucide-react";
import { parseAddressLine, deduplicateAddresses } from "@/lib/parser";
import type { ParsedAddress } from "@/types/address";
import { useToast } from "@/hooks/use-toast";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import * as pdfjsLib from "pdfjs-dist";

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface FileUploaderProps {
  onDataLoaded: (data: ParsedAddress[]) => void;
}

export default function FileUploader({ onDataLoaded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"txt" | "pdf">("txt");
  const [plate, setPlate] = useState("");
  const [previewLines, setPreviewLines] = useState<{ id: string; text: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const cleanExtractedLine = (line: string, searchPlate: string): string => {
    let cleaned = line.replace(/\s+/g, ' ').trim();
    const upperLine = cleaned.toUpperCase();

    const junkPatterns = [
      /\d{2}\.\d{2}\.\d{4}/g,
      /İSTANBUL/g,
      /BÖLGE[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g,
      /EKİP YETKİLİSİ[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g,
      /ÜYE NO[:\s]*\d+/g,
      /KAMPANYA[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g,
      /LANSMAN[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g,
      /SEGMENT[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g,
      /ZİYARET ŞEKLİ[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g,
      /\d+\.?\d+\s*TL'YE KADAR.*/gi,
      new RegExp(searchPlate.replace(/\s/g, ''), 'g'),
    ];

    let processed = upperLine;
    junkPatterns.forEach(pattern => processed = processed.replace(pattern, ''));

    processed = processed.replace(/BLK[:\s]*[A-Z]NO[:\s]*/g, ' NO:');
    processed = processed.replace(/NO[:\s]*(\d+)([A-ZÇĞİÖŞÜ\s]+MAH\.?)/g, '$2 NO:$1');
    processed = processed.replace(/MAH\.NO[:\s]*/g, 'MAH. NO:');
    processed = processed.replace(/CAD\.([A-ZÇĞİÖŞÜ])/g, 'CAD. $1');
    processed = processed.replace(/SOK\.([A-ZÇĞİÖŞÜ])/g, 'SOK. $1');

    const mahIndex = processed.indexOf('MAH');
    let firmaName = "BİLİNMEYEN FİRMA";
    let addressPart = processed;

    if (mahIndex > 10) {
      firmaName = processed.substring(0, mahIndex).trim();
      addressPart = processed.substring(firmaName.length).trim();
    }

    return `${firmaName.replace(/\d+$/, '').trim()} - ${addressPart}`.replace(/\s+/g, ' ').trim();
  };

  const extractTextFromPdf = async (file: File): Promise<string[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const normalizedSearchPlate = plate.replace(/\s+/g, '').toUpperCase();
      const extractedLines: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        
        const rowsMap: { [key: number]: any[] } = {};
        items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!rowsMap[y]) rowsMap[y] = [];
          rowsMap[y].push(item);
        });

        const sortedY = Object.keys(rowsMap).map(Number).sort((a, b) => b - a);
        sortedY.forEach(y => {
          const rowItems = rowsMap[y].sort((a, b) => a.transform[4] - b.transform[4]);
          const fullLine = rowItems.map(item => item.str).join(" ");
          if (fullLine.replace(/\s+/g, '').toUpperCase().includes(normalizedSearchPlate)) {
            const cleaned = cleanExtractedLine(fullLine, normalizedSearchPlate);
            if (cleaned.length > 20) extractedLines.push(cleaned);
          }
        });
      }

      if (extractedLines.length === 0) throw new Error("PDF metni çıkarılamadı. Bu PDF taranmış görsel olabilir.");
      return extractedLines;
    } catch (err: any) {
      console.error("PDF okuma hatası:", err);
      toast({ variant: "destructive", title: "PDF okuyucu başlatılamadı.", description: err.message });
      throw err;
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setLoading(true);
    console.log("--- DOSYA İŞLEME BAŞLADI ---");
    console.log("Dosya adı:", file.name);
    console.log("Mod:", mode);

    try {
      if (mode === "txt") {
        const content = await file.text();
        const lines = content.split(/\r?\n/).filter(l => l.trim().length > 10);
        console.log("Okunan ham satır sayısı:", lines.length);
        
        const parsedResults = lines
          .map(l => parseAddressLine(l.trim()))
          .filter((l): l is ParsedAddress => !!l);
        
        const results = deduplicateAddresses(parsedResults);
        console.log("Ayrıştırılan ve tekilleştirilen kayıt sayısı:", results.length);
        
        onDataLoaded(results);
      } else {
        if (!plate.trim()) { 
          toast({ variant: "destructive", title: "Plaka Gerekli" }); 
          setLoading(false); 
          return; 
        }
        const lines = await extractTextFromPdf(file);
        console.log("PDF'den ayıklanan satır sayısı:", lines.length);
        setPreviewLines(lines.map(l => ({ id: Math.random().toString(36).substr(2, 9), text: l })));
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Hata", description: err.message });
    } finally {
      setLoading(false);
      // Dosya girişini temizle ki aynı dosya tekrar seçildiğinde onChange tetiklensin
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (previewLines.length > 0) {
    return (
      <Card className="ios-card p-8 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <h3 className="text-xl font-bold">PDF Önizleme ({previewLines.length})</h3>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onDataLoaded(deduplicateAddresses(previewLines.map(l => parseAddressLine(l.text)).filter((l): l is ParsedAddress => !!l)))} className="rounded-full bg-primary">
              İlerle <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
          {previewLines.map((line) => (
            <div key={line.id} className="flex items-center gap-3 p-3 bg-[#F2F2F7] rounded-xl group">
              {editingId === line.id ? (
                <div className="flex-1 flex gap-2">
                  <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-9 bg-white" />
                  <Button size="icon" variant="ghost" onClick={() => { setPreviewLines(p => p.map(l => l.id === editingId ? { ...l, text: editValue } : l)); setEditingId(null); }} className="text-green-600"><Check className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="text-destructive"><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium">{line.text}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingId(line.id); setEditValue(line.text); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setPreviewLines(p => p.filter(l => l.id !== line.id))} className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <Button variant="ghost" onClick={() => setPreviewLines([])} className="w-full text-muted-foreground text-xs font-bold">Vazgeç</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#F2F2F7] h-12 rounded-2xl p-1.5">
          <TabsTrigger value="txt" className="rounded-xl font-bold">TXT Yükle</TabsTrigger>
          <TabsTrigger value="pdf" className="rounded-xl font-bold">PDF Yükle</TabsTrigger>
        </TabsList>
        <TabsContent value="pdf" className="mt-6">
          <Input placeholder="Plaka (Örn: 34GPB365)" value={plate} onChange={(e) => setPlate(e.target.value)} className="h-12 bg-white rounded-xl ios-shadow border-none" />
        </TabsContent>
      </Tabs>
      <Card
        className={cn("relative p-8 text-center min-h-[320px] flex flex-col items-center justify-center cursor-pointer ios-card group", isDragging && "bg-primary/5 scale-[1.02]")}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} accept={mode === "txt" ? ".txt" : ".pdf"} className="hidden" />
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-[1.75rem] flex items-center justify-center bg-[#F2F2F7] ios-shadow group-hover:scale-110 transition-transform">
            {loading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <FilePlus className="w-8 h-8 text-primary" />}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">{mode === "txt" ? "TXT Dosyası" : "PDF Planı"}</h3>
            <p className="text-muted-foreground text-xs font-medium">Dosyayı sürükleyin veya tıklayın</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
