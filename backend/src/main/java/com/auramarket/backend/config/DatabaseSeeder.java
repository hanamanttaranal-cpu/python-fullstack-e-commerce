package com.auramarket.backend.config;

import com.auramarket.backend.model.Product;
import com.auramarket.backend.repository.ProductRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.util.Arrays;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final ProductRepository productRepository;

    public DatabaseSeeder(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (productRepository.count() == 0) {
            Product p1 = new Product();
            p1.setName("Chronos Gold Chronograph");
            p1.setPrice(new BigDecimal("299.99"));
            p1.setDescription("Exquisite golden watch with chronograph sub-dials, sapphire crystal face, and genuine leather strap. Designed for those who value timeless precision.");
            p1.setImage("https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?auto=format&fit=crop&q=80&w=600");
            p1.setCategory("Accessories");
            p1.setStock(15);
            p1.setRating(new BigDecimal("4.8"));
            p1.setFeatured(true);

            Product p2 = new Product();
            p2.setName("Acoustic Pro Headphones");
            p2.setPrice(new BigDecimal("189.99"));
            p2.setDescription("High-fidelity over-ear headphones with active hybrid noise cancellation, 40-hour battery life, and spatial audio support.");
            p2.setImage("https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600");
            p2.setCategory("Electronics");
            p2.setStock(25);
            p2.setRating(new BigDecimal("4.7"));
            p2.setFeatured(true);

            Product p3 = new Product();
            p3.setName("Suede Nomad Jacket");
            p3.setPrice(new BigDecimal("149.99"));
            p3.setDescription("Premium cognac suede utility jacket with weather-resistant lining, reinforced brass hardware, and dual interior utility pockets.");
            p3.setImage("https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=600");
            p3.setCategory("Apparel");
            p3.setStock(10);
            p3.setRating(new BigDecimal("4.6"));
            p3.setFeatured(false);

            Product p4 = new Product();
            p4.setName("Minimalist Leather Pack");
            p4.setPrice(new BigDecimal("120.00"));
            p4.setDescription("Waterproof full-grain leather backpack featuring a padded 16-inch laptop sleeve, hidden passport compartment, and luggage strap.");
            p4.setImage("https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=600");
            p4.setCategory("Accessories");
            p4.setStock(18);
            p4.setRating(new BigDecimal("4.9"));
            p4.setFeatured(true);

            Product p5 = new Product();
            p5.setName("Lumina Ceramic Diffuser");
            p5.setPrice(new BigDecimal("45.00"));
            p5.setDescription("Elegant hand-crafted matte ceramic essential oil ultrasonic diffuser with ambient warm LED light ring and automatic safety shut-off.");
            p5.setImage("https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600");
            p5.setCategory("Lifestyle");
            p5.setStock(40);
            p5.setRating(new BigDecimal("4.5"));
            p5.setFeatured(false);

            productRepository.saveAll(Arrays.asList(p1, p2, p3, p4, p5));
            System.out.println("MySQL catalog seeding completed successfully via Spring Boot!");
        } else {
            System.out.println("MySQL already has " + productRepository.count() + " products. Skipping seeding.");
        }
    }
}
