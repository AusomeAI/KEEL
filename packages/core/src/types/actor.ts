/**
 * Actor type — represents who is performing an action
 *
 * Enforces Law 10: Agents hold per-agent identities with short-lived scoped tokens.
 * Never shared service accounts or static credentials.
 */

import { z } from "zod";

export const ActorKindSchema = z.enum(["HUMAN", "AGENT"]);
export type ActorKind = z.infer<typeof ActorKindSchema>;

export const ActorSchema = z.object({
  kind: ActorKindSchema.describe("Whether this actor is a human or an agent"),
  id: z.string().uuid().describe("The actor's unique identity (UUID)"),
  email: z
    .string()
    .email()
    .optional()
    .describe("Email address (for humans)"),
  onBehalfOf: z
    .string()
    .uuid()
    .optional()
    .describe("If set, this actor is acting on behalf of another identity (agent delegated by human)"),
  agentToken: z
    .string()
    .optional()
    .describe("Short-lived scoped token for agents (Law 10)"),
  approvedByActorId: z
    .string()
    .uuid()
    .optional()
    .describe("If set, this transaction was approved by this actor (approval chain)"),
});

export type Actor = z.infer<typeof ActorSchema>;

/**
 * Create a human actor
 */
export function human(id: string, onBehalfOf?: string): Actor {
  return {
    kind: "HUMAN",
    id,
    onBehalfOf,
  };
}

/**
 * Create an agent actor
 */
export function agent(id: string, onBehalfOf?: string): Actor {
  return {
    kind: "AGENT",
    id,
    onBehalfOf,
  };
}
