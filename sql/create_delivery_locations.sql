-- Creates a table for storing delivery location updates for each order.
-- This script is safe to run multiple times because it uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS delivery_locations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_delivery_locations_order_id (order_id),
  KEY idx_delivery_locations_updated_at (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Foreign key note:
-- Add the line below only if you have a MySQL orders table with a matching primary key.
-- For example, if orders.id is an INT UNSIGNED primary key, you can uncomment this:
--
-- ALTER TABLE delivery_locations
--   ADD CONSTRAINT fk_delivery_locations_order
--   FOREIGN KEY (order_id) REFERENCES orders(id)
--   ON DELETE CASCADE
--   ON UPDATE CASCADE;

-- Why the indexes matter:
-- 1) idx_delivery_locations_order_id speeds up lookups for a specific order.
-- 2) idx_delivery_locations_updated_at helps when sorting or filtering by the latest updates.