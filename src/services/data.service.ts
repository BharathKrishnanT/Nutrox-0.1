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
  // Replaced generic isSerialConnected with specific port states
  isNpkConnected = signal<boolean>(false);
  isTankConnected = signal<boolean>(false);
  isDemoMode = signal<boolean>(false); // Simulation Mode
  
  // Computed helper for UI to know if ANY real device is connected
  anySerialConnected = computed(() => this.isNpkConnected() || this.isTankConnected());

  // Debug Log
  lastCommand = signal<string>('');
  
  npkReadings = signal<NpkData>({ n: 0, p: 0, k: 0, timestamp: null });
  tankReadings = signal<TankData>({ methane: 0, temperature: 0, humidity: 0, ph: 7.0 });

  // --- Relay & Motor State ---
  relay1State = signal<boolean>(false); // Heater (Relay Pin 4)
  relay2State = signal<boolean>(false); // Grinder (Motor A)
  relay3State = signal<boolean>(false); // Agitator (Motor B)

  grinderSpeed = signal<number>(255); // Motor A
  agitatorSpeed = signal<number>(255); // Motor B
  
  grinderDirection = signal<'F' | 'B'>('F'); // Motor A
  agitatorDirection = signal<'F' | 'B'>('F'); // Motor B

  // --- Serial Ports ---
  private npkPort: any = null;
  private tankPort: any = null;
  private npkWriter: WritableStreamDefaultWriter<string> | null = null;
  private tankWriter: WritableStreamDefaultWriter<string> | null = null;
  
  // Buffer for multi-line NPK readings
  private partialNpk: { n: number | null, p: number | null, k: number | null } = { n: null, p: null, k: null };
  
  // Track last real update for Hybrid Mode
  private lastTankUpdate = 0;

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
    { id: 'oil-cake', name: 'Oil Cake / Neem', boosts: 'Nitrogen (N)', description: 'Mixing in crop waste or oil cakes creates a nitrogen-rich fertilizer, perfect for promoting leafy green growth.', nutrientBoost: { "N": 3 } },
    { id: 'bone-meal', name: 'Bone Meal / Rock Phos', boosts: 'Phosphorus (P)', description: 'Adding bone meal or ash from cattle waste significantly increases phosphorus, vital for strong root development.', nutrientBoost: { "P": 3 } },
    { id: 'wood-ash', name: 'Wood Ash', boosts: 'Potassium (K)', description: 'Combining with wood ash makes a potassium-rich liquid fertilizer, excellent for improving fruit quality.', nutrientBoost: { "K": 3 } },
    { id: 'eggshells', name: 'Eggshells / Lime', boosts: 'Calcium (Ca)', description: 'Crushed eggshells or agricultural lime are fantastic calcium sources, essential for building strong cell walls.', nutrientBoost: { "Ca": 3 } },
    { id: 'gypsum', name: 'Gypsum', boosts: 'Sulphur (S)', description: 'Gypsum is an excellent source of sulphur, a key component of amino acids and vitamins.', nutrientBoost: { "S": 3 } },
    { id: 'epsom-salt', name: 'Epsom Salt', boosts: 'Magnesium (Mg)', description: 'Epsom salt (Magnesium Sulphate) provides a readily available source of magnesium, crucial for photosynthesis.', nutrientBoost: { "Mg": 3 } },
    { id: 'vermicompost', name: 'Vermicompost', boosts: 'All-Round Booster', description: 'Mixing in vermicompost supercharges the base with a wide array of micronutrients and growth hormones.', nutrientBoost: { "N": 2, "P": 2, "K": 2, "Ca": 2, "S": 2, "Mg": 2 } }
  ];

  readonly organicBaseProfile = { "N": 1, "P": 1, "K": 1, "Ca": 1, "S": 1, "Mg": 1 };

  // --- Context State ---
  selectedCrop = signal<Crop | null>(null);
  detectedDeficiencies = signal<string[]>([]); // Populated by Plant AI

  constructor() {
    this.startTankMonitoring();
    
    // Listen for physical device disconnection
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      (navigator as any).serial.addEventListener('disconnect', (event: any) => {
        if (event.target === this.npkPort) {
           console.log('NPK Device disconnected.');
           this.disconnectNpk();
        } else if (event.target === this.tankPort) {
           console.log('Tank Device disconnected.');
           this.disconnectTank();
        }
      });
    }
  }

  // --- Actions ---

  // Connect via Web Serial for NPK
  async connectToNpkDevice(): Promise<boolean> {
    await this.connectNpk();
    return this.isNpkConnected();
  }
  
  // Enable Demo Mode (Simulation without USB)
  simulateConnection() {
    this.disconnectNpk();
    this.disconnectTank();
    this.isDemoMode.set(true);
    this.lastCommand.set('DEMO MODE: Connection Simulated');
  }

  // Read NPK: Uses Serial if connected, otherwise uses mock
  async readNPK(): Promise<void> {
    if (this.isNpkConnected() && this.npkWriter) {
      // Send Request Command to NPK Port
      try {
        await this.npkWriter.write('READ_NPK\n');
        this.lastCommand.set('Sent to NPK: READ_NPK');
      } catch (e) {
        console.error('Failed to send NPK read command', e);
      }
    } else if (this.isDemoMode()) {
      // Fallback: Simulated Data
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
  }

  // --- Web Serial Connection Logic ---
  
  async connectNpk() {
    if (!('serial' in navigator)) { alert('Web Serial API not supported.'); return; }
    if (this.isNpkConnected()) return;

    try {
      // Request Port for NPK
      this.npkPort = await (navigator as any).serial.requestPort();
      await this.npkPort.open({ baudRate: 9600 });
      
      this.isNpkConnected.set(true);
      this.isDemoMode.set(false);
      this.lastCommand.set('NPK Serial Connected (9600)');

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(this.npkPort.writable);
      this.npkWriter = textEncoder.writable.getWriter();

      this.readLoop(this.npkPort, 'NPK');
    } catch (error: any) {
      const errStr = String(error);
      if (errStr.includes('permissions policy') || errStr.includes('Access')) {
         alert('Access Denied: Serial Port permission is blocked by browser policy. Ensure the app is running in a secure context (HTTPS) and permissions are granted in metadata.');
      } else if (errStr.includes('Failed to open') || errStr.includes('NetworkError')) {
         alert('Connection Failed: The Serial Port is busy or cannot be opened. Please close any other applications (like Arduino IDE) utilizing this port and try again.');
      }
      if (!errStr.includes('No port selected')) console.error('NPK Connection Error:', error);
      this.disconnectNpk();
    }
  }

  async connectTank() {
    if (!('serial' in navigator)) { alert('Web Serial API not supported.'); return; }
    if (this.isTankConnected()) return;

    try {
      // Request Port for Tank
      this.tankPort = await (navigator as any).serial.requestPort();
      await this.tankPort.open({ baudRate: 9600 });
      
      this.isTankConnected.set(true);
      this.isDemoMode.set(false);
      this.lastCommand.set('Tank Serial Connected (9600)');

      const textEncoder = new TextEncoderStream();
      textEncoder.readable.pipeTo(this.tankPort.writable);
      this.tankWriter = textEncoder.writable.getWriter();

      this.readLoop(this.tankPort, 'TANK');
    } catch (error: any) {
      const errStr = String(error);
      if (errStr.includes('permissions policy') || errStr.includes('Access')) {
         alert('Access Denied: Serial Port permission is blocked by browser policy. Ensure the app is running in a secure context (HTTPS) and permissions are granted in metadata.');
      } else if (errStr.includes('Failed to open') || errStr.includes('NetworkError')) {
         alert('Connection Failed: The Serial Port is busy or cannot be opened. Please close any other applications (like Arduino IDE) utilizing this port and try again.');
      }
      if (!errStr.includes('No port selected')) console.error('Tank Connection Error:', error);
      this.disconnectTank();
    }
  }

  // Set Motor Direction ('F' or 'B')
  async setDirection(id: 2 | 3, dir: 'F' | 'B') {
    if (id === 2) this.grinderDirection.set(dir);
    if (id === 3) this.agitatorDirection.set(dir);
    
    // Log simulation
    const name = id === 2 ? 'Grinder' : 'Agitator';
    this.lastCommand.set(`Prepared: ${name} Direction -> ${dir}`);

    // If currently running, update the motor immediately
    const isRunning = id === 2 ? this.relay2State() : this.relay3State();
    
    if (isRunning) {
        this.sendMotorCommand(id, true);
    }
  }

  // Toggle Relay or Motor State based on Arduino Protocol
  async toggleRelay(id: 1 | 2 | 3, state: boolean) {
    // UI Update immediately for responsiveness (Optimistic)
    if (id === 1) this.relay1State.set(state);
    if (id === 2) this.relay2State.set(state);
    if (id === 3) this.relay3State.set(state);
    
    if (id === 1) {
         this.sendRelayCommand(id, state);
    } else {
         this.sendMotorCommand(id, state);
    }
  }

  // Set Motor Speed dynamically (Only affects if motor is running)
  async setMotorSpeed(id: 2 | 3, speed: number) {
    const safeSpeed = Math.floor(speed);

    // Update local state signal
    if (id === 2) this.grinderSpeed.set(safeSpeed);
    if (id === 3) this.agitatorSpeed.set(safeSpeed);
    
    const name = id === 2 ? 'Grinder' : 'Agitator';
    // Only send command if running
    const isRunning = id === 2 ? this.relay2State() : this.relay3State();
    
    if (isRunning) {
       this.sendMotorCommand(id, true);
    } else {
       this.lastCommand.set(`Prepared: ${name} Speed -> ${safeSpeed} (Wait for Start)`);
    }
  }
  
  private async sendRelayCommand(id: number, state: boolean) {
      const command = `RELAY:${state ? 1 : 0}\n`;
      this.lastCommand.set(`Sent Tank: ${command.trim()}`);
      
      if (this.isTankConnected() && this.tankWriter) {
          try {
             await this.tankWriter.write(command);
          } catch(e) { console.error(e); this.disconnectTank(); }
      }
  }
  
  private async sendMotorCommand(id: 2 | 3, state: boolean) {
      const speed = Math.floor(id === 2 ? this.grinderSpeed() : this.agitatorSpeed());
      const dir = id === 2 ? this.grinderDirection() : this.agitatorDirection();
      const motorChar = id === 2 ? 'A' : 'B';
      
      // If turning ON, use current direction (F/B). If OFF, use 'S'.
      const mode = state ? dir : 'S'; 
      const command = `MOTOR:${motorChar}:${mode}:${state ? speed : 0}\n`;
      
      this.lastCommand.set(`Sent Tank: ${command.trim()}`);

      if (this.isTankConnected() && this.tankWriter) {
          try {
             await this.tankWriter.write(command);
          } catch(e) { console.error(e); this.disconnectTank(); }
      }
  }

  private async readLoop(port: any, type: 'NPK' | 'TANK') {
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
             this.parseSerialData(lines[i], type);
          }
          buffer = lines[lines.length - 1];
        }
      }
    } catch (error: any) {
      // Gracefully handle 'The device has been lost' and other disconnect errors
      if (String(error).includes('lost') || error.name === 'NetworkError' || error.name === 'DisconnectError') {
        console.warn(`${type} Serial Device Disconnected:`, error.message);
      } else {
        console.error(`${type} Serial Read Error:`, error);
      }
    } finally {
      // Release locks and wait for stream to close
      try { reader.releaseLock(); } catch (e) { /* ignore */ }
      try { await readableStreamClosed.catch(() => {}); } catch(e) { /* ignore */ }

      if (type === 'NPK') this.disconnectNpk();
      else this.disconnectTank();
    }
  }

  private async disconnectNpk() {
    console.log('Cleaning up NPK connection...');
    if (this.npkWriter) {
      try { await this.npkWriter.releaseLock(); } catch (e) {}
      this.npkWriter = null;
    }
    if (this.npkPort) {
        try { await this.npkPort.close(); } catch(e) {}
        this.npkPort = null;
    }
    this.isNpkConnected.set(false);
  }

  private async disconnectTank() {
    console.log('Cleaning up Tank connection...');
    if (this.tankWriter) {
      try { await this.tankWriter.releaseLock(); } catch (e) {}
      this.tankWriter = null;
    }
    if (this.tankPort) {
        try { await this.tankPort.close(); } catch(e) {}
        this.tankPort = null;
    }
    this.isTankConnected.set(false);
    
    // Reset Motor UI State
    this.relay1State.set(false);
    this.relay2State.set(false);
    this.relay3State.set(false);
  }

  private parseSerialData(line: string, source: 'NPK' | 'TANK') {
    const text = line.trim();
    if (!text) return;
    
    console.log(`[${source}] RX:`, text);

    // 1. Try Strict Match for format: "N:10,P:20,K:30" (matches ESP32 code)
    const combinedMatch = text.match(/N:(\d+),P:(\d+),K:(\d+)/i);
    if (combinedMatch) {
       this.npkReadings.set({
         n: parseInt(combinedMatch[1], 10),
         p: parseInt(combinedMatch[2], 10),
         k: parseInt(combinedMatch[3], 10),
         timestamp: new Date()
       });
       return;
    }

    // 2. Try JSON Parsing (Strict)
    // Expected JSON: {"t":25.0,"h":60.0,"g":300,"a":0, "n": 40, "p": 30, "k": 50}
    if (text.startsWith('{') && text.endsWith('}')) {
      try {
        const data = JSON.parse(text);
        
        // --- NPK Sensor Data ---
        // Accepts NPK from either source if present
        if (data.n !== undefined && data.p !== undefined && data.k !== undefined) {
           this.npkReadings.set({
             n: Number(data.n),
             p: Number(data.p),
             k: Number(data.k),
             timestamp: new Date()
           });
        }

        // --- Tank Sensor Data ---
        // Primarily expects tank data from TANK source, but allows from either if available
        if (data.t !== undefined || data.h !== undefined || data.g !== undefined) {
           this.lastTankUpdate = Date.now();
           this.tankReadings.update(current => ({
            ...current,
            temperature: typeof data.t === 'number' ? data.t : current.temperature,
            humidity: typeof data.h === 'number' ? data.h : current.humidity,
            methane: typeof data.g === 'number' ? data.g : current.methane,
            ph: typeof data.ph === 'number' ? data.ph : current.ph,
          }));
        }
        return; // Success
      } catch (e) {
        console.debug('JSON parse failed, trying regex fallback');
      }
    }

    // 3. Try CSV (comma separated values: "10,20,30" for N,P,K)
    const csvMatch = text.match(/^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/);
    if (csvMatch) {
       this.npkReadings.set({
         n: parseInt(csvMatch[1], 10),
         p: parseInt(csvMatch[2], 10),
         k: parseInt(csvMatch[3], 10),
         timestamp: new Date()
       });
       return;
    }

    // 4. Try Text Protocol for Tank
    let tankUpdated = false;
    const tempMatch = text.match(/(?:T|Temp)[:=\s]*([\d\.]+)/i);
    const humMatch = text.match(/(?:H|Hum)[:=\s]*([\d\.]+)/i);
    const gasMatch = text.match(/(?:G|Gas|Methane)[:=\s]*([\d\.]+)/i);
    const phMatch = text.match(/(?:pH)[:=\s]*([\d\.]+)/i);

    if (tempMatch || humMatch || gasMatch || phMatch) {
       this.lastTankUpdate = Date.now();
       this.tankReadings.update(current => ({
         ...current,
         temperature: tempMatch ? parseFloat(tempMatch[1]) : current.temperature,
         humidity: humMatch ? parseFloat(humMatch[1]) : current.humidity,
         methane: gasMatch ? parseFloat(gasMatch[1]) : current.methane,
         ph: phMatch ? parseFloat(phMatch[1]) : current.ph
       }));
       tankUpdated = true;
    }

    if (tankUpdated) return;

    // 5. Try Multi-line Accumulation Regex for NPK
    const nMatch = text.match(/(?:N|Nitrogen)[:=\s]*(\d+)/i);
    if (nMatch) this.partialNpk.n = parseInt(nMatch[1], 10);

    const pMatch = text.match(/(?:P|Phosphorus)[:=\s]*(\d+)/i);
    if (pMatch) this.partialNpk.p = parseInt(pMatch[1], 10);

    const kMatch = text.match(/(?:K|Potassium)[:=\s]*(\d+)/i);
    if (kMatch) this.partialNpk.k = parseInt(kMatch[1], 10);

    // Check if partial buffer is complete
    if (this.partialNpk.n !== null && this.partialNpk.p !== null && this.partialNpk.k !== null) {
        this.npkReadings.set({
            n: this.partialNpk.n,
            p: this.partialNpk.p,
            k: this.partialNpk.k,
            timestamp: new Date()
        });
        // Reset buffer
        this.partialNpk = { n: null, p: null, k: null };
    }
  }

  private startTankMonitoring() {
    // Hybrid Simulation Loop
    setInterval(() => {
      // Simulate if:
      // 1. In Demo Mode
      // 2. Tank connected but no data for 5 seconds (Sensor fault simulation/keepalive)
      
      const shouldSimulate = 
         this.isDemoMode() ||
         (this.isTankConnected() && (Date.now() - this.lastTankUpdate > 5000));

      if (!shouldSimulate) return;

      const newPh = parseFloat((Math.random() * (8.5 - 5.5) + 5.5).toFixed(2));

      this.tankReadings.set({
        methane: parseFloat((Math.random() * (500 - 100) + 100).toFixed(1)),
        temperature: parseFloat((Math.random() * (35 - 25) + 25).toFixed(1)),
        humidity: parseFloat((Math.random() * (90 - 40) + 40).toFixed(1)),
        ph: newPh
      });
      
    }, 3000);
  }
}