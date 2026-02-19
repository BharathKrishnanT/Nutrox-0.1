import { Component, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, OrganicAdditive } from '../services/data.service';

interface RecipeItem {
  name: string;
  amount: number;
  reason: string;
  color: string;
  percent: number;
}

@Component({
  selector: 'app-ratio-generator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-5xl mx-auto">
      <header class="mb-8">
        <h2 class="text-3xl font-bold text-[#6A5A4F] mb-2">Organic Mix Calculator</h2>
        <p class="text-stone-600">Generates a custom fertilizer recipe based on your soil's latest NPK readings and AI diagnostics.</p>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <!-- Input Section -->
        <div class="bg-white p-6 rounded-2xl shadow-sm border border-stone-200 h-fit">
          <h3 class="text-lg font-bold text-stone-700 mb-4 border-b pb-2">1. Configuration</h3>
          
          <!-- Crop Context Alert -->
          @if (dataService.selectedCrop()) {
            <div class="mb-6 bg-[#A47E3B]/10 border border-[#A47E3B]/20 p-4 rounded-xl flex items-start justify-between">
              <div>
                <span class="text-xs font-bold text-[#A47E3B] uppercase tracking-wider">Target Crop</span>
                <h4 class="font-bold text-stone-800 text-lg">{{ dataService.selectedCrop()?.name }}</h4>
                <div class="text-xs text-stone-500 mt-1 flex gap-2">
                  <span>Target N: {{ dataService.selectedCrop()?.idealN }}</span>
                  <span>P: {{ dataService.selectedCrop()?.idealP }}</span>
                  <span>K: {{ dataService.selectedCrop()?.idealK }}</span>
                </div>
              </div>
              <button (click)="dataService.selectedCrop.set(null)" class="text-stone-400 hover:text-red-500 transition-colors">✕</button>
            </div>
          }

          <!-- AI Deficiencies Alert -->
          @if (dataService.detectedDeficiencies().length > 0) {
            <div class="mb-6 bg-red-50 border border-red-200 p-4 rounded-xl">
               <div class="flex items-center gap-2 mb-2">
                 <span class="text-xl">🤖</span>
                 <span class="font-bold text-red-800 text-sm">AI Plant Diagnosis Active</span>
               </div>
               <div class="flex flex-wrap gap-2">
                 @for (def of dataService.detectedDeficiencies(); track def) {
                   <span class="px-2 py-1 bg-white border border-red-100 rounded text-xs font-bold text-red-600 uppercase">{{ def }}</span>
                 }
               </div>
               <p class="text-xs text-red-700 mt-2">The recipe will be adjusted to treat these specific deficiencies.</p>
            </div>
          }

          <div class="mb-6">
            <label class="block text-sm font-medium text-stone-600 mb-2">Target Volume (Net Weight)</label>
            <div class="flex items-center gap-2">
              <input 
                type="number" 
                [value]="targetVolume()" 
                (input)="updateVolume($event)"
                class="block w-full rounded-lg border-stone-300 bg-stone-50 border p-3 focus:ring-2 focus:ring-[#A47E3B] focus:outline-none font-bold text-stone-700"
                placeholder="e.g. 10">
              <span class="text-stone-500 font-medium">kg/L</span>
            </div>
          </div>

          <div class="bg-stone-50 p-4 rounded-lg border border-stone-100">
            <h4 class="text-sm font-semibold text-stone-500 uppercase mb-3">Current Soil Levels (mg/kg)</h4>
            <div class="grid grid-cols-3 gap-4">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-blue-600 text-center">Nitrogen (N)</label>
                <input 
                  type="number" 
                  [value]="inputN()" 
                  (input)="updateN($event)"
                  class="w-full text-center p-2 rounded border border-stone-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-bold text-stone-700"
                >
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-orange-600 text-center">Phosphorus (P)</label>
                <input 
                  type="number" 
                  [value]="inputP()" 
                  (input)="updateP($event)"
                  class="w-full text-center p-2 rounded border border-stone-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none font-bold text-stone-700"
                >
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-xs font-bold text-red-600 text-center">Potassium (K)</label>
                <input 
                  type="number" 
                  [value]="inputK()" 
                  (input)="updateK($event)"
                  class="w-full text-center p-2 rounded border border-stone-200 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none font-bold text-stone-700"
                >
              </div>
            </div>
            <p class="text-xs text-stone-400 mt-2 italic text-center">Values auto-sync from sensor, or enter manually.</p>
          </div>
        </div>

        <!-- Output Section -->
        <div class="bg-[#FDFBF5] rounded-2xl border-2 border-[#A47E3B] relative overflow-hidden flex flex-col">
          <div class="bg-[#A47E3B] px-6 py-4 flex justify-between items-center">
            <h3 class="text-white font-bold text-lg">Organic Waste Mix</h3>
            <span class="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded">
               For {{ dataService.selectedCrop() ? dataService.selectedCrop()?.name : 'General Growth' }}
            </span>
          </div>

          @if (recommendation()) {
            <div class="p-6 flex-1 flex flex-col">
               
               <!-- Summary -->
               <div class="text-center mb-6">
                 <div class="text-4xl font-bold text-stone-800">{{ targetVolume() }} <span class="text-lg text-stone-500 font-normal">kg/L</span></div>
                 <div class="text-stone-500 text-sm">Total Fertilizer Yield</div>
               </div>

               <!-- Ingredients List -->
               <div class="space-y-4">
                 
                 <!-- Part 1: Compost (Base) -->
                 <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-amber-600">
                    <div class="flex justify-between items-start mb-1">
                      <h4 class="font-bold text-stone-700">1. Organic Base (Compost)</h4>
                      <span class="font-bold text-xl text-amber-700">{{ recommendation()?.compost?.amount }} <small class="text-xs">kg/L</small></span>
                    </div>
                    <p class="text-stone-600 text-sm">{{ recommendation()?.compost?.name }}</p>
                    <p class="text-xs text-stone-400 mt-1 italic">{{ recommendation()?.compost?.reason }}</p>
                 </div>

                 <!-- Part 2: Booster -->
                 <div class="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
                    <div class="flex justify-between items-start mb-1">
                       <div class="flex items-center gap-2">
                         <h4 class="font-bold text-stone-700">2. Nutrient Booster</h4>
                         <span class="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Essential</span>
                       </div>
                       <span class="font-bold text-xl text-red-600">{{ recommendation()?.booster?.amount }} <small class="text-xs">kg/L</small></span>
                    </div>
                    <p class="text-stone-800 font-bold text-sm">{{ recommendation()?.booster?.name }}</p>
                    <p class="text-xs text-red-500 mt-1 font-medium">{{ recommendation()?.booster?.reason }}</p>
                 </div>

               </div>

            </div>
          } @else {
             <div class="h-full flex items-center justify-center text-stone-400 italic p-10">
               Waiting for data to generate recipe...
             </div>
          }
        </div>

      </div>

      <!-- Logic Explanation -->
      <div class="mt-8 bg-white p-6 rounded-xl border border-stone-100">
        <h4 class="font-bold text-stone-800 mb-2">Why this mix?</h4>
        <p class="text-stone-600 text-sm leading-relaxed">
           This formula uses a <strong>{{ recommendation()?.compost?.percent }}% Compost Base</strong> and <strong>{{ recommendation()?.booster?.percent }}% Nutrient Booster</strong> ratio.
           @if (dataService.detectedDeficiencies().length > 0) {
             The booster was specifically selected to address the <strong>{{ dataService.detectedDeficiencies()[0] }}</strong> detected by the AI analysis.
           } @else {
             The booster was selected to bridge the gap between your soil's current NPK levels and the optimal requirements for <strong>{{ dataService.selectedCrop() ? dataService.selectedCrop()?.name : 'general crops' }}</strong>.
           }
        </p>
      </div>
    </div>
  `
})
export class RatioGeneratorComponent {
  dataService = inject(DataService);
  targetVolume = signal<number>(10);
  
  // Manual Inputs (initialized to 0 or sensor values)
  inputN = signal<number>(0);
  inputP = signal<number>(0);
  inputK = signal<number>(0);

  constructor() {
    // Sync sensor data to inputs automatically when sensor reads new data
    effect(() => {
      const readings = this.dataService.npkReadings();
      if (readings.timestamp) {
        // Only update if we have a valid timestamp (live reading)
        this.inputN.set(readings.n);
        this.inputP.set(readings.p);
        this.inputK.set(readings.k);
      }
    }, { allowSignalWrites: true });
  }

  updateVolume(e: Event) {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (!isNaN(val) && val > 0) this.targetVolume.set(val);
  }
  
  updateN(e: Event) { this.inputN.set(parseFloat((e.target as HTMLInputElement).value) || 0); }
  updateP(e: Event) { this.inputP.set(parseFloat((e.target as HTMLInputElement).value) || 0); }
  updateK(e: Event) { this.inputK.set(parseFloat((e.target as HTMLInputElement).value) || 0); }

  recommendation = computed(() => {
    // 1. Gather Inputs
    const vol = this.targetVolume();
    // Use manual inputs for calculation
    const n = this.inputN();
    const p = this.inputP();
    const k = this.inputK();
    
    const crop = this.dataService.selectedCrop();
    const aiDeficiencies = this.dataService.detectedDeficiencies();
    const allAdditives = this.dataService.organicAdditives;

    // 2. Define Ratios (Organic Mix Only)
    // Dynamic Ratio calculation based on Crop Demand
    let ratioCompost = 0.60; // Default (Medium Feeders)
    let ratioBooster = 0.40;

    if (crop) {
       const totalDemand = crop.idealN + crop.idealP + crop.idealK;
       
       // High Feeders (e.g. Banana >350, Sugarcane) -> Need more booster power
       if (totalDemand > 350) {
          ratioCompost = 0.50;
          ratioBooster = 0.50;
       } 
       // Light Feeders (e.g. Pulses <150) -> Need less booster, more soil conditioner
       else if (totalDemand < 150) {
          ratioCompost = 0.75;
          ratioBooster = 0.25;
       }
    }

    const amountCompost = parseFloat((vol * ratioCompost).toFixed(2));
    const amountBooster = parseFloat((vol * ratioBooster).toFixed(2));

    // 3. Determine Ingredients
    
    // -- A. Organic Compost (Base) --
    const vermi = allAdditives.find(a => a.id === 'vermicompost');
    const cow = allAdditives.find(a => a.id === 'reset');
    const compostChoice = vermi || cow || { name: 'Compost' };
    
    const compostItem: RecipeItem = {
      name: compostChoice.name,
      amount: amountCompost,
      reason: 'Provides the organic matter base and microbial culture.',
      color: 'amber',
      percent: ratioCompost * 100
    };

    // -- B. Target Booster (The intelligent part) --
    let boosterChoice: OrganicAdditive | undefined;
    let boosterReason = '';

    // Priority 1: AI Detected Deficiency (Specific Micro/Macro nutrients)
    if (aiDeficiencies.length > 0) {
      const def = aiDeficiencies[0].toLowerCase();
      
      // Improved matching logic
      if (def.includes('magnesium') || def === 'mg') boosterChoice = allAdditives.find(a => a.nutrientBoost['Mg']);
      else if (def.includes('calcium') || def === 'ca') boosterChoice = allAdditives.find(a => a.nutrientBoost['Ca']);
      else if (def.includes('sulphur') || def === 's' || def === 'sulfur') boosterChoice = allAdditives.find(a => a.nutrientBoost['S']);
      else if (def.includes('nitrogen') || def === 'n') boosterChoice = allAdditives.find(a => a.nutrientBoost['N']);
      else if (def.includes('phosphorus') || def.includes('phosphate') || def === 'p') boosterChoice = allAdditives.find(a => a.nutrientBoost['P']);
      else if (def.includes('potassium') || def.includes('potash') || def === 'k') boosterChoice = allAdditives.find(a => a.nutrientBoost['K']);

      if (boosterChoice) {
        boosterReason = `Targeted fix for AI-detected ${def} deficiency.`;
      }
    }

    // Priority 2: Sensor NPK Gaps (Logic applies even if manually entered)
    if (!boosterChoice) {
       let targetNutrient = 'N';
       
       if (crop) {
         // Weighted Gap Analysis
         // We weight the gap by the crop's specific "need level" (1-3 scale)
         // This ensures that if a crop REALLY needs P (like Pulses), we prioritize P even if N gap is numerically similar.
         
         const wN = crop.needs['Nitrogen (N)'] || 2;
         const wP = crop.needs['Phosphorus (P)'] || 2;
         const wK = crop.needs['Potassium (K)'] || 2;

         // Calculate raw gap (Ideal - Current). If current > ideal, gap is 0.
         const rawGapN = Math.max(0, crop.idealN - n);
         const rawGapP = Math.max(0, crop.idealP - p);
         const rawGapK = Math.max(0, crop.idealK - k);
         
         // Normalize gap relative to ideal to get % missing, then apply weight
         // Add 1 to denominator to avoid divide by zero
         const scoreN = (rawGapN / (crop.idealN || 1)) * wN;
         const scoreP = (rawGapP / (crop.idealP || 1)) * wP;
         const scoreK = (rawGapK / (crop.idealK || 1)) * wK;
         
         const maxScore = Math.max(scoreN, scoreP, scoreK);
         
         if (maxScore > 0) {
            if (maxScore === scoreN) targetNutrient = 'N';
            else if (maxScore === scoreP) targetNutrient = 'P';
            else targetNutrient = 'K';
         } else {
             // If no gaps (soil is perfect), target the nutrient with highest absolute ideal requirement
             // to maintain levels.
             const maxIdeal = Math.max(crop.idealN, crop.idealP, crop.idealK);
             if (maxIdeal === crop.idealN) targetNutrient = 'N';
             else if (maxIdeal === crop.idealP) targetNutrient = 'P';
             else targetNutrient = 'K';
         }

         boosterReason = `Compensates for low ${targetNutrient} levels required by ${crop.name}.`;
       } else {
         // General Baseline (Target: 50-20-100)
         const nScore = n / 50;
         const pScore = p / 20;
         const kScore = k / 100;
         
         const minScore = Math.min(nScore, pScore, kScore);
         if (minScore === nScore) targetNutrient = 'N';
         else if (minScore === pScore) targetNutrient = 'P';
         else targetNutrient = 'K';

         boosterReason = `Boosts ${targetNutrient}, the limiting nutrient in current soil profile.`;
       }

       // Find best additive for this nutrient (Value >= 2)
       boosterChoice = allAdditives.find(a => (a.nutrientBoost[targetNutrient] || 0) >= 2);
    }

    // Fallback if nothing specific needed or found
    if (!boosterChoice) {
      boosterChoice = allAdditives.find(a => a.id === 'vermicompost'); // Default to Vermicompost
      boosterReason = 'General purpose nutrient booster.';
    }

    const boosterItem: RecipeItem = {
      name: boosterChoice?.name || 'General Booster',
      amount: amountBooster,
      reason: boosterReason,
      color: 'red',
      percent: ratioBooster * 100
    };

    return {
      compost: compostItem,
      booster: boosterItem
    };
  });
}