from typing import Any, List, Mapping, Optional

from langchain.chat_models import ChatAnthropic


class CustomChatAnthropic(ChatAnthropic):
    stop_sequences: Optional[List[str]] = None  #: :meta private:

    @property
    def _default_params(self) -> Mapping[str, Any]:
        """Get the default parameters for calling Anthropic API."""
        d = {
            "max_tokens_to_sample": self.max_tokens_to_sample,
            "model": self.model,
        }
        if self.temperature is not None:
            d["temperature"] = self.temperature
        if self.top_k is not None:
            d["top_k"] = self.top_k
        if self.top_p is not None:
            d["top_p"] = self.top_p
        if self.stop_sequences is not None:
            d["stop_sequences"] = self.stop_sequences
        return d
