// Shared types mirroring the backend Prisma schema (apps/api/prisma/schema.prisma).
// Kept in sync manually until an OpenAPI-generated client is introduced.

export type Role = "USER" | "AGENT" | "ADMIN";

export type ListingType = "PROPERTY" | "LAND" | "HOUSEHOLD";

export type ListingStatus =
  | "DRAFT"
  | "PENDING"
  | "ACTIVE"
  | "RENTED"
  | "SOLD"
  | "EXPIRED"
  | "REJECTED"
  | "ARCHIVED";

export type PropertyType =
  | "APARTMENT"
  | "FLAT"
  | "SELF_CONTAINED"
  | "SHORT_LET"
  | "SERVICED_APARTMENT"
  | "NEW_PROJECT"
  | "HOUSE"
  | "DUPLEX"
  | "BUNGALOW"
  | "DETACHED_DUPLEX"
  | "SEMI_DETACHED_DUPLEX"
  | "TERRACE"
  | "SHOP"
  | "OFFICE"
  | "COMMERCIAL"
  | "OTHER";

export type RentPeriod = "MONTHLY" | "QUARTERLY" | "BIANNUALLY" | "ANNUALLY";
export type PropertyOfferType = "RENT" | "SHORT_LET" | "SALE";
export type AgencyFeeType = "FLAT" | "PERCENTAGE";

export type LandTenure = "SALE" | "LEASE";

export type MeasurementUnit = "SQM" | "SQFT" | "PLOT" | "ACRE" | "HECTARE";

export type HouseholdCategory =
  | "FURNITURE"
  | "TELEVISION"
  | "REFRIGERATOR"
  | "AIR_CONDITIONER"
  | "COOKER"
  | "GENERATOR"
  | "ELECTRONICS"
  | "KITCHEN_EQUIPMENT"
  | "OFFICE_FURNITURE"
  | "OTHER";

export type HouseholdCondition =
  "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "FOR_PARTS";

export interface ListingImage {
  id: string;
  url: string;
  position: number;
}

export interface LocationSuggestion {
  id: string;
  provider: "GEOAPIFY" | "DEVICE";
  formattedAddress: string;
  name?: string;
  countryName: string;
  countryCode: string;
  stateName: string;
  cityName: string;
  areaName?: string;
  postcode?: string;
  latitude: number;
  longitude: number;
  resultType?: string;
}

export interface Listing {
  id: string;
  ownerId: string;
  type: ListingType;
  title: string;
  description: string;
  price: number;
  status: ListingStatus;
  countryId: string;
  stateId: string;
  cityId: string;
  areaId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  locationProvider?: string | null;
  locationPlaceId?: string | null;
  images: ListingImage[];
  createdAt: string;
  country?: { id: string; name: string; code: string };
  state?: { id: string; name: string };
  city?: { id: string; name: string };
  area?: { id: string; name: string } | null;
  propertyDetails?: {
    propertyType: PropertyType;
    offerType: PropertyOfferType;
    rentPeriod: RentPeriod;
    bedrooms?: number | null;
    bathrooms?: number | null;
    toilets?: number | null;
    parking?: number | null;
    isFurnished: boolean;
    securityDeposit: number;
    agencyFee: number;
    agencyFeeType: AgencyFeeType;
    legalFee: number;
    cautionFee: number;
    serviceCharge: number;
    otherCharges: number;
    amenities: string[];
    isCoRenting: boolean;
    availableRooms?: number | null;
    totalRooms?: number | null;
    currentTenants: number;
    coRentingNote?: string | null;
  } | null;
  landDetails?: {
    tenure: LandTenure;
    numberOfPlots?: number | null;
    landSize: number;
    measurementUnit: MeasurementUnit;
    documentsAvailable: string[];
  } | null;
  householdDetails?: {
    category: HouseholdCategory;
    condition: HouseholdCondition;
  } | null;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    agentProfile?: { id: string } | null;
  };
}

export interface RadiusOption {
  label: string;
  km: number;
}

export const RADIUS_OPTIONS: RadiusOption[] = [
  { label: "1 km", km: 1 },
  { label: "5 km", km: 5 },
  { label: "10 km", km: 10 },
  { label: "20 km", km: 20 },
  { label: "50 km", km: 50 },
];

export interface User {
  id: string;
  email: string;
  phone?: string | null;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: User;
}

export interface Agent {
  id: string;
  userId: string;
  agencyName?: string | null;
  whatsapp?: string | null;
  bio?: string | null;
  areasCovered: string[];
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
    role?: Role;
    createdAt: string;
  };
}

export type ProfessionalCategory =
  | "PLUMBER" | "ELECTRICIAN" | "TILER" | "BRICKLAYER" | "CARPENTER"
  | "PAINTER" | "ENGINEER" | "ARCHITECT" | "SURVEYOR" | "QUANTITY_SURVEYOR"
  | "INTERIOR_DESIGNER" | "ROOFER" | "HVAC_TECHNICIAN" | "PROPERTY_MANAGER"
  | "SUPPLIER" | "OTHER";

export interface ProfessionalProfile {
  id: string;
  userId: string;
  displayName?: string | null;
  category: ProfessionalCategory;
  specialties: string[];
  bio?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  portfolioUrls: string[];
  serviceAreas: string[];
  isVerified: boolean;
  averageRating: number;
  reviewCount: number;
  user?: { firstName: string; lastName: string; avatarUrl?: string | null; phone?: string | null } | null;
  country?: { id: string; name: string; code: string } | null;
  state?: { id: string; name: string } | null;
  city?: { id: string; name: string } | null;
}

export interface AgentRating {
  id: string;
  overallRating: number;
  communication: number;
  listingAccuracy: number;
  professionalism: number;
  responsiveness: number;
  comment?: string | null;
  createdAt: string;
  author: { firstName: string; lastName: string; avatarUrl?: string | null };
}
