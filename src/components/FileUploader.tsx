"use client";

import React, { useCallback, useState, useRef } from "react";
import { Upload, FileWarning, Loader2 } from "lucide-react";
import { parseAddressLine, deduplicateAddresses } from "@/lib/parser";
import type { ParsedAddress } from "@/types/address";
import { useToast } from "@/hooks/use-toast";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onDataLoaded: (data: ParsedAddress[]) => void;
}

export default function FileUploader({ onDataLoaded }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processFile = async (file: File) => {
    if (!file) return;
    
    // Check extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".txt")) {
      toast({
        variant: "destructive",
        title: "Dosya Tipi Hatası",
        description: "Lütfen sadece .txt uzantılı bir metin dosyası seçin.",
      });
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text || !text.trim()) {
          toast({
            variant: "destructive",
            title: "Dosya Boş",
            description: "Yüklenen dosyanın içeriği boş.",
          });
          setLoading(false);
          return;
        }

        const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
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
            description: "Dosyada geçerli adres satırı tespit edilemedi.",
          });
          setLoading(false);
          return;
        }

        onDataLoaded(cleanResults);
        
        toast({
          title: "Başarılı",
          description: `${cleanResults.length} adet adres yüklendi.`,
        });
      } catch (err) {
        console.error("Processing error:", err);
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Dosya işlenirken bir sorun oluştu.",
        });
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      toast({
        variant: "destructive",
        title: "Okuma Hatası",
        description: "Dosya okunamadı.",
      });
      setLoading(false);
    };

    reader.readAsText(file, "UTF-8");
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
        "relative border-2 border-dashed transition-all duration-300 p-12 text-center min-h-[350px] flex flex-col items-center justify-center cursor-pointer overflow-hidden",
        isDragging ? "border-primary bg-primary/10 shadow-lg" : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
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
        accept=".txt"
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-6 pointer-events-none">
        <div className={cn(
          "p-6 rounded-full bg-primary/10 transition-transform",
          isDragging && "scale-110 bg-primary/20"
        )}>
          {loading ? (
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          ) : (
            <Upload className="w-12 h-12 text-primary" />
          )}
        </div>
        
        <div className="space-y-3">
          <h3 className="text-2xl font-bold">TXT Dosyası Yükle</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Adresleri içeren dosyayı sürükleyin veya <span className="text-primary font-bold">buraya tıklayarak</span> seçin.
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-4 py-2 rounded-lg">
          <FileWarning className="w-3.5 h-3.5" /> Sadece .txt desteklenir
        </div>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="font-bold text-primary">Veriler Hazırlanıyor...</p>
          </div>
        </div>
      )}
    </Card>
  );
}
