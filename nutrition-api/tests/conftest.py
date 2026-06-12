from contextlib import asynccontextmanager
from unittest.mock import MagicMock

import pytest


@pytest.fixture(autouse=True)
def _patch_classifier_and_lifespan(monkeypatch):
    mock_pipeline = MagicMock(
        return_value=[
            {'label': 'apple_pie', 'score': 0.92},
            {'label': 'pizza', 'score': 0.04},
        ]
    )
    monkeypatch.setattr('app.get_classifier', lambda: mock_pipeline)

    @asynccontextmanager
    async def _test_lifespan(_app):
        yield

    monkeypatch.setattr('app.lifespan', _test_lifespan)
    return mock_pipeline


@pytest.fixture
def mock_classifier(_patch_classifier_and_lifespan):
    return _patch_classifier_and_lifespan
