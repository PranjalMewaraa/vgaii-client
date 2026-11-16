-- Add full Google Maps URL to Client (preferred over derived place-id URL
-- when registering with the review-fetch service).
ALTER TABLE `Client` ADD COLUMN `googleMapsUrl` VARCHAR(1000) NULL;
