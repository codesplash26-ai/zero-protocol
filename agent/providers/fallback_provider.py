from providers.base import T

from providers.groq_provider import (
    GroqProvider,
)

from providers.gemini_provider import (
    GeminiProvider,
)


class FallbackProvider:

    def generate_structured(
        self,
        system_prompt: str,
        user_prompt: str,
        schema: type[T],
    ) -> T:

        errors = []

        # -------------------------
        # Primary provider: Groq
        # -------------------------

        try:

            primary = GroqProvider()

            return primary.generate_structured(
                system_prompt,
                user_prompt,
                schema,
            )

        except Exception as error:

            errors.append(
                f"Groq: {error}"
            )

            print(
                "Groq failed. "
                "Trying Gemini..."
            )

        # -------------------------
        # Fallback provider: Gemini
        # -------------------------

        try:

            fallback = GeminiProvider()

            return fallback.generate_structured(
                system_prompt,
                user_prompt,
                schema,
            )

        except Exception as error:

            errors.append(
                f"Gemini: {error}"
            )

        # -------------------------
        # Both failed
        # -------------------------

        raise RuntimeError(
            "All LLM providers failed. "
            + " | ".join(errors)
        )