// SafarBuddy — Drizzle ORM Schema
// DB-01 Core Foundation (roles, permissions, users, vendors, app_settings, otp_verifications)
//
// GLOBAL RULES followed (per DATABASE_BIBLE):
// - UUID primary keys via gen_random_uuid()
// - Soft delete via deleted_at (no hard delete)
// - snake_case column names
// - created_at / updated_at / deleted_at / created_by / updated_by on every table
// - Foreign keys + indexes
//
// AUTH RULE:
// - public.users.id === auth.users.id (Supabase auth uid). No auth_user_id /
//   supabase_uid / external_uid column is ever created. auth.uid() is used
//   directly wherever the current user needs to be referenced.

import {
  pgTable,
  uuid,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  integer,
  numeric,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* -------------------------------------------------------------------------- */
/* Shared audit columns                                                       */
/* -------------------------------------------------------------------------- */

const auditColumns = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
};

/* -------------------------------------------------------------------------- */
/* roles                                                                      */
/* -------------------------------------------------------------------------- */

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 50 }).notNull(), // admin | vendor | user
    label: varchar("label", { length: 100 }).notNull(),
    description: text("description"),
    ...auditColumns,
  },
  (table) => ({
    nameUnique: uniqueIndex("roles_name_unique").on(table.name),
  })
);

/* -------------------------------------------------------------------------- */
/* permissions                                                                */
/* -------------------------------------------------------------------------- */

export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: varchar("name", { length: 100 }).notNull(), // e.g. "bookings.read"
    label: varchar("label", { length: 150 }).notNull(),
    module: varchar("module", { length: 50 }).notNull(), // e.g. "bookings"
    ...auditColumns,
  },
  (table) => ({
    nameUnique: uniqueIndex("permissions_name_unique").on(table.name),
  })
);

/* -------------------------------------------------------------------------- */
/* role_permissions (junction)                                                */
/* -------------------------------------------------------------------------- */

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    ...auditColumns,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);

/* -------------------------------------------------------------------------- */
/* users  (public.users.id === auth.users.id, enforced at insert time)        */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(), // must equal auth.users.id — never generated locally
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    fullName: varchar("full_name", { length: 150 }),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").notNull().default(true),
    isEmailVerified: boolean("is_email_verified").notNull().default(false),
    isPhoneVerified: boolean("is_phone_verified").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(table.email),
    phoneIdx: index("users_phone_idx").on(table.phone),
  })
);

/* -------------------------------------------------------------------------- */
/* user_roles (junction)                                                      */
/* -------------------------------------------------------------------------- */

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    ...auditColumns,
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  })
);

/* -------------------------------------------------------------------------- */
/* vendors                                                                    */
/* -------------------------------------------------------------------------- */

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    businessName: varchar("business_name", { length: 200 }).notNull(),
    gstNumber: varchar("gst_number", { length: 20 }),
    isApproved: boolean("is_approved").notNull().default(false),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => ({
    userIdx: index("vendors_user_id_idx").on(table.userId),
  })
);

/* -------------------------------------------------------------------------- */
/* vendor_branches                                                            */
/* -------------------------------------------------------------------------- */

export const vendorBranches = pgTable(
  "vendor_branches",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    branchName: varchar("branch_name", { length: 150 }).notNull(),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
  },
  (table) => ({
    vendorIdx: index("vendor_branches_vendor_id_idx").on(table.vendorId),
  })
);

/* -------------------------------------------------------------------------- */
/* app_settings                                                               */
/* -------------------------------------------------------------------------- */

export const appSettings = pgTable(
  "app_settings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value").notNull(),
    ...auditColumns,
  },
  (table) => ({
    keyUnique: uniqueIndex("app_settings_key_unique").on(table.key),
  })
);

/* -------------------------------------------------------------------------- */
/* otp_verifications                                                          */
/* -------------------------------------------------------------------------- */

export const otpVerifications = pgTable(
  "otp_verifications",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    identifier: varchar("identifier", { length: 255 }).notNull(), // email or phone
    otpHash: text("otp_hash").notNull(),
    purpose: varchar("purpose", { length: 50 }).notNull(), // login | register | reset_password
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    ...auditColumns,
  },
  (table) => ({
    identifierIdx: index("otp_verifications_identifier_idx").on(
      table.identifier
    ),
  })
);

/* -------------------------------------------------------------------------- */
/* bookings (BOOKING-01)                                                      */
/*                                                                            */
/* NOTE on placement: unlike hotels/packages/destinations/offers (which are   */
/* "content" tables accessed directly via the Supabase client through        */
/* BaseRepository per DATABASE_BIBLE.md), `bookings` is defined here in       */
/* Drizzle per explicit BOOKING-01 approval. The repository layer            */
/* (BookingRepository) still uses the same BaseRepository + hand-written     */
/* BookingRecord interface pattern as HotelRepository/PackageRepository —    */
/* this Drizzle definition exists as the schema source of truth / migration  */
/* reference only, matching the SQL in                                      */
/* src/db/sql/003_booking01_schema.sql.                                      */
/*                                                                            */
/* hotel_id / package_id reference tables (hotels, packages) that are not    */
/* part of the Drizzle schema, so no drizzle .references() is declared for   */
/* those two columns — the FK constraint itself is created in raw SQL        */
/* (003_booking01_schema.sql), consistent with hotels/packages living        */
/* outside Drizzle's managed schema.                                         */
/* -------------------------------------------------------------------------- */

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    bookingType: varchar("booking_type", { length: 20 }).notNull(), // 'hotel' | 'package'
    hotelId: uuid("hotel_id"), // FK -> public.hotels.id (raw SQL), nullable
    packageId: uuid("package_id"), // FK -> public.packages.id (raw SQL), nullable
    checkInDate: date("check_in_date"),
    checkOutDate: date("check_out_date"),
    travelDate: date("travel_date"),
    numGuests: integer("num_guests").notNull().default(1),
    priceSnapshot: numeric("price_snapshot", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("INR"),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending | confirmed | cancelled | completed
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    ...auditColumns,
  },
  (table) => ({
    userIdx: index("bookings_user_id_idx").on(table.userId),
    hotelIdx: index("bookings_hotel_id_idx").on(table.hotelId),
    packageIdx: index("bookings_package_id_idx").on(table.packageId),
    statusIdx: index("bookings_status_idx").on(table.status),
  })
);

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;

export type BookingType = "hotel" | "package";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

/* -------------------------------------------------------------------------- */
/* Relations                                                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many, one }) => ({
  userRoles: many(userRoles),
  vendor: one(vendors, {
    fields: [users.id],
    references: [vendors.userId],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  userRoles: many(userRoles),
  rolePermissions: many(rolePermissions),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({ one }) => ({
    role: one(roles, {
      fields: [rolePermissions.roleId],
      references: [roles.id],
    }),
    permission: one(permissions, {
      fields: [rolePermissions.permissionId],
      references: [permissions.id],
    }),
  })
);

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  user: one(users, {
    fields: [vendors.userId],
    references: [users.id],
  }),
  branches: many(vendorBranches),
}));

export const vendorBranchesRelations = relations(
  vendorBranches,
  ({ one }) => ({
    vendor: one(vendors, {
      fields: [vendorBranches.vendorId],
      references: [vendors.id],
    }),
  })
);

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;

export type VendorBranch = typeof vendorBranches.$inferSelect;
export type NewVendorBranch = typeof vendorBranches.$inferInsert;

export type AppSetting = typeof appSettings.$inferSelect;
export type OtpVerification = typeof otpVerifications.$inferSelect;

export type AppRole =
  | "admin"
  | "vendor"
  | "user" // Customer account type — see 002_role_seed_auth05.sql note.
  | "hotel_owner"
  | "travel_agent"
  | "super_admin";
