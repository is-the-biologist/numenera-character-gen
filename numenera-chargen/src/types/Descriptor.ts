export interface Descriptor {
  id: string;
  name: string;
  source: "discovery" | "destiny" | "location" | "racial";
  description: string;
  poolModifiers: {
    might?: number;
    speed?: number;
    intellect?: number;
  };
  edgeModifiers?: {
    might?: number;
    speed?: number;
    intellect?: number;
  };
  trainedSkills: string[];
  inabilities: string[];
  specialAbilities: {
    name: string;
    description: string;
    cost?: { pool: 'might' | 'speed' | 'intellect'; amount: number };
  }[];
  additionalEquipment: string[];
  initialLinks: string[];
}
