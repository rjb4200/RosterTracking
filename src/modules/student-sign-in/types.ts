import { z } from "zod";

export const recoveryCredentialTypeSchema = z.enum(["ffn", "kemsis"]);
export type RecoveryCredentialType = z.infer<
  typeof recoveryCredentialTypeSchema
>;

const stagedCredentialSchema = z.object({
  credentialTypeId: z.string().uuid(),
  code: z.string().trim().min(1).max(50),
  value: z.string().min(1).max(200),
});

const stagedFieldsSchema = z.record(
  z.string().trim().min(1).max(100),
  z.string().trim().min(1).max(500),
);

const regularParticipantSchema = z.object({
  kind: z.literal("regular"),
  studentId: z.string().uuid(),
  signInMethod: z.enum(["remembered_device", "current_phone", "recovery"]),
  profileConfirmed: z.boolean(),
  rememberedDeviceId: z.string().uuid().optional(),
  maskedCredentials: z
    .array(
      z.object({
        code: recoveryCredentialTypeSchema,
        maskedSuffix: z.string().trim().min(1).max(20),
      }),
    )
    .optional(),
  replacementPhone: z
    .string()
    .regex(/^\+1\d{10}$/)
    .optional(),
  fields: stagedFieldsSchema.default({}),
  credentials: z.array(stagedCredentialSchema).default([]),
});

const guestParticipantSchema = z.object({
  kind: z.literal("guest"),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  fields: stagedFieldsSchema.default({}),
  credentials: z.array(stagedCredentialSchema).default([]),
});

const newStudentParticipantSchema = z.object({
  kind: z.literal("new_student"),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z.string().regex(/^\+1\d{10}$/),
  fields: stagedFieldsSchema.default({}),
  credentials: z.array(stagedCredentialSchema).default([]),
});

export const signInWorkflowStateSchema = z.object({
  participant: z
    .discriminatedUnion("kind", [
      regularParticipantSchema,
      guestParticipantSchema,
      newStudentParticipantSchema,
    ])
    .nullable()
    .default(null),
  selectedAgencyId: z.string().uuid().nullable().default(null),
  pendingNewPhone: z
    .string()
    .regex(/^\+1\d{10}$/)
    .nullable()
    .default(null),
  requirementSets: z
    .array(
      z.object({
        id: z.string().uuid(),
        version: z.number().int().positive(),
      }),
    )
    .default([]),
});

export type SignInWorkflowState = z.infer<typeof signInWorkflowStateSchema>;
export type RegularWorkflowParticipant = z.infer<
  typeof regularParticipantSchema
>;
export type GuestWorkflowParticipant = z.infer<typeof guestParticipantSchema>;
export type NewStudentWorkflowParticipant = z.infer<
  typeof newStudentParticipantSchema
>;
export type StagedCredential = z.infer<typeof stagedCredentialSchema>;

export function emptySignInWorkflowState(): SignInWorkflowState {
  return signInWorkflowStateSchema.parse({});
}
