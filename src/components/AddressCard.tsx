"use client";

import React from "react";
import { MapPin, Navigation, Building2, CheckCircle2 } from "lucide-react";
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
        "p-5 flex flex-col gap-4 transition-all duration-300 border border-border group relative bg-card hover:shadow-md",
        address.visited && "opacity-80 shadow-sm"
      )}
    >
      <div className="flex justify-between items-start gap-3 w-full">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Checkbox 
            id={`visited-${address.id}`}
            checked={address.visited}
            onCheckedChange={() => onToggleVisited(address.id)}
            className="w-5 h-5 border-2 shrink-0"
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={cn(
              "p-2 rounded-lg shrink-0 transition-colors bg-primary/5 text-primary"
            )}>
              <Building2 className="w-5 h-5" />
            </div>
            <h4 className={cn(
              "font-headline font-bold text-lg line-clamp-2 leading-tight flex-1 min-w-0"
            )}>
              {address.businessName}
            </h4>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0 ml-1">
          <Badge variant="secondary" className="whitespace-nowrap bg-secondary/50 text-secondary-foreground font-semibold">
            {address.district}
          </Badge>
          {address.visited && (
            <Badge className="bg-green-600 text-white border-none font-bold animate-in fade-in zoom-in duration-300 whitespace-nowrap">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Gidildi
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-1 shrink-0 text-accent" />
          <div className="leading-relaxed min-w-0 flex-1">
            <span className="font-bold block mb-0.5 text-foreground">
              {address.neighborhood} Mah.
            </span>
            <p className="text-xs break-words text-muted-foreground">
              {address.fullAddress}
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={openInMaps}
        className={cn(
          "w-full mt-auto font-bold h-12 rounded-xl flex items-center justify-center gap-2 transition-all bg-accent hover:bg-accent/90 text-white group-hover:scale-[1.02]"
        )}
      >
        <Navigation className="w-5 h-5" />
        Haritada Aç
      </Button>
    </Card>
  );
}
