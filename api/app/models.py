from typing import Literal

from pydantic import BaseModel, Field

GarmentType = Literal["dress", "top", "shirt", "skirt", "trousers", "jacket", "jumpsuit", "suit"]
Length = Literal["cropped", "hip", "knee", "midi", "maxi", "full"]
Sleeve = Literal["sleeveless", "cap", "short", "three_quarter", "long"]
Closure = Literal["zipper", "buttons", "hooks", "tie", "none"]
Embellishment = Literal["embroidery", "lace", "beading", "pleats", "ruffles", "print"]
Size = Literal["XS", "S", "M", "L", "XL", "XXL"]
Gender = Literal["womenswear", "menswear", "unisex"]


class DesignSpec(BaseModel):
    garment_type: GarmentType
    length: Length
    sleeve: Sleeve
    fabric_id: str
    color_hex: str
    closures: list[Closure]
    embellishments: list[Embellishment]
    lining: bool
    gender: Gender = "unisex"
    size: Size | None = None
    fit: str | None = None


class TailorTurn(BaseModel):
    """Structured output returned by the AI Tailor on every turn."""

    user_transcript: str
    spec: DesignSpec
    image_prompt: str
    edit_instruction: str
    reply_to_user: str
    suggested_action: Literal[
        "none", "fitting", "measurements", "runway", "commission", "gender", "consultation", "design_upload", "occasion_stylist"
    ] = "none"
    ready_to_sketch: bool = True
    is_off_topic: bool = False


class TechPackCritique(BaseModel):
    construction_notes: list[str]
    seam_types: list[str]
    manufacturable: bool
    issues: list[str]


class PhotoCheck(BaseModel):
    single_person_full_body: bool
    appears_minor: bool
    unsafe_content: bool
    reason: str


AudioMime = Literal["audio/webm", "audio/ogg", "audio/wav", "audio/mp4", "audio/mpeg"]


class MessageIn(BaseModel):
    text: str | None = Field(default=None, max_length=2000)
    audio_b64: str | None = Field(default=None, max_length=14_000_000)
    audio_mime: AudioMime = "audio/webm"
    design_image_b64: str | None = Field(default=None, max_length=14_000_000)
    design_image_mime: str = "image/jpeg"
    occasion: str | None = Field(default=None, max_length=500)
    gender: Gender | None = None
    size: Size | None = None
    fit: str | None = None


class Measurements(BaseModel):
    bust_cm: float | None = Field(default=None, ge=40, le=200)
    waist_cm: float | None = Field(default=None, ge=40, le=200)
    hip_cm: float | None = Field(default=None, ge=40, le=200)
    height_cm: float | None = Field(default=None, ge=100, le=230)


class FlatsIn(BaseModel):
    measurements: Measurements | None = None


class TechPackIn(BaseModel):
    size: Size
    measurements: Measurements | None = None


class TryOnIn(BaseModel):
    upload_id: str | None = Field(default=None, max_length=64)


class OrderIn(BaseModel):
    quote_id: str = Field(min_length=1, max_length=64)
