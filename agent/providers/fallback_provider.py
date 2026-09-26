import os

from providers.base import T

from providers.deterministic_provider import (
    DeterministicProvider,
)

from providers.groq_provider import (
    GroqProvider,
)

from providers.gemini_provider import (
    GeminiProvider,
)


def _has_key(name: str) -> bool:
    return bool(
        os.getenv(name, "").strip()
    )


class FallbackProvider:
    """Groq first, Gemini second, rule-based deterministic provider last."""

    def __init__(self):

        # Name of the provider that produced the most recent result.
        self.last_provider = None

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

        if _has_key("GROQ_API_KEY"):

            try:

                primary = GroqProvider()

                result = primary.generate_structured(
                    system_prompt,
                    user_prompt,
                    schema,
                )
                self.last_provider = "groq"
                return result

            except Exception as error:

                errors.append(
                    f"Groq: {error}"
                )

                print(
                    f"Groq failed ({type(error).__name__}). "
                    "Trying Gemini..."
                )

        else:

            errors.append(
                "Groq: GROQ_API_KEY is not set"
            )

        # -------------------------
        # Fallback provider: Gemini
        # -------------------------

        if _has_key("GEMINI_API_KEY"):

            try:

                fallback = GeminiProvider()

                result = fallback.generate_structured(
                    system_prompt,
                    user_prompt,
                    schema,
                )
                self.last_provider = "gemini"
                return result

            except Exception as error:

                errors.append(
                    f"Gemini: {error}"
                )

        else:

            errors.append(
                "Gemini: GEMINI_API_KEY is not set"
            )

        # -------------------------
        # Final fallback: rules over supplied facts
        # -------------------------

        print(
            f"LLM providers unavailable for {schema.__name__}. "
            "Using deterministic fallback."
        )

        try:

            result = DeterministicProvider().generate_structured(
                system_prompt,
                user_prompt,
                schema,
            )
            self.last_provider = "deterministic"
            return result

        except Exception as error:

            errors.append(
                f"Deterministic: {error}"
            )

        # -------------------------
        # All providers failed
        # -------------------------

        raise RuntimeError(
            "All LLM providers failed. "
            + " | ".join(errors)
        )
