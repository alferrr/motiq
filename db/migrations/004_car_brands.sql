-- Adds a global car-brand reference table used to detect a company's brand
-- affiliation (e.g. "Mercado BMW Service Center" -> BMW) via SQL LIKE, so the
-- signin welcome-step button can show a brand-logo avatar.
-- Not Company_ID-scoped: brands are shared reference data, not per-company.

CREATE TABLE CarBrand (
  Brand_ID INT AUTO_INCREMENT PRIMARY KEY,
  Name VARCHAR(50) NOT NULL,
  LogoSlug VARCHAR(50) NOT NULL,
  UNIQUE KEY uq_car_brand_name (Name)
);

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
