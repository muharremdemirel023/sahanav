"use client";

import React, { useState, useRef } from "react";
import { Upload, FileWarning, Loader2, FilePlus, ArrowRight, Trash2, Edit2, Check, X, FileText, Info } from "lucide-react";
import { parseTxtContent, deduplicateAddresses, parseAddressLine } from "@/lib/parser";
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
      /\d{2}\.\d{2}\.\d{4}/g, /İSTANBUL/g, /BÖLGE[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g,
      /EKİP YETKİLİSİ[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g, /ÜYE NO[:\s]*\d+/g,
      /KAMPANYA[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g, /LANSMAN[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g,
      /SEGMENT[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g, /ZİYARET ŞEKLİ[:\s]*[A-ZÇĞİÖŞÜ0-9\s]+/g,
      /\d+\.?\d+\s*TL'YE KADAR.*/gi, new RegExp(searchPlate.replace(/\s/g, ''), 'g'),
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
      if (extractedLines.length === 0) throw new Error("Plakaya ait kayıt bulunamadı.");
      return extractedLines;
    } catch (err: any) {
      toast({ variant: "destructive", title: "İşlem Başarısız", description: err.message });
      throw err;
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setLoading(true);
    try {
      if (mode === "txt") {
        const content = await file.text();
        const results = deduplicateAddresses(parseTxtContent(content));
        onDataLoaded(results);
      } else {
        if (!plate.trim()) {
          toast({ variant: "destructive", title: "Plaka Gerekli", description: "Lütfen bir plaka numarası girin." });
          setLoading(false);
          return;
        }
        const lines = await extractTextFromPdf(file);
        setPreviewLines(lines.map(l => ({ id: Math.random().toString(36).substr(2, 9), text: l })));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (previewLines.length > 0) {
    return (
      <Card className="premium-card p-8 space-y-6 max-w-2xl mx-auto border-slate-200">
        <div className="flex justify-between items-center border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">PDF Önizleme</h3>
              <p className="text-xs text-slate-400 font-semibold">{previewLines.length} kayıt ayıklandı</p>
            </div>
          </div>
          <Button onClick={() => onDataLoaded(deduplicateAddresses(previewLines.map(l => parseAddressLine(l.text)).filter((l): l is ParsedAddress => !!l)))} className="rounded-full bg-primary hover:bg-primary/90 px-6">
            Sisteme Aktar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
        
        <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
          {previewLines.map((line) => (
            <div key={line.id} className="group relative flex items-center gap-4 p-4 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 rounded-2xl transition-all">
              {editingId === line.id ? (
                <div className="flex-1 flex gap-2">
                  <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-10 bg-white border-primary/20" autoFocus />
                  <Button size="icon" variant="ghost" onClick={() => { setPreviewLines(p => p.map(l => l.id === editingId ? { ...l, text: editValue } : l)); setEditingId(null); }} className="text-emerald-600"><Check className="w-5 h-5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="text-destructive"><X className="w-5 h-5" /></Button>
                </div>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {previewLines.indexOf(line) + 1}
                  </div>
                  <span className="flex-1 text-sm font-semibold text-slate-700 leading-tight">{line.text}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingId(line.id); setEditValue(line.text); }} className="text-slate-400 hover:text-primary"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setPreviewLines(p => p.filter(l => l.id !== line.id))} className="text-slate-400 hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <Button variant="ghost" onClick={() => setPreviewLines([])} className="w-full text-slate-400 text-xs font-bold hover:bg-transparent hover:text-slate-600">
          Listeyi Temizle ve Vazgeç
        </Button>
      </Card>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-slate-900">Veri Yükleme Merkezi</h2>
        <p className="text-sm text-slate-400 font-medium">Lütfen işlemek istediğiniz dosyayı seçin</p>
      </div>

      <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-slate-100/50 p-1.5 rounded-2xl h-14">
          <TabsTrigger value="txt" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">TXT Dosyası</TabsTrigger>
          <TabsTrigger value="pdf" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all">PDF Planı</TabsTrigger>
        </TabsList>
        <TabsContent value="pdf" className="mt-6">
          <div className="space-y-2">
            <div className="relative">
              <Input 
                placeholder="Plaka Girin (Örn: 34ABC123)" 
                value={plate} 
                onChange={(e) => setPlate(e.target.value)} 
                className="h-14 bg-white rounded-2xl shadow-sm border-slate-200 px-12 font-bold placeholder:text-slate-300 focus:ring-primary/20" 
              />
              <Info className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            </div>
            <p className="text-[10px] text-slate-400 font-bold px-4 uppercase tracking-wider">PDF'deki plaka ile eşleşen kayıtlar getirilir</p>
          </div>
        </TabsContent>
      </Tabs>

      <div
        className={cn(
          "relative p-10 text-center min-h-[340px] flex flex-col items-center justify-center cursor-pointer premium-card group overflow-hidden border-dashed border-2 border-slate-200",
          isDragging && "bg-primary/5 border-primary scale-[1.01]"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input type="file" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])} accept={mode === "txt" ? ".txt" : ".pdf"} className="hidden" />
        
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />

        <div className="relative flex flex-col items-center gap-6">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center bg-white shadow-xl shadow-slate-200/50 group-hover:scale-110 transition-transform duration-500">
            {loading ? (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            ) : (
              <div className="relative">
                <Upload className="w-10 h-10 text-primary" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-800">{mode === "txt" ? "TXT Dosyasını Bırak" : "PDF Planını Bırak"}</h3>
            <p className="text-slate-400 text-sm font-medium">Veya buraya tıklayarak cihazından seç</p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100/50 flex gap-4">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
          <Info className="w-4 h-4 text-primary" />
        </div>
        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          {mode === "txt" 
            ? "TXT dosyasındaki işletme adı ve adres blokları otomatik olarak mahallelerine göre gruplandırılacaktır."
            : "PDF dosyasındaki günlük rota planından girdiğiniz plakaya ait olan veriler temizlenerek sisteme aktarılır."}
        </p>
      </div>
    </div>
  );
}