"use client";

import React from "react";
import { MapPin, Navigation, CheckCircle2, ChevronRight, CheckCircle, Trash2, Plus, Info } from "lucide-react";
import type { ParsedAddress } from "@/types/address";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { cn } from "@/lib/utils";

interface AddressCardProps {
  address: ParsedAddress;
  onToggleVisited: (id: string) => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  selectionOrder?: number;
}

export default function AddressCard({ 
  address, 
  onToggleVisited, 
  onDelete,
  isSelected, 
  onToggleSelection,
  selectionOrder 
}: AddressCardProps) {
  const openInMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    const encoded = encodeURIComponent(address.streetQuery);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <div 
      onClick={onToggleSelection}
      className={cn(
        "group relative p-5 flex flex-col gap-4 border border-slate-100 rounded-2xl transition-all duration-300 cursor-pointer",
        "bg-slate-50/50 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50",
        isSelected ? "ring-2 ring-primary bg-primary/[0.02] border-primary/20 shadow-lg shadow-primary/5" : "",
        address.visited && !isSelected && "opacity-60"
      )}
    >
      {/* Route Selection Badge */}
      <div className={cn(
        "absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center border-2 border-white shadow-md transition-all z-10",
        isSelected ? "bg-primary scale-110" : "bg-slate-200 opacity-0 group-hover:opacity-100"
      )}>
        {isSelected ? (
          <span className="text-white text-xs font-black">{selectionOrder}</span>
        ) : (
          <Plus className="w-4 h-4 text-slate-500" />
        )}
      </div>

      <div className="flex justify-between items-start gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisited(address.id);
            }}
            className="pt-1"
          >
            <Checkbox 
              id={`visited-${address.id}`}
              checked={address.visited}
              className={cn(
                "w-5 h-5 border-2 rounded-md transition-all",
                "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
              )}
            />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h4 className={cn(
              "font-bold text-slate-900 leading-tight transition-all",
              address.visited && "text-slate-400 line-through decoration-emerald-500/30"
            )}>
              {address.businessName}
            </h4>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="bg-primary/5 text-primary text-[10px] font-bold border-none h-5">
                {address.district}
              </Badge>
              {address.visited && (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Gidildi
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 bg-white/50 p-3 rounded-xl border border-slate-100/50">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter block mb-0.5">Adres Detayı</span>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
              {address.fullAddress}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <Button
          onClick={openInMaps}
          variant="outline"
          className="flex-1 h-10 rounded-xl font-bold text-xs bg-white text-primary border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all flex items-center justify-center gap-2"
        >
          <Navigation className="w-3.5 h-3.5" />
          Navigasyon
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="h-10 w-10 rounded-xl text-slate-300 hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}