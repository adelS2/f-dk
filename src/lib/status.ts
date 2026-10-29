export const STATUS_LABEL: Record<string, string> = {
  placed: "Afventer bekræftelse",
  accepted: "Bekræftet",
  preparing: "Tilberedes",
  ready: "Klar til afhentning",
  picked_up: "Undervejs",
  delivered: "Leveret",
  cancelled: "Annulleret",
};

export interface ActionButton {
  action: string;
  label: string;
  danger?: boolean;
}

export function restaurantActions(status: string): ActionButton[] {
  switch (status) {
    case "placed":
      return [
        { action: "accept", label: "Accepter" },
        { action: "reject", label: "Afvis", danger: true },
      ];
    case "accepted":
      return [{ action: "prepare", label: "Start tilberedning" }];
    case "preparing":
      return [{ action: "ready", label: "Klar til afhentning" }];
    default:
      return [];
  }
}

export function courierActions(status: string, courierId: string | null, userId: string): ActionButton[] {
  if (status === "ready" && courierId === null) return [{ action: "claim", label: "Tag opgaven" }];
  if (status === "ready" && courierId === userId) return [{ action: "pickup", label: "Hentet hos restauranten" }];
  if (status === "picked_up" && courierId === userId) return [{ action: "deliver", label: "Markér som leveret" }];
  return [];
}

export function customerActions(status: string): ActionButton[] {
  return status === "placed" ? [{ action: "cancel", label: "Annuller bestilling", danger: true }] : [];
}
