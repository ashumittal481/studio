"use server";

import {
  customizeChantAudioStyle,
  CustomizeChantAudioStyleInput,
  CustomizeChantAudioStyleOutput,
} from "@/ai/flows/customize-chant-audio-style";
import {
  transcribeAudio,
  TranscribeAudioInput,
} from "@/ai/flows/transcribe-audio-flow";

export async function getCustomVoice(input: CustomizeChantAudioStyleInput): Promise<{ success: true, data: CustomizeChantAudioStyleOutput } | { success: false, error: string }> {
  try {
    const result = await customizeChantAudioStyle(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error in getCustomVoice server action:", error);
    
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    
    return { success: false, error: `Failed to generate voice style: ${errorMessage}` };
  }
}

export async function getTranscript(input: TranscribeAudioInput) {
    try {
        const result = await transcribeAudio(input);
        return { success: true, data: result };
    } catch (error) {
        console.error("Error in getTranscript server action:", error);
        
        let errorMessage = "An unknown error occurred.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        
        return { success: false, error: `Failed to transcribe audio: ${errorMessage}` };
    }
}
