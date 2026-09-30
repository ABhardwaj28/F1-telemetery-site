from f1_data_model.capabilities import capabilities_for_year, feature_available


def test_2010_has_historical_but_not_rich_features() -> None:
    capabilities = capabilities_for_year(2010)
    assert capabilities["results"] is True
    assert capabilities["championship"] is True
    assert capabilities["telemetry"] is False
    assert capabilities["weather"] is False


def test_2018_has_rich_features() -> None:
    assert feature_available(2018, "telemetry") is True
    assert feature_available(2018, "strategy_detail") is True
