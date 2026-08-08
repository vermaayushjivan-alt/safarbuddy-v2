export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    cfOrderId: varchar("cf_order_id", { length: 100 }).notNull(),
    cfPaymentId: varchar("cf_payment_id", { length: 100 }),
    paymentSessionId: text("payment_session_id"),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    status: varchar("status", { length: 30 }).notNull().default("initiated"), // initiated | processing | paid | failed | flagged
    cfPaymentStatus: varchar("cf_payment_status", { length: 50 }),
    paymentMethod: varchar("payment_method", { length: 50 }),
    failureReason: text("failure_reason"),
    initiatedAt: timestamp("initiated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => ({
    bookingIdx: index("payments_booking_id_idx").on(table.bookingId),
    userIdx: index("payments_user_id_idx").on(table.userId),
    statusIdx: index("payments_status_idx").on(table.status),
    cfOrderIdIdx: index("payments_cf_order_id_idx").on(table.cfOrderId),
    cfPaymentIdIdx: index("payments_cf_payment_id_idx").on(table.cfPaymentId),
    cfOrderIdUnique: uniqueIndex("payments_cf_order_id_unique").on(
      table.cfOrderId
    ),
  })
);

export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;

export type PaymentStatus =
  | "initiated"
  | "processing"
  | "paid"
  | "failed"
  | "flagged";
