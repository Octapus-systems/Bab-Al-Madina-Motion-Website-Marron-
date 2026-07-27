import { Loader2, Plus, ShoppingBasket, Check, Sparkles, Truck, ShieldCheck } from "lucide-react";
import { useCart } from "../lib/cart-context";
import { EggIcon } from "./EggIcon";

export function ProductsSection() {
  const { products, productsLoading, cart, addToCart } = useCart();

  return (
    <div id="products-section" data-products-section className="relative z-10 bg-[#faf6f0] py-24 px-6 md:px-12 border-t border-[#e8ddd0] overflow-hidden">
      {/* Decorative accents */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-[#8b1a1a]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        <div className="text-center mb-10">
          <p className="inline-flex items-center gap-2 border border-[#8b1a1a]/20 rounded-full px-4 py-1.5 text-[10px] md:text-xs tracking-[0.4em] uppercase text-[#8b1a1a] mb-6 bg-[#8b1a1a]/5">
            <Sparkles className="w-3 h-3" /> Our Products
          </p>
          <h2 className="font-serif text-4xl md:text-6xl text-[#1a1a1a] leading-[1.1] mb-4">
            Pick Your <span className="text-[#8b1a1a] italic">Fresh Eggs</span>
          </h2>
          <p className="text-lg text-[#555] max-w-xl mx-auto">
            Add what you need to your basket — checkout is right below.
          </p>
        </div>

        {/* Trust strip */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-16 text-sm text-[#666]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#8b1a1a]" /> Quality inspected
          </div>
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#8b1a1a]" /> Next-day delivery
          </div>
          <div className="flex items-center gap-2">
            <EggIcon className="w-4 h-4 text-[#8b1a1a]" /> Packed same day
          </div>
        </div>

        {productsLoading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-[#8b1a1a]" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24 text-[#999]">No products available right now — check back soon.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((p, i) => {
              const inCart = (cart[p.id] ?? 0) > 0;
              return (
                <div
                  key={p.id}
                  className="group relative bg-white rounded-3xl border border-[#e8ddd0] overflow-hidden shadow-[0_8px_30px_rgba(139,26,26,0.04)] hover:shadow-[0_20px_50px_rgba(139,26,26,0.15)] hover:-translate-y-1.5 transition-all duration-300"
                >
                  {i === 0 && (
                    <div className="absolute top-3 left-3 z-10 bg-[#d4af37] text-[#1a1a1a] text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full shadow-sm">
                      Bestseller
                    </div>
                  )}
                  <div className="aspect-square bg-[#f5efe6] relative overflow-hidden">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <EggIcon className="w-20 h-20 text-[#d4c3b3]" />
                      </div>
                    )}
                    {inCart && (
                      <div className="absolute top-3 right-3 bg-[#8b1a1a] text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                        <Check className="w-3 h-3" /> {cart[p.id]} in basket
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="p-6">
                    <h3 className="font-serif text-xl text-[#1a1a1a] mb-1">{p.name}</h3>
                    {p.pieces_per_carton > 1 && (
                      <p className="text-sm text-[#999] mb-3">{p.pieces_per_carton} pieces / tray</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <span className="font-bold text-2xl text-[#8b1a1a]">{p.unit_price_b2c} AED</span>
                      <button
                        onClick={() => addToCart(p.id)}
                        className="flex items-center gap-1.5 bg-[#1a1a1a] hover:bg-[#8b1a1a] text-white text-sm font-medium px-4 py-2.5 rounded-full transition-colors active:scale-95"
                      >
                        {inCart ? <ShoppingBasket className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {inCart ? "Add More" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
