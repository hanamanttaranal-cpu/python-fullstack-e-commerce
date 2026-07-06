# Security Specification: E-Commerce Platform Firestore Rules

This document specifies the data invariants, threat model, and "Dirty Dozen" payload test cases to verify the integrity and security of the E-Commerce Platform's database.

## 1. Data Invariants

1. **User Profiling Security**:
   - Users can only read and write their own profile document (`users/{userId}`).
   - The email stored in the document must match the authenticated user's email.
   - Users cannot update their own account creation timestamps.

2. **Catalog Integrity**:
   - Anyone (authenticated or guest) can read products (`products/{productId}`).
   - Only authorized administrators can write, modify, or delete products.
   - All product prices, stock levels, and ratings must be non-negative.

3. **Cart Isolation**:
   - Only the owner of the cart can read or write to it (`carts/{userId}`).
   - The document key (`userId`) must exactly match `request.auth.uid`.

4. **Order Security**:
   - Users can read only their own orders (`orders/{orderId}`).
   - Users can create their own orders, but the `userId` in the payload must match `request.auth.uid`.
   - Users cannot modify or delete existing orders. Orders are immutable once created (terminal state locking for state progression if managed by admins, but fully immutable for normal users).
   - Timestamp of order creation must match `request.time`.

5. **Review Guidelines**:
   - Anyone can read reviews (`reviews/{reviewId}`).
   - Authenticated users can write a review. The `userId` must match `request.auth.uid`.
   - Users can edit or delete their own reviews.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads represent malicious requests designed to breach integrity. Our rules must successfully block these with `PERMISSION_DENIED`.

### Case 1: Identity Spoofing in User Profile
- **Path**: `users/attacker_uid`
- **Payload**: `{ "displayName": "Attacker", "email": "victim@example.com", "createdAt": "2026-07-06T00:00:00Z" }`
- **Context**: Attacker signs in as `attacker_uid` but sets the profile email to `victim@example.com` to impersonate them.
- **Expectation**: `PERMISSION_DENIED` (email must match auth token email).

### Case 2: Privilege Escalation in Profile Creation
- **Path**: `users/attacker_uid`
- **Payload**: `{ "displayName": "Attacker", "email": "attacker@example.com", "role": "admin", "createdAt": "2026-07-06T00:00:00Z" }`
- **Context**: Attacker tries to inject a `role: "admin"` field during registration.
- **Expectation**: `PERMISSION_DENIED` (no additional fields allowed beyond the strict schema).

### Case 3: Catalog Poisoning (Price Setting)
- **Path**: `products/new_macbook`
- **Payload**: `{ "name": "Free MacBook Pro", "price": -100, "stock": 100, "category": "Laptops", "image": "image.png", "rating": 5 }`
- **Context**: Normal authenticated user attempts to write a product with a negative price.
- **Expectation**: `PERMISSION_DENIED` (only admins can write products; type bounds failed).

### Case 4: Cart Hijacking
- **Path**: `carts/victim_uid`
- **Payload**: `{ "userId": "victim_uid", "items": [], "updatedAt": "2026-07-06T00:00:00Z" }`
- **Context**: Attacker tries to clear or read a victim's cart.
- **Expectation**: `PERMISSION_DENIED` (can only write/read when path parameter `{userId}` is equal to `request.auth.uid`).

### Case 5: Unbounded Cart Flooding (Denial of Wallet)
- **Path**: `carts/attacker_uid`
- **Payload**: `{ "userId": "attacker_uid", "items": [/* 10,000 dummy entries */], "updatedAt": "2026-07-06T00:00:00Z" }`
- **Context**: Attacker attempts to upload a massive array of items to drive up storage or retrieval costs.
- **Expectation**: `PERMISSION_DENIED` (array size must be strictly bounded).

### Case 6: Order Spoofing
- **Path**: `orders/stolen_order`
- **Payload**: `{ "userId": "victim_uid", "items": [], "shippingAddress": {}, "subtotal": 0, "tax": 0, "shipping": 0, "total": 0, "status": "Pending", "createdAt": "2026-07-06T00:00:00Z" }`
- **Context**: Attacker places an order but sets `userId` as `victim_uid` to charge them or link the order to them.
- **Expectation**: `PERMISSION_DENIED` (order `userId` field must match `request.auth.uid`).

### Case 7: Backdated Order Creation
- **Path**: `orders/backdated_order`
- **Payload**: `{ "userId": "attacker_uid", "items": [], "shippingAddress": {}, "subtotal": 100, "tax": 5, "shipping": 10, "total": 115, "status": "Pending", "createdAt": "2020-01-01T00:00:00Z" }`
- **Context**: Attacker sets `createdAt` to a historical date to skew metrics or exploit promo codes.
- **Expectation**: `PERMISSION_DENIED` (order `createdAt` must match `request.time`).

### Case 8: Order Status Tampering
- **Path**: `orders/existing_order_123`
- **Payload (Update)**: `{ "status": "Delivered" }`
- **Context**: Attacker attempts to update the status of their own pending order to "Delivered" to trigger fulfillment logic.
- **Expectation**: `PERMISSION_DENIED` (orders are fully immutable after creation for normal users, or status changes are restricted to admins).

### Case 9: Foreign Review Injection
- **Path**: `reviews/spam_review`
- **Payload**: `{ "productId": "p123", "userId": "victim_uid", "userName": "Fake Victim", "rating": 5, "comment": "Nice!", "createdAt": "2026-07-06T00:00:00Z" }`
- **Context**: Attacker writes a review on behalf of a victim's user ID.
- **Expectation**: `PERMISSION_DENIED` (review `userId` must equal `request.auth.uid`).

### Case 10: Review Rating Out of Bounds
- **Path**: `reviews/bad_rating`
- **Payload**: `{ "productId": "p123", "userId": "attacker_uid", "userName": "Attacker", "rating": 6, "comment": "Too good", "createdAt": "2026-07-06T00:00:00Z" }`
- **Context**: Attacker attempts to inject a rating of 6 out of 5.
- **Expectation**: `PERMISSION_DENIED` (rating must be between 1 and 5).

### Case 11: Product Price Hijack during Update
- **Path**: `products/macbook_pro`
- **Payload (Update)**: `{ "price": 1 }`
- **Context**: Attacker attempts a partial update on a product to change its price to $1.
- **Expectation**: `PERMISSION_DENIED` (only admins can write or modify products).

### Case 12: Anonymous User Write Attempts
- **Path**: `orders/anon_order`
- **Payload**: `{ "userId": "anon", "items": [], "shippingAddress": {}, "subtotal": 10, "tax": 1, "shipping": 0, "total": 11, "status": "Pending", "createdAt": "2026-07-06T00:00:00Z" }`
- **Context**: Unauthenticated user attempts to write to the `orders` collection directly.
- **Expectation**: `PERMISSION_DENIED` (must be signed in with a verified email).

---

## 3. Test Runner Specification

The firestore security rules are evaluated against these threat profiles.
We will deploy the rules and verify their logical gates in detail.
