import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import config from '../../core/config';
import { PropertyService } from '../property/property.service';
import { PropertyAnalyticsService } from '../property/property-analytics.service';
import { LeaseService } from '../lease/lease.service';
import { RentReviewService } from '../rent-review/rent-review.service';
import { RentalIncomeService } from '../rental-income/rental-income.service';
import { InvoiceService } from '../invoice/invoice.service';
import { TenantService } from '../tenant/tenant.service';
import { ReminderService } from '../reminder/reminder.service';
import { PortfolioAnalyticsService } from '../portfolio/portfolio-analytics.service';
import { buildChatTools } from './chat.tools';
import { ChatMessageDto } from './chat.types';
import { getMaxListeners } from 'events';

// Caps how many tool<->model round trips one reply can take. A well-scoped question
// (even one touching several tools) resolves in 2-4; this is a backstop against the
// model looping, not a limit users should ever bump into.
const MAX_TOOL_ITERATIONS = 6;
const MAX_RESPONSE_TOKENS = 4096;

const SYSTEM_PROMPT = `You are the in-app assistant for Jarvis, a property/rental portfolio management app.

Scope: you answer questions ONLY about the current user's own property portfolio data in this app —
properties, leases, tenants, rent reviews, rental income, invoices/expenses, and the reminders feed.
Use the tools provided to look up real data before answering anything factual. If a question falls
outside that scope (general knowledge, other people/companies, unrelated advice), say plainly that
you can only help with questions about their property portfolio in this app.

Rules:
- Never guess, estimate, or infer a number or date that a tool could give you — call the tool first.
  If the tools genuinely don't have what's needed to answer, say so instead of guessing.
- You can only look things up. You cannot create, edit, or delete anything, and no such tool exists.
  If asked to change something, tell the user to do it in the app.
- Keep answers concise and concrete — lead with the actual figure/date, then a short explanation.
  Format money as AUD (e.g. $1,234) and dates as DD MMM YYYY.
- Never silently drop or approximate a count. When a tool result contains N items matching the
  question, account for all N — don't paraphrase down to "a few" or report only the most recent one.
  In particular, get_reminders items for unpaid/never-recorded rent can carry a hiddenEarlierCount
  field: if it's set and non-zero, the real backlog for that lease is bigger than the items shown —
  state the true total (shown + hiddenEarlierCount), don't just report the count of items you see.
- For any question about what's outstanding/unpaid/overdue across the portfolio (not scoped to one
  named period), call get_reminders fresh rather than reasoning from an earlier answer in this
  conversation — a prior reply may have been scoped to a narrower question and isn't a complete list.
- When a question spans multiple properties or a time range, prefer the summary/report tools
  (get_portfolio_summary, get_financial_year_report) over listing every row yourself.`;

export type ChatStreamEvent = { type: 'text'; text: string } | { type: 'done' } | { type: 'error'; message: string };

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly client: Anthropic;

  constructor(
    private readonly propertyService: PropertyService,
    private readonly propertyAnalyticsService: PropertyAnalyticsService,
    private readonly leaseService: LeaseService,
    private readonly rentReviewService: RentReviewService,
    private readonly rentalIncomeService: RentalIncomeService,
    private readonly invoiceService: InvoiceService,
    private readonly tenantService: TenantService,
    private readonly reminderService: ReminderService,
    private readonly portfolioAnalyticsService: PortfolioAnalyticsService,
  ) {
    this.client = new Anthropic({ apiKey: config.ai.anthropicApiKey });
  }

  async *streamChat(ownerId: string, message: string, history: ChatMessageDto[] = []): AsyncGenerator<ChatStreamEvent> {
    if (!config.ai.anthropicApiKey) {
      yield { type: 'error', message: 'AI chat is not configured yet — ANTHROPIC_API_KEY is missing on the server.' };
      return;
    }

    const tools = buildChatTools(ownerId, {
      propertyService: this.propertyService,
      propertyAnalyticsService: this.propertyAnalyticsService,
      leaseService: this.leaseService,
      rentReviewService: this.rentReviewService,
      rentalIncomeService: this.rentalIncomeService,
      invoiceService: this.invoiceService,
      tenantService: this.tenantService,
      reminderService: this.reminderService,
      portfolioAnalyticsService: this.portfolioAnalyticsService,
    });

    const toolsByName = new Map(tools.map((t) => [t.name, t]));
    const anthropicTools: Anthropic.Tool[] = tools.map(({ name, description, input_schema }) => ({
      name,
      description,
      input_schema,
    }));

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h): Anthropic.MessageParam => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    try {
      for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
        const stream = this.client.messages.stream({
          model: config.ai.chatModel,
          max_tokens: MAX_RESPONSE_TOKENS,
          system: SYSTEM_PROMPT,
          tools: anthropicTools,
          messages,
        });

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield { type: 'text', text: event.delta.text };
          }
        }

        const finalMessage = await stream.finalMessage();

        if (finalMessage.stop_reason !== 'tool_use') {
          if (finalMessage.stop_reason === 'max_tokens') {
            yield { type: 'text', text: '\n\n[Reply truncated — ask me to continue if you need more.]' };
          }
          break;
        }

        messages.push({ role: 'assistant', content: finalMessage.content });

        const toolUseBlocks = finalMessage.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use',
        );

        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolUseBlocks.map(async (block) => {
            const tool = toolsByName.get(block.name);
            if (!tool) {
              return { type: 'tool_result' as const, tool_use_id: block.id, content: `Unknown tool: ${block.name}`, is_error: true };
            }
            try {
              const result = await tool.run((block.input as Record<string, unknown>) ?? {});
              return { type: 'tool_result' as const, tool_use_id: block.id, content: JSON.stringify(result) };
            } catch (err) {
              this.logger.warn(`Tool ${block.name} failed: ${(err as Error).message}`);
              return {
                type: 'tool_result' as const,
                tool_use_id: block.id,
                content: `Tool failed: ${(err as Error).message}`,
                is_error: true,
              };
            }
          }),
        );

        messages.push({ role: 'user', content: toolResults });
      }

      yield { type: 'done' };
    } catch (err) {
      this.logger.error(`Chat stream failed: ${(err as Error).message}`, (err as Error).stack);
      yield { type: 'error', message: "Something went wrong talking to the assistant — please try again." };
    }
  }
}