import sys
import os
import types

# Ensure backend package can be resolved when running either from project root
# or packaged directly at the Lambda task root (/var/task).
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(_CURRENT_DIR)
_ROOT_DIR = os.path.dirname(_BACKEND_DIR)

if _ROOT_DIR not in sys.path:
    sys.path.insert(0, _ROOT_DIR)

if "backend" not in sys.modules:
    backend_pkg = types.ModuleType("backend")
    backend_pkg.__path__ = [_BACKEND_DIR]
    sys.modules["backend"] = backend_pkg
