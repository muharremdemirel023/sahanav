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
import { XCircle } from "lucide-react";

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
    <div className="space-y-4 bg-card p-6 rounded-xl shadow-sm border border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">İlçe</Label>
          <Select value={selectedDistrict} onValueChange={onDistrictChange}>
            <SelectTrigger className="w-full bg-background font-medium">
              <SelectValue placeholder="İlçe Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm İlçeler</SelectItem>
              {districts.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mahalle</Label>
          <Select
            value={selectedNeighborhood}
            onValueChange={onNeighborhoodChange}
            disabled={selectedDistrict === "all"}
          >
            <SelectTrigger className="w-full bg-background font-medium">
              <SelectValue placeholder="Mahalle Seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Mahalleler</SelectItem>
              {neighborhoods.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground hover:text-primary transition-colors h-8"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Filtreleri Temizle
        </Button>
      </div>
    </div>
  );
}
