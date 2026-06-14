"use client";

import React, { useRef, useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface AdresMaticFileUploaderProps {
  onAdresMaticFileLoaded: (content: string, fileName?: string) => void;
  isAdresMaticLoading: boolean;
}

export function AdresMaticFileUploader({
  onAdresMaticFileLoaded,
  isAdresMaticLoading,
}: AdresMaticFileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const extractAdresMaticTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
      const page = await pdf.getPage(pageIndex);
      const textContent = await page.getTextContent();
      const lines = textContent.items.reduce<Record<string, { x: number; str: string }[]>>((acc, item: any) => {
        if (!item.str?.trim()) return acc;
        const y = Math.round(item.transform?.[5] ?? 0).toString();
        acc[y] = acc[y] ?? [];
        acc[y].push({ x: item.transform?.[4] ?? 0, str: item.str });
        return acc;
      }, {});

      const pageText = Object.entries(lines)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([, parts]) =>
          parts
            .sort((a, b) => a.x - b.x)
            .map((part) => part.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim()
        )
        .join("\n");

      fullText += `${pageText}\n`;
    }

    return fullText;
  };

  const readAdresMaticTextFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => reject(reader.error ?? new Error("Dosya okunamadi."));
      reader.onload = () => {
        const result = reader.result;
        resolve(typeof result === "string" ? result : "");
      };

      reader.readAsText(file, "UTF-8");
    });

  const processAdresMaticFile = async (file: File) => {
    if (!file) return;

    setSelectedFileName(file.name);
    setIsReading(true);

    try {
      const fileName = file.name.toLocaleLowerCase("tr-TR");
      const isPdf = file.type === "application/pdf" || fileName.endsWith(".pdf");
      const isTxt = file.type === "text/plain" || fileName.endsWith(".txt");

      if (isPdf) {
        onAdresMaticFileLoaded(await extractAdresMaticTextFromPdf(file), file.name);
      } else if (isTxt) {
        onAdresMaticFileLoaded(await readAdresMaticTextFile(file), file.name);
      } else {
        throw new Error("Desteklenmeyen dosya formati.");
      }
    } finally {
      setIsReading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isDisabled = isAdresMaticLoading || isReading;

  return (
    <Card
      data-selected-file={selectedFileName}
      onClick={() => !isDisabled && fileInputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isDisabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        const file = event.dataTransfer.files?.[0];
        if (file && !isDisabled) processAdresMaticFile(file);
      }}
      className={cn(
        "relative w-full max-w-full cursor-pointer overflow-hidden border-2 border-dashed px-4 py-3 text-center transition-colors duration-200 sm:px-6 sm:py-5 md:p-8",
        isDragging ? "border-primary bg-primary/5" : "border-muted bg-card",
        isDisabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf,text/plain,application/pdf"
        className="hidden"
        onChange={(event) => event.target.files?.[0] && processAdresMaticFile(event.target.files[0])}
      />
      <div className="flex min-w-0 flex-col items-center gap-1.5 sm:gap-3">
        <div className="rounded-full bg-primary/10 p-2 sm:p-3">
          {isReading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary sm:h-7 sm:w-7" />
          ) : (
            <Upload className="h-5 w-5 text-primary sm:h-7 sm:w-7" />
          )}
        </div>
        <div className="min-w-0 space-y-0.5 sm:space-y-1">
          <p className="break-words text-base font-semibold sm:text-lg">Dosyayi Yukle</p>
          <p className="max-w-full break-words text-xs leading-4 text-muted-foreground sm:leading-5">
            .txt veya .pdf formatindaki AdresMatic dosyanizi buraya surukleyin veya secmek icin tiklayin
          </p>
        </div>
        <div className="mt-1 flex max-w-full flex-wrap items-center justify-center gap-1.5 text-[11px] font-medium leading-4 text-muted-foreground sm:mt-2 sm:text-xs">
          <FileText className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          <span className="min-w-0 break-words">
            {selectedFileName || "AdresMatic TXT ve PDF motoru izole calisir"}
          </span>
        </div>
      </div>
    </Card>
  );
}
