"use client";

import React, { useCallback, useState } from "react";
import { Upload, FileWarning } from "lucide-react";
import { parseAddressLine, deduplicateAddresses } from "@/lib/parser";
import type { ParsedAddress } from "@/types/address";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface FileUploaderProps {
  onDataLoaded: (data: ParsedAddress[]) => void;
}

export default function FileUploader({ onDataLoaded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const processFile = async (file: File) => {
    // Basic validation
    if (!file) return;
    
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".txt")) {
      toast({
        variant: "destructive",
        title: "Dosya Tipi Hatası",
        description: "Lütfen sadece .txt uzantılı metin dosyası yükleyin.",
      });
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || text.trim().length === 0) {
          toast({
            variant: "destructive",
            title: "Dosya Boş",
            description: "Yüklediğiniz dosyanın içeriği boş görünüyor.",
          });
          setLoading(false);
          return;
        }

        const lines = text.split(/\r?\n/);
        const results: ParsedAddress[] = [];

        for (const line of lines) {
          if (line.trim()) {
            const parsed = parseAddressLine(line);
            if (parsed) results.push(parsed);
          }
        }

        const cleanResults = deduplicateAddresses(results);
        
        if (cleanResults.length === 0) {
          toast({
            variant: "destructive",
            title: "Veri Bulunamadı",
            description: "Dosya içerisinde geçerli bir adres satırı tespit edilemedi.",
          });
          setLoading(false);
          return;
        }

        onDataLoaded(cleanResults);
        
        toast({
          title: "Başarılı",
          description: `${cleanResults.length} adet adres başarıyla yüklendi.`,
        });
      } catch (err) {
        console.error("File processing error:", err);
        toast({
          variant: "destructive",
          title: "İşlem Hatası",
          description: "Dosya okunurken beklenmedik bir hata oluştu.",
        });
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Okuma Hatası",
        description: "Dosya sisteme yüklenemedi.",
      });
      setLoading(false);
    };

    // Use UTF-8 for Turkish characters
    reader.readAsText(file, "UTF-8");
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
      // Reset input to allow same file selection again
      e.target.value = '';
    }
  };

  return (
    <Card
      className={`relative border-2 border-dashed transition-all duration-300 p-12 text-center min-h-[350px] flex flex-col items-center justify-center cursor-pointer group ${
        isDragging
          ? "border-primary bg-primary/10 shadow-xl"
          : "border-muted-foreground/30 hover:border-primary/60 hover:bg-muted/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Invisible but clickable full-area input */}
      <input
        type="file"
        accept=".txt"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50"
        disabled={loading}
        title="Dosya Seç"
      />
      
      <div className="flex flex-col items-center gap-6 relative z-10 pointer-events-none">
        <div className={`p-6 rounded-full transition-transform duration-300 ${isDragging ? 'bg-primary/20 scale-110' : 'bg-primary/10'}`}>
          <Upload className={`w-12 h-12 text-primary ${loading ? 'animate-bounce' : 'group-hover:-translate-y-1 transition-transform'}`} />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-headline font-bold text-foreground">TXT Dosyası Yükle</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">
            Adreslerin bulunduğu metin dosyasını sürükleyin veya <span className="text-primary font-bold">tıklayarak seçin</span>.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-4 py-2 rounded-lg">
          <FileWarning className="w-3 h-3" /> Sadece .txt formatı desteklenir
        </div>
        <Button variant="outline" className="mt-4 pointer-events-none font-bold">
          Dosya Gözat
        </Button>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center rounded-lg z-[60]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent shadow-lg"></div>
            <div className="space-y-1 text-center">
              <p className="text-lg font-bold text-primary">Veriler İşleniyor</p>
              <p className="text-xs text-muted-foreground">Lütfen bekleyin...</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}