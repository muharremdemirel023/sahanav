
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Trash2, CheckCircle, ListChecks, Navigation2, SortAsc, LayoutGrid, Loader2, Route } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import FilterBar from "@/components/FilterBar";
import AddressCard from "@/components/AddressCard";
import type { ParsedAddress } from "@/types/address";
import { groupAddressesByNeighborhood } from "@/lib/parser";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sahanav_data_v1";

export default function SahaNav() {
  const [addresses, setAddresses] = useState<ParsedAddress[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("all");
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
  };

  const clearData = () => {
    if (window.confirm("Tüm listeyi temizlemek istediğinize emin misiniz?")) {
      setAddresses([]);
      setSelectedDistrict("all");
      setSelectedNeighborhood("all");
      setSelectedRouteIds([]);
      localStorage.removeItem(STORAGE_KEY);
      toast({ title: "Liste Temizlendi", description: "Tüm veriler cihazınızdan silindi." });
    }
  };

  const deleteAddress = (id: string) => {
    setAddresses(prev => prev.filter(addr => addr.id !== id));
    setSelectedRouteIds(prev => prev.filter(i => i !== id));
    toast({ title: "Adres Silindi", description: "Adres listeden kaldırıldı." });
  };

  const toggleVisited = (id: string) => {
    setAddresses(prev => prev.map(addr => 
      addr.id === id ? { ...addr, visited: !addr.visited } : addr
    ));
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

  const districts = useMemo(() => Array.from(new Set(addresses.map(a => a.district))).sort(), [addresses]);

  const neighborhoodsForFilter = useMemo(() => {
    const filteredByDistrict = selectedDistrict === "all" ? addresses : addresses.filter(a => a.district === selectedDistrict);
    return Array.from(new Set(filteredByDistrict.map(a => a.neighborhood))).sort();
  }, [addresses, selectedDistrict]);

  const filteredAddresses = useMemo(() => {
    return addresses.filter(a => {
      const dMatch = selectedDistrict === "all" || a.district === selectedDistrict;
      const nMatch = selectedNeighborhood === "all" || a.neighborhood === selectedNeighborhood;
      return dMatch && nMatch;
    }).sort((a, b) => a.businessName.localeCompare(b.businessName, 'tr'));
  }, [addresses, selectedDistrict, selectedNeighborhood]);

  const groupedAddresses = useMemo(() => groupAddressesByNeighborhood(filteredAddresses), [filteredAddresses]);

  const stats = useMemo(() => ({
    total: filteredAddresses.length,
    visited: filteredAddresses.filter(a => a.visited).length,
  }), [filteredAddresses]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F2F2F7] pb-40">
      <header className="sticky top-0 z-50 ios-glass border-b pt-12 pb-6 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">SahaNav</h1>
            <p className="text-sm font-medium text-muted-foreground">Saha Operasyon Yönetimi</p>
          </div>
          {addresses.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearData} className="text-destructive font-bold h-8 px-2">
              Sıfırla
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {addresses.length === 0 ? (
          <FileUploader onDataLoaded={handleDataLoaded} />
        ) : (
          <div className="space-y-8">
            <section className="grid grid-cols-2 gap-4">
              <div className="ios-card p-5 flex flex-col items-center text-center gap-1">
                <div className="p-2 rounded-full text-white mb-1 bg-blue-500">
                  <ListChecks className="w-4 h-4" />
                </div>
                <span className="text-xl font-black">{stats.total}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">TOPLAM ADRES</span>
              </div>
              <div className="ios-card p-5 flex flex-col items-center text-center gap-1">
                <div className="p-2 rounded-full text-white mb-1 bg-green-500">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-xl font-black">{stats.visited}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">GİDİLEN ADRES</span>
              </div>
            </section>

            <FilterBar
              districts={districts}
              neighborhoods={neighborhoodsForFilter}
              selectedDistrict={selectedDistrict}
              selectedNeighborhood={selectedNeighborhood}
              onDistrictChange={(v) => { setSelectedDistrict(v); setSelectedNeighborhood("all"); }}
              onNeighborhoodChange={setSelectedNeighborhood}
              onClear={() => { setSelectedDistrict("all"); setSelectedNeighborhood("all"); }}
            />

            <Accordion type="multiple" className="space-y-4">
              {Object.entries(groupedAddresses).map(([neighborhood, list]) => {
                const isDone = list.every(a => a.visited) && list.length > 0;
                return (
                  <AccordionItem key={neighborhood} value={neighborhood} className={cn("ios-card px-4 border-none transition-all", isDone && "opacity-60")}>
                    <AccordionTrigger className="hover:no-underline py-5">
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
                            onDelete={() => deleteAddress(addr.id)}
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
              <p className="text-center text-xs font-bold text-destructive mt-2 uppercase tracking-widest">En fazla 9 durak seçebilirsiniz</p>
            )}
          </div>
        </div>
      )}

      <Toaster />
    </main>
  );
}
