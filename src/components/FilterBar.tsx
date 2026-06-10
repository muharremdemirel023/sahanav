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
import { XCircle, Filter } from "lucide-react";

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
    <div className="ios-card p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2 text-primary">
        <Filter className="w-4 h-4" />
        <span className="text-xs font-black uppercase tracking-widest">FİLTRELEME</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">İLÇE SEÇİMİ</Label>
          <Select value={selectedDistrict} onValueChange={onDistrictChange}>
            <SelectTrigger className="w-full bg-[#F2F2F7] border-none h-12 rounded-xl focus:ring-0">
              <SelectValue placeholder="İlçe Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm İlçeler</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">MAHALLE SEÇİMİ</Label>
          <Select
            value={selectedNeighborhood}
            onValueChange={onNeighborhoodChange}
            disabled={selectedDistrict === "all"}
          >
            <SelectTrigger className="w-full bg-[#F2F2F7] border-none h-12 rounded-xl focus:ring-0">
              <SelectValue placeholder="Mahalle Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Mahalleler</SelectItem>
              {neighborhoods.map((n) => (
                <SelectItem key={n} value={n}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground font-semibold hover:text-primary transition-colors"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Temizle
        </Button>
      </div>
    </div>
  );
}