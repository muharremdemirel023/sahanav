"use client";

import React, { useState, useMemo } from "react";
import { MapPin, Filter, Search, Trash2, LayoutGrid, List } from "lucide-react";
import FileUploader from "@/components/FileUploader";
import FilterBar from "@/components/FilterBar";
import AddressCard from "@/components/AddressCard";
import type { ParsedAddress } from "@/types/address";
import { Toaster } from "@/components/ui/toaster";
import { Button } from "@/components/ui/button";

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

  const districts = useMemo(() => {
    const set = new Set(addresses.map((a) => a.district));
    return Array.from(set).sort();
  }, [addresses]);

  const neighborhoods = useMemo(() => {
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

  return (
    <main className="min-h-screen bg-background font-body pb-12">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-10 px-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/bg1/1200/800')] bg-cover bg-center"></div>
        </div>
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white p-2 rounded-xl">
               <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-headline font-black tracking-tight">SahaNav</h1>
          </div>
          <h2 className="text-xl font-medium opacity-90 mb-6">Adres Filtreleme</h2>
          <p className="text-primary-foreground/80 max-w-lg font-medium leading-relaxed">
            TXT dosyanı yükle, ilçe ve mahalleye göre adresleri anında filtreleyip Google Haritalar ile rota oluştur.
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6">
        {/* Upload Section */}
        {addresses.length === 0 ? (
          <FileUploader onDataLoaded={handleDataLoaded} />
        ) : (
          <div className="space-y-6">
            <FilterBar
              districts={districts}
              neighborhoods={neighborhoods}
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

            <div className="flex items-center justify-between py-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                <span className="font-bold text-lg">
                  {filteredAddresses.length}{" "}
                  <span className="font-normal text-muted-foreground">adres bulundu</span>
                </span>
              </div>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={clearData}
                className="rounded-lg gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Listeyi Temizle
              </Button>
            </div>

            {/* Results Grid */}
            {filteredAddresses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAddresses.map((addr) => (
                  <AddressCard key={addr.id} address={addr} />
                ))}
              </div>
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
