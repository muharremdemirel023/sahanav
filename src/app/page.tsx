"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MapPin, Filter, Trash2, Layers, CheckCircle, Clock, ListChecks, Navigation2, SortAsc } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import FilterBar from "@/components/FilterBar";
import AddressCard from "@/components/AddressCard";
import type { ParsedAddress } from "@/types/address";
import { groupAddressesByNeighborhood } from "@/lib/parser";
import { calculateDistance, getCoordinates } from "@/lib/location";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type SortMode = "closest" | "furthest" | "alphabetical";

export default function SahaNav() {
  const [addresses, setAddresses] = useState<ParsedAddress[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("closest");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { toast } = useToast();

  const handleDataLoaded = (data: ParsedAddress[]) => {
    setAddresses(data);
    setSelectedDistrict("all");
    setSelectedNeighborhood("all");
  };

  const clearData = () => {
    if (window.confirm("Tüm listeyi temizlemek istediğinize emin misiniz?")) {
      setAddresses([]);
      setSelectedDistrict("all");
      setSelectedNeighborhood("all");
    }
  };

  const toggleVisited = (id: string) => {
    setAddresses(prev => prev.map(addr => 
      addr.id === id ? { ...addr, visited: !addr.visited } : addr
    ));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: "Tarayıcınız konum özelliğini desteklemiyor.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(location);
        toast({
          title: "Konum Alındı",
          description: "Adres uzaklıkları hesaplanıyor.",
        });
      },
      () => {
        toast({
          variant: "destructive",
          title: "Konum Hatası",
          description: "Konum erişimine izin verilmedi.",
        });
      }
    );
  };

  // Process geocoding sequentially to avoid hitting API rate limits too fast
  useEffect(() => {
    if (addresses.length === 0) return;

    const geocodeAddresses = async () => {
      setIsGeocoding(true);
      let updated = false;
      const currentAddresses = [...addresses];

      for (let i = 0; i < currentAddresses.length; i++) {
        const addr = currentAddresses[i];
        
        // Always calculate distance if userLocation exists
        if (userLocation && addr.lat !== undefined && addr.distance === undefined) {
          currentAddresses[i] = {
            ...addr,
            distance: calculateDistance(userLocation.lat, userLocation.lng, addr.lat, addr.lng)
          };
          updated = true;
        }

        // Geocode if missing
        if (addr.lat === undefined) {
          const coords = await getCoordinates(addr.streetQuery);
          if (coords) {
            currentAddresses[i] = {
              ...addr,
              lat: coords.lat,
              lng: coords.lng,
              distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : undefined
            };
            updated = true;
          }
        }
      }

      if (updated) setAddresses(currentAddresses);
      setIsGeocoding(false);
    };

    geocodeAddresses();
  }, [userLocation, addresses.length]);

  const districts = useMemo(() => {
    return Array.from(new Set(addresses.map((a) => a.district))).sort();
  }, [addresses]);

  const neighborhoodsForFilter = useMemo(() => {
    const filteredByDistrict = selectedDistrict === "all"
      ? addresses
      : addresses.filter((a) => a.district === selectedDistrict);
    return Array.from(new Set(filteredByDistrict.map((a) => a.neighborhood))).sort();
  }, [addresses, selectedDistrict]);

  const filteredAndSortedAddresses = useMemo(() => {
    let result = addresses.filter((a) => {
      const districtMatch = selectedDistrict === "all" || a.district === selectedDistrict;
      const neighborhoodMatch = selectedNeighborhood === "all" || a.neighborhood === selectedNeighborhood;
      return districtMatch && neighborhoodMatch;
    });

    result.sort((a, b) => {
      if (sortMode === "alphabetical") return a.businessName.localeCompare(b.businessName, 'tr');
      
      const distA = a.distance ?? Infinity;
      const distB = b.distance ?? Infinity;

      if (sortMode === "closest") return distA - distB;
      if (sortMode === "furthest") return distB - distA;
      
      return 0;
    });

    return result;
  }, [addresses, selectedDistrict, selectedNeighborhood, sortMode]);

  const groupedAddresses = useMemo(() => {
    return groupAddressesByNeighborhood(filteredAndSortedAddresses);
  }, [filteredAndSortedAddresses]);

  const stats = useMemo(() => {
    const total = filteredAndSortedAddresses.length;
    const visited = filteredAndSortedAddresses.filter(a => a.visited).length;
    const geocoded = filteredAndSortedAddresses.filter(a => a.lat !== undefined).length;
    const closest = filteredAndSortedAddresses.find(a => a.distance !== undefined)?.distance;
    
    return { total, visited, remaining: total - visited, geocoded, closest };
  }, [filteredAndSortedAddresses]);

  return (
    <main className="min-h-screen bg-background pb-12">
      <header className="bg-primary text-primary-foreground py-10 px-6 shadow-xl relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white p-2 rounded-xl">
               <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">SahaNav</h1>
          </div>
          <p className="text-primary-foreground/80 font-medium">Adres Gruplandırma ve Navigasyon</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6 relative z-20">
        {addresses.length === 0 ? (
          <FileUploader onDataLoaded={handleDataLoaded} />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <FilterBar
                  districts={districts}
                  neighborhoods={neighborhoodsForFilter}
                  selectedDistrict={selectedDistrict}
                  selectedNeighborhood={selectedNeighborhood}
                  onDistrictChange={(val) => {
                    setSelectedDistrict(val);
                    setSelectedNeighborhood("all");
                  }}
                  onNeighborhoodChange={setSelectedNeighborhood}
                  onClear={() => {
                    setSelectedDistrict("all");
                    setSelectedNeighborhood("all");
                  }}
                />
              </div>
              <div className="bg-card p-6 rounded-xl border flex flex-col justify-center gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Sıralama</span>
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        <SortAsc className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="closest">En Yakın</SelectItem>
                      <SelectItem value="furthest">En Uzak</SelectItem>
                      <SelectItem value="alphabetical">Alfabetik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGetLocation} className={cn("w-full font-bold", userLocation && "bg-green-600 hover:bg-green-700")}>
                  <Navigation2 className="w-4 h-4 mr-2" />
                  {userLocation ? "Konum Alındı" : "Konumumu Kullan"}
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0">
                <div className="p-4 flex flex-col items-center justify-center bg-primary/5">
                  <span className="text-[10px] font-black text-primary uppercase mb-1">Toplam</span>
                  <span className="text-2xl font-black">{stats.total}</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center bg-green-500/5">
                  <span className="text-[10px] font-black text-green-600 uppercase mb-1">Gidilen</span>
                  <span className="text-2xl font-black">{stats.visited}</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center bg-orange-500/5">
                  <span className="text-[10px] font-black text-orange-600 uppercase mb-1">Konum Alınan</span>
                  <span className="text-2xl font-black">{stats.geocoded}</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center bg-accent/5">
                  <span className="text-[10px] font-black text-accent uppercase mb-1">Kalan</span>
                  <span className="text-2xl font-black">{stats.remaining}</span>
                </div>
              </div>
              <div className="p-2 bg-muted/30 flex justify-between items-center px-4">
                <span className="text-[10px] font-bold text-muted-foreground italic">
                  {isGeocoding ? "Uzaklıklar hesaplanıyor..." : userLocation ? "Uzaklıklar güncel." : "Mesafe için konum izni verin."}
                </span>
                <Button variant="ghost" size="sm" onClick={clearData} className="text-destructive h-8 font-bold text-xs">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Temizle
                </Button>
              </div>
            </div>

            <Accordion type="multiple" className="space-y-4">
              {Object.entries(groupedAddresses).map(([neighborhood, list]) => {
                const visitedCount = list.filter(a => a.visited).length;
                const isDone = visitedCount === list.length && list.length > 0;
                // Create a truly unique key for the accordion item
                const accordionKey = `${selectedDistrict}-${neighborhood}`;
                
                return (
                  <AccordionItem 
                    key={accordionKey} 
                    value={accordionKey} 
                    className={cn(
                      "border bg-card rounded-xl overflow-hidden px-4 shadow-sm transition-colors",
                      isDone && "bg-green-500/5 border-green-200"
                    )}
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3 text-left">
                        <Layers className={cn("w-5 h-5", isDone ? "text-green-600" : "text-primary")} />
                        <div className="flex flex-col md:flex-row md:items-center gap-2">
                          <span className="font-bold text-lg">{neighborhood}</span>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="font-bold text-[10px]">
                              {list.length} Adres
                            </Badge>
                            {visitedCount > 0 && (
                              <Badge variant="outline" className="font-bold text-[10px] border-green-600 text-green-600">
                                {visitedCount} Gidildi
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {list.map((addr) => (
                          <AddressCard key={addr.id} address={addr} onToggleVisited={toggleVisited} />
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>
        )}
      </div>
      <Toaster />
    </main>
  );
}
