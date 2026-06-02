import React from "react";
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from "lucide-react";
import webData from "@/constants/webData.json";

const Footer = () => {
  return (
    <footer className="w-full border-t bg-background py-16">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="flex flex-col gap-4">
            <span className="text-2xl font-black tracking-tighter" suppressHydrationWarning>🛍️ {webData.websiteName}</span>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {webData.tagline}
            </p>
          </div>
          
          <div className="flex flex-col gap-4 text-sm">
            <h4 className="font-bold tracking-tight text-foreground/90 uppercase text-xs">Shop</h4>
            <ul className="flex flex-col gap-3 text-muted-foreground">
              <li><a href="/products" className="hover:text-primary transition-colors hover:translate-x-1 inline-block transform duration-200">All Products</a></li>
              <li><a href="/products?sort=newest" className="hover:text-primary transition-colors hover:translate-x-1 inline-block transform duration-200">New Arrivals</a></li>
              <li><a href="/categories" className="hover:text-primary transition-colors hover:translate-x-1 inline-block transform duration-200">Featured Categories</a></li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-4 text-sm">
            <h4 className="font-bold tracking-tight text-foreground/90 uppercase text-xs">Support</h4>
            <ul className="flex flex-col gap-3 text-muted-foreground">
              <li><a href="/shipping-returns" className="hover:text-primary transition-colors hover:translate-x-1 inline-block transform duration-200">Shipping & Returns</a></li>
              <li><a href="/contact" className="hover:text-primary transition-colors hover:translate-x-1 inline-block transform duration-200">Contact Us</a></li>
              <li><a href="/faq" className="hover:text-primary transition-colors hover:translate-x-1 inline-block transform duration-200">FAQ</a></li>
            </ul>
          </div>

          <div className="flex flex-col gap-4 text-sm">
            <h4 className="font-bold tracking-tight text-foreground/90 uppercase text-xs">Contact</h4>
            <ul className="flex flex-col gap-4 text-muted-foreground">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="shrink-0 text-primary/70 mt-0.5" />
                <span>{webData.address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone size={16} className="shrink-0 text-primary/70" />
                <a href={`tel:${webData.phone.replace(/[^0-9+]/g, '')}`} className="hover:text-primary transition-colors">{webData.phone}</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail size={16} className="shrink-0 text-primary/70" />
                <a href={`mailto:${webData.email}`} className="hover:text-primary transition-colors">{webData.email}</a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-16 border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {webData.copyright}</p>
          <div className="flex gap-4">
            <a href={webData.socials.facebook} target="_blank" rel="noreferrer" className="bg-accent/50 p-2 rounded-full hover:scale-110 transition-transform text-[#1877F2] hover:bg-[#1877F2]/10" aria-label="Facebook">
              <Facebook size={18} fill="currentColor" className="text-[#1877F2]"/>
            </a>
            <a href={webData.socials.twitter} target="_blank" rel="noreferrer" className="bg-accent/50 p-2 rounded-full hover:scale-110 transition-transform text-[#1DA1F2] hover:bg-[#1DA1F2]/10" aria-label="Twitter">
              <Twitter size={18} fill="currentColor" className="text-[#1DA1F2]"/>
            </a>
            <a href={webData.socials.instagram} target="_blank" rel="noreferrer" className="bg-accent/50 p-2 rounded-full hover:scale-110 transition-transform text-[#E1306C] hover:bg-[#E1306C]/10" aria-label="Instagram">
              <Instagram size={18} className="text-[#E1306C]"/>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
