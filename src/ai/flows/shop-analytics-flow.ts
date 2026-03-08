'use server';
/**
 * @fileOverview AI Flow for generating shop performance insights.
 *
 * - getShopInsights - Generates analytics and suggestions for a shop owner.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ShopInsightsInputSchema = z.object({
  shopName: z.string(),
  orderStats: z.object({
    totalOrders: z.number(),
    completedOrders: z.number(),
    pendingOrders: z.number(),
  }),
  recentKeywords: z.string().describe('Keywords from recent orders to identify trends.'),
});

const ShopInsightsOutputSchema = z.object({
  summary: z.string().describe('A high-level summary of the shop performance.'),
  trends: z.array(z.string()).describe('List of current printing/design trends detected.'),
  suggestions: z.array(z.string()).describe('Actionable business growth suggestions.'),
  efficiencyScore: z.number().min(0).max(100).describe('Score based on order completion rate.'),
});

export type ShopInsightsOutput = z.infer<typeof ShopInsightsOutputSchema>;

export async function getShopInsights(input: z.infer<typeof ShopInsightsInputSchema>): Promise<ShopInsightsOutput> {
  const { output } = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: `You are an expert business consultant for a printing and design shop called "${input.shopName}".
    
    Based on the following data, provide a performance report and suggestions:
    - Total Orders: ${input.orderStats.totalOrders}
    - Completed: ${input.orderStats.completedOrders}
    - Pending: ${input.orderStats.pendingOrders}
    - Recent Trends/Keywords: ${input.recentKeywords}
    
    Analyze the efficiency and suggest how to grow the business.
    Return the response in structured JSON format as per the specified schema.`,
    output: { schema: ShopInsightsOutputSchema },
  });
  
  return output!;
}