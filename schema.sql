-- =============================================================================
-- Motiq — Full Database Schema (MariaDB)
-- =============================================================================
-- Consolidated, deployable schema for a fresh install. Represents the current
-- state of the database, including everything applied incrementally via
-- db/migrations/002_kasa_payments.sql, 003_customer_email.sql,
-- 004_car_brands.sql, 005_site_content.sql, and 006_site_content_cta_links.sql.
-- Use this file to stand up a
-- new database from scratch; db/migrations/ remains as historical record of
-- how the schema evolved.
--
-- Usage:
--   mariadb -u <user> -p < schema.sql
--
-- Multi-tenancy: Company is the tenant root. User, Customer, ServiceCatalog,
-- PartsInventory, and Appointment carry Company_ID directly; Vehicle,
-- RepairJob, Invoice, Payment, JobService, and JobParts are scoped
-- transitively through their parent row. CarBrand and SiteContent are global
-- reference/content tables, not tenant-scoped.
-- =============================================================================

-- Uncomment and adjust to create/select a database before running the rest
-- of this file (name should match your MYSQL_DATABASE env var):
-- CREATE DATABASE IF NOT EXISTS motiq CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
-- USE motiq;

SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- Company — tenant root. Human-readable Company_ID (e.g. MERCADOAUTO-A3F7K2PQ)
-- generated at registration, not auto-incrementing.
-- -----------------------------------------------------------------------------
CREATE TABLE Company (
  Company_ID            VARCHAR(30)   NOT NULL PRIMARY KEY,
  Name                  VARCHAR(150)  NOT NULL,
  Address                VARCHAR(255)  NULL,
  ContactNumber         VARCHAR(20)   NULL,
  Email                  VARCHAR(150)  NOT NULL,
  GarageType             VARCHAR(100)  NULL,
  NumberOfBays          INT           NULL,
  OpeningTime            TIME          NULL,
  ClosingTime             TIME          NULL,
  BusinessPermitNumber  VARCHAR(100)  NULL,
  DtiSecNumber            VARCHAR(100)  NULL,
  YearsInOperation       INT           NULL,
  OwnerFullName          VARCHAR(150)  NULL,
  OwnerIdType             VARCHAR(100)  NULL,
  OwnerIdNumber           VARCHAR(100)  NULL,
  ThemeColor              VARCHAR(7)    NOT NULL DEFAULT '#2563eb',
  CreatedAt               DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_email (Email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- CarBrand — global reference table (not Company_ID-scoped) used to detect a
-- company's brand affiliation via SQL LIKE for the signin brand-logo avatar.
-- -----------------------------------------------------------------------------
CREATE TABLE CarBrand (
  Brand_ID    INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Name         VARCHAR(50)   NOT NULL,
  LogoSlug    VARCHAR(50)   NOT NULL,
  UNIQUE KEY uq_car_brand_name (Name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- SiteContent — global (not Company_ID-scoped) key/value content store
-- backing the owner-only landing-page CMS. See db/migrations/005_site_content.sql.
-- -----------------------------------------------------------------------------
CREATE TABLE SiteContent (
  ContentKey   VARCHAR(64)  NOT NULL PRIMARY KEY,
  ContentValue JSON         NOT NULL,
  UpdatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UpdatedBy    VARCHAR(150) NULL COMMENT 'Email of the owner who last saved this block'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- User — staff accounts. Email/Username are unique per company, not globally,
-- since login always scopes by (Company_ID, Email).
-- -----------------------------------------------------------------------------
CREATE TABLE User (
  User_ID       INT                                       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Company_ID     VARCHAR(30)                                NOT NULL,
  FullName      VARCHAR(150)                              NOT NULL,
  Username      VARCHAR(100)                              NOT NULL,
  Email          VARCHAR(150)                              NOT NULL,
  Password      VARCHAR(255)                              NOT NULL COMMENT 'bcrypt hash',
  Role           ENUM('Admin', 'Front Desk', 'Mechanic')    NOT NULL,
  CreatedAt      DATETIME                                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_company_email (Company_ID, Email),
  UNIQUE KEY uq_user_company_username (Company_ID, Username),
  CONSTRAINT fk_user_company FOREIGN KEY (Company_ID) REFERENCES Company (Company_ID)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Mechanic — 1:1 extension of a User row with Role = 'Mechanic'.
-- -----------------------------------------------------------------------------
CREATE TABLE Mechanic (
  Mechanic_ID     INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  User_ID          INT           NOT NULL,
  Specialization  VARCHAR(150)  NULL,
  ContactNumber   VARCHAR(20)   NULL,
  UNIQUE KEY uq_mechanic_user (User_ID),
  CONSTRAINT fk_mechanic_user FOREIGN KEY (User_ID) REFERENCES User (User_ID)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Customer
-- -----------------------------------------------------------------------------
CREATE TABLE Customer (
  Customer_ID     INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Company_ID       VARCHAR(30)   NOT NULL,
  FullName        VARCHAR(150)  NOT NULL,
  ContactNumber   VARCHAR(20)   NOT NULL,
  Email            VARCHAR(150)  NULL COMMENT 'app-required notification address; nullable at DB level for legacy rows',
  Address          VARCHAR(255)  NULL,
  CreatedAt        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_customer_company (Company_ID),
  CONSTRAINT fk_customer_company FOREIGN KEY (Company_ID) REFERENCES Company (Company_ID)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Vehicle
-- -----------------------------------------------------------------------------
CREATE TABLE Vehicle (
  Vehicle_ID    INT           NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Customer_ID    INT           NOT NULL,
  PlateNumber   VARCHAR(20)   NOT NULL,
  Make           VARCHAR(100)  NOT NULL,
  Model          VARCHAR(100)  NOT NULL,
  Year            YEAR          NULL,
  VIN             VARCHAR(17)   NULL,
  Color           VARCHAR(50)   NULL,
  Mileage        INT           NULL,
  CreatedAt      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_vehicle_customer (Customer_ID),
  CONSTRAINT fk_vehicle_customer FOREIGN KEY (Customer_ID) REFERENCES Customer (Customer_ID)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- ServiceCatalog
-- -----------------------------------------------------------------------------
CREATE TABLE ServiceCatalog (
  Service_ID    INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Company_ID     VARCHAR(30)     NOT NULL,
  ServiceName   VARCHAR(150)    NOT NULL,
  Category       VARCHAR(100)    NULL,
  Description    TEXT            NULL,
  LaborRate     DECIMAL(10, 2)  NOT NULL,
  KEY idx_service_company (Company_ID),
  CONSTRAINT fk_service_company FOREIGN KEY (Company_ID) REFERENCES Company (Company_ID)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- PartsInventory
-- -----------------------------------------------------------------------------
CREATE TABLE PartsInventory (
  Part_ID          INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Company_ID        VARCHAR(30)     NOT NULL,
  PartName         VARCHAR(150)    NOT NULL,
  SKU               VARCHAR(100)    NULL,
  UnitPrice        DECIMAL(10, 2)  NOT NULL,
  StockQuantity    INT             NOT NULL,
  MinimumStock     INT             NOT NULL DEFAULT 0,
  KEY idx_parts_company (Company_ID),
  CONSTRAINT fk_parts_company FOREIGN KEY (Company_ID) REFERENCES Company (Company_ID)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Appointment
-- -----------------------------------------------------------------------------
CREATE TABLE Appointment (
  Appointment_ID    INT                                       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Company_ID         VARCHAR(30)                                NOT NULL,
  Customer_ID        INT                                       NOT NULL,
  Vehicle_ID         INT                                       NOT NULL,
  AppointmentDate   DATE                                       NOT NULL,
  AppointmentTime   TIME                                       NOT NULL,
  Reason             TEXT                                       NULL,
  Status             ENUM('Scheduled', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Scheduled',
  CreatedAt          DATETIME                                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_appointment_company_date_status (Company_ID, AppointmentDate, Status),
  KEY idx_appointment_customer (Customer_ID),
  KEY idx_appointment_vehicle (Vehicle_ID),
  CONSTRAINT fk_appointment_company FOREIGN KEY (Company_ID) REFERENCES Company (Company_ID)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_appointment_customer FOREIGN KEY (Customer_ID) REFERENCES Customer (Customer_ID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_appointment_vehicle FOREIGN KEY (Vehicle_ID) REFERENCES Vehicle (Vehicle_ID)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- RepairJob
-- -----------------------------------------------------------------------------
CREATE TABLE RepairJob (
  Job_ID            INT                                                       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Vehicle_ID         INT                                                       NOT NULL,
  Mechanic_ID        INT                                                       NOT NULL,
  Appointment_ID     INT                                                       NULL COMMENT 'nullable — job may be opened directly (walk-in)',
  JobDate            DATE                                                       NOT NULL,
  ReportedIssue     TEXT                                                       NULL,
  Diagnosis          TEXT                                                       NULL,
  Status             ENUM('Pending', 'In Progress', 'Completed', 'Released')     NOT NULL DEFAULT 'Pending',
  LaborHours         DECIMAL(5, 2)                                              NULL,
  CreatedAt          DATETIME                                                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_job_vehicle (Vehicle_ID),
  KEY idx_job_mechanic_status (Mechanic_ID, Status),
  KEY idx_job_date (JobDate),
  KEY idx_job_appointment (Appointment_ID),
  CONSTRAINT fk_job_vehicle FOREIGN KEY (Vehicle_ID) REFERENCES Vehicle (Vehicle_ID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_job_mechanic FOREIGN KEY (Mechanic_ID) REFERENCES Mechanic (Mechanic_ID)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_job_appointment FOREIGN KEY (Appointment_ID) REFERENCES Appointment (Appointment_ID)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- JobService — many-to-many junction (composite PK, no surrogate ID)
-- -----------------------------------------------------------------------------
CREATE TABLE JobService (
  Job_ID        INT   NOT NULL,
  Service_ID    INT   NOT NULL,
  PRIMARY KEY (Job_ID, Service_ID),
  KEY idx_jobservice_service (Service_ID),
  CONSTRAINT fk_jobservice_job FOREIGN KEY (Job_ID) REFERENCES RepairJob (Job_ID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_jobservice_service FOREIGN KEY (Service_ID) REFERENCES ServiceCatalog (Service_ID)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- JobParts — many-to-many junction (composite PK, no surrogate ID)
-- -----------------------------------------------------------------------------
CREATE TABLE JobParts (
  Job_ID          INT   NOT NULL,
  Part_ID          INT   NOT NULL,
  QuantityUsed    INT   NOT NULL,
  PRIMARY KEY (Job_ID, Part_ID),
  KEY idx_jobparts_part (Part_ID),
  CONSTRAINT fk_jobparts_job FOREIGN KEY (Job_ID) REFERENCES RepairJob (Job_ID)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_jobparts_part FOREIGN KEY (Part_ID) REFERENCES PartsInventory (Part_ID)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Invoice — one invoice per job (Job_ID is unique)
-- -----------------------------------------------------------------------------
CREATE TABLE Invoice (
  Invoice_ID     INT                                         NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Job_ID          INT                                         NOT NULL,
  DateIssued     DATE                                         NOT NULL,
  TotalAmount    DECIMAL(10, 2)                              NOT NULL,
  Status          ENUM('Unpaid', 'Partially Paid', 'Paid')     NOT NULL DEFAULT 'Unpaid',
  KEY idx_invoice_status (Status),
  KEY idx_invoice_date_issued (DateIssued),
  UNIQUE KEY uq_invoice_job (Job_ID),
  CONSTRAINT fk_invoice_job FOREIGN KEY (Job_ID) REFERENCES RepairJob (Job_ID)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- -----------------------------------------------------------------------------
-- Payment — KasaPaymentId is the idempotency key for Kasa-sourced payments;
-- Invoice_ID is RESTRICT since app logic guarantees no payments exist before
-- an invoice can be deleted (see app/api/v1/invoices/[id]/route.ts).
-- -----------------------------------------------------------------------------
CREATE TABLE Payment (
  Payment_ID        INT                                                                                                             NOT NULL AUTO_INCREMENT PRIMARY KEY,
  Invoice_ID         INT                                                                                                             NOT NULL,
  PaymentMethod     ENUM('Cash', 'Card', 'GCash', 'Maya', 'QR Ph', 'Bank Transfer')                                                  NOT NULL,
  AmountPaid        DECIMAL(10, 2)                                                                                                  NOT NULL,
  PaymentDate        DATE                                                                                                             NOT NULL,
  ReferenceNumber    VARCHAR(100)                                                                                                    NULL,
  KasaPaymentId      VARCHAR(64)                                                                                                     NULL COMMENT 'set only for Kasa-sourced payments',
  Status              ENUM('requires_payment_method', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded', 'partially_refunded') NOT NULL DEFAULT 'succeeded',
  RefundedAmount     DECIMAL(10, 2)                                                                                                  NOT NULL DEFAULT 0.00,
  KEY idx_payment_invoice (Invoice_ID),
  KEY idx_payment_date (PaymentDate),
  UNIQUE KEY uq_payment_kasa_id (KasaPaymentId),
  CONSTRAINT fk_payment_invoice FOREIGN KEY (Invoice_ID) REFERENCES Invoice (Invoice_ID)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================================
-- Seed data — car brands used for signin brand-logo detection (see
-- app/api/v1/auth/login/route.ts and db/migrations/004_car_brands.sql)
-- =============================================================================
INSERT INTO CarBrand (Name, LogoSlug) VALUES
  ('Toyota', 'toyota'),
  ('Honda', 'honda'),
  ('Ford', 'ford'),
  ('Mitsubishi', 'mitsubishi'),
  ('Nissan', 'nissan'),
  ('Hyundai', 'hyundai'),
  ('Kia', 'kia'),
  ('Mazda', 'mazda'),
  ('Suzuki', 'suzuki'),
  ('Isuzu', 'isuzu'),
  ('Chevrolet', 'chevrolet'),
  ('Subaru', 'subaru'),
  ('Volkswagen', 'volkswagen'),
  ('BMW', 'bmw'),
  ('Mercedes-Benz', 'mercedes-benz'),
  ('Audi', 'audi'),
  ('Lexus', 'lexus'),
  ('Jeep', 'jeep'),
  ('Dodge', 'dodge'),
  ('Ram', 'ram'),
  ('GMC', 'gmc'),
  ('Volvo', 'volvo'),
  ('Peugeot', 'peugeot'),
  ('Renault', 'renault'),
  ('Fiat', 'fiat'),
  ('Tesla', 'tesla'),
  ('Porsche', 'porsche'),
  ('Land Rover', 'land-rover'),
  ('Jaguar', 'jaguar'),
  ('MINI', 'mini'),
  ('Alfa Romeo', 'alfa-romeo'),
  ('Chery', 'chery'),
  ('Geely', 'geely'),
  ('BYD', 'byd'),
  ('MG', 'mg'),
  ('Foton', 'foton');

-- =============================================================================
-- Seed data — initial landing-page copy for the CMS (see
-- db/migrations/005_site_content.sql), one-to-one with the hardcoded copy
-- that previously lived in components/pages/Hero.tsx and
-- components/shared/Footer.jsx.
-- =============================================================================
INSERT INTO SiteContent (ContentKey, ContentValue) VALUES
  ('landing.hero', JSON_OBJECT(
    'headline', 'Everything your garage needs.\nOne platform.',
    'subhead', 'The all-in-one management platform designed for independent garages\nand growing auto repair businesses.',
    'ctaPrimaryLabel', 'Get Started Free',
    'ctaPrimaryHref', '/register',
    'ctaSecondaryLabel', 'Sign In',
    'ctaSecondaryHref', '/signin'
  )),
  ('landing.platform', JSON_OBJECT(
    'eyebrow', 'THE PLATFORM',
    'heading', 'Built for modern garages',
    'paragraph', 'Motiq replaces paperwork with an intuitive digital workspace that keeps your operations connected and your business running efficiently.',
    'features', JSON_ARRAY(
      JSON_OBJECT('title', 'Customer & Vehicle Record Managment', 'desc', 'Store and organize customer information, vehicle details, service history, and repair reords for quick and accurate retrieval', 'image', '/profile.png', 'span', 'wide'),
      JSON_OBJECT('title', 'Repair Job Tracking', 'desc', 'Monitor ongoing repairs, assign tasks, track job status, and maintain detailed service documentation.', 'image', '/orders.png', 'span', 'narrow'),
      JSON_OBJECT('title', 'Reports & Analytics', 'desc', 'Access service reports, revenue summaries, repair histories, and performance metrics to support informed decision-making.', 'image', '/reports.png', 'span', 'wide'),
      JSON_OBJECT('title', 'Automated Billing & Invoicing', 'desc', 'Generate accurate invoices automatically based on labor costs and parts used, reducing calculation errors and improving transparency.', 'image', '/invoice.png', 'span', 'narrow')
    )
  )),
  ('landing.meet', JSON_OBJECT(
    'eyebrow', 'MEET MOTIQ',
    'heading', 'One Platform That Connects\nYour Entire Garage',
    'paragraph', 'Manage customers, mechanics, repair jobs, inventory, and billing through one centralized dashboard designed specifically for auto-repair businesses.',
    'stats', JSON_ARRAY(
      JSON_OBJECT('value', 100, 'suffix', '+', 'label', 'Garages Ready for Digital Management'),
      JSON_OBJECT('value', 1, 'suffix', 'K+', 'label', 'Customer & Vehicle Records Managed'),
      JSON_OBJECT('value', 5, 'suffix', 'x', 'label', 'Faster Repair History Retrieval'),
      JSON_OBJECT('value', 100, 'suffix', '%', 'label', 'Accurate Automated Billing')
    )
  )),
  ('landing.howItWorks', JSON_OBJECT(
    'eyebrow', 'HOW IT WORKS',
    'heading', 'Manage Your Garage in\nThree Simple Steps',
    'paragraph', 'MOTIQ streamlines every stage of your workflow—from customer registration to repair completion and billing.',
    'steps', JSON_ARRAY(
      JSON_OBJECT('title', 'Register Customer & Vehicle', 'desc', 'Record customer information, vehicle details, and reported issues into the system.', 'image', '/vehicle.png'),
      JSON_OBJECT('title', 'Manage Repair Process', 'desc', 'Assign repair jobs, update service progress, and maintain detailed repair records.', 'image', '/jobstatus.png'),
      JSON_OBJECT('title', 'Generate Billing & Reports', 'desc', 'Automatically compute labor and parts costs, print invoices, and maintain accurate financial records.', 'image', '/invoice.png')
    )
  )),
  ('landing.footer', JSON_OBJECT(
    'headline', 'Smarter Garage Management Starts Here.',
    'paragraph', 'Bring customer records, repair tracking, and billing together in one integrated garage management system built to streamline daily operations, reduce manual work, and deliver faster, more efficient service.',
    'ctaPrimaryLabel', 'Get Started Free',
    'ctaPrimaryHref', '/register',
    'ctaSecondaryLabel', 'Sign In',
    'ctaSecondaryHref', '/signin'
  ));
