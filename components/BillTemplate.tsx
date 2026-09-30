// components/BillTemplate.tsx

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export interface BillProductItem {
  productName: string;
  quantity: number;
  salePrice: number;
  description: string;
  productDescription?: string;
  productImage?: string; // original URL
}

export interface BillData {
  invoiceNo: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerCity?: string;
  products?: BillProductItem[];
  totalAmount?: number;
  productName?: string;
  quantity?: number;
  totalPrice?: number;
  description?: string;
  productDescription?: string;
  productImage?: string;
  sellerName?: string;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  type?: string;
  repairSource?: "customer" | "defective";
  technicianOrVendor?: string;
  notes?: string;
}

const BillTemplate: React.FC<{ data: BillData }> = ({ data }) => {
  const { user } = useAuth();
  // Map: original image URL → base64 data URI
  const [imgBase64Map, setImgBase64Map] = useState<Record<string, string>>({});

  const {
    invoiceNo,
    date,
    sellerName = user?.name || "Unknown",
    shopName = "M S ELECTRIC AND ELECTRONICS",
    shopAddress = "Shop C15/C17, Quality Godown, Shershah",
    shopPhone = "Adnan +92 333 3424083",
  } = data;

  // Unify single and multi-product items list
  const items: BillProductItem[] = data.products?.length
    ? data.products
    : [
        {
          productName: data.productName || "Unknown Product",
          quantity: data.quantity || 0,
          salePrice: data.totalPrice || 0,
          description: data.description || "No description",
          productDescription: data.productDescription || "",
          productImage: data.productImage,
        },
      ];

  const grandTotal =
    data.totalAmount ||
    data.totalPrice ||
    items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0);
  const isCredit = data.type === "Credit";
  const isRepair = data.type === "Repair";
  const isCustomerRepair = isRepair && data.repairSource === "customer";

  // Extra customer lines, printed under the name — only what was filled in.
  const customerLines = [
    data.customerPhone,
    data.customerEmail,
    [data.customerAddress, data.customerCity].filter(Boolean).join(", "),
  ].filter(Boolean) as string[];

  const documentLabel = isCredit
    ? "CREDIT SALE RECEIPT"
    : isCustomerRepair
      ? "CUSTOMER REPAIR RECEIPT"
      : isRepair
        ? "REPAIR DISPATCH CHALLAN"
        : "SALES INVOICE";

  // Convert image URLs to base64 via fetch to avoid CORS issues
  useEffect(() => {
    const convertToBase64 = async (url: string): Promise<string> => {
      if (!url) return "";
      if (url.startsWith("data:")) return url;

      try {
        // Try direct fetch first
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve("");
          reader.readAsDataURL(blob);
        });
      } catch {
        // Try proxy as fallback
        try {
          const secureUrl = url.replace(/^http:/, "https:");
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(secureUrl)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) return "";
          const blob = await res.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve("");
            reader.readAsDataURL(blob);
          });
        } catch {
          return "";
        }
      }
    };

    items.forEach(async (item) => {
      const url = item.productImage;
      if (!url || imgBase64Map[url]) return;

      const base64 = await convertToBase64(url);
      if (base64) {
        setImgBase64Map((prev) => ({
          ...prev,
          [url]: base64,
        }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.products, data.productImage]);

  // Escape HTML
  const esc = (str: string) => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  return (
    <div
      id="bill-content"
      style={{
        fontFamily: "'Segoe UI', Arial, sans-serif",
        margin: 0,
        padding: "16px",
        background: "#f9fafb",
        minHeight: "auto",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <style>{`
        @media print {
          #bill-content {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
            min-height: auto !important;
            height: auto !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #bill-card-container {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
      <div
        id="bill-card-container"
        style={{
          maxWidth: "680px",
          width: "100%",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Watermark Background */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-45deg)",
            fontSize: "80px",
            fontWeight: "900",
            color: "rgba(0, 0, 0, 0.03)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
          }}
        >
          {isCredit ? "CREDIT" : isCustomerRepair ? "CUSTOMER REPAIR" : isRepair ? "REPAIR CHALLAN" : "SELL"}
        </div>

        {/* Inner Content */}
        <div style={{ padding: "28px 32px", position: "relative", zIndex: 1 }}>
          {/* Header */}
          <div
            style={{
              textAlign: "center",
              borderBottom: "2px solid #1f2937",
              paddingBottom: "16px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#111827",
                marginBottom: "4px",
              }}
            >
              {esc(shopName)}
            </div>
            <div
              style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0" }}
            >
              {esc(shopAddress)}
            </div>
            <div
              style={{ fontSize: "12px", color: "#6b7280", margin: "4px 0" }}
            >
              Phone: {esc(shopPhone)}
            </div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                letterSpacing: "3px",
                marginTop: "12px",
                color: isCustomerRepair ? "#2563eb" : isRepair ? "#d97706" : "#1f2937",
              }}
            >
              {documentLabel}
            </div>
          </div>

          {/* Invoice Details */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "24px",
              fontSize: "12px",
              background: "#f9fafb",
              padding: "12px 16px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontWeight: "700", color: "#111827", fontSize: "13px", marginBottom: "4px" }}>
                {isCustomerRepair
                  ? "Customer Details:"
                  : isRepair
                  ? "Repair Workshop / Vendor:"
                  : isCredit
                  ? "Customer (Credit):"
                  : "Billed To / Customer:"}
              </div>
              <div style={{ fontWeight: "600", color: "#1f2937", fontSize: "14px" }}>
                {data.customerName || (isRepair ? "Repair Vendor" : "Walk-in Customer")}
              </div>
              {data.customerPhone && (
                <div style={{ color: "#4b5563", marginTop: "2px" }}>Phone: {data.customerPhone}</div>
              )}
              {(data.customerAddress || data.customerCity) && (
                <div style={{ color: "#4b5563", marginTop: "2px" }}>
                  {[data.customerAddress, data.customerCity].filter(Boolean).join(", ")}
                </div>
              )}
              {isCustomerRepair && data.technicianOrVendor && (
                <div style={{ color: "#2563eb", fontWeight: "600", marginTop: "4px", fontSize: "11px" }}>
                  Assigned Workshop: {esc(data.technicianOrVendor)}
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div>
                <span style={{ fontWeight: "600", color: "#4b5563" }}>
                  {isRepair ? "Challan / Inv No:" : isCredit ? "Receipt No:" : "Invoice No:"}
                </span>{" "}
                <span style={{ color: "#111827", fontWeight: "700" }}>{invoiceNo}</span>
              </div>
              <div>
                <span style={{ fontWeight: "600", color: "#4b5563" }}>Date:</span>{" "}
                <span style={{ color: "#111827" }}>{date}</span>
              </div>
              {data.sellerName && (
                <div>
                  <span style={{ fontWeight: "600", color: "#4b5563" }}>Issued By:</span>{" "}
                  <span style={{ color: "#111827" }}>{data.sellerName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Table */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "24px",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "#f9fafb",
                  borderBottom: "2px solid #e5e7eb",
                }}
              >
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#4b5563",
                  }}
                >
                  {isRepair ? "Product & Defect / Instructions" : "Item"}
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#4b5563",
                    width: "60px",
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "right",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#4b5563",
                    width: "100px",
                  }}
                >
                  {isRepair ? "Est. Rate" : "Rate"}
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "right",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#4b5563",
                    width: "110px",
                  }}
                >
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const originalUrl = item.productImage || "";
                const imgSrc = imgBase64Map[originalUrl] || "";
                const lineTotal = (item.salePrice || 0) * (item.quantity || 1);

                return (
                  <tr key={idx}>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #f0f0f0",
                        verticalAlign: "middle",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        {/* Product image */}
                        {imgSrc ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "48px",
                              height: "48px",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              overflow: "hidden",
                              background: "#ffffff",
                              flexShrink: 0,
                            }}
                          >
                            <img
                              src={imgSrc}
                              alt={esc(item.productName)}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "48px",
                              height: "48px",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              background: "#f3f4f6",
                              color: "#9ca3af",
                              fontSize: "10px",
                              fontWeight: "500",
                              flexShrink: 0,
                            }}
                          >
                            No Image
                          </div>
                        )}

                        {/* Product text */}
                        <div style={{ flex: 1, marginLeft: "12px" }}>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "#111827",
                              fontSize: "13px",
                              marginBottom: "2px",
                            }}
                          >
                            {esc(item.productName)}
                          </div>
                          {item.description &&
                            item.description.trim() !== "" &&
                            item.description.trim() !== "No description" && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "#6b7280",
                                  marginTop: "2px",
                                }}
                              >
                                {esc(item.description)}
                              </div>
                            )}
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #f0f0f0",
                        textAlign: "center",
                        verticalAlign: "middle",
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#374151",
                      }}
                    >
                      {item.quantity}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #f0f0f0",
                        textAlign: "right",
                        verticalAlign: "middle",
                        fontWeight: "500",
                        fontSize: "12px",
                        color: "#4b5563",
                      }}
                    >
                      Rs. {item.salePrice.toLocaleString()}
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        borderBottom: "1px solid #f0f0f0",
                        textAlign: "right",
                        verticalAlign: "middle",
                        fontWeight: "700",
                        fontSize: "13px",
                        color: "#059669",
                      }}
                    >
                      Rs. {lineTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Notes / Terms if available */}
          {data.notes && (
            <div
              style={{
                marginBottom: "20px",
                padding: "10px 14px",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "11px",
                color: "#4b5563",
              }}
            >
              <strong style={{ color: "#111827" }}>
                {isRepair ? "Challan / Repair Notes:" : "Notes:"}{" "}
              </strong>
              <span>{esc(data.notes)}</span>
            </div>
          )}

          {/* Total & Customer Name */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "16px",
              borderTop: "2px solid #1f2937",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#374151",
                textAlign: "left",
              }}
            >
              <div>
                {isCustomerRepair ? "Customer:" : isRepair ? "Party / Workshop:" : "Customer:"}{" "}
                <span style={{ fontWeight: "700", color: "#111827" }}>
                  {esc(data.customerName || "Walk-in Customer")}
                </span>
              </div>
              {customerLines.map((line) => (
                <div
                  key={line}
                  style={{ fontSize: "12px", fontWeight: "500", color: "#4b5563", marginTop: "3px" }}
                >
                  {esc(line)}
                </div>
              ))}
            </div>
            <div
              style={{ fontSize: "18px", fontWeight: "700", color: "#111827", textAlign: "right" }}
            >
              {isCredit
                ? "Total Credit:"
                : isRepair
                ? "Total Estimated Charges:"
                : "Total Payable:"}{" "}
              <span style={{ color: "#059669" }}>
                PKR {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              textAlign: "center",
              fontSize: "11px",
              color: "#9ca3af",
              borderTop: "1px solid #e5e7eb",
              paddingTop: "16px",
            }}
          >
            <div style={{ marginBottom: "4px" }}>
              {isCredit
                ? "This receipt records items provided on credit."
                : isCustomerRepair
                ? "Please present this receipt when collecting your repaired item. Thank you!"
                : isRepair
                ? "Official Dispatch Challan for authorized repair workshop."
                : "Thank you for your purchase!"}
            </div>
            <div style={{ fontWeight: "500", color: "#6b7280" }}>
              {isRepair ? "Generated By" : "Seller"}: {esc(sellerName)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillTemplate;
