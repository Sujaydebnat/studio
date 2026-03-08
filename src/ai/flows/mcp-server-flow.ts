'use server';
/**
 * @fileOverview Master Control Portal (MCP) AI Server Flow.
 * This flow acts as a global management hub for Super Admins to monitor the whole system.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MCPInputSchema = z.object({
  query: z.string().describe('The command or question from the Super Admin.'),
  systemStats: z.object({
    activeShops: z.number(),
    totalOrders: z.number(),
    systemHealth: z.string(),
  }),
});

const MCPOutputSchema = z.object({
  analysis: z.string().describe('Detailed system analysis or response.'),
  alerts: z.array(z.string()).describe('Critical alerts or warnings detected.'),
  recommendations: z.array(z.string()).describe('Actionable items for the global admin.'),
  securityScore: z.number().min(0).max(100).describe('Current system security posture score.'),
});

export type MCPOutput = z.infer<typeof MCPOutputSchema>;

export async function masterControlPortal(input: z.infer<typeof MCPInputSchema>): Promise<MCPOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `You are the Master Control Portal (MCP) AI for the PrintFlow multi-tenant platform.
    
    Current System State:
    - Active Shops: ${input.systemStats.activeShops}
    - Total Global Orders: ${input.systemStats.totalOrders}
    - Reported Health: ${input.systemStats.systemHealth}
    
    Super Admin Query: "${input.query}"
    
    Provide a comprehensive management response including security analysis and growth recommendations. 
    Maintain a professional, authoritative, and helpful tone.`,
    output: { schema: MCPOutputSchema },
  });
  
  return output!;
}
