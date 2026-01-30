import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleGenAI } from '@google/genai';

interface RecommendedProduct {
  name: string;
  type: string;
}

interface AnalysisResult {
  cropName: string;
  condition: string;
  status: 'Healthy' | 'Attention Required' | 'Critical';
  confidence: number;
  symptoms: string[];
  deficiencies: string[];
  treatments: {
    organic: string[];
    chemical: string[];
  };
  recommendedProducts: RecommendedProduct[];
  prevention: string[];
}

@Component({
  selector: 'app-plant-analyser',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="max-w-4xl mx-auto pb-12">
      <!-- Header -->
      <header class="mb-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-3xl font-bold text-[#6A5A4F] mb-2">AI Plant Diagnostician</h2>
            <p class="text-stone-600">Upload a photo to detect diseases, pests, and nutrient deficiencies.</p>
          </div>
          
          <!-- Mock Location & Language -->
          <div class="flex gap-3">
            <div class="bg-white border border-stone-200 px-3 py-1 rounded-full text-xs font-bold text-stone-500 flex items-center gap-1">
              📍 Tamil Nadu, IN
            </div>
            <select class="bg-white border border-stone-200 px-3 py-1 rounded-full text-xs font-bold text-stone-600 outline-none">
              <option>English</option>
              <option>Tamil (தமிழ்)</option>
              <option>Hindi (हिंदी)</option>
            </select>
          </div>
        </div>
      </header>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <!-- Input Section -->
        <div class="space-y-6">
          <div class="bg-white p-6 rounded-3xl shadow-sm border border-stone-200">
            <h3 class="font-bold text-stone-700 mb-4">1. Capture or Upload</h3>
            
            <div class="relative w-full aspect-square md:aspect-[4/3] rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50 flex flex-col items-center justify-center overflow-hidden transition-colors hover:bg-stone-100 group">
              @if (imagePreview()) {
                <img [src]="imagePreview()" class="absolute inset-0 w-full h-full object-cover" alt="Plant preview">
                <button (click)="clearImage()" class="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 backdrop-blur-sm transition-all">
                  ✕
                </button>
              } @else {
                <div class="text-center p-6 pointer-events-none">
                  <div class="text-4xl mb-3 text-stone-300 group-hover:text-[#A47E3B] transition-colors">📸</div>
                  <p class="text-stone-500 font-medium">Click to upload</p>
                  <p class="text-xs text-stone-400 mt-1">Supports JPG, PNG</p>
                </div>
              }
              <input type="file" accept="image/*" (change)="handleImage($event)" class="absolute inset-0 opacity-0 cursor-pointer" [disabled]="!!imagePreview()">
            </div>

            <button 
              (click)="analyzePlant()"
              [disabled]="!imagePreview() || isLoading()"
              class="w-full mt-4 bg-[#A47E3B] hover:bg-[#8c6b32] disabled:bg-stone-300 text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2">
              @if (isLoading()) {
                <span class="animate-spin text-2xl">↻</span> Diagnosing...
              } @else {
                <span>✨ Analyze Plant Health</span>
              }
            </button>
            
            @if (error()) {
              <div class="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                {{ error() }}
              </div>
            }
          </div>

          <!-- Feature List -->
          <div class="bg-stone-100 p-6 rounded-2xl border border-stone-200">
            <h4 class="font-bold text-stone-600 mb-3 text-sm uppercase tracking-wider">Capabilities</h4>
            <ul class="space-y-2 text-sm text-stone-500">
              <li class="flex items-center gap-2">✅ <span class="text-stone-700">Disease & Pest Detection</span></li>
              <li class="flex items-center gap-2">✅ <span class="text-stone-700">Nutrient Deficiency (N-P-K)</span></li>
              <li class="flex items-center gap-2">✅ <span class="text-stone-700">Growth Stage Analysis</span></li>
              <li class="flex items-center gap-2">✅ <span class="text-stone-700">Organic Treatment Advisory</span></li>
              <li class="flex items-center gap-2">✅ <span class="text-stone-700">Product Recommendations</span></li>
            </ul>
          </div>
        </div>

        <!-- Results Section -->
        <div class="h-full">
          @if (result()) {
            <div class="bg-white rounded-3xl shadow-lg border border-stone-100 overflow-hidden animate-fade-in">
              <!-- Header Status -->
              <div class="p-6 border-b border-stone-100" 
                   [class.bg-green-50]="result()?.status === 'Healthy'"
                   [class.bg-yellow-50]="result()?.status === 'Attention Required'"
                   [class.bg-red-50]="result()?.status === 'Critical'">
                <div class="flex justify-between items-start mb-2">
                   <h3 class="text-2xl font-bold text-stone-800">{{ result()?.cropName }}</h3>
                   <span class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                         [class.bg-green-200]="result()?.status === 'Healthy'"
                         [class.text-green-800]="result()?.status === 'Healthy'"
                         [class.bg-yellow-200]="result()?.status === 'Attention Required'"
                         [class.text-yellow-800]="result()?.status === 'Attention Required'"
                         [class.bg-red-200]="result()?.status === 'Critical'"
                         [class.text-red-800]="result()?.status === 'Critical'">
                     {{ result()?.status }}
                   </span>
                </div>
                <p class="text-lg font-medium text-stone-700">{{ result()?.condition }}</p>
                
                <!-- Confidence Bar -->
                <div class="mt-3 flex items-center gap-2 text-xs text-stone-500">
                  <span>AI Confidence: {{ result()?.confidence }}%</span>
                  <div class="flex-1 h-1.5 bg-stone-200 rounded-full">
                    <div class="h-full rounded-full bg-stone-600" [style.width.%]="result()?.confidence"></div>
                  </div>
                </div>
              </div>

              <div class="p-6 space-y-6">
                <!-- Symptoms & Deficiencies -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <h4 class="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Symptoms</h4>
                    <ul class="list-disc list-inside text-sm text-stone-600 space-y-1">
                      @for (sym of result()?.symptoms; track sym) {
                        <li>{{ sym }}</li>
                      }
                    </ul>
                  </div>
                  <div>
                    <h4 class="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Deficiencies</h4>
                     @if (result()?.deficiencies?.length) {
                      <div class="flex flex-wrap gap-2">
                        @for (def of result()?.deficiencies; track def) {
                          <span class="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs font-bold">{{ def }}</span>
                        }
                      </div>
                     } @else {
                       <span class="text-sm text-stone-400 italic">None detected</span>
                     }
                  </div>
                </div>

                <!-- Treatments -->
                <div>
                   <h4 class="text-sm font-bold text-stone-800 mb-3 border-b border-stone-100 pb-1">Recommended Treatment</h4>
                   
                   <div class="space-y-4">
                     <div class="bg-green-50 p-4 rounded-xl border border-green-100">
                       <h5 class="font-bold text-green-800 text-sm mb-2 flex items-center gap-2">🌿 Organic Solutions</h5>
                       <ul class="text-sm text-green-700 space-y-1">
                         @for (item of result()?.treatments?.organic; track item) {
                           <li class="flex items-start gap-2 before:content-['•'] before:mr-1">{{ item }}</li>
                         }
                       </ul>
                     </div>

                     <div class="bg-blue-50 p-4 rounded-xl border border-blue-100">
                       <h5 class="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2">🧪 Chemical Intervention</h5>
                       <ul class="text-sm text-blue-700 space-y-1">
                         @for (item of result()?.treatments?.chemical; track item) {
                            <li class="flex items-start gap-2 before:content-['•'] before:mr-1">{{ item }}</li>
                         }
                       </ul>
                     </div>
                   </div>
                </div>

                <!-- Product Recommendations (New) -->
                @if (result()?.recommendedProducts?.length) {
                  <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                     <h4 class="font-bold text-indigo-900 text-sm mb-3 flex items-center gap-2">🛒 Buy Recommended Chemicals</h4>
                     <div class="space-y-3">
                       @for (prod of result()?.recommendedProducts; track prod.name) {
                         <div class="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                           <div class="flex justify-between items-start mb-2">
                             <span class="font-bold text-stone-700 text-sm">{{ prod.name }}</span>
                             <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-500 uppercase">{{ prod.type }}</span>
                           </div>
                           <div class="flex gap-2">
                             <a [href]="getAmazonLink(prod.name)" target="_blank" class="flex-1 text-center bg-[#FF9900] hover:bg-[#e68a00] text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-1 shadow-sm">
                               Amazon
                             </a>
                             <a [href]="getFlipkartLink(prod.name)" target="_blank" class="flex-1 text-center bg-[#2874F0] hover:bg-[#1e60c9] text-white text-xs font-bold py-2 rounded transition-colors flex items-center justify-center gap-1 shadow-sm">
                               Flipkart
                             </a>
                           </div>
                         </div>
                       }
                     </div>
                  </div>
                }
                
                <!-- Prevention -->
                <div class="bg-stone-50 p-4 rounded-xl border border-stone-200">
                  <h4 class="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Preventive Measures</h4>
                   <ul class="text-sm text-stone-600 space-y-1">
                      @for (prev of result()?.prevention; track prev) {
                        <li class="flex items-start gap-2">🛡️ {{ prev }}</li>
                      }
                   </ul>
                </div>

                <!-- Action Button -->
                <button 
                  (click)="clearImage()"
                  class="w-full py-4 bg-stone-800 text-white rounded-xl font-bold hover:bg-stone-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                  <span>📸</span> Analyze Another Plant
                </button>
              </div>
            </div>
          } @else if (!imagePreview()) {
             <div class="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-stone-200 rounded-3xl bg-stone-50/50">
               <div class="text-6xl mb-4 opacity-20">🌿</div>
               <h3 class="text-xl font-bold text-stone-400 mb-2">Ready to Diagnose</h3>
               <p class="text-stone-400 max-w-xs">Upload a clear image of the affected leaf or plant to get instant AI advice.</p>
             </div>
          }
        </div>

      </div>
    </div>
  `
})
export class PlantAnalyserComponent {
  imagePreview = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);
  result = signal<AnalysisResult | null>(null);

  handleImage(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview.set(e.target?.result as string);
        this.result.set(null);
        this.error.set(null);
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage() {
    this.imagePreview.set(null);
    this.result.set(null);
    this.error.set(null);
  }

  async analyzePlant() {
    const imageData = this.imagePreview();
    if (!imageData) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const base64Data = imageData.split(',')[1];
      const mimeType = imageData.substring(imageData.indexOf(':') + 1, imageData.indexOf(';'));

      const ai = new GoogleGenAI({ apiKey: process.env['API_KEY'] });

      const prompt = `
        Act as an expert agricultural agronomist. Analyze this image of a plant.
        Identify the crop name.
        Detect any diseases, pests, visible stress symptoms, or nutrient deficiencies (Nitrogen, Phosphorus, Potassium, Iron, Zinc, etc.).
        
        Provide a JSON response with this EXACT structure (no markdown code blocks):
        {
          "cropName": "string",
          "condition": "string", 
          "status": "Healthy" | "Attention Required" | "Critical",
          "confidence": number,
          "symptoms": ["string"],
          "deficiencies": ["string"],
          "treatments": {
            "organic": ["string"],
            "chemical": ["string"]
          },
          "recommendedProducts": [
            { "name": "Active Ingredient or Trade Name", "type": "Pesticide | Herbicide | Fungicide | Fertilizer" }
          ],
          "prevention": ["string"]
        }
        
        IMPORTANT: In "recommendedProducts", suggest specific chemical active ingredients (e.g. Imidacloprid, Mancozeb) or popular commercial product names suitable for the identified issue.
        If the image is not a plant, set status to "Critical" and condition to "Not a recognized plant".
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mimeType, data: base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const jsonText = response.text;
      if (jsonText) {
        const data = JSON.parse(jsonText);
        this.result.set(data);
      } else {
        throw new Error('No analysis data received');
      }

    } catch (err) {
      console.error(err);
      this.error.set('Failed to analyze image. Please check your connection or try a different image.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getAmazonLink(query: string): string {
    return `https://www.amazon.in/s?k=${encodeURIComponent(query + ' agriculture')}`;
  }

  getFlipkartLink(query: string): string {
    return `https://www.flipkart.com/search?q=${encodeURIComponent(query + ' agriculture')}`;
  }
}