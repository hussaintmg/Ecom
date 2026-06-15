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
        padding: "20px",
        background: "#f9fafb",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          maxWidth: "650px",
          width: "100%",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          overflow: "hidden",
          position: "relative", // Needed for absolute positioning of watermark
        }}
      >
        {/* Watermark Background */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%) rotate(-45deg)",
            fontSize: "90px",
            fontWeight: "900",
            color: "rgba(0, 0, 0, 0.03)",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
          }}
        >
          {data.type === "Repair" ? "REPAIR" : "SELL"}
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
                color: "#1f2937",
              }}
            >
              {data.type === "Repair" ? "REPAIR INVOICE" : "SALES INVOICE"}
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
            }}
          >
            <div>
              <span style={{ fontWeight: "600", color: "#4b5563" }}>
                Invoice No:
              </span>{" "}
              <span style={{ color: "#111827" }}>{invoiceNo}</span>
            </div>
            <div>
              <span style={{ fontWeight: "600", color: "#4b5563" }}>Date:</span>{" "}
              <span style={{ color: "#111827" }}>{date}</span>
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
                  Item
                </th>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "center",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#4b5563",
                    width: "70px",
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
                    width: "120px",
                  }}
                >
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const originalUrl = item.productImage || "";
                const imgSrc = imgBase64Map[originalUrl] || "";

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
                              width: "50px",
                              height: "50px",
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
                              width: "50px",
                              height: "50px",
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
                              marginBottom: "4px",
                            }}
                          >
                            {esc(item.productName)}
                          </div>
                          {item.description &&
                            item.description.trim() !== "" &&
                            item.description.trim() !== "No description" && (
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "#9ca3af",
                                  marginTop: "2px",
                                }}
                              >
                                Desc: {esc(item.description)}
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
                        fontWeight: "500",
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
                        fontWeight: "600",
                        fontSize: "13px",
                        color: "#059669",
                      }}
                    >
                      Rs. {item.salePrice.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

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
              Customer: <span style={{ fontWeight: "700", color: "#111827" }}>{esc(data.customerName || "Walk-in Customer")}</span>
            </div>
            <div
              style={{ fontSize: "18px", fontWeight: "700", color: "#111827", textAlign: "right" }}
            >
              Total Payable:{" "}
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
              Thank you for your purchase!
            </div>
            <div style={{ fontWeight: "500", color: "#6b7280" }}>
              Seller: {esc(sellerName)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillTemplate;
