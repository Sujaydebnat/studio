'use server';
/**
 * @fileOverview A Genkit flow for drafting clear, professional order update messages or responses for customers.
 *
 * - orderUpdateMessageDrafting - A function that handles the message drafting process.
 * - OrderUpdateMessageDraftingInput - The input type for the orderUpdateMessageDrafting function.
 * - OrderUpdateMessageDraftingOutput - The return type for the orderUpdateMessageDrafting function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OrderHistoryEntrySchema = z.object({
  status: z.string().describe('The status of the order at this point in time.'),
  timestamp: z.string().describe('The timestamp of the status change (e.g., ISO 8601 format).'),
  description: z.string().describe('A brief description of the activity during this status.'),
});

const OrderUpdateMessageDraftingInputSchema = z.object({
  orderId: z.string().describe('The unique identifier for the order.'),
  currentStatus: z.string().describe('The current status of the order (e.g., Pending, Designing, Printing, Completed).'),
  orderHistory: z.array(OrderHistoryEntrySchema).optional().describe('An optional chronological history of status changes and descriptions for the order.'),
  customerInquiry: z.string().optional().describe('Optional: The customer\u2019s specific inquiry text, if this message is a direct response.'),
  additionalContext: z.string().optional().describe('Optional: Any additional details or notes provided by the staff member.'),
  customerName: z.string().optional().describe('Optional: The name of the customer for personalization.'),
  projectName: z.string().optional().describe('Optional: The name or title of the printing/design project.'),
});
export type OrderUpdateMessageDraftingInput = z.infer<typeof OrderUpdateMessageDraftingInputSchema>;

const OrderUpdateMessageDraftingOutputSchema = z.object({
  draftedMessage: z.string().describe('A clear, professional, and concise update message or response drafted for the customer.'),
});
export type OrderUpdateMessageDraftingOutput = z.infer<typeof OrderUpdateMessageDraftingOutputSchema>;

export async function orderUpdateMessageDrafting(input: OrderUpdateMessageDraftingInput): Promise<OrderUpdateMessageDraftingOutput> {
  return orderUpdateMessageDraftingFlow(input);
}

const prompt = ai.definePrompt({
  name: 'orderUpdateMessageDraftingPrompt',
  input: {schema: OrderUpdateMessageDraftingInputSchema},
  output: {schema: OrderUpdateMessageDraftingOutputSchema},
  prompt: `You are an AI assistant specialized in drafting clear and professional order update messages for customers in a printing and design shop.
Your goal is to provide a concise and informative message based on the provided order details.

Here is the order information:
Order ID: {{{orderId}}}
Project Name: {{{projectName}}}
Current Status: {{{currentStatus}}}
Customer Name: {{{customerName}}}

{{#if orderHistory}}
Order History:
{{#each orderHistory}}
- Status: {{{this.status}}} at {{{this.timestamp}}}. Description: {{{this.description}}}
{{/each}}
{{else}}
No detailed order history provided.
{{/if}}

{{#if customerInquiry}}
Customer Inquiry: {{{customerInquiry}}}

Address the customer's inquiry directly while providing the status update.
{{/if}}

{{#if additionalContext}}
Additional Context: {{{additionalContext}}}
{{/if}}

Draft a professional and clear message to the customer. If a customer inquiry is provided, ensure the message directly addresses it. Otherwise, provide a proactive update. Make sure to use the customer's name if available.
`,
});

const orderUpdateMessageDraftingFlow = ai.defineFlow(
  {
    name: 'orderUpdateMessageDraftingFlow',
    inputSchema: OrderUpdateMessageDraftingInputSchema,
    outputSchema: OrderUpdateMessageDraftingOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('Failed to generate a drafted message.');
    }
    return output;
  }
);
