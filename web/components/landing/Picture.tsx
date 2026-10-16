import type { LandingImage } from "@/lib/landingMedia";

/**
 * Responsive image for landing media: WebP renditions chosen by the browser
 * for the rendered width, the original JPEG as the fallback, lazy-loaded and
 * decoded off the main thread. The <picture> wrapper is `display: contents`
 * so existing `… img` rules keep sizing the image exactly as before.
 */
export function Picture({
  image,
  alt,
  sizes,
  className,
  eager = false,
}: {
  image: LandingImage;
  alt: string;
  /** How wide the image renders, in CSS `sizes` syntax. */
  sizes: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <picture>
      {image.webpSrcSet && <source type="image/webp" srcSet={image.webpSrcSet} sizes={sizes} />}
      <img
        src={image.src}
        width={image.width}
        height={image.height}
        alt={alt}
        className={className}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </picture>
  );
}
