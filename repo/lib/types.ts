export type Customer = {
  id: string;
  name: string;
  hospital_name: string;
  state: string | null;
  area: string | null;
  contact_person: string | null;
  created_at: string;
};

export type SalesRep = {
  id: string;
  name: string;
  code: string;
  email: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  supplier: string | null;
  unit_price: number;
  created_at: string;
};

/** A quote REQUEST. The quote document itself is produced in a separate system —
 *  the CRM tracks the request and how fast it is turned around. */
export type Quotation = {
  id: string;
  quote_number: string;
  customer_id: string | null;
  sales_rep_id: string | null;
  status: QuoteStatus;
  total_amount: number;
  discount_pct: number;
  received_at: string;
  in_progress_at: string | null;
  completed_at: string | null;
  sent_at: string | null;
  source: string;
  external_ref: string | null;
  hold_note: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  customers?: Pick<Customer, "name" | "hospital_name"> | null;
  sales_reps?: Pick<SalesRep, "name" | "code"> | null;
  /** Ops user who handled the request (embedded from user_profiles). */
  processed?: { name: string | null } | null;
};

export type QuoteDocument = {
  id: string;
  quotation_id: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type QuotationItem = {
  id: string;
  quotation_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  products?: Pick<Product, "name" | "sku"> | null;
};

export type PurchaseOrder = {
  id: string;
  po_number: string;
  quotation_id: string | null;
  customer_id: string | null;
  status: string;
  total_amount: number;
  delivery_due: string | null;
  delivered_at: string | null;
  created_at: string;
  customers?: Pick<Customer, "name" | "hospital_name"> | null;
};

export type PoItem = {
  id: string;
  po_id: string;
  product_id: string | null;
  quantity_ordered: number;
  quantity_delivered: number;
  unit_price: number;
  products?: Pick<Product, "name" | "sku"> | null;
};

export type QuoteStatus =
  | "received"
  | "in_progress"
  | "completed"
  | "sent_to_customer"
  | "on_hold_vendor"
  | "on_hold_sales_rep"
  | "on_hold_director"
  | "cancelled";

/** Ordered workflow shown in the UI. */
export const QUOTE_STATUSES: QuoteStatus[] = [
  "received",
  "in_progress",
  "completed",
  "sent_to_customer",
  "on_hold_vendor",
  "on_hold_sales_rep",
  "on_hold_director",
  "cancelled",
];

/** The happy path, used for the progress timeline. */
export const QUOTE_FLOW: QuoteStatus[] = [
  "received",
  "in_progress",
  "completed",
  "sent_to_customer",
];

export const ON_HOLD_STATUSES: QuoteStatus[] = [
  "on_hold_vendor",
  "on_hold_sales_rep",
  "on_hold_director",
];

export const OPEN_STATUSES: QuoteStatus[] = [
  "received",
  "in_progress",
  ...ON_HOLD_STATUSES,
];

export const PO_STATUSES = ["pending", "received", "partial", "delivered"] as const;
