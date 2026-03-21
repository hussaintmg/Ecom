import React from "react";

const Footer = () => {
  return (
    <footer className="w-full border-t bg-background py-12">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <span className="text-xl font-bold tracking-tight">🛍️ ECOM</span>
            <p className="text-sm text-muted-foreground">
              Elevating your shopping experience with premium quality and seamless design.
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <h4 className="font-semibold px-2">Shop</h4>
            <ul className="flex flex-col gap-2 text-muted-foreground w-max">
              <li><a href="/products" className="hover:text-primary transition-colors px-2 rounded-md hover:bg-muted py-1 flex">All Products</a></li>
              <li><a href="/products?sort=newest" className="hover:text-primary transition-colors px-2 rounded-md hover:bg-muted py-1 flex">New Arrivals</a></li>
              <li><a href="/categories" className="hover:text-primary transition-colors px-2 rounded-md hover:bg-muted py-1 flex">Featured Categories</a></li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <h4 className="font-semibold px-2">Support</h4>
            <ul className="flex flex-col gap-2 text-muted-foreground w-max">
              <li><a href="/shipping-returns" className="hover:text-primary transition-colors px-2 rounded-md hover:bg-muted py-1 flex">Shipping & Returns</a></li>
              <li><a href="/contact" className="hover:text-primary transition-colors px-2 rounded-md hover:bg-muted py-1 flex">Contact Us</a></li>
            </ul>
          </div>
          <div className="flex flex-col gap-3 text-sm">
            <h4 className="font-semibold">Newsletter</h4>
            <div className="flex flex-col gap-2">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="rounded-md border bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                Subscribe
              </button>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} ECOM Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
