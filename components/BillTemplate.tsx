// components/BillTemplate.tsx

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";

export interface BillData {
  invoiceNo: string;
  date: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  totalPrice: number;
  description: string;
  sellerName?: string;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  productImage?: string;
}

const BillTemplate: React.FC<{ data: BillData }> = ({ data }) => {
  const { user } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>("");

  const {
    invoiceNo,
    date,
    productName,
    quantity,
    totalPrice,
    description,
    sellerName = user?.name || "Unknown",
    shopName = "MS Traders",
    shopAddress = "Shop C15/C17, Quality Godown, Shershah",
    shopPhone = "Adnan +92 333 3424083",
    productImage,
  } = data;

  // Convert image to base64 when component mounts
  useEffect(() => {
    if (productImage && !imageError) {
      // Try to fetch and convert image to base64
      fetch(productImage)
        .then((response) => {
          if (!response.ok) throw new Error("Image fetch failed");
          return response.blob();
        })
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImageSrc(reader.result as string);
            setImageLoaded(true);
          };
          reader.readAsDataURL(blob);
        })
        .catch((err) => {
          console.error("Image load error:", err);
          setImageError(true);
        });
    }
  }, [productImage]);

  // Escape HTML special characters
  const escapeHtml = (str: string) => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const safeProductName = escapeHtml(productName);
  const safeDescription = escapeHtml(description);
  const safeSellerName = escapeHtml(sellerName);
  const safeShopName = escapeHtml(shopName);
  const safeShopAddress = escapeHtml(shopAddress);
  const safeShopPhone = escapeHtml(shopPhone);

  // Final image source (original or base64)
  const finalImageSrc = imageLoaded ? imageSrc : productImage;

  return (
    <div
      id="bill-content"
      style={{
        fontFamily: "Arial, sans-serif",
        margin: 0,
        padding: 0,
        background: "#fff",
      }}
    >
      <div
        style={{
          maxWidth: "500px",
          margin: "0 auto",
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: "10px",
          padding: "20px",
        }}
      >
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "2px solid #333",
            paddingBottom: "10px",
            marginBottom: "20px",
          }}
        >
          <div style={{ fontSize: "22px", fontWeight: "bold", margin: 0 }}>
            {safeShopName}
          </div>
          <div style={{ fontSize: "11px", color: "#666", margin: "5px 0" }}>
            {safeShopAddress}
          </div>
          <div style={{ fontSize: "11px", color: "#666", margin: "5px 0" }}>
            Phone: {safeShopPhone}
          </div>
          <div style={{ fontSize: "16px", marginTop: "10px" }}>
            SALES INVOICE
          </div>
        </div>

        {/* Invoice Details */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "20px",
            fontSize: "12px",
            background: "#f9f9f9",
            padding: "10px",
            borderRadius: "5px",
          }}
        >
          <div>
            <strong>Invoice No:</strong> {invoiceNo}
          </div>
          <div>
            <strong>Date:</strong> {date}
          </div>
        </div>

        {/* Product Image - will show only when loaded */}
        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <img
            src={`${finalImageSrc}`}
            alt={`${safeProductName}`}
            style={{
              maxWidth: "100px",
              maxHeight: "100px",
              objectFit: "cover",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
            crossOrigin={"anonymous"}
          />
        </div>

        {/* Product Table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "20px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  background: "#f0f0f0",
                  padding: "8px",
                  textAlign: "left",
                  fontSize: "12px",
                }}
              >
                Item
              </th>
              <th
                style={{
                  background: "#f0f0f0",
                  padding: "8px",
                  textAlign: "center",
                  fontSize: "12px",
                }}
              >
                Qty
              </th>
              <th
                style={{
                  background: "#f0f0f0",
                  padding: "8px",
                  textAlign: "right",
                  fontSize: "12px",
                }}
              >
                Total (PKR)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                style={{
                  padding: "8px",
                  borderBottom: "1px solid #eee",
                  fontSize: "12px",
                }}
              >
                {safeProductName}
              </td>
              <td
                style={{
                  padding: "8px",
                  borderBottom: "1px solid #eee",
                  fontSize: "12px",
                  textAlign: "center",
                }}
              >
                {quantity}
              </td>
              <td
                style={{
                  padding: "8px",
                  borderBottom: "1px solid #eee",
                  fontSize: "12px",
                  textAlign: "right",
                }}
              >
                {totalPrice.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Total */}
        <div
          style={{
            textAlign: "right",
            fontSize: "16px",
            fontWeight: "bold",
            marginBottom: "20px",
            paddingTop: "10px",
            borderTop: "1px solid #ddd",
          }}
        >
          Total Payable: PKR {totalPrice.toLocaleString()}
        </div>

        {/* Description */}
        {description && description !== "No description" && (
          <div
            style={{
              fontSize: "11px",
              color: "#666",
              borderTop: "1px dashed #ccc",
              paddingTop: "10px",
              marginBottom: "20px",
            }}
          >
            <strong>Description:</strong> {safeDescription}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "#888",
            borderTop: "1px solid #eee",
            paddingTop: "10px",
          }}
        >
          <p>Thank you for your purchase!</p>
          <p>Seller: {safeSellerName}</p>
        </div>
      </div>
    </div>
  );
};

export default BillTemplate;
