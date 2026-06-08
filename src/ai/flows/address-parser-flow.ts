'use server';
/**
 * @fileOverview An AI agent for parsing address information from a single line of text.
 *
 * - parseAddress - A function that handles the address parsing process.
 * - AddressParserInput - The input type for the parseAddress function.
 * - AddressParserOutput - The return type for the parseAddress function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AddressParserInputSchema = z.object({
  lineContent: z.string().describe('A single line of text from the uploaded TXT file containing business and address information.'),
});
export type AddressParserInput = z.infer<typeof AddressParserInputSchema>;

const AddressParserOutputSchema = z.object({
  businessName: z.string().describe('The name of the business or entity extracted from the line.'),
  fullAddress: z.string().describe('The complete address string extracted from the line, excluding the business name and district.'),
  district: z.string().describe('The extracted district, normalized to uppercase. Must be one of the supported districts.'),
  neighborhood: z.string().describe('The extracted neighborhood, normalized by removing 