"use client";

import React from "react";
import { AlertCircle, CheckCircle2, ExternalLink, MapPin } from "lucide-react";
import {
  getAdresMaticStreetInfo,
  type ParsedAdresMaticAddress,
} from "@/lib/adresmatic-address-parser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface AdresMaticAddressCardProps {
  address: ParsedAdresMaticAddress;
  onToggleAdresMaticComplete: (id: string) => void;
}

export function AdresMaticAddressCard({
  address,
  onToggleAdresMaticComplete,
}: AdresMaticAddressCardProps) {
  const streetInfo = getAdresMaticStreetInfo(address);

  const openAdresMaticAddressInGoogleMaps = () => {
    const query = `${address.streetOrAvenue} No:${address.doorNumber} Istanbul`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, "_blank");
  };

  return (
    <Card
      className={cn(
        "overflow-hidden border-l-4 bg-white transition-all duration-200",
        address.isCompleted
          ? "border-l-muted opacity-60 grayscale-[0.5]"
          : address.oddOrEven === "Tek"
            ? "border-l-primary"
            : "border-l-accent"
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <Checkbox
              checked={address.isCompleted}
              onCheckedChange={() => onToggleAdresMaticComplete(address.id)}
              className="mt-1"
            />

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="min-w-0 break-words text-base font-black text-slate-900">{address.name}</span>
                {address.isCompleted && (
                  <Badge
                    variant="outline"
                    className="h-5 border-emerald-200 bg-emerald-50 px-1.5 text-[10px] text-emerald-700"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Tamam
                  </Badge>
                )}
                {address.warning && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Inceleme Gerekli
                  </Badge>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-500">
                <p className="break-words">
                  <span className="font-bold text-slate-700">Adres: </span>
                  {address.fullAddress}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={address.oddOrEven === "Tek" ? "default" : "outline"} className="font-mono">
                    Kapi No: {address.doorNumber || "-"}
                  </Badge>
                  <Badge variant="secondary" className="font-mono">
                    {address.oddOrEven === "Cift" ? "Cift" : address.oddOrEven}
                  </Badge>
                  {streetInfo && (
                    <Badge variant="outline" className="font-mono">
                      Sokak: {streetInfo}
                    </Badge>
                  )}
                </div>
              </div>

              <Badge variant="secondary" className="max-w-full gap-1 font-mono">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="min-w-0 break-words">{address.streetOrAvenue}</span>
              </Badge>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={openAdresMaticAddressInGoogleMaps}
            className="h-9 shrink-0 justify-center text-primary hover:bg-primary/5 hover:text-primary"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Harita
          </Button>
        </div>

        {address.warning && (
          <div className="mt-3 flex items-start gap-2 rounded bg-destructive/5 p-2 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{address.warning}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
