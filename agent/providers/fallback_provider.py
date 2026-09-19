from providers.base import T
from providers.groq_provider import (
    GroqProvider,
)
from providers.gemini_provider import (
    GeminiProvider,
)


class FallbackProvider:

    def __init__(self):

        self.primary = GroqProvider()
        self.fallback = GeminiProvider()

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[T],
    ) -> T:

        try:

            return (
                self.primary
                .generate_structured(
                    system_prompt,
                    user_prompt,
                    schema,
                )
            )

        except Exception as primary_error:

            print(
                "Groq failed. "
                "Trying Gemini fallback..."
            )

            try:

                return (
                    self.fallback
                    .generate_structured(
                        system_prompt,
                        user_prompt,
                        schema,
                    )
                )

            except Exception as fallback_error:

                raise RuntimeError(
                    "Both LLM providers failed."
                ) from fallback_error