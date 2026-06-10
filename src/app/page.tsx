"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MapPin, Trash2, CheckCircle, Clock, ListChecks, Navigation2, SortAsc, LayoutGrid, Loader2 } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import FilterBar from "@/components/FilterBar";
import AddressCard from "@/components/AddressCard";
import type { ParsedAddress } from "@/types/address";
import { groupAddressesByNeighborhood } from "@/lib/parser";
import { calculateDistance, getCoordinates } from "@/lib/location";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
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
  const [geocodingProgress, setGeocodingProgress] = useState(0);
  const { toast } = useToast();

  const handleDataLoaded = (data: ParsedAddress[]) => {
    setAddresses(data);
    setSelectedDistrict("all");
    setSelectedNeighborhood("all");
    setGeocodingProgress(0);
  };

  const clearData = () => {
    if (window.confirm("Tüm listeyi temizlemek istediğinize emin misiniz?")) {
      setAddresses([]);
      setSelectedDistrict("all");
      setSelectedNeighborhood("all");
      setGeocodingProgress(0);
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
          description: "Mesafe hesaplamaları başlatıldı.",
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

  // Improved Geocoding & Distance Calculation Engine
  useEffect(() => {
    if (addresses.length === 0) return;

    let isMounted = true;

    const processAddresses = async () => {
      setIsGeocoding(true);
      const currentAddresses = [...addresses];
      let processed = 0;

      // First, quickly calculate distances for items that already have coordinates
      if (userLocation) {
        let distancesUpdated = false;
        for (let i = 0; i < currentAddresses.length; i++) {
          const addr = currentAddresses[i];
          if (addr.lat !== undefined && addr.lng !== undefined) {
            const newDist = calculateDistance(userLocation.lat, userLocation.lng, addr.lat, addr.lng);
            if (addr.distance !== newDist) {
              currentAddresses[i] = { ...addr, distance: newDist };
              distancesUpdated = true;
            }
          }
        }
        if (distancesUpdated && isMounted) {
          setAddresses([...currentAddresses]);
        }
      }

      // Then, fetch coordinates for those that don't have them
      for (let i = 0; i < currentAddresses.length; i++) {
        if (!isMounted) break;
        
        const addr = currentAddresses[i];
        if (addr.lat === undefined) {
          const coords = await getCoordinates(addr.streetQuery);
          if (coords && isMounted) {
            currentAddresses[i] = {
              ...addr,
              lat: coords.lat,
              lng: coords.lng,
              distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : undefined
            };
            // Update state periodically to show progress
            if (i % 2 === 0) {
              setAddresses([...currentAddresses]);
            }
          }
        }
        processed++;
        setGeocodingProgress(Math.round((processed / currentAddresses.length) * 100));
      }

      if (isMounted) {
        setAddresses([...currentAddresses]);
        setIsGeocoding(false);
      }
    };

    processAddresses();

    return () => {
      isMounted = false;
    };
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
      
      // Items without distance should always be at the end
      const distA = a.distance === undefined ? Infinity : a.distance;
      const distB = b.distance === undefined ? Infinity : b.distance;

      if (sortMode === "closest") return distA - distB;
      if (sortMode === "furthest") {
        if (distA === Infinity) return 1;
        if (distB === Infinity) return -1;
        return distB - distA;
      }
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
    
    return { total, visited, remaining: total - visited, geocoded };
  }, [filteredAndSortedAddresses]);

  return (
    <main className="min-h-screen bg-[#F2F2F7]">
      <header className="sticky top-0 z-50 ios-glass border-b pt-12 pb-6 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SahaNav</h1>
            <p className="text-sm font-medium text-muted-foreground">Navigasyon ve Rota Yönetimi</p>
          </div>
          <div className="flex items-center gap-3">
            {isGeocoding && (
              <div className="hidden md:flex flex-col items-end gap-1 min-w-[120px]">
                <span className="text-[10px] font-bold text-primary animate-pulse uppercase tracking-wider">MESAFE ÖLÇÜLÜYOR %{geocodingProgress}</span>
                <Progress value={geocodingProgress} className="h-1.5 w-full bg-primary/10" />
              </div>
            )}
            {addresses.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearData} 
                className="text-destructive font-semibold hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Sıfırla
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {addresses.length === 0 ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <FileUploader onDataLoaded={handleDataLoaded} />
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
            {/* Stats Dashboard */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "TOPLAM", value: stats.total, color: "bg-blue-500", icon: ListChecks },
                { label: "GİDİLEN", value: stats.visited, color: "bg-green-500", icon: CheckCircle },
                { label: "KALAN", value: stats.remaining, color: "bg-orange-500", icon: Clock },
                { label: "MESAFE", value: stats.geocoded, color: "bg-purple-500", icon: MapPin },
              ].map((stat, i) => (
                <div key={i} className="ios-card p-5 flex flex-col items-center text-center gap-2">
                  <div className={cn("p-2 rounded-full text-white mb-1", stat.color)}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <span className="text-2xl font-bold tracking-tight">{stat.value}</span>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </section>

            {/* Controls */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div className="ios-card p-6 flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase ml-1">SIRALAMA</label>
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                    <SelectTrigger className="bg-[#F2F2F7] border-none h-12 rounded-xl focus:ring-0">
                      <div className="flex items-center gap-2">
                        <SortAsc className="w-4 h-4 text-primary" />
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
                <Button 
                  onClick={handleGetLocation} 
                  disabled={isGeocoding}
                  className={cn(
                    "w-full h-12 rounded-xl font-bold ios-button shadow-none",
                    userLocation ? "bg-green-500 hover:bg-green-600" : "bg-primary hover:bg-primary/90"
                  )}
                >
                  {isGeocoding ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Navigation2 className="w-4 h-4 mr-2" />
                  )}
                  {isGeocoding ? `Hesaplanıyor %${geocodingProgress}` : userLocation ? "Konum Güncelle" : "Konumumu Kullan"}
                </Button>
              </div>
            </section>

            {/* List */}
            <Accordion type="multiple" defaultValue={Object.keys(groupedAddresses).map(n => `${selectedDistrict}-${n}`)} className="space-y-4">
              {Object.entries(groupedAddresses).map(([neighborhood, list]) => {
                const visitedCount = list.filter(a => a.visited).length;
                const isDone = visitedCount === list.length && list.length > 0;
                const accordionKey = `${selectedDistrict}-${neighborhood}`;
                
                return (
                  <AccordionItem 
                    key={accordionKey} 
                    value={accordionKey} 
                    className={cn(
                      "ios-card px-4 border-none transition-all overflow-hidden",
                      isDone && "opacity-60 grayscale-[0.5]"
                    )}
                  >
                    <AccordionTrigger className="hover:no-underline py-5">
                      <div className="flex items-center gap-4 text-left">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          isDone ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
                        )}>
                          <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-lg leading-tight">{neighborhood}</span>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs font-medium text-muted-foreground">{list.length} Adres</span>
                            {visitedCount > 0 && (
                              <span className="text-xs font-bold text-green-600">• {visitedCount} Gidildi</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6">
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
