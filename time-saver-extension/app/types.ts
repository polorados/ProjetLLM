// ---------------- EVENTS
export type EventName =
  | "created"
  | "activated"
  | "updated"
  | "closed";
export interface TabEvent {
    time: number;
    name: EventName;
    id: number;
    url: string | null;
    info: {
        title: string | null;
        status: number | null;
    } | null;
}
export interface AggregatedIdEvent {
  time: number;
  name: EventName;
}
export type PerIdResult = Record<number, AggregatedIdEvent[]>;
export type PerEventResult = Record<EventName, number[]>;
export type PerUrlResult = string[];

// ---------------- CATALOG
export type Need =
  | "trop_onglets"
  | "aller_retour"
  | "copier_coller"
  | "ouverture_quotidienne"
  | "traduction"
  | "lecture_longue"
  | "raccourcis_clavier";
export type CatalogEntryType = "chrome_feature" | "extension";
export interface CatalogEntry {
    id: string;
    type: CatalogEntryType;
    name: string;
    summary: string;
    needs: Need[];
    url: string;
    shortcut?: string;
    last_verified: string | null;
}
export interface CatalogData {
    entries: CatalogEntry[];
}
export interface ReshapedRecommendation {
    id: string;
    name: string;
    needs: Need[];
    summary: string;
    url: string;
    shortcut?: string;
}
export interface ReshapedRecommendations {
    recommendations: ReshapedRecommendation[];
}


// ---------------- EXTENSIONS DL
export interface InstalledExtension {
    id: string;
    name: string;
    enabled: boolean;
}

export interface InstalledExtensionList {
  installedExtensions: InstalledExtension[];
}

// ---------------- LLM NOTES
export interface Conclusion {
  events:string | null,
  recommendations:string | null,
  others: string | null
}