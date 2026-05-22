// components/BillTemplate.tsx
import React from "react";
import { useAuth } from "@/context/AuthContext";
export interface BillData {
  invoiceNo: string;
  date: string;
  productName: string;
  quantity: number;
  unitPrice?: number; // optional, if you have it
  totalPrice: number;
  description: string;
  sellerName?: string;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
}

const BillTemplate: React.FC<{ data: BillData }> = ({ data }) => {
  const { user } = useAuth();
  const {
    invoiceNo,
    date,
    productName,
    quantity,
    totalPrice,
    description,
    sellerName = user?.name,
    shopName = "MS Traders",
    shopAddress = "Shop C15/C17, Quality Godown, Shershah",
    shopPhone = "+92 333 3424083",
  } = data;

  return (
    <div
      id="bill-content"
      style={{
        fontFamily: "Arial, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px",
        background: "#fff",
        color: "#000",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          marginBottom: "20px",
          borderBottom: "2px solid #333",
          paddingBottom: "10px",
        }}
      >
        <h2 style={{ margin: 0 }}>{shopName}</h2>
        <p style={{ margin: "5px 0", fontSize: "12px", color: "#555" }}>
          {shopAddress}
        </p>
        <p style={{ margin: "5px 0", fontSize: "12px", color: "#555" }}>
          Phone: {shopPhone}
        </p>
        <h3 style={{ margin: "10px 0 0" }}>SALES INVOICE</h3>
      </div>

      {/* Invoice Details */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
          fontSize: "14px",
        }}
      >
        <div>
          <strong>Invoice No:</strong> {invoiceNo}
        </div>
        <div>
          <strong>Date:</strong> {date}
        </div>
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
          <tr
            style={{
              backgroundColor: "#f2f2f2",
              borderBottom: "1px solid #ddd",
            }}
          >
            <th style={{ padding: "8px", textAlign: "left" }}>Item</th>
            <th style={{ padding: "8px", textAlign: "right" }}>Qty</th>
            <th style={{ padding: "8px", textAlign: "right" }}>Total (PKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: "1px solid #eee" }}>
            <td style={{ padding: "8px", textAlign: "left" }}>{productName}</td>
            <td style={{ padding: "8px", textAlign: "right" }}>{quantity}</td>
            <td style={{ padding: "8px", textAlign: "right" }}>
              {totalPrice.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Total */}
      <div
        style={{
          textAlign: "right",
          marginBottom: "20px",
          fontSize: "18px",
          fontWeight: "bold",
          borderTop: "1px solid #ddd",
          paddingTop: "10px",
        }}
      >
        Total Amount: PKR {totalPrice.toLocaleString()}
      </div>

      {/* Description */}
      {description && (
        <div
          style={{
            marginBottom: "20px",
            fontSize: "12px",
            color: "#555",
            borderTop: "1px dashed #ccc",
            paddingTop: "10px",
          }}
        >
          <strong>Memo:</strong> {description}
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          fontSize: "12px",
          color: "#888",
          marginTop: "20px",
          borderTop: "1px solid #ddd",
          paddingTop: "10px",
        }}
      >
        <p>Thank you for your purchase!</p>
        <p>Seller: {sellerName}</p>
      </div>
    </div>
  );
};

export default BillTemplate;
