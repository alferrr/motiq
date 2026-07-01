"use client";

export default function Footer() {
  return (
    <div
      className="flex flex-col gap-4 items-center justify-center min-h-[60dvh] text-white p-6 sm:p-12 md:p-20"
      style={{
        backgroundImage: "url('/footer.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <h1 className="text-3xl sm:text-4xl md:text-5xl text-center font-heading">
        Smarter Garage Management Starts Here.
      </h1>
      <p className="w-full max-w-md sm:max-w-xl text-center text-sm sm:text-base font-light leading-7 mt-5">
        Bring customer records, repair tracking, and billing together in one
        integrated garage management system built to streamline daily
        operations, reduce manual work, and deliver faster, more efficient
        service.
      </p>
    </div>
  );
}
