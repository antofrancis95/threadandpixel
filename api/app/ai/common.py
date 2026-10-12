from google.genai import types


class AIError(Exception):
    """Model returned no usable output (safety block, empty response, schema failure)."""


def extract_image(response) -> tuple[bytes, str]:
    for candidate in response.candidates or []:
        for part in (candidate.content.parts if candidate.content else None) or []:
            if part.inline_data and part.inline_data.data:
                return part.inline_data.data, part.inline_data.mime_type or "image/png"
    raise AIError("The image model did not return an image (possibly blocked by safety filters).")


def parse_structured(response, model_cls):
    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, model_cls):
        return parsed
    if response.text:
        return model_cls.model_validate_json(response.text)
    raise AIError(f"Model returned no {model_cls.__name__}.")


def json_config(schema, system_instruction: str | None = None, temperature: float = 0.4) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        response_schema=schema,
        temperature=temperature,
    )
