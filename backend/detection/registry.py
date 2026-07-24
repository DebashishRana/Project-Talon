import importlib
import inspect
import pkgutil
import os
from typing import Dict, List, Type
import logging
from .base import BaseDetector

logger = logging.getLogger(__name__)

class DetectorRegistry:
    """Registry for dynamic discovery and loading of Document Detectors."""
    
    def __init__(self):
        self._detectors: Dict[str, BaseDetector] = {}
    
    def register(self, detector_class: Type[BaseDetector]):
        """Register a detector class."""
        try:
            # Instantiate the detector
            detector_instance = detector_class()
            self._detectors[detector_instance.name] = detector_instance
            logger.info(f"Registered detector: {detector_instance.name} (Priority: {detector_instance.priority})")
        except Exception as e:
            logger.error(f"Failed to register detector {detector_class.__name__}: {str(e)}")

    def get(self, name: str) -> BaseDetector:
        """Get a registered detector by name."""
        return self._detectors.get(name)

    def get_all_sorted(self) -> List[BaseDetector]:
        """Get all registered detectors sorted by priority."""
        return sorted(self._detectors.values(), key=lambda d: d.priority)

    def get_enabled_detectors(self, enabled_names: List[str]) -> List[BaseDetector]:
        """Get enabled detectors sorted by priority."""
        detectors = [d for name, d in self._detectors.items() if name in enabled_names]
        return sorted(detectors, key=lambda d: d.priority)

    def discover(self, package_name: str = "backend.detection.detectors"):
        """Automatically discover and register all detectors in the package."""
        try:
            # Import the package
            package = importlib.import_module(package_name)
            
            # Iterate through all modules in the package
            for _, module_name, is_pkg in pkgutil.iter_modules(package.__path__):
                if not is_pkg:
                    full_module_name = f"{package_name}.{module_name}"
                    module = importlib.import_module(full_module_name)
                    
                    # Find all classes inheriting from BaseDetector
                    for name, obj in inspect.getmembers(module, inspect.isclass):
                        if (issubclass(obj, BaseDetector) and 
                            obj is not BaseDetector and 
                            not inspect.isabstract(obj)):
                            self.register(obj)
                            
        except Exception as e:
            logger.error(f"Failed to discover detectors in {package_name}: {str(e)}")
