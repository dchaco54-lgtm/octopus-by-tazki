import Image from "next/image";

interface AppLogoProps {
  size?: "icon" | "sm" | "lg";
}

export function AppLogo({ size = "sm" }: AppLogoProps) {
  if (size === "icon") {
    return (
      <div className="relative h-9 w-9 overflow-hidden rounded-xl">
        <Image
          src="/tazki-logo.webp"
          alt="Tazki"
          width={180}
          height={36}
          priority
          className="absolute left-1/2 top-1/2 h-9 w-auto max-w-none -translate-x-[34%] -translate-y-1/2"
        />
      </div>
    );
  }

  const dimensions =
    size === "lg"
      ? { width: 250, height: 77, className: "h-auto w-[220px] sm:w-[250px]" }
      : { width: 168, height: 52, className: "h-auto w-[148px] sm:w-[168px]" };

  return (
    <Image
      src="/tazki-logo.webp"
      alt="Tazki"
      width={dimensions.width}
      height={dimensions.height}
      priority={size !== "sm"}
      className={dimensions.className}
    />
  );
}
