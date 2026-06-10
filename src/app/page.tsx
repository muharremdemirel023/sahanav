
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { MapPin, Trash2, CheckCircle, Clock, ListChecks, Navigation2, SortAsc, LayoutGrid, Loader2, Route } from "lucide-react";
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

const STORAGE_KEY = "sahanav_data_v1";

export default function SahaNav() {
  const [addresses, setAddresses] = useState<ParsedAddress[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("all");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("closest");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingProgress, setGeocodingProgress] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
  const { toast } = useToast();

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        setAddresses(JSON.parse(savedData));
      } catch (e) {
        console.error("Kayıtlı veriler okunamadı", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save data to localStorage whenever addresses change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
    }
  }, [addresses, isInitialized]);

  const handleDataLoaded = (data: ParsedAddress[]) => {
    setAddresses(data);
    setSelectedDistrict("all");
    setSelectedNeighborhood("all");
    setSelectedRouteIds([]);
    setGeocodingProgress(0);
  };

  const clearData = () => {
    if (window.confirm("Tüm listeyi temizlemek istediğinize emin misiniz?")) {
      setAddresses([]);
      setSelectedDistrict("all");
      setSelectedNeighborhood("all");
      setSelectedRouteIds([]);
      setGeocodingProgress(0);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const toggleVisited = (id: string) => {
    setAddresses(prev => {
      const newAddresses = prev.map(addr => 
        addr.id === id ? { ...addr, visited: !addr.visited } : addr
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAddresses));
      return newAddresses;
    });
  };

  const toggleRouteSelection = (id: string) => {
    setSelectedRouteIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  const handleCreateRoute = () => {
    if (selectedRouteIds.length < 2) return;
    if (selectedRouteIds.length > 9) {
      toast({ 
        variant: "destructive", 
        title: "Limit Aşıldı", 
        description: "Google Maps rotası en fazla 9 durak destekler." 
      });
      return;
    }

    const selectedAddresses = selectedRouteIds
      .map(id => addresses.find(a => a.id === id))
      .filter((a): a is ParsedAddress => !!a);

    const origin = encodeURIComponent(selectedAddresses[0].streetQuery);
    const destination = encodeURIComponent(selectedAddresses[selectedAddresses.length - 1].streetQuery);
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;

    if (selectedAddresses.length > 2) {
      const waypoints = selectedAddresses
        .slice(1, -1)
        .map(a => encodeURIComponent(a.streetQuery))
        .join('|');
      url += `&waypoints=${waypoints}`;
    }

    window.open(url, "_blank");
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: "destructive", title: "Hata", description: "Tarayıcı konum desteklemiyor." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        toast({ title: "Konum Alındı", description: "Mesafe hesaplamaları güncelleniyor." });
      },
      () => toast({ variant: "destructive", title: "Hata", description: "Konum erişimi engellendi." })
    );
  };

  // Background Geocoding
  useEffect(() => {
    if (addresses.length === 0) return;

    let isMounted = true;

    const processAddresses = async () => {
      setIsGeocoding(true);
      const batchSize = 10;
      let processedCount = 0;

      // Update existing
      setAddresses(prev => prev.map(addr => {
        if (userLocation && addr.lat && addr.lng) {
          const dist = calculateDistance(userLocation.lat, userLocation.lng, addr.lat, addr.lng);
          return { ...addr, distance: dist };
        }
        return addr;
      }));

      for (let i = 0; i < addresses.length; i += batchSize) {
        if (!isMounted) break;
        const batch = addresses.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(async (addr, index) => {
          if (addr.lat !== undefined) return null;
          const coords = await getCoordinates(addr.streetQuery, 1100 + (index * 50));
          if (coords) {
            return {
              id: addr.id,
              lat: coords.lat,
              lng: coords.lng,
              distance: userLocation ? calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng) : undefined
            };
          }
          return null;
        }));

        if (!isMounted) break;

        const successfulResults = results.filter((r): r is NonNullable<typeof r> => r !== null);
        if (successfulResults.length > 0) {
          setAddresses(prev => prev.map(addr => {
            const found = successfulResults.find(r => r.id === addr.id);
            if (found) {
              return { ...addr, lat: found.lat, lng: found.lng, distance: found.distance };
            }
            return addr;
          }));
        }

        processedCount += batch.length;
        setGeocodingProgress(Math.round((processedCount / addresses.length) * 100));
      }

      if (isMounted) setIsGeocoding(false);
    };

    processAddresses();
    return () => { isMounted = false; };
  }, [userLocation, addresses.length]);

  const districts = useMemo(() => Array.from(new Set(addresses.map(a => a.district))).sort(), [addresses]);

  const neighborhoodsForFilter = useMemo(() => {
    const filteredByDistrict = selectedDistrict === "all" ? addresses : addresses.filter(a => a.district === selectedDistrict);
    return Array.from(new Set(filteredByDistrict.map(a => a.neighborhood))).sort();
  }, [addresses, selectedDistrict]);

  const filteredAndSortedAddresses = useMemo(() => {
    let result = addresses.filter(a => {
      const dMatch = selectedDistrict === "all" || a.district === selectedDistrict;
      const nMatch = selectedNeighborhood === "all" || a.neighborhood === selectedNeighborhood;
      return dMatch && nMatch;
    });

    result.sort((a, b) => {
      if (sortMode === "alphabetical") return a.businessName.localeCompare(b.businessName, 'tr');
      const distA = a.distance === undefined ? Infinity : a.distance;
      const distB = b.distance === undefined ? Infinity : b.distance;
      return sortMode === "closest" ? distA - distB : distB - distA;
    });

    return result;
  }, [addresses, selectedDistrict, selectedNeighborhood, sortMode]);

  const groupedAddresses = useMemo(() => groupAddressesByNeighborhood(filteredAndSortedAddresses), [filteredAndSortedAddresses]);

  const stats = useMemo(() => ({
    total: filteredAndSortedAddresses.length,
    visited: filteredAndSortedAddresses.filter(a => a.visited).length,
    geocoded: filteredAndSortedAddresses.filter(a => a.lat !== undefined).length,
    closest: Math.min(...filteredAndSortedAddresses.map(a => a.distance || Infinity).filter(d => d !== Infinity), 0)
  }), [filteredAndSortedAddresses]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F2F7] pb-32">
      <header className="sticky top-0 z-50 ios-glass border-b pt-12 pb-6 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SahaNav</h1>
            <p className="text-sm font-medium text-muted-foreground">Saha Operasyon Yönetimi</p>
          </div>
          <div className="flex items-center gap-3">
            {isGeocoding && (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold text-primary animate-pulse">%{geocodingProgress}</span>
                <Progress value={geocodingProgress} className="h-1.5 w-24 bg-primary/10" />
              </div>
            )}
            {addresses.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearData} className="text-destructive font-bold h-8 px-2">
                Sıfırla
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {addresses.length === 0 ? (
          <FileUploader onDataLoaded={handleDataLoaded} />
        ) : (
          <div className="space-y-8">
            {/* Stats Panel */}
            <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "TOPLAM", value: stats.total, color: "bg-blue-500", icon: ListChecks },
                { label: "GİDİLEN", value: stats.visited, color: "bg-green-500", icon: CheckCircle },
                { label: "ÖLÇÜLEN", value: stats.geocoded, color: "bg-purple-500", icon: MapPin },
                { label: "EN YAKIN", value: (stats.closest > 0 && stats.closest !== Infinity) ? `${stats.closest.toFixed(1)} km` : '-', color: "bg-orange-500", icon: Navigation2 },
              ].map((stat, i) => (
                <div key={i} className="ios-card p-5 flex flex-col items-center text-center gap-1">
                  <div className={cn("p-2 rounded-full text-white mb-1", stat.color)}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xl font-black">{stat.value}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                </div>
              ))}
            </section>

            {/* Filter & Sort Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <FilterBar
                  districts={districts}
                  neighborhoods={neighborhoodsForFilter}
                  selectedDistrict={selectedDistrict}
                  selectedNeighborhood={selectedNeighborhood}
                  onDistrictChange={(v) => { setSelectedDistrict(v); setSelectedNeighborhood("all"); }}
                  onNeighborhoodChange={setSelectedNeighborhood}
                  onClear={() => { setSelectedDistrict("all"); setSelectedNeighborhood("all"); }}
                />
              </div>
              <div className="ios-card p-6 flex flex-col gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">SIRALAMA</label>
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                    <SelectTrigger className="bg-[#F2F2F7] border-none h-12 rounded-xl focus:ring-0">
                      <div className="flex items-center gap-2"><SortAsc className="w-4 h-4 text-primary" /><SelectValue /></div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="closest">En Yakın</SelectItem>
                      <SelectItem value="furthest">En Uzak</SelectItem>
                      <SelectItem value="alphabetical">Alfabetik</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleGetLocation} className="w-full h-12 rounded-xl font-bold bg-primary shadow-none active:scale-[0.98] transition-transform">
                  <Navigation2 className="w-4 h-4 mr-2" />
                  Konumumu Kullan
                </Button>
              </div>
            </section>

            {/* Neighborhood Groups */}
            <Accordion type="multiple" className="space-y-4">
              {Object.entries(groupedAddresses).map(([neighborhood, list]) => {
                const isDone = list.every(a => a.visited) && list.length > 0;
                return (
                  <AccordionItem key={neighborhood} value={neighborhood} className={cn("ios-card px-4 border-none transition-all", isDone && "opacity-60")}>
                    <AccordionTrigger className="hover:no-underline py-5 [&[data-state=open]>svg]:rotate-180">
                      <div className="flex items-center gap-4 text-left">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isDone ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary")}>
                          <LayoutGrid className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-lg leading-tight">{neighborhood}</span>
                          <span className="text-xs font-medium text-muted-foreground">{list.length} Adres</span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {list.map(addr => (
                          <AddressCard 
                            key={addr.id} 
                            address={addr} 
                            onToggleVisited={toggleVisited}
                            isSelected={selectedRouteIds.includes(addr.id)}
                            onToggleSelection={() => toggleRouteSelection(addr.id)}
                            selectionOrder={selectedRouteIds.indexOf(addr.id) + 1}
                          />
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

      {/* Fixed Route Button */}
      {selectedRouteIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-6 z-[60] bg-gradient-to-t from-background via-background/90 to-transparent">
          <div className="max-w-4xl mx-auto">
            <Button 
              disabled={selectedRouteIds.length < 2 || selectedRouteIds.length > 9}
              onClick={handleCreateRoute}
              className={cn(
                "w-full h-16 rounded-2xl font-black text-lg ios-shadow transition-all active:scale-95 flex items-center justify-between px-8",
                selectedRouteIds.length >= 2 && selectedRouteIds.length <= 9 ? "bg-primary" : "bg-muted text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Route className="w-6 h-6" />
                <span>Seçilenleri Rota Yap</span>
              </div>
              <div className="flex items-center gap-2 bg-white/20 px-4 py-1.5 rounded-full text-sm">
                <span>{selectedRouteIds.length} Adres</span>
              </div>
            </Button>
            {selectedRouteIds.length > 9 && (
              <p className="text-center text-xs font-bold text-destructive mt-2 uppercase tracking-widest">
                En fazla 9 durak seçebilirsiniz
              </p>
            )}
            {selectedRouteIds.length === 1 && (
              <p className="text-center text-xs font-bold text-muted-foreground mt-2 uppercase tracking-widest">
                Rota oluşturmak için en az 2 adres seçin
              </p>
            )}
          </div>
        </div>
      )}

      <Toaster />
    </main>
  );
}
