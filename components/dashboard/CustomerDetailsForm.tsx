"use client";
import React from "react";
import { User, Phone, MapPin, Mail, Building2, StickyNote } from "lucide-react";

export interface CustomerFormValue {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  customerNote: string;
}

export const emptyCustomer: CustomerFormValue = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  customerCity: "",
  customerNote: "",
};

interface Props {
  value: CustomerFormValue;
  onChange: (next: CustomerFormValue) => void;
  /** Shown above the fields — defaults to "Customer Details". */
  title?: string;
  disabled?: boolean;
}

const inputClass =
  "w-full rounded-xl border bg-background pl-9 pr-3 py-2.5 text-sm outline-none " +
  "focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all " +
  "hover:border-primary/30";

const labelClass =
  "text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

const iconClass =
  "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none";

/**
 * The customer block shared by the Sell, Repair and Credit Sale screens.
 * Only the name is required — everything else is optional, so a quick
 * walk-in sale stays as fast as it was, while a regular customer can be
 * recorded properly and looked up later from the invoices table.
 */
const CustomerDetailsForm: React.FC<Props> = ({
  value,
  onChange,
  title = "Customer Details",
  disabled = false,
}) => {
  const set = (key: keyof CustomerFormValue) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => onChange({ ...value, [key]: e.target.value });

  return (
    <div className="rounded-2xl border bg-muted/20 p-4 flex flex-col gap-3 transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-sm flex items-center gap-1.5">
          <User size={14} className="text-primary" /> {title}
        </h4>
        <span className="text-[10px] text-muted-foreground">
          Only name is required
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Customer Name *</span>
          <div className="relative">
            <User className={iconClass} size={14} />
            <input
              type="text"
              className={inputClass}
              value={value.customerName}
              onChange={set("customerName")}
              disabled={disabled}
              required
              placeholder="e.g. Walk-in Customer / Client Name"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Phone Number</span>
          <div className="relative">
            <Phone className={iconClass} size={14} />
            <input
              type="tel"
              inputMode="tel"
              className={inputClass}
              value={value.customerPhone}
              onChange={set("customerPhone")}
              disabled={disabled}
              placeholder="e.g. 0300 1234567"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>City / Area</span>
          <div className="relative">
            <Building2 className={iconClass} size={14} />
            <input
              type="text"
              className={inputClass}
              value={value.customerCity}
              onChange={set("customerCity")}
              disabled={disabled}
              placeholder="e.g. Karachi"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Email</span>
          <div className="relative">
            <Mail className={iconClass} size={14} />
            <input
              type="email"
              className={inputClass}
              value={value.customerEmail}
              onChange={set("customerEmail")}
              disabled={disabled}
              placeholder="e.g. customer@email.com"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Address</span>
          <div className="relative">
            <MapPin className={iconClass} size={14} />
            <input
              type="text"
              className={inputClass}
              value={value.customerAddress}
              onChange={set("customerAddress")}
              disabled={disabled}
              placeholder="Shop / house address"
            />
          </div>
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2">
          <span className={labelClass}>Note</span>
          <div className="relative">
            <StickyNote className="absolute left-3 top-3 text-muted-foreground pointer-events-none" size={14} />
            <textarea
              className={`${inputClass} min-h-16 resize-y`}
              value={value.customerNote}
              onChange={set("customerNote")}
              disabled={disabled}
              placeholder="Anything worth remembering about this customer / order"
            />
          </div>
        </label>
      </div>
    </div>
  );
};

export default CustomerDetailsForm;
