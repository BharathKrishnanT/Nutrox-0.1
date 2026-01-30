import { Injectable, signal, computed } from '@angular/core';

export type Tab = 'readings' | 'tank' | 'motor' | 'ratio' | 'guide' | 'analyser';

export interface NpkData {
  n: number;
  p: number;
  k: number;
  timestamp: Date | null;
}

export interface TankData {
  methane: number; // Raw Analog Value (approx ppm)
  temperature: number; // Celsius
  humidity: number; // %
  ph: number;
}

export interface SoilType {
  id: string;
  name: string;
  characteristics: string;
  profile: Record<string, number>;
  profileText: string;
  crops: string;
}

export interface Fertilizer {
  name: string;
  n: number;
  p: number;
  k: number;
  description: string;
}

export interface Crop {
  name: string;
  // Absolute values for Ratio Calculator
  idealN: number; 
  idealP: number;
  idealK: number;
  // Rich content for Guide
  macro: string;
  micro: string;
  needs: Record<string, number>; // 1-3 scale for chart
}

export interface OrganicAdditive {
  id: string;
  name: string;
  boosts: string;
  description: string;
  nutrientBoost: Record<string, number>;
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // --- Navigation ---
  currentTab = signal<Tab>('readings');

  // --- Hardware State ---
  isConnected = signal<boolean>(false); // Mock NPK connection
  isSerialConnected = signal<boolean>(false); // Real Arduino Serial connection
  
  npkReadings = signal<NpkData>({ n: 0, p: 0, k: 0, timestamp: null });
  tankReadings = signal<TankData>({ methane: 0, temperature: 0, humidity: 0, ph: 7.0 });

  // --- Relay State ---
  relay1State = signal<boolean>(false);
  relay2State = signal<boolean>(false);

  private writer: WritableStreamDefaultWriter<string> | null = null;
  private port: any = null;

  // --- Database ---
  readonly soils: SoilType[] = [
    {
      id: 'Red-Soil',
      name: 'Red Soil',
      characteristics: 'Porous, friable structure with good drainage. Its reddish color comes from a high iron content.',
      profile: { "Nitrogen": 1, "Phosphorus": 1, "Humus": 1, "Lime": 1, "Iron": 3, "Potash": 2 },
      profileText: "<strong>Deficient in:</strong> Nitrogen, Phosphorus, Humus, and Lime.<br><strong>Sufficient in:</strong> Potash.<br><strong>Rich in:</strong> Iron.",
      crops: "Millets (Ragi), Pulses, Groundnut, Potato, Tobacco."
    },
    {
      id: 'Black-Soil',
      name: 'Black Soil',
      characteristics: 'High clay content, leading to high moisture retention. It becomes sticky when wet and develops deep cracks when dry.',
      profile: { "Nitrogen": 1, "Phosphorus": 1, "Organic Matter": 1, "Iron": 3, "Lime": 3, "Calcium": 3, "Potash": 3, "Magnesium": 3 },
      profileText: "<strong>Deficient in:</strong> Nitrogen, Phosphorus, and Organic Matter.<br><strong>Rich in:</strong> Iron, Lime, Calcium, Potash, Aluminum, and Magnesium.",
      crops: "Cotton, Sugarcane, Jowar, Tobacco, Wheat, Rice."
    },
    {
      id: 'Alluvial-Soil',
      name: 'Alluvial Soil',
      characteristics: 'Formed by river silt deposits, it\'s generally fertile and varies from sandy loam to clay.',
      profile: { "Nitrogen": 1, "Phosphorus": 1, "Potash": 3, "Lime": 3 },
      profileText: "<strong>Deficient in:</strong> Nitrogen and Phosphorus.<br><strong>Rich in:</strong> Potash and Lime.",
      crops: "Paddy (Rice), Sugarcane, Wheat, Maize, Pulses, Oilseeds."
    },
    {
      id: 'Laterite-Soil',
      name: 'Laterite Soil',
      characteristics: 'Forms in areas with high temperature and heavy rainfall. It becomes very hard when it dries out.',
      profile: { "Nitrogen": 1, "Potash": 1, "Lime": 1, "Organic Matter": 1, "Iron": 3, "Aluminum": 3 },
      profileText: "<strong>Deficient in:</strong> Nitrogen, Potash, Lime, and Organic Matter.<br><strong>Rich in:</strong> Iron and Aluminum.",
      crops: "Tea, Coffee, Rubber, Cashew, Coconut."
    }
  ];

  readonly fertilizers: Fertilizer[] = [
    { name: 'Vermicompost', n: 2, p: 1, k: 1, description: 'Excellent all-rounder organic fertilizer.' },
    { name: 'Cow Dung Manure', n: 0.6, p: 0.2, k: 0.5, description: 'Traditional base fertilizer.' },
    { name: 'Neem Cake', n: 5, p: 1, k: 1.5, description: 'High Nitrogen, also acts as pest repellent.' },
    { name: 'Bone Meal', n: 3, p: 20, k: 0, description: 'Rich in Phosphorus for root growth.' },
    { name: 'Wood Ash', n: 0, p: 1, k: 10, description: 'Rich in Potassium.' }
  ];

  readonly crops: Crop[] = [
    { 
      name: 'Paddy (Rice)', 
      idealN: 100, idealP: 40, idealK: 40,
      macro: "<strong>N:</strong> Essential for vegetative growth.<br><strong>P:</strong> Crucial for root development and energy transfer.<br><strong>K:</strong> Important for grain filling and disease resistance.",
      micro: "<strong>Zinc (Zn):</strong> Often deficient in paddy soils.<br><strong>Iron (Fe):</strong> Important, especially in upland rice.",
      needs: { "Nitrogen (N)": 3, "Phosphorus (P)": 2, "Potassium (K)": 3 }
    },
    { 
      name: 'Corn (Maize)', 
      idealN: 120, idealP: 60, idealK: 60,
      macro: "<strong>N:</strong> High requirement for vegetative growth.<br><strong>P:</strong> Important for root system and grain formation.<br><strong>K:</strong> High requirement for stalk strength and water regulation.",
      micro: "<strong>Zinc (Zn)</strong> and <strong>Iron (Fe)</strong> are critical for preventing deficiencies and ensuring high yield.",
      needs: { "Nitrogen (N)": 3, "Phosphorus (P)": 2, "Potassium (K)": 3 }
    },
    { 
      name: 'Millets (Ragi, Jowar)', 
      idealN: 60, idealP: 30, idealK: 30,
      macro: "<strong>N:</strong> Moderate requirement.<br><strong>P:</strong> Important for early growth.<br><strong>K:</strong> Needed for stalk strength and grain quality.",
      micro: "Generally less demanding, but respond well to <strong>Zinc</strong> and <strong>Iron</strong>.",
      needs: { "Nitrogen (N)": 2, "Phosphorus (P)": 2, "Potassium (K)": 2 }
    },
    { 
      name: 'Pulses (Black/Green Gram)', 
      idealN: 20, idealP: 50, idealK: 20,
      macro: "<strong>N:</strong> Low requirement as they fix atmospheric nitrogen.<br><strong>P:</strong> Very important for nodulation and root growth.<br><strong>K:</strong> Essential for yield and quality.",
      micro: "<strong>Sulphur (S), Zinc (Zn),</strong> and <strong>Molybdenum (Mo)</strong> are important for nitrogen fixation.",
      needs: { "Nitrogen (N)": 1, "Phosphorus (P)": 3, "Potassium (K)": 2 }
    },
    { 
      name: 'Groundnut (Peanut)', 
      idealN: 20, idealP: 50, idealK: 40,
      macro: "<strong>N:</strong> Low starter dose needed as it fixes nitrogen.<br><strong>P:</strong> High need for root development and pod formation.<br><strong>K:</strong> Essential for oil content and overall yield.",
      micro: "<strong>Calcium (Ca)</strong> is crucial for pod filling and preventing 'pops'.<br><strong>Sulphur (S)</strong> is important for oil synthesis.",
      needs: { "Nitrogen (N)": 1, "Phosphorus (P)": 3, "Potassium (K)": 2 }
    },
    { 
      name: 'Potato', 
      idealN: 120, idealP: 60, idealK: 120,
      macro: "<strong>N:</strong> Moderate need for foliage growth.<br><strong>P:</strong> Important for tuber initiation.<br><strong>K:</strong> Very high requirement for tuber bulking and starch synthesis.",
      micro: "<strong>Magnesium (Mg)</strong> and <strong>Sulphur (S)</strong> are important for quality.<br><strong>Boron (B)</strong> helps prevent internal brown spots.",
      needs: { "Nitrogen (N)": 2, "Phosphorus (P)": 2, "Potassium (K)": 3 }
    },
    { 
      name: 'Banana', 
      idealN: 200, idealP: 60, idealK: 250,
      macro: "<strong>N:</strong> Very high requirement for leaf and pseudostem growth.<br><strong>P:</strong> Moderate need for root development.<br><strong>K:</strong> Extremely high requirement for bunch development and fruit quality.",
      micro: "<strong>Magnesium (Mg)</strong> and <strong>Sulphur (S)</strong> are vital for healthy leaves and photosynthesis.",
      needs: { "Nitrogen (N)": 3, "Phosphorus (P)": 2, "Potassium (K)": 3 }
    },
    { 
      name: 'Chilli', 
      idealN: 100, idealP: 50, idealK: 80,
      macro: "<strong>N:</strong> Required for vegetative growth.<br><strong>P:</strong> Important for flowering and fruit set.<br><strong>K:</strong> Crucial for fruit development, color, and pungency.",
      micro: "<strong>Calcium (Ca)</strong> helps prevent blossom-end rot.<br><strong>Boron (B)</strong> is important for pollen viability and fruit set.",
      needs: { "Nitrogen (N)": 2, "Phosphorus (P)": 2, "Potassium (K)": 3 }
    },
    { 
      name: 'Coconut', 
      idealN: 150, idealP: 80, idealK: 200,
      macro: "<strong>N, P, K</strong> are required in balanced and large quantities.<br><strong>K</strong> is particularly important for nut development and yield.",
      micro: "<strong>Boron (B):</strong> Prevents button shedding.<br><strong>Magnesium (Mg):</strong> Prevents yellowing of leaves.",
      needs: { "Nitrogen (N)": 3, "Phosphorus (P)": 2, "Potassium (K)": 3 }
    },
    { 
      name: 'Sugarcane', 
      idealN: 250, idealP: 100, idealK: 150,
      macro: "Very high requirement for <strong>N, P, and K</strong> for cane growth and sugar accumulation.",
      micro: "<strong>Iron (Fe)</strong> and <strong>Manganese (Mn)</strong> are important for photosynthesis.",
      needs: { "Nitrogen (N)": 3, "Phosphorus (P)": 2, "Potassium (K)": 3 }
    },
    { 
      name: 'Cotton', 
      idealN: 100, idealP: 50, idealK: 50,
      macro: "<strong>N:</strong> Required for vegetative growth.<br><strong>P:</strong> For root development and flowering.<br><strong>K:</strong> Crucial for boll development and fiber quality.",
      micro: "<strong>Zinc (Zn)</strong> and <strong>Boron (B)</strong> are important for square retention and boll setting.",
      needs: { "Nitrogen (N)": 3, "Phosphorus (P)": 2, "Potassium (K)": 3 }
    },
    { 
      name: 'Turmeric', 
      idealN: 120, idealP: 60, idealK: 150,
      macro: "High requirement for <strong>K</strong> for rhizome development, followed by <strong>N</strong> and <strong>P</strong>.",
      micro: "<strong>Zinc (Zn)</strong> and <strong>Iron (Fe)</strong> are important for yield and quality.",
      needs: { "Nitrogen (N)": 2, "Phosphorus (P)": 2, "Potassium (K)": 3 }
    }
  ];

  readonly organicAdditives: OrganicAdditive[] = [
    { id: 'reset', name: 'Cow Dung Base', boosts: 'Balanced Starter', description: 'This is the foundational compost starter, rich in organic matter and beneficial microbes.', nutrientBoost: {} },
    { id: 'oil-cake', name: 'Add Crop Waste / Oil Cake', boosts: 'Nitrogen (N)', description: 'Mixing in crop waste or oil cakes creates a nitrogen-rich fertilizer, perfect for promoting leafy green growth.', nutrientBoost: { "N": 3 } },
    { id: 'bone-meal', name: 'Add Bone Meal / Ash', boosts: 'Phosphorus (P)', description: 'Adding bone meal or ash from cattle waste significantly increases phosphorus, vital for strong root development.', nutrientBoost: { "P": 3 } },
    { id: 'wood-ash', name: 'Add Wood Ash', boosts: 'Potassium (K)', description: 'Combining with wood ash makes a potassium-rich liquid fertilizer, excellent for improving fruit quality.', nutrientBoost: { "K": 3 } },
    { id: 'eggshells', name: 'Add Eggshells / Lime', boosts: 'Calcium (Ca)', description: 'Crushed eggshells or agricultural lime are fantastic calcium sources, essential for building strong cell walls.', nutrientBoost: { "Ca": 3 } },
    { id: 'gypsum', name: 'Add Gypsum', boosts: 'Sulphur (S)', description: 'Gypsum is an excellent source of sulphur, a key component of amino acids and vitamins.', nutrientBoost: { "S": 3 } },
    { id: 'epsom-salt', name: 'Add Epsom Salt', boosts: 'Magnesium (Mg)', description: 'Epsom salt (Magnesium Sulphate) provides a readily available source of magnesium, crucial for photosynthesis.', nutrientBoost: { "Mg": 3 } },
    { id: 'vermicompost', name: 'Add Vermicompost', boosts: 'All-Round Booster', description: 'Mixing in vermicompost supercharges the base with a wide array of micronutrients and growth hormones.', nutrientBoost: { "N": 2, "P": 2, "K": 2, "Ca": 2, "S": 2, "Mg": 2 } }
  ];

  readonly organicBaseProfile = { "N": 1, "P": 1, "K": 1, "Ca": 1, "S": 1, "Mg": 1 };

  // --- Context State ---
  selectedCrop = signal<Crop | null>(null);

  constructor() {
    this.startTankMonitoring();
  }

  // --- Actions ---

  async connectToDevice(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.isConnected.set(true);
        resolve(true);
      }, 1500);
    });
  }

  async readNPK(): Promise<void> {
    if (!this.isConnected()) return;
    return new Promise((resolve) => {
      setTimeout(() => {
        this.npkReadings.set({
          n: Math.floor(Math.random() * (200 - 20) + 20),
          p: Math.floor(Math.random() * (100 - 10) + 10),
          k: Math.floor(Math.random() * (300 - 50) + 50),
          timestamp: new Date()
        });
        resolve();
      }, 800);
    });
  }

  // --- Web Serial for Tank Monitor & Motor Control ---
  async connectSerial() {
    if (!('serial' in navigator)) {
      alert('Web Serial API not supported. Please use Chrome or Edge.');
      return;
    }

    try {
      this.port = await (navigator as any).serial.requestPort();
      await this.port.open({ baudRate: 9600 });
      
      this.isSerialConnected.set(true);

      // Setup Writer for sending commands to Arduino
      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(this.port.writable);
      this.writer = textEncoder.writable.getWriter();

      // Start Reading loop
      this.readSerialLoop(this.port);
    } catch (error: any) {
      // Handle user cancellation gracefully
      if (error.name === 'NotFoundError' || error.toString().includes('No port selected')) {
        console.warn('User cancelled port selection.');
        return;
      }
      console.error('Serial Connection Error:', error);
      this.handleDisconnect();
    }
  }

  async toggleRelay(motorId: 1 | 2, state: boolean) {
    if (!this.writer || !this.isSerialConnected()) {
      console.warn('Serial writer not available');
      return;
    }

    try {
      // Protocol Matches Arduino: "R1ON", "R1OFF", "R2ON", "R2OFF"
      const cmdPrefix = motorId === 1 ? 'R1' : 'R2';
      const cmdSuffix = state ? 'ON' : 'OFF';
      const command = `${cmdPrefix}${cmdSuffix}\n`;
      
      await this.writer.write(command);
      
      // Optimistic UI update
      if (motorId === 1) this.relay1State.set(state);
      else this.relay2State.set(state);
    } catch (err) {
      console.error('Failed to write to serial:', err);
      this.handleDisconnect();
    }
  }

  private async readSerialLoop(port: any) {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    
    let buffer = '';

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += value;
          const lines = buffer.split('\n');
          for (let i = 0; i < lines.length - 1; i++) {
             this.parseSerialData(lines[i]);
          }
          buffer = lines[lines.length - 1];
        }
      }
    } catch (error) {
      console.error('Serial Read Error:', error);
    } finally {
      reader.releaseLock();
      this.handleDisconnect();
    }
  }

  private handleDisconnect() {
    console.log('Cleaning up connection...');
    this.isSerialConnected.set(false);
    this.writer = null;
    this.port = null;
    // Reset relays to safety state (UI only)
    this.relay1State.set(false);
    this.relay2State.set(false);
  }

  private parseSerialData(line: string) {
    const text = line.trim();
    if (!text) return;

    // Arduino Format: "Temp: 25.00 °C | Humidity: 60.00 % | MQ4 Analog: 300 | MQ4 Digital: 0"
    
    // We can match loosely to be safe against spaces/units
    const tempMatch = text.match(/Temp:\s*([\d.]+)/);
    const humMatch = text.match(/Humidity:\s*([\d.]+)/);
    const gasMatch = text.match(/MQ4 Analog:\s*(\d+)/);

    if (tempMatch && humMatch && gasMatch) {
      const temperature = parseFloat(tempMatch[1]);
      const humidity = parseFloat(humMatch[1]);
      const methane = parseInt(gasMatch[1], 10);

      this.tankReadings.update(current => ({
        ...current,
        temperature: !isNaN(temperature) ? temperature : current.temperature,
        humidity: !isNaN(humidity) ? humidity : current.humidity,
        methane: !isNaN(methane) ? methane : current.methane
        // pH is still simulated as it's not in the Arduino sketch provided
      }));
    }
  }

  private startTankMonitoring() {
    setInterval(() => {
      // Always simulate pH as per previous setup
      const newPh = parseFloat((Math.random() * (8.5 - 5.5) + 5.5).toFixed(2));

      if (this.isSerialConnected()) {
        this.tankReadings.update(curr => ({ ...curr, ph: newPh }));
      } else if (this.isConnected()) {
        // Full simulation if only NPK is 'connected' (demo mode)
        this.tankReadings.set({
          methane: parseFloat((Math.random() * (500 - 100) + 100).toFixed(1)),
          temperature: parseFloat((Math.random() * (35 - 25) + 25).toFixed(1)),
          humidity: parseFloat((Math.random() * (90 - 40) + 40).toFixed(1)),
          ph: newPh
        });
      }
    }, 3000);
  }
}