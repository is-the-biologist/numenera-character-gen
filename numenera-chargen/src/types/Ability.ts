export interface Ability {
  id: string;
  name: string;
  description: string;
  cost?: {
    pool: "might" | "speed" | "intellect";
    amount: number;
  };
  type: "action" | "enabler";
  tier: number;
  source: string;
}
