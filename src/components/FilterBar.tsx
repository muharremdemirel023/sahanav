"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { XCircle, Filter, ChevronRight } from "lucide-react";

interface FilterBarProps {
  districts: string[];
  neighborhoods: string[];
  selectedDistrict: string;
  selectedNeighborhood: string;
  onDistrictChange: (val: string) => void;
  onNeighborhoodChange: (val: string) => void;
  onClear: () => void;
}

export default function FilterBar({
  districts,
  neighborhoods,
  selectedDistrict,
  selectedNeighborhood,
  onDistrictChange,
  onNeighborhoodChange,
  onClear,
}: FilterBarProps) {
  return (
    <div className="premium-card p-6 flex flex-col gap-6 bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
            <Filter className="w-4 h-4 text-slate-600" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Operasyon Filtresi</span>
        </div>
        {(selectedDistrict !== "all" || selectedNeighborhood !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-slate-400 h-8 hover:text-primary hover:bg-primary/5 font-bold transition-all px-3"
          >
            Sıfırla
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">İlçe</Label>
          <Select value={selectedDistrict} onValueChange={onDistrictChange}>
            <SelectTrigger className="w-full bg-slate-50 border-transparent h-12 rounded-xl focus:ring-primary/20 hover:bg-slate-100 transition-colors font-semibold text-slate-700">
              <SelectValue placeholder="Tüm İlçeler" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all" className="font-semibold">Tüm İstanbul</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d} value={d} className="font-semibold">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mahalle</Label>
          <Select
            value={selectedNeighborhood}
            onValueChange={onNeighborhoodChange}
            disabled={selectedDistrict === "all"}
          >
            <SelectTrigger className={cn(
              "w-full border-transparent h-12 rounded-xl focus:ring-primary/20 transition-all font-semibold",
              selectedDistrict === "all" ? "bg-slate-50/50 text-slate-300" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            )}>
              <SelectValue placeholder="Tüm Mahalleler" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all" className="font-semibold">Tüm Mahalleler</SelectItem>
              {neighborhoods.map((n) => (
                <SelectItem key={n} value={n} className="font-semibold">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}