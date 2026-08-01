import { isValidPhone } from "~/lib/utils/phone";

export type SectionKey =
  | "city"
  | "info"
  | "delivery"
  | "receiver"
  | "confirmation"
  | "comment";

export type SectionStatus = "empty" | "partial" | "filled" | "error";

export interface SectionStatusInput {
  city: string;
  name: string;
  email: string;
  phone: string;
  deliveryType: string;
  deliveryBranch: string;
  otherDeliveryService: string;
  selectedShowroomId: number | null;
  isSelfReceiver: boolean;
  receiverName: string;
  receiverPhone: string;
  callToConfirm: boolean;
  comment: string;
  fieldErrors: Record<string, string>;
  submitAttempted: boolean;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Computes the 4-state completeness for every checkout section.
 *
 * - empty:    nothing entered
 * - partial:  touched / partially filled but not complete
 * - filled:   complete and valid
 * - error:    validation failed (per-field blur errors, or submit attempted
 *             while the section is incomplete)
 *
 * Optional sections (confirmation, comment) are only ever "filled" or "empty".
 * Pure function: same input always yields the same output.
 */
export function getSectionStatuses(
  input: SectionStatusInput,
): Record<SectionKey, SectionStatus> {
  const {
    city,
    name,
    email,
    phone,
    deliveryType,
    deliveryBranch,
    otherDeliveryService,
    selectedShowroomId,
    isSelfReceiver,
    receiverName,
    receiverPhone,
    callToConfirm,
    comment,
    fieldErrors,
    submitAttempted,
  } = input;

  // city: only settable via combobox, so non-empty implies a selected ref.
  const cityFilled = city.trim() !== "";

  // info
  const infoComplete =
    name.trim().length >= 2 &&
    EMAIL_RE.test(email.trim()) &&
    isValidPhone(phone);
  const hasInfoError = Boolean(fieldErrors.name || fieldErrors.email || fieldErrors.phone);
  const hasInfoValue =
    name.trim() !== "" || email.trim() !== "" || phone.trim() !== "";

  // delivery
  const deliveryFilled =
    deliveryType === "pickup"
      ? selectedShowroomId !== null
      : (deliveryType !== "pickup" && deliveryBranch.trim().length > 0) ||
        (deliveryType === "other_courier" && otherDeliveryService.trim().length > 0);
  const hasDeliveryValue =
    deliveryType !== "pickup" ||
    deliveryBranch.trim() !== "" ||
    otherDeliveryService.trim() !== "" ||
    selectedShowroomId !== null;

  // receiver
  const receiverComplete = receiverName.trim() !== "" && isValidPhone(receiverPhone);
  const hasReceiverValue = receiverName.trim() !== "" || receiverPhone.trim() !== "";

  return {
    city: cityFilled ? "filled" : submitAttempted ? "error" : "empty",
    info: hasInfoError || (submitAttempted && !infoComplete)
      ? "error"
      : infoComplete
        ? "filled"
        : hasInfoValue
          ? "partial"
          : "empty",
    delivery: deliveryFilled
      ? "filled"
      : submitAttempted
        ? "error"
        : hasDeliveryValue
          ? "partial"
          : "empty",
    // isSelfReceiver delegates validity to the info section (own data), so it's always "filled" here.
    receiver: isSelfReceiver || receiverComplete
      ? "filled"
      : submitAttempted
        ? "error"
        : hasReceiverValue
          ? "partial"
          : "empty",
    confirmation: callToConfirm ? "filled" : "empty",
    comment: comment.trim() ? "filled" : "empty",
  };
}
