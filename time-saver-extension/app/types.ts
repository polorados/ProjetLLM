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

export type Need =
  | "trop_onglets"
  | "aller_retour"
  | "copier_coller"
  | "ouverture_quotidienne"
  | "traduction"
  | "lecture_longue"
  | "raccourcis_clavier";

export interface CatalogEntry {
  need: Need[];
}

export interface CatalogData {
  entries: CatalogEntry[];
}