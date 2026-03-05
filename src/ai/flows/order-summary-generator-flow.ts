'use server';
/**
 * @fileOverview An AI agent that generates a concise summary of customer order details.
 *
 * - generateOrderSummary - A function that handles the order summary generation process.
 * - OrderSummaryGeneratorInput - The input type for the generateOrderSummary function.
 * - OrderSummaryGeneratorOutput - The return type for the generateOrderSummary function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OrderSummaryGeneratorInputSchema = z.object({
  customerOrderDescription: z
    .string()
    .describe(
      'A verbose or free-form text description of the customer\'s order needs.'
    ),
});
export type OrderSummaryGeneratorInput = z.infer<
  typeof OrderSummaryGeneratorInputSchema
>;

const OrderSummaryGeneratorOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise summary of the key requirements and details extracted from the customer\'s order description.'
    ),
});
export type OrderSummaryGeneratorOutput = z.infer<
  typeof OrderSummaryGeneratorOutputSchema
>;

export async function generateOrderSummary(
  input: OrderSummaryGeneratorInput
): Promise<OrderSummaryGeneratorOutput> {
  return orderSummaryGeneratorFlow(input);
}

const orderSummaryGeneratorPrompt = ai.definePrompt({
  name: 'orderSummaryGeneratorPrompt',
  input: { schema: OrderSummaryGeneratorInputSchema },
  output: { schema: OrderSummaryGeneratorOutputSchema },
  prompt: `You are an AI assistant for a printing and design shop.
Your task is to take a customer's detailed order description and summarize it into a concise list of key requirements and details. Focus on extracting actionable information relevant to designing and printing the order.

Customer Order Description: """{{{customerOrderDescription}}}"""

Provide the summary in a clear and easy-to-read format.`,
});

const orderSummaryGeneratorFlow = ai.defineFlow(
  {
    name: 'orderSummaryGeneratorFlow',
    inputSchema: OrderSummaryGeneratorInputSchema,
    outputSchema: OrderSummaryGeneratorOutputSchema,
  },
  async (input) => {
    const { output } = await orderSummaryGeneratorPrompt(input);
    return output!;
  }
);
