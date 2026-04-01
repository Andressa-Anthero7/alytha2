type BrandLogoProps = {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
};

export function BrandLogo({
  className = 'h-16',
  alt = 'Alytha',
  width = 620,
  height = 620,
}: BrandLogoProps) {
  return <img src="/logo.png" width={width} height={height} alt={alt} className={`${className} w-auto object-contain`} />;
}
