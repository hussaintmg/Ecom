import Hero from "@/components/landing/Hero";
import FeaturedProducts from "@/components/landing/FeaturedProducts";
import CategoriesPreview from "@/components/landing/CategoriesPreview";

export default function Home() {
  return (
    <main className="flex-1">
      {/* Large, visually appealing Hero section with animations */}
      <Hero />

      {/* Discount / Sales Banner with animations (Framer Motion) */}
      <section className="bg-primary py-12 text-center text-primary-foreground">
        <div className="container mx-auto px-4 md:px-8">
          <h3 className="text-2xl font-bold tracking-tight">
            🎉 Opening Season Sale! Up to 50% Off on Selected Items
          </h3>
          <p className="mt-2 text-sm text-primary-foreground/80">
            Offer valid till the end of this month. Don't miss out!
          </p>
        </div>
      </section>

      {/* Popular Products with SWR auto-refresh */}
      <FeaturedProducts />

      {/* Categories Preview with smooth scroll/scale animations */}
      <CategoriesPreview />
    </main>
  );
}
