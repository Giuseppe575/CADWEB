import { GoogleGenAI, Type } from "@google/genai";
import { Command } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function parseVoiceCommand(transcript: string): Promise<Command | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Traduci il seguente comando vocale in un oggetto JSON per un'app CAD planimetrica.
      Comando: "${transcript}"

      Esempi:
      - "disegna una linea" -> { "action": "draw", "target": "line" }
      - "aggiungi una quota lineare" -> { "action": "draw", "target": "dimension" }
      - "aggiungi una quota angolare" -> { "action": "draw", "target": "angular_dimension" }
      - "aggiungi una nota di testo" -> { "action": "draw", "target": "text" }
      - "scrivi 'Soggiorno' qui" -> { "action": "draw", "target": "text", "params": { "label": "Soggiorno" } }
      - "disegna una parete di 5 metri" -> { "action": "draw", "target": "wall", "params": { "length": 5 } }
      - "disegna un cerchio di raggio 2" -> { "action": "draw", "target": "circle", "params": { "radius": 2 } }
      - "disegna una polilinea" -> { "action": "draw", "target": "polyline" }
      - "disegna a mano libera" -> { "action": "draw", "target": "freehand" }
      - "disegna una linea a 90 gradi lunga 3" -> { "action": "draw", "target": "line", "params": { "length": 3, "angle": 90 } }
      - "cancella tutto" -> { "action": "clear", "target": "all" }
      - "annulla" -> { "action": "undo", "target": "all" }
      - "esporta in dxf" -> { "action": "export_dxf", "target": "all" }
      - "esporta in pdf" -> { "action": "export_pdf", "target": "all" }
      - "salva progetto" -> { "action": "save", "target": "all" }
      - "crea livello arredamento" -> { "action": "layer_add", "target": "layer", "params": { "layerName": "arredamento" } }
      - "disegna una porta di 90 centimetri" -> { "action": "draw", "target": "door", "params": { "width": 90 } }
      - "aggiungi una porta" -> { "action": "draw", "target": "door", "params": { "width": 90 } }
      - "porta da 80" -> { "action": "draw", "target": "door", "params": { "width": 80 } }
      - "disegna una finestra di 120 centimetri" -> { "action": "draw", "target": "window", "params": { "width": 120 } }
      - "aggiungi una finestra" -> { "action": "draw", "target": "window", "params": { "width": 100 } }
      - "finestra da 150" -> { "action": "draw", "target": "window", "params": { "width": 150 } }
      - "offset 20 centimetri" -> { "action": "offset", "target": "selected", "params": { "offset": 20 } }
      - "crea parallela a 30 cm" -> { "action": "offset", "target": "selected", "params": { "offset": 30 } }
      - "spessore parete 20" -> { "action": "offset", "target": "selected", "params": { "offset": 20 } }
      - "copia" -> { "action": "copy", "target": "selected" }
      - "incolla" -> { "action": "paste", "target": "all" }

      Rispondi SOLO con il JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            action: {
              type: Type.STRING,
              enum: ["draw","delete","undo","clear","select","move","rotate","scale",
                     "save","load","layer_toggle","layer_add","layer_select",
                     "export_dxf","export_pdf","offset","copy","paste"]
            },
            target: {
              type: Type.STRING,
              enum: ["wall","line","dimension","angular_dimension","room","all","selected",
                     "layer","circle","polyline","freehand","text","door","window"]
            },
            params: {
              type: Type.OBJECT,
              properties: {
                length:    { type: Type.NUMBER },
                radius:    { type: Type.NUMBER },
                angle:     { type: Type.NUMBER },
                x:         { type: Type.NUMBER },
                y:         { type: Type.NUMBER },
                label:     { type: Type.STRING },
                layerName: { type: Type.STRING },
                offset:    { type: Type.NUMBER },
                width:     { type: Type.NUMBER },
                openAngle: { type: Type.NUMBER }
              }
            }
          },
          required: ["action", "target"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as Command;
  } catch (error) {
    console.error("Error parsing command:", error);
    return null;
  }
}
