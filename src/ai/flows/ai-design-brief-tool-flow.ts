'use server';
/**
 * @fileOverview This file provides an AI tool to generate detailed design brief suggestions based on project type and keywords.
 *
 * - aiDesignBriefTool - A function that handles the AI design brief generation process.
 * - AIDesignBriefToolInput - The input type for the aiDesignBriefTool function.
 * - AIDesignBriefToolOutput - The return type for the aiDesignBriefTool function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIDesignBriefToolInputSchema = z.object({
  projectType: z
    .string()
    .describe(
      'The type of design project (e.g., Banner, Visiting Card, Poster, Flex Print, Logo Design, Social Media Graphic).'+
      'This field is crucial for tailoring the design brief suggestion.'
    ),
  keywords: z
    .string()
    .describe(
      'Keywords or key phrases describing the client\'s business, brand, and specific requirements for the design brief. ' +
        'This helps in generating a more relevant and detailed brief. Provide a comma-separated list of keywords.'
    ),
});
export type AIDesignBriefToolInput = z.infer<typeof AIDesignBriefToolInputSchema>;

const AIDesignBriefToolOutputSchema = z.object({
  title: z.string().describe('A concise and descriptive title for the design brief.'),
  overview: z.string().describe('A brief overview and purpose of the design project.'),
  targetAudience: z.string().describe('Description of the primary target audience for this design.'),
  keyMessages: z
    .array(z.string())
    .describe('A list of core messages or information the design should convey.'),
  visualStyle: z
    .string()
    .describe('Suggested visual style, tone, and aesthetic (e.g., modern, classic, minimalist, vibrant).'),
  deliverables: z
    .array(z.string())
    .describe('A list of expected design deliverables (e.g., 3 concepts, final print-ready file, web-optimized images).'),
  callToAction: z.string().optional().describe('Any specific call to action the design should encourage.'),
  notes: z
    .string()
    .optional()
    .describe('Any additional important notes or considerations for the designer.'),
});
export type AIDesignBriefToolOutput = z.infer<typeof AIDesignBriefToolOutputSchema>;

export async function aiDesignBriefTool(input: AIDesignBriefToolInput): Promise<AIDesignBriefToolOutput> {
  return aiDesignBriefToolFlow(input);
}

const designBriefPrompt = ai.definePrompt({
  name: 'designBriefPrompt',
  input: { schema: AIDesignBriefToolInputSchema },
  output: { schema: AIDesignBriefToolOutputSchema },
  prompt: `You are an AI assistant specialized in creating detailed and structured design briefs for printing and design shops.
Your task is to generate a comprehensive design brief based on the provided project type and keywords.

Project Type: {{{projectType}}}
Keywords: {{{keywords}}}

Consider the project type and keywords to suggest a title, overview, target audience, key messages, visual style, deliverables, and any relevant call to action or notes.
The output should be a structured JSON object as per the output schema.
`,
});

const aiDesignBriefToolFlow = ai.defineFlow(
  {
    name: 'aiDesignBriefToolFlow',
    inputSchema: AIDesignBriefToolInputSchema,
    outputSchema: AIDesignBriefToolOutputSchema,
  },
  async (input) => {
    const { output } = await designBriefPrompt(input);
    return output!;
  }
);
