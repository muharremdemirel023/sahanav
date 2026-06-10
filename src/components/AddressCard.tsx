"use client";

import React from "react";
import { MapPin, Navigation, Building2, CheckCircle2, Ruler, ChevronRight } from "lucide-react";
import type { ParsedAddress } from "@/types/address";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { cn } from "@/lib/utils";

interface AddressCardProps {
  address: ParsedAddress;
  onToggleVisited: (id: string) => void;
}

export default function AddressCard({ address, onToggleVisited }: AddressCardProps) {
  const openInMaps = () => {
    const encoded = encodeURIComponent(address.streetQuery);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <Card 
      className={cn(
        "p-6 flex flex-col gap-4 transition-all duration-300 border-none rounded-2xl bg-[#F9F9F9] group relative hover:bg-white ios-shadow",
        address.visited && "opacity-70"
      )}
    >
      <div className="flex justify-between items-start gap-3 w-full">
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

        {address.distance !== undefined && (
          <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/5 p-2 px-3 rounded-full w-fit">
            <Ruler className="w-3.5 h-3.5" />
            <span>Mesafe: {address.distance.toFixed(2)} km</span>
          </div>
        )}
      </div>

      <Button
        onClick={openInMaps}
        className="w-full h-11 rounded-xl font-bold flex items-center justify-between px-4 transition-all bg-white text-primary border border-primary/20 hover:bg-primary/5 active:scale-95 shadow-none"
      >
        <span className="flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          Navigasyon
        </span>
        <ChevronRight className="w-4 h-4 opacity-50" />
      </Button>
    </Card>
  );
}