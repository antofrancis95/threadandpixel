"""Virtual try-on (Vertex AI virtual-try-on model) with a pre-flight photo safety check."""

from google.genai import types
from google.genai.types import Image, ProductImage, RecontextImageConfig, RecontextImageSource

from ..clients import gemini, imaging
from ..config import settings
from ..models import PhotoCheck
from .common import AIError, json_config, parse_structured

_CHECK_PROMPT = (
    "Assess this photo for a virtual clothing try-on. single_person_full_body: exactly one person, "
    "most of the body visible. appears_minor: the person could plausibly be under 18. unsafe_content: nudity, "
    "violence or otherwise inappropriate. reason: one short sentence."
)


def check_person_photo(image: bytes, mime: str) -> PhotoCheck:
    response = gemini().models.generate_content(
        model=settings.model_lite,
        contents=[types.Part.from_bytes(data=image, mime_type=mime), _CHECK_PROMPT],
        config=json_config(PhotoCheck, temperature=0.0),
    )
    return parse_structured(response, PhotoCheck)


def try_on(person: bytes, person_mime: str, garment: bytes, garment_mime: str) -> bytes:
    response = imaging().models.recontext_image(
        model=settings.model_vto,
        source=RecontextImageSource(
            person_image=Image(image_bytes=person, mime_type=person_mime),
            product_images=[ProductImage(product_image=Image(image_bytes=garment, mime_type=garment_mime))],
        ),
        config=RecontextImageConfig(
            output_mime_type="image/jpeg",
            number_of_images=1,
            safety_filter_level="BLOCK_LOW_AND_ABOVE",
        ),
    )
    images = response.generated_images or []
    if not images or not images[0].image or not images[0].image.image_bytes:
        raise AIError("Virtual try-on returned no image (possibly blocked by safety filters).")
    return images[0].image.image_bytes
