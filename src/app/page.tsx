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
    setAddresses([]);
    setSelectedDistrict("all");
    setSelectedNeighborhood("all");
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
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);
        toast({
          title: "Konum Alındı",
          description: "Mesafe hesaplamaları başlatılıyor...",
        });
      },
      (error) => {
        toast({
          variant: "destructive",
          title: "Konum Hatası",
          description: "Konum izni verilmedi veya bir hata oluştu.",
        });
      }
    );
  };

  // Geocoding addresses when user location is available or addresses change
  useEffect(() => {
    if (!userLocation || addresses.length === 0) return;

    const geocodeAddresses = async () => {
      setIsGeocoding(true);
      const updatedAddresses = [...addresses];
      let hasChanges = false;

      for (let i = 0; i < updatedAddresses.length; i++) {
        const addr = updatedAddresses[i];
        if (addr.lat === undefined) {
          const coords = await getCoordinates(addr.streetQuery);
          if (coords) {
            updatedAddresses[i] = {
              ...addr,
              lat: coords.lat,
              lng: coords.lng,
              distance: calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng)
            };
            hasChanges = true;
          }
          // Batch updates to UI to prevent too many re-renders
          if (i % 5 === 0 && hasChanges) {
            setAddresses([...updatedAddresses]);
          }
        } else if (addr.distance === undefined) {
          updatedAddresses[i] = {
            ...addr,
            distance: calculateDistance(userLocation.lat, userLocation.lng, addr.lat, addr.lng)
          };
          hasChanges = true;
        }
      }

      if (hasChanges) setAddresses(updatedAddresses);
      setIsGeocoding(false);
    };

    geocodeAddresses();
  }, [userLocation, addresses.length]);

  const districts = useMemo(() => {
    const set = new Set(addresses.map((a) => a.district));
    return Array.from(set).sort();
  }, [addresses]);

  const neighborhoodsForFilter = useMemo(() => {
    const filteredByDistrict =
      selectedDistrict === "all"
        ? addresses
        : addresses.filter((a) => a.district === selectedDistrict);
    const set = new Set(filteredByDistrict.map((a) => a.neighborhood));
    return Array.from(set).sort();
  }, [addresses, selectedDistrict]);

  const filteredAndSortedAddresses = useMemo(() => {
    let result = addresses.filter((a) => {
      const districtMatch = selectedDistrict === "all" || a.district === selectedDistrict;
      const neighborhoodMatch =
        selectedNeighborhood === "all" || a.neighborhood === selectedNeighborhood;
      return districtMatch && neighborhoodMatch;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortMode === "alphabetical") {
        return a.businessName.localeCompare(b.businessName, 'tr');
      }
      if (sortMode === "closest") {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      }
      if (sortMode === "furthest") {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return b.distance - a.distance;
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
    const remaining = total - visited;
    const geocoded = filteredAndSortedAddresses.filter(a => a.lat !== undefined).length;
    const totalNeighborhoods = Object.keys(groupedAddresses).length;
    const closest = filteredAndSortedAddresses.find(a => a.distance !== undefined)?.distance;
    
    return { total, visited, remaining, totalNeighborhoods, geocoded, closest };
  }, [filteredAndSortedAddresses, groupedAddresses]);

  return (
    <main className="min-h-screen bg-background font-body pb-12">
      <header className="bg-primary text-primary-foreground py-10 px-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/bg1/1200/800')] bg-cover bg-center"></div>
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white p-2 rounded-xl shadow-lg">
               <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-headline font-black tracking-tight">SahaNav</h1>
          </div>
          <h2 className="text-xl font-medium opacity-90 mb-6 font-headline">Adres Gruplandırma ve Navigasyon</h2>
          <p className="text-primary-foreground/80 max-w-lg font-medium leading-relaxed">
            Adreslerinizi mahalle bazlı otomatik gruplandırın ve konuma göre en yakın rotayı oluşturun.
          </p>
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
              <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex flex-col justify-center gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sıralama</span>
                  <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                    <SelectTrigger className="w-full bg-background">
                      <div className="flex items-center gap-2">
                        <SortAsc className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="closest">En Yakın</SelectItem>
                      <SelectItem value="furthest">En Uzak</SelectItem>
                      <SelectItem value="alphabetical">Alfabetik (İşletme)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleGetLocation}
                  className={cn(
                    "w-full gap-2 font-bold",
                    userLocation ? "bg-green-600 hover:bg-green-700" : "bg-primary"
                  )}
                >
                  <Navigation2 className="w-4 h-4" />
                  {userLocation ? "Konum Güncelle" : "Konumumu Kullan"}
                </Button>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 border-b border-border">
                <div className="p-4 flex flex-col items-center justify-center bg-primary/5">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 flex items-center gap-1">
                    <ListChecks className="w-3 h-3" /> Toplam
                  </span>
                  <span className="text-2xl font-black text-primary">{stats.total}</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center bg-green-500/5">
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Gidilen
                  </span>
                  <span className="text-2xl font-black text-green-600">{stats.visited}</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center bg-orange-500/5">
                  <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Navigation2 className="w-3 h-3" /> Konum
                  </span>
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black text-orange-600">{stats.geocoded}/{stats.total}</span>
                    {stats.closest !== undefined && (
                      <span className="text-[10px] font-bold text-orange-400">En Yakın: {stats.closest.toFixed(1)}km</span>
                    )}
                  </div>
                </div>
                <div className="p-4 flex flex-col items-center justify-center bg-accent/5">
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Mahalle
                  </span>
                  <span className="text-2xl font-black text-accent">{stats.totalNeighborhoods}</span>
                </div>
              </div>
              <div className="p-3 bg-muted/30 flex justify-between items-center px-4">
                <div className="text-[10px] font-bold text-muted-foreground flex items-center gap-2">
                  {isGeocoding && <div className="animate-spin h-2 w-2 border-b-2 border-primary rounded-full"></div>}
                  {isGeocoding ? "Uzaklıklar hesaplanıyor..." : userLocation ? "Uzaklıklar güncel." : "Uzaklık hesabı için konum izni verin."}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearData}
                  className="text-destructive hover:bg-destructive/10 font-bold gap-2 text-xs h-8"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Listeyi Temizle
                </Button>
              </div>
            </div>

            {filteredAndSortedAddresses.length > 0 ? (
              <Accordion type="multiple" className="space-y-4">
                {Object.entries(groupedAddresses).map(([neighborhood, list], index) => {
                  const neighborhoodVisitedCount = list.filter(a => a.visited).length;
                  const isFullyVisited = neighborhoodVisitedCount === list.length && list.length > 0;
                  const accordionKey = `group-${neighborhood}-${index}`;

                  return (
                    <AccordionItem 
                      key={accordionKey} 
                      value={accordionKey} 
                      className={cn(
                        "border bg-card rounded-xl overflow-hidden px-4 shadow-sm transition-colors",
                        isFullyVisited && "bg-green-500/5 border-green-200"
                      )}
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <div className="flex items-center gap-3 text-left w-full">
                          <Layers className={cn(
                            "w-5 h-5 shrink-0",
                            isFullyVisited ? "text-green-500" : "text-accent"
                          )} />
                          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 flex-1">
                            <span className={cn(
                              "font-headline font-bold text-lg",
                              isFullyVisited && "text-green-700"
                            )}>
                              {neighborhood}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-[10px]">
                                {list.length} Adres
                              </Badge>
                              {neighborhoodVisitedCount > 0 && (
                                <Badge className={cn(
                                  "border-none font-bold text-[10px]",
                                  isFullyVisited ? "bg-green-600" : "bg-orange-500"
                                )}>
                                  {neighborhoodVisitedCount}/{list.length} Gidildi
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {list.map((addr) => (
                            <AddressCard 
                              key={addr.id} 
                              address={addr} 
                              onToggleVisited={toggleVisited}
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            ) : (
              <div className="bg-card p-12 text-center rounded-xl border border-dashed border-muted-foreground/30">
                <Filter className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-bold">Kayıt Bulunamadı</h3>
                <p className="text-muted-foreground">Seçilen filtrelere uygun adres bulunmuyor.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Toaster />
    </main>
  );
}
