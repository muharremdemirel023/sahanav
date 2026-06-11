
"use client";

import React from "react";
import { MapPin, Navigation, CheckCircle2, ChevronRight, PlusCircle, CheckCircle, Trash2 } from "lucide-react";
import type { ParsedAddress } from "@/types/address";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
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
  const openInMaps = () => {
    const encoded = encodeURIComponent(address.streetQuery);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <Card 
      className={cn(
        "p-6 flex flex-col gap-4 transition-all duration-300 border-none rounded-2xl bg-[#F9F9F9] group relative hover:bg-white ios-shadow",
        address.visited && "opacity-70",
        isSelected && "ring-2 ring-primary bg-primary/[0.02]"
      )}
    >
      <div 
        onClick={onToggleSelection}
        className={cn(
          "absolute top-4 right-4 flex items-center justify-center cursor-pointer transition-all",
          isSelected ? "scale-110" : "opacity-40 hover:opacity-100"
        )}
      >
        {isSelected ? (
          <div className="relative">
            <CheckCircle className="w-8 h-8 text-primary fill-primary/10" />
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-primary mt-0.5">
              {selectionOrder}
            </span>
          </div>
        ) : (
          <PlusCircle className="w-8 h-8 text-muted-foreground" />
        )}
      </div>

      <div className="flex justify-between items-start gap-3 w-full pr-10">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <Checkbox 
            id={`visited-${address.id}`}
            checked={address.visited}
            onCheckedChange={() => onToggleVisited(address.id)}
            className="w-6 h-6 border-2 shrink-0 rounded-full transition-all data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <h4 className={cn(
              "font-bold text-lg leading-tight text-foreground line-clamp-2",
              address.visited && "line-through text-muted-foreground"
            )}>
              {address.businessName}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 text-[10px] font-bold border-none">
                {address.district}
              </Badge>
              {address.visited && (
                <span className="text-[10px] font-bold text-green-600 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Gidildi
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
          <div className="leading-snug min-w-0 flex-1">
            <span className="font-bold block text-foreground mb-0.5">
              {address.neighborhood} Mah.
            </span>
            <p className="text-xs text-muted-foreground">
              {address.fullAddress}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={openInMaps}
          className="flex-1 h-11 rounded-xl font-bold flex items-center justify-between px-4 bg-white text-primary border border-primary/20 hover:bg-primary/5 active:scale-95"
        >
          <span className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Haritada Aç
          </span>
          <ChevronRight className="w-4 h-4 opacity-50" />
        </Button>
        {onDelete && (
          <Button
            variant="ghost"
            onClick={onDelete}
            className="h-11 w-11 rounded-xl text-destructive hover:bg-destructive/5 shrink-0"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        )}
      </div>
    </Card>
  );
}
