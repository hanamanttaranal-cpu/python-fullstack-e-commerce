package com.auramarket.backend.controller;

import com.auramarket.backend.model.Order;
import com.auramarket.backend.model.OrderItem;
import com.auramarket.backend.model.Product;
import com.auramarket.backend.repository.OrderRepository;
import com.auramarket.backend.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class BackendController {

    private final ProductRepository productRepository;
    private final OrderRepository orderRepository;

    public BackendController(ProductRepository productRepository, OrderRepository orderRepository) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
    }

    @GetMapping("/")
    public Map<String, String> root() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "online");
        response.put("service", "AuraMarket Spring Boot API Backend");
        response.put("framework", "Spring Boot");
        response.put("database", "MySQL");
        return response;
    }

    @GetMapping("/api/products")
    public List<Product> getProducts(@RequestParam(required = false) String category) {
        if (category != null && !category.trim().isEmpty()) {
            return productRepository.findByCategory(category);
        }
        return productRepository.findAll();
    }

    @GetMapping("/api/products/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable Long id) {
        Optional<Product> product = productRepository.findById(id);
        return product.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).build());
    }

    @PostMapping("/api/products")
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        Product saved = productRepository.save(product);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping("/api/orders")
    public List<Order> getOrders(@RequestParam(required = false) String email) {
        if (email != null && !email.trim().isEmpty()) {
            return orderRepository.findByCustomerEmailOrderByCreatedAtDesc(email);
        }
        return orderRepository.findAllByOrderByCreatedAtDesc();
    }

    @PostMapping("/api/orders")
    public ResponseEntity<Order> createOrder(@RequestBody Order order) {
        // Set order back-reference on children to persist them correctly
        if (order.getItems() != null) {
            for (OrderItem item : order.getItems()) {
                item.setOrder(order);
                
                // Adjust stock if product exists
                try {
                    Long productId = Long.parseLong(item.getProductId());
                    Optional<Product> prodOpt = productRepository.findById(productId);
                    if (prodOpt.isPresent()) {
                        Product prod = prodOpt.get();
                        int newStock = Math.max(0, prod.getStock() - item.getQuantity());
                        prod.setStock(newStock);
                        productRepository.save(prod);
                    }
                } catch (NumberFormatException e) {
                    // Ignore non-numeric IDs
                }
            }
        }
        
        Order saved = orderRepository.save(order);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }
}
