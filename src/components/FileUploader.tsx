
"use client";

import React, { useState, useRef } from "react";
import { Upload, FileWarning, Loader2, FileText, MapPin, AlertCircle, FilePlus, ArrowRight, Download, Trash2, Edit2, Check, X } from "lucide-react";
import { parseAddressLine, deduplicateAddresses } from "@/lib/parser";
import type { ParsedAddress } from "@/types/address";
import { useToast } from "@/hooks/use-toast";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import * as pdfjs from "pdfjs-dist";

// Worker configuration for Next.js 15 environments
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
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

  const cleanExtractedLine = (line: string): string => {
    let cleaned = line.replace(/\s+/g, ' ').trim().toUpperCase();
    
    cleaned = cleaned.replace(/NO:(\d+)([A-ZÇĞİÖŞÜ\s]+MAH\.?)/gi, '$2 NO:$1');
    cleaned = cleaned.replace(/NO:(\d+[A-Z])([A-ZÇĞİÖŞÜ\s]+MAH\.?)/gi, '$2 NO:$1');

    const junkPatterns = [
      /\d{2}\.\d{2}\.\d{4}/g,
      /EKİP YETKİLİSİ:.*$/g,
      /ÜYE NO:.*$/g,
      /KAMPANYA:.*$/g,
      /LANSMAN:.*$/g,
      /SEGMENT:.*$/g,
      /İSTANBUL/g,
      /BÖLGE:.*$/g,
    ];

    junkPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    if (plate) {
      const normalizedPlate = plate.replace(/\s+/g, '').toUpperCase();
      cleaned = cleaned.replace(new RegExp(normalizedPlate, 'g'), '');
      const spacePlate = plate.replace(/(\d{2})([A-Z]+)(\d+)/, '$1 $2 $3').toUpperCase();
      cleaned = cleaned.replace(new RegExp(spacePlate, 'g'), '');
    }

    return cleaned.replace(/\s+/g, ' ').trim();
  };

  const extractTextFromPdf = async (file: File): Promise<string[]> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      
      let pdf;
      try {
        pdf = await loadingTask.promise;
      } catch (e) {
        console.error("PDF Worker Error:", e);
        throw new Error("PDF okuyucu başlatılamadı.");
      }

      const normalizedSearchPlate = plate.replace(/\s+/g, '').toUpperCase();
      const extractedLines: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        
        if (items.length === 0) continue;

        // Group items by vertical position to reconstruct rows
        const linesMap: { [key: number]: string[] } = {};
        items.forEach(item => {
          const y = Math.round(item.transform[5]);
          if (!linesMap[y]) linesMap[y] = [];
          linesMap[y].push(item.str);
        });

        const sortedY = Object.keys(linesMap).map(Number).sort((a, b) => b - a);
        sortedY.forEach(y => {
          const fullLine = linesMap[y].join(" ");
          const normalizedLine = fullLine.replace(/\s+/g, '').toUpperCase();
          
          if (normalizedLine.includes(normalizedSearchPlate)) {
            extractedLines.push(cleanExtractedLine(fullLine));
          }
        });
      }

      if (extractedLines.length === 0) {
        throw new Error("PDF metni çıkarılamadı. Bu PDF taranmış görsel olabilir veya belirtilen plaka bulunamadı.");
      }

      return extractedLines;
    } catch (err: any) {
      console.error("PDF Extraction Error:", err);
      if (err.message.includes("okuyucu") || err.message.includes("çıkarılamadı")) {
        throw err;
      }
      throw new Error("PDF dosyası okunurken hata oluştu.");
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();
    
    if (mode === "txt" && !fileName.endsWith(".txt")) {
      toast({ variant: "destructive", title: "Format Hatası", description: "Lütfen .txt uzantılı bir dosya seçin." });
      return;
    }
    if (mode === "pdf" && !fileName.endsWith(".pdf")) {
      toast({ variant: "destructive", title: "Format Hatası", description: "Lütfen .pdf uzantılı bir dosya seçin." });
      return;
    }

    setLoading(true);
    try {
      if (mode === "txt") {
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = () => reject(new Error("Dosya okunamadı."));
          reader.readAsText(file, "UTF-8");
        });
        
        const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 10);
        const results: ParsedAddress[] = [];
        lines.forEach(line => {
          const parsed = parseAddressLine(line);
          if (parsed) results.push(parsed);
        });
        
        const cleanResults = deduplicateAddresses(results);
        if (cleanResults.length === 0) throw new Error("Geçerli adres bulunamadı.");
        onDataLoaded(cleanResults);
      } else {
        if (!plate.trim()) {
          toast({ variant: "destructive", title: "Plaka Gerekli", description: "PDF'den ayıklama yapmak için bir plaka girmelisiniz." });
          setLoading(false);
          return;
        }
        const lines = await extractTextFromPdf(file);
        setPreviewLines(lines.map(l => ({ id: Math.random().toString(36).substr(2, 9), text: l })));
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Hata", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleProceed = () => {
    const finalLines = previewLines.map(l => l.text);
    const results: ParsedAddress[] = [];
    finalLines.forEach(line => {
      const parsed = parseAddressLine(line);
      if (parsed) results.push(parsed);
    });
    const cleanResults = deduplicateAddresses(results);
    onDataLoaded(cleanResults);
    setPreviewLines([]);
  };

  const handleDownloadTxt = () => {
    const content = previewLines.map(l => l.text).join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rota_plaka_${plate.toUpperCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const deleteLine = (id: string) => {
    setPreviewLines(prev => prev.filter(l => l.id !== id));
  };

  const startEditing = (id: string, text: string) => {
    setEditingId(id);
    setEditValue(text);
  };

  const saveEdit = () => {
    setPreviewLines(prev => prev.map(l => l.id === editingId ? { ...l, text: editValue } : l));
    setEditingId(null);
  };

  if (previewLines.length > 0) {
    return (
      <Card className="ios-card p-8 space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h3 className="text-xl font-bold">PDF Önizleme</h3>
            <p className="text-sm text-muted-foreground">{previewLines.length} adres ayıklandı.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadTxt} className="rounded-full">
              <Download className="w-4 h-4 mr-2" /> TXT İndir
            </Button>
            <Button size="sm" onClick={handleProceed} className="rounded-full bg-primary font-bold">
              İlerle <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
          {previewLines.map((line) => (
            <div key={line.id} className="flex items-center gap-3 p-3 bg-[#F2F2F7] rounded-xl group">
              {editingId === line.id ? (
                <div className="flex-1 flex gap-2">
                  <Input 
                    value={editValue} 
                    onChange={(e) => setEditValue(e.target.value)} 
                    className="h-9 bg-white border-none focus-visible:ring-1"
                  />
                  <Button size="icon" variant="ghost" onClick={saveEdit} className="text-green-600 h-9 w-9">
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="text-destructive h-9 w-9">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="flex-1 text-sm font-medium leading-tight">{line.text}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" onClick={() => startEditing(line.id, line.text)} className="h-8 w-8">
                      <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteLine(line.id)} className="h-8 w-8">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        
        <Button variant="ghost" onClick={() => setPreviewLines([])} className="w-full text-muted-foreground text-xs font-bold">
          İptal Et ve Geri Dön
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#F2F2F7] h-12 rounded-2xl p-1.5">
          <TabsTrigger value="txt" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">TXT Yükle</TabsTrigger>
          <TabsTrigger value="pdf" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">PDF Yükle</TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">PLAKA NUMARASI</label>
            <Input 
              placeholder="Örn: 34GPB365" 
              value={plate} 
              onChange={(e) => setPlate(e.target.value)}
              className="h-12 bg-white rounded-xl border-none ios-shadow focus-visible:ring-primary/20"
            />
          </div>
        </TabsContent>
      </Tabs>

      <Card
        className={cn(
          "relative transition-all duration-500 p-8 text-center min-h-[320px] flex flex-col items-center justify-center cursor-pointer ios-card group",
          isDragging ? "bg-primary/5 scale-[1.02]" : "bg-white"
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
          accept={mode === "txt" ? ".txt" : ".pdf"} 
          className="hidden" 
        />
        
        <div className="flex flex-col items-center gap-6 relative z-20">
          <div className={cn(
            "w-20 h-20 rounded-[1.75rem] flex items-center justify-center transition-all duration-500",
            loading ? "bg-primary/10" : "bg-[#F2F2F7] group-hover:scale-110 ios-shadow"
          )}>
            {loading ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <FilePlus className="w-8 h-8 text-primary" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">
              {mode === "txt" ? "TXT Dosyası Yükle" : "PDF Planı Yükle"}
            </h3>
            <p className="text-muted-foreground text-xs max-w-[200px] mx-auto font-medium">
              Dosyayı buraya sürükleyin veya tıklayın.
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F2F2F7] text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
            {mode === "txt" ? "Sadece .txt desteklenir" : "Sadece .pdf desteklenir"}
          </div>
        </div>
        
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-[1.5rem]">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="font-bold text-primary">Veriler Analiz Ediliyor...</p>
          </div>
        )}
      </Card>
    </div>
  );
}
