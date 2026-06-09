export interface ParsedAddress {
  id: string;
  businessName: string;
  fullAddress: string;
  district: string;
  neighborhood: string;
  streetQuery: string;
  visited: boolean;
  lat?: number;
  lng?: number;
  distance?: number;
}
