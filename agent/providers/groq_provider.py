import os

from groq import Groq
from pydantic import BaseModel

from providers.base import T


class GroqProvider:

    def __init__(self):

        self.client = Groq(
            api_key=os.getenv(
                "GROQ_API_KEY"
            )
        )

        self.model = os.getenv(
            "GROQ_MODEL",
            "openai/gpt-oss-20b",
        )

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[T],
    ) -> T:

        response = (
            self.client
            .chat
            .completions
            .create(
                model=self.model,

                messages=[
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {
                        "role": "user",
                        "content": user_prompt,
                    },
                ],

                response_format={
                    "type": "json_schema",
                    "json_schema": {
                        "name":
                            schema.__name__,

                        "strict": False,

                        "schema":
                            schema.model_json_schema(),
                    },
                },
            )
        )

        content = (
            response
            .choices[0]
            .message
            .content
        )

        return schema.model_validate_json(
            content
        )