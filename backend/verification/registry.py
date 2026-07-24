import importlib
import inspect
import pkgutil
import os
from typing import Dict, List, Type
import logging
from .base import BaseVerifier

logger = logging.getLogger(__name__)

class VerifierRegistry:
    """Registry for dynamic discovery and loading of Document Verifiers."""
    
    def __init__(self):
        self._verifiers: Dict[str, BaseVerifier] = {}
    
    def register(self, verifier_class: Type[BaseVerifier]):
        """Register a verifier class."""
        try:
            # Note: For production, we would inject SecretManager here
            verifier_instance = verifier_class()
            self._verifiers[verifier_instance.name] = verifier_instance
            logger.info(f"Registered verifier: {verifier_instance.name} (Priority: {verifier_instance.priority})")
        except Exception as e:
            logger.error(f"Failed to register verifier {verifier_class.__name__}: {str(e)}")

    def get(self, name: str) -> BaseVerifier:
        """Get a registered verifier by name."""
        return self._verifiers.get(name)

    def get_enabled_for_type(self, document_type: str, enabled_names: List[str]) -> List[BaseVerifier]:
        """Get enabled verifiers capable of verifying a specific document type, sorted by priority."""
        verifiers = []
        for name, v in self._verifiers.items():
            if name in enabled_names and document_type in v.document_types:
                verifiers.append(v)
        return sorted(verifiers, key=lambda v: v.priority)

    def discover(self, package_name: str = "backend.verification.verifiers"):
        """Automatically discover and register all verifiers in the package."""
        try:
            package = importlib.import_module(package_name)
            
            for _, module_name, is_pkg in pkgutil.iter_modules(package.__path__):
                if not is_pkg:
                    full_module_name = f"{package_name}.{module_name}"
                    module = importlib.import_module(full_module_name)
                    
                    for name, obj in inspect.getmembers(module, inspect.isclass):
                        if (issubclass(obj, BaseVerifier) and 
                            obj is not BaseVerifier and 
                            not inspect.isabstract(obj)):
                            self.register(obj)
                            
        except Exception as e:
            logger.error(f"Failed to discover verifiers in {package_name}: {str(e)}")
