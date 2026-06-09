"use client";

import React, { useState, useMemo } from "react";
import { MapPin, Filter, Trash2, Layers, CheckCircle, Clock, ListChecks } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import FilterBar from "@/components/FilterBar";
import AddressCard from "@/components/AddressCard";
import type { ParsedAddress } from "@/types/address";
import { groupAddressesByNeighborhood } from "@/lib/parser";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function SahaNav() {
  const [addresses, setAddresses] = useState<ParsedAddress[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("all");

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

  const filteredAddresses = useMemo(() => {
    return addresses.filter((a) => {
      const districtMatch = selectedDistrict === "all" || a.district === selectedDistrict;
      const neighborhoodMatch =
        selectedNeighborhood === "all" || a.neighborhood === selectedNeighborhood;
      return districtMatch && neighborhoodMatch;
    });
  }, [addresses, selectedDistrict, selectedNeighborhood]);

  const groupedAddresses = useMemo(() => {
    return groupAddressesByNeighborhood(filteredAddresses);
  }, [filteredAddresses]);

  // İstatistikler
  const stats = useMemo(() => {
    const total = filteredAddresses.length;
    const visited = filteredAddresses.filter(a => a.visited).length;
    const remaining = total - visited;
    const totalNeighborhoods = Object.keys(groupedAddresses).length;
    return { total, visited, remaining, totalNeighborhoods };
  }, [filteredAddresses, groupedAddresses]);

  return (
    <main className="min-h-screen bg-background font-body pb-12">
      {/* Header */}
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
            Adreslerinizi mahalle bazlı otomatik gruplandırın ve Google Haritalar rotanızı hızlıca planlayın.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6 relative z-20">
        {/* Upload Section */}
        {addresses.length === 0 ? (
          <FileUploader onDataLoaded={handleDataLoaded} />
        ) : (
          <div className="space-y-6">
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

            {/* İstatistik Çubuğu */}
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
                    <Clock className="w-3 h-3" /> Kalan
                  </span>
                  <span className="text-2xl font-black text-orange-600">{stats.remaining}</span>
                </div>
                <div className="p-4 flex flex-col items-center justify-center bg-accent/5">
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Mahalle
                  </span>
                  <span className="text-2xl font-black text-accent">{stats.totalNeighborhoods}</span>
                </div>
              </div>
              <div className="p-3 bg-muted/30 flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearData}
                  className="text-destructive hover:bg-destructive/10 font-bold gap-2 text-xs h-8"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Tüm Listeyi Temizle
                </Button>
              </div>
            </div>

            {/* Mahalle Grupları */}
            {filteredAddresses.length > 0 ? (
              <Accordion type="multiple" className="space-y-4">
                {Object.entries(groupedAddresses).map(([neighborhood, list]) => {
                  const neighborhoodVisitedCount = list.filter(a => a.visited).length;
                  const isFullyVisited = neighborhoodVisitedCount === list.length && list.length > 0;

                  return (
                    <AccordionItem 
                      key={neighborhood} 
                      value={neighborhood} 
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