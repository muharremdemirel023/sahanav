"use client";

import React, { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
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
    if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Lütfen sadece .txt formatında bir dosya yükleyin.",
      });
      return;
    }

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        const results: ParsedAddress[] = [];

        for (const line of lines) {
          const parsed = parseAddressLine(line);
          if (parsed) results.push(parsed);
        }

        const cleanResults = deduplicateAddresses(results);
        onDataLoaded(cleanResults);
        
        toast({
          title: "Başarılı",
          description: `${cleanResults.length} adres başarıyla yüklendi.`,
        });
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Dosya işlenirken bir sorun oluştu.",
        });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsText(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  return (
    <Card
      className={`relative border-2 border-dashed transition-all duration-200 p-8 text-center ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/20 hover:border-primary/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".txt"
        onChange={handleFileChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={loading}
      />
      
      <div className="flex flex-col items-center gap-4">
        <div className="p-4 bg-primary/10 rounded-full">
          <Upload className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-headline font-semibold">Dosya Yükle</h3>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            TXT dosyanızı sürükleyip bırakın veya seçmek için tıklayın.
          </p>
        </div>
        <Button variant="outline" className="mt-2 pointer-events-none">
          Dosya Seç
        </Button>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm font-medium">İşleniyor...</p>
          </div>
        </div>
      )}
    </Card>
  );
}
