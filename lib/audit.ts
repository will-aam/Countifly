export type AuditProfileId =
  | "products"
  | "products-price"
  | "products-quantity"
  | "products-quantity-price";

export type AuditQuantityLayout = "total" | "split";

export interface AuditConfig {
  offlineMode: boolean;
  collectQuantity: boolean;
  collectPrice: boolean;
  directScan: boolean;
  quantityLayout: AuditQuantityLayout;
  profile: AuditProfileId;
}

export interface AuditSession {
  id: string;
  clientName: string;
  config: AuditConfig;
  countingMode: "loja" | "estoque";
  createdAt: string;
  updatedAt: string;
  lastSavedAt?: string;
}

export const AUDIT_PROFILES: Array<{
  id: AuditProfileId;
  label: string;
  description: string;
  collectQuantity: boolean;
  collectPrice: boolean;
}> = [
  {
    id: "products",
    label: "Somente produtos",
    description: "Identifique os produtos, sem registrar quantidade ou preço.",
    collectQuantity: false,
    collectPrice: false,
  },
  {
    id: "products-price",
    label: "Produtos e preços",
    description: "Identifique os produtos e registre o preço unitário.",
    collectQuantity: false,
    collectPrice: true,
  },
  {
    id: "products-quantity",
    label: "Produtos e quantidades",
    description: "Conte os produtos sem coletar preço.",
    collectQuantity: true,
    collectPrice: false,
  },
  {
    id: "products-quantity-price",
    label: "Produtos, quantidades e preços",
    description: "Registre quantidade e preço para cada produto.",
    collectQuantity: true,
    collectPrice: true,
  },
];

export const DEFAULT_AUDIT_CONFIG: AuditConfig = {
  offlineMode: false,
  collectQuantity: true,
  collectPrice: true,
  directScan: false,
  quantityLayout: "split",
  profile: "products-quantity-price",
};

export const getAuditProfile = (id: AuditProfileId) =>
  AUDIT_PROFILES.find((profile) => profile.id === id) ?? AUDIT_PROFILES[3];

export const getAuditProfileLabel = (id: AuditProfileId) =>
  getAuditProfile(id).label;

export const configForAuditProfile = (
  profileId: AuditProfileId,
  current: AuditConfig,
): AuditConfig => {
  const profile = getAuditProfile(profileId);
  return {
    ...current,
    profile: profileId,
    collectQuantity: profile.collectQuantity,
    collectPrice: profile.collectPrice,
    directScan: profile.collectQuantity ? current.directScan : false,
  };
};

export const inferAuditProfile = (
  collectQuantity: boolean,
  collectPrice: boolean,
): AuditProfileId => {
  if (collectQuantity && collectPrice) return "products-quantity-price";
  if (collectQuantity) return "products-quantity";
  if (collectPrice) return "products-price";
  return "products";
};

export const normalizeAuditConfig = (value: Partial<AuditConfig> = {}): AuditConfig => {
  const collectQuantity = value.collectQuantity ?? true;
  const collectPrice = value.collectPrice ?? true;
  const profile = value.profile ?? inferAuditProfile(collectQuantity, collectPrice);
  return {
    ...DEFAULT_AUDIT_CONFIG,
    ...value,
    profile,
    collectQuantity,
    collectPrice,
    quantityLayout: value.quantityLayout === "total" ? "total" : "split",
    directScan: collectQuantity && value.directScan === true,
  };
};

