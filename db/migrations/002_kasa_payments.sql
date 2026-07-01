-- Adds Kasa payment-gateway support to the Payment table.
-- Safe to run any time: Invoice and Payment are additive-only here, no data loss.

ALTER TABLE Payment
  MODIFY COLUMN PaymentMethod ENUM('Cash','Card','GCash','Maya','QR Ph','Bank Transfer') NOT NULL,
  ADD COLUMN KasaPaymentId VARCHAR(64) DEFAULT NULL,
  ADD COLUMN Status ENUM('requires_payment_method','processing','succeeded','failed','cancelled','refunded','partially_refunded')
    NOT NULL DEFAULT 'succeeded',
  ADD COLUMN RefundedAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  ADD UNIQUE KEY uq_payment_kasa_id (KasaPaymentId);
