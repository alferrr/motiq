"use client";

const BRAND_SLUGS: Record<string, string> = {
  toyota: "toyota",
  honda: "honda",
  ford: "ford",
  mitsubishi: "mitsubishi",
  nissan: "nissan",
  hyundai: "hyundai",
  kia: "kia",
  mazda: "mazda",
  suzuki: "suzuki",
  isuzu: "isuzu",
  chevrolet: "chevrolet",
  subaru: "subaru",
  volkswagen: "volkswagen",
  bmw: "bmw",
  mercedes: "mercedes-benz",
  "mercedes-benz": "mercedes-benz",
  audi: "audi",
  lexus: "lexus",
  jeep: "jeep",
  dodge: "dodge",
  ram: "ram",
  gmc: "gmc",
  volvo: "volvo",
  peugeot: "peugeot",
  renault: "renault",
  fiat: "fiat",
  tesla: "tesla",
  porsche: "porsche",
  land: "land-rover",
  "land rover": "land-rover",
  jaguar: "jaguar",
  mini: "mini",
  alfa: "alfa-romeo",
  chery: "chery",
  geely: "geely",
  byd: "byd",
  mg: "mg",
  foton: "foton",
};

function getSlug(make: string): string | null {
  if (!make) return null;
  const lower = make.toLowerCase().trim();
  // direct match
  if (BRAND_SLUGS[lower]) return BRAND_SLUGS[lower];
  // match by first word (e.g. "Land Rover" → "land")
  const first = lower.split(" ")[0];
  return BRAND_SLUGS[first] ?? null;
}

type VehicleIconProps = {
  make: string;
  primary: string;
  size?: number;
  className?: string;
};

export default function VehicleIcon({
  make,
  primary,
  size = 36,
  className = "",
}: VehicleIconProps) {
  const slug = getSlug(make);
  const initial = make?.[0]?.toUpperCase() ?? "?";

  if (slug) {
    return (
      <div
        className={`rounded-xl flex items-center justify-center shrink-0 overflow-hidden ${className}`}
        style={{ width: size, height: size, backgroundColor: primary + "15" }}
      >
        <img
          src={`https://www.carlogos.org/car-logos/${slug}-logo.png`}
          alt={make}
          width={size * 0.7}
          height={size * 0.7}
          className="object-contain"
          onError={(e) => {
            // fallback to initial letter on load error
            const target = e.currentTarget;
            const parent = target.parentElement;
            if (parent) {
              target.remove();
              parent.style.backgroundColor = primary + "30";
              parent.style.color = primary;
              parent.style.fontSize = `${size * 0.38}px`;
              parent.style.fontWeight = "700";
              parent.textContent = initial;
            }
          }}
        />
      </div>
    );
  }

  // fallback: letter icon
  return (
    <div
      className={`rounded-xl flex items-center justify-center shrink-0 font-bold ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: primary + "30",
        color: primary,
        fontSize: size * 0.38,
      }}
    >
      {initial}
    </div>
  );
}
