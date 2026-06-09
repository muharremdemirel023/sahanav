"use client";

import React from "react";
import { MapPin, Navigation, Building2 } from "lucide-react";
import type { ParsedAddress } from "@/types/address";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

interface AddressCardProps {
  address: ParsedAddress;
}

export default function AddressCard({ address }: AddressCardProps) {
  const openInMaps = () => {
    // Uses the pre-calculated optimized streetQuery from parser.ts
    // which follows: [Street/Ave] [DoorNo] [District] ISTANBUL
    const encoded = encodeURIComponent(address.streetQuery);
    const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <Card className="p-5 flex flex-col gap-4 hover:shadow-md transition-shadow bg-card border border-border group">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/5 rounded-lg text-primary">
            <Building2 className="w-5 h-5" />
          </div>
          <h4 className="font-headline font-bold text-lg line-clamp-2 leading-tight">
            {address.businessName}
          </h4>
        </div>
        <Badge variant="secondary" className="whitespace-nowrap bg-secondary/50 text-secondary-foreground font-semibold">
          {address.district}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-1 shrink-0 text-accent" />
          <div className="leading-relaxed">
            <span className="font-bold text-foreground block mb-0.5">{address.neighborhood} Mah.</span>
            <p className="text-xs break-words">{address.fullAddress}</p>
          </div>
        </div>
      </div>

      <Button
        onClick={openInMaps}
        className="w-full mt-auto bg-accent hover:bg-accent/90 text-white font-bold h-12 rounded-xl flex items-center justify-center gap-2 group-hover:scale-[1.02] transition-transform"
      >
        <Navigation className="w-5 h-5" />
        Haritada Aç
      </Button>
    </Card>
  );
}
