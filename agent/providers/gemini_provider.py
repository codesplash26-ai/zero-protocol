import os

from google import genai

from providers.base import T


class GeminiProvider:

    def __init__(self):

        self.client = genai.Client(
            api_key=os.getenv(
                "GEMINI_API_KEY"
            )
        )

        self.model = os.getenv(
            "GEMINI_MODEL",
            "gemini-3.8-flash",
        )

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[T],
    ) -> T:

        prompt = (
            f"{system_prompt}\n\n"
            f"{user_prompt}"
        )

        response = (
            self.client
            .interactions
            .create(
                model=self.model,

                input=prompt,

                response_format={
                    "type": "text",
                    "mime_type":
                        "application/json",

                    "schema":
                        schema.model_json_schema(),
                },
            )
        )

        return schema.model_validate_json(
            response.output_text
        )