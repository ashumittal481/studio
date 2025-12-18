'use server';

/**
 * @fileOverview This file defines a Genkit flow to customize the audio style of the auto-chant feature.
 *
 * The flow takes a desired audio style (e.g., mimicking a specific person's voice) as input
 * and returns the audio configuration suitable for the TTS service.
 *
 * - customizeChantAudioStyle - A function that handles the audio style customization process.
 * - CustomizeChantAudioStyleInput - The input type for the customizeChantAudioStyle function.
 * - CustomizeChantAudioStyleOutput - The return type for the customizeChantAudioStyle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CustomizeChantAudioStyleInputSchema = z.object({
  desiredStyle: z
    .string()
    .describe(
      'The desired audio style for the chant, e.g., the voice of a famous spiritual leader or a specific accent.'
    ),
});
export type CustomizeChantAudioStyleInput = z.infer<typeof CustomizeChantAudioStyleInputSchema>;

const CustomizeChantAudioStyleOutputSchema = z.object({
  voiceConfig: z.object({
    prebuiltVoiceConfig: z.object({
      voiceName: z.string().describe('The name of the voice to use for TTS.'),
      lang: z.string().describe('The IETF language tag for the voice (e.g., "en-US", "hi-IN").')
    }),
  }).describe('The voice configuration for the TTS service.'),
  feasibilityReasoning: z.string().optional().describe('Reasoning about the feasibility of the requested audio style.'),
});
export type CustomizeChantAudioStyleOutput = z.infer<typeof CustomizeChantAudioStyleOutputSchema>;

export async function customizeChantAudioStyle(input: CustomizeChantAudioStyleInput): Promise<CustomizeChantAudioStyleOutput> {
  return customizeChantAudioStyleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'customizeChantAudioStylePrompt',
  input: {schema: CustomizeChantAudioStyleInputSchema},
  output: {schema: CustomizeChantAudioStyleOutputSchema},
  prompt: `You are an AI that helps customize the audio style for a chanting application.

The user wants to customize the audio style to: {{{desiredStyle}}}

Your goal is to select a TTS voice that sounds realistic, smooth, and musical, not AI-generated.
If the user mentions a specific person (like "Premanand Maharaj Ji") or a style (like "Indian female voice"), try to find a voice that captures the essence of their speaking style - calm, devotional, and with a gentle rhythm.

First, determine the language of the desired style. Then, determine a suitable voice configuration for the TTS service, setting the 'voiceName' and 'lang' code appropriately from the valid options. For example, if the user asks for a Hindi voice, you must select a 'voiceName' that supports Hindi and set the 'lang' to 'hi-IN'.

Consider the feasibility of mimicking the requested style. If it's difficult or impossible to accurately mimic with the available voices, explain why in the feasibilityReasoning field. For example, you cannot perfectly replicate a specific person's voice, but you can choose a voice with similar characteristics.

Output the voice configuration as a JSON object. Make sure that voiceName is a valid option for the detected language.

Here are some valid voiceName and lang values:
- English (en-US): Algenib, Achernar, en-US-Wavenet-A, en-US-Wavenet-D
- Hindi (hi-IN): hi-IN-Wavenet-A, hi-IN-Wavenet-B, hi-IN-Wavenet-C, hi-IN-Wavenet-D

If the desiredStyle is something that cannot be done using only voiceName, explain in feasibilityReasoning why it is not possible.
`,
});

const customizeChantAudioStyleFlow = ai.defineFlow(
  {
    name: 'customizeChantAudioStyleFlow',
    inputSchema: CustomizeChantAudioStyleInputSchema,
    outputSchema: CustomizeChantAudioStyleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
