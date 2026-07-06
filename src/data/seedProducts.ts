import { Product } from '../types';

export const SEED_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: "AeroGlide Mechanical Keyboard",
    description: "An ultra-low profile mechanical keyboard featuring linear red switches, premium anodized aluminum body, dynamic per-key RGB lighting, and dual wireless mode (2.4GHz / Bluetooth 5.1). Highly responsive for both gaming and heavy typing.",
    price: 149.99,
    category: "Tech & Gadgets",
    image: "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
    reviewCount: 34,
    stock: 25,
    featured: true
  },
  {
    name: "Zenith ANC Headphones",
    description: "Immersive over-ear wireless headphones with advanced Active Noise Cancellation, custom-tuned 40mm drivers, and an astonishing 45 hours of battery life on a single charge. Finished in slate gray memory-foam cushions for all-day listening comfort.",
    price: 249.99,
    category: "Audio & Acoustics",
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600",
    rating: 4.9,
    reviewCount: 112,
    stock: 15,
    featured: true
  },
  {
    name: "Solis Smart Desk Lamp",
    description: "An elegant, minimalist brass desk lamp featuring ambient color-temperature controls, automatic daylight sensors, and an integrated 15W Qi wireless charging base. Syncs effortlessly with smart home hubs.",
    price: 89.00,
    category: "Home & Living",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&q=80&w=600",
    rating: 4.6,
    reviewCount: 22,
    stock: 30,
    featured: false
  },
  {
    name: "Nomad Leather Backpack",
    description: "Handcrafted from full-grain vegetable-tanned Italian leather. Houses a dedicated padded sleeve for up to a 16-inch laptop, quick-access weather-proof compartments, and solid brass buckles. Grows in character with an organic patina over time.",
    price: 195.00,
    category: "Apparel & Style",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
    reviewCount: 45,
    stock: 12,
    featured: true
  },
  {
    name: "Pulse Fit Smartwatch",
    description: "Water-resistant health and fitness tracking smartwatch featuring a vibrant 1.4-inch AMOLED display, integrated GPS, continuous heart-rate tracking, sleep cycle analysis, and real-time oxygen saturation monitoring.",
    price: 129.50,
    category: "Tech & Gadgets",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600",
    rating: 4.5,
    reviewCount: 68,
    stock: 40,
    featured: false
  },
  {
    name: "Orbital Studio Microphone",
    description: "Professional-grade cardioid condenser USB microphone built for streaming, podcasting, and vocal recording. Employs a built-in heavy-duty shock mount, custom zero-latency headphone monitoring output, and instant mute control.",
    price: 119.00,
    category: "Audio & Acoustics",
    image: "https://images.unsplash.com/photo-1590608897129-79da98d15969?auto=format&fit=crop&q=80&w=600",
    rating: 4.7,
    reviewCount: 51,
    stock: 18,
    featured: false
  },
  {
    name: "Terra Ceramic Coffee Set",
    description: "A gorgeous pair of double-walled stoneware mugs paired with a matching slow-drip ceramic filter cone. Finished in an elegant textured volcanic black glaze, perfect for slow-brewing enthusiasts.",
    price: 59.99,
    category: "Home & Living",
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600",
    rating: 4.8,
    reviewCount: 19,
    stock: 50,
    featured: false
  },
  {
    name: "Vanguard Tech Bomber Jacket",
    description: "Waterproof, wind-resistant softshell utility jacket utilizing active heat-retention liners and discrete magnetic closures. Outfitted with multiple internal media pockets, secure RFID-blocking lining, and custom-styled rib collars.",
    price: 160.00,
    category: "Apparel & Style",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600",
    rating: 4.6,
    reviewCount: 29,
    stock: 8,
    featured: true
  }
];
